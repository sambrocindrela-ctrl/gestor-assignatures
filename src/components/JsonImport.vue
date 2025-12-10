<!-- src/components/JsonImport.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { ref } from "vue";
import type { Assignatura } from "../types/assignatures";
import { normalizeBlocsJSON } from "../utils/normalizeBlocsJSON";
import { compareWithCsv, type ComparisonResult } from "../utils/compareOffer";
import { exportSubjectsToExcel } from "../utils/exportToExcel";
import SubjectsTable from "./SubjectsTable.vue";

const assignatures = ref<Assignatura[]>([]);
const blocsCount = ref(0);

// Estat per a la comparació
const comparisonResult = ref<ComparisonResult | null>(null);
const comparisonError = ref("");

const highlightIds = computed(() => {
  if (!comparisonResult.value) return new Set<string>();
  // "notInCsv" són les que tenim nosaltres però NO estan a l'oferta.
  // L'usuari vol destacar aquestes.
  const ids = new Set<string>();
  for (const s of comparisonResult.value.notInCsv) {
    if (s.codi_upc_ud) ids.add(s.codi_upc_ud);
  }
  return ids;
});

async function processFile(file: File): Promise<{
  assignatures: Assignatura[];
  blocsCount: number;
}> {
  let text = await file.text();
  // Eliminar possible BOM UTF-8
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    console.warn("Error JSON.parse, provant recuperació manual:", err);
    // Recuperar només des del primer '[' fins a l'últim ']'
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      throw err;
    }
    const sliced = text.slice(firstBracket, lastBracket + 1);
    raw = JSON.parse(sliced);
  }
  return normalizeBlocsJSON(raw);
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const { blocsCount: bCount, assignatures: assig } = await processFile(file);
    blocsCount.value = bCount;
    assignatures.value = assig;
  } catch (e) {
    console.error("Error carregant JSON:", e);
    alert("El fitxer no és un JSON vàlid.");
    blocsCount.value = 0;
    assignatures.value = [];
  } finally {
    input.value = "";
  }
}

async function handleMergeFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const { assignatures: newAssig } = await processFile(file);
    
    // Fusionar: afegim les noves a les existents
    const combined = [...assignatures.value, ...newAssig];

    // Deduplicar per codi_upc_ud (l'últim guanya)
    // Deduplicar amb "smart merge" per codi_upc_ud
    const uniqueMap = new Map<string, Assignatura>();
    
    for (const a of combined) {
        if(!a.codi_upc_ud) continue;

        if (!uniqueMap.has(a.codi_upc_ud)) {
            uniqueMap.set(a.codi_upc_ud, a);
        } else {
            // Ja existeix: fem merge de propietats clau (bloc_nom, programa)
            const existing = uniqueMap.get(a.codi_upc_ud)!;
            
            // Merge Bloc Nom
            if (a.bloc_nom && !existing.bloc_nom.includes(a.bloc_nom)) {
                existing.bloc_nom = existing.bloc_nom 
                    ? `${existing.bloc_nom}, ${a.bloc_nom}`
                    : a.bloc_nom;
            }

            // Merge Programa
            if (a.programa && existing.programa !== a.programa) {
                if (!existing.programa?.includes(a.programa)) {
                    existing.programa = existing.programa
                        ? `${existing.programa}, ${a.programa}`
                        : a.programa;
                }
            }

            // Merge Groups
            if (a.groups && a.groups.length > 0) {
                if (!existing.groups) existing.groups = [];
                for (const g of a.groups) {
                    const exists = existing.groups.some(eg => 
                         eg.programa === g.programa && eg.bloc_nom === g.bloc_nom
                    );
                    if (!exists) {
                        existing.groups.push(g);
                    }
                }
            }
            
            // Si hi ha altres camps que vols preservar/acumular, fes-ho aquí.
            // Per defecte, mantenim la resta de dades del primer (o fem override si calgués).
            // En aquest cas, mantenim el primer que vam trobar com a base, i només estenem infos extra.
        }
    }
    
    assignatures.value = Array.from(uniqueMap.values());
    console.log(`Fusionat: total ${assignatures.value.length} assignatures.`);

  } catch (e) {
      console.error("Error fent merge:", e);
      alert("Error en fusionar el fitxer JSON.");
  } finally {
      input.value = "";
  }
}

async function handleCompareCsv(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  comparisonError.value = "";
  comparisonResult.value = null;

  try {
    const result = await compareWithCsv(assignatures.value, file);
    comparisonResult.value = result;
    console.log("Comparació completada:", result);
  } catch (e: any) {
    console.error("Error comparant CSV:", e);
    comparisonError.value = e.message ?? "Error desconegut al comparar.";
  } finally {
    input.value = "";
  }
}

function handleExport() {
  if (assignatures.value.length === 0) return;
  exportSubjectsToExcel(assignatures.value, highlightIds.value);
}
</script>

