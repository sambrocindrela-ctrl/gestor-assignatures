// src/utils/mergeSubjectsWithCsv.ts
import type { Subject } from "../types/Subject";

/**
 * Hace merge de un conjunto de filas CSV sobre las assignatures existentes,
 * usando la columna `codi` del CSV para emparejar con `subject.codi`.
 * No sobreescribe campos ya existentes en Subject.
 */
export function mergeSubjectsWithCsv(
  subjects: Subject[],
  csvRows: Record<string, string>[],
  options?: {
    csvCodeField?: string; // por defecto "codi"
  }
): Subject[] {
  const csvCodeField = options?.csvCodeField ?? "codi";

  // Índice rápido: código -> fila CSV
  const byCode = new Map<string, Record<string, string>>();
  for (const row of csvRows) {
    const code = (row[csvCodeField] ?? "").trim();
    if (!code) continue;
    // Si hay duplicados en el CSV, ganará la última
    byCode.set(code, row);
  }

  return subjects.map((subj) => {
    const row = byCode.get(subj.codi);
    if (!row) return subj;

    const merged: Subject = { ...subj };

    for (const [key, value] of Object.entries(row)) {
      if (key === csvCodeField) continue; // no necesitamos duplicar el código
      if (merged[key] !== undefined) continue; // no pisamos campos existentes

      merged[key] = value;
    }

    return merged;
  });
}
