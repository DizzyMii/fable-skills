import fs from 'node:fs';
import path from 'node:path';
import type { Condition, Executor, RunRecord, Scenario } from './types.js';
import { captureDiff, captureFiles, cleanupWorkspace, commitAll, installTreatment, provisionWorkspace } from './workspace.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Joins every assistant text block, in order, across the event stream. */
export function extractAssistantText(events: unknown[]): string {
  const parts: string[] = [];
  for (const ev of events) {
    if (!isRecord(ev)) continue;
    if (ev.type !== 'assistant') continue;
    const message = ev.message;
    if (!isRecord(message)) continue;
    const content = message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        parts.push(block.text);
      }
    }
  }
  return parts.join('\n\n');
}

function referencedFilePaths(scenario: Scenario): string[] {
  const paths = new Set<string>();
  for (const check of scenario.tier1) {
    if (check.type === 'file_exists' || check.type === 'file_absent' || check.type === 'file_contains') {
      paths.add(check.path);
    }
  }
  return [...paths];
}

function writeTranscript(outDir: string, scenarioId: string, condition: Condition, iteration: number, events: unknown[]): string {
  const transcriptPath = path.join(outDir, 'transcripts', scenarioId, `${condition}-${iteration}.jsonl`);
  fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
  fs.writeFileSync(transcriptPath, events.map((e) => JSON.stringify(e)).join('\n'));
  return transcriptPath;
}

export interface RunnerOpts {
  executor: Executor;
  k?: number;
  model?: string;
  outDir: string;
  benchRoot: string;
  mock: boolean;
}

export async function runScenario(scenario: Scenario, condition: Condition, opts: RunnerOpts): Promise<RunRecord[]> {
  const iterations = opts.k ?? scenario.k;
  const model = opts.model ?? scenario.model;
  const records: RunRecord[] = [];

  for (let iteration = 0; iteration < iterations; iteration++) {
    const execRequest = {
      kind: 'scenario' as const,
      scenarioId: scenario.id,
      condition,
      iteration,
      prompt: scenario.prompt,
      model,
      allowedTools: scenario.allowedTools,
      maxBudgetUsd: scenario.maxBudgetUsd,
      timeoutMs: scenario.timeoutS * 1000,
    };

    if (opts.mock) {
      const result = await opts.executor.execute({ ...execRequest, cwd: '' });
      const transcriptPath = writeTranscript(opts.outDir, scenario.id, condition, iteration, result.events);
      const transcriptText = extractAssistantText(result.events) || result.finalText;

      records.push({
        scenarioId: scenario.id,
        condition,
        iteration,
        model,
        finalText: result.finalText,
        transcriptPath,
        transcriptText,
        diff: result.diff ?? '',
        diffStat: result.diffStat ?? { filesChanged: 0, insertions: 0, deletions: 0, files: [] },
        workspaceFiles: result.workspaceFiles ?? {},
        exitCode: result.exitCode,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
      });
      continue;
    }

    // Live flow: real workspace, real git, real claude spawn (via opts.executor).
    const repoRoot = path.dirname(opts.benchRoot);
    const fixtureDir = path.join(opts.benchRoot, 'fixtures', 'repos', scenario.fixture);
    const ws = await provisionWorkspace(fixtureDir);

    if (condition === 'treatment') {
      await installTreatment(ws, repoRoot);
      // Fold the harness-authored treatment files into the git baseline so
      // captureDiff attributes only the model's changes to the model.
      await commitAll(ws, 'install treatment');
    }

    const result = await opts.executor.execute({ ...execRequest, cwd: ws });

    const { diff, diffStat } = await captureDiff(ws);
    const workspaceFiles = captureFiles(ws, referencedFilePaths(scenario));
    const transcriptPath = writeTranscript(opts.outDir, scenario.id, condition, iteration, result.events);

    cleanupWorkspace(ws);

    const transcriptText = extractAssistantText(result.events) || result.finalText;

    records.push({
      scenarioId: scenario.id,
      condition,
      iteration,
      model,
      finalText: result.finalText,
      transcriptPath,
      transcriptText,
      diff,
      diffStat,
      workspaceFiles,
      exitCode: result.exitCode,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
    });
  }

  return records;
}
