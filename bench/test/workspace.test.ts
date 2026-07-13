import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  captureDiff,
  captureFiles,
  cleanupWorkspace,
  commitAll,
  installTreatment,
  provisionWorkspace,
} from '../src/workspace.js';

// Fixture paths are resolved from process.cwd(), not import.meta.url: the
// verification build (tsc --outDir .tmp-b) only compiles .ts files, so
// test/fixtures never gets mirrored under the outDir. Both the mandated
// verification command and `npm test` always cd into bench/ first, so
// cwd-relative resolution is stable across both build layouts.
const broot = process.cwd();
const fixtureRepo = path.join(broot, 'test', 'fixtures', 'mini', 'repo');
// repo root (contains skills/, claude-md-block.md) is bench/'s parent dir.
const repoRoot = path.resolve(broot, '..');
const defaultSkillsDir = path.join(repoRoot, 'skills');
const defaultClaudeMdFile = path.join(repoRoot, 'claude-md-block.md');

test('provisionWorkspace copies the fixture and creates a git repo with an initial commit', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  try {
    assert.ok(fs.existsSync(path.join(ws, 'hello.txt')), 'fixture file copied');
    assert.ok(fs.existsSync(path.join(ws, '.git')), 'git repo initialized');
    // Windows 8.3 short paths (KADEHE~1) trip Claude Code's suspicious-path
    // permission check and block headless writes; the workspace must be long-form.
    assert.ok(!/~\d/.test(ws), `workspace path must not contain an 8.3 short segment: ${ws}`);
    // A clean workspace right after provisioning has nothing staged/changed.
    const { diffStat } = await captureDiff(ws);
    assert.equal(diffStat.filesChanged, 0);
  } finally {
    cleanupWorkspace(ws);
  }
});

test('captureDiff reports a mutated file and a new file with parsed numstat', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  try {
    fs.writeFileSync(path.join(ws, 'hello.txt'), 'hello world\nmutated\n');
    fs.writeFileSync(path.join(ws, 'new.txt'), 'brand new file\n');

    const { diff, diffStat } = await captureDiff(ws);

    assert.ok(diff.includes('mutated'), 'diff text includes the mutation');
    assert.ok(diff.includes('new.txt'), 'diff text mentions the new file');
    assert.equal(diffStat.filesChanged, 2);
    assert.deepEqual([...diffStat.files].sort(), ['hello.txt', 'new.txt']);
    assert.ok(diffStat.insertions >= 2, `expected at least 2 insertions, got ${diffStat.insertions}`);
    assert.equal(diffStat.deletions, 0);
  } finally {
    cleanupWorkspace(ws);
  }
});

test('installTreatment (default skillsDir) installs every fable-* skill dir and a CLAUDE.md with the fable-skills marker', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  try {
    await installTreatment(ws, defaultSkillsDir, defaultClaudeMdFile);

    const skillsDir = path.join(ws, '.claude', 'skills');
    const installed = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('fable-'))
      .map((e) => e.name)
      .sort();

    assert.equal(installed.length, 6, `expected 6 fable-* skill dirs, got: ${installed.join(', ')}`);
    for (const name of installed) {
      assert.ok(
        fs.existsSync(path.join(skillsDir, name, 'SKILL.md')),
        `${name} should contain SKILL.md`
      );
    }

    const claudeMd = fs.readFileSync(path.join(ws, 'CLAUDE.md'), 'utf8');
    assert.ok(claudeMd.includes('fable-skills:start'), 'CLAUDE.md contains the fable-skills marker');
  } finally {
    cleanupWorkspace(ws);
  }
});

test('installTreatment (custom skillsDir) copies only child dirs that contain a SKILL.md', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  const tmpSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bench-skillsdir-'));
  try {
    const withSkill = path.join(tmpSkillsDir, 'has-skill-md');
    fs.mkdirSync(withSkill, { recursive: true });
    fs.writeFileSync(path.join(withSkill, 'SKILL.md'), '# a skill\n');

    const withoutSkill = path.join(tmpSkillsDir, 'no-skill-md');
    fs.mkdirSync(withoutSkill, { recursive: true });
    fs.writeFileSync(path.join(withoutSkill, 'notes.md'), 'not a skill dir\n');

    const tmpClaudeMd = path.join(tmpSkillsDir, 'claude-md-block.md');
    fs.writeFileSync(tmpClaudeMd, 'custom claude md\n');

    await installTreatment(ws, tmpSkillsDir, tmpClaudeMd);

    const destSkillsDir = path.join(ws, '.claude', 'skills');
    const installed = fs.readdirSync(destSkillsDir, { withFileTypes: true }).map((e) => e.name);
    assert.deepEqual(installed, ['has-skill-md']);

    const claudeMd = fs.readFileSync(path.join(ws, 'CLAUDE.md'), 'utf8');
    assert.equal(claudeMd, 'custom claude md\n');
  } finally {
    cleanupWorkspace(ws);
    fs.rmSync(tmpSkillsDir, { recursive: true, force: true });
  }
});

test('commitAll after installTreatment folds treatment files into the baseline: captureDiff is empty', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  try {
    await installTreatment(ws, defaultSkillsDir, defaultClaudeMdFile);
    await commitAll(ws, 'install treatment');

    const { diff, diffStat } = await captureDiff(ws);
    assert.equal(diff, '', 'diff must be empty after committing the treatment install');
    assert.deepEqual(diffStat, { filesChanged: 0, insertions: 0, deletions: 0, files: [] });

    // The treatment files are in the baseline, not excluded: model tampering
    // with CLAUDE.md after the commit must show up in the diff.
    fs.appendFileSync(path.join(ws, 'CLAUDE.md'), 'tampered\n');
    const after = await captureDiff(ws);
    assert.equal(after.diffStat.filesChanged, 1);
    assert.deepEqual(after.diffStat.files, ['CLAUDE.md']);
  } finally {
    cleanupWorkspace(ws);
  }
});

test('captureFiles returns content for existing files and null for absent ones', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  try {
    const result = captureFiles(ws, ['hello.txt', 'does-not-exist.txt']);
    assert.equal(result['hello.txt'], 'hello world\n');
    assert.equal(result['does-not-exist.txt'], null);
  } finally {
    cleanupWorkspace(ws);
  }
});

test('cleanupWorkspace removes the workspace directory', async () => {
  const ws = await provisionWorkspace(fixtureRepo);
  cleanupWorkspace(ws);
  assert.equal(fs.existsSync(ws), false);
});
