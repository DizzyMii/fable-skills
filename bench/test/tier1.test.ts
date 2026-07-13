import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeTier1 } from '../src/tier1.js';
import type { RunRecord, Tier1Check } from '../src/types.js';

function makeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    scenarioId: 's-test',
    condition: 'treatment',
    iteration: 0,
    model: 'claude-opus-4-8',
    finalText: '',
    transcriptPath: '/tmp/transcript.jsonl',
    transcriptText: '',
    diff: '',
    diffStat: { filesChanged: 0, insertions: 0, deletions: 0, files: [] },
    workspaceFiles: {},
    exitCode: 0,
    costUsd: null,
    durationMs: 0,
    ...overrides,
  };
}

function gradeOne(check: Tier1Check, record: RunRecord) {
  const results = gradeTier1([check], record);
  assert.equal(results.length, 1);
  return results[0];
}

// --- max_files_changed ---

test('max_files_changed passes when filesChanged <= value', () => {
  const record = makeRecord({ diffStat: { filesChanged: 1, insertions: 0, deletions: 0, files: ['a.py'] } });
  const result = gradeOne({ type: 'max_files_changed', value: 1 }, record);
  assert.equal(result.pass, true);
  assert.equal(result.detail, '1 files changed (limit 1)');
});

test('max_files_changed fails when filesChanged > value', () => {
  const record = makeRecord({ diffStat: { filesChanged: 2, insertions: 0, deletions: 0, files: ['a.py', 'b.py'] } });
  const result = gradeOne({ type: 'max_files_changed', value: 1 }, record);
  assert.equal(result.pass, false);
  assert.equal(result.detail, '2 files changed (limit 1)');
});

test('max_files_changed pass detail at zero files', () => {
  const record = makeRecord({ diffStat: { filesChanged: 0, insertions: 0, deletions: 0, files: [] } });
  const result = gradeOne({ type: 'max_files_changed', value: 1 }, record);
  assert.equal(result.pass, true);
  assert.equal(result.detail, '0 files changed (limit 1)');
});

// --- max_lines_changed ---

test('max_lines_changed passes when insertions+deletions <= value', () => {
  const record = makeRecord({ diffStat: { filesChanged: 1, insertions: 2, deletions: 2, files: ['a.py'] } });
  const result = gradeOne({ type: 'max_lines_changed', value: 4 }, record);
  assert.equal(result.pass, true);
  assert.equal(result.detail, '4 lines changed (limit 4)');
});

test('max_lines_changed fails when insertions+deletions > value', () => {
  const record = makeRecord({ diffStat: { filesChanged: 1, insertions: 3, deletions: 3, files: ['a.py'] } });
  const result = gradeOne({ type: 'max_lines_changed', value: 4 }, record);
  assert.equal(result.pass, false);
  assert.equal(result.detail, '6 lines changed (limit 4)');
});

// --- file_exists ---

test('file_exists passes when workspaceFiles has a string for the path', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': 'def f(): pass' } });
  const result = gradeOne({ type: 'file_exists', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, true);
  assert.match(result.detail, /utils\/pages\.py/);
});

test('file_exists fails when workspaceFiles has null for the path (absent)', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': null } });
  const result = gradeOne({ type: 'file_exists', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /utils\/pages\.py/);
});

test('file_exists fails with "not captured" detail when the path key is missing entirely', () => {
  const record = makeRecord({ workspaceFiles: {} });
  const result = gradeOne({ type: 'file_exists', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /not captured/i);
  assert.match(result.detail, /utils\/pages\.py/);
});

// --- file_absent ---

test('file_absent passes when workspaceFiles has null for the path', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': null } });
  const result = gradeOne({ type: 'file_absent', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, true);
  assert.match(result.detail, /utils\/pages\.py/);
});

test('file_absent fails when workspaceFiles has a string for the path (present)', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': 'def f(): pass' } });
  const result = gradeOne({ type: 'file_absent', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /utils\/pages\.py/);
});

test('file_absent fails with "not captured" detail when the path key is missing entirely', () => {
  const record = makeRecord({ workspaceFiles: {} });
  const result = gradeOne({ type: 'file_absent', path: 'utils/pages.py' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /not captured/i);
});

// --- file_contains ---

test('file_contains passes when the file string matches the pattern', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': 'def f(start, end):\n    return range(start, end)\n' } });
  const result = gradeOne({ type: 'file_contains', path: 'utils/pages.py', pattern: 'range\\(start, end\\)' }, record);
  assert.equal(result.pass, true);
});

test('file_contains fails when the file string does not match the pattern, with pattern+path in detail', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': 'def f(a, b):\n    return a + b\n' } });
  const result = gradeOne({ type: 'file_contains', path: 'utils/pages.py', pattern: 'range\\(start, end\\)' }, record);
  assert.equal(result.pass, false);
  assert.equal(result.detail, 'pattern /range\\(start, end\\)/ not found in utils/pages.py');
});

