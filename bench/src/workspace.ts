import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DiffStat } from './types.js';

function runGit(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function runGitCapture(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/**
 * Copies the fixture dir into a fresh temp workspace and turns it into a git
 * repo with a single initial commit, so later diffs are relative to a known
 * baseline.
 */
export async function provisionWorkspace(fixtureDir: string): Promise<string> {
  // os.tmpdir() can return an 8.3 short path on Windows (C:\Users\KADEHE~1\...);
  // Claude Code's permission layer flags the ~N pattern as suspicious and blocks
  // headless writes into the workspace. Expand to the long form first.
  const tmpBase = fs.realpathSync.native(os.tmpdir());
  const wsDir = await fs.promises.mkdtemp(path.join(tmpBase, 'fable-bench-'));
  fs.cpSync(fixtureDir, wsDir, { recursive: true });
  runGit(['init'], wsDir);
  runGit(['add', '-A'], wsDir);
  runGit(
    ['-c', 'user.name=fable-bench', '-c', 'user.email=bench@local', 'commit', '-m', 'provision'],
    wsDir
  );
  return wsDir;
}

/**
 * Stages and commits everything in the workspace with the fable-bench
 * identity. Used to fold harness-authored files (the treatment install) into
 * the git baseline before the model runs, so captureDiff only ever reports
 * model changes — including model tampering with CLAUDE.md or .claude/,
 * which stays visible precisely because these files are committed rather
 * than excluded from the diff.
 */
export async function commitAll(workspaceDir: string, message: string): Promise<void> {
  runGit(['add', '-A'], workspaceDir);
  runGit(
    ['-c', 'user.name=fable-bench', '-c', 'user.email=bench@local', 'commit', '-m', message],
    workspaceDir
  );
}

/**
 * Installs a pack's real install shape into the workspace: every child
 * directory of skillsDir that contains a SKILL.md is copied to
 * workspaceDir/.claude/skills/<name>/, plus workspaceDir/CLAUDE.md written
 * from claudeMdFile. Generalized over any pack, not just this repo's own
 * fable-* skills — the default skillsDir (repoRoot/skills) contains only the
 * six fable-* dirs, all with SKILL.md, so default behavior is unchanged.
 */
export async function installTreatment(
  workspaceDir: string,
  skillsDir: string,
  claudeMdFile: string
): Promise<void> {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skillDirs = entries.filter(
    (e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md'))
  );

  const destSkillsDir = path.join(workspaceDir, '.claude', 'skills');
  fs.mkdirSync(destSkillsDir, { recursive: true });

  for (const dir of skillDirs) {
    fs.cpSync(path.join(skillsDir, dir.name), path.join(destSkillsDir, dir.name), {
      recursive: true,
    });
  }

  const claudeMdBlock = fs.readFileSync(claudeMdFile, 'utf8');
  fs.writeFileSync(path.join(workspaceDir, 'CLAUDE.md'), claudeMdBlock);
}

function parseNumstat(numstatRaw: string): DiffStat {
  const files: string[] = [];
  let insertions = 0;
  let deletions = 0;

  for (const line of numstatRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('\t');
    if (parts.length < 3) continue;
    const [insRaw, delRaw, filePath] = parts;
    // Binary files report '-' for both counts; count as 0 lines.
    const ins = insRaw === '-' ? 0 : parseInt(insRaw, 10);
    const del = delRaw === '-' ? 0 : parseInt(delRaw, 10);
    insertions += Number.isNaN(ins) ? 0 : ins;
    deletions += Number.isNaN(del) ? 0 : del;
    files.push(filePath);
  }

  return { filesChanged: files.length, insertions, deletions, files };
}

/**
 * Stages everything (so new/deleted files count) and captures both the
 * textual diff and its parsed numstat.
 */
export async function captureDiff(
  workspaceDir: string
): Promise<{ diff: string; diffStat: DiffStat }> {
  runGit(['add', '-A'], workspaceDir);
  const diff = runGitCapture(['diff', '--cached'], workspaceDir);
  const numstatRaw = runGitCapture(['diff', '--cached', '--numstat'], workspaceDir);
  return { diff, diffStat: parseNumstat(numstatRaw) };
}

/**
 * Reads the given workspace-relative paths into memory (utf8), so graders
 * never need to touch the (soon to be deleted) workspace filesystem.
 */
export function captureFiles(
  workspaceDir: string,
  paths: string[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const p of paths) {
    const full = path.join(workspaceDir, p);
    try {
      result[p] = fs.readFileSync(full, 'utf8');
    } catch {
      result[p] = null;
    }
  }
  return result;
}

/** Removes the workspace dir; retries to ride out transient Windows file locks. */
export function cleanupWorkspace(workspaceDir: string): void {
  fs.rmSync(workspaceDir, { recursive: true, force: true, maxRetries: 5 });
}
