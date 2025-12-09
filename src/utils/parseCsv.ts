// src/utils/parseCsv.ts

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parser de CSV molt simple.
 * Per defecte assumeix separador ';' (com els CSV que fas servir sovint).
 */
export function parseCsv(
  text: string,
  delimiter: string = ";"
): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Si no hi ha línies, retornem buit
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const firstLine = lines[0] ?? "";
  if (!firstLine) {
    return { headers: [], rows: [] };
  }

  const headers = firstLine.split(delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line) continue;

    const cols = line.split(delimiter);
    const row: Record<string, string> = {};

    headers.forEach((h, idx) => {
      row[h] = cols[idx]?.trim() ?? "";
    });

    // només afegim files que no estiguin totalment buides
    const allEmpty = Object.values(row).every((v) => v === "");
    if (!allEmpty) {
      rows.push(row);
    }
  }

  return { headers, rows };
}
