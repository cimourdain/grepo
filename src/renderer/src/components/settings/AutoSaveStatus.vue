<!--
  What a form that saves by itself is doing, in one line: "Saving…", "Saved.", why an invalid
  input wasn't saved ("Not saved yet: …"), or the error of a failed save. Nothing when idle.

  Usage:
    <AutoSaveStatus :status="autoSave.status.value" :message="autoSave.message.value" />
-->
<template>
  <p v-if="status === 'saving'" class="auto-save auto-save--saving" role="status">Saving…</p>
  <p v-else-if="status === 'saved'" class="auto-save auto-save--saved" role="status">Saved.</p>
  <p v-else-if="status === 'invalid'" class="auto-save auto-save--invalid" role="status">
    Not saved yet: {{ message }}
  </p>
  <p v-else-if="status === 'error'" class="auto-save auto-save--error" role="alert">
    {{ message }}
  </p>
</template>

<script setup lang="ts">
import type { AutoSaveStatus } from '../../settings/use-auto-save'

defineProps<{
  status: AutoSaveStatus
  /** The reason of an invalid input or a failure. */
  message: string
}>()
</script>

<style scoped>
.auto-save {
  margin: 0;
  font-size: 0.9em;
}

.auto-save--saving {
  color: var(--color-text-muted);
}

.auto-save--saved {
  color: var(--color-success);
}

.auto-save--invalid {
  color: var(--color-warning);
}

.auto-save--error {
  color: var(--color-danger);
}
</style>
