<script setup lang="ts">
withDefaults(
  defineProps<{
    titel?: string
    navigation?: boolean
    zurueck?: boolean
    startAktiv?: boolean
    beendenAktiv?: boolean
  }>(),
  { navigation: false, zurueck: false, startAktiv: false, beendenAktiv: false },
)
defineEmits<{ zurueck: []; start: []; beenden: [] }>()
</script>

<template>
  <header class="mobile-header">
    <div class="mobile-brand">
      <span class="mobile-brand__mark" aria-hidden="true">P</span>
      <strong>{{ titel || 'PlauderBox' }}</strong>
    </div>
    <nav v-if="navigation" class="mobile-header__navigation" aria-label="Begehungsnavigation">
      <button class="header-nav-button" type="button" :disabled="!zurueck" @click="$emit('zurueck')">‹ Back</button>
      <button class="header-nav-button" type="button" :disabled="startAktiv" @click="$emit('start')">Start</button>
      <button class="header-nav-button" type="button" :disabled="beendenAktiv" @click="$emit('beenden')">
        Beenden
      </button>
    </nav>
  </header>
</template>
