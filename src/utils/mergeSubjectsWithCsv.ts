// src/utils/mergeSubjectsWithCsv.ts
import type { Assignatura } from "../types/assignatures";

/**
 * Hace merge de un conjunto de filas CSV sobre las assignatures existentes,
 * usando la columna `codi` del CSV para emparejar con `subject.codi_upc_ud`.
 * No sobreescribe campos ya existentes en Assignatura.
 */
export function mergeSubjectsWithCsv(
  subjects: Assignatura[],
  csvRows: Record<string, string>[],
  options?: {
    csvCodeField?: string; // por defecto "codi"
  }
): Assignatura[] {
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
    const row = byCode.get(subj.codi_upc_ud);
    if (!row) return subj;

    const merged: Assignatura = { ...subj };

    for (const [key, value] of Object.entries(row)) {
      if (key === csvCodeField) continue; // no necesitamos duplicar el código
      // @ts-ignore - We are merging dynamic CSV fields into the object, type safety is loose here purposely
      if (merged[key] !== undefined) continue; // no pisamos campos existentes

      // @ts-ignore
      merged[key] = value;
    }

    return merged;
  });
}
