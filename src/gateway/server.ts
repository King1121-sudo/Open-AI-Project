import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { resolve as resolvePath } from "node:path";
import type { GatewayConfig, ProviderConfig } from "./config.js";
import { resolveRoute, failover } from "./router.js";
import { anthropicToOpenAI, openaiToAnthropic, openaiSseToAnthropicEvents, estimateTokens } from "./anthropic.js";
import type { OpenAIBody } from "./providers.js";
import { probeProvider } from "./providers.js";
import { usage } from "./usage.js";
import { saveProvider, saveRoute, deleteRoute, readSaved, reloadConfig } from "./config_store.js";
import { serveConsole } from "./console.js";
import { compressOpenAIBody } from "./compress.js";
import { computeFreeBudget } from "./freetiers.js";

let activeCfg: GatewayConfig;

const COMPRESS_BUDGET = Number(process.env.GATEWAY_COMPRESS_BUDGET ?? "64000");
const COMPRESS_ENABLED = process.env.GATEWAY_COMPRESS !== "0";

export function startServer(cfg: GatewayConfig): http.Server {
  activeCfg = cfg;
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (e) {
      console.error("[server] error:", (e as Error).message);
      if (!res.headersSent) sendJSON(res, 500, { error: { message: (e as Error).message } });
      else res.destroy(e as Error);
    }
  });
  return server;
}

function cfg(): GatewayConfig {
  return activeCfg;
}

function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  const url = (req.url ?? "").split("?")[0];

  if (method === "GET" && (url === "/" || url === "/health")) {
    return Promise.resolve(sendText(res, 200, `Local Gateway OK\nProviders: ${Object.keys(cfg().providers).join(", ")}\nRoutes: ${Object.keys(cfg().routes).join(", ")}\nConsole: GET /dashboard\n`));
  }
  if (method === "GET" && url === "/stats") {
    return Promise.resolve(sendJSON(res, 200, usage.snapshot()));
  }
  if (method === "GET" && url === "/dashboard") {
    return Promise.resolve(serveConsole(res));
  }
  if (method === "GET" && url === "/api/config") {
    return handleGetConfig(res);
  }
  if (method === "GET" && url === "/api/freetiers") {
    return Promise.resolve(sendJSON(res, 200, computeFreeBudget(providerTokenUsage())));
  }
  if (method === "GET" && url === "/api/health") {
    return handleGetHealth(req, res);
  }
  if (method === "POST" && url === "/api/providers") {
    return handleSaveProvider(req, res);
  }
  if (method === "DELETE" && url === "/api/providers") {
    return handleDeleteProvider(req, res, true);
  }
  if (method === "POST" && url === "/api/routes") {
    return handleSaveRoute(req, res);
  }
  if (method === "DELETE" && url === "/api/routes") {
    return handleDeleteProvider(req, res, false);
  }
  if (method === "GET" && (url === "/v1/models" || url === "/models")) {
    return Promise.resolve(sendJSON(res, 200, url === "/v1/models" ? openaiModels(cfg()) : anthropicModels(cfg())));
  }
  if (method === "POST" && url === "/v1/chat/completions") {
    return handleOpenAI(req, res);
  }
  if (method === "POST" && url === "/v1/messages/count_tokens") {
    return handleCountTokens(req, res);
  }
  if (method === "POST" && url === "/v1/messages") {
    return handleAnthropic(req, res);
  }
  return Promise.resolve(sendText(res, 404, "Not found"));
}

// ---------- Management API ----------

function adminOK(req: IncomingMessage, res: ServerResponse): boolean {
  if (!cfg().gatewayKey) return true;
  return authorize(req, cfg());
}

function providerTokenUsage(): Record<string, { tokensIn: number; tokensOut: number }> {
  const out: Record<string, { tokensIn: number; tokensOut: number }> = {};
  const snap = usage.snapshot().providers as Record<string, { tokensIn: number; tokensOut: number }>;
  for (const [k, v] of Object.entries(snap)) out[k] = { tokensIn: v.tokensIn, tokensOut: v.tokensOut };
  return out;
}

