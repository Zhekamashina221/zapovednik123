<template>
  <section class="profile-panel">
    <h1 class="profile-panel__title">Комментарии</h1>
    <p v-if="commentsError" class="profile-error">{{ commentsError }}</p>
    <p v-if="loadingComments" class="profile-muted">Загружаем комментарии...</p>
    <p v-else-if="!comments.length" class="profile-muted">Вы еще не оставляли комментарии.</p>

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
          <small>{{ formatDate(comment.created_at) }}</small>
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
</script>
