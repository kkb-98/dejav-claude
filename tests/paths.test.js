const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("paths", () => {
  let tmpDir;
  let origEnv;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deja-test-"));
    origEnv = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    // Clear require cache so paths.js picks up new env
    delete require.cache[require.resolve("../scripts/lib/paths")];
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("getMementoDir creates .claude/deja-claude directory", () => {
    const { getMementoDir } = require("../scripts/lib/paths");
    const dir = getMementoDir();
    assert.ok(fs.existsSync(dir));
    assert.ok(dir.endsWith(path.join(".claude", "deja-claude")));
  });

  it("getSessionLogPath returns correct path", () => {
    const { getSessionLogPath } = require("../scripts/lib/paths");
    const p = getSessionLogPath();
    assert.ok(p.endsWith("session-log.jsonl"));
  });

  it("getMetricsPath returns correct path", () => {
    const { getMetricsPath } = require("../scripts/lib/paths");
    const p = getMetricsPath();
    assert.ok(p.endsWith("metrics.json"));
  });

  it("getBatonMdPath returns correct path", () => {
    const { getBatonMdPath } = require("../scripts/lib/paths");
    const p = getBatonMdPath();
    assert.ok(p.endsWith("baton.md"));
  });

  it("getBatonJsonPath returns correct path", () => {
    const { getBatonJsonPath } = require("../scripts/lib/paths");
    const p = getBatonJsonPath();
    assert.ok(p.endsWith("baton.json"));
  });

  it("getDeliveredBatonPath includes timestamp", () => {
    const { getDeliveredBatonPath } = require("../scripts/lib/paths");
    const p = getDeliveredBatonPath("2025-01-01T00-00-00");
    assert.ok(p.includes("baton-delivered-2025-01-01T00-00-00.md"));
  });

  it("getFileCachePath returns correct path", () => {
    const { getFileCachePath } = require("../scripts/lib/paths");
    const p = getFileCachePath();
    assert.ok(p.endsWith("file-cache.json"));
  });

  it("getCompactCheckpointPath returns correct path", () => {
    const { getCompactCheckpointPath } = require("../scripts/lib/paths");
    const p = getCompactCheckpointPath();
    assert.ok(p.endsWith("compact-checkpoint.json"));
  });
});
