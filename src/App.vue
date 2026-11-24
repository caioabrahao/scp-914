<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar-brand">
        <span>SCP</span>
        <strong>914</strong>
      </div>
      <nav class="sidebar-nav">
        <RouterLink to="/" class="sidebar-link">
          <span class="sidebar-icon" aria-hidden="true">01</span>
          <span>Testing</span>
        </RouterLink>
        <RouterLink to="/addendums" class="sidebar-link">
          <span class="sidebar-icon" aria-hidden="true">02</span>
          <span>Archive</span>
        </RouterLink>
      </nav>
    </aside>
    <div class="main-content">
      <RouterView />
    </div>
  </div>
</template>
