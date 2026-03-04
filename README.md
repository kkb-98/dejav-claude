# deja-claude

<p align="center">
  <strong>Session relay plugin &mdash; AI never loses memory between sessions.</strong><br/>
  세션 릴레이 플러그인 &mdash; AI가 세션 간 기억을 잃지 않습니다.
</p>

<p align="center">
  <a href="#english">🇺🇸 English</a> &middot; <a href="#한국어">🇰🇷 한국어</a>
</p>

---

<details open>
<summary><h2 id="english">🇺🇸 English</h2></summary>

When a Claude Code session disconnects, all working context is lost. `CLAUDE.md` holds static rules but cannot capture "what was I doing right now?" deja-claude automatically logs session events and passes a "baton" between sessions so the next session can pick up exactly where you left off.

### How It Works

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
4. **Compaction Preservation** — Survives Claude context compaction via systemMessage injection
5. **Baton Relay** — Create a structured summary for the next session
6. **Auto-inject** — Next session automatically receives the baton + cached file summaries

### What Makes deja-claude Different?

deja-claude focuses on **automatic session event tracking and relay** — a gap that other Claude Code plugins do not cover.

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

#### How each plugin approaches "memory"

| Plugin | Focus | Approach |
|--------|-------|----------|
| **deja-claude** | "What did I **do** this session?" | Automatic/passive — tracks every tool use and relays to next session |
| **OMC** | "What do I **know** about this project?" | Intentional/active — AI decides what to save to notepad/memory |
| **bkit** | "What **process** should I follow?" | Document-based — PDCA methodology guides development phases |
| **superpowers** | "**How** should I write code?" | Skill-based — TDD, debugging, code review workflows |

#### Using together

These plugins are **complementary, not competing**. deja-claude fills the "automatic session continuity" gap:

- **deja-claude + OMC**: Auto-track session events (deja-claude) + intentionally store project knowledge (OMC)
- **deja-claude + bkit**: Auto-relay work context (deja-claude) + follow structured dev methodology (bkit)
- **deja-claude + superpowers**: Auto-preserve session state (deja-claude) + apply dev workflow skills (superpowers)

### Installation

```bash
claude plugin add /path/to/deja-claude
```

### Commands

| Command | Description |
|---------|-------------|
| `/deja-claude:baton` | Create a relay baton for the next session (`baton.md` + `baton.json`) |
| `/deja-claude:health` | Display the session health dashboard |
| `/deja-claude:forget` | Clear baton files so the next session starts fresh |

### Features

#### File Cache (v2)

Automatically caches file content summaries when Read/Write/Edit tools are used:

- **Language Detection** — Supports 25+ file types (JS, TS, Python, Go, Rust, Java, etc.)
- **Symbol Extraction** — Automatically extracts functions, classes, exports from code
- **LRU Eviction** — Keeps max 50 entries, removing least-recently-read files
- **Session Injection** — Loads top 10 recently-read files for next session start
- **Cache Statistics** — Track cached file count, language distribution, symbol extraction rate

#### Compaction Context Preservation (v2)

When Claude context window compacts, deja-claude saves session state as a baton file for the next session:

- **Priority-based sections** — Session state > Modified files > Commands > File cache > Warnings
- **8KB size limit** — Low-priority sections are automatically truncated
- **Checkpoint tracking** — Records compaction history in `compact-checkpoint.json`
- **Baton fallback** — Compaction context is saved as a baton, ensuring the next session receives it via SessionStart

#### Enhanced Mini Baton (v2)

Auto-generated batons at session end now include:

- Session health score and band
- File cache statistics (cached files, symbol extraction rate)
- Most accessed files with language info
- Structured JSON with health and cache metadata (v2 format)

### Health Scoring

| Condition | Penalty |
|-----------|---------|
| Over 20 tool invocations | -2 per extra invocation |
| Same file read 3+ times | -10 per file |
| Context compaction | -15 per occurrence |
| Errors beyond 3 | -5 each |

| Score Range | Band |
|-------------|------|
| 61-100 | **healthy** |
| 31-60 | **warning** |
| 0-30 | **critical** |

### Hook Integration

| Hook | Trigger | Action |
|------|---------|--------|
| **SessionStart** | Session begins | Load baton + file cache as additionalContext |
| **PostToolUse** | After Read/Write/Edit/Bash/Grep/Glob | Log event + update file cache |
| **PreCompact** | Before context compaction | Build systemMessage to preserve context |
| **Stop** | Session ends | Auto-generate mini-baton if needed |

### Runtime Data

