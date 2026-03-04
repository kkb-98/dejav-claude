---
name: baton
description: Create a baton to relay session context to the next session
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
---

# Baton Generation

You are creating a **session relay baton** so the next Claude session can seamlessly continue this work.

## Instructions

1. **Read** the session event log at `.claude/deja-claude/session-log.jsonl`
2. **Analyze** the events to understand what happened in this session
3. **Write** a baton file to `.claude/deja-claude/baton.md` with these sections:

```markdown
# Session Baton

## Goal
[What was the user trying to accomplish in this session?]

## Status
[Current status: in-progress / completed / blocked]

## Done
[List of completed tasks/changes, with file paths]

## Failed
[Any tasks that failed or were abandoned, with reasons]

## Remaining
[Tasks that still need to be done]

## Key Decisions
[Important architectural or design decisions made during the session]

## Key Files
[Most important files that were read/written/edited, and their roles]
```

4. **Also write** structured data to `.claude/deja-claude/baton.json`:

```json
{
  "version": 1,
  "type": "manual",
  "createdAt": "<ISO timestamp>",
  "goal": "<one-line goal>",
  "status": "in-progress | completed | blocked",
  "done": ["<task1>", "<task2>"],
  "failed": ["<task1>"],
  "remaining": ["<task1>"],
  "keyFiles": ["<path1>", "<path2>"],
  "keyDecisions": ["<decision1>"]
}
```

5. **Confirm** to the user that the baton has been created and what it contains.

## Important

- Be concise but complete. The next session's Claude will read this baton to understand context.
- Focus on **actionable information** - what to do next, not a history lesson.
- Include file paths so the next session knows where to look.
