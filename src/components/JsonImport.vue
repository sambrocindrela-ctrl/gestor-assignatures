<!-- src/components/JsonImport.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Assignatura } from "../types/assignatures";
import { normalizeBlocsJSON } from "../utils/normalizeBlocsJSON";
import { compareWithCsv, type ComparisonResult } from "../utils/compareOffer";
import { exportSubjectsToExcel } from "../utils/exportToExcel";
import { useGitHub } from "../composables/useGitHub";
import { getRepoContent, saveRepoContent, getRepoFiles } from "../services/github";
import SubjectsTable from "./SubjectsTable.vue";
import AddSubjectForm from "./AddSubjectForm.vue";

const assignatures = ref<Assignatura[]>([]);
const blocsCount = ref(0);

// GitHub State
const { settings, loadSettings } = useGitHub();
const showSettings = ref(false);
const isLoadingGitHub = ref(false);
const isSavingGitHub = ref(false);
const statusMessage = ref("");
const currentSha = ref(""); // To track file version for updates
const availableFiles = ref<{ name: string; path: string }[]>([]);

// Estat per a la comparació
const comparisonResult = ref<ComparisonResult | null>(null);
const comparisonError = ref("");

// Init
onMounted(() => {
  loadSettings();
  if (settings.value.token) {
    handleFetchFiles();
  }
});

async function handleFetchFiles() {
    if (!settings.value.token || !settings.value.owner || !settings.value.repo) return;
    try {
        // Assume files are in the same folder as the configured path, or root if path is empty
        const dir = settings.value.path.includes("/") 
            ? settings.value.path.substring(0, settings.value.path.lastIndexOf("/")) 
            : "src/fitxers"; // Default fallback
            
        const files = await getRepoFiles(
            settings.value.owner,
            settings.value.repo,
            dir,
            settings.value.token,
            settings.value.branch
        );
        availableFiles.value = files;
    } catch (e) {
        console.warn("Could not auto-fetch file list", e);
    }
}

async function handleMergeFromGitHub(filePath: string) {
    if (!filePath) return;
    isLoadingGitHub.value = true;
    statusMessage.value = `Fusionant ${filePath}...`;
    try {
        const result = await getRepoContent(
            settings.value.owner,
            settings.value.repo,
            filePath, // Use the selected path
            settings.value.token,
            settings.value.branch
        );
        const raw = JSON.parse(result.content);
        const { assignatures: newAssig } = normalizeBlocsJSON(raw);
        
        const merged = mergeSubjects(assignatures.value, newAssig);
        assignatures.value = merged;
        statusMessage.value = `Fusionat correctament de GitHub! Total: ${merged.length}`;
    } catch (e: any) {
        alert("Error fusionant de GitHub: " + e.message);
    } finally {
        isLoadingGitHub.value = false;
    }
}

const highlightIds = computed(() => {
  if (!comparisonResult.value) return new Set<string>();
  const ids = new Set<string>();
  for (const s of comparisonResult.value.notInCsv) {
    if (s.codi_upc_ud) ids.add(s.codi_upc_ud);
  }
  return ids;
});

// --- GitHub Actions ---

async function handleLoadFromGitHub() {
  if (!settings.value.token) {
    alert("Necessites configurar un Token de GitHub primer.");
    showSettings.value = true;
    return;
  }
  
  isLoadingGitHub.value = true;
  statusMessage.value = "Carregant des de GitHub...";
  
  try {
    const result = await getRepoContent(
      settings.value.owner,
      settings.value.repo,
      settings.value.path,
      settings.value.token,
      settings.value.branch
    );
    
    currentSha.value = result.sha;
    
    // Parse content
    const raw = JSON.parse(result.content);
    const { blocsCount: bCount, assignatures: assig } = normalizeBlocsJSON(raw);
    
    blocsCount.value = bCount;
    assignatures.value = assig;
    statusMessage.value = "Carregat correctament des de GitHub!";
    
  } catch (e: any) {
    console.error(e);
    statusMessage.value = `Error carregant: ${e.message}`;
    alert(`Error: ${e.message}`);
  } finally {
    isLoadingGitHub.value = false;
  }
}

