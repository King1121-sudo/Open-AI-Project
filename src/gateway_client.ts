import type { ChatOptions, Message, ToolDef } from "./types.js";

export interface GatewayClientConfig {
  baseUrl: string;
  model: string;
}

let callCounter = 0;

// OpenAI-compatible client used to drive the local agent through the gateway
// (free providers: Groq / OpenRouter / Gemini) instead of Ollama.
export class GatewayClient {
  private baseUrl: string;
  private model: string;

  constructor(config: GatewayClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
    this.model = config.model;
  }

  get modelName(): string {
    return this.model;
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/v1/models`);
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
    const data = (await res.json()) as { data: { id: string }[] };
    return data.data.map((m) => m.id);
  }

  async pullModel(): Promise<void> {
    // no-op: gateway models are already available
  }

  async chat(
    messages: Message[],
    tools: ToolDef[],
    options: ChatOptions = {}
  ): Promise<{ message: Message; usage?: { total_tokens?: number } }> {
    const body = this.buildBody(messages, tools, options);
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gateway chat failed (${res.status}): ${text.slice(0, 400)}`);
    }
    const j = (await res.json()) as {
      choices?: { message?: { role: string; content?: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number }[];
    };
    const m = j.choices?.[0]?.message;
    const msg: Message = { role: "assistant", content: m?.content ?? undefined };
    if (m?.tool_calls?.length) {
      msg.tool_calls = m.tool_calls.map((tc) => ({
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
    }
    const u = j.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      message: msg,
      usage: { total_tokens: (u?.prompt_tokens ?? 0) + (u?.completion_tokens ?? 0) },
    };
  }

  private buildBody(messages: Message[], tools: ToolDef[], options: ChatOptions): Record<string, unknown> {
    const pending: string[] = [];
    const msgs = messages.map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        const tcs = m.tool_calls.map((tc) => {
          const id = `call_${callCounter++}`;
          return { id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } };
        });
        pending.push(...tcs.map((t) => t.id));
        return { role: m.role, content: m.content ?? "", tool_calls: tcs };
      }
      if (m.role === "tool") {
        return { role: "tool", tool_call_id: pending.shift() ?? `call_${callCounter++}`, content: m.content ?? "" };
      }
      return { role: m.role, content: m.content ?? "" };
    });

    const body: Record<string, unknown> = {
      model: this.model,
      messages: msgs,
      stream: false,
      temperature: options.temperature ?? 0.2,
    };
    if (options.num_ctx) body.max_tokens = Math.min(options.num_ctx, 65536);
    if (tools.length) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: { name: t.function.name, description: t.function.description, parameters: t.function.parameters },
      }));
    }
    return body;
  }
}