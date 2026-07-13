import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { MockExecutor } from '../src/executor.js';
import { extractAssistantText, runScenario } from '../src/runner.js';
import type { Executor, Scenario } from '../src/types.js';

// Resolved from process.cwd() (always bench/ for both the mandated
// verification build and `npm test`), not import.meta.url — see the
// comment in workspace.test.ts for why.
const benchRoot = process.cwd();
const transcriptsDir = path.join(benchRoot, 'test', 'fixtures', 'mini', 'transcripts');
// repo root (contains skills/, claude-md-block.md) is bench/'s parent dir.
// Unused by the mock branch, but RunnerOpts requires them.
const repoRoot = path.resolve(benchRoot, '..');
const skillsDir = path.join(repoRoot, 'skills');
const claudeMdFile = path.join(repoRoot, 'claude-md-block.md');

const scenario: Scenario = {
  id: 'mini-scenario',
  skill: 'fable-scope-discipline',
  file: path.join(benchRoot, 'test', 'fixtures', 'mini', 'mini-scenario.md'),
  fixture: 'mini',
  prompt: 'do the mini thing',
  k: 3,
  model: 'claude-opus-4-8',
  judgeModel: 'claude-sonnet-5',
  allowedTools: ['Skill'],
  maxBudgetUsd: 1,
  timeoutS: 600,
  tier1: [{ type: 'file_exists', path: 'hello.txt' }],
  intent: 'mini test scenario',
};

function mkOutDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bench-runner-test-'));
}

