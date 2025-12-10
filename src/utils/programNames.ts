export const PROGRAM_NAMES: Record<string, string> = {
    "823": "GEF",
    "1328": "GREELEC",
    "1155": "GRETST",
    "1356": "MATT",
    "1383": "MCYBERS",
    "1476": "MEE",
    "948": "MET",
    "1564": "MSEMD",
    "1334": "MEF",
    "953": "MPHOTON"
};

export function getProgramName(code: string): string {
    return PROGRAM_NAMES[code] || `Progr ${code}`;
}
