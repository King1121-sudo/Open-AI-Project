import type { ChatOptions, Message, ToolDef } from "./types.js";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.model = config.model;
  }

  get modelName(): string {
    return this.model;
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = (await res.json()) as { models: { name: string }[] };
    return data.models.map((m) => m.name);
  }

  async pullModel(model: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false }),
    });
    if (!res.ok) throw new Error(`Failed to pull ${model}: ${res.status}`);
    await res.json();
  }

  async chat(
    messages: Message[],
    tools: ToolDef[],
    options: ChatOptions = {}
  ): Promise<{ message: Message; usage?: { total_tokens?: number } }> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      stream: false,
      tools,
      options: { temperature: options.temperature ?? 0.2, num_ctx: options.num_ctx ?? 8192 },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as { message: Message; prompt_eval_count?: number; eval_count?: number; done: boolean };
    return {
      message: data.message,
      usage: {
        total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }
}