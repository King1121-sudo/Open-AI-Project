export interface FreeTier {
  provider: string;
  model: string;
  monthlyTokens?: number;
  freeForever?: boolean;
  note: string;
}

// Approximate, community-sourced monthly free allowances (tokens in + out).
// Claims like "unlimited" are interpreted as the providers that advertise no
// hard per-month token cap. Figures move around; treat as guidance, not a contract.
export const FREE_TIERS: FreeTier[] = [
  { provider: "pollinations", model: "openai", monthlyTokens: 5_000_000, note: "Pollinations.ai free Pollen credits (requires API key from enter.pollinations.ai/keys)" },
  { provider: "pollinations", model: "kimi", monthlyTokens: 5_000_000, note: "Pollinations.ai free Pollen credits" },
  { provider: "pollinations", model: "deepseek", monthlyTokens: 5_000_000, note: "Pollinations.ai free Pollen credits" },
  { provider: "openrouter", model: "openai/gpt-oss-20b:free", monthlyTokens: 3_000_000, note: "free model routes (rate-limited)" },
  { provider: "openrouter", model: "cohere/north-mini-code:free", monthlyTokens: 3_000_000, note: "free model routes (rate-limited)" },
  { provider: "openrouter", model: "google/gemma-4-31b-it:free", monthlyTokens: 3_000_000, note: "free model routes (rate-limited)" },
  { provider: "gemini", model: "gemini-3.5-flash", monthlyTokens: 60_000_000, note: "Google AI Studio free tier" },
  { provider: "groq", model: "llama-3.3-70b-versatile", monthlyTokens: 8_000_000, note: "generous free RPD/TPS" },
  { provider: "mistral", model: "open-mistral-7b", monthlyTokens: 1_000_000_000, note: "La Plateforme experiment plan" },
  { provider: "cerebras", model: "llama-3.3-70b", monthlyTokens: 60_000_000, note: "free developer tier" },
  { provider: "together", model: "Meta-Llama-3.3-70B-Instruct-Turbo", monthlyTokens: 100_000_000, note: "free signup credits" },
  { provider: "zal", model: "glm-4-flash", freeForever: true, note: "Z.AI GLM-4-Flash free (no monthly cap)" },
];

export interface FreeBudgetEntry {
  provider: string;
  model: string;
  capTokens?: number;
  freeForever: boolean;
  usedTokens: number;
  remainingTokens?: number;
  note: string;
}

export function computeFreeBudget(providerTokens: Record<string, { tokensIn: number; tokensOut: number }>): FreeBudgetEntry[] {
  return FREE_TIERS.map((t) => {
    const used = providerTokens[t.provider]
      ? providerTokens[t.provider].tokensIn + providerTokens[t.provider].tokensOut
      : 0;
    return {
      provider: t.provider,
      model: t.model,
      capTokens: t.monthlyTokens,
      freeForever: !!t.freeForever,
      usedTokens: used,
      ...(t.monthlyTokens ? { remainingTokens: Math.max(0, t.monthlyTokens - used) } : {}),
      note: t.note,
    };
  });
}