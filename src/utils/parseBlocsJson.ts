// src/utils/parseBlocsJson.ts
import type { Assignatura } from "../types/assignatures";

interface RawUd {
  codi_upc_ud?: string;
  sigles_ud?: string;
  nom?: string;
  nom_cast?: string;
  nom_eng?: string;
  vigent?: string;
  dept?: string;
  credits_ects?: number;
  centre?: string;
  // Fallback properties from original Subject type logic
  codi_ud?: string;
  codi?: string;
  sigles?: string;
  acronim?: string;
}

interface RawBloc {
  id?: number;
  nom?: string;
  programa?: number;
  visibilitat?: string;
  unitats_docents?: RawUd[];
}

export function parseBlocsJson(raw: unknown): Assignatura[] {
  if (!Array.isArray(raw)) {
    console.warn("El JSON raíz no es un array de blocs");
    return [];
  }

  const blocs = raw as RawBloc[];
  const subjects: Assignatura[] = [];

  for (const bloc of blocs) {
    const blocId = bloc.id ?? null;
    const blocNom = bloc.nom ?? "";
    const programa = bloc.programa ?? null;
    const visibilitat = bloc.visibilitat ?? "";

    const uds = bloc.unitats_docents ?? [];
    for (const ud of uds) {
      const codi = ud.codi_upc_ud ?? ud.codi_ud ?? ud.codi ?? "";
      if (!codi) continue; // sin código, no nos sirve

      subjects.push({
        programa,
        bloc_id: blocId,
        bloc_nom: blocNom,
        visibilitat,

        codi_upc_ud: codi,
        sigles_ud: ud.sigles_ud ?? ud.sigles ?? ud.acronim ?? "",
        nom: ud.nom ?? "",
        nom_cast: ud.nom_cast ?? "",
        nom_eng: ud.nom_eng ?? "",

        vigent: ud.vigent ?? "",
        dept: ud.dept ?? "",
        credits_ects: ud.credits_ects ?? 0,
        centre: ud.centre ?? "",
      });
    }
  }

  return subjects;
}
