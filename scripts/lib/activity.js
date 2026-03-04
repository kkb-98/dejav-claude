/**
 * Shared activity extraction from session events.
 * Used by both compact-context.js and session-end.js.
 */
function extractActivity(events) {
  const filesRead = new Set();
  const filesWritten = new Set();
  const filesEdited = new Set();
  const commands = [];

  for (const ev of events) {
    if (ev.tool === "Read" && ev.file) filesRead.add(ev.file);
    if (ev.tool === "Write" && ev.file) filesWritten.add(ev.file);
    if (ev.tool === "Edit" && ev.file) filesEdited.add(ev.file);
    if (ev.tool === "Bash" && ev.command) commands.push(ev.command);
  }

  return { filesRead, filesWritten, filesEdited, commands };
}

module.exports = { extractActivity };
