<script setup lang="ts">
defineProps<{ titel?: string; zurueck?: boolean }>()
defineEmits<{ zurueck: [] }>()
</script>

<template>
  <header class="mobile-brand">
    <button v-if="zurueck" class="back-button" type="button" aria-label="Zurück" @click="$emit('zurueck')">‹</button>
    <span class="mobile-brand__mark" aria-hidden="true">P</span>
    <strong>{{ titel || 'PlauderBox' }}</strong>
  </header>
</template>
