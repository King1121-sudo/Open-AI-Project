export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: Role;
  content?: string;
  tool_calls?: ToolCall[];
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolDef {
  type: "function";
  function: ToolFunction;
}

export interface ChatOptions {
  temperature?: number;
  num_ctx?: number;
}

export interface ToolResult {
  tool: string;
  args: unknown;
  output: string;
  ok: boolean;
  callId?: string;
}

export interface ChatBackend {
  chat(
    messages: Message[],
    tools: ToolDef[],
    options?: ChatOptions
  ): Promise<{ message: Message; usage?: { total_tokens?: number } }>;
}