import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildJudgePrompt, parseJudgeResponse, judgeRun } from '../src/judge.js';
import type { ExecRequest, ExecResult, Executor, RunRecord, Scenario } from '../src/types.js';

// --- fixtures ---

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 's-test',
    skill: 'fable-test',
    file: '/fake/scenarios/s-test.md',
    fixture: 'blank',
    prompt: 'do the thing',
    k: 1,
    model: 'claude-opus-4-8',
    judgeModel: 'claude-sonnet-5',
    allowedTools: ['Skill'],
    maxBudgetUsd: 1,
    timeoutS: 600,
    tier1: [],
    rubric: 'rubrics/test.md',
    intent: 'intent body',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    scenarioId: 's-test',
    condition: 'baseline',
    iteration: 0,
    model: 'claude-opus-4-8',
    finalText: 'This is the final reply.',
    transcriptPath: '/fake/transcripts/s-test/baseline-0.jsonl',
    transcriptText: 'assistant: did some stuff',
    diff: '',
    diffStat: { filesChanged: 0, insertions: 0, deletions: 0, files: [] },
    workspaceFiles: {},
    exitCode: 0,
    costUsd: 0.01,
    durationMs: 100,
    ...overrides,
  };
}

/** A tiny inline stub of the Executor interface — never imports executor.ts. */
class StubExecutor implements Executor {
  calls: ExecRequest[] = [];
  private responses: Array<{ finalText: string; costUsd: number | null }>;

  constructor(responses: Array<{ finalText: string; costUsd: number | null }>) {
    this.responses = responses;
  }

  async execute(req: ExecRequest): Promise<ExecResult> {
    this.calls.push(req);
    const idx = this.calls.length - 1;
    const resp = this.responses[idx] ?? this.responses[this.responses.length - 1];
    return {
      finalText: resp.finalText,
      events: [],
      exitCode: 0,
      costUsd: resp.costUsd,
      durationMs: 5,
    };
  }
}

/** Mirrors judge.ts's private whitespace-collapse, used only to state test preconditions. */
function collapseWhitespaceForTest(s: string): string {
  return s.replace(/\s+/g, ' ');
}

function makeBenchRoot(rubricContent: string): { benchRoot: string; rubricRelPath: string } {
  const benchRoot = mkdtempSync(path.join(tmpdir(), 'fable-bench-judge-test-'));
  mkdirSync(path.join(benchRoot, 'rubrics'), { recursive: true });
  writeFileSync(path.join(benchRoot, 'rubrics', 'test.md'), rubricContent, 'utf8');
  return { benchRoot, rubricRelPath: 'rubrics/test.md' };
}

// --- buildJudgePrompt ---

test('buildJudgePrompt includes rubric text and final reply', () => {
  const scenario = makeScenario();
  const record = makeRecord({ finalText: 'UNIQUE_FINAL_REPLY_TOKEN', transcriptText: 'UNIQUE_TRANSCRIPT_TOKEN' });
  const prompt = buildJudgePrompt(scenario, 'UNIQUE_RUBRIC_TOKEN', record);

  assert.match(prompt, /UNIQUE_RUBRIC_TOKEN/);
  assert.match(prompt, /UNIQUE_FINAL_REPLY_TOKEN/);
  assert.match(prompt, /UNIQUE_TRANSCRIPT_TOKEN/);
  assert.match(prompt, /--- FINAL REPLY ---/);
  assert.match(prompt, /--- TRANSCRIPT \(assistant text\) ---/);
  assert.match(prompt, /PASS/);
  assert.match(prompt, /FAIL/);
});

test('buildJudgePrompt truncates transcript to the last 30000 chars', () => {
  const headMarker = 'HEAD_MARKER_UNIQUE_TOKEN';
  const tailMarker = 'TAIL_MARKER_UNIQUE_TOKEN';
  const transcriptText = headMarker + 'x'.repeat(40000) + tailMarker;
  assert.ok(transcriptText.length > 30000);

  const scenario = makeScenario();
  const record = makeRecord({ transcriptText });
  const prompt = buildJudgePrompt(scenario, 'rubric', record);

  const expectedTail = transcriptText.slice(-30000);
  assert.ok(prompt.includes(expectedTail), 'prompt must contain the exact last-30000-char tail');
  assert.ok(!prompt.includes(headMarker), 'prompt must not contain content beyond the tail window');
  assert.ok(prompt.includes(tailMarker), 'prompt must contain the very end of the transcript');
});

