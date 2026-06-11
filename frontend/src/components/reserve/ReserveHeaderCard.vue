<template>
  <header class="reserve__header">
    <div class="reserve__title-wrap">
      <h1 class="reserve__title">{{ name }}</h1>
      <div class="reserve__badges">
        <span
          :style="{
            backgroundColor: `${typeColor}18`,
            color: typeColor,
            border: `1px solid ${typeColor}`,
          }"
          class="badge badge--type"
        >
          {{ typeLabel }}
        </span>
        <span v-if="statusText" class="badge badge--status">{{ statusText }}</span>
        <span v-if="viewsCount > 0" class="badge badge--meta">Просмотры: {{ viewsCount }}</span>
        <span v-if="reviewsCount > 0" class="badge badge--meta">Отзывы: {{ reviewsCount }}</span>
      </div>
    </div>
    <div class="reserve__actions">
      <button class="reserve__share" type="button" @click="$emit('share')">
        <i aria-hidden="true" class="bi bi-share icon"></i>
        <span>Поделиться</span>
      </button>
      <button
        :class="{ 'reserve__favorite--active': isFavorite }"
        :disabled="favoriteLoading"
        class="reserve__favorite"
        type="button"
        @click="$emit('toggle-favorite')"
      >
        <i :class="['bi', isFavorite ? 'bi-heart-fill' : 'bi-heart', 'icon']" aria-hidden="true"></i>
        <span>{{ isFavorite ? 'В избранном' : 'В избранное' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  typeColor: { type: String, required: true },
  typeLabel: { type: String, required: true },
  statusText: { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
  favoriteLoading: { type: Boolean, default: false },
  viewsCount: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
})

defineEmits(['toggle-favorite', 'share'])
</script>
