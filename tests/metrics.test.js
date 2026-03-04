const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("metrics", () => {
  let tmpDir;
  let origEnv;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deja-test-"));
    origEnv = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    delete require.cache[require.resolve("../scripts/lib/paths")];
    delete require.cache[require.resolve("../scripts/lib/log")];
    delete require.cache[require.resolve("../scripts/lib/metrics")];
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 100 for empty events", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const m = computeMetrics([]);
    assert.equal(m.score, 100);
    assert.equal(m.band, "healthy");
  });

  it("penalizes over 20 tool uses", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = Array.from({ length: 25 }, (_, i) => ({ tool: "Read", file: `/file${i}.js` }));
    const m = computeMetrics(events);
    // 25 - 20 = 5 extra, * 2 = 10 penalty
    assert.equal(m.score, 90);
  });

  it("penalizes repeated reads of same file", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = [
      { tool: "Read", file: "/same.js" },
      { tool: "Read", file: "/same.js" },
      { tool: "Read", file: "/same.js" },
    ];
    const m = computeMetrics(events);
    // 3 reads of same file = -10
    assert.equal(m.score, 90);
    assert.deepEqual(m.repeatedReads, { "/same.js": 3 });
  });

  it("penalizes compaction events", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = [{ type: "compaction" }, { type: "compaction" }];
    const m = computeMetrics(events);
    // 2 compactions * 15 = 30 penalty
    assert.equal(m.score, 70);
  });

  it("penalizes errors beyond 3", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = Array.from({ length: 5 }, () => ({ tool: "Bash", error: true }));
    const m = computeMetrics(events);
    // 5 errors, 2 beyond threshold, * 5 = 10 penalty
    assert.equal(m.score, 90);
  });

  it("returns warning band for score 31-60", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    // 40 tool uses = 20 extra * 2 = 40 penalty → score 60... that's healthy boundary
    // Need 41 extra → but let's be precise
    const events = Array.from({ length: 40 }, (_, i) => ({ tool: "Read", file: `/f${i}.js` }));
    // 40 tools, 20 extra * 2 = 40 penalty → 60 → warning (< 61)
    const m = computeMetrics(events);
    assert.equal(m.score, 60);
    assert.equal(m.band, "warning");
  });

  it("returns critical band for score 0-30", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    // 55 tool uses = 35 extra * 2 = 70 penalty → score 30
    const events = Array.from({ length: 55 }, (_, i) => ({ tool: "Read", file: `/f${i}.js` }));
    const m = computeMetrics(events);
    assert.equal(m.score, 30);
    assert.equal(m.band, "critical");
  });

  it("score never goes below 0", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = Array.from({ length: 200 }, (_, i) => ({ tool: "Read", file: `/f${i}.js` }));
    const m = computeMetrics(events);
    assert.ok(m.score >= 0);
  });

  it("tracks filesWritten, filesEdited, commands", () => {
    const { computeMetrics } = require("../scripts/lib/metrics");
    const events = [
      { tool: "Write", file: "/a.js" },
      { tool: "Edit", file: "/b.js" },
      { tool: "Bash", command: "npm test" },
    ];
    const m = computeMetrics(events);
    assert.deepEqual(m.filesWritten, ["/a.js"]);
    assert.deepEqual(m.filesEdited, ["/b.js"]);
    assert.deepEqual(m.commands, ["npm test"]);
  });

  it("saveMetrics writes to file", () => {
    const { saveMetrics } = require("../scripts/lib/metrics");
    const { getMetricsPath } = require("../scripts/lib/paths");
    const result = saveMetrics([]);
    assert.ok(result);
    assert.ok(fs.existsSync(getMetricsPath()));
    const saved = JSON.parse(fs.readFileSync(getMetricsPath(), "utf-8"));
    assert.equal(saved.score, 100);
  });
});
