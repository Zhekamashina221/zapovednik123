<template>
  <section class="reserve__reviews">
    <div class="section-controls">
      <h2 class="section-title">Комментарии</h2>
    </div>

    <div class="reviews-card">
      <form v-if="isLoggedIn" class="review-form" @submit.prevent="$emit('submit-review')">
        <div class="review-stars" aria-label="Выбор оценки от 1 до 5" role="radiogroup">
          <button
            v-for="star in 5"
            :key="star"
            :aria-checked="localForm.rating === star ? 'true' : 'false'"
            :aria-label="`Оценка ${star}`"
            :class="{ active: star <= localForm.rating }"
            class="review-star-btn"
            role="radio"
            type="button"
            @click="localForm.rating = star"
          >
            ★
          </button>
          <span class="review-stars__value">{{ localForm.rating }}/5</span>
        </div>
        <label class="review-form__label">
          <textarea
            v-model.trim="localForm.comment"
            aria-describedby="review-help review-count"
            class="review-form__input"
            maxlength="2000"
            placeholder="Оставьте комментарий..."
            rows="4"
          />
        </label>
        <div class="review-form__meta">
          <p id="review-help" class="reviews-empty">Минимум 10 символов.</p>
          <p id="review-count" class="reviews-empty">{{ localForm.comment.length }}/2000</p>
        </div>
        <p v-if="reviewSubmitError" class="review-form__error">{{ reviewSubmitError }}</p>
        <button :disabled="reviewSubmitting || !canSubmitReview" class="review-form__submit" type="submit">
          {{ reviewSubmitting ? 'Публикация...' : 'Опубликовать комментарий' }}
        </button>
      </form>
      <div v-else class="reviews-auth-cta">
        <p>Только авторизованные пользователи могут оставлять отзывы.</p>
        <button class="review-form__submit" type="button" @click="$emit('go-login')">Войти</button>
      </div>

      <p v-if="reviewsLoading" class="reviews-empty">Загружаем комментарии...</p>
      <p v-else-if="reviewsError" class="reviews-empty">{{ reviewsError }}</p>
      <p v-else-if="!reviews.length" class="reviews-empty">Пока нет комментариев. Будьте первым.</p>

      <ul v-else class="reviews-list">
        <li v-for="review in reviews" :key="review.id" class="reviews-item">
          <div class="reviews-item__header">
            <div class="reviews-item__identity">
              <strong>{{ review.user_name || `Пользователь #${review.user_id}` }}</strong>
              <small>{{ formatReviewDate(review.created_at) }}</small>
            </div>
            <span class="reviews-item__stars" :aria-label="`Оценка ${review.rating} из 5`">
              {{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}
            </span>
          </div>
          <p class="reviews-item__comment">{{ review.comment }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isLoggedIn: { type: Boolean, default: false },
  reviewForm: { type: Object, required: true },
  canSubmitReview: { type: Boolean, default: false },
  reviewSubmitting: { type: Boolean, default: false },
  reviewSubmitError: { type: String, default: '' },
  reviews: { type: Array, default: () => [] },
  reviewsLoading: { type: Boolean, default: false },
  reviewsError: { type: String, default: '' },
  formatReviewDate: { type: Function, required: true },
})

defineEmits(['submit-review', 'go-login'])

const localForm = computed({
  get: () => props.reviewForm,
  set: () => {},
})
</script>
