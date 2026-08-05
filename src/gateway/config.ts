import { readFileSync, existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

try {
  process.loadEnvFile();
} catch {
  // no .env file is fine; keys may come from the real environment
}

export interface ProviderConfig {
  type: "openai" | "gemini" | "cloudflare";
  baseUrl?: string;
  apiKey?: string;
  accountId?: string;
  keyless?: boolean;
  models: string[];
  headers?: Record<string, string>;
}

export interface GatewayConfig {
  port: number;
  gatewayKey?: string;
  timeoutMs: number;
  providers: Record<string, ProviderConfig>;
  routes: Record<string, string[]>;
}

const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: {
    type: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "ENV:OPENROUTER_API_KEY",
    models: [
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "cohere/north-mini-code:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "meta-llama/llama-4-maverick:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ],
  },
  pollinations: {
    type: "openai",
    baseUrl: "https://gen.pollinations.ai/v1",
    apiKey: "ENV:POLLINATIONS_API_KEY",
    models: [
      "openai",
      "kimi",
      "deepseek",
      "glm",
      "claude-fast",
      "gemini-large",
      "qwen3.8-max",
    ],
  },
  zal: {
    type: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: "ENV:ZAI_API_KEY",
    models: ["glm-4-flash", "glm-4-flash-250414"],
  },
  gemini: {
    type: "gemini",
    apiKey: "ENV:GEMINI_API_KEY",
    models: ["gemini-3.5-flash", "gemini-3.1-flash-lite"],
  },
  groq: {
    type: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "ENV:GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  github: {
    type: "openai",
    baseUrl: "https://models.github.ai/inference/v1",
    apiKey: "ENV:GITHUB_TOKEN",
    models: ["gpt-4o-mini", "gpt-4.1-mini", "meta-llama-3.1-8b-instruct"],
  },
  mistral: {
    type: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: "ENV:MISTRAL_API_KEY",
    models: ["codestral-latest", "open-mistral-7b", "mistral-small-latest", "pixtral-12b-2409"],
  },
  cerebras: {
    type: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    apiKey: "ENV:CEREBRAS_API_KEY",
    models: ["llama-3.3-70b", "llama-3.1-8b"],
  },
  deepseek: {
    type: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "ENV:DEEPSEEK_API_KEY",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  together: {
    type: "openai",
    baseUrl: "https://api.together.xyz/v1",
    apiKey: "ENV:TOGETHER_API_KEY",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
  },
  cloudflare: {
    type: "cloudflare",
    accountId: "ENV:CF_ACCOUNT_ID",
    apiKey: "ENV:CF_API_TOKEN",
    models: [
      "@cf/qwen/qwen2.5-coder-32b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ],
  },
};
const DEFAULT_ROUTES: Record<string, string[]> = {
  default: [
    "pollinations/openai",
    "openrouter/openai/gpt-oss-20b:free",
    "openrouter/cohere/north-mini-code:free",
    "openrouter/google/gemma-4-31b-it:free",
    "groq/llama-3.3-70b-versatile",
    "github/gpt-4o-mini",
    "gemini/gemini-3.5-flash",
  ],
  coder: [
    "pollinations/openai",
    "openrouter/cohere/north-mini-code:free",
    "openrouter/nvidia/nemotron-3-nano-30b-a3b:free",
    "groq/llama-3.3-70b-versatile",
    "mistral/codestral-latest",
    "gemini/gemini-3.5-flash",
    "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
  ],
  fast: [
    "pollinations/openai",
    "openrouter/openai/gpt-oss-20b:free",
    "zal/glm-4-flash",
    "gemini/gemini-3.1-flash-lite",
  ],
};

export function resolveEnv(v?: string): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("ENV:")) return process.env[v.slice(4)];
  if (v.startsWith("$")) return process.env[v.slice(1)];
  return v;
}

export function loadGatewayConfig(file?: string): GatewayConfig {
  const filePath = resolvePath(file ?? process.env.GATEWAY_CONFIG ?? "gateway.config.json");
  let overrides: { port?: number; gatewayKey?: string; providers?: Record<string, ProviderConfig>; routes?: Record<string, string[]> } = {};
  if (existsSync(filePath)) {
    overrides = JSON.parse(readFileSync(filePath, "utf8")) as typeof overrides;
  }

  const providers = { ...DEFAULT_PROVIDERS, ...(overrides.providers ?? {}) };
  for (const p of Object.values(providers)) {
    if (p.apiKey) p.apiKey = resolveEnv(p.apiKey);
    if (p.accountId) p.accountId = resolveEnv(p.accountId);
    for (const [k, v] of Object.entries(p.headers ?? {})) p.headers![k] = resolveEnv(v) ?? v;
  }

  const cfg: GatewayConfig = {
    port: overrides.port ?? Number(process.env.GATEWAY_PORT ?? "8787"),
    gatewayKey: overrides.gatewayKey ? resolveEnv(overrides.gatewayKey) : process.env.GATEWAY_KEY,
    timeoutMs: Number(process.env.GATEWAY_TIMEOUT ?? "60000"),
    providers,
    routes: { ...DEFAULT_ROUTES, ...(overrides.routes ?? {}) },
  };
  validateConfig(cfg);
  return cfg;
}

const VALID_TYPES = ["openai", "gemini", "cloudflare"];

function validateConfig(cfg: GatewayConfig): void {
  const providerKeys = new Set(Object.keys(cfg.providers));
  for (const [name, p] of Object.entries(cfg.providers)) {
    if (!VALID_TYPES.includes(p.type)) {
      console.warn(`[config] provider "${name}" has unknown type "${p.type}" (expected ${VALID_TYPES.join("|")}); it will fail requests`);
    }
    if (!Array.isArray(p.models) || p.models.length === 0) {
      console.warn(`[config] provider "${name}" has no models; requests routed to it will fail`);
    }
  }
  for (const [route, list] of Object.entries(cfg.routes)) {
    if (!Array.isArray(list) || list.length === 0) {
      console.warn(`[config] route "${route}" is empty; requests to it will fail`);
      continue;
    }
    for (const entry of list) {
      const provider = entry.split("/")[0];
      if (!providerKeys.has(provider)) {
        console.warn(`[config] route "${route}" references unknown provider "${provider}" (entry "${entry}")`);
      }
    }
  }
}
