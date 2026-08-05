import type { OpenAIBody } from "./providers.js";

const rand = () => Math.random().toString(36).slice(2, 12);

export function anthropicToOpenAI(a: Record<string, unknown>): OpenAIBody {
  const messages: Record<string, unknown>[] = [];
  const system = a.system as unknown;
  if (typeof system === "string") messages.push({ role: "system", content: system });
  else if (Array.isArray(system)) messages.push({ role: "system", content: system.map((b: { text?: string }) => b.text ?? "").join("\n") });

  for (const m of (a.messages as { role: string; content: unknown }[]) ?? []) {
    const content = Array.isArray(m.content) ? m.content : [{ type: "text", text: m.content }];
    if (m.role === "user") {
      let text = "";
      let images: unknown[] = [];
      const toolResults: Record<string, unknown>[] = [];
      for (const b of content as { type?: string; text?: string; tool_use_id?: string; content?: unknown; source?: unknown }[]) {
        if (b.type === "text") text += (text ? "\n" : "") + (b.text ?? "");
        else if (b.type === "image") images.push({ type: "image_url", image_url: { url: (b.source as { data?: string })?.data } });
        else if (b.type === "tool_result") {
          const t = b.content;
          const cstr = typeof t === "string" ? t : Array.isArray(t) ? t.map((x: { text?: string }) => x.text ?? "").join("\n") : JSON.stringify(t);
          toolResults.push({ role: "tool", tool_call_id: b.tool_use_id, content: cstr ?? "" });
        }
      }
      if (text) messages.push({ role: "user", content: images.length ? [{ type: "text", text }, ...images] : text });
      else if (images.length) messages.push({ role: "user", content: images });
      messages.push(...toolResults);
    } else if (m.role === "assistant") {
      const msg: Record<string, unknown> = { role: "assistant", content: "" };
      const toolCalls: unknown[] = [];
      for (const b of (content as { type?: string; text?: string; id?: string; name?: string; input?: unknown }[])) {
        if (b.type === "text") msg.content += b.text ?? "";
        else if (b.type === "tool_use") {
          toolCalls.push({ id: b.id ?? `call_${rand()}`, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } });
        }
        // "thinking" blocks are ignored.
      }
      if (toolCalls.length) msg.tool_calls = toolCalls;
      messages.push(msg);
    }
  }

  const out: OpenAIBody = { model: (a.model as string) ?? "default", messages, stream: !!a.stream };
  if (a.max_tokens != null) out.max_tokens = a.max_tokens as number;
  if (a.temperature != null) out.temperature = a.temperature as number;
  if (a.top_p != null) out.top_p = a.top_p as number;
  if (Array.isArray(a.stop_sequences)) out.stop = a.stop_sequences;
  if (Array.isArray(a.tools)) {
    out.tools = a.tools.map((t: { name: string; description?: string; input_schema?: unknown }) => ({
      type: "function",
      function: { name: t.name, description: t.description ?? "", parameters: t.input_schema ?? { type: "object", properties: {} } },
    }));
  }
  if (a.tool_choice) out.tool_choice = a.tool_choice;
  return out;
}

const STOP_MAP: Record<string, string> = {
  stop: "end_turn",
  tool_calls: "tool_use",
  length: "max_tokens",
  content_filter: "end_turn",
};

export function openaiToAnthropic(o: Record<string, unknown>, requestedModel: string): Record<string, unknown> {
  const c = (o.choices as { index: number; message?: Record<string, unknown>; finish_reason?: string }[] | undefined)?.[0];
  const msg = c?.message ?? {};
  const content: Record<string, unknown>[] = [];
  if (msg.content) content.push({ type: "text", text: String(msg.content) });
  for (const tc of (msg.tool_calls as { id?: string; function?: { name: string; arguments?: string } }[]) ?? []) {
    let input: unknown = {};
    try { input = JSON.parse(tc.function?.arguments ?? "{}"); } catch { input = { _raw: tc.function?.arguments }; }
    content.push({ type: "tool_use", id: tc.id ?? `toolu_${rand()}`, name: tc.function?.name, input });
  }
  const u = (o.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  return {
    id: `msg_${rand()}`,
    type: "message",
    role: "assistant",
    model: requestedModel,
    content: content.length ? content : [{ type: "text", text: "" }],
    stop_reason: STOP_MAP[c?.finish_reason ?? "stop"] ?? "end_turn",
    stop_sequence: null,
    usage: { input_tokens: u.prompt_tokens ?? 0, output_tokens: u.completion_tokens ?? 0 },
  };
}

function event(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3.7));
}

