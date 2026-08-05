#!/usr/bin/env node
import { spawn } from "node:child_process";
import { loadGatewayConfig, type GatewayConfig } from "./config.js";
import { startServer } from "./server.js";

void main();

interface CliArgs {
  port?: number;
  config?: string;
  openBrowser: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { openBrowser: true, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-browser" || a === "--no-open") out.openBrowser = false;
    else if (a === "--port" || a === "-p") out.port = Number(argv[++i]);
    else if (a === "--config" || a === "-c") out.config = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function openBrowser(url: string): void {
  let cmd: string;
  let args: string[];
  if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    cmd = "open";
    args = [url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    // opening a browser is best-effort
  }
}

async function probeHealth(port: number, url: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`AirRoute — free AI gateway

Usage:
  airroute                 start gateway and open the console in your browser
  airroute --port 3000     run on a specific port
  airroute --config file   use an alternative config json
  airroute --no-browser    start without opening the dashboard
`);
    return;
  }

  const cfg: GatewayConfig = loadGatewayConfig(args.config);
  if (args.port) cfg.port = args.port;
  const server = startServer(cfg);
  const url = `http://localhost:${cfg.port}/dashboard`;

  server.on("error", async (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      const alive = await probeHealth(cfg.port, url);
      if (alive) {
        console.log("");
        console.log(`  ✈ AirRoute is already running on port ${cfg.port}.`);
        console.log(`    Console: ${url}`);
        if (args.openBrowser) openBrowser(url);
        console.log("");
      } else {
        console.error(`  Port ${cfg.port} is in use by another program (not AirRoute).`);
        console.error(`  Use --port <n> to run on a different port.`);
      }
    } else {
      console.error("  Server error:", err.message);
    }
    process.exit(0);
  });

  server.listen(cfg.port, () => {
    printBanner(cfg, args, url);
    if (args.openBrowser) {
      setTimeout(() => openBrowser(url), 300);
    }
  });
}

function printBanner(cfg: GatewayConfig, args: CliArgs, url: string): void {
  console.log("");
  console.log("  ✈ AirRoute — free providers, one endpoint");
  console.log(`    Console:  ${url}`);
  console.log(`    OpenAI:   http://localhost:${cfg.port}/v1/chat/completions`);
  console.log(`    Anthropic: http://localhost:${cfg.port}/v1/messages`);
  console.log("");
  console.log(`    Providers (${Object.keys(cfg.providers).length}): ${Object.keys(cfg.providers).join(", ")}`);
  console.log(`    Routes: ${Object.keys(cfg.routes).join(", ")} + auto`);
  console.log(`    Compression: ${process.env.GATEWAY_COMPRESS === "0" ? "off" : "on"}`);
  if (args.openBrowser) console.log(`    Opening dashboard in your browser…`);
  console.log("");
  const missing: string[] = [];
  for (const [name, p] of Object.entries(cfg.providers)) {
    const needsKey = p.type === "cloudflare" ? !p.apiKey || !p.accountId : !p.apiKey && !p.keyless;
    if (needsKey) missing.push(name);
  }
  if (missing.length) {
    console.warn(`    Missing API keys (skipped by failover): ${missing.join(", ")}`);
    console.warn("    Add keys in the console (Providers tab) or .env\n");
  }
}