function handleGetConfig(res: ServerResponse): Promise<void> {
  const saved = readSaved();
  const publicProviders: Record<string, Omit<ProviderConfig, "apiKey" | "accountId"> & { keySet: boolean; accountSet: boolean; keyless: boolean }> = {};
  for (const [name, p] of Object.entries(cfg().providers)) {
    publicProviders[name] = {
      type: p.type,
      baseUrl: p.baseUrl,
      headers: p.headers,
      models: p.models,
      keySet: !!p.apiKey,
      accountSet: !!p.accountId,
      keyless: !!p.keyless,
    };
  }
  return Promise.resolve(
    sendJSON(res, 200, {
      configPath: resolvePath(process.env.GATEWAY_CONFIG ?? "gateway.config.json"),
      port: cfg().port,
      keyRequired: s0(saved.gatewayKey),
      providers: publicProviders,
      routes: cfg().routes,
    })
  );
}

const s0 = (v: unknown) => !!v && String(v).length > 0;

async function handleGetHealth(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!adminOK(req, res)) return sendJSON(res, 401, { error: "unauthorized" });
  const results = await Promise.all(
    Object.entries(cfg().providers).map(async ([name, p]) => {
      const probe = await probeProvider(p, Math.min(cfg().timeoutMs, 6000));
      return [name, probe] as const;
    })
  );
  sendJSON(res, 200, Object.fromEntries(results));
}

async function handleSaveProvider(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!adminOK(req, res)) return sendJSON(res, 401, { error: "unauthorized" });
  const body = (await readBody(req)) as { name?: string; provider?: Partial<ProviderConfig> };
  const name = String(body.name ?? "").trim();
  const p = (body.provider ?? {}) as Partial<ProviderConfig>;
  if (!name) return sendJSON(res, 400, { error: "provider name is required" });
  if (p.type && !["openai", "gemini", "cloudflare"].includes(p.type)) {
    return sendJSON(res, 400, { error: `unknown provider type "${p.type}"` });
  }
  const cleaned: ProviderConfig = {
    type: (p.type ?? "openai") as ProviderConfig["type"],
    models: Array.isArray(p.models) ? p.models.map((m) => String(m).trim()).filter(Boolean) : [],
  };
  if (p.baseUrl) cleaned.baseUrl = String(p.baseUrl).trim();
  if (p.apiKey && String(p.apiKey).trim()) cleaned.apiKey = String(p.apiKey).trim();
  else if ((p.type ?? "openai") === "openai") cleaned.keyless = true; // keyless openai provider
  if (p.accountId && String(p.accountId).trim()) cleaned.accountId = String(p.accountId).trim();
  if (p.headers && typeof p.headers === "object") cleaned.headers = p.headers as Record<string, string>;
  try {
    saveProvider(name, cleaned);
    activeCfg = reloadConfig();
    return sendJSON(res, 200, { saved: name, keySet: !!cleaned.apiKey });
  } catch (e) {
    return sendJSON(res, 500, { error: (e as Error).message });
  }
}

async function handleDeleteProvider(req: IncomingMessage, res: ServerResponse, isProvider: boolean): Promise<void> {
  if (!adminOK(req, res)) return sendJSON(res, 401, { error: "unauthorized" });
  const body = await readBody(req);
  const name = String(body.name ?? "").trim();
  if (!name) return sendJSON(res, 400, { error: "name is required" });
  try {
    if (isProvider) {
      saveProvider(name, { type: "openai", models: [] }, { remove: true });
      // drop references to this provider from routes
      const saved = readSaved();
      const changed: string[] = [];
      for (const [r, list] of Object.entries(saved.routes ?? {})) {
        const next = list.filter((e) => !e.startsWith(`${name}/`));
        if (next.length !== list.length) { saveRoute(r, next); changed.push(r); }
      }
    } else {
      deleteRoute(name);
    }
    activeCfg = reloadConfig();
    return sendJSON(res, 200, { removed: name });
  } catch (e) {
    return sendJSON(res, 500, { error: (e as Error).message });
  }
}

