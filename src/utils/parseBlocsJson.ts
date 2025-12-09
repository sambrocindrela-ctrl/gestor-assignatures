// src/utils/parseBlocsJson.ts
import type { Subject } from "../types/Subject";

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
}

interface RawBloc {
  id?: number;
  nom?: string;
  programa?: number;
  visibilitat?: string;
  unitats_docents?: RawUd[];
}

export function parseBlocsJson(raw: unknown): Subject[] {
  if (!Array.isArray(raw)) {
    console.warn("El JSON raíz no es un array de blocs");
    return [];
  }

  const blocs = raw as RawBloc[];
  const subjects: Subject[] = [];

  for (const bloc of blocs) {
    const blocId = bloc.id ?? null;
    const blocNom = bloc.nom ?? "";
    const programa = bloc.programa ?? null;
    const visibilitat = bloc.visibilitat ?? "";

    const uds = bloc.unitats_docents ?? [];
    for (const ud of uds) {
      if (!ud.codi_upc_ud) continue; // sin código, no nos sirve

      subjects.push({
        programa,
        blocId,
        blocNom,
        visibilitat,

        codi: ud.codi_upc_ud ?? "",
        sigles: ud.sigles_ud ?? "",
        nom_cat: ud.nom ?? "",
        nom_cast: ud.nom_cast ?? "",
        nom_eng: ud.nom_eng ?? "",

        vigent: ud.vigent ?? "",
        dept: ud.dept ?? "",
        credits: ud.credits_ects ?? null,
        centre: ud.centre ?? "",

        // espacio para futuros merges
      });
    }
  }

  return subjects;
}