All data is stored per-project in `.claude/deja-claude/`:

```
.claude/deja-claude/
├── session-log.jsonl        # Current session event log
├── metrics.json             # Health metrics
├── file-cache.json          # File summaries and symbols (LRU cache)
├── compact-checkpoint.json  # Compaction history
├── baton.md                 # Baton for next session
├── baton.json               # Structured baton data
└── baton-delivered-*.md     # Archived delivered batons
```

### Safety

- All logging is **silent-fail** — if logging breaks, your session is unaffected
- Auto mini-baton is generated on session end if you forget to run `/deja-claude:baton`
- Batons are archived after delivery, never deleted silently
- **No external dependencies** — pure Node.js, zero npm packages

</details>

---

<details>
<summary><h2 id="한국어">🇰🇷 한국어</h2></summary>

Claude Code 세션이 끊어지면 모든 작업 맥락이 사라집니다. `CLAUDE.md`는 정적 규칙을 담지만 "지금 뭘 하고 있었는지"는 저장할 수 없습니다. deja-claude는 세션 이벤트를 자동으로 기록하고 세션 간 "바톤"을 전달하여 다음 세션이 이전 작업을 이어받을 수 있게 합니다.

### 작동 방식

```
세션 A                              세션 B
┌──────────────┐                  ┌──────────────┐
│ 작업 진행     │                  │ 세션 시작     │
│ 이벤트 기록   │──── baton.md ───▶│ 바톤 로드     │
│ /baton       │    (릴레이)       │ 맥락 준비     │
│ 세션 종료     │                  │ 작업 이어가기  │
└──────────────┘                  └──────────────┘
```

1. **이벤트 로깅** — 모든 파일 읽기/쓰기/편집과 명령어를 `session-log.jsonl`에 기록
2. **파일 캐시** — 파일 요약과 심볼(함수, 클래스, export) 자동 캐싱
3. **헬스 모니터링** — 세션 건강 점수 추적 (컴팩션, 반복 읽기, 에러)
4. **컴팩션 보존** — Claude의 컨텍스트 압축 시 systemMessage 주입으로 맥락 유지
5. **바톤 릴레이** — 다음 세션을 위한 구조화된 요약 생성
6. **자동 주입** — 다음 세션 시작 시 바톤 + 파일 캐시 요약 자동 로드

### 다른 플러그인과의 차이점

deja-claude는 다른 Claude Code 플러그인이 다루지 않는 **자동 세션 이벤트 추적과 릴레이**에 특화되어 있습니다.

| 기능 | deja-claude | OMC | bkit | superpowers |
|------|:-----------:|:---:|:----:|:-----------:|
| 세션 이벤트 자동 릴레이 | **지원** | 미지원 | 미지원 | 미지원 |
| 도구 사용 이벤트 로깅 | **지원** (JSONL) | 미지원 | 미지원 | 미지원 |
| 파일 읽기 캐시 + 심볼 추출 | **지원** (LRU 50) | 미지원 | 미지원 | 미지원 |
| 컴팩션 생존 컨텍스트 | **지원** (바톤 폴백) | 미지원 | 미지원 | 미지원 |
| 세션 헬스 모니터링 | **지원** (점수 시스템) | 미지원 | 미지원 | 미지원 |
| 영구 메모/노트 저장 | 미지원 | **지원** (notepad) | 미지원 | 미지원 |
| 프로젝트 환경 자동 감지 | 미지원 | **지원** (project-memory) | 미지원 | 미지원 |
| PDCA 문서 체계 | 미지원 | 미지원 | **지원** | 미지원 |
| 개발 워크플로우 스킬 | 미지원 | 미지원 | 미지원 | **지원** |

#### 각 플러그인의 "기억" 접근 방식

| 플러그인 | 관심사 | 접근 방식 |
|----------|--------|-----------|
| **deja-claude** | "이 세션에서 **뭘 했는지**" | 자동/수동적 — 모든 도구 사용을 추적하고 다음 세션에 릴레이 |
| **OMC** | "이 프로젝트에 대해 **뭘 아는지**" | 의도적/능동적 — AI가 notepad/memory에 저장할 것을 결정 |
| **bkit** | "어떤 **절차로** 개발할 것인지" | 문서 기반 — PDCA 방법론으로 개발 단계 안내 |
| **superpowers** | "코드를 **어떻게** 작성할 것인지" | 스킬 기반 — TDD, 디버깅, 코드 리뷰 워크플로우 |

#### 함께 사용하기

이 플러그인들은 **경쟁이 아닌 상호보완** 관계입니다:

