# AirRoute — free AI gateway

One endpoint, many free providers, auto-fallback. **Install once, type `airroute`,
and it starts and opens the dashboard in your browser** — no config required.
**Pollinations.ai is pre-wired and works without any API key**, so `auto` mode
is usable immediately with zero setup.

## Install & run

```bash
# from this project folder (installs the airroute command globally)
npm install -g .
npm link          # (dev) live-links so rebuilds update the command instantly

# run it — starts the gateway AND opens http://localhost:8787/dashboard in your browser
airroute

# options
airroute --port 3000        # different port
airroute --config my.json   # alternative config
airroute --no-browser       # start without opening the dashboard
```

Add free-tier keys in `.env` or in the console (Providers tab). It works with
just one key (others are skipped by failover). **Pollinations.ai is pre-wired
and requires no key at all** — just use `auto` or any route and it works out of the box.
Rebuild after changing code: `npm run build` (the `npm link` install picks it up automatically).

Your base URL is `http://localhost:8787`. There are two APIs: **OpenAI-compatible**
`http://localhost:8787/v1` and **Anthropic-compatible** `http://localhost:8787`.
Models: `default`, `coder`, `fast`, `auto`, or any `provider/model`.

## Connecting your tools

### Claude Code (Anthropic API)
```bash
export ANTHROPIC_BASE_URL=http://localhost:8787
export ANTHROPIC_AUTH_TOKEN=airroute   # any non-empty value
# model: gpt-oss-20b / coder / auto / etc.
```
Set `ANTHROPIC_MODEL=coder` to pick a route.

### OpenCode (OpenAI API)
```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=airroute   # any value; keys are checked by the gateway
# opencode run --model default "write tests"
```

### Cline (VS Code extension)
Settings → API Provider → **OpenAI Compatible**:
- Base URL: `http://localhost:8787/v1`
- API Key: any value (e.g. `airroute`)
- Model ID: `default`, `coder`, `fast`, or `auto`

### Continue (VS Code, `config.json`)
```json
"models": [{
  "title": "AirRoute",
  "provider": "openai",
  "model": "coder",
  "apiBase": "http://localhost:8787/v1",
  "apiKey": "airroute"
}]
```

### Cursor
Settings → Models → **OpenAI API Key** and **Base URL** (`http://localhost:8787/v1`) — Cursor allows a custom OpenAI base URL / override.

### Generic OpenAI tools (Continue, Copilot-style, SDKs)
```bash
export OPENAI_BASE_URL=http://localhost:8787/v1
export OPENAI_API_KEY=airroute
```

### The bundled local agent
```bash
node dist/index.js --via gateway "add unit tests for the auth module"
node dist/index.js --via gateway --model coder "refactor the API layer"
```

### Quick health check
```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Say hi"}]}'
```
The console (Providers tab) shows live health and lets you add/edit providers with
no restart.

## Publishing to npm (optional)

The package ships **compiled `dist` only** — no source, no `.env`, no `gateway.config.json`.
All keys are read from **environment variables at runtime**, so no secrets ever leave
your machine.

```bash
# verify nothing sensitive is in the tarball (should list only dist/ + package.json + README + LICENSE)
npm pack --dry-run

# publish (one-time), then install anywhere with:
npm login
npm publish
#   npm i -g airroute
```

> npm now requires a paid npm account (payment verification) to publish *unscoped*
> packages. If you don't want that, you can still install from this folder with
> `npm install -g .` / `npm link` and get the exact same `airroute` command.

Set keys on the machine that runs AirRoute, e.g.:
```bash
export OPENROUTER_API_KEY=... GEMINI_API_KEY=... GROQ_API_KEY=...
airroute
```
Or drop a `.env` in the directory you run `airroute` from.

---

# Local AI Coding Agent

A separate, optional tool in the same repo: a lightweight locally run coding agent.
It can use **Ollama** (100% local, no costs) or drive the **AirRoute** free-provider
gateway (`--via gateway`).

## Features

- **Tool-using agent loop** — runs shell commands, reads/writes/edits files,
  lists directories, greps, and globs to autonomously complete tasks.
- **100% local** — everything runs against `http://localhost:11434`. No API keys,
  no usage bills.
- **Model-agnostic** — works with any Ollama tool-calling model. Pick quality or
  speed freely.
- **Self-pulling** — auto-downloads the chosen model on first run.

## Install

```bash
# 1. Install Ollama (the local model server)
#    https://ollama.com/download   ->  then start it:  ollama serve

# 2. Install Node.js 18+ (already have it? skip)

# 3. In this folder:
npm install
npm run build

# 4. Now use it:
node dist/index.js "explain this project and add unit tests"
```