async function handleSaveToGitHub() {
  if (!settings.value.token) {
     alert("Necessites configurar un Token de GitHub primer.");
     return;
  }
  if (assignatures.value.length === 0) {
      alert("No hi ha dades per guardar.");
      return;
  }
  
  if (!confirm("Això crearà un nou commit al repositori amb les dades actuals. Vols continuar?")) {
      return;
  }

  isSavingGitHub.value = true;
  statusMessage.value = "Guardant a GitHub...";

  try {
    // 1. Check if file exists to get its SHA (for update) or null (for create)
    let shaToUse = currentSha.value;
    
    // Always fetch latest SHA for the target path to ensure no conflicts
    // and to handle cases where we changed 'settings.path' manually
    try {
        const fileData = await getRepoContent(
            settings.value.owner,
            settings.value.repo,
            settings.value.path,
            settings.value.token,
            settings.value.branch
        );
        shaToUse = fileData.sha;
    } catch (e: any) {
        // If 404/not found, it means we are creating a new file -> shaToUse undefined
        // If other error, we might want to warn, but we'll try saving as new or let saveRepo handle it
        if (e.message !== "File not found") {
            console.warn("Could not check for existing file, assuming new:", e);
        }
    }

    const content = JSON.stringify(assignatures.value, null, 2);
    
    await saveRepoContent(
      settings.value.owner,
      settings.value.repo,
      settings.value.path,
      content,
      `chore: Update subjects via CMS (${new Date().toISOString().split('T')[0]})`,
      settings.value.token,
      shaToUse || undefined, 
      settings.value.branch
    );
    
    statusMessage.value = "Guardat correctament a GitHub!";
    alert("Canvis guardats correctament!");
    
    // Refresh SHA to allow subsequent saves without reloading
    await handleLoadFromGitHub(); 

  } catch (e: any) {
    console.error(e);
    statusMessage.value = `Error guardant: ${e.message}`;
    alert(`Error: ${e.message}`);
  } finally {
    isSavingGitHub.value = false;
  }
}

// --- Local File Actions ---

async function processFile(file: File): Promise<{
  assignatures: Assignatura[];
  blocsCount: number;
}> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    // Retry logic for partial JSONs
    const first = text.indexOf("[");
    const last = text.lastIndexOf("]");
    if (first === -1 || last === -1 || last <= first) throw err;
    raw = JSON.parse(text.slice(first, last + 1));
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
    currentSha.value = ""; // Loaded from disk, lost git link
    statusMessage.value = "Carregat des de disc.";
  } catch (e) {
    alert("El fitxer no és un JSON vàlid.");
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

    // Reuse merge logic
    const mergedList = mergeSubjects(assignatures.value, newAssig);
    assignatures.value = mergedList;
    statusMessage.value = `Fusionat: total ${assignatures.value.length} assignatures.`;
  } catch (e) {
      alert("Error en fusionar el fitxer JSON.");
  } finally {
      input.value = "";
  }
}

function mergeSubjects(current: Assignatura[], incoming: Assignatura[]): Assignatura[] {
    const combined = [...current, ...incoming];
    const uniqueMap = new Map<string, Assignatura>();
    
    for (const a of combined) {
        if(!a.codi_upc_ud) continue;
        if (!uniqueMap.has(a.codi_upc_ud)) {
            uniqueMap.set(a.codi_upc_ud, a);
        } else {
            const existing = uniqueMap.get(a.codi_upc_ud)!;
            // Merge Bloc Nom
            if (a.bloc_nom && !existing.bloc_nom.includes(a.bloc_nom)) {
                existing.bloc_nom = existing.bloc_nom ? `${existing.bloc_nom}, ${a.bloc_nom}` : a.bloc_nom;
            }
            // Merge Programa
            if (a.programa && existing.programa !== a.programa) {
                if (!existing.programa?.includes(a.programa)) {
                    existing.programa = existing.programa ? `${existing.programa}, ${a.programa}` : a.programa;
                }
            }
            // Merge Groups
            if (a.groups && a.groups.length > 0) {
                if (!existing.groups) existing.groups = [];
                for (const g of a.groups) {
                    const exists = existing.groups.some(eg => eg.programa === g.programa && eg.bloc_nom === g.bloc_nom);
                    if (!exists) existing.groups.push(g);
                }
            }
        }
    }
    return Array.from(uniqueMap.values());
}
    statusMessage.value = `Fusionat: total ${assignatures.value.length} assignatures.`;
  } catch (e) {
      alert("Error en fusionar el fitxer JSON.");
  } finally {
      input.value = "";
  }
}

