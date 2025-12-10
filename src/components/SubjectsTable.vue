<script setup lang="ts">
import { computed } from "vue";
import type { Assignatura } from "../types/assignatures";
import { getProgramName } from "../utils/programNames";

const props = defineProps<{
  assignatures: Assignatura[];
  highlightIds?: Set<string>;
}>();

// Estructura per saber quants blocs màxims té cada programa
// ex: { "948": 2, "1356": 1, ... }
const programMaxBlocks = computed(() => {
  const map: Record<string, number> = {};

  for (const a of props.assignatures) {
    if (!a.groups || a.groups.length === 0) continue;

    // Agrupar els blocs d'aquesta assignatura per programa
    const countByProg: Record<string, number> = {};
    for (const g of a.groups) {
      const p = g.programa || "Altres";
      countByProg[p] = (countByProg[p] || 0) + 1;
    }

    // Actualitzar el màxim global
    for (const [prog, count] of Object.entries(countByProg)) {
      if (!map[prog] || count > map[prog]) {
        map[prog] = count;
      }
    }
  }
  return map;
});

// Llista ordenada de programes per generar columnes
// ex: ["948", "1356", "Altres"]
const sortedPrograms = computed(() => {
  return Object.keys(programMaxBlocks.value).sort();
});

// Helper per obtenir el bloc N d'un programa P en una assignatura A
function getBlockFor(a: Assignatura, prog: string, index: number): string {
    if (!a.groups) return "";
    // Filtras els grups que coincideixen amb el programa
    const matching = a.groups.filter(g => (g.programa || "Altres") === prog);
    // Retornar el nom del bloc a la posició 'index'
    if (matching[index]) {
        return matching[index].bloc_nom;
    }
    return "";
}

</script>

<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <!-- Columnes fixes -->
          <th rowspan="2">Codi UPC UD</th>
          <th rowspan="2">Sigles</th>
          <th rowspan="2">Nom</th>
          <th rowspan="2">Nom cast.</th>
          <th rowspan="2">Nom anglès</th>
          <th rowspan="2">Crèdits</th>
          <th rowspan="2">Dept.</th>
          <th rowspan="2">Centre</th>
          
          <!-- Columnes dinàmiques (Headers de Programa) -->
          <th 
            v-for="prog in sortedPrograms" 
            :key="prog" 
            :colspan="programMaxBlocks[prog]"
            class="program-header"
          >
            {{ getProgramName(prog) }}
          </th>

          <th rowspan="2">Vigent</th>
        </tr>
        <tr>
            <!-- Sub-headers per a cada bloc (Block 1, Block 2...) -->
           <template v-for="prog in sortedPrograms" :key="prog + '-sub'">
                <th v-for="i in programMaxBlocks[prog]" :key="prog + '-' + i" class="sub-header">
                    Bloc {{ i }}
                </th>
           </template>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="a in props.assignatures" 
          :key="a.codi_upc_ud"
          :class="{ 'highlight-blue': props.highlightIds?.has(a.codi_upc_ud) }"
        >
          <td>{{ a.codi_upc_ud }}</td>
          <td>{{ a.sigles_ud }}</td>
          <td>{{ a.nom }}</td>
          <td>{{ a.nom_cast }}</td>
          <td>{{ a.nom_eng }}</td>
          <td style="text-align: right">{{ a.credits_ects }}</td>
          <td>{{ a.dept }}</td>
          <td>{{ a.centre }}</td>

          <!-- Cel·les dinàmiques -->
          <template v-for="prog in sortedPrograms" :key="prog">
             <td v-for="i in programMaxBlocks[prog]" :key="prog + '-cell-' + i">
                {{ getBlockFor(a, prog, i - 1) }}
             </td>
          </template>

          <!-- Legacy / Vigent -->
          <td>{{ a.vigent }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  max-height: 70vh;
  overflow: auto;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  background: #ffffff;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  border-left: 1px solid #f0f0f0;
}

th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
  text-align: center; /* Centrem headers */
  vertical-align: middle;
}

/* Ajust per a la segona fila de headers */
thead tr:nth-child(2) th {
    top: 35px; /* alçada aproximada primera fila */
    font-size: 0.8em;
    color: #666;
    background: #fdfdfd;
}

.program-header {
    background-color: #e3f2fd;
    color: #0d47a1;
    font-weight: bold;
}

.sub-header {
    
}

.highlight-blue {
  background-color: #e0f7fa !important;
}
</style>
