import type { OpenAIBody } from "./providers.js";

const approxcTokens = (s: string) => Math.max(0, Math.ceil(s.length / 3.7));

export type Msg = { role: string; content?: unknown; tool_calls?: unknown[] };

function msgTokens(m: Msg): number {
  if (typeof m.content === "string") return approxcTokens(m.content);
  if (Array.isArray(m.content)) {
    let n = 40;
    for (const b of m.content as { text?: string; type?: string }[]) {
      if (b.text) n += approxcTokens(b.text);
      else n += 20;
    }
    return n;
  }
  return 10;
}

function totalTokens(msgs: Msg[]): number {
  return msgs.reduce((a, m) => a + msgTokens(m), 0);
}

const isPlainTextTurn = (m: Msg) => (m.role === "user" || m.role === "assistant") && !m.tool_calls?.length;

// Reduce an OpenAI request body's token footprint before it hits a provider.
// Strategy: if over budget, drop the oldest plain-text turns (safe to remove —
// they are not part of any active tool sequence), then truncate any oversized
// single message. The dropped region is replaced with a short note.
export function compressOpenAIBody(body: OpenAIBody, budget: number): OpenAIBody {
  const msgs = body.messages as Msg[];
  if (!Array.isArray(msgs) || msgs.length < 4) return body;

  let total = totalTokens(msgs);
  if (total <= budget) return body;

  const MAX_MSG = 60000;
  let pruned = 0;
  let i = 1; // keep index 0 (system) intact
  while (total > budget) {
    // find the oldest droppable plain-text turn
    const idx = msgs.findIndex((m, k) => k >= i && isPlainTextTurn(m));
    if (idx === -1) break;
    const removed = msgs.splice(idx, 1)[0];
    pruned++;
    total -= msgTokens(removed);
    i = idx;
  }

  if (total > budget) {
    // still over: truncate the longest plain text content
    let widest: number = -1;
    let widestLen = 0;
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k];
      if (!isPlainTextTurn(m) || typeof m.content !== "string") continue;
      if (m.content.length > widestLen) {
        widestLen = m.content.length;
        widest = k;
      }
    }
    if (widest >= 0 && widestLen > MAX_MSG) {
      const tgt = msgs[widest] as { content?: string };
      tgt.content = `${String(tgt.content).slice(0, MAX_MSG)}\n…[truncated by gateway to save tokens]…`;
    }
  }

  if (pruned > 0) {
    msgs.unshift({
      role: "system",
      content: `[Memory compaction: ${pruned} older conversation turns were omitted by the gateway to stay within token budget. Assume their content is still relevant context.]`,
    });
  }

  return { ...body, messages: msgs };
}