// Convert an OpenAI-format SSE text stream into Anthropic SSE events (async generator of strings).
export async function* openaiSseToAnthropicEvents(stream: ReadableStream<Uint8Array>, model: string): AsyncGenerator<string> {
  const dec = new TextDecoder();
  const id = `msg_${rand()}`;
  let started = false;
  let textBlockOpen = false;
  let contentIndex = 0;
  const toolBlocks = new Map<number, { opened: boolean; blockIndex: number }>();

  const reader = stream.getReader();
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
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j: Record<string, unknown>;
      try { j = JSON.parse(payload) as Record<string, unknown>; } catch { continue; }
      const choice = (j.choices as Record<string, unknown>[] | undefined)?.[0] ?? {};
      const delta = (choice.delta ?? {}) as Record<string, unknown>;
      const finish = choice.finish_reason as string | null | undefined;
      const usage = (j.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };

      if (!started) {
        started = true;
        yield event("message_start", {
          type: "message_start",
          message: {
            id, type: "message", role: "assistant", model,
            content: [], stop_reason: null, stop_sequence: null,
            usage: { input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0 },
          },
        });
      }

      for (const tc of (delta.tool_calls as { index?: number; id?: string; function?: { name?: string; arguments?: string } }[]) ?? []) {
        const idx = tc.index ?? 0;
        let blk = toolBlocks.get(idx);
        if (!blk) {
          blk = { opened: true, blockIndex: contentIndex };
          contentIndex++;
          toolBlocks.set(idx, blk);
          yield event("content_block_start", {
            type: "content_block_start",
            index: blk.blockIndex,
            content_block: { type: "tool_use", id: tc.id ?? `toolu_${rand()}`, name: tc.function?.name ?? "tool", input: {} },
          });
        }
        if (tc.function?.arguments) {
          yield event("content_block_delta", {
            type: "content_block_delta",
            index: blk.blockIndex,
            delta: { type: "input_json_delta", partial_json: tc.function.arguments },
          });
        }
      }

      if (delta.content) {
        if (!textBlockOpen) {
          textBlockOpen = true;
          contentIndex++;
          yield event("content_block_start", { type: "content_block_start", index: contentIndex - 1, content_block: { type: "text", text: "" } });
        }
        yield event("content_block_delta", {
          type: "content_block_delta",
          index: contentIndex - 1,
          delta: { type: "text_delta", text: String(delta.content) },
        });
      }

      if (finish) {
        if (textBlockOpen) {
          yield event("content_block_stop", { type: "content_block_stop", index: contentIndex - 1 });
          textBlockOpen = false;
        }
        for (const blk of toolBlocks.values()) {
          yield event("content_block_stop", { type: "content_block_stop", index: blk.blockIndex });
        }
        toolBlocks.clear();
        yield event("message_delta", {
          type: "message_delta",
          delta: { stop_reason: STOP_MAP[finish] ?? "end_turn", stop_sequence: null },
          usage: { output_tokens: usage.completion_tokens ?? 0 },
        });
        yield event("message_stop", { type: "message_stop" });
        return;
      }
    }
  }

  if (started) {
    if (textBlockOpen) {
      yield event("content_block_stop", { type: "content_block_stop", index: contentIndex - 1 });
      textBlockOpen = false;
    }
    for (const blk of toolBlocks.values()) yield event("content_block_stop", { type: "content_block_stop", index: blk.blockIndex });
    toolBlocks.clear();
    yield event("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 0 } });
    yield event("message_stop", { type: "message_stop" });
  }
}