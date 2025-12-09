<!-- src/components/SubjectsTable.vue -->
<script setup lang="ts">
import type { Assignatura } from "../types/assignatures";

const props = defineProps<{
  assignatures: Assignatura[];
}>();
</script>

<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Codi UPC UD</th>
          <th>Sigles</th>
          <th>Nom</th>
          <th>Nom cast.</th>
          <th>Nom anglès</th>
          <th>Crèdits</th>
          <th>Dept.</th>
          <th>Centre</th>
          <th>Bloc</th>
          <th>Programa</th>
          <th>Vigent</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in props.assignatures" :key="a.codi_upc_ud + '-' + a.bloc_id">
          <td>{{ a.codi_upc_ud }}</td>
          <td>{{ a.sigles_ud }}</td>
          <td>{{ a.nom }}</td>
          <td>{{ a.nom_cast }}</td>
          <td>{{ a.nom_eng }}</td>
          <td style="text-align: right">{{ a.credits_ects }}</td>
          <td>{{ a.dept }}</td>
          <td>{{ a.centre }}</td>
          <td>{{ a.bloc_nom }}</td>
          <td>{{ a.programa }}</td>
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
}

th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 1;
  text-align: left;
}
</style>
