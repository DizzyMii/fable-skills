// LiveExecutor is the only place `claude` is ever spawned. MockExecutor replays
// recorded ExecResult JSON — zero spawning, zero network.

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ExecRequest, ExecResult, Executor } from './types.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Pulls finalText/costUsd out of the stream's `result` event, if present. */
function extractResultEvent(events: unknown[]): { finalText: string; costUsd: number | null } {
  let finalText = '';
  let costUsd: number | null = null;
  for (const ev of events) {
    if (!isRecord(ev)) continue;
    if (ev.type !== 'result') continue;
    if (typeof ev.result === 'string') finalText = ev.result;
    costUsd = typeof ev.total_cost_usd === 'number' ? ev.total_cost_usd : null;
  }
  return { finalText, costUsd };
}

export interface LiveExecutorOpts {
  claudeCmd?: string;
}

/** Spawns headless `claude` and parses its stream-json stdout. */
export class LiveExecutor implements Executor {
  private readonly claudeCmd: string;

  constructor(opts: LiveExecutorOpts = {}) {
    this.claudeCmd = opts.claudeCmd ?? 'claude';
  }

  async execute(req: ExecRequest): Promise<ExecResult> {
    const start = Date.now();
    const args = [
      '-p',
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      req.model,
      '--setting-sources',
      'project',
      '--max-budget-usd',
      String(req.maxBudgetUsd),
    ];
    if (req.allowedTools.length > 0) {
      args.push('--allowed-tools', req.allowedTools.join(','));
    }

    return new Promise<ExecResult>((resolve) => {
      // shell:true is required on Windows for the npm shim to resolve `claude`.
      const child = spawn(this.claudeCmd, args, { cwd: req.cwd, shell: true });

      const events: unknown[] = [];
      let stdoutBuf = '';
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const consumeLines = (buf: string): string => {
        const lines = buf.split('\n');
        const remainder = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            events.push(JSON.parse(trimmed));
          } catch {
            // skip unparseable lines
          }
        }
        return remainder;
      };

      const finish = (exitCode: number): void => {
        if (settled) return;
        settled = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);

        // Flush whatever's left in the buffer (last line may lack a trailing \n).
        const remainder = consumeLines(`${stdoutBuf}\n`);
        void remainder;

        const { finalText, costUsd } = extractResultEvent(events);
        resolve({
          finalText,
          events,
          exitCode,
          costUsd,
          durationMs: Date.now() - start,
        });
      };

      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBuf = consumeLines(stdoutBuf + chunk.toString('utf8'));
      });

      child.stderr?.on('data', () => {
        // stderr is not part of the contract; ignored.
      });

      child.on('close', (code) => {
        finish(code ?? -1);
      });

      child.on('error', () => {
        finish(-1);
      });

      timeoutHandle = setTimeout(() => {
        if (settled) return;
        if (process.platform === 'win32' && child.pid) {
          try {
            execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
          } catch {
            // best-effort kill; fall through to resolving with accumulated events
          }
        } else {
          child.kill('SIGKILL');
        }
        finish(-1);
      }, req.timeoutMs);

      child.stdin?.write(req.prompt);
      child.stdin?.end();
    });
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replays recorded ExecResult JSON from <transcriptsDir>/<scenarioId>/. */
export class MockExecutor implements Executor {
  constructor(private readonly transcriptsDir: string) {}

  async execute(req: ExecRequest): Promise<ExecResult> {
    const scenarioDir = path.join(this.transcriptsDir, req.scenarioId);
    const pattern =
      req.kind === 'judge'
        ? new RegExp(`^${escapeRegExp(req.condition)}-(\\d+)-judge\\.json$`)
        : new RegExp(`^${escapeRegExp(req.condition)}-(\\d+)\\.json$`);

    let entries: string[];
    try {
      entries = fs.readdirSync(scenarioDir);
    } catch {
      throw new Error(
        `MockExecutor: no transcripts directory found at ${scenarioDir} (expected recordings for scenario "${req.scenarioId}")`
      );
    }

    const matches = entries
      .map((name) => {
        const m = pattern.exec(name);
        return m ? { name, idx: parseInt(m[1], 10) } : null;
      })
      .filter((x): x is { name: string; idx: number } => x !== null)
      .sort((a, b) => a.idx - b.idx);

    if (matches.length === 0) {
      const exampleName =
        req.kind === 'judge' ? `${req.condition}-0-judge.json` : `${req.condition}-0.json`;
      throw new Error(
        `MockExecutor: no recordings found for ${path.join(scenarioDir, exampleName)}`
      );
    }

    const index = req.iteration % matches.length;
    const filePath = path.join(scenarioDir, matches[index].name);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as ExecResult;
  }
}
