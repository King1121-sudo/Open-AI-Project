export interface ProviderStat {
  calls: number;
  ok: number;
  failed: number;
  rateLimited: number;
  inCooldown: boolean;
  cooldownUntil: number;
  cooldownMs: number;
  lastStatus?: number;
  lastError?: string;
  tokensIn: number;
  tokensOut: number;
  lastLatencyMs?: number;
  avgLatencyMs?: number;
}

export interface RouteStat {
  calls: number;
  ok: number;
  failed: number;
}

interface Totals {
  calls: number;
  ok: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
}

class UsageTracker {
  providers = new Map<string, ProviderStat>();
  routes = new Map<string, RouteStat>();
  totals: Totals = { calls: 0, ok: 0, failed: 0, tokensIn: 0, tokensOut: 0 };
  startedAt = Date.now();
  private requestsInFlight = 0;

  beginRequest(): void {
    this.totals.calls++;
    this.requestsInFlight++;
  }
  endRequest(): void {
    this.requestsInFlight = Math.max(0, this.requestsInFlight - 1);
  }

  providerStat(name: string): ProviderStat {
    let s = this.providers.get(name);
    if (!s) {
      s = { calls: 0, ok: 0, failed: 0, rateLimited: 0, inCooldown: false, cooldownUntil: 0, cooldownMs: 0, tokensIn: 0, tokensOut: 0, avgLatencyMs: undefined };
      this.providers.set(name, s);
    }
    return s;
  }

  routeStat(name: string): RouteStat {
    let s = this.routes.get(name);
    if (!s) {
      s = { calls: 0, ok: 0, failed: 0 };
      this.routes.set(name, s);
    }
    return s;
  }

  recordProvider(name: string, opts: { ok: boolean; status?: number; error?: string; tokensIn?: number; tokensOut?: number; latencyMs?: number }): void {
    const s = this.providerStat(name);
    s.calls++;
    s.lastStatus = opts.status;
    if (opts.error) s.lastError = opts.error.slice(0, 160);
    if (opts.latencyMs != null) {
      s.lastLatencyMs = opts.latencyMs;
      s.avgLatencyMs = s.avgLatencyMs == null ? opts.latencyMs : Math.round(s.avgLatencyMs * 0.75 + opts.latencyMs * 0.25);
    }
    if (opts.ok) {
      s.ok++;
      s.inCooldown = false;
      s.cooldownUntil = 0;
      this.totals.ok++;
    } else {
      s.failed++;
      this.totals.failed++;
      if (opts.status === 429) {
        s.rateLimited++;
        this.applyCooldown(s, 30_000);
      } else if (opts.status !== undefined && opts.status >= 500) {
        this.applyCooldown(s, 8_000);
      }
    }
    if (opts.tokensIn) this.totals.tokensIn += opts.tokensIn;
    if (opts.tokensOut) this.totals.tokensOut += opts.tokensOut;
  }

  private applyCooldown(s: ProviderStat, ms: number): void {
    s.cooldownMs = ms;
    s.cooldownUntil = Date.now() + ms;
    s.inCooldown = true;
  }

  isCoolingDown(name: string): boolean {
    const s = this.providers.get(name);
    if (!s || !s.inCooldown) return false;
    if (Date.now() >= s.cooldownUntil) {
      s.inCooldown = false;
      s.cooldownUntil = 0;
      return false;
    }
    return true;
  }

  latencyOf(name: string): number | null {
    const s = this.providers.get(name);
    return s?.avgLatencyMs ?? null;
  }

  recordTokens(name: string, tokensIn: number, tokensOut: number): void {
    this.totals.tokensIn += tokensIn;
    this.totals.tokensOut += tokensOut;
    const s = this.providers.get(name);
    if (s) {
      s.tokensIn = (s.tokensIn ?? 0) + tokensIn;
      s.tokensOut = (s.tokensOut ?? 0) + tokensOut;
    }
  }

  snapshot() {
    const providers = Object.fromEntries(
      [...this.providers.entries()].map(([k, v]) => {
        const rem = v.inCooldown ? Math.max(0, v.cooldownUntil - Date.now()) : 0;
        return [k, { ...v, cooldownRemainingMs: rem }];
      })
    );
    const routes = Object.fromEntries(this.routes);
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      requestsInFlight: this.requestsInFlight,
      totals: this.totals,
      providers,
      routes,
    };
  }
}

export const usage = new UsageTracker();