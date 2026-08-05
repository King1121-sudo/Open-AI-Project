import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadGatewayConfig, type GatewayConfig, type ProviderConfig } from "./config.js";

export interface SavedConfig {
  port?: number;
  gatewayKey?: string;
  providers?: Record<string, ProviderConfig>;
  routes?: Record<string, string[]>;
}

function filePath(): string {
  return resolve(process.env.GATEWAY_CONFIG ?? "gateway.config.json");
}

export function readSaved(): SavedConfig {
  const f = filePath();
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(readFileSync(f, "utf8")) as SavedConfig;
  } catch {
    return {};
  }
}

function persist(saved: SavedConfig): void {
  const f = filePath();
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, `${JSON.stringify(saved, null, 2)}\n`, "utf8");
}

export function saveProvider(name: string, p: ProviderConfig, { remove = false } = {}): SavedConfig {
  const s = readSaved();
  s.providers = { ...(s.providers ?? {}) };
  if (remove) delete s.providers[name];
  else s.providers[name] = p;
  persist(s);
  return s;
}

export function saveRoute(name: string, list: string[]): SavedConfig {
  const s = readSaved();
  s.routes = { ...(s.routes ?? {}) };
  s.routes[name] = list;
  persist(s);
  return s;
}

export function deleteRoute(name: string): SavedConfig {
  const s = readSaved();
  s.routes = { ...(s.routes ?? {}) };
  delete s.routes[name];
  persist(s);
  return s;
}

export function reloadConfig(): GatewayConfig {
  return loadGatewayConfig();
}