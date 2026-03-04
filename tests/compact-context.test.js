const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("compact-context", () => {
  let tmpDir;
  let origEnv;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deja-test-"));
    origEnv = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    // Clear all related module caches
    for (const key of Object.keys(require.cache)) {
      if (key.includes("deja-claude") && key.includes("scripts")) {
        delete require.cache[key];
      }
    }
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    fs.mkdirSync(dir, { recursive: true });
    // Reset session log
    fs.writeFileSync(path.join(dir, "session-log.jsonl"), "");
    // Clear caches
    const cachePath = path.join(dir, "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  });

  it("composeSystemMessage includes health info", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 85,
      band: "healthy",
      totalEvents: 10,
      compactionCount: 0,
      repeatedReads: {},
    };
    const activity = { modifiedFiles: [], commands: [] };
    const msg = composeSystemMessage(metrics, activity, "");
    assert.ok(msg.includes("85/100"));
    assert.ok(msg.includes("healthy"));
  });

  it("composeSystemMessage includes modified files", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 100, band: "healthy", totalEvents: 5,
      compactionCount: 0, repeatedReads: {},
    };
    const activity = { modifiedFiles: ["/src/app.js", "/src/utils.js"], commands: [] };
    const msg = composeSystemMessage(metrics, activity, "");
    assert.ok(msg.includes("/src/app.js"));
    assert.ok(msg.includes("/src/utils.js"));
    assert.ok(msg.includes("Modified Files"));
  });

  it("composeSystemMessage includes recent commands", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 100, band: "healthy", totalEvents: 5,
      compactionCount: 0, repeatedReads: {},
    };
    const activity = { modifiedFiles: [], commands: ["npm test", "git status"] };
    const msg = composeSystemMessage(metrics, activity, "");
    assert.ok(msg.includes("npm test"));
    assert.ok(msg.includes("git status"));
  });

  it("composeSystemMessage includes file cache summary", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 100, band: "healthy", totalEvents: 5,
      compactionCount: 0, repeatedReads: {},
    };
    const activity = { modifiedFiles: [], commands: [] };
    const cacheSummary = "- /src/app.js: javascript, 50 lines (read 3x)";
    const msg = composeSystemMessage(metrics, activity, cacheSummary);
    assert.ok(msg.includes("Previously Read Files"));
    assert.ok(msg.includes("/src/app.js"));
  });

  it("composeSystemMessage includes repeated reads warning", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 80, band: "healthy", totalEvents: 10,
      compactionCount: 0,
      repeatedReads: { "/hot.js": 5 },
    };
    const activity = { modifiedFiles: [], commands: [] };
    const msg = composeSystemMessage(metrics, activity, "");
    assert.ok(msg.includes("Repeated Reads Warning"));
    assert.ok(msg.includes("/hot.js"));
    assert.ok(msg.includes("5 times"));
  });

  it("composeSystemMessage respects 8KB limit", () => {
    const { composeSystemMessage } = require("../scripts/lib/compact-context");
    const metrics = {
      score: 50, band: "warning", totalEvents: 100,
      compactionCount: 3, repeatedReads: {},
    };
    // Generate large activity
    const activity = {
      modifiedFiles: Array.from({ length: 100 }, (_, i) => `/path/to/very/long/file-name-${i}.js`),
      commands: Array.from({ length: 50 }, (_, i) => `very-long-command-${i} --with-many-flags --and-arguments`),
    };
    const cacheSummary = Array.from({ length: 100 }, (_, i) =>
      `- /cached/file-${i}.js: javascript, ${i * 10} lines (read ${i}x)`
    ).join("\n");

    const msg = composeSystemMessage(metrics, activity, cacheSummary);
    assert.ok(Buffer.byteLength(msg, "utf-8") <= 8 * 1024);
  });

  it("saveCheckpoint writes checkpoint file", () => {
    const { saveCheckpoint } = require("../scripts/lib/compact-context");
    const { getCompactCheckpointPath } = require("../scripts/lib/paths");

    saveCheckpoint({ compactedAt: "2025-01-01", score: 85, band: "healthy" });

    const data = JSON.parse(fs.readFileSync(getCompactCheckpointPath(), "utf-8"));
    assert.equal(data.score, 85);
    assert.equal(data.band, "healthy");
  });

  it("buildCompactionContext returns systemMessage and checkpoint", () => {
    const { buildCompactionContext } = require("../scripts/lib/compact-context");
    const { appendLog } = require("../scripts/lib/log");

    appendLog({ tool: "Read", file: "/test.js" });
    appendLog({ tool: "Write", file: "/out.js" });

    const result = buildCompactionContext();
    assert.ok(result.systemMessage);
    assert.ok(result.systemMessage.includes("deja-claude"));
    assert.ok(result.checkpoint);
    assert.ok(result.checkpoint.compactedAt);
  });
});
