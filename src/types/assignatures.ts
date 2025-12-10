// src/types/assignatures.ts

export interface Assignatura {
  // camps de la unitat docent
  codi_upc_ud: string;
  sigles_ud: string;
  nom: string;
  nom_cast: string;
  nom_eng: string;
  vigent: string;
  dept: string;
  credits_ects: number;
  centre: string;

  // info del bloc
  bloc_id: number | null;
  bloc_nom: string;
  programa: string | null;
  visibilitat: string;

  // NEW: Support for dynamic columns (multiple program/block pairs)
  groups: { programa: string; bloc_nom: string }[];
}
