---
name: deja-health
description: Display session health dashboard
user-invocable: true
allowed-tools:
  - Read
  - Glob
---

# Session Health Dashboard

Display the current session's health metrics.

## Instructions

1. **Read** the session event log at `.claude/deja-claude/session-log.jsonl`
2. **Calculate** the health score using these rules:

   - Start at **100 points**
   - Over 20 tool invocations: **-2** per extra invocation
   - Same file read 3+ times: **-10** per file
   - Compaction events: **-15** each
   - Errors beyond 3: **-5** each

3. **Display** the dashboard:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  deja-claude Session Health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Score: [XX]/100  [BAND]
  Events: [N] logged
  Compactions: [N]
  Errors: [N]

  Files Read:     [N]
  Files Written:  [N]
  Files Edited:   [N]

  Repeated Reads (3+):
  - [file]: [count] times

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

   Where BAND is:
   - **healthy** (61-100)
   - **warning** (31-60)
   - **critical** (0-30)

4. **Add recommendations** based on the score:
   - **warning**: "Consider creating a baton with `/deja-claude:deja-baton` to preserve context."
   - **critical**: "Create a baton immediately with `/deja-claude:deja-baton` and consider starting a fresh session."

5. If no log file exists, inform the user that no session data has been recorded yet.
