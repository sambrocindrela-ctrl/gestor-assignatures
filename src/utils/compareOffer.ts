import type { Assignatura } from "../types/assignatures";
import { parseCsv } from "./parseCsv";

export interface ComparisonResult {
    /** Rows from CSV that are NOT in the current JSON list */
    notInJson: Record<string, string>[];

    /** Subjects from JSON that are NOT in the CSV offer */
    notInCsv: Assignatura[];

    /** The detected column name used for matching */
    matchedColumn: string;
}

/**
 * Compares the current list of subjects with a CSV file.
 * Automatically detects the column containing codes (starting with 230...).
 */
export async function compareWithCsv(
    currentSubjects: Assignatura[],
    csvFile: File
): Promise<ComparisonResult> {
    const text = await csvFile.text();

    // 1. Try to parse with semicolon (common in Catalonia/Excel)
    let { headers, rows } = parseCsv(text, ";");

    // Fallback: if only 1 column detected, maybe it's comma separated?
    if (headers.length <= 1 && text.includes(",")) {
        const commaResult = parseCsv(text, ",");
        if (commaResult.headers.length > headers.length) {
            headers = commaResult.headers;
            rows = commaResult.rows;
        }
    }

    if (rows.length === 0) {
        throw new Error("El CSV semble buit o no s'ha pogut llegir.");
    }

    // 2. Detect the code column
    // Strategy: Find a column where values look like "230xxxx"
    // We check the first few rows.
    let bestColumn = "";

    // Candidate columns: prioritize those with "codi" in name
    const candidates = headers.filter(h => /codi/i.test(h));
    // If no "codi" column, check all headers
    const searchHeaders = candidates.length > 0 ? candidates : headers;

    const codeRegex = /^230\d{3,4}$/; // Starts with 230, followed by 3-4 digits.

    for (const h of searchHeaders) {
        // Check first 10 rows (or all if less)
        let matchCount = 0;
        const checkLimit = Math.min(rows.length, 20);

        for (let i = 0; i < checkLimit; i++) {
            const row = rows[i];
            // Safely access dynamic property
            const val = (row && typeof row === 'object' && h in row) ? row[h]?.trim() : "";
            if (val && codeRegex.test(val)) {
                matchCount++;
            }
        }

        // If more than 50% of checked rows match, assumes this is the column
        if (matchCount > checkLimit * 0.5) {
            bestColumn = h;
            break;
        }
    }

    if (!bestColumn) {
        throw new Error(
            "No s'ha trobat cap columna amb codis UPC (començant per 230...) al CSV."
        );
    }

    // 3. Extract unique codes from CSV
    const csvCodeMap = new Map<string, Record<string, string>>();
    for (const row of rows) {
        const rawCode = row[bestColumn]?.trim();
        if (rawCode && codeRegex.test(rawCode)) {
            csvCodeMap.set(rawCode, row);
        }
    }

    // 4. Compare
    const currentCodeSet = new Set(currentSubjects.map(s => s.codi_upc_ud));

    // A. In CSV but not in JSON
    const notInJson: Record<string, string>[] = [];
    for (const [code, row] of csvCodeMap) {
        if (!currentCodeSet.has(code)) {
            notInJson.push(row);
        }
    }

    // B. In JSON but not in CSV
    const notInCsv: Assignatura[] = [];
    for (const subj of currentSubjects) {
        if (!csvCodeMap.has(subj.codi_upc_ud)) {
            notInCsv.push(subj);
        }
    }

    return {
        notInJson,
        notInCsv,
        matchedColumn: bestColumn
    };
}
