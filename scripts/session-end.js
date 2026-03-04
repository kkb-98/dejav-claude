const fs = require("fs");
const { readLog } = require("./lib/log");
const { saveMetrics, computeMetrics } = require("./lib/metrics");
const { getBatonMdPath, getBatonJsonPath } = require("./lib/paths");
const { getCacheStats } = require("./lib/file-cache");
const { extractActivity } = require("./lib/activity");

function main() {
  try {
    const events = readLog();
    const metrics = saveMetrics(events) || computeMetrics(events);

    const batonPath = getBatonMdPath();
    if (!fs.existsSync(batonPath) && events.length >= 5) {
      const activity = extractActivity(events);
      const cacheStats = getCacheStats();
      fs.writeFileSync(batonPath, generateMiniBaton(events, activity, metrics, cacheStats));
      fs.writeFileSync(
        getBatonJsonPath(),
        JSON.stringify(generateMiniBatonJson(events, activity, metrics, cacheStats), null, 2)
      );
    }
  } catch (err) {
    process.stderr.write(`[deja-claude] session-end: ${err.message}\n`);
  }
}

function generateMiniBaton(events, activity, metrics, cacheStats) {
  const { filesRead, filesWritten, filesEdited, commands } = activity;

  const lines = [
    "# Auto-generated Mini Baton",
    "",
    `> Generated automatically at session end (${new Date().toISOString()})`,
    "> This is a safety-net baton. For better context, use /deja-claude:baton before ending a session.",
    "",
    "## Session Health",
    "",
    `- **Score**: ${metrics.score}/100 (${metrics.band})`,
    `- **Events logged**: ${events.length}`,
    `- **Compactions**: ${metrics.compactionCount}`,
    `- **Errors**: ${metrics.errorCount}`,
    "",
    "## Session Activity Summary",
    "",
    `- **Files read**: ${filesRead.size}`,
    `- **Files written**: ${filesWritten.size}`,
    `- **Files edited**: ${filesEdited.size}`,
    `- **Commands run**: ${commands.length}`,
    "",
  ];

  if (filesWritten.size > 0 || filesEdited.size > 0) {
    lines.push("## Key Files Modified", "");
    for (const f of filesWritten) lines.push(`- (created) ${f}`);
    for (const f of filesEdited) lines.push(`- (edited) ${f}`);
    lines.push("");
  }

  if (commands.length > 0) {
    lines.push("## Recent Commands", "", "```");
    const recent = commands.slice(-5);
    for (const cmd of recent) lines.push(cmd);
    lines.push("```", "");
  }

  if (cacheStats && cacheStats.totalEntries > 0) {
    lines.push("## File Cache Summary", "");
    lines.push(`- **Cached files**: ${cacheStats.totalEntries}`);
    lines.push(`- **Symbol extraction rate**: ${cacheStats.symbolRate}%`);
    lines.push(`- **Avg read count**: ${cacheStats.avgReadCount}`);
    if (cacheStats.topFiles.length > 0) {
      lines.push("- **Most accessed**:");
      for (const f of cacheStats.topFiles) {
        lines.push(`  - ${f.file} (${f.language}, read ${f.readCount}x)`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function generateMiniBatonJson(events, activity, metrics, cacheStats) {
  const { filesRead, filesWritten, filesEdited, commands } = activity;

  return {
    version: 2,
    type: "auto",
    createdAt: new Date().toISOString(),
    health: {
      score: metrics.score,
      band: metrics.band,
      compactionCount: metrics.compactionCount,
      errorCount: metrics.errorCount,
    },
    eventCount: events.length,
    filesRead: [...filesRead],
    filesWritten: [...filesWritten],
    filesEdited: [...filesEdited],
    commands: commands.slice(-5),
    cacheStats: cacheStats ? {
      totalEntries: cacheStats.totalEntries,
      symbolRate: cacheStats.symbolRate,
      avgReadCount: cacheStats.avgReadCount,
      languages: cacheStats.languages,
    } : null,
  };
}

main();
