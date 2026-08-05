import type { ProviderConfig } from "./config.js";

export interface UpstreamResult {
  ok: boolean;
  status: number;
  contentType: string;
  body: ReadableStream<Uint8Array> | null;
  error?: string;
}

export type OpenAIBody = Record<string, unknown> & {
  model?: string;
  messages: unknown[];
  tools?: unknown[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  stop?: unknown;
  tool_choice?: unknown;
};

const rand = () => Math.random().toString(36).slice(2, 12);

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 600);
  } catch {
    return `HTTP ${res.status}`;
  }
}

function textStream(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(text));
      c.close();
    },
  });
}

function openaiChunk(partial: Record<string, unknown>, model: string, isChunk = false) {
  return {
    id: `chatcmpl-${rand()}`,
    object: isChunk ? "chat.completion.chunk" : "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    ...partial,
  };
}

async function requestOpenAI(cfg: ProviderConfig, body: OpenAIBody, timeoutMs: number): Promise<UpstreamResult> {
  const base = (cfg.baseUrl ?? "").replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    ...(cfg.headers ?? {}),
  };
  const res = await fetchWithTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, timeoutMs);
  if (!res.ok) {
    return { ok: false, status: res.status, contentType: "application/json", body: null, error: await safeText(res) };
  }
  return {
    ok: true,
    status: res.status,
    contentType: res.headers.get("content-type") ?? "application/json",
    body: res.body,
  };
}

// ---------- Gemini ----------

function toGeminiBody(body: OpenAIBody) {
  const contents: { role: string; parts: unknown[] }[] = [];
  let system = "";
  for (const m of body.messages as { role: string; content?: unknown; tool_calls?: unknown[] }[]) {
    if (m.role === "system") {
      system += (system ? "\n" : "") + String(m.content ?? "");
      continue;
    }
    if (m.role === "tool") {
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      const last = contents[contents.length - 1];
      const part = { functionResponse: { name: "tool", response: content } };
      if (last && last.role === "user") last.parts.push(part);
      else contents.push({ role: "user", parts: [part] });
      continue;
    }
    const parts: unknown[] = [];
    const content = m.content;
    if (typeof content === "string") parts.push({ text: content });
    else if (Array.isArray(content)) {
      for (const b of content as { type?: string; text?: string }[]) {
        if (b.type === "text" || b.text) parts.push({ text: b.text ?? "" });
      }
    }
    for (const tc of m.tool_calls ?? []) {
      const fn = (tc as { function: { name: string; arguments?: string } }).function;
      let args: unknown = {};
      try { args = JSON.parse(fn.arguments ?? "{}"); } catch { args = {}; }
      parts.push({ functionCall: { name: fn.name, args } });
    }
    const role = m.role === "assistant" ? "model" : "user";
    if (parts.length) {
      const last = contents[contents.length - 1];
      if (last && last.role === role) last.parts.push(...parts);
      else contents.push({ role, parts });
    }
  }

  const bodyOut: Record<string, unknown> = { contents };
  if (system) bodyOut.systemInstruction = { parts: [{ text: system }] };
  const gen: Record<string, unknown> = {};
  if (body.temperature != null) gen.temperature = body.temperature;
  if (body.max_tokens != null) gen.maxOutputTokens = body.max_tokens;
  if (Object.keys(gen).length) bodyOut.generationConfig = gen;
  const tools = (body.tools ?? []) as { type: string; function?: { name: string; description?: string; parameters?: unknown } }[];
  if (tools.length) {
    bodyOut.tools = [{
      functionDeclarations: tools.map((t) => ({
        name: t.function?.name ?? "tool",
        description: t.function?.description ?? "",
        parameters: t.function?.parameters ?? { type: "object", properties: {} },
      })),
    }];
  }
  return bodyOut;
}

const FINISH_MAP: Record<string, string> = {
  STOP: "stop",
  MAX_TOKENS: "length",
  SAFETY: "content_filter",
  RECITATION: "content_filter",
  MALFORMED_FUNCTION_CALL: "stop",
  FINISH_REASON_UNSPECIFIED: "stop",
};

