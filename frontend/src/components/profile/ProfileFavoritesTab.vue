<template>
  <section class="profile-panel">
    <h1 class="profile-panel__title">Избранное</h1>
    <p v-if="favoritesError" class="profile-error">{{ favoritesError }}</p>
    <p v-if="loadingFavorites" class="profile-muted">Загружаем избранное...</p>
    <p v-else-if="!favorites.length" class="profile-muted">У вас пока нет избранных объектов.</p>
    <div v-else class="profile-grid">
      <ReserveCard v-for="item in favorites" :key="item.id" :reserve="item" @toggle-favorite="$emit('remove-favorite', item.id)" />
    </div>
  </section>
</template>

<script setup>
import ReserveCard from '@/components/main/ReserveCard.vue'

defineProps({
  favorites: { type: Array, default: () => [] },
  loadingFavorites: { type: Boolean, default: false },
  favoritesError: { type: String, default: '' },
})

defineEmits(['remove-favorite'])
</script>
