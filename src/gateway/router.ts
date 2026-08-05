import type { GatewayConfig, ProviderConfig } from "./config.js";
import { providerRequest, type OpenAIBody, type UpstreamResult } from "./providers.js";
import { compressOpenAIBody, type Msg } from "./compress.js";
import { usage } from "./usage.js";

export interface RoutedStep {
  provider: string;
  model: string;
}

let autoCounter = 0;

function isContextLengthError(status: number, error?: string): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  if (lower.includes("maximum context length")) return true;
  if (lower.includes("context_length")) return true;
  if (lower.includes("context length")) return true;
  if (lower.includes("too many tokens")) return true;
  if (lower.includes("reduce the length")) return true;
  if (lower.includes("token limit")) return true;
  if (lower.includes("context window")) return true;
  if (lower.includes("prompt is too long")) return true;
  if (lower.includes("exceeds maximum")) return true;
  if (status === 400 || status === 422) {
    if (lower.includes("context") || lower.includes("token") || lower.includes("length") || lower.includes("window")) {
      return true;
    }
  }
  return false;
}

function providerUsable(p: ProviderConfig): boolean {
  if (p.type === "gemini") return !!p.apiKey;
  if (p.type === "cloudflare") return !!p.apiKey && !!p.accountId;
  return !!p.apiKey || !!p.keyless;
}

// Adaptive "pick the best available" ordering across all usable providers:
// skips cooled-down providers and prefers those with the lowest recent latency.
export function buildAutoSteps(cfg: GatewayConfig): RoutedStep[] {
  const candidates: { provider: string; model: string; latency: number | null }[] = [];
  for (const [provider, p] of Object.entries(cfg.providers)) {
    if (!p.models?.length) continue;
    if (!providerUsable(p)) continue;
    if (usage.isCoolingDown(provider)) continue;
    candidates.push({ provider, model: p.models[0], latency: usage.latencyOf(provider) });
  }
  candidates.sort((a, b) => (a.latency ?? Number.MAX_SAFE_INTEGER) - (b.latency ?? Number.MAX_SAFE_INTEGER));
  // Rotate so we don't always hammer the same lowest-latency provider first.
  if (candidates.length > 1) {
    const offset = autoCounter++ % candidates.length;
    const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
    return rotated.map((c) => ({ provider: c.provider, model: c.model }));
  }
  return candidates.map((c) => ({ provider: c.provider, model: c.model }));
}

export function resolveRoute(name: string, cfg: GatewayConfig): { steps: RoutedStep[]; error?: string } {
  if (name === "auto") {
    const steps = buildAutoSteps(cfg);
    if (!steps.length) return { error: "auto has no usable providers (all missing keys or cooling down)", steps };
    return { steps };
  }
  const routes = cfg.routes ?? {};
  if (routes[name]) {
    return { steps: parseRouteList(routes[name]!, cfg) };
  }

  const direct = findDirectMatch(name, cfg);
  if (direct) return { steps: [direct] };

  // "provider/model" or "provider/model:tag"
  if (name.includes("/")) {
    const [provider, ...rest] = name.split("/");
    if (cfg.providers[provider]) {
      return { steps: [{ provider, model: rest.join("/") }] };
    }
  }

  const flat = Object.entries(cfg.providers)
    .flatMap(([provider, p]) => p.models.map((m) => `${provider}/${m}`))
    .slice(0, 40)
    .join("\n  ");
  return {
    error: `Unknown model/route: "${name}".\nConfigured routes: ${Object.keys(routes).join(", ") || "(none)"}\nConfigured models:\n  ${flat || "(none)"}`,
    steps: [],
  };
}

function parseRouteList(list: string[], cfg: GatewayConfig): RoutedStep[] {
  const steps: RoutedStep[] = [];
  for (const entry of list) {
    const [provider, ...rest] = entry.split("/");
    if (!cfg.providers[provider]) {
      console.warn(`[router] route entry "${entry}" references unknown provider "${provider}"`);
      continue;
    }
    steps.push({ provider, model: rest.join("/") });
  }
  return steps;
}

function findDirectMatch(name: string, cfg: GatewayConfig): RoutedStep | null {
  for (const [provider, p] of Object.entries(cfg.providers)) {
    if (p.models.includes(name)) return { provider, model: name };
  }
  return null;
}

export function providerConfig(cfg: GatewayConfig, step: RoutedStep): { cfg?: ProviderConfig; error?: string } {
  const p = cfg.providers[step.provider];
  if (!p) return { error: `Unknown provider "${step.provider}"` };
  if (p.type === "gemini" && !p.apiKey) return { error: `Provider "${step.provider}" needs GEMINI_API_KEY` };
  if (p.type === "cloudflare" && (!p.accountId || !p.apiKey)) return { error: `Provider "${step.provider}" needs CF_ACCOUNT_ID and CF_API_TOKEN` };
  if (p.type === "openai" && !p.apiKey && !p.keyless) return { error: `Provider "${step.provider}" needs an api key` };
  return { cfg: p };
}

export interface FailoverOutcome {
  result: UpstreamResult | null;
  tried: string[];
  used?: string;
  lastError?: { status: number; message: string };
}

export async function failover(
  steps: RoutedStep[],
  cfg: GatewayConfig,
  body: OpenAIBody
): Promise<FailoverOutcome> {
  const tried: string[] = [];
  let lastError: { status: number; message: string } | undefined;
  for (const step of steps) {
    const label = `${step.provider}/${step.model}`;
    const { cfg: pcfg, error } = providerConfig(cfg, step);
    if (error) {
      tried.push(label);
      console.warn(`[router] ${error}`);
      continue;
    }
    if (usage.isCoolingDown(step.provider)) {
      tried.push(label);
      console.warn(`[router] skip ${label} (in cooldown)`);
      continue;
    }
    const labeled = { ...body, model: step.model };
    const t0 = Date.now();
    let result = await providerRequest(pcfg!, labeled, cfg.timeoutMs);

    if (!result.ok && isContextLengthError(result.status, result.error)) {
      const retryBody = compressOpenAIBody(
        { ...labeled, messages: [...(labeled.messages as Msg[])] },
        12000
      );
      result = await providerRequest(pcfg!, retryBody, cfg.timeoutMs);
    }

    const latencyMs = Date.now() - t0;
    tried.push(label);
    usage.recordProvider(step.provider, {
      ok: result.ok,
      status: result.status,
      error: result.error,
      latencyMs,
    });
    if (result.ok) {
      console.info(`[router] -> OK  ${label}`);
      return { result, tried, used: step.provider };
    }
    console.warn(`[router] -> FAIL(${result.status}) ${label}: ${(result.error ?? "").slice(0, 160)}`);
    lastError = { status: result.status >= 400 ? (result.status === 429 || result.status >= 500 ? 502 : result.status) : 502, message: result.error ?? `Provider ${step.provider} failed with ${result.status}` };
  }
  return { result: null, tried, lastError };
}