<template>
  <main class="app">
    <h1 class="app-title">Gestor d'assignatures</h1>

    <section class="card">
      <h2>1. Importar JSON de blocs</h2>

      <p>
        Selecciona un fitxer JSON (per ex.
        <code>blocs_gretst.json</code> o
        <code>blocs_gretst_pretty.json</code>):
      </p>

      <input type="file" accept=".json,application/json" @change="handleFileChange" />

      <p class="summary">
        S'han carregat
        <strong>{{ assignatures.length }}</strong>
        assignatures
        <span v-if="blocsCount > 0">
          de <strong>{{ blocsCount }}</strong> blocs.
        </span>
        <span v-else>
          de <strong>0</strong> blocs.
        </span>
      </p>
    </section>

    <section class="card" v-if="assignatures.length > 0">
      <h2>2. Fusionar (Merge) un altre JSON</h2>
      <p>
        Pots afegir més assignatures des d'un altre fitxer sense esborrar les actuals.
        (Si hi ha codis repetits, s'actualitzaran amb el nou fitxer).
      </p>
      <input type="file" accept=".json,application/json" @change="handleMergeFile" />
    </section>

    <!-- 3. COMPARAR AMB OFERTA -->
    <section class="card" v-if="assignatures.length > 0">
      <h2>3. Comparar amb Oferta (CSV)</h2>
      <p>
        Pujar un CSV d'oferta. Es buscarà una columna de codis (230...) i es compararà.
      </p>
      <input type="file" accept=".csv" @change="handleCompareCsv" />

      <div v-if="comparisonError" class="error-msg">
        {{ comparisonError }}
      </div>
    </section>

    <!-- RESULTATS COMPARACIÓ -->
    <section v-if="comparisonResult" class="comparison-results">
      <h3>Resultats de la comparació</h3>
      <p>Columna detectada al CSV: <strong>{{ comparisonResult.matchedColumn }}</strong></p>

      <div class="result-box warning">
        <h4>Assignatures ofertades sense agrupació ({{ comparisonResult.notInJson.length }})</h4>
        <p class="desc">Són al CSV però NO a la llista carregada.</p>
        <div class="scroller">
          <ul>
            <li v-for="(row, idx) in comparisonResult.notInJson" :key="idx">
              <strong>{{ row[comparisonResult.matchedColumn] }}</strong> 
              - {{ Object.values(row).slice(0, 3).join(" | ") }}
            </li>
          </ul>
        </div>
      </div>

      <div class="result-box info">
        <h4>Assignatures que no estan a l’oferta ({{ comparisonResult.notInCsv.length }})</h4>
        <p class="desc">Són a la llista carregada però NO al CSV.</p>
        <div class="scroller">
           <ul>
            <li v-for="subj in comparisonResult.notInCsv" :key="subj.codi_upc_ud">
              <strong>{{ subj.codi_upc_ud }}</strong> - {{ subj.nom }} ({{ subj.sigles_ud }})
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section v-if="assignatures.length > 0" class="table-section">
      <div class="actions">
        <button class="btn-primary" @click="handleExport">
          Exportar llista a Excel
        </button>
      </div>
      <SubjectsTable 
        :assignatures="assignatures" 
        :highlight-ids="highlightIds"
      />
    </section>
    <section v-else class="empty-state">
      <p>Carrega un fitxer JSON per veure les assignatures.</p>
    </section>
  </main>
</template>

<style scoped>
.app {
  max-width: 90%; /* Updated to 90% as per user request */
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app-title {
  text-align: center;
  font-size: 2.2rem;
  margin-bottom: 2rem;
}

.card {
  border-radius: 1rem;
  padding: 1.5rem 1.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  background: #ffffff;
  margin-bottom: 2rem;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
}

.card p {
  margin: 0.4rem 0;
}

input[type="file"] {
  margin-top: 0.75rem;
}

.summary {
  margin-top: 1rem;
}

.table-section {
  margin-top: 1rem;
}

.empty-state {
  margin-top: 1.5rem;
  text-align: center;
  color: #555;
}
.error-msg {
  color: #d32f2f;
  background: #fdecea;
  padding: 0.8rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.comparison-results {
  margin-bottom: 2rem;
}

.result-box {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
}

.result-box h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.result-box.warning {
  border-left: 5px solid #ff9800;
}

.result-box.info {
  border-left: 5px solid #2196f3;
}

.desc {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.8rem;
}

.scroller {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  padding: 0.5rem;
}

.scroller ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.scroller li {
  padding: 0.2rem 0;
  border-bottom: 1px solid #f9f9f9;
  font-size: 0.9rem;
}
.scroller li {
  padding: 0.2rem 0;
  border-bottom: 1px solid #f9f9f9;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: #0056b3;
}
</style>
