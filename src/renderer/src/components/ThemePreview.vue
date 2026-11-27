<!--
  A miniature of the app painted with a theme's own variables, set on the box
  itself so that the theme isn't applied to the rest of the app: a background, a
  sidebar, a card with text lines, an accent button and the status colors.

  Usage:
    <ThemePreview :variables="includedThemePreviewVariables('light')" />
-->
<template>
  <span class="theme-preview" :style="variables" aria-hidden="true">
    <span class="preview-sidebar"></span>
    <span class="preview-body">
      <span class="preview-card">
        <span class="preview-line preview-line--text"></span>
        <span class="preview-line preview-line--muted"></span>
      </span>
      <span class="preview-dots">
        <span class="preview-accent"></span>
        <span class="preview-dot preview-dot--success"></span>
        <span class="preview-dot preview-dot--warning"></span>
        <span class="preview-dot preview-dot--danger"></span>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  /** The theme's variables, by name (`--color-text`…). */
  variables: Record<string, string>
}>()
</script>

<style scoped>
.theme-preview {
  display: flex;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.preview-sidebar {
  width: 22%;
  background: var(--color-surface-raised);
  border-right: 1px solid var(--color-border);
}

.preview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.preview-line {
  height: 4px;
  border-radius: 2px;
}

.preview-line--text {
  width: 70%;
  background: var(--color-text);
}

.preview-line--muted {
  width: 45%;
  background: var(--color-text-subtle);
}

.preview-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-accent {
  width: 28px;
  height: 10px;
  border-radius: 3px;
  background: var(--color-accent);
}

.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.preview-dot--success {
  background: var(--color-success);
}

.preview-dot--warning {
  background: var(--color-warning);
}

.preview-dot--danger {
  background: var(--color-danger);
}
</style>
