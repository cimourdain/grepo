<!--
  The About page: the application's name and version (the version is that of `package.json`, put
  in the build as `__APP_VERSION__`).
-->
<template>
  <section class="about-page">
    <h2>About</h2>
    <p class="about-name">Grepo</p>
    <p class="about-version">Version {{ appVersion }}</p>
  </section>
</template>

<script setup lang="ts">
const appVersion = __APP_VERSION__
</script>

<style scoped>
.about-page {
  padding: 20px 24px;
}

.about-page h2 {
  margin-top: 0;
}

.about-name {
  margin: 0;
  font-size: 1.6em;
  font-weight: 600;
}

.about-version {
  margin: 4px 0 0;
  color: var(--color-text-muted);
}
</style>
