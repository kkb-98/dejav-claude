const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("log", () => {
  let tmpDir;
  let origEnv;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deja-test-"));
    origEnv = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    delete require.cache[require.resolve("../scripts/lib/paths")];
    delete require.cache[require.resolve("../scripts/lib/log")];
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const logPath = path.join(tmpDir, ".claude", "deja-claude", "session-log.jsonl");
    if (fs.existsSync(logPath)) fs.writeFileSync(logPath, "");
  });

  it("appendLog writes JSONL entries", () => {
    const { appendLog, readLog } = require("../scripts/lib/log");
    appendLog({ tool: "Read", file: "/test.js" });
    appendLog({ tool: "Write", file: "/out.js" });

    const entries = readLog();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].tool, "Read");
    assert.equal(entries[1].tool, "Write");
  });

  it("each entry has a timestamp", () => {
    const { appendLog, readLog } = require("../scripts/lib/log");
    appendLog({ tool: "Bash", command: "ls" });

    const entries = readLog();
    assert.ok(entries[0].ts);
    assert.ok(new Date(entries[0].ts).getTime() > 0);
  });

  it("readLog returns empty array when no log file", () => {
    const logPath = path.join(tmpDir, ".claude", "deja-claude", "session-log.jsonl");
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);

    const { readLog } = require("../scripts/lib/log");
    const entries = readLog();
    assert.deepEqual(entries, []);
  });

  it("readLog skips malformed lines", () => {
    const logPath = path.join(tmpDir, ".claude", "deja-claude", "session-log.jsonl");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, '{"tool":"Read"}\nnot-json\n{"tool":"Write"}\n');

    const { readLog } = require("../scripts/lib/log");
    const entries = readLog();
    assert.equal(entries.length, 2);
  });
});
