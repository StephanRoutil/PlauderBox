<script setup lang="ts">
withDefaults(defineProps<{ titel?: string; hinweis?: string }>(), {
  titel: 'KI-Auswertung läuft',
  hinweis: 'Das Audio wird übertragen und ausgewertet. Bitte einen Moment warten.',
})
</script>

<template>
  <aside class="vorgangs-fortschritt" role="status" aria-live="assertive" :aria-label="titel">
    <span class="spinner" aria-hidden="true"></span>
    <div class="vorgangs-fortschritt__inhalt">
      <strong>{{ titel }}</strong>
      <span>{{ hinweis }}</span>
      <span class="vorgangs-fortschritt__balken" aria-hidden="true"><i></i></span>
    </div>
  </aside>
</template>
