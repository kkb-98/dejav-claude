const { appendLog } = require("./lib/log");
const { updateCache } = require("./lib/file-cache");

function handleInput(raw) {
  try {
    const input = JSON.parse(raw || "{}");
    const toolName = input.tool_name || "";
    const toolInput = input.tool_input || {};

    const event = { tool: toolName };

    switch (toolName) {
      case "Read":
        event.file = toolInput.file_path || "";
        break;
      case "Write":
        event.file = toolInput.file_path || "";
        break;
      case "Edit":
        event.file = toolInput.file_path || "";
        if (toolInput.old_string) {
          event.summary = `replaced ${toolInput.old_string.length} chars`;
        }
        break;
      case "Bash": {
        const cmd = toolInput.command || "";
        event.command = cmd.length > 200 ? cmd.slice(0, 200) + "..." : cmd;
        break;
      }
      case "Grep":
        event.pattern = toolInput.pattern || "";
        break;
      case "Glob":
        event.pattern = toolInput.pattern || "";
        break;
      default:
        break;
    }

    if (input.tool_error) {
      event.error = true;
    }

    appendLog(event);

    // File cache updates (silent fail)
    try {
      if (toolName === "Read" && toolInput.file_path) {
        // tool_response is an object from Claude Code, not file content.
        // Read the file directly from disk for cache population.
        const fs = require("fs");
        if (fs.existsSync(toolInput.file_path)) {
          const content = fs.readFileSync(toolInput.file_path, "utf-8");
          if (content.length > 0) {
            updateCache(toolInput.file_path, content);
          }
        }
      } else if (toolName === "Write" && toolInput.file_path && toolInput.content) {
        updateCache(toolInput.file_path, toolInput.content);
      } else if (toolName === "Edit" && toolInput.file_path) {
        // After edit, re-read the file for updated cache
        const fs = require("fs");
        if (fs.existsSync(toolInput.file_path)) {
          const content = fs.readFileSync(toolInput.file_path, "utf-8");
          if (content.length > 0) {
            updateCache(toolInput.file_path, content);
          }
        }
      }
    } catch (_) {
      // Silent fail - cache errors must not disrupt logging
    }
  } catch (err) {
    process.stderr.write(`[deja-claude] post-tool-use: ${err.message}\n`);
  }
}

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  handleInput(Buffer.concat(chunks).toString());
  process.stdout.write("{}\n", () => { process.exitCode = 0; });
});
process.stdin.on("error", () => {
  handleInput("{}");
  process.stdout.write("{}\n", () => { process.exitCode = 0; });
});
