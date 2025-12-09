// src/utils/exportToExcel.ts
import * as XLSX from "xlsx";
import type { Subject } from "../types/Subject";

export function exportSubjectsToExcel(subjects: Subject[]) {
  const rows = subjects.map((s) => ({
    Programa: s.programa ?? "",
    Bloc: s.blocNom,
    "Codi UPC": s.codi,
    Sigles: s.sigles,
    "Nom (cat)": s.nom_cat,
    "Nom (cast)": s.nom_cast,
    "Name (eng)": s.nom_eng,
    Crèdits: s.credits ?? "",
    Departament: s.dept,
    Centre: s.centre,
    Vigent: s.vigent,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assignatures");

  XLSX.writeFile(wb, "assignatures.xlsx");
}
