<template>
  <section class="profile-panel">
    <h1 class="profile-panel__title">Отзывы</h1>
    <p v-if="commentsError" class="profile-error">{{ commentsError }}</p>
    <p v-if="loadingComments" class="profile-muted">Загружаем отзывы...</p>
    <p v-else-if="!comments.length" class="profile-muted">Вы ещё не оставляли отзывы.</p>

    <ul v-else class="comments-list">
      <li v-for="comment in comments" :key="comment.id" class="comment-card">
        <div class="comment-card__head">
          <router-link class="comment-card__reserve" :to="`/reserve/${comment.reserve_id}`">
            {{ comment.reserve_name }}
          </router-link>
          <span class="comment-card__rating">{{ '★'.repeat(comment.rating) }}{{ '☆'.repeat(5 - comment.rating) }}</span>
        </div>
        <p class="comment-card__text">{{ comment.comment }}</p>
        <div class="comment-card__footer">
          <div class="comment-card__meta">
            <small>{{ formatDate(comment.created_at) }}</small>
            <span v-if="comment.status" :class="['comment-card__status', `comment-card__status--${comment.status}`]">
              {{ reviewStatusLabel(comment.status) }}
            </span>
          </div>
          <button
            :disabled="deletingCommentId === comment.id"
            class="app-btn app-btn--danger"
            type="button"
            @click="$emit('delete-comment', comment.id)"
          >
            {{ deletingCommentId === comment.id ? 'Удаляем...' : 'Удалить' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
defineProps({
  comments: { type: Array, default: () => [] },
  loadingComments: { type: Boolean, default: false },
  commentsError: { type: String, default: '' },
  deletingCommentId: { type: Number, default: null },
  formatDate: { type: Function, required: true },
})

defineEmits(['delete-comment'])

const reviewStatusLabels = {
  pending: 'На модерации',
  approved: 'Опубликован',
  hidden: 'Скрыт',
  rejected: 'Отклонён',
}

function reviewStatusLabel(status) {
  return reviewStatusLabels[String(status || '').toLowerCase()] || status
}
</script>
