import * as XLSX from "xlsx";
import type { Assignatura } from "../types/assignatures";

export function exportSubjectsToExcel(subjects: Assignatura[]) {
  const rows = subjects.map((s) => ({
    Programa: s.programa ?? "",
    Bloc: s.bloc_nom,
    "Codi UPC": s.codi_upc_ud,
    Sigles: s.sigles_ud,
    "Nom (cat)": s.nom,
    "Nom (cast)": s.nom_cast,
    "Name (eng)": s.nom_eng,
    Crèdits: s.credits_ects ?? "",
    Departament: s.dept,
    Centre: s.centre,
    Vigent: s.vigent,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assignatures");

  XLSX.writeFile(wb, "assignatures.xlsx");
}