function geminiPartsToOpenAI(c: Record<string, unknown> | undefined, model: string): { text: string; toolCalls: unknown[]; finish: string | null } {
  const parts = ((c?.content as { parts?: unknown[] })?.parts) ?? [];
  let text = "";
  const toolCalls: unknown[] = [];
  for (const p of parts as { text?: string; functionCall?: { name: string; args?: unknown } }[]) {
    if (p.text) text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${rand()}`,
        type: "function",
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
      });
    }
  }
  const fr = c?.finishReason ? (FINISH_MAP[String(c.finishReason)] ?? "stop") : null;
  return { text, toolCalls, finish: fr };
}

function geminiUsage(json: Record<string, unknown>) {
  const u = json.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
  return u
    ? { prompt_tokens: u.promptTokenCount ?? 0, completion_tokens: u.candidatesTokenCount ?? 0, total_tokens: u.totalTokenCount ?? 0 }
    : undefined;
}

async function requestGemini(cfg: ProviderConfig, body: OpenAIBody, timeoutMs: number): Promise<UpstreamResult> {
  const model = body.model ?? "gemini-2.5-flash";
  const stream = body.stream === true;
  const base = "https://generativelanguage.googleapis.com/v1beta/models";
  const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  const url = `${base}/${model}:${action}${stream ? "&" : "?"}key=${cfg.apiKey ?? ""}`;
  const gBody = toGeminiBody(body);

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gBody),
  }, timeoutMs);
  if (!res.ok) {
    return { ok: false, status: res.status, contentType: "application/json", body: null, error: await safeText(res) };
  }

  if (!stream) {
    const json = (await res.json()) as Record<string, unknown>;
    const cand = (json.candidates as Record<string, unknown>[] | undefined)?.[0];
    const { text, toolCalls, finish } = geminiPartsToOpenAI(cand, model);
    const out = openaiChunk({
      choices: [{ index: 0, message: { role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }, finish_reason: finish ?? "stop" }],
      usage: geminiUsage(json),
    }, model);
    return { ok: true, status: 200, contentType: "application/json", body: textStream(JSON.stringify(out)) };
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let finished = false;
  const gen: ReadableStream<Uint8Array> = new ReadableStream({
    async start(c) {
      try {
        const reader = res.body!.getReader();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            let j: Record<string, unknown>;
            try { j = JSON.parse(t.slice(5).trim()) as Record<string, unknown>; } catch { continue; }
            const cand = (j.candidates as Record<string, unknown>[] | undefined)?.[0];
            if (!cand) continue;
            const { text, toolCalls, finish } = geminiPartsToOpenAI(cand, model);
            const delta: Record<string, unknown> = { role: "assistant" };
            if (text) delta.content = text;
            if (toolCalls.length) delta.tool_calls = toolCalls;
            const chunk = openaiChunk({ choices: [{ index: 0, delta, finish_reason: null }] }, model, true);
            c.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            if (finish) {
              const last = openaiChunk({ choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: geminiUsage(j) }, model, true);
              c.enqueue(enc.encode(`data: ${JSON.stringify(last)}\n\n`));
              finished = true;
            }
          }
        }
        if (!finished) {
          const last = openaiChunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }, model, true);
          c.enqueue(enc.encode(`data: ${JSON.stringify(last)}\n\n`));
        }
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      } catch (e) {
        c.error(e);
      }
    },
  });
  return { ok: true, status: 200, contentType: "text/event-stream", body: gen };
}

// ---------- Cloudflare Workers AI ----------

async function requestCloudflare(cfg: ProviderConfig, body: OpenAIBody, timeoutMs: number): Promise<UpstreamResult> {
  const model = body.model ?? "";
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId ?? ""}/ai/run/${model}`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey ?? ""}` };
  const sendBody: Record<string, unknown> = {
    messages: body.messages,
    stream: body.stream === true,
    ...(body.max_tokens != null ? { max_tokens: body.max_tokens } : {}),
  };

  const res = await fetchWithTimeout(url, { method: "POST", headers, body: JSON.stringify(sendBody) }, timeoutMs);
  if (!res.ok) {
    return { ok: false, status: res.status, contentType: "application/json", body: null, error: await safeText(res) };
  }
  const json = (await res.json()) as { result?: { response?: string } };
  const text = String(json.result?.response ?? json.result ?? "");
  const payload = openaiChunk({
    choices: [{ index: 0, message: { role: "assistant", content: text || null }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }, model);

  if (!body.stream) {
    return { ok: true, status: 200, contentType: "application/json", body: textStream(JSON.stringify(payload)) };
  }
  const sse =
    `data: ${JSON.stringify(openaiChunk({ choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] }, model, true))}\n\n` +
    `data: ${JSON.stringify(openaiChunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }, model, true))}\n\n` +
    "data: [DONE]\n\n";
  return { ok: true, status: 200, contentType: "text/event-stream", body: textStream(sse) };
}

export function providerRequest(
  cfg: ProviderConfig,
  body: OpenAIBody,
  timeoutMs: number
): Promise<UpstreamResult> {
  switch (cfg.type) {
    case "gemini":
      return requestGemini(cfg, body, timeoutMs);
    case "cloudflare":
      return requestCloudflare(cfg, body, timeoutMs);
    case "openai":
    default:
      return requestOpenAI(cfg, body, timeoutMs);
  }
}

export interface ProbeResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
  reason?: "missing-key" | "configured-only";
}

export async function probeProvider(cfg: ProviderConfig, timeoutMs: number): Promise<ProbeResult> {
  const start = Date.now();
  try {
    if (cfg.type === "openai") {
      if (!cfg.apiKey) return { ok: false, status: 0, latencyMs: 0, reason: "missing-key", error: "no API key" };
      const res = await fetchWithTimeout(`${(cfg.baseUrl ?? "").replace(/\/+$/, "")}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, ...(cfg.headers ?? {}) },
      }, timeoutMs);
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
    }
    if (cfg.type === "gemini") {
      if (!cfg.apiKey) return { ok: false, status: 0, latencyMs: 0, reason: "missing-key", error: "no API key" };
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cfg.apiKey}`,
        { headers: { "Content-Type": "application/json" } },
        timeoutMs
      );
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
    }
    if (cfg.type === "cloudflare") {
      if (!cfg.apiKey || !cfg.accountId) {
        return { ok: false, status: 0, latencyMs: 0, reason: "missing-key", error: "need accountId + API token" };
      }
      const res = await fetchWithTimeout(
        `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/ai/models/search?per_page=1`,
        { headers: { Authorization: `Bearer ${cfg.apiKey}` } },
        timeoutMs
      );
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
    }
    return { ok: false, status: 0, latencyMs: 0, reason: "configured-only", error: "unknown type" };
  } catch (e) {
    return { ok: false, status: 0, latencyMs: Date.now() - start, error: (e as Error).message };
  }
}
