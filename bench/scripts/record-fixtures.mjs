#!/usr/bin/env node
// Converts a real `run` output dir (results.json + transcripts/**/*.jsonl) into
// the mock-fixture layout under bench/fixtures/transcripts/ (SPEC D25).
//
// Usage:
//   node scripts/record-fixtures.mjs <resultsDir> [--dest <dir>] [--force]
//
// For every GradedRun recorded in results.json, writes a serialized ExecResult
// to <dest>/<scenarioId>/<condition>-<iteration>.json, and, when the run has a
// judge result, a second file <condition>-<iteration>-judge.json. These are
// real captures — no "reconstructed" flag is written (see docs/bench-authoring.md).
//
// Plain Node ESM, no TypeScript, no build step, no new dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONDITIONS = ['baseline', 'treatment', 'inline'];

function usage() {
  console.error('usage: node scripts/record-fixtures.mjs <resultsDir> [--dest <dir>] [--force]');
}

function parseArgs(argv) {
  const args = { positional: [], dest: undefined, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') {
      args.dest = argv[++i];
    } else if (a === '--force') {
      args.force = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Parses a captured transcript (one JSON event per line) into an events array. */
function parseTranscriptEvents(jsonlText, sourcePath) {
  const events = [];
  const lines = jsonlText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch (err) {
      console.error(`record-fixtures: unparseable transcript line ${i + 1} in ${sourcePath}: ${err.message}`);
      process.exit(1);
    }
  }
  return events;
}

/**
 * Resolves a run's transcript file on disk. RunRecord.transcriptPath may be
 * absolute (the common case: outDir is constructed from an absolute benchRoot)
 * or relative to resultsDir. Falls back to the conventional layout
 * (<resultsDir>/transcripts/<scenarioId>/<condition>-<iteration>.jsonl) when
 * the recorded path doesn't exist on this machine (e.g. results.json moved).
 */
function resolveTranscriptPath(resultsDir, recordedPath, scenarioId, condition, iteration) {
  const candidates = [];
  if (recordedPath) {
    candidates.push(path.isAbsolute(recordedPath) ? recordedPath : path.resolve(resultsDir, recordedPath));
  }
  candidates.push(path.join(resultsDir, 'transcripts', scenarioId, `${condition}-${iteration}.jsonl`));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (args.positional.length < 1) {
    usage();
    process.exit(1);
  }

  const resultsDir = path.resolve(args.positional[0]);
  const resultsJsonPath = path.join(resultsDir, 'results.json');
  if (!fs.existsSync(resultsJsonPath)) {
    console.error(`record-fixtures: no results.json found at ${resultsJsonPath}`);
    process.exit(1);
  }

  // Default dest resolves relative to this script's own location, not cwd,
  // so the command works the same regardless of where it's invoked from.
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultDest = path.join(scriptDir, '..', 'fixtures', 'transcripts');
  const dest = args.dest ? path.resolve(args.dest) : defaultDest;

  const results = readJson(resultsJsonPath);
  if (!Array.isArray(results.scenarios)) {
    console.error(`record-fixtures: ${resultsJsonPath} does not look like a BenchResults object (missing "scenarios" array)`);
    process.exit(1);
  }

  // Pass 1: build every write in memory first. Nothing touches disk until we
  // know the full write set, so a missing transcript or an overwrite refusal
  // leaves the destination untouched.
  const writes = new Map(); // absolute path -> file content
  const scenarioCounts = new Map(); // scenarioId -> files written

  for (const scenario of results.scenarios) {
    const scenarioId = scenario.scenarioId;
    let count = 0;

    for (const condition of CONDITIONS) {
      const summary = scenario[condition];
      if (!summary || !Array.isArray(summary.runs)) continue;

      for (const graded of summary.runs) {
        const run = graded.run;
        const iteration = run.iteration;

        const transcriptFile = resolveTranscriptPath(resultsDir, run.transcriptPath, scenarioId, condition, iteration);
        if (!transcriptFile) {
          const fallback = path.join(resultsDir, 'transcripts', scenarioId, `${condition}-${iteration}.jsonl`);
          console.error(
            `record-fixtures: transcript not found for ${scenarioId} ${condition}-${iteration} ` +
              `(checked recorded path "${run.transcriptPath}" and fallback "${fallback}")`
          );
          process.exit(1);
        }

        const events = parseTranscriptEvents(fs.readFileSync(transcriptFile, 'utf8'), transcriptFile);

        const execResult = {
          finalText: run.finalText,
          events,
          exitCode: run.exitCode,
          costUsd: run.costUsd,
          durationMs: run.durationMs,
          diff: run.diff,
          diffStat: run.diffStat,
          workspaceFiles: run.workspaceFiles,
        };

        const outPath = path.join(dest, scenarioId, `${condition}-${iteration}.json`);
        writes.set(outPath, `${JSON.stringify(execResult, null, 2)}\n`);
        count++;

        if (graded.judge) {
          const judge = graded.judge;
          const judgeExecResult = {
            finalText: JSON.stringify({
              verdict: judge.verdict,
              reasoning: judge.reasoning,
              rationalization_quote: judge.rationalizationQuote,
            }),
            events: [],
            exitCode: 0,
            costUsd: judge.costUsd,
            durationMs: 0,
          };
          const judgeOutPath = path.join(dest, scenarioId, `${condition}-${iteration}-judge.json`);
          writes.set(judgeOutPath, `${JSON.stringify(judgeExecResult, null, 2)}\n`);
          count++;
        }
      }
    }

    scenarioCounts.set(scenarioId, count);
  }

  if (!args.force) {
    const collisions = [...writes.keys()].filter((p) => fs.existsSync(p));
    if (collisions.length > 0) {
      console.error('record-fixtures: refusing to overwrite existing fixture files (rerun with --force to overwrite):');
      for (const c of collisions) console.error(`  ${c}`);
      process.exit(1);
    }
  }

  for (const [outPath, content] of writes) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content);
  }

  let total = 0;
  for (const scenario of results.scenarios) {
    const count = scenarioCounts.get(scenario.scenarioId) ?? 0;
    console.log(`${scenario.scenarioId}: ${count} file${count === 1 ? '' : 's'} written`);
    total += count;
  }
  console.log(`total: ${total} file${total === 1 ? '' : 's'} written to ${dest}`);
}

main();
