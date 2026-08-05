export interface AgentConfig {
  baseUrl: string;
  model: string;
  prompt: string;
  temperature: number;
  numCtx: number;
  maxSteps: number;
  maxMessages: number;
  cwd: string;
  useGateway: boolean;
  gatewayUrl: string;
}

// Good, freely-available Ollama tool-calling models, best first.
export const RECOMMENDED_MODELS = [
  "qwen3:8b",
  "qwen2.5-coder:7b",
  "llama3.2:3b",
  "llama3.1:8b",
];

export function loadConfig(argv: string[]): AgentConfig {
  const args = parseArgs(argv);

  const useGateway = args["via"] === "gateway" || !!process.env.AGENT_GATEWAY;
  const gatewayUrl = str(args["gateway"], process.env.AGENT_GATEWAY_URL, "http://localhost:8787");
  const defaultModel = useGateway ? "default" : RECOMMENDED_MODELS[0]!;
  const model = str(args["model"], process.env.AGENT_MODEL ?? process.env.OLLAMA_MODEL, defaultModel);
  const baseUrl = str(args["host"], process.env.OLLAMA_HOST, "http://localhost:11434");

  return {
    baseUrl,
    model,
    prompt: str(args["prompt"], undefined, ""),
    temperature: num(args["temperature"], "AGENT_TEMP", 0.2),
    numCtx: num(args["context"], "AGENT_CTX", 32768),
    maxSteps: num(args["maxSteps"], "AGENT_MAX_STEPS", 25),
    maxMessages: num(undefined, "AGENT_MAX_MESSAGES", 100),
    cwd: process.cwd(),
    useGateway,
    gatewayUrl,
  };
}

function str(v: string | number | boolean | undefined, env: string | undefined, fallback: string): string {
  const raw = v !== undefined && v !== true ? String(v) : env;
  return raw ?? fallback;
}

function num(v: string | number | boolean | undefined, env: string, fallback: number): number {
  const raw = v !== undefined && v !== true ? String(v) : process.env[env];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseArgs(argv: string[]): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {};
  const prompt: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      prompt.push(a);
    }
  }
  out["prompt"] = prompt.join(" ");
  return out;
}