// --- parseJudgeResponse ---

test('parseJudgeResponse parses clean bare JSON', () => {
  const result = parseJudgeResponse('{"verdict":"PASS","reasoning":"ok","rationalization_quote":""}');
  assert.deepEqual(result, { verdict: 'PASS', reasoning: 'ok', rationalizationQuote: '' });
});

test('parseJudgeResponse parses a ```json fenced block', () => {
  const text = [
    'Here is my grading:',
    '```json',
    '{"verdict":"FAIL","reasoning":"scope creep","rationalization_quote":"it was basically the same file"}',
    '```',
  ].join('\n');
  const result = parseJudgeResponse(text);
  assert.deepEqual(result, {
    verdict: 'FAIL',
    reasoning: 'scope creep',
    rationalizationQuote: 'it was basically the same file',
  });
});

test('parseJudgeResponse extracts JSON surrounded by prose', () => {
  const text =
    'Sure, grading now.\n{"verdict":"PASS","reasoning":"clean diff, uses braces like {this} in prose too","rationalization_quote":""}\nDone, hope that helps.';
  const result = parseJudgeResponse(text);
  assert.equal(result?.verdict, 'PASS');
  assert.equal(result?.reasoning, 'clean diff, uses braces like {this} in prose too');
  assert.equal(result?.rationalizationQuote, '');
});

test('parseJudgeResponse maps a missing rationalization_quote to empty string', () => {
  const result = parseJudgeResponse('{"verdict":"PASS","reasoning":"ok"}');
  assert.deepEqual(result, { verdict: 'PASS', reasoning: 'ok', rationalizationQuote: '' });
});

test('parseJudgeResponse returns null for garbage', () => {
  assert.equal(parseJudgeResponse('sorry, I cannot comply with that request.'), null);
});

test('parseJudgeResponse returns null when verdict is not PASS/FAIL', () => {
  assert.equal(parseJudgeResponse('{"verdict":"MAYBE","reasoning":"unsure"}'), null);
});

// --- judgeRun ---

test('judgeRun PASS path: parses response, reads rubric, quoteVerified true on empty quote', async () => {
  const { benchRoot } = makeBenchRoot('RUBRIC_BODY_MARKER');
  const scenario = makeScenario();
  const record = makeRecord();
  const executor = new StubExecutor([
    { finalText: '{"verdict":"PASS","reasoning":"looks good","rationalization_quote":""}', costUsd: 0.02 },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);

  assert.equal(result.verdict, 'PASS');
  assert.equal(result.reasoning, 'looks good');
  assert.equal(result.rationalizationQuote, '');
  assert.equal(result.quoteVerified, true);
  assert.equal(result.costUsd, 0.02);
  assert.equal(executor.calls.length, 1);
  assert.match(executor.calls[0].prompt, /RUBRIC_BODY_MARKER/);
  assert.equal(executor.calls[0].kind, 'judge');
  assert.equal(executor.calls[0].scenarioId, record.scenarioId);
  assert.equal(executor.calls[0].condition, record.condition);
  assert.equal(executor.calls[0].iteration, record.iteration);
  assert.equal(executor.calls[0].model, scenario.judgeModel);
  assert.deepEqual(executor.calls[0].allowedTools, []);
  assert.equal(executor.calls[0].maxBudgetUsd, scenario.maxBudgetUsd);
  assert.equal(executor.calls[0].timeoutMs, 120000);
});

test('judgeRun FAIL with quote present exactly: quoteVerified true', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const quote = "I did X because it was faster and that's fine.";
  const record = makeRecord({ transcriptText: `blah blah ${quote} more text after` });
  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({ verdict: 'FAIL', reasoning: 'rationalized', rationalization_quote: quote }),
      costUsd: 0.03,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);

  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.rationalizationQuote, quote);
  assert.equal(result.quoteVerified, true);
  assert.equal(result.costUsd, 0.03);
});

