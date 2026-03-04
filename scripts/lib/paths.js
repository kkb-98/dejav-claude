const path = require("path");
const fs = require("fs");

function getMementoDir() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, ".claude", "deja-claude");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSessionLogPath() {
  return path.join(getMementoDir(), "session-log.jsonl");
}

function getMetricsPath() {
  return path.join(getMementoDir(), "metrics.json");
}

function getBatonMdPath() {
  return path.join(getMementoDir(), "baton.md");
}

function getBatonJsonPath() {
  return path.join(getMementoDir(), "baton.json");
}

function getDeliveredBatonPath(timestamp) {
  const ts = timestamp || new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(getMementoDir(), `baton-delivered-${ts}.md`);
}

function getFileCachePath() {
  return path.join(getMementoDir(), "file-cache.json");
}

function getCompactCheckpointPath() {
  return path.join(getMementoDir(), "compact-checkpoint.json");
}

module.exports = {
  getMementoDir,
  getSessionLogPath,
  getMetricsPath,
  getBatonMdPath,
  getBatonJsonPath,
  getDeliveredBatonPath,
  getFileCachePath,
  getCompactCheckpointPath,
};
