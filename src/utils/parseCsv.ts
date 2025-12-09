// src/utils/parseCsv.ts

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parser sencillo de CSV:
 * - Detecta automáticamente si el separador es ";" o ","
 * - Devuelve cabeceras y filas como objetos { cabecera: valor }
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const first = lines[0];

  const countComma = (first.match(/,/g) || []).length;
  const countSemi = (first.match(/;/g) || []).length;
  const delimiter = countSemi > countComma ? ";" : ",";

  const headers = first.split(delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(delimiter);
    const row: Record<string, string> = {};

    headers.forEach((h, idx) => {
      row[h] = (parts[idx] ?? "").trim();
    });

    rows.push(row);
  }

  return { headers, rows };
}
