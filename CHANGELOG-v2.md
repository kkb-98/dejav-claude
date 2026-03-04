# deja-claude v2.0.0 — 컴팩션 맥락 보존 + 파일 읽기 캐시

## 핵심 변경사항

### 1. 파일 읽기 캐시 (`scripts/lib/file-cache.js`) — 신규
- Read/Write 도구 사용 시 파일 요약을 자동 캐싱
- 확장자 기반 언어 감지 (JS/TS/Python/Go/Rust 등 25개)
- export, function, class 심볼 자동 추출
- LRU 퇴거 정책 (최대 50개 엔트리)
- 손상된 캐시 파일 → 빈 캐시로 안전 폴백

### 2. 컴팩션 맥락 보존 (`scripts/lib/compact-context.js`) — 신규
- PreCompact 시 `systemMessage`를 빌드하여 컴팩션 후에도 맥락 유지
- 우선순위 기반 섹션 조합 (P1: 상태 → P2: 수정 파일 → P3: 명령어 → P4: 캐시 → P5: 경고)
- 8KB 크기 제한 — 낮은 우선순위 섹션부터 자동 잘림
- `compact-checkpoint.json`에 체크포인트 저장

### 3. PostToolUse 파일 캐시 연동 (`scripts/post-tool-use.js`) — 수정
- Read 도구: `tool_response`에서 파일 내용 추출 → 캐시 업데이트
- Write 도구: `tool_input.content`에서 작성 내용 추출 → 캐시 업데이트
- 캐시 실패 시 silent fail (기존 로깅 기능 보호)

### 4. PreCompact systemMessage 주입 (`scripts/pre-compact.js`) — 수정
- `buildCompactionContext()`로 systemMessage 생성
- `{ continue: true, systemMessage: "..." }` 형태로 출력
- 컴팩션 후에도 시스템 컨텍스트로 살아남음

### 5. SessionStart 파일 캐시 주입 (`scripts/session-start.js`) — 수정
- `getCacheForSessionStart(10)`으로 최근 읽은 파일 10개 요약 로드
- 바톤 + 캐시를 합쳐서 `additionalContext`로 주입
- 바톤 없이 캐시만 있어도 주입 동작

### 6. 경로 추가 (`scripts/lib/paths.js`) — 수정
- `getFileCachePath()` → `.claude/deja-claude/file-cache.json`
- `getCompactCheckpointPath()` → `.claude/deja-claude/compact-checkpoint.json`

## 변경 없는 파일
- `hooks/hooks.json` — 훅 설정 변경 없음
- `scripts/lib/log.js` — 로깅 모듈 변경 없음
- `scripts/lib/metrics.js` — 메트릭 모듈 변경 없음
- `scripts/session-end.js` — 세션 종료 변경 없음

## 검증 결과 (8/8 통과)
| # | 테스트 | 결과 |
|---|--------|------|
| 1 | Read 이벤트 → file-cache.json 생성 | OK |
| 2 | PreCompact → systemMessage 필드 출력 | OK |
| 3 | SessionStart → "Previously Read Files" 포함 | OK |
| 4 | Write 이벤트 → 캐시 업데이트 (TS 심볼 추출) | OK |
| 5 | LRU 퇴거 (55개 → 50개 유지) | OK |
| 6 | 손상된 file-cache.json → 빈 캐시 폴백 | OK |
| 7 | 대량 데이터에서 systemMessage ≤ 8KB | OK (3.7KB) |
| 8 | 기존 바톤 릴레이 기능 정상 동작 | OK |
