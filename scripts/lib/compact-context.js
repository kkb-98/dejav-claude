const fs = require("fs");
const { readLog } = require("./log");
const { computeMetrics } = require("./metrics");
const { getCacheForCompaction } = require("./file-cache");
const { getCompactCheckpointPath } = require("./paths");
const { extractActivity } = require("./activity");

const MAX_SYSTEM_MESSAGE_BYTES = 8 * 1024;

function buildCompactionContext() {
  const events = readLog();
  const metrics = computeMetrics(events);

  const rawActivity = extractActivity(events);
  const activity = {
    modifiedFiles: [...rawActivity.filesWritten, ...rawActivity.filesEdited],
    commands: rawActivity.commands.slice(-5),
  };
  const fileCacheSummary = getCacheForCompaction(15);

  const systemMessage = composeSystemMessage(metrics, activity, fileCacheSummary);

  const checkpoint = {
    compactedAt: new Date().toISOString(),
    score: metrics.score,
    band: metrics.band,
    totalEvents: metrics.totalEvents,
    compactionCount: metrics.compactionCount,
  };
  saveCheckpoint(checkpoint);

  return { systemMessage, checkpoint };
}

function composeSystemMessage(metrics, activity, fileCacheSummary) {
  const sections = [];

  // P1: Session state header
  sections.push({
    priority: 1,
    content:
      `# deja-claude: Post-Compaction Context\n\n` +
      `Health: ${metrics.score}/100 (${metrics.band}), ` +
      `Events: ${metrics.totalEvents}, ` +
      `Compactions: ${metrics.compactionCount}`,
  });

  // P2: Modified files
  if (activity.modifiedFiles.length > 0) {
    sections.push({
      priority: 2,
      content:
        `\n\n## Modified Files\n\n` +
        activity.modifiedFiles.map((f) => `- ${f}`).join("\n"),
    });
  }

  // P3: Recent commands
  if (activity.commands.length > 0) {
    sections.push({
      priority: 3,
      content:
        `\n\n## Recent Commands\n\n` +
        activity.commands.map((c) => `- \`${c}\``).join("\n"),
    });
  }

  // P4: File cache summary
  if (fileCacheSummary) {
    sections.push({
      priority: 4,
      content:
        `\n\n## Previously Read Files (top by frequency)\n\n` +
        `You do not need to re-read these unless you need updated content.\n\n` +
        fileCacheSummary,
    });
  }

  // P5: Repeated reads warning
  if (Object.keys(metrics.repeatedReads).length > 0) {
    const warnings = Object.entries(metrics.repeatedReads)
      .map(([f, c]) => `- ${f}: read ${c} times`)
      .join("\n");
    sections.push({
      priority: 5,
      content:
        `\n\n## Repeated Reads Warning\n\n` +
        `These files were read multiple times this session:\n\n` +
        warnings,
    });
  }

  // Assemble with priority-based truncation
  sections.sort((a, b) => a.priority - b.priority);

  let message = "";
  for (const section of sections) {
    const candidate = message + section.content;
    if (Buffer.byteLength(candidate, "utf-8") > MAX_SYSTEM_MESSAGE_BYTES) {
      break;
    }
    message = candidate;
  }

  return message;
}

function saveCheckpoint(checkpoint) {
  try {
    fs.writeFileSync(
      getCompactCheckpointPath(),
      JSON.stringify(checkpoint, null, 2)
    );
  } catch (err) {
    process.stderr.write(`[deja-claude] checkpoint save: ${err.message}\n`);
  }
}

module.exports = { buildCompactionContext, composeSystemMessage, saveCheckpoint };
