#!/usr/bin/env node
import { loadConfig, RECOMMENDED_MODELS } from "./config.js";
import { OllamaClient } from "./ollama.js";
import { GatewayClient } from "./gateway_client.js";
import { runAgent } from "./agent.js";

void main();

async function main() {
  const cfg = loadConfig(process.argv.slice(2));

  if (!cfg.prompt) {
    printHelp();
    return;
  }

  const client = cfg.useGateway
    ? new GatewayClient({ baseUrl: cfg.gatewayUrl, model: cfg.model })
    : new OllamaClient({ baseUrl: cfg.baseUrl, model: cfg.model });

  if (!(await client.isReachable())) {
    if (cfg.useGateway) {
      console.error(`Cannot reach the gateway at ${cfg.gatewayUrl}.\nStart it first: npm run gateway`);
    } else {
      console.error(
        `Cannot reach Ollama at ${cfg.baseUrl}.\n` +
          `Install and start it first: https://ollama.com/download  (then run '"ollama serve"')`
      );
    }
    process.exit(1);
  }

  if (!cfg.useGateway) {
    const installed = await client.listModels();
    if (!installed.some((m) => m.split(":").slice(0, 2).join(":") === cfg.model)) {
      console.log(`Model "${cfg.model}" not installed. Pulling it now (this is a one-time download)...`);
      try {
        await client.pullModel(cfg.model);
      } catch (e) {
        console.error("Pull failed:", (e as Error).message);
        console.error(
          `Check the name is correct, e.g. one of: ${RECOMMENDED_MODELS.join(", ")}` +
            `\nPick another with --model <name>.`
        );
        process.exit(1);
      }
    }
  }

  console.log(
    `Running ${cfg.useGateway ? "gateway" : "local"} agent\n` +
      `  model: ${cfg.model}\n  cwd:   ${cfg.cwd}\n  prompt: ${cfg.prompt}\n`
  );

  try {
    await runAgent(client, cfg.prompt, cfg);
  } catch (e) {
    console.error("\nAgent error:", (e as Error).message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`Local AI Coding Agent (Ollama local OR free-provider gateway)

Usage:
  agent "describe the task you want completed"
  agent --model qwen3:8b "refactor services and add tests"
  agent --via gateway "add a feature"          # use the free-provider gateway
  agent --via gateway --model coder "write tests"

Options:
  --model <name>      Ollama model (default: ${RECOMMENDED_MODELS[0]}) or gateway route (default, coder, fast)
  --host <url>        Ollama endpoint (default: http://localhost:11434)
  --via gateway       use the free-provider gateway instead of Ollama
  --gateway <url>     gateway endpoint (default: http://localhost:8787)
  --temperature <n>   Sampling temperature (default 0.2)
  --context <n>       Context window tokens (default 32768)
  --maxSteps <n>      Max agent iterations (default 25)

Environment:
  AGENT_MODEL, OLLAMA_HOST, AGENT_TEMP, AGENT_CTX, AGENT_MAX_STEPS
  AGENT_GATEWAY (set to use gateway), AGENT_GATEWAY_URL

Recommended models:
  ${RECOMMENDED_MODELS.join("\n  ")}

First run:  ollama serve   (keep it running)
`);
}