async function handleSaveRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!adminOK(req, res)) return sendJSON(res, 401, { error: "unauthorized" });
  const body = (await readBody(req)) as { name?: string; list?: unknown };
  const name = String(body.name ?? "").trim();
  if (!name) return sendJSON(res, 400, { error: "route name is required" });
  const list = Array.isArray(body.list)
    ? body.list.map((m) => String(m).trim()).filter(Boolean)
    : [];
  if (!list.length) return sendJSON(res, 400, { error: "route must have at least one provider/model entry" });
  try {
    saveRoute(name, list);
    activeCfg = reloadConfig();
    return sendJSON(res, 200, { saved: name, entries: list.length });
  } catch (e) {
    return sendJSON(res, 500, { error: (e as Error).message });
  }
}

// ---------- Auth / helpers ----------

function authorize(req: IncomingMessage, c: GatewayConfig): boolean {
  if (!c.gatewayKey) return true;
  const auth = req.headers["authorization"];
  let token: string | undefined;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) token = auth.slice(7);
  else {
    const xk = req.headers["x-api-key"];
    if (typeof xk === "string") token = xk;
  }
  return token === c.gatewayKey;
}

async function readBody(req: IncomingMessage, limit = 5 * 1024 * 1024): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new Error("Request body too large");
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function sendJSON(res: ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(body);
}

function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { "content-type": "text/plain", "access-control-allow-origin": "*" });
  res.end(text);
}

function extractUsage(json: Record<string, unknown>): { tokensIn: number; tokensOut: number } {
  const u = (json.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  return { tokensIn: u.prompt_tokens ?? 0, tokensOut: u.completion_tokens ?? 0 };
}

function usageCapture(body: ReadableStream<Uint8Array>, provider: string): ReadableStream<Uint8Array> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = dec.decode(value, { stream: true });
          buf += text;
          let nl = buf.indexOf("\n");
          while (nl >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            const t = line.trim();
            if (t.startsWith("data:")) {
              const payload = t.slice(5).trim();
              if (payload !== "[DONE]") {
                try {
                  const j = JSON.parse(payload) as Record<string, unknown>;
                  const { tokensIn, tokensOut } = extractUsage(j);
                  if (tokensIn || tokensOut) usage.recordTokens(provider, tokensIn, tokensOut);
                } catch {
                  // malformed JSON; ignore
                }
              }
            }
            controller.enqueue(enc.encode(line + "\n"));
            nl = buf.indexOf("\n");
          }
          if (buf.length > 0) {
            controller.enqueue(enc.encode(buf));
            buf = "";
          }
        }
        if (buf) controller.enqueue(enc.encode(buf));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

async function pump(body: ReadableStream<Uint8Array>, res: ServerResponse): Promise<void> {
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    res.destroy(e as Error);
  }
}

// ---------- OpenAI / Anthropic handlers ----------

