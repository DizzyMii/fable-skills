import type { RunRecord, Tier1Check, Tier1Result } from './types.js';

function gradeOneCheck(check: Tier1Check, record: RunRecord): Tier1Result {
  switch (check.type) {
    case 'max_files_changed': {
      const filesChanged = record.diffStat.filesChanged;
      return {
        check,
        pass: filesChanged <= check.value,
        detail: `${filesChanged} files changed (limit ${check.value})`,
      };
    }

    case 'max_lines_changed': {
      const total = record.diffStat.insertions + record.diffStat.deletions;
      return {
        check,
        pass: total <= check.value,
        detail: `${total} lines changed (limit ${check.value})`,
      };
    }

    case 'file_exists': {
      if (!(check.path in record.workspaceFiles)) {
        return {
          check,
          pass: false,
          detail: `${check.path} was not captured by the runner (config error)`,
        };
      }
      const value = record.workspaceFiles[check.path];
      return {
        check,
        pass: value !== null,
        detail: value !== null ? `${check.path} exists` : `${check.path} does not exist`,
      };
    }

    case 'file_absent': {
      if (!(check.path in record.workspaceFiles)) {
        return {
          check,
          pass: false,
          detail: `${check.path} was not captured by the runner (config error)`,
        };
      }
      const value = record.workspaceFiles[check.path];
      return {
        check,
        pass: value === null,
        detail: value === null ? `${check.path} is absent` : `${check.path} exists (expected absent)`,
      };
    }

    case 'file_contains': {
      if (!(check.path in record.workspaceFiles)) {
        return {
          check,
          pass: false,
          detail: `${check.path} was not captured by the runner (config error)`,
        };
      }
      const value = record.workspaceFiles[check.path];
      if (value === null) {
        return {
          check,
          pass: false,
          detail: `${check.path} is absent, cannot match pattern /${check.pattern}/`,
        };
      }
      const matches = new RegExp(check.pattern).test(value);
      return {
        check,
        pass: matches,
        detail: matches
          ? `pattern /${check.pattern}/ found in ${check.path}`
          : `pattern /${check.pattern}/ not found in ${check.path}`,
      };
    }

    case 'reply_matches': {
      const matches = new RegExp(check.pattern, check.flags).test(record.finalText);
      return {
        check,
        pass: matches,
        detail: matches
          ? `pattern /${check.pattern}/${check.flags ?? ''} matched reply`
          : `pattern /${check.pattern}/${check.flags ?? ''} not found in reply`,
      };
    }

    case 'reply_not_matches': {
      const matches = new RegExp(check.pattern, check.flags).test(record.finalText);
      return {
        check,
        pass: !matches,
        detail: matches
          ? `pattern /${check.pattern}/${check.flags ?? ''} matched reply (expected no match)`
          : `pattern /${check.pattern}/${check.flags ?? ''} not found in reply`,
      };
    }

    case 'diff_empty': {
      const empty = record.diff.trim() === '';
      return {
        check,
        pass: empty,
        detail: empty ? 'diff is empty' : `diff is not empty (${record.diff.length} chars)`,
      };
    }

    case 'exit_ok': {
      const ok = record.exitCode === 0;
      return {
        check,
        pass: ok,
        detail: ok ? 'exit code 0' : `exit code ${record.exitCode} (expected 0)`,
      };
    }
  }
}

export function gradeTier1(checks: Tier1Check[], record: RunRecord): Tier1Result[] {
  return checks.map((check) => gradeOneCheck(check, record));
}
