<!-- src/components/AddSubjectForm.vue -->
<script setup lang="ts">
import { ref } from "vue";
import type { Assignatura } from "../types/assignatures";
import { PROGRAM_NAMES } from "../utils/programNames";

const emit = defineEmits<{
  (e: "add", subject: Assignatura): void;
}>();

const form = ref<Partial<Assignatura>>({
  codi_upc_ud: "",
  nom: "",
  shortname: "", // Will map to sigles_ud
  credits_ects: 5,
  programa: "948", // Default to MET
  bloc_nom: "Core",
  vigent: "S",
  centre: "ETSETB",
  dept: "ENTEL"
});

const availablePrograms = Object.entries(PROGRAM_NAMES).map(([code, name]) => ({
  code,
  name
}));

function handleSubmit() {
  if (!form.value.codi_upc_ud || !form.value.nom) {
    alert("Codi i Nom són obligatoris.");
    return;
  }

  const newSubject: Assignatura = {
    codi_upc_ud: form.value.codi_upc_ud,
    sigles_ud: form.value.shortname || "",
    nom: form.value.nom,
    nom_cast: form.value.nom, // Copy for simplicity
    nom_eng: form.value.nom,  // Copy for simplicity
    credits_ects: Number(form.value.credits_ects),
    dept: form.value.dept || "",
    centre: form.value.centre || "",
    
    // Default blocs
    bloc_id: null,
    bloc_nom: form.value.bloc_nom || "",
    programa: form.value.programa || null,
    visibilitat: "S",
    vigent: form.value.vigent || "S",
    
    // Init groups for consistency
    groups: [
      {
        programa: form.value.programa || "",
        bloc_nom: form.value.bloc_nom || ""
      }
    ]
  };

  emit("add", newSubject);
  
  // Reset critical fields
  form.value.codi_upc_ud = "";
  form.value.nom = "";
  form.value.shortname = "";
}
</script>

<template>
  <div class="add-form">
    <h3>Afegir nova assignatura (Manual)</h3>
    <form @submit.prevent="handleSubmit" class="form-grid">
      <div class="field">
        <label>Codi UPC:</label>
        <input v-model="form.codi_upc_ud" placeholder="ex: 230555" required />
      </div>
      
      <div class="field">
        <label>Sigles:</label>
        <input v-model="form.shortname" placeholder="ex: NEW-SUB" />
      </div>

      <div class="field full-width">
        <label>Nom:</label>
        <input v-model="form.nom" placeholder="Nom complet de l'assignatura" required />
      </div>

      <div class="field">
        <label>Programa:</label>
        <select v-model="form.programa">
           <option v-for="p in availablePrograms" :key="p.code" :value="p.code">
             {{ p.name }} ({{ p.code }})
           </option>
           <option value="Altres">Altres</option>
        </select>
      </div>

      <div class="field">
        <label>Bloc:</label>
        <input v-model="form.bloc_nom" placeholder="ex: Core, Elective..." />
      </div>

      <div class="field">
        <label>Crèdits:</label>
        <input type="number" v-model="form.credits_ects" step="0.5" />
      </div>
      
      <div class="field">
        <label>Vigent:</label>
        <select v-model="form.vigent">
          <option value="S">Sí</option>
          <option value="N">No</option>
        </select>
      </div>

      <div class="actions">
        <button type="submit" class="btn-add">Afegir a la llista</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.add-form {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 2rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #111827;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full-width {
  grid-column: span 2;
}

label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #374151;
}

input, select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.95rem;
}

.actions {
  grid-column: span 2;
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-add {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-add:hover {
  background-color: #059669;
}
</style>
