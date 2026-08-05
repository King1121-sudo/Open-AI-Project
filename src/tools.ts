import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { glob as globFn } from "node:fs/promises";
import type { ToolDef, ToolResult } from "./types.js";

const cwd = process.cwd();
const isWin = process.platform === "win32";
const SHELL = isWin ? "powershell.exe" : "/bin/sh";

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "run_bash",
      description:
        "Run a shell command in the project directory. Use for building, running tests, installing deps, git, and any terminal operation. Output is captured. Set `timeout_seconds` if the command may take a while.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute." },
          timeout_seconds: { type: "number", description: "Optional timeout in seconds (default 30)." },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the project. Paths are relative to the project root. Returns up to 2000 lines.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." },
          offset: { type: "number", description: "Optional starting line (1-based)." },
          limit: { type: "number", description: "Optional max lines to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file, creating parent directories as needed. Overwrites existing content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." },
          content: { type: "string", description: "Full file contents to write." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Replace an exact substring in a file. If `old` appears more than once, include more surrounding context. Returns the new line count.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." },
          old: { type: "string", description: "Exact text to find." },
          new: { type: "string", description: "Replacement text." },
          replace_all: { type: "boolean", description: "Replace every occurrence (default false)." },
        },
        required: ["path", "old", "new"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files and directories in a path (non-recursive).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path (default '.')." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description: "Search file contents for a regular expression and return matching files and line numbers.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regular expression to search for." },
          include: { type: "string", description: "Optional glob filter, e.g. '*.ts' or '*.{ts,js}'." },
          path: { type: "string", description: "Optional directory to search (default project root)." },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "glob",
      description: "Find files by glob pattern, e.g. 'src/**/*.ts'.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern to match." },
        },
        required: ["pattern"],
      },
    },
  },
];

function runBash(args: { command: string; timeout_seconds?: number }): Promise<string> {
  return new Promise((resolve) => {
    const child = exec(
      args.command,
      {
        cwd,
        shell: SHELL,
        timeout: (args.timeout_seconds ?? 30) * 1000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        let out = "";
        if (stdout) out += stdout;
        if (stderr) out += stderr;
        if (err && !out) out = `Error (exit ${(err as unknown as { code?: unknown } & Error).code ?? "unknown"}): ${err.message}\n`;
        resolve(out.slice(0, 30000));
      }
    );
    if (isWin) {
      // PowerShell echoes its prompt to stderr; drop the noisy banner lines.
      child.stderr?.on("data", (d: Buffer) => {
        const line = d.toString();
        if (/\r?\n/.test(line)) {
          const clean = line.split(/\r?\n/).filter((l) => !/^\s*PS [^>]*>\s*$/.test(l)).join("\n");
          if (clean) (child as { stderrData?: string }).stderrData = "";
        }
      });
    }
  });
}

async function readFile(args: { path: string; offset?: number; limit?: number }): Promise<string> {
  const abs = path.resolve(cwd, args.path);
  const content = await fs.readFile(abs, "utf8");
  const lines = content.split("\n");
  const raw = lines.slice(0, 100000);
  const offset = args.offset ?? 1;
  const limit = args.limit ?? 2000;
  const slice = raw.slice(offset - 1, offset - 1 + limit);
  return slice.map((l, i) => `${offset + i}: ${l}`).join("\n");
}

async function writeFile(args: { path: string; content: string }): Promise<string> {
  const abs = path.resolve(cwd, args.path);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, args.content, "utf8");
  return `Wrote ${args.path} (${args.content.length} bytes).`;
}

async function editFile(args: {
  path: string;
  old: string;
  new: string;
  replace_all?: boolean;
}): Promise<string> {
  const abs = path.resolve(cwd, args.path);
  const content = await fs.readFile(abs, "utf8");
  if (!content.includes(args.old)) {
    return `Error: the target text was not found in ${args.path}.`;
  }
  const count = content.split(args.old).length - 1;
  if (count > 1 && !args.replace_all) {
    return `Error: the target text appears ${count} times. Provide more surrounding context or set replace_all=true.`;
  }
  const updated = args.replace_all ? content.split(args.old).join(args.new) : content.replace(args.old, args.new);
  await fs.writeFile(abs, updated, "utf8");
  return `Edited ${args.path}: ${args.replace_all ? count : 1} replacement(s).`;
}

async function listDir(args: { path?: string }): Promise<string> {
  const abs = path.resolve(cwd, args.path ?? ".");
  try {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    return entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort()
      .join("\n");
  } catch (e) {
    return `Error listing ${abs}: ${(e as Error).message}`;
  }
}

async function grep(args: { pattern: string; include?: string; path?: string }): Promise<string> {
  return runBash({
    command: `rg --no-heading --line-number -g "${args.include ?? "*"}" "${args.pattern}" "${path.resolve(cwd, args.path ?? ".")}"`,
  });
}

async function glob(args: { pattern: string }): Promise<string> {
  const matches: string[] = [];
  const iter = globFn(args.pattern, { cwd });
  for await (const m of iter) matches.push(m);
  return matches.sort().join("\n") || "No matches.";
}

export async function executeTool(tool: string, rawArgs: string): Promise<ToolResult> {
  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return { tool, args: rawArgs, ok: false, output: `Invalid JSON arguments: ${rawArgs}` };
  }
  const a = args as Record<string, unknown>;
  try {
    switch (tool) {
      case "run_bash":
        return {
          tool,
          args,
          ok: true,
          output: await runBash({ command: String(a.command), timeout_seconds: Number(a.timeout_seconds) || undefined }),
        };
      case "read_file":
        return { tool, args, ok: true, output: await readFile(a as never) };
      case "write_file":
        return { tool, args, ok: true, output: await writeFile(a as never) };
      case "edit_file":
        return { tool, args, ok: true, output: await editFile(a as never) };
      case "list_dir":
        return { tool, args, ok: true, output: await listDir(a as never) };
      case "grep":
        return { tool, args, ok: true, output: await grep(a as never) };
      case "glob":
        return { tool, args, ok: true, output: await glob(a as never) };
      default:
        return { tool, args, ok: false, output: `Unknown tool: ${tool}` };
    }
  } catch (e) {
    return { tool, args, ok: false, output: `${(e as Error).message}` };
  }
}