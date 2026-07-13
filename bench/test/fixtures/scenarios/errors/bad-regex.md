---
id: bad-regex
skill: fable-prove-it
fixture: whatever-fixture
tier1:
  - { type: reply_matches, pattern: '(unclosed' }
  - { type: file_contains, path: utils/pages.py, pattern: '[' }
prompt: |
  Both tier1 entries carry regex patterns that fail new RegExp(...).
---
