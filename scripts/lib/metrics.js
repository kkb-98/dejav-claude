const fs = require("fs");
const { readLog } = require("./log");
const { getMetricsPath } = require("./paths");

function computeMetrics(events) {
  if (!events) events = readLog();

  let score = 100;
  const toolUseCount = events.filter((ev) => ev.tool).length;
  const fileReadCounts = {};
  let compactionCount = 0;
  let errorCount = 0;
  const filesWritten = new Set();
  const filesEdited = new Set();
  const commands = [];

  for (const ev of events) {
    if (ev.tool === "Read" && ev.file) {
      fileReadCounts[ev.file] = (fileReadCounts[ev.file] || 0) + 1;
    }
    if (ev.tool === "Write" && ev.file) filesWritten.add(ev.file);
    if (ev.tool === "Edit" && ev.file) filesEdited.add(ev.file);
    if (ev.tool === "Bash" && ev.command) commands.push(ev.command);
    if (ev.type === "compaction") compactionCount++;
    if (ev.error) errorCount++;
  }

  if (toolUseCount > 20) {
    score -= (toolUseCount - 20) * 2;
  }

  const repeatedReads = {};
  for (const [file, count] of Object.entries(fileReadCounts)) {
    if (count >= 3) {
      score -= 10;
      repeatedReads[file] = count;
    }
  }

  score -= compactionCount * 15;

  if (errorCount > 3) {
    score -= (errorCount - 3) * 5;
  }

  score = Math.max(0, Math.min(100, score));

  let band;
  if (score >= 61) band = "healthy";
  else if (score >= 31) band = "warning";
  else band = "critical";

  return {
    score,
    band,
    toolUseCount,
    totalEvents: events.length,
    fileReadCounts,
    repeatedReads,
    compactionCount,
    errorCount,
    filesWritten: [...filesWritten],
    filesEdited: [...filesEdited],
    commands,
    computedAt: new Date().toISOString(),
  };
}

function saveMetrics(events) {
  try {
    const metrics = computeMetrics(events);
    fs.writeFileSync(getMetricsPath(), JSON.stringify(metrics, null, 2));
    return metrics;
  } catch (err) {
    process.stderr.write(`[deja-claude] metrics: ${err.message}\n`);
    return null;
  }
}

module.exports = { computeMetrics, saveMetrics };