// --- Manual Entry ---
function handleAddSubject(newSub: Assignatura) {
  // Check duplicate
  const exists = assignatures.value.find(s => s.codi_upc_ud === newSub.codi_upc_ud);
  if (exists) {
      if(!confirm(`L'assignatura ${newSub.codi_upc_ud} ja existeix. Vols substituir-la?`)) return;
      // Replace
      const idx = assignatures.value.indexOf(exists);
      assignatures.value[idx] = newSub;
  } else {
      assignatures.value.push(newSub);
  }
  statusMessage.value = `Afegida manualment: ${newSub.codi_upc_ud}`;
}

// --- Other ---
async function handleCompareCsv(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  comparisonError.value = "";
  comparisonResult.value = null;
  try {
    const result = await compareWithCsv(assignatures.value, file);
    comparisonResult.value = result;
  } catch (e: any) {
    comparisonError.value = e.message;
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
    <h1 class="app-title">Gestor d'Assignatures (CMS)</h1>

    <!-- SECTION: GitHub Settings & Actions -->
    <section class="card settings-card">
      <div class="header-row">
         <h2>🔌 GitHub Integration</h2>
         <button class="btn-text" @click="showSettings = !showSettings">
            {{ showSettings ? 'Amagar Configuració' : 'Configurar Token/Repo' }}
         </button>
      </div>

      <div v-if="showSettings" class="settings-form">
          <div class="row">
              <label>Token (PAT):</label>
              <input type="password" v-model="settings.token" placeholder="ghp_..." />
          </div>
          <div class="row">
              <label>Owner:</label>
              <input v-model="settings.owner" placeholder="user or org" />
              <label>Repo:</label>
              <input v-model="settings.repo" placeholder="repo-name" />
          </div>
          <div class="row">
              <label>Path:</label>
              <!-- Combo box behavior: Select or Type -->
              <div class="input-group">
                <input v-model="settings.path" placeholder="path/to/file.json" list="file-list" />
                <datalist id="file-list">
                    <option v-for="f in availableFiles" :key="f.path" :value="f.path">{{ f.name }}</option>
                </datalist>
                <button class="btn-sm" @click="handleFetchFiles" title="Refrescar llista fitxers">🔄</button>
              </div>

              <label>Branch:</label>
              <input v-model="settings.branch" placeholder="main" />
          </div>
          <p class="crypto-note">ℹ️ Token is saved in your browser (LocalStorage) only.</p>
      </div>

      <div class="action-row">
          <button class="btn-github load" @click="handleLoadFromGitHub" :disabled="isLoadingGitHub">
              {{ isLoadingGitHub ? 'Carregant...' : '📂 Load from GitHub' }}
          </button>
          
          <button class="btn-github save" @click="handleSaveToGitHub" :disabled="isSavingGitHub">
              {{ isSavingGitHub ? 'Guardant...' : '💾 Save to GitHub' }}
          </button>
      </div>
      
      <!-- Merge Tool -->
      <div class="merge-row" v-if="availableFiles.length > 0">
           <label>Fusionar un altre fitxer:</label>
           <select @change="(e) => handleMergeFromGitHub((e.target as HTMLSelectElement).value)">
               <option value="">-- Selecciona fitxer per afegir --</option>
               <option v-for="f in availableFiles" :key="f.path" :value="f.path">
                   ➕ {{ f.name }} (Merge)
               </option>
           </select>
      </div>
      
      <p v-if="statusMessage" class="status-msg">{{ statusMessage }}</p>
    </section>

    <!-- SECTION: Add Manual Data -->
    <section class="card" v-if="assignatures.length > 0">
       <AddSubjectForm @add="handleAddSubject" />
    </section>

    <!-- SECTION: Stats & Legacy Import -->
    <section class="card">
      <h2>Importar / Fusionar (Local)</h2>
      <div class="file-inputs">
        <div>
            <label>Substituir tot:</label>
            <input type="file" accept=".json,application/json" @change="handleFileChange" />
        </div>
        <div>
            <label>Fusionar (Merge):</label>
            <input type="file" accept=".json,application/json" @change="handleMergeFile" />
        </div>
      </div>
      <p class="summary">
        Total: <strong>{{ assignatures.length }}</strong> assignatures
        <span v-if="currentSha" class="badge-git">Linked to GitHub ({{ currentSha.substring(0,7) }})</span>
        <span v-if="blocsCount > 0">
          de <strong>{{ blocsCount }}</strong> blocs.
        </span>
      </p>
    </section>

    <!-- 3. COMPARAR AMB OFERTA -->
    <section class="card" v-if="assignatures.length > 0">
      <h2>Comparar amb Oferta (CSV)</h2>
      <input type="file" accept=".csv" @change="handleCompareCsv" />
      <div v-if="comparisonError" class="error-msg">{{ comparisonError }}</div>
    </section>

    <!-- RESULTATS COMPARACIÓ -->
    <section v-if="comparisonResult" class="comparison-results">
        <!-- (Same result boxes as before) -->
      <h3>Resultats de la comparació</h3>
      <p>Columna detectada al CSV: <strong>{{ comparisonResult.matchedColumn }}</strong></p>

      <div class="result-box warning">
        <h4>Assignatures ofertades sense agrupació ({{ comparisonResult.notInJson.length }})</h4>
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
        <button class="btn-primary" @click="handleExport">Exportar Excel</button>
      </div>
      <SubjectsTable :assignatures="assignatures" :highlight-ids="highlightIds" />
    </section>

  </main>
</template>

<style scoped>
.input-group {
    display: flex;
    flex: 1;
    gap: 0.5rem;
}
.btn-sm {
    padding: 0 0.5rem;
    cursor: pointer;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
}
.merge-row {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed #e2e8f0;
    display: flex;
    align-items: center;
    gap: 1rem;
}
.merge-row select {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.app {
  max-width: 90%;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.app-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #2c3e50;
}

.card {
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  background: white;
  margin-bottom: 2rem;
  border: 1px solid #f0f0f0;
}

.settings-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.header-row h2 { margin: 0; font-size: 1.25rem; }

.btn-text {
    background: none;
    border: none;
    color: #4b5563;
    text-decoration: underline;
    cursor: pointer;
}

.settings-form {
    background: #fff;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    margin-bottom: 1rem;
}

.settings-form .row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    align-items: center;
}
.settings-form input { flex: 1; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px; }
.settings-form label { font-weight: 500; font-size: 0.9rem; width: 80px; }

.crypto-note { font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem; }

.action-row {
    display: flex;
    gap: 1rem;
}

.btn-github {
    flex: 1;
    padding: 0.8rem;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s;
}

.btn-github.load { background: #24292f; color: white; } /* GitHub Black */
.btn-github.load:hover { background: #000; }

.btn-github.save { background: #2ea44f; color: white; } /* GitHub Green */
.btn-github.save:hover { background: #2c974b; }

.btn-github:disabled { opacity: 0.6; cursor: not-allowed; }

.status-msg { margin-top: 1rem; font-weight: 500; color: #0366d6; }

.file-inputs {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
}
.file-inputs > div { display: flex; flex-direction: column; gap: 0.5rem; }

.badge-git {
    background: #e6fffa;
    color: #047481;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.8rem;
    border: 1px solid #b2f5ea;
    margin-left: 0.5rem;
}

/* Reuse existing styles for comparison, table, etc. from previous version */
.comparison-results { margin-bottom: 2rem; }
.result-box {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
}
.result-box.warning { border-left: 5px solid #ff9800; }
.result-box.info { border-left: 5px solid #2196f3; }
.scroller {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  padding: 0.5rem;
}
.scroller ul { list-style: none; padding: 0; margin: 0; }
.scroller li { padding: 0.2rem 0; border-bottom: 1px solid #f9f9f9; font-size: 0.9rem; }
.actions { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.btn-primary {
  background-color: #007bff; color: white; border: none; padding: 0.6rem 1.2rem;
  border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500;
}
.btn-primary:hover { background-color: #0056b3; }
.error-msg { color: #d32f2f; background: #fdecea; padding: 0.8rem; border-radius: 4px; margin-top: 1rem; }
</style>