async function handleOpenAI(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!authorize(req, cfg())) return sendJSON(res, 401, { error: { message: "Invalid or missing gateway key" } });
  const body = (await readBody(req)) as OpenAIBody;
  const modelName = (body.model as string) ?? "default";
  const { steps, error } = resolveRoute(modelName, cfg());
  if (error) return sendJSON(res, 400, { error: { message: error } });

  const send = COMPRESS_ENABLED ? compressOpenAIBody(body, COMPRESS_BUDGET) : body;
  usage.beginRequest();
  const route = usage.routeStat(modelName);
  route.calls++;
  const out = await failover(steps, cfg(), send);
  usage.endRequest();
  if (!out.result) {
    route.failed++;
    return sendJSON(res, out.lastError?.status ?? 502, { error: { message: out.lastError?.message ?? `All providers failed (tried: ${out.tried.join(", ")})` } });
  }
  route.ok++;
  const r = out.result;

  if (body.stream) {
    res.writeHead(200, {
      "content-type": r.contentType,
      "access-control-allow-origin": "*",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    if (r.body) await pump(usageCapture(r.body, out.used ?? modelName), res);
    else res.end();
    return;
  }

  const text = await readStreamText(r.body);
  const json = JSON.parse(text) as Record<string, unknown>;
  const { tokensIn, tokensOut } = extractUsage(json);
  if (tokensIn || tokensOut) usage.recordTokens(out.used ?? modelName, tokensIn, tokensOut);
  sendJSON(res, 200, json);
}

async function handleAnthropic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!authorize(req, cfg())) return sendJSON(res, 401, { error: { message: "Invalid or missing gateway key" } });
  const body = await readBody(req);
  const openaiBody = anthropicToOpenAI(body);
  const modelName = String(openaiBody.model ?? "default");
  const { steps, error } = resolveRoute(modelName, cfg());
  if (error) return sendJSON(res, 400, { error: { message: error } });

  const send = COMPRESS_ENABLED ? compressOpenAIBody(openaiBody, COMPRESS_BUDGET) : openaiBody;
  usage.beginRequest();
  const route = usage.routeStat(modelName);
  route.calls++;
  const out = await failover(steps, cfg(), send);
  usage.endRequest();
  if (!out.result) {
    route.failed++;
    return sendJSON(res, out.lastError?.status ?? 502, { error: { message: out.lastError?.message ?? `All providers failed (tried: ${out.tried.join(", ")})` } });
  }
  route.ok++;
  const r = out.result;

  if (openaiBody.stream) {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" });
    const enc = new TextEncoder();
    try {
      for await (const s of openaiSseToAnthropicEvents(usageCapture(r.body!, out.used ?? modelName), modelName)) {
        res.write(enc.encode(s));
      }
      res.end();
    } catch (e) {
      res.destroy(e as Error);
    }
  } else {
    const text = await readStreamText(r.body);
    const openaiJson = JSON.parse(text) as Record<string, unknown>;
    const { tokensIn, tokensOut } = extractUsage(openaiJson);
    if (tokensIn || tokensOut) usage.recordTokens(out.used ?? modelName, tokensIn, tokensOut);
    sendJSON(res, 200, openaiToAnthropic(openaiJson, modelName));
  }
}

async function handleCountTokens(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req);
  const messages = (body.messages ?? []) as { content?: unknown }[];
  const text = messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n");
  const system = body.system as unknown;
  const sysText = typeof system === "string" ? system : JSON.stringify(system);
  sendJSON(res, 200, { input_tokens: estimateTokens(text + sysText) });
}

async function readStreamText(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "{}";
  const dec = new TextDecoder();
  const reader = body.getReader();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

function openaiModels(c: GatewayConfig) {
  const now = Math.floor(Date.now() / 1000);
  const data: { id: string; object: string; created: number; owned_by: string }[] = [
    { id: "auto", object: "model", created: now, owned_by: "adaptive" },
  ];
  for (const name of Object.keys(c.routes)) data.push({ id: name, object: "model", created: now, owned_by: "route" });
  for (const [provider, p] of Object.entries(c.providers)) {
    for (const m of p.models) data.push({ id: `${provider}/${m}`, object: "model", created: now, owned_by: provider });
  }
  return { object: "list", data };
}

function anthropicModels(c: GatewayConfig) {
  const now = new Date().toISOString();
  const data: { type: string; id: string; display_name: string; created_at: string }[] = [
    { type: "model", id: "auto", display_name: "auto", created_at: now },
  ];
  for (const name of Object.keys(c.routes)) data.push({ type: "model", id: name, display_name: name, created_at: now });
  for (const [provider, p] of Object.entries(c.providers)) {
    for (const m of p.models) data.push({ type: "model", id: `${provider}/${m}`, display_name: `${provider}/${m}`, created_at: now });
  }
  return { data, has_more: false, first_id: data[0]?.id ?? "", last_id: data[data.length - 1]?.id ?? "" };
}