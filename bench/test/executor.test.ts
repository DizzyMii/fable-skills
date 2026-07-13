import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { MockExecutor, quoteShellArg } from '../src/executor.js';
import type { ExecRequest, ExecResult } from '../src/types.js';

// --- quoteShellArg (SPEC D24) -----------------------------------------

test('quoteShellArg: bare tokens pass through unchanged on win32', () => {
  assert.equal(quoteShellArg('claude-opus-4-8', 'win32'), 'claude-opus-4-8');
  assert.equal(quoteShellArg('600', 'win32'), '600');
  assert.equal(quoteShellArg('Bash,Read,Write,Edit', 'win32'), 'Bash,Read,Write,Edit');
});

test('quoteShellArg: bare tokens pass through unchanged on POSIX', () => {
  assert.equal(quoteShellArg('claude-opus-4-8', 'linux'), 'claude-opus-4-8');
  assert.equal(quoteShellArg('600', 'darwin'), '600');
  assert.equal(quoteShellArg('Bash,Read,Write,Edit', 'linux'), 'Bash,Read,Write,Edit');
});

test('quoteShellArg: "Bash(git *)" is quoted on win32', () => {
  assert.equal(quoteShellArg('Bash(git *)', 'win32'), '"Bash(git *)"');
});

test('quoteShellArg: "Bash(git *)" is quoted on POSIX', () => {
  assert.equal(quoteShellArg('Bash(git *)', 'linux'), "'Bash(git *)'");
  assert.equal(quoteShellArg('Bash(git *)', 'darwin'), "'Bash(git *)'");
});

test('quoteShellArg: embedded double quote doubles on win32', () => {
  assert.equal(quoteShellArg('foo"bar', 'win32'), '"foo""bar"');
});

test('quoteShellArg: embedded single quote escapes on POSIX', () => {
  assert.equal(quoteShellArg("it's", 'linux'), "'it'\\''s'");
});

test('quoteShellArg: empty string gets quoted', () => {
  assert.equal(quoteShellArg('', 'win32'), '""');
  assert.equal(quoteShellArg('', 'linux'), "''");
});

// --- MockExecutor regression guard -------------------------------------
// Confirms this packet's edit to executor.ts (adding quoteShellArg and
// applying it inside LiveExecutor.execute) left MockExecutor's replay
// behavior untouched. No process is spawned anywhere in this file.

function mkTranscriptsDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bench-executor-test-'));
}

test('MockExecutor: replays a recording from a temp fixtures dir', async () => {
  const transcriptsDir = mkTranscriptsDir();
  try {
    const scenarioDir = path.join(transcriptsDir, 'p1-scenario');
    fs.mkdirSync(scenarioDir, { recursive: true });

    const recorded: ExecResult = {
      finalText: 'Reply from p1 recording.',
      events: [
        { type: 'result', subtype: 'success', result: 'Reply from p1 recording.', total_cost_usd: 0.02 },
      ],
      exitCode: 0,
      costUsd: 0.02,
      durationMs: 42,
    };
    fs.writeFileSync(path.join(scenarioDir, 'baseline-0.json'), JSON.stringify(recorded));

    const req: ExecRequest = {
      kind: 'scenario',
      scenarioId: 'p1-scenario',
      condition: 'baseline',
      iteration: 0,
      prompt: 'irrelevant for mock replay',
      model: 'claude-opus-4-8',
      cwd: transcriptsDir,
      allowedTools: [],
      maxBudgetUsd: 1,
      timeoutMs: 1000,
    };

    const executor = new MockExecutor(transcriptsDir);
    const result = await executor.execute(req);

    assert.equal(result.finalText, 'Reply from p1 recording.');
    assert.equal(result.exitCode, 0);
    assert.equal(result.costUsd, 0.02);
    assert.equal(result.durationMs, 42);
  } finally {
    fs.rmSync(transcriptsDir, { recursive: true, force: true });
  }
});
