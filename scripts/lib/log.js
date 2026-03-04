const fs = require("fs");
const { getSessionLogPath } = require("./paths");

function appendLog(event) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      ...event,
    };
    fs.appendFileSync(getSessionLogPath(), JSON.stringify(entry) + "\n");
  } catch (err) {
    process.stderr.write(`[deja-claude] log append: ${err.message}\n`);
  }
}

function readLog() {
  try {
    const logPath = getSessionLogPath();
    if (!fs.existsSync(logPath)) return [];
    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    return lines
      .filter((l) => l.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    process.stderr.write(`[deja-claude] log read: ${err.message}\n`);
    return [];
  }
}

module.exports = { appendLog, readLog };
