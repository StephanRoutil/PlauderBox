<script setup lang="ts">
withDefaults(defineProps<{ titel?: string }>(), { titel: 'PlauderBox' })

const version = __PLAUDERBOX_VERSION__
const iconPfad = '/icon.svg'
</script>

<template>
  <div class="mobile-brand">
    <img class="mobile-brand__mark" :src="iconPfad" alt="" aria-hidden="true" />
    <span class="mobile-brand__text">
      <strong>{{ titel }}</strong>
      <small>v{{ version }}</small>
    </span>
  </div>
</template>
