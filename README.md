# AirRoute — Local AI Gateway

A TypeScript gateway that connects compatible AI clients to multiple model providers through one local endpoint. It includes provider fallback, a management dashboard, and an optional coding agent.

## Features

- OpenAI-compatible chat completions and Anthropic-compatible messages, including streaming translation.
- Configurable model routes, provider fallback, and cooldown handling after failures.
- An adaptive `auto` route and configurable conversation compression.
- A dashboard for managing providers and routes, inspecting health, and viewing usage statistics.
- A coding agent that can use Ollama or the gateway.

Provider availability, model access, pricing, and rate limits vary. A provider's free tier is subject to its current terms and does not guarantee unlimited or zero-cost usage.

## Local setup

Use **Node.js 22 or later** and npm. The package declares Node.js 18.17 as its minimum, but this setup recommends a newer release because the gateway uses Node's built-in `.env` loader.

```bash
git clone https://github.com/King1121-sudo/Open-AI-Project.git
cd Open-AI-Project
npm ci
npm run build
cp .env.example .env
```

Add credentials for a provider you intend to use in `.env`; for example, `OPENROUTER_API_KEY`. The template lists supported variables. You can also configure providers and routes in the dashboard. Providers without required credentials are skipped during fallback.

Link the compiled command and start the gateway from the repository directory so its `.env` and local configuration can be found:

```bash
npm link
airroute
```

The default port is `8787`, and the command opens the dashboard in your browser. You can also start the compiled gateway with `npm start` without linking a command.

```bash
airroute --no-browser
airroute --port 3000
airroute --config my-config.json
```

Use `gateway.config.example.json` as a starting point for custom routes. The default local override file is `gateway.config.json`. Both it and `.env` are ignored by Git.

## API and dashboard

| Path | Purpose |
| --- | --- |
| `GET /health` | Gateway status |
| `GET /dashboard` | Management dashboard |
| `GET /stats` | Usage statistics |
| `GET /v1/models` | Available routes and provider models |
| `POST /v1/chat/completions` | OpenAI-compatible chat requests |
| `POST /v1/messages` | Anthropic-compatible message requests |
| `POST /v1/messages/count_tokens` | Token estimate |

For OpenAI-compatible clients, use `http://localhost:8787/v1` as the base URL. For Anthropic-compatible clients, use `http://localhost:8787`. Model identifiers can be a configured route such as `default`, `coder`, or `fast`, the adaptive `auto` route, or `provider/model`.

```bash
curl http://localhost:8787/health
```

An optional `GATEWAY_KEY` environment variable enables bearer-key checks for model requests and protected management operations. When configured, clients must provide that key. Otherwise, the gateway does not require a client key. Provider credentials are separate from this gateway key.

## Optional coding agent

Install [Ollama](https://ollama.com/download) and keep its server running to use the agent with a local model:

```bash
ollama serve
```

In another terminal, from this repository:

```bash
node dist/index.js --model qwen3:8b "explain this repository"
```

The agent attempts to download the selected Ollama model if it is missing. Alternatively, start the gateway first and use a configured route:

```bash
node dist/index.js --via gateway --model coder "explain this repository"
```

The agent can run shell commands and read or modify files in its current working directory. Review its changes before using them. Its search tool requires [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) on your PATH. Shell commands use PowerShell on Windows and `sh` on macOS/Linux.

## Development

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run gateway` | Run the gateway source with `tsx` |
| `npm run dev -- "your task"` | Run the coding-agent source with `tsx` |

Rebuild after source changes when using the linked `airroute` command. There is currently no automated test script in `package.json`; a successful build or type check does not establish end-to-end provider compatibility.

## Current limitations

- Compatibility and generation quality depend on the client, provider, and selected model.
- Provider allowances shown in the dashboard are estimates; consult provider documentation for current limits and pricing.
- Compression can discard older context or truncate messages. Set `GATEWAY_COMPRESS=0` to disable it.
- The server listens on the configured port, and several status/configuration pages are readable without a gateway key. Restrict network access to trusted users before exposing it beyond a local development environment.
- Provider requests send prompts and credentials to the selected external service. Ollama mode has a different data flow and hardware requirements.

## License and attribution

[MIT License](LICENSE), copyright 2026 AirRoute. The existing [package metadata](package.json) credits AirRoute, and that attribution is retained in this repository.