## Usage

```bash
node dist/index.js "task or question"

node dist/index.js --model qwen3:8b "refactor the auth module"
node dist/index.js --model qwen2.5-coder:7b "add a ./scripts build step" --maxSteps 40
```

| Option            | Default                   | Description                    |
| ----------------- | ------------------------- | ------------------------------ |
| `--model <name>`  | `qwen3:8b`                | Ollama model to use            |
| `--host <url>`    | `http://localhost:11434`  | Ollama endpoint                |
| `--temperature`   | `0.2`                     | Sampling temperature           |
| `--context`       | `8192`                    | Context window (tokens)        |
| `--maxSteps`      | `25`                      | Max agent iterations           |

Environment variables: `AGENT_MODEL`, `OLLAMA_HOST`, `AGENT_TEMP`, `AGENT_CTX`, `AGENT_MAX_STEPS`.

## Recommended free models

| Model                | Notes                                    |
| -------------------- | ---------------------------------------- |
| `qwen3:8b`           | Great tool-calling + reasoning balance   |
| `qwen2.5-coder:7b`   | Strong code generation                   |
| `llama3.2:3b`        | Fast, low RAM                            |
| `llama3.1:8b`        | General purpose                          |

Pull one explicitly, or let the agent pull the default for you:

```bash
ollama pull qwen3:8b
```

## How it works

```
CLI (src/index.ts)
  -> config (src/config.ts)        model + agent settings
  -> agent loop (src/agent.ts)     asks the model, executes tools, iterates
  -> tools (src/tools.ts)          bash/read/write/edit/list/grep/glob
  -> Ollama client (src/ollama.ts) POST /api/chat with tool-calling
```

The agent inspects your repo, makes changes, then builds/tests to verify — fixing
failures until the task is done.

## Development

```bash
npm run dev        # run src via tsx
npm run build      # build dist/
npm run typecheck  # type-check only
```

## Notes & limits

- Quality depends on your hardware and the model you pick. Bigger context windows
  cost more RAM (`OLLAMA_HOST` serves localhost only).
- The `grep` tool uses `ripgrep` (`rg`); ensure it's on your PATH for searches.
- On Windows, shell commands use PowerShell; on macOS/Linux they use `sh`.

---

# Local Gateway (free-provider router, like Omniroute)

A separate tool in the same repo: a local HTTP **router/proxy** that aggregates
multiple **free-tier providers** behind one endpoint. It exposes **both**
OpenAI-compatible and Anthropic-compatible APIs, with automatic **failover**, so
you can point real agent CLIs (OpenCode, Kilo, Cline, Continue, Claude Code, …) at
it and never pay for API calls.

## Quick start

```bash
# 1. Copy the env template and fill in free API keys (all optional)
cp .env.example .env
#    - OPENROUTER_API_KEY  (openrouter.ai/keys — free :free models)
#    - GEMINI_API_KEY      (aistudio.google.com/apikey — free tier)
#    - GROQ_API_KEY        (console.groq.com/keys)
#    - GITHUB_TOKEN        (github.com/settings/tokens — GitHub Models)
#    - CF_ACCOUNT_ID + CF_API_TOKEN (Cloudflare Workers AI)

# 2. Build + run
npm run build
npm run gateway
```

Startup prints the URL and warns about any provider missing a key (those are
skipped during failover, so it still works with just one key).

## Pointing agents at it

**OpenAI-compatible (OpenCode, Kilo, Cline, Continue…)**
```bash
# base URL  http://localhost:8787/v1
# model     one of: default, coder, fast, or provider/model
OPENAI_BASE_URL=http://localhost:8787/v1
```

**Claude Code (Anthropic-compatible)**
```bash
ANTHROPIC_BASE_URL=http://localhost:8787
ANTHROPIC_AUTH_TOKEN=anything
# model: default / coder / fast
```

## Routing & failover

- A **route** (e.g. `default`, `coder`, `fast`) is an ordered list of
  `provider/model`. Requests try each in order; on rate-limit or error the gateway
  falls through to the next. Free tiers get rate-limited often, so this keeps you
  running.
- You can also call any model directly as `provider/model`, e.g. `gemini/gemini-2.5-flash`.
- Add your own routes/providers in `gateway.config.json` (see
  `gateway.config.example.json`).

## Endpoints

