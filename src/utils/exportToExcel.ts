import XLSX from "xlsx-js-style";
import type { Assignatura } from "../types/assignatures";
import { getProgramName } from "./programNames";

export function exportSubjectsToExcel(
  subjects: Assignatura[],
  highlightIds?: Set<string>
) {
  // 1. Calcular headers dinàmics (Similar a SubjectsTable)
  const programMaxBlocks: Record<string, number> = {};
  for (const a of subjects) {
    if (!a.groups || a.groups.length === 0) continue;
    const countByProg: Record<string, number> = {};
    for (const g of a.groups) {
      const p = g.programa || "Altres";
      countByProg[p] = (countByProg[p] || 0) + 1;
    }
    for (const [prog, count] of Object.entries(countByProg)) {
      if (!programMaxBlocks[prog] || count > programMaxBlocks[prog]) {
        programMaxBlocks[prog] = count;
      }
    }
  }
  const sortedPrograms = Object.keys(programMaxBlocks).sort();

  // 2. Construir Data
  const rows = subjects.map((s) => {
    const row: any = {
      "Codi UPC": s.codi_upc_ud,
      Sigles: s.sigles_ud,
      "Nom (cat)": s.nom,
      "Nom (cast)": s.nom_cast,
      "Name (eng)": s.nom_eng,
      Crèdits: s.credits_ects ?? "",
      Departament: s.dept,
      Centre: s.centre,
      // Dynamic columns follow
    };

    // Columns dinàmiques
    for (const prog of sortedPrograms) {
      const max = programMaxBlocks[prog] || 0;
      // Filtrar grups d'aquest programa per aquesta assignatura
      const groups = s.groups?.filter(g => (g.programa || "Altres") === prog) || [];

      for (let i = 0; i < max; i++) {
        const blockName = groups[i]?.bloc_nom || "";
        // Header format: "MET - Bloc 1" instead of "Prog 948 -..."
        const pName = getProgramName(prog);
        row[`${pName} - Bloc ${i + 1}`] = blockName;
      }
    }

    row["Vigent"] = s.vigent;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Apply styles if we have highlights
  if (highlightIds && highlightIds.size > 0) {
    // Determine the range
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    // Iterate rows (skip header, so start at R=1)
    for (let R = 1; R <= range.e.r; ++R) {
      // Find the code for this row. Order matches `subjects` array (R-1 index).
      // Safest is to rely on index since map preserves order
      const subjectCode = subjects[R - 1]?.codi_upc_ud;

      if (subjectCode && highlightIds.has(subjectCode)) {
        // Apply style to all columns in this row
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cell_ref]) continue;

          ws[cell_ref].s = {
            fill: {
              fgColor: { rgb: "E0F7FA" } // Light Blue
            }
          };
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assignatures");

  XLSX.writeFile(wb, "assignatures.xlsx");
}