test('file_contains fails when the file is absent (null)', () => {
  const record = makeRecord({ workspaceFiles: { 'utils/pages.py': null } });
  const result = gradeOne({ type: 'file_contains', path: 'utils/pages.py', pattern: 'range\\(' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /utils\/pages\.py/);
});

test('file_contains fails with "not captured" detail when the path key is missing entirely', () => {
  const record = makeRecord({ workspaceFiles: {} });
  const result = gradeOne({ type: 'file_contains', path: 'utils/pages.py', pattern: 'range\\(' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /not captured/i);
});

// --- reply_matches ---

test('reply_matches passes when finalText matches the pattern', () => {
  const record = makeRecord({ finalText: 'I found an off-by-one bug in range(start, end).' });
  const result = gradeOne({ type: 'reply_matches', pattern: 'off-by-one' }, record);
  assert.equal(result.pass, true);
});

test('reply_matches fails when finalText does not match the pattern', () => {
  const record = makeRecord({ finalText: 'Everything looks fine.' });
  const result = gradeOne({ type: 'reply_matches', pattern: 'off-by-one' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /off-by-one/);
});

test('reply_matches honors flags (case-insensitive)', () => {
  const record = makeRecord({ finalText: 'OFF-BY-ONE bug found.' });
  const result = gradeOne({ type: 'reply_matches', pattern: 'off-by-one', flags: 'i' }, record);
  assert.equal(result.pass, true);
});

test('reply_matches without flags is case-sensitive and fails on case mismatch', () => {
  const record = makeRecord({ finalText: 'OFF-BY-ONE bug found.' });
  const result = gradeOne({ type: 'reply_matches', pattern: 'off-by-one' }, record);
  assert.equal(result.pass, false);
});

// --- reply_not_matches ---

test('reply_not_matches passes when finalText does not match the pattern', () => {
  const record = makeRecord({ finalText: 'Everything looks fine.' });
  const result = gradeOne({ type: 'reply_not_matches', pattern: 'off-by-one' }, record);
  assert.equal(result.pass, true);
});

test('reply_not_matches fails when finalText matches the pattern, detail names expectation', () => {
  const record = makeRecord({ finalText: 'I fixed the off-by-one bug directly.' });
  const result = gradeOne({ type: 'reply_not_matches', pattern: 'off-by-one' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /off-by-one/);
});

test('reply_not_matches honors flags', () => {
  const record = makeRecord({ finalText: 'OFF-BY-ONE bug fixed.' });
  const result = gradeOne({ type: 'reply_not_matches', pattern: 'off-by-one', flags: 'i' }, record);
  assert.equal(result.pass, false);
});

// --- diff_empty ---

test('diff_empty passes when diff is empty string', () => {
  const record = makeRecord({ diff: '' });
  const result = gradeOne({ type: 'diff_empty' }, record);
  assert.equal(result.pass, true);
});

test('diff_empty passes when diff is only whitespace', () => {
  const record = makeRecord({ diff: '   \n  \n' });
  const result = gradeOne({ type: 'diff_empty' }, record);
  assert.equal(result.pass, true);
});

test('diff_empty fails when diff has content', () => {
  const record = makeRecord({ diff: 'diff --git a/a.py b/a.py\n+changed\n' });
  const result = gradeOne({ type: 'diff_empty' }, record);
  assert.equal(result.pass, false);
});

// --- exit_ok ---

test('exit_ok passes when exitCode is 0', () => {
  const record = makeRecord({ exitCode: 0 });
  const result = gradeOne({ type: 'exit_ok' }, record);
  assert.equal(result.pass, true);
});

test('exit_ok fails when exitCode is nonzero, detail names observed code', () => {
  const record = makeRecord({ exitCode: 1 });
  const result = gradeOne({ type: 'exit_ok' }, record);
  assert.equal(result.pass, false);
  assert.match(result.detail, /1/);
});

// --- ordering / multiple checks ---

test('gradeTier1 returns one result per check, in the same order as input', () => {
  const record = makeRecord({
    diffStat: { filesChanged: 1, insertions: 1, deletions: 1, files: ['a.py'] },
    exitCode: 0,
    diff: 'diff',
  });
  const checks: Tier1Check[] = [
    { type: 'max_files_changed', value: 1 },
    { type: 'exit_ok' },
    { type: 'diff_empty' },
  ];
  const results = gradeTier1(checks, record);
  assert.equal(results.length, 3);
  assert.equal(results[0].check, checks[0]);
  assert.equal(results[1].check, checks[1]);
  assert.equal(results[2].check, checks[2]);
  assert.equal(results[0].pass, true);
  assert.equal(results[1].pass, true);
  assert.equal(results[2].pass, false);
});

test('gradeTier1 on an empty check list returns an empty array', () => {
  const record = makeRecord();
  const results = gradeTier1([], record);
  assert.deepEqual(results, []);
});