- **deja-claude + OMC**: 세션 이벤트 자동 추적 + 프로젝트 지식 의도적 저장
- **deja-claude + bkit**: 작업 맥락 자동 릴레이 + 구조화된 개발 방법론
- **deja-claude + superpowers**: 세션 상태 자동 보존 + 개발 워크플로우 스킬 적용

### 설치

```bash
claude plugin add /path/to/deja-claude
```

### 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/deja-claude:baton` | 다음 세션을 위한 릴레이 바톤 생성 (`baton.md` + `baton.json`) |
| `/deja-claude:health` | 세션 헬스 대시보드 표시 |
| `/deja-claude:forget` | 바톤 파일 삭제하여 다음 세션을 새로 시작 |

### 기능

#### 파일 캐시 (v2)

Read/Write/Edit 도구 사용 시 파일 내용 요약을 자동 캐싱합니다:

- **언어 감지** — 25개 이상의 파일 타입 지원 (JS, TS, Python, Go, Rust, Java 등)
- **심볼 추출** — 함수, 클래스, export를 코드에서 자동 추출
- **LRU 퇴거** — 최대 50개 엔트리 유지, 가장 오래 안 읽은 파일부터 제거
- **세션 주입** — 다음 세션 시작 시 최근 읽은 파일 10개 요약 로드
- **캐시 통계** — 캐시된 파일 수, 언어 분포, 심볼 추출률 추적

#### 컴팩션 컨텍스트 보존 (v2)

Claude의 컨텍스트 윈도우가 압축될 때, 세션 상태를 바톤 파일로 저장합니다:

- **우선순위 기반 섹션** — 세션 상태 > 수정 파일 > 명령어 > 파일 캐시 > 경고
- **8KB 크기 제한** — 낮은 우선순위 섹션부터 자동 잘림
- **체크포인트 추적** — `compact-checkpoint.json`에 컴팩션 이력 기록
- **바톤 폴백** — 컴팩션 컨텍스트가 바톤으로 저장되어 다음 세션에서 SessionStart로 수신

#### 향상된 미니 바톤 (v2)

세션 종료 시 자동 생성되는 바톤:

- 세션 헬스 점수와 등급
- 파일 캐시 통계 (캐시된 파일 수, 심볼 추출률)
- 가장 많이 접근한 파일과 언어 정보
- 헬스 및 캐시 메타데이터가 포함된 구조화된 JSON (v2 형식)

### 헬스 점수

| 조건 | 감점 |
|------|------|
| 20회 초과 도구 호출 | 초과 호출당 -2 |
| 같은 파일 3회 이상 읽기 | 파일당 -10 |
| 컨텍스트 컴팩션 | 발생당 -15 |
| 3회 초과 에러 | 초과 에러당 -5 |

| 점수 범위 | 등급 |
|-----------|------|
| 61-100 | **healthy** (양호) |
| 31-60 | **warning** (주의) |
| 0-30 | **critical** (위험) |

### 훅 연동

| 훅 | 트리거 | 동작 |
|----|--------|------|
| **SessionStart** | 세션 시작 | 바톤 + 파일 캐시를 additionalContext로 로드 |
| **PostToolUse** | Read/Write/Edit/Bash/Grep/Glob 사용 후 | 이벤트 기록 + 파일 캐시 업데이트 |
| **PreCompact** | 컨텍스트 컴팩션 전 | systemMessage 빌드하여 맥락 보존 |
| **Stop** | 세션 종료 | 필요 시 미니 바톤 자동 생성 |

### 런타임 데이터

모든 데이터는 프로젝트별로 `.claude/deja-claude/`에 저장됩니다:

```
.claude/deja-claude/
├── session-log.jsonl        # 현재 세션 이벤트 로그
├── metrics.json             # 헬스 메트릭
├── file-cache.json          # 파일 요약 및 심볼 (LRU 캐시)
├── compact-checkpoint.json  # 컴팩션 이력
├── baton.md                 # 다음 세션용 바톤
├── baton.json               # 구조화된 바톤 데이터
└── baton-delivered-*.md     # 전달 완료된 바톤 아카이브
```

### 안전성

- 모든 로깅은 **silent-fail** — 로깅이 깨져도 세션에 영향 없음
- `/deja-claude:baton`을 실행하지 않아도 세션 종료 시 미니 바톤 자동 생성
- 바톤은 전달 후 아카이브되며, 자동 삭제되지 않음
- **외부 의존성 없음** — 순수 Node.js, npm 패키지 제로

</details>

---

## Development

```bash
npm test
```

## License

MIT
