import type { AgentConfig } from "./config.js";
import { executeTool, TOOLS } from "./tools.js";
import type { ChatBackend, Message } from "./types.js";

function systemPrompt(cwd: string): string {
  return `You are a capable software engineering agent running fully locally. You work in the project directory: ${cwd}

Rules:
- You can use tools to run shell commands, read/write/edit files, list directories, grep, and glob. Use them whenever they help — do not guess about a codebase you have not inspected.
- Work autonomously and iteratively: inspect, implement, then verify (build/test) and fix failures.
- Never invent command output or file contents. Only report what tools actually return.
- Keep tool arguments valid and complete. For write_file always provide the entire file.
- When the task is complete, stop calling tools and give a concise final summary of what you did, what files changed, and how to run/verify the result. Include file paths.
- If a tool errors, diagnose from the error message and retry with a corrected approach.`;
}

function prune(messages: Message[], max: number): Message[] {
  if (messages.length <= max) return messages;
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  return [...system, ...rest.slice(-(max - system.length))];
}

export async function runAgent(client: ChatBackend, task: string, cfg: AgentConfig): Promise<void> {
  const messages: Message[] = [
    { role: "system", content: systemPrompt(cfg.cwd) },
    { role: "user", content: task },
  ];

  for (let step = 0; step < cfg.maxSteps; step++) {
    const { message } = await client.chat(prune(messages, cfg.maxMessages), TOOLS, {
      temperature: cfg.temperature,
      num_ctx: cfg.numCtx,
    });

    if (message.content) process.stdout.write(`\n${message.content}\n`);

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      console.log("\nDone.");
      return;
    }

    messages.push({ role: "assistant", content: message.content, tool_calls: calls });

    for (const call of calls) {
      const name = call.function.name;
      const rawArgs = call.function.arguments ?? "{}";
      console.log(`\n[step ${step + 1}] calling ${name}(${rawArgs.slice(0, 200)})`);
      const result = await executeTool(name, rawArgs);
      if (!result.ok) console.log(`  -> ERROR: ${result.output.slice(0, 400)}`);
      else console.log(`  -> ok: ${result.output.slice(0, 300).replace(/\n/g, " ")}`);
      messages.push({ role: "tool", content: result.output });
    }
  }

  console.log(`\nStopped after ${cfg.maxSteps} steps. Increase AGENT_MAX_STEPS if the task needs more.`);
}