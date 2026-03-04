const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("session-end (mini baton generation)", () => {
  let tmpDir;
  let origEnv;
  let sessionEndPath;

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

    sessionEndPath = require.resolve("../scripts/session-end");
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    fs.mkdirSync(dir, { recursive: true });
    // Clear files
    for (const f of ["session-log.jsonl", "baton.md", "baton.json", "metrics.json", "file-cache.json"]) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    fs.writeFileSync(path.join(dir, "session-log.jsonl"), "");
  });

  it("generates mini baton when >= 5 events and no manual baton", () => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    const logPath = path.join(dir, "session-log.jsonl");

    // Write 6 events to log
    const events = [];
    for (let i = 0; i < 6; i++) {
      events.push(JSON.stringify({ ts: new Date().toISOString(), tool: "Read", file: `/file${i}.js` }));
    }
    fs.writeFileSync(logPath, events.join("\n") + "\n");

    // Run session-end via child_process to avoid process.exit
    const { execFileSync } = require("child_process");
    execFileSync("node", ["-e", `
      process.exit = function() {};
      process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(tmpDir)};
      require(${JSON.stringify(sessionEndPath)});
    `], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir } });

    const batonMd = path.join(dir, "baton.md");
    const batonJson = path.join(dir, "baton.json");
    assert.ok(fs.existsSync(batonMd), "baton.md should be created");
    assert.ok(fs.existsSync(batonJson), "baton.json should be created");

    const mdContent = fs.readFileSync(batonMd, "utf-8");
    assert.ok(mdContent.includes("Auto-generated Mini Baton"));
    assert.ok(mdContent.includes("Session Health"));
    assert.ok(mdContent.includes("/100"));

    const jsonContent = JSON.parse(fs.readFileSync(batonJson, "utf-8"));
    assert.equal(jsonContent.version, 2);
    assert.equal(jsonContent.type, "auto");
    assert.ok(jsonContent.health);
    assert.ok(typeof jsonContent.health.score === "number");
  });

  it("does not overwrite existing manual baton", () => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    const logPath = path.join(dir, "session-log.jsonl");
    const batonPath = path.join(dir, "baton.md");

    // Write manual baton
    fs.writeFileSync(batonPath, "# Manual Baton\nThis is a manual baton.");

    // Write 10 events
    const events = [];
    for (let i = 0; i < 10; i++) {
      events.push(JSON.stringify({ ts: new Date().toISOString(), tool: "Read", file: `/file${i}.js` }));
    }
    fs.writeFileSync(logPath, events.join("\n") + "\n");

    const { execFileSync } = require("child_process");
    execFileSync("node", ["-e", `
      process.exit = function() {};
      process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(tmpDir)};
      require(${JSON.stringify(sessionEndPath)});
    `], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir } });

    const content = fs.readFileSync(batonPath, "utf-8");
    assert.ok(content.includes("Manual Baton"), "Manual baton should not be overwritten");
  });

  it("does not generate baton with fewer than 5 events", () => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    const logPath = path.join(dir, "session-log.jsonl");

    // Write only 3 events
    const events = [];
    for (let i = 0; i < 3; i++) {
      events.push(JSON.stringify({ ts: new Date().toISOString(), tool: "Read", file: `/file${i}.js` }));
    }
    fs.writeFileSync(logPath, events.join("\n") + "\n");

    const { execFileSync } = require("child_process");
    execFileSync("node", ["-e", `
      process.exit = function() {};
      process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(tmpDir)};
      require(${JSON.stringify(sessionEndPath)});
    `], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir } });

    const batonPath = path.join(dir, "baton.md");
    assert.ok(!fs.existsSync(batonPath), "baton.md should NOT be created with < 5 events");
  });

  it("mini baton includes modified files", () => {
    const dir = path.join(tmpDir, ".claude", "deja-claude");
    const logPath = path.join(dir, "session-log.jsonl");

    const events = [
      { ts: new Date().toISOString(), tool: "Read", file: "/src/app.js" },
      { ts: new Date().toISOString(), tool: "Write", file: "/src/new.js" },
      { ts: new Date().toISOString(), tool: "Edit", file: "/src/app.js" },
      { ts: new Date().toISOString(), tool: "Bash", command: "npm test" },
      { ts: new Date().toISOString(), tool: "Read", file: "/package.json" },
      { ts: new Date().toISOString(), tool: "Bash", command: "git status" },
    ];
    fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");

    const { execFileSync } = require("child_process");
    execFileSync("node", ["-e", `
      process.exit = function() {};
      process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(tmpDir)};
      require(${JSON.stringify(sessionEndPath)});
    `], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir } });

    const mdContent = fs.readFileSync(path.join(dir, "baton.md"), "utf-8");
    assert.ok(mdContent.includes("/src/new.js"));
    assert.ok(mdContent.includes("/src/app.js"));
    assert.ok(mdContent.includes("npm test"));
  });
});
