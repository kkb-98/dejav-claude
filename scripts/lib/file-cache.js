const fs = require("fs");
const path = require("path");
const { getFileCachePath } = require("./paths");

const MAX_ENTRIES = 50;

const EXT_MAP = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".jsx": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".cs": "csharp",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".html": "html",
  ".css": "css",
  ".sh": "shell",
  ".bash": "shell",
  ".ps1": "powershell",
};

function loadCache() {
  try {
    const cachePath = getFileCachePath();
    if (!fs.existsSync(cachePath)) {
      return { version: 1, updatedAt: new Date().toISOString(), files: {} };
    }
    const data = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    if (!data.files || typeof data.files !== "object") {
      return { version: 1, updatedAt: new Date().toISOString(), files: {} };
    }
    return data;
  } catch (_) {
    return { version: 1, updatedAt: new Date().toISOString(), files: {} };
  }
}

function saveCache(cache) {
  try {
    cache.updatedAt = new Date().toISOString();
    fs.writeFileSync(getFileCachePath(), JSON.stringify(cache, null, 2));
  } catch (err) {
    process.stderr.write(`[deja-claude] file-cache save: ${err.message}\n`);
  }
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_MAP[ext] || "unknown";
}

function extractSymbols(content, language) {
  const symbols = [];

  // export/module.exports patterns
  const moduleExportsRe = /module\.exports\s*=\s*\{([^}]+)\}/g;
  let m;
  while ((m = moduleExportsRe.exec(content)) !== null) {
    m[1].split(",").forEach((s) => {
      const name = s.trim().split(/[\s:]/)[0];
      if (name && name.length > 0) symbols.push(name);
    });
  }

  const namedExportRe = /export\s+(?:const|function|class|let|var|async\s+function)\s+(\w+)/g;
  while ((m = namedExportRe.exec(content)) !== null) {
    if (!symbols.includes(m[1])) symbols.push(m[1]);
  }

  const defaultExportRe = /export\s+default\s+(?:function|class)\s+(\w+)/g;
  while ((m = defaultExportRe.exec(content)) !== null) {
    if (!symbols.includes(m[1])) symbols.push(m[1]);
  }

  // function/class declarations
  const funcRe = /^(?:async\s+)?function\s+(\w+)/gm;
  while ((m = funcRe.exec(content)) !== null) {
    if (!symbols.includes(m[1])) symbols.push(m[1]);
  }

  const classRe = /^class\s+(\w+)/gm;
  while ((m = classRe.exec(content)) !== null) {
    if (!symbols.includes(m[1])) symbols.push(m[1]);
  }

  // Python: def/class
  if (language === "python") {
    const pyDefRe = /^def\s+(\w+)/gm;
    while ((m = pyDefRe.exec(content)) !== null) {
      if (!symbols.includes(m[1])) symbols.push(m[1]);
    }
    const pyClassRe = /^class\s+(\w+)/gm;
    while ((m = pyClassRe.exec(content)) !== null) {
      if (!symbols.includes(m[1])) symbols.push(m[1]);
    }
  }

  return symbols;
}

function extractSummary(filePath, content) {
  const language = detectLanguage(filePath);
  const lines = content.split("\n");
  const lineCount = lines.length;
  const header = lines.slice(0, 5).join("\n");
  const symbols = extractSymbols(content, language);

  let summary = `${language}, ${lineCount} lines`;
  if (symbols.length > 0) {
    const symbolList = symbols.slice(0, 8).join(", ");
    summary += `. Exports: ${symbolList}`;
    if (symbols.length > 8) summary += ", ...";
  }

  return { summary, header, symbols, language, lineCount };
}

function updateCache(filePath, content) {
  try {
    const cache = loadCache();
    const now = new Date().toISOString();
    const existing = cache.files[filePath];
    const { summary, header, symbols, language, lineCount } = extractSummary(filePath, content);

    cache.files[filePath] = {
      summary,
      header,
      symbols,
      language,
      lineCount,
      readCount: existing ? existing.readCount + 1 : 1,
      lastRead: now,
      firstRead: existing ? existing.firstRead : now,
    };

    // LRU eviction if over max entries
    const keys = Object.keys(cache.files);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort(
        (a, b) => new Date(cache.files[a].lastRead) - new Date(cache.files[b].lastRead)
      );
      const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
      for (const key of toRemove) {
        delete cache.files[key];
      }
    }

    saveCache(cache);
  } catch (err) {
    process.stderr.write(`[deja-claude] file-cache update: ${err.message}\n`);
  }
}

function getCacheForCompaction(maxEntries) {
  maxEntries = maxEntries || 15;
  try {
    const cache = loadCache();
    const entries = Object.entries(cache.files);
    if (entries.length === 0) return "";

    // Sort by readCount descending
    entries.sort((a, b) => b[1].readCount - a[1].readCount);
    const top = entries.slice(0, maxEntries);

    const lines = top.map(
      ([fp, info]) => `- ${fp}: ${info.summary} (read ${info.readCount}x)`
    );
    return lines.join("\n");
  } catch (_) {
    return "";
  }
}

function getCacheForSessionStart(maxEntries) {
  maxEntries = maxEntries || 10;
  try {
    const cache = loadCache();
    const entries = Object.entries(cache.files);
    if (entries.length === 0) return "";

    // Sort by lastRead descending (most recent first)
    entries.sort((a, b) => new Date(b[1].lastRead) - new Date(a[1].lastRead));
    const top = entries.slice(0, maxEntries);

    const lines = top.map(([fp, info]) => `- ${fp}: ${info.summary}`);
    return lines.join("\n");
  } catch (_) {
    return "";
  }
}

function getCacheStats() {
  try {
    const cache = loadCache();
    const entries = Object.entries(cache.files);
    if (entries.length === 0) {
      return { totalEntries: 0, languages: {}, avgReadCount: 0, symbolRate: 0, topFiles: [] };
    }

    const languages = {};
    let totalReadCount = 0;
    let filesWithSymbols = 0;

    for (const [, info] of entries) {
      const lang = info.language || "unknown";
      languages[lang] = (languages[lang] || 0) + 1;
      totalReadCount += info.readCount || 1;
      if (info.symbols && info.symbols.length > 0) filesWithSymbols++;
    }

    const topFiles = entries
      .sort((a, b) => (b[1].readCount || 1) - (a[1].readCount || 1))
      .slice(0, 5)
      .map(([fp, info]) => ({ file: fp, readCount: info.readCount, language: info.language }));

    return {
      totalEntries: entries.length,
      languages,
      avgReadCount: Math.round((totalReadCount / entries.length) * 10) / 10,
      symbolRate: Math.round((filesWithSymbols / entries.length) * 100),
      topFiles,
    };
  } catch (_) {
    return { totalEntries: 0, languages: {}, avgReadCount: 0, symbolRate: 0, topFiles: [] };
  }
}

module.exports = {
  loadCache,
  saveCache,
  extractSummary,
  updateCache,
  getCacheForCompaction,
  getCacheForSessionStart,
  getCacheStats,
};
