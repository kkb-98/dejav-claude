const fs = require("fs");
const { appendLog } = require("./lib/log");
const { saveMetrics } = require("./lib/metrics");
const { buildCompactionContext } = require("./lib/compact-context");
const { getBatonMdPath } = require("./lib/paths");

function main() {
  try {
    appendLog({ type: "compaction" });
    saveMetrics();

    const { systemMessage } = buildCompactionContext();

    // PreCompact is a side-effect-only hook in Claude Code.
    // systemMessage injection via stdout is NOT supported.
    // Instead, save compaction context as a baton so it survives
    // both compaction (on disk) and session restart (loaded by session-start).
    const batonPath = getBatonMdPath();
    if (!fs.existsSync(batonPath)) {
      fs.writeFileSync(batonPath, systemMessage);
    }

    console.log(JSON.stringify({}));
  } catch (err) {
    process.stderr.write(`[deja-claude] pre-compact: ${err.message}\n`);
    console.log(JSON.stringify({}));
  }
}

main();
