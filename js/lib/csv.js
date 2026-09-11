// Minimal delimited-text parser (comma, tab or semicolon - auto-detected)
// supporting quoted fields, good enough for spreadsheet/league-website
// exports. Plus a few loose normalizers for the messy formats those exports
// tend to use for dates, times and home/away.

function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

export function parseDelimited(text) {
  const delim = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, ...body] = rows;
  return {
    headers: headers.map((h) => h.trim()),
    rows: body.filter((r) => r.some((v) => (v || "").trim() !== "")),
  };
}

// "20/09/2026", "2026-09-20", "20-09-2026" -> "2026-09-20". Slash/dash dates
// are read as DD/MM/YYYY (UK-style), since that's what a UK club's league
// site will export.
export function normalizeDate(raw) {
  if (!raw) return "";
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return "";
}

// "10:30", "10:30am", "2:15 PM" -> "10:30" / "14:15"
export function normalizeTime(raw) {
  if (!raw) return "";
  const s = raw.trim();
  let m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  m = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return `${String(h).padStart(2, "0")}:${m[2]}`;
  }
  return "";
}

// "H", "Home", "away", "A" -> 'home' | 'away'
export function normalizeHomeAway(raw) {
  const s = (raw || "").trim().toLowerCase();
  return s.startsWith("a") ? "away" : "home";
}
