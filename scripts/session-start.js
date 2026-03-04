const fs = require("fs");
const {
  getBatonMdPath,
  getDeliveredBatonPath,
  getSessionLogPath,
  getMementoDir,
} = require("./lib/paths");
const { getCacheForSessionStart } = require("./lib/file-cache");

function main() {
  try {
    const batonPath = getBatonMdPath();
    const result = {};

    const logPath = getSessionLogPath();
    if (fs.existsSync(logPath)) {
      const existing = fs.readFileSync(logPath, "utf-8").trim();
      if (existing.length > 0) {
        try {
          const { saveMetrics } = require("./lib/metrics");
          saveMetrics();
        } catch (e) {
          process.stderr.write(`[deja-claude] startup metrics: ${e.message}\n`);
        }
      }
    }

    let batonContent = "";
    if (fs.existsSync(batonPath)) {
      const archivePath = getDeliveredBatonPath();
      try {
        batonContent = fs.readFileSync(batonPath, "utf-8");
        fs.renameSync(batonPath, archivePath);
      } catch (e) {
        process.stderr.write(`[deja-claude] baton delivery: ${e.message}\n`);
      }
    }

    // Build additionalContext from baton + file cache
    let fileCacheSection = "";
    try {
      const cacheSummary = getCacheForSessionStart(10);
      if (cacheSummary) {
        fileCacheSection =
          "\n\n# Previously Read Files\n\n" +
          "The following files were read in prior sessions.\n" +
          "You do not need to re-read them unless you need updated content.\n\n" +
          cacheSummary;
      }
    } catch (_) {
      // Silent fail
    }

    const hasBaton = batonContent.trim().length > 0;
    const hasCache = fileCacheSection.length > 0;

    if (hasBaton || hasCache) {
      let context = "";
      if (hasBaton) {
        context += "# Baton from Previous Session\n\n" + batonContent;
      }
      if (hasCache) {
        context += fileCacheSection;
      }

      result.hookSpecificOutput = {
        hookEventName: "SessionStart",
        additionalContext: context,
      };
    }

    getMementoDir();

    // Protect against data loss: if no baton was found but old log has events,
    // generate a mini-baton from the old log before truncating
    if (!batonContent && fs.existsSync(logPath)) {
      try {
        const oldLog = fs.readFileSync(logPath, "utf-8").trim();
        if (oldLog.length > 0) {
          const lines = oldLog.split("\n").filter((l) => l.length > 0);
          if (lines.length >= 5) {
            const batonRecoveryPath = getBatonMdPath().replace("baton.md", "baton-recovered.md");
            fs.writeFileSync(
              batonRecoveryPath,
              `# Recovered Session Log\n\n> ${lines.length} events from previous session (no baton was created).\n`
            );
          }
        }
      } catch (_) {
        // Silent fail — recovery is best-effort
      }
    }

    fs.writeFileSync(getSessionLogPath(), "");

    const { appendLog } = require("./lib/log");
    appendLog({ type: "session_start" });

    console.log(JSON.stringify(result));
  } catch (err) {
    process.stderr.write(`[deja-claude] session-start: ${err.message}\n`);
    console.log(JSON.stringify({}));
  }
}

main();