test('runScenario (mock) returns RunRecord[] with correct shape', async () => {
  const outDir = mkOutDir();
  try {
    const executor = new MockExecutor(transcriptsDir);
    const records = await runScenario(scenario, 'baseline', {
      executor,
      k: 2,
      outDir,
      benchRoot,
      mock: true,
      skillsDir,
      claudeMdFile,
    });

    assert.equal(records.length, 2);

    const r0 = records[0];
    assert.equal(r0.scenarioId, 'mini-scenario');
    assert.equal(r0.condition, 'baseline');
    assert.equal(r0.iteration, 0);
    assert.equal(r0.model, scenario.model);
    assert.equal(r0.finalText, 'Reply from recording 0.');
    assert.equal(r0.exitCode, 0);
    assert.equal(r0.costUsd, 0.01);
    assert.equal(r0.transcriptText, 'Reply from recording 0.');
    assert.deepEqual(r0.workspaceFiles, { 'hello.txt': 'hello world\n' });
    assert.deepEqual(r0.diffStat, { filesChanged: 0, insertions: 0, deletions: 0, files: [] });

    // Recording 1 is a failed run (exitCode 1) — the runner must still
    // produce a RunRecord for it, never throw.
    const r1 = records[1];
    assert.equal(r1.iteration, 1);
    assert.equal(r1.exitCode, 1);
    assert.equal(r1.finalText, 'Reply from recording 1 (this run failed).');
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('runScenario (mock) cycles recordings modulo the number available', async () => {
  const outDir = mkOutDir();
  try {
    const executor = new MockExecutor(transcriptsDir);
    // 2 recordings exist (baseline-0.json, baseline-1.json); k=3 means
    // iteration 2 must replay recording 0 again (2 % 2 === 0).
    const records = await runScenario(scenario, 'baseline', {
      executor,
      k: 3,
      outDir,
      benchRoot,
      mock: true,
      skillsDir,
      claudeMdFile,
    });

    assert.equal(records.length, 3);
    assert.equal(records[0].finalText, 'Reply from recording 0.');
    assert.equal(records[1].finalText, 'Reply from recording 1 (this run failed).');
    assert.equal(records[2].finalText, 'Reply from recording 0.');
    assert.equal(records[2].finalText, records[0].finalText);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('runScenario (mock) writes one transcript JSONL file per iteration', async () => {
  const outDir = mkOutDir();
  try {
    const executor = new MockExecutor(transcriptsDir);
    const records = await runScenario(scenario, 'baseline', {
      executor,
      k: 2,
      outDir,
      benchRoot,
      mock: true,
      skillsDir,
      claudeMdFile,
    });

    for (const [i, record] of records.entries()) {
      const expectedPath = path.join(outDir, 'transcripts', 'mini-scenario', `baseline-${i}.jsonl`);
      assert.equal(record.transcriptPath, expectedPath);
      assert.ok(fs.existsSync(expectedPath), `${expectedPath} should exist`);

      const lines = fs
        .readFileSync(expectedPath, 'utf8')
        .split('\n')
        .filter((l) => l.trim().length > 0);
      assert.ok(lines.length >= 1, 'transcript has at least one JSONL line');
      for (const line of lines) {
        assert.doesNotThrow(() => JSON.parse(line), `line should be valid JSON: ${line}`);
      }
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('runScenario (mock) defaults iterations and model from the scenario when opts omit them', async () => {
  const outDir = mkOutDir();
  try {
    const executor = new MockExecutor(transcriptsDir);
    const records = await runScenario(scenario, 'baseline', {
      executor,
      outDir,
      benchRoot,
      mock: true,
      skillsDir,
      claudeMdFile,
    });

    // scenario.k === 3
    assert.equal(records.length, 3);
    for (const r of records) {
      assert.equal(r.model, scenario.model);
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('runScenario (mock) inline condition replays inline recordings, tagged with condition "inline"', async () => {
  const outDir = mkOutDir();
  try {
    const executor = new MockExecutor(transcriptsDir);
    const records = await runScenario(scenario, 'inline', {
      executor,
      k: 1,
      outDir,
      benchRoot,
      mock: true,
      skillsDir,
      claudeMdFile,
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].condition, 'inline');
    assert.equal(records[0].finalText, 'Reply from inline recording 0.');
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('runScenario (live-shaped) inline condition prepends the SKILL.md body to the prompt and installs nothing', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bench-inline-live-'));
  const outDir = mkOutDir();
  try {
    // A fake bench root with just enough shape for provisionWorkspace: a
    // fixtures/repos/<fixture> dir. Kept separate from the real bench/fixtures
    // (packet F's territory).
    const fakeBenchRoot = path.join(tmpRoot, 'bench');
    const fixtureRepoDir = path.join(fakeBenchRoot, 'fixtures', 'repos', scenario.fixture);
    fs.mkdirSync(fixtureRepoDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureRepoDir, 'hello.txt'), 'hello world\n');

    // A temp skillsDir with a SKILL.md for the scenario's skill.
    const tmpSkillsDir = path.join(tmpRoot, 'skills');
    const skillDir = path.join(tmpSkillsDir, scenario.skill);
    fs.mkdirSync(skillDir, { recursive: true });
    const skillBody = '# fable-scope-discipline\n\nStay in scope. Do not gold-plate.\n';
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillBody);

    const tmpClaudeMdFile = path.join(tmpRoot, 'claude-md-block.md');
    fs.writeFileSync(tmpClaudeMdFile, 'unused by inline\n');

    let capturedPrompt: string | undefined;
    let sawInstalledSkillsDir: boolean | undefined;
    let sawInstalledClaudeMd: boolean | undefined;
    const stubExecutor: Executor = {
      async execute(req) {
        capturedPrompt = req.prompt;
        // The workspace still exists at this point (cleanup happens after
        // the executor resolves), so this is the only chance to assert
        // nothing was installed.
        sawInstalledSkillsDir = fs.existsSync(path.join(req.cwd, '.claude', 'skills'));
        sawInstalledClaudeMd = fs.existsSync(path.join(req.cwd, 'CLAUDE.md'));
        return { finalText: 'stub reply', events: [], exitCode: 0, costUsd: 0, durationMs: 1 };
      },
    };

    const records = await runScenario(scenario, 'inline', {
      executor: stubExecutor,
      k: 1,
      outDir,
      benchRoot: fakeBenchRoot,
      mock: false,
      skillsDir: tmpSkillsDir,
      claudeMdFile: tmpClaudeMdFile,
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].condition, 'inline');
    assert.ok(capturedPrompt, 'executor should have received a prompt');
    assert.ok(
      capturedPrompt!.startsWith(skillBody),
      `prompt should start with the SKILL.md body, got: ${capturedPrompt}`
    );
    assert.ok(capturedPrompt!.includes(scenario.prompt), 'prompt should still include the scenario prompt');
    assert.equal(sawInstalledSkillsDir, false, 'inline must not install .claude/skills');
    assert.equal(sawInstalledClaudeMd, false, 'inline must not write CLAUDE.md');
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('runScenario (live-shaped) inline condition throws a config error when the scenario skill has no SKILL.md', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bench-inline-missing-'));
  const outDir = mkOutDir();
  try {
    const fakeBenchRoot = path.join(tmpRoot, 'bench');
    const fixtureRepoDir = path.join(fakeBenchRoot, 'fixtures', 'repos', scenario.fixture);
    fs.mkdirSync(fixtureRepoDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureRepoDir, 'hello.txt'), 'hello world\n');

    // skillsDir exists but has no dir for scenario.skill at all.
    const tmpSkillsDir = path.join(tmpRoot, 'skills');
    fs.mkdirSync(tmpSkillsDir, { recursive: true });
    const tmpClaudeMdFile = path.join(tmpRoot, 'claude-md-block.md');
    fs.writeFileSync(tmpClaudeMdFile, 'unused by inline\n');

    const stubExecutor: Executor = {
      async execute() {
        throw new Error('executor must not be called when SKILL.md is missing');
      },
    };

    await assert.rejects(
      () =>
        runScenario(scenario, 'inline', {
          executor: stubExecutor,
          k: 1,
          outDir,
          benchRoot: fakeBenchRoot,
          mock: false,
          skillsDir: tmpSkillsDir,
          claudeMdFile: tmpClaudeMdFile,
        }),
      /SKILL\.md/
    );
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('extractAssistantText joins every assistant text block across events', () => {
  const events = [
    { type: 'system', subtype: 'init' },
    {
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: 'first' }] },
    },
    {
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: 'second' }] },
    },
    { type: 'result', subtype: 'success', result: 'first\n\nsecond', total_cost_usd: 0.1, is_error: false },
  ];
  assert.equal(extractAssistantText(events), 'first\n\nsecond');
});

test('extractAssistantText ignores non-assistant events and malformed content', () => {
  const events: unknown[] = [
    { type: 'system', subtype: 'init' },
    { type: 'assistant', message: { role: 'assistant', content: 'not-an-array' } },
    { type: 'assistant', message: null },
    'not-an-object',
    null,
  ];
  assert.equal(extractAssistantText(events), '');
});

test('MockExecutor resolves judge recordings via the -judge suffix naming convention', async () => {
  const executor = new MockExecutor(transcriptsDir);
  const result = await executor.execute({
    kind: 'judge',
    scenarioId: 'mini-scenario',
    condition: 'baseline',
    iteration: 0,
    prompt: 'grade this',
    model: 'claude-sonnet-5',
    cwd: '',
    allowedTools: [],
    maxBudgetUsd: 1,
    timeoutMs: 1000,
  });
  assert.ok(result.finalText.includes('judge recording 0'));

  // Judge recordings must not bleed into scenario recordings and vice versa.
  const scenarioResult = await executor.execute({
    kind: 'scenario',
    scenarioId: 'mini-scenario',
    condition: 'baseline',
    iteration: 0,
    prompt: 'do the mini thing',
    model: 'claude-opus-4-8',
    cwd: '',
    allowedTools: [],
    maxBudgetUsd: 1,
    timeoutMs: 1000,
  });
  assert.ok(!scenarioResult.finalText.includes('judge'));
});

test('MockExecutor throws a descriptive error naming the expected path when recordings are missing', async () => {
  const executor = new MockExecutor(transcriptsDir);
  await assert.rejects(
    () =>
      executor.execute({
        kind: 'scenario',
        scenarioId: 'nonexistent-scenario',
        condition: 'baseline',
        iteration: 0,
        prompt: 'x',
        model: 'm',
        cwd: '',
        allowedTools: [],
        maxBudgetUsd: 1,
        timeoutMs: 1000,
      }),
    /nonexistent-scenario/
  );
});