| Endpoint | API | Purpose |
| --- | --- | --- |
| `POST /v1/chat/completions` | OpenAI | chat + streaming, tool calls |
| `POST /v1/messages` | Anthropic | chat + streaming, tool use (Claude Code) |
| `GET /v1/models` | OpenAI / Anthropic | list route + provider models |
| `POST /v1/messages/count_tokens` | Anthropic | token estimate |
| `GET /health` | — | status |

Providers: **OpenRouter**, **Gemini**, **Groq**, **GitHub Models**, **Cloudflare**
Workers AI. Add any OpenAI-compatible provider by editing `gateway.config.json`.

## Usage dashboard & stats

- `GET /stats` — JSON snapshot: per-route and per-provider calls, OK/failures, 429s,
  token counts, in-flight requests, and cooldown state.
- `GET /dashboard` — **full admin console** with a sidebar and live UI:
  - **Dashboard** — usage cards, per-provider/per-route tables, live health badges
  - **Providers** — list, add, edit, and delete providers from the UI (no JSON editing). Health probe + key status per provider.
  - **Routes** — add / edit / delete failover chains (one `provider/model` per step).
  - **Models** — every requestable model id across providers and routes.
- Changes made in the console save to `gateway.config.json` and apply **immediately** (no restart). The config file is gitignored.

Management API (used by the console): `GET /api/config`, `GET /api/health`,
`POST|DELETE /api/providers`, `POST|DELETE /api/routes`.

### Smart rate-limit handling
The gateway tracks each provider's responses. After a `429` it cools the provider
down for 30s (5xx → 8s) and **skips it** during failover instead of hammering it.
Cooldown state is visible in `/stats` as `cooldownRemainingMs`.

## OmniRoute-style smarts

- **`auto` model** — an adaptive route. Instead of a fixed chain it picks among all
  usable providers, skips cooled-down ones, and prefers the lowest recent latency
  while rotating so no single provider gets hammered. `model: "auto"` works on
  both the OpenAI and Anthropic endpoints. **Keyless providers like Pollinations.ai
  are included automatically, so `auto` works with zero config.**
- **Token compression (on by default)** — long conversations are compacted before
  they reach a provider: oldest plain-text turns are pruned and oversized messages
  truncated when the request exceeds `GATEWAY_COMPRESS_BUDGET` (default 64000).
  Set `GATEWAY_COMPRESS=0` to disable. Context errors are also caught and retried
  automatically with compression.
- **Free Tiers page** — console → *Free tiers* shows each provider's approximate
  monthly free allowance, what you've used, remaining budget, and which ones are
  free forever. `GET /api/freetiers`.
- **Zero-config free models** — Pollinations.ai is pre-wired as a keyless provider.
  No API key, no signup, no config. Just start the gateway and use `auto`.

## Providers

13 pre-wired providers. **Zero-config:** Pollinations.ai works without any API key.
Free tiers that just need a key: OpenRouter, Gemini, Groq, Mistral, Cerebras,
DeepSeek, Together, Z.AI GLM-Flash (Cloudflare needs an account ID). Add any
OpenAI-compatible provider from the console (Providers → + Add Provider).

## Free models without restrictions

- **Pollinations.ai** — completely free, no key needed, no monthly cap. Models:
  GPT-4o-mini, Llama-3.3-70B, Qwen-2.5-72B, Gemma-2-9B, DeepSeek-R1, and more.
- **OpenRouter free models** — gpt-oss-20b, Gemma-4-31B, Cohere North, Nemotron-3,
  Llama-4-Maverick, Mistral-Small-3.1-24B (rate-limited but free).
- **Z.AI GLM-Flash** — free forever, no token cap.
- **Groq** — 8M tokens/month free, very fast inference.
- **Gemini** — 60M tokens/month free via Google AI Studio.

## Use the local agent with the gateway

The same agent can drive the free-provider gateway instead of Ollama:

```bash
node dist/index.js --via gateway "add unit tests for the auth module"
node dist/index.js --via gateway --model coder "refactor the API layer"
```

`--model` picks a gateway route (`default`, `coder`, `fast`). Requires the gateway
running (`npm run gateway`). Also settable via `AGENT_GATEWAY` and `AGENT_GATEWAY_URL`.

## Run as a service (Docker)

```bash
docker build -t local-gateway .
docker run -d --name gateway -p 8787:8787 \
  -e OPENROUTER_API_KEY=... -e GEMINI_API_KEY=... -e GROQ_API_KEY=... \
  --restart unless-stopped local-gateway
```

Keys come from environment variables (`.env` is gitignored and not copied into the image).
Config is validated at startup — unknown provider types, missing models, and routes
that reference unknown providers print a warning.#   O p e n - A I - P r o j e c t  
 