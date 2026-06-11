<template>
  <aside class="profile-sidebar">
    <h2 class="profile-sidebar__title">Профиль</h2>
    <nav class="profile-sidebar__nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        class="profile-sidebar__link"
        type="button"
        @click="$emit('change-tab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <button class="app-btn app-btn--danger profile-sidebar__logout" @click="$emit('logout')">
      <i class="bi bi-box-arrow-right"></i>
      Выйти
    </button>
  </aside>
</template>

<script setup>
defineProps({
  tabs: { type: Array, required: true },
  activeTab: { type: String, required: true },
})

defineEmits(['change-tab', 'logout'])
</script>
