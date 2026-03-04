---
name: forget
description: Clear all baton data (reset session relay)
---

# Forget (Reset Baton)

Clear all baton files so the next session starts fresh.

## Instructions

1. **Delete** the following files if they exist:
   - `.claude/deja-claude/baton.md`
   - `.claude/deja-claude/baton.json`

2. **Confirm** to the user that the baton has been cleared.

3. **Note**: This does NOT delete:
   - `session-log.jsonl` (current session events)
   - `metrics.json` (health metrics)
   - `baton-delivered-*.md` (archived batons)

   To clear everything, the user can delete the `.claude/deja-claude/` directory.
