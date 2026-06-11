<script setup>
import TheHeader from '@/components/header/TheHeader.vue'
import AppToast from '@/components/common/AppToast.vue'
</script>

<template>
  <TheHeader />
  <main class="main-content">
    <router-view />
  </main>
  <AppToast />
</template>

<style scoped lang="scss">
.main-content {
  min-height: calc(100vh - $header-height);
}
</style>