test('judgeRun FAIL with quote matching only after whitespace collapse: quoteVerified true', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const quote = 'I did X because it was faster';
  const raggedTranscript = `context before... I did   X because\nit was faster ...context after`;
  const record = makeRecord({ transcriptText: raggedTranscript });
  assert.ok(!raggedTranscript.includes(quote), 'precondition: exact substring must NOT match');

  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({ verdict: 'FAIL', reasoning: 'rationalized', rationalization_quote: quote }),
      costUsd: 0.01,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);
  assert.equal(result.quoteVerified, true);
});

test('judgeRun FAIL with quote matching only after stripping backticks: quoteVerified true', async () => {
  // The live case: judge copied an otherwise verbatim rationalization but dropped the
  // markdown backticks around an identifier.
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const quote = 'but PAGE_SIZE = 10.';
  const transcriptText = 'the tests still pass but `PAGE_SIZE = 10`. that seemed fine to ship.';
  const record = makeRecord({ transcriptText });
  assert.ok(!transcriptText.includes(quote), 'precondition: exact substring must NOT match');
  assert.ok(
    !collapseWhitespaceForTest(transcriptText).includes(collapseWhitespaceForTest(quote)),
    'precondition: whitespace-collapse alone must NOT match (backticks remain)',
  );

  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({ verdict: 'FAIL', reasoning: 'rationalized', rationalization_quote: quote }),
      costUsd: 0.01,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.quoteVerified, true);
});

test('judgeRun FAIL with quote matching only after stripping asterisk emphasis: quoteVerified true', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const quote = 'must not bundle';
  const transcriptText = 'the rubric says we **must not** bundle native deps into the package.';
  const record = makeRecord({ transcriptText });
  assert.ok(!transcriptText.includes(quote), 'precondition: exact substring must NOT match');
  assert.ok(
    !collapseWhitespaceForTest(transcriptText).includes(collapseWhitespaceForTest(quote)),
    'precondition: whitespace-collapse alone must NOT match (asterisks remain)',
  );

  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({ verdict: 'FAIL', reasoning: 'rationalized', rationalization_quote: quote }),
      costUsd: 0.01,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.quoteVerified, true);
});

test('judgeRun FAIL with fabricated quote sharing many words but no formatting-stripped substring match: quoteVerified false', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  // Shares nearly every word with the transcript, but "because" -> "although" breaks the
  // contiguous substring match at every tier, including formatting-stripped.
  const transcriptText = 'closing note: `PAGE_SIZE = 10` was chosen because it kept memory low.';
  const quote = 'PAGE_SIZE = 10 was chosen although it kept memory low';
  const record = makeRecord({ transcriptText });

  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({ verdict: 'FAIL', reasoning: 'rationalized', rationalization_quote: quote }),
      costUsd: 0.01,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.quoteVerified, false);
});

test('judgeRun FAIL with fabricated quote: quoteVerified false', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const record = makeRecord({ transcriptText: 'nothing resembling the quote appears here at all' });
  const executor = new StubExecutor([
    {
      finalText: JSON.stringify({
        verdict: 'FAIL',
        reasoning: 'rationalized',
        rationalization_quote: 'this sentence was never said by the model',
      }),
      costUsd: 0.01,
    },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.quoteVerified, false);
});

test('judgeRun retries once on unparseable output, then grades judge-unparseable FAIL', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const record = makeRecord();
  const executor = new StubExecutor([
    { finalText: 'nope, not json', costUsd: 0.01 },
    { finalText: 'still not json', costUsd: null },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);

  assert.equal(executor.calls.length, 2);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.reasoning, 'judge-unparseable');
  assert.equal(result.rationalizationQuote, '');
  assert.equal(result.quoteVerified, false);
  assert.equal(result.costUsd, 0.01);
});

test('judgeRun succeeds on the second attempt after one unparseable response', async () => {
  const { benchRoot } = makeBenchRoot('rubric');
  const scenario = makeScenario();
  const record = makeRecord();
  const executor = new StubExecutor([
    { finalText: 'garbage', costUsd: 0.01 },
    { finalText: '{"verdict":"PASS","reasoning":"fine on retry","rationalization_quote":""}', costUsd: 0.02 },
  ]);

  const result = await judgeRun(executor, scenario, record, benchRoot);

  assert.equal(executor.calls.length, 2);
  assert.equal(result.verdict, 'PASS');
  assert.equal(result.reasoning, 'fine on retry');
  assert.equal(result.costUsd, 0.03);
});
