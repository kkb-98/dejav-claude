const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

describe("file-cache", () => {
  let tmpDir;
  let origEnv;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deja-test-"));
    origEnv = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    delete require.cache[require.resolve("../scripts/lib/paths")];
    delete require.cache[require.resolve("../scripts/lib/file-cache")];
  });

  after(() => {
    process.env.CLAUDE_PROJECT_DIR = origEnv || "";
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  });

  it("loadCache returns empty cache when no file exists", () => {
    const { loadCache } = require("../scripts/lib/file-cache");
    const cache = loadCache();
    assert.equal(cache.version, 1);
    assert.deepEqual(cache.files, {});
  });

  it("loadCache recovers from corrupted file", () => {
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, "not-json{{{");

    const { loadCache } = require("../scripts/lib/file-cache");
    const cache = loadCache();
    assert.deepEqual(cache.files, {});
  });

  it("extractSummary detects language and extracts symbols", () => {
    const { extractSummary } = require("../scripts/lib/file-cache");
    const content = `
function hello() {}
class World {}
module.exports = { hello, World };
`;
    const result = extractSummary("/test.js", content);
    assert.equal(result.language, "javascript");
    assert.ok(result.symbols.includes("hello"));
    assert.ok(result.symbols.includes("World"));
    assert.ok(result.lineCount > 0);
  });

  it("extractSummary handles TypeScript exports", () => {
    const { extractSummary } = require("../scripts/lib/file-cache");
    const content = `
export const API_URL = "https://api.example.com";
export function fetchData() {}
export class Service {}
export default class Main {}
`;
    const result = extractSummary("/app.ts", content);
    assert.equal(result.language, "typescript");
    assert.ok(result.symbols.includes("API_URL"));
    assert.ok(result.symbols.includes("fetchData"));
    assert.ok(result.symbols.includes("Service"));
    assert.ok(result.symbols.includes("Main"));
  });

  it("extractSummary handles Python", () => {
    const { extractSummary } = require("../scripts/lib/file-cache");
    const content = `
def greet(name):
    return f"Hello {name}"

class UserService:
    pass
`;
    const result = extractSummary("/app.py", content);
    assert.equal(result.language, "python");
    assert.ok(result.symbols.includes("greet"));
    assert.ok(result.symbols.includes("UserService"));
  });

  it("updateCache adds file to cache", () => {
    const { updateCache, loadCache } = require("../scripts/lib/file-cache");
    updateCache("/test.js", 'function foo() {}\nmodule.exports = { foo };');

    const cache = loadCache();
    assert.ok(cache.files["/test.js"]);
    assert.equal(cache.files["/test.js"].readCount, 1);
    assert.equal(cache.files["/test.js"].language, "javascript");
  });

  it("updateCache increments readCount on re-read", () => {
    const { updateCache, loadCache } = require("../scripts/lib/file-cache");
    updateCache("/counter.js", "const x = 1;");
    updateCache("/counter.js", "const x = 1;");
    updateCache("/counter.js", "const x = 1;");

    const cache = loadCache();
    assert.equal(cache.files["/counter.js"].readCount, 3);
  });

  it("LRU eviction keeps max 50 entries", () => {
    const { updateCache, loadCache } = require("../scripts/lib/file-cache");
    // Add 55 entries
    for (let i = 0; i < 55; i++) {
      updateCache(`/file-${i}.js`, `const x${i} = ${i};`);
    }

    const cache = loadCache();
    const count = Object.keys(cache.files).length;
    assert.ok(count <= 50, `Expected <= 50 entries, got ${count}`);
  });

  it("getCacheForCompaction returns top files by readCount", () => {
    const { updateCache, getCacheForCompaction } = require("../scripts/lib/file-cache");
    // Clear cache
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

    updateCache("/hot.js", "const hot = 1;");
    updateCache("/hot.js", "const hot = 1;");
    updateCache("/hot.js", "const hot = 1;");
    updateCache("/cold.js", "const cold = 1;");

    const result = getCacheForCompaction(5);
    assert.ok(result.includes("/hot.js"));
    assert.ok(result.includes("read 3x"));
  });

  it("getCacheForSessionStart returns most recent files", () => {
    const { updateCache, getCacheForSessionStart } = require("../scripts/lib/file-cache");
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

    updateCache("/old.js", "const old = 1;");
    updateCache("/new.js", "const fresh = 1;");

    const result = getCacheForSessionStart(5);
    assert.ok(result.includes("/new.js"));
    assert.ok(result.includes("/old.js"));
  });

  it("getCacheStats returns statistics", () => {
    const { updateCache, getCacheStats } = require("../scripts/lib/file-cache");
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

    updateCache("/a.js", 'function a() {}\nmodule.exports = { a };');
    updateCache("/b.py", "def b(): pass");
    updateCache("/c.ts", "export const c = 1;");

    const stats = getCacheStats();
    assert.equal(stats.totalEntries, 3);
    assert.ok(stats.languages["javascript"] >= 1);
    assert.ok(stats.languages["python"] >= 1);
    assert.ok(stats.languages["typescript"] >= 1);
    assert.ok(stats.avgReadCount >= 1);
    assert.ok(stats.symbolRate >= 0);
    assert.ok(stats.topFiles.length > 0);
  });

  it("getCacheStats handles empty cache", () => {
    const { getCacheStats } = require("../scripts/lib/file-cache");
    const cachePath = path.join(tmpDir, ".claude", "deja-claude", "file-cache.json");
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

    const stats = getCacheStats();
    assert.equal(stats.totalEntries, 0);
    assert.deepEqual(stats.languages, {});
  });
});
