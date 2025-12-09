<!-- src/components/JsonImport.vue -->
<script setup lang="ts">
import { ref } from "vue";
import type { Assignatura } from "../types/assignatures";
import { normalizeBlocsJSON } from "../utils/normalizeBlocsJSON";
import SubjectsTable from "./SubjectsTable.vue";

const assignatures = ref<Assignatura[]>([]);
const blocsCount = ref(0);

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    let text = await file.text();

    // Eliminar possible BOM UTF-8
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    let raw: unknown;

    // 1. Intentar parsejar directament
    try {
      raw = JSON.parse(text);
    } catch (err) {
      console.warn("Error JSON.parse directe, provant de recuperar només l'array:", err);

      // 2. Recuperar només des del primer '[' fins a l'últim ']'
      const firstBracket = text.indexOf("[");
      const lastBracket = text.lastIndexOf("]");

      if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
        // Si tampoc trobem això, tornem a llençar l'error original
        throw err;
      }

      const sliced = text.slice(firstBracket, lastBracket + 1);
      console.log(
        "Text JSON recuperat (primeres 200 lletres):",
        sliced.slice(0, 200)
      );

      raw = JSON.parse(sliced);
    }

    const { blocsCount: bCount, assignatures: assig } = normalizeBlocsJSON(raw);
    blocsCount.value = bCount;
    assignatures.value = assig;

    console.log(
      `JSON carregat: ${assignatures.value.length} assignatures de ${blocsCount.value} blocs`
    );
  } catch (e) {
    console.error("Error fent JSON.parse:", e);
    alert("El fitxer no és un JSON vàlid.");
    blocsCount.value = 0;
    assignatures.value = [];
  } finally {
    // Permetre tornar a carregar el mateix fitxer
    (event.target as HTMLInputElement).value = "";
  }
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

    <section v-if="assignatures.length > 0" class="table-section">
      <SubjectsTable :assignatures="assignatures" />
    </section>
    <section v-else class="empty-state">
      <p>Carrega un fitxer JSON per veure les assignatures.</p>
    </section>
  </main>
</template>

<style scoped>
.app {
  max-width: 900px;
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
</style>
