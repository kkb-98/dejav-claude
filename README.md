# deja-claude

🌐 [한국어](./README.ko.md) | **English**

**Session relay plugin — AI never loses memory between sessions.**

When a Claude Code session disconnects, all working context is lost. `CLAUDE.md` holds static rules but can't capture "what was I doing right now?" deja-claude automatically logs session events and passes a "baton" between sessions so the next session can pick up exactly where you left off.

## How It Works

```
Session A                          Session B
┌──────────────┐                  ┌──────────────┐
│ Work happens │                  │ Session start │
│ Events logged│──── baton.md ───▶│ Baton loaded  │
│ /baton       │    (relay)       │ Context ready │
│ Session ends │                  │ Continue work │
└──────────────┘                  └──────────────┘
```

1. **Event Logging** — Every file read/write/edit and command is logged to `session-log.jsonl`
2. **File Cache** — Auto-caches file summaries with symbol extraction (functions, classes, exports)
3. **Health Monitoring** — Track session health score (compaction, repeated reads, errors)
4. **Compaction Preservation** — Survives Claude's context compaction via systemMessage injection
5. **Baton Relay** — Create a structured summary for the next session
6. **Auto-inject** — Next session automatically receives the baton + cached file summaries

## What Makes deja-claude Different?

deja-claude focuses on **automatic session event tracking and relay** — a gap that other Claude Code plugins don't cover.

| Capability | deja-claude | OMC | bkit | superpowers |
|------------|:-----------:|:---:|:----:|:-----------:|
| Auto session event relay | **Yes** | No | No | No |
| Tool use event logging | **Yes** (JSONL) | No | No | No |
| File read cache + symbol extraction | **Yes** (LRU 50) | No | No | No |
| Compaction survival context | **Yes** (baton fallback) | No | No | No |
| Session health monitoring | **Yes** (score system) | No | No | No |
| Persistent notes/memos | No | **Yes** (notepad) | No | No |
| Project environment detection | No | **Yes** (project-memory) | No | No |
| PDCA document system | No | No | **Yes** | No |
| Dev workflow skills | No | No | No | **Yes** |

### How each plugin approaches "memory"

| Plugin | Focus | Approach |
|--------|-------|----------|
| **deja-claude** | "What did I **do** this session?" | Automatic/passive — tracks every tool use and relays to next session |
| **OMC** | "What do I **know** about this project?" | Intentional/active — AI decides what to save to notepad/memory |
| **bkit** | "What **process** should I follow?" | Document-based — PDCA methodology guides development phases |
| **superpowers** | "**How** should I write code?" | Skill-based — TDD, debugging, code review workflows |

### Using together

These plugins are **complementary, not competing**. deja-claude fills the "automatic session continuity" gap:

- **deja-claude + OMC**: Auto-track session events (deja-claude) + intentionally store project knowledge (OMC)
- **deja-claude + bkit**: Auto-relay work context (deja-claude) + follow structured dev methodology (bkit)
- **deja-claude + superpowers**: Auto-preserve session state (deja-claude) + apply dev workflow skills (superpowers)

## Installation

```bash
# Add as a Claude Code plugin
claude plugin add /path/to/deja-claude
```

## Commands

### `/deja-claude:baton`
Create a relay baton for the next session. Generates both `baton.md` (human-readable) and `baton.json` (structured data).

### `/deja-claude:health`
Display the session health dashboard — score, event counts, repeated reads, and recommendations.

### `/deja-claude:forget`
Clear baton files so the next session starts fresh.

## Features

### File Cache (v2)

Automatically caches file content summaries when Read/Write/Edit tools are used:

- **Language Detection** — Supports 25+ file types (JS, TS, Python, Go, Rust, Java, etc.)
- **Symbol Extraction** — Automatically extracts functions, classes, exports from code
- **LRU Eviction** — Keeps max 50 entries, removing least-recently-read files
- **Session Injection** — Loads top 10 recently-read files for next session start
- **Cache Statistics** — Track cached file count, language distribution, symbol extraction rate

### Compaction Context Preservation (v2)

When Claude's context window compacts, deja-claude saves session state as a baton file for the next session:

- **Priority-based sections** — Session state > Modified files > Commands > File cache > Warnings
- **8KB size limit** — Low-priority sections are automatically truncated
- **Checkpoint tracking** — Records compaction history in `compact-checkpoint.json`
- **Baton fallback** — Compaction context is saved as a baton, ensuring the next session receives it via SessionStart

### Enhanced Mini Baton (v2)

Auto-generated batons at session end now include:

- Session health score and band
- File cache statistics (cached files, symbol extraction rate)
- Most accessed files with language info
- Structured JSON with health and cache metadata (v2 format)

## Health Scoring

| Condition | Penalty |
|-----------|---------|
| Over 20 tool invocations | -2 per extra invocation |
| Same file read 3+ times | -10 per file |
| Context compaction | -15 per occurrence |
| Errors beyond 3 | -5 each |

| Score Range | Band |
|-------------|------|
| 61–100 | **healthy** |
| 31–60 | **warning** |
| 0–30 | **critical** |

## Hook Integration

| Hook | Trigger | Action |
|------|---------|--------|
| **SessionStart** | Session begins | Load baton + file cache as additionalContext |
| **PostToolUse** | After Read/Write/Edit/Bash/Grep/Glob | Log event + update file cache |
| **PreCompact** | Before context compaction | Build systemMessage to preserve context |
| **Stop** | Session ends | Auto-generate mini-baton if needed |

## Runtime Data

All data is stored per-project in `.claude/deja-claude/`:

```
.claude/deja-claude/
├── session-log.jsonl        # Current session event log
├── metrics.json             # Health metrics
├── file-cache.json          # File summaries & symbols (LRU cache)
├── compact-checkpoint.json  # Compaction history
├── baton.md                 # Baton for next session
├── baton.json               # Structured baton data
└── baton-delivered-*.md     # Archived delivered batons
```

## Development

```bash
# Run tests
npm test
```

## Safety

- All logging is **silent-fail** — if logging breaks, your session is unaffected
- Auto mini-baton is generated on session end if you forget to run `/deja-claude:baton`
- Batons are archived after delivery, never deleted silently
- **No external dependencies** — pure Node.js, zero npm packages

## License

MIT
