// src/utils/normalizeBlocsJSON.ts
import type { Assignatura } from "../types/assignatures";

export interface NormalizedResult {
  blocsCount: number;
  assignatures: Assignatura[];
}

export function normalizeBlocsJSON(raw: unknown): NormalizedResult {
  console.log("normalizeBlocsJSON - valor brut rebut:", raw);

  // 1. Validar arrel
  if (!Array.isArray(raw)) {
    console.warn("normalizeBlocsJSON - l'arrel del JSON no és una llista");
    return { blocsCount: 0, assignatures: [] };
  }

  const arr = raw as any[];
  console.log("normalizeBlocsJSON - nombre de blocs/entrades trobats:", arr.length);

  if (arr.length === 0) {
    return { blocsCount: 0, assignatures: [] };
  }

  const first = arr[0];
  const looksLikeBloc = first && Array.isArray(first.unitats_docents);
  const looksLikeUd =
    first && (first.codi_upc_ud || first.codi_ud || first.codi || first.sigles_ud || first.sigles);

  // ---------------------------------------------------------------------------
  // CAS 1: JSON amb blocs (estructura original de l'aplicatiu de la UPC)
  // ---------------------------------------------------------------------------
  if (looksLikeBloc) {
    console.log("normalizeBlocsJSON - detectat format: BLOCS + unitats_docents");

    const subjects: Assignatura[] = [];

    for (const bloc of arr) {
      const blocId = bloc?.id ?? null;
      const blocNom = bloc?.nom ?? "";
      const programa = bloc?.programa ? String(bloc.programa) : null;
      const visibilitat = bloc?.visibilitat ?? "";

      const uds = bloc?.unitats_docents;

      if (!Array.isArray(uds)) {
        console.warn("Bloc sense 'unitats_docents':", blocId, blocNom);
        continue;
      }

      for (const ud of uds) {
        const codi =
          ud?.codi_upc_ud ?? ud?.codi_ud ?? ud?.codi ?? null;
        const sigles =
          ud?.sigles_ud ?? ud?.sigles ?? ud?.acronim ?? null;

        if (!codi || !sigles) {
          console.warn("UD sense codi/sigles vàlids:", ud);
          continue;
        }

        const nom = ud?.nom ?? "";
        const nom_cast = ud?.nom_cast ?? "";
        const nom_eng = ud?.nom_eng ?? "";
        const dept = ud?.dept ?? "";
        const credits = ud?.credits_ects ?? null;
        const centre = ud?.centre ?? "";
        const vigent = ud?.vigent ?? ""; // 👈 AFEGIT

        subjects.push({
          codi_upc_ud: String(codi),
          sigles_ud: String(sigles),
          nom,
          nom_cast,
          nom_eng,
          dept,
          credits_ects: credits,
          centre,
          // info de bloc
          bloc_id: blocId,
          bloc_nom: blocNom,
          programa,
          visibilitat,
          vigent, // 👈 AFEGIT
          groups: [{ programa: String(programa || ""), bloc_nom: blocNom }],
        });
      }
    }

    console.log(
      "normalizeBlocsJSON - assignatures generades abans de deduplicar:",
      subjects.length
    );

    // Deduplicar per codi_upc_ud
    const byCode = new Map<string, Assignatura>();
    for (const s of subjects) {
      if (!byCode.has(s.codi_upc_ud)) {
        byCode.set(s.codi_upc_ud, s);
      } else {
        // Ja existeix: comprovem si cal afegir el nom del bloc
        const existing = byCode.get(s.codi_upc_ud)!;

        // SMART MERGE: Add to groups
        // Check if this pair (programa, bloc_nom) is already in groups
        const existsGroup = existing.groups.some(g =>
          g.programa === (s.programa || "") && g.bloc_nom === s.bloc_nom
        );
        if (!existsGroup) {
          existing.groups.push({
            programa: String(s.programa || ""),
            bloc_nom: s.bloc_nom
          });
        }

        // Si el bloc nou no està ja a la llista de blocs de l'existent, l'afegim
        if (s.bloc_nom && !existing.bloc_nom.includes(s.bloc_nom)) {
          existing.bloc_nom = existing.bloc_nom
            ? `${existing.bloc_nom}, ${s.bloc_nom}`
            : s.bloc_nom;
        }

        // Si el programa nou no està ja a l'existent, l'afegim
        if (s.programa && existing.programa !== s.programa) {
          // check if string already contains it
          if (!existing.programa?.includes(s.programa)) {
            existing.programa = existing.programa
              ? `${existing.programa}, ${s.programa}`
              : s.programa;
          }
        }
      }
    }

    const finalList = Array.from(byCode.values());
    console.log(
      "normalizeBlocsJSON - assignatures després de deduplicar:",
      finalList.length
    );

    return { blocsCount: arr.length, assignatures: finalList };
  }

  // ---------------------------------------------------------------------------
  // CAS 2: JSON ja "aplanat": llista directa d'unitats_docents
  // ---------------------------------------------------------------------------
  if (looksLikeUd) {
    console.log("normalizeBlocsJSON - detectat format: LLISTA D'ASSIGNATURES");

    const subjects: Assignatura[] = [];

    for (const ud of arr) {
      const codi =
        ud?.codi_upc_ud ?? ud?.codi_ud ?? ud?.codi ?? null;
      const sigles =
        ud?.sigles_ud ?? ud?.sigles ?? ud?.acronim ?? null;

      if (!codi || !sigles) {
        console.warn("Entrada sense codi/sigles vàlids:", ud);
        continue;
      }

      const nom = ud?.nom ?? "";
      const nom_cast = ud?.nom_cast ?? "";
      const nom_eng = ud?.nom_eng ?? "";
      const dept = ud?.dept ?? "";
      const credits = ud?.credits_ects ?? null;
      const centre = ud?.centre ?? "";
      const vigent = ud?.vigent ?? ""; // 👈 AFEGIT

      subjects.push({
        codi_upc_ud: String(codi),
        sigles_ud: String(sigles),
        nom,
        nom_cast,
        nom_eng,
        dept,
        credits_ects: credits,
        centre,
        // sense info de bloc en aquest format
        bloc_id: null,
        bloc_nom: "",
        programa: null,
        visibilitat: "",
        vigent, // 👈 AFEGIT
        groups: [] // No blocks in this format
      });
    }

    console.log(
      "normalizeBlocsJSON - assignatures generades (format pla):",
      subjects.length
    );

    // aquí blocsCount = 0 perquè no tenim info de blocs
    return { blocsCount: 0, assignatures: subjects };
  }

  // ---------------------------------------------------------------------------
  // CAS 3: format desconegut
  // ---------------------------------------------------------------------------
  console.warn(
    "normalizeBlocsJSON - format desconegut, no s'ha pogut interpretar el JSON"
  );
  return { blocsCount: 0, assignatures: [] };
}
