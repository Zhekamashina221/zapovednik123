<template>
  <section class="reserve-reviews">
    <header class="reserve-reviews__header">
      <h2 class="reserve-reviews__title">{{ reviewsTitle }}</h2>
      <div v-if="hasRatingSummary" class="reserve-reviews__summary">
        <div class="reserve-reviews__rating">
          <span class="reserve-reviews__rating-value">{{ displayAvgRating }}</span>
          <span aria-hidden="true" class="reserve-reviews__rating-star">★</span>
        </div>
        <p class="reserve-reviews__rating-meta">на основе {{ ratingCount }} {{ ratingsWord }}</p>
      </div>
    </header>

    <div v-if="isLoggedIn && userReview" class="reviews-user-notice">
      <p>{{ userReviewNotice }}</p>
    </div>

    <form v-else-if="isLoggedIn" class="review-form" @submit.prevent="$emit('submit-review')">
      <textarea
        v-model.trim="localForm.comment"
        :aria-describedby="reviewHintId"
        class="review-form__input"
        maxlength="2000"
        placeholder="Напишите отзыв..."
        rows="3"
      />
      <div class="review-form__footer">
        <div class="review-form__footer-left">
          <div aria-label="Выбор оценки от 1 до 5" class="review-stars" role="radiogroup">
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
          </div>
          <p id="review-hint" class="review-form__hint">Минимум 10 символов</p>
        </div>
        <button
          :disabled="reviewSubmitting || !canSubmitReview"
          class="review-form__submit"
          type="submit"
        >
          {{ reviewSubmitting ? 'Публикация...' : 'Опубликовать' }}
        </button>
      </div>
      <p v-if="reviewSubmitError" id="review-error" class="review-form__error">
        {{ reviewSubmitError }}
      </p>
    </form>

    <div v-else class="reviews-auth-cta">
      <p>Только авторизованные пользователи могут оставлять отзывы.</p>
      <button class="review-form__submit" type="button" @click="$emit('go-login')">Войти</button>
    </div>

    <p v-if="reviewsLoading" class="reviews-empty">Загружаем отзывы...</p>
    <p v-else-if="reviewsError" class="reviews-empty">{{ reviewsError }}</p>
    <p v-else-if="!reviews.length" class="reviews-empty">Пока нет отзывов. Будьте первым.</p>

    <ul v-else class="reviews-list">
      <li v-for="review in reviews" :key="review.id" class="reviews-item">
        <div
          :aria-label="review.user_name || `Пользователь #${review.user_id}`"
          class="reviews-item__avatar"
        >
          {{ avatarLetter(review.user_name || review.user_id) }}
        </div>
        <div class="reviews-item__body">
          <div class="reviews-item__top">
            <div class="reviews-item__identity">
              <strong>{{ review.user_name || `Пользователь #${review.user_id}` }}</strong>
              <div class="reviews-item__meta">
                <time :datetime="review.created_at">{{ formatReviewDate(review.created_at) }}</time>
                <span aria-hidden="true" class="reviews-item__dot" />
              </div>
            </div>
            <div :aria-label="`Оценка ${review.rating} из 5`" class="reviews-item__stars">
              <span
                v-for="star in 5"
                :key="star"
                :class="{ filled: star <= review.rating }"
                aria-hidden="true"
                class="reviews-item__star"
              >
                ★
              </span>
            </div>
          </div>
          <p class="reviews-item__comment">{{ review.comment }}</p>
        </div>
      </li>
    </ul>
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
  avgRating: { type: [Number, String], default: null },
  reviewsCount: { type: Number, default: 0 },
  userReview: { type: Object, default: null },
})

defineEmits(['submit-review', 'go-login'])

const localForm = computed({
  get: () => props.reviewForm,
  set: () => {},
})

const ratingCount = computed(() => props.reviewsCount || props.reviews.length)

const hasRatingSummary = computed(() => {
  const avg = Number(props.avgRating)
  return ratingCount.value > 0 && Number.isFinite(avg) && avg > 0
})

const displayAvgRating = computed(() => {
  const avg = Number(props.avgRating)
  return Number.isFinite(avg) ? avg.toFixed(1) : ''
})

const reviewsTitle = computed(() =>
  ratingCount.value > 0 ? `Отзывы (${ratingCount.value})` : 'Отзывы',
)

const ratingsWord = computed(() => {
  const n = ratingCount.value
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'отзыва'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'отзывов'
  return 'отзывов'
})

const reviewHintId = computed(() =>
  props.reviewSubmitError ? 'review-hint review-error' : 'review-hint',
)

const userReviewNotice = computed(() => {
  const status = String(props.userReview?.status || '').toLowerCase()
  if (status === 'pending') return 'Ваш отзыв на модерации и появится после одобрения.'
  if (status === 'rejected') return 'Ваш отзыв отклонён модератором.'
  if (status === 'hidden') return 'Ваш отзыв скрыт.'
  return 'Вы уже оставили отзыв об этом объекте.'
})

function avatarLetter(name) {
  const value = String(name ?? '').trim()
  if (!value) return '?'
  return value.charAt(0).toUpperCase()
}
</script>

<style lang="scss" scoped>
$accent: #3cb371;
$primary: #2e8b57;
$star: #f5a623;

.reserve-reviews {
  min-width: 0;
}

.reserve-reviews__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.reserve-reviews__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.reserve-reviews__summary {
  flex-shrink: 0;
  text-align: right;
}

.reserve-reviews__rating {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.2rem;
}

.reserve-reviews__rating-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.reserve-reviews__rating-star {
  color: $star;
  font-size: 1.35rem;
  line-height: 1;
}

.reserve-reviews__rating-meta {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.3;
}

.review-form {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1rem 0.85rem;
  background: #fff;
}

.review-form__input {
  width: 100%;
  min-width: 0;
  border: none;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #0f172a;
  background: transparent;
  resize: vertical;
  min-height: 4.5rem;
  overflow-wrap: anywhere;
  word-break: break-word;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
  }
}

.review-form__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}

.review-form__footer-left {
  display: grid;
  gap: 0.35rem;
}

.review-form__hint {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.3;
}

.review-stars {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.review-star-btn {
  border: none;
  background: transparent;
  color: #d1d5db;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.1rem;
  transition: color 0.15s ease;

  &:hover,
  &.active {
    color: $star;
  }
}

.review-form__submit {
  flex-shrink: 0;
  background: $accent;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: $primary;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.review-form__error {
  margin: 0;
  color: #d9534f;
  font-size: 0.86rem;
}

.reviews-auth-cta,
.reviews-user-notice {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;

  p {
    margin: 0;
    color: #64748b;
    font-size: 0.92rem;
  }
}

.reviews-user-notice {
  border-color: #dbeafe;
  background: #f8fbff;
}

.reviews-empty {
  margin: 0 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}

.reviews-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.35rem;
  min-width: 0;
}

.reviews-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  min-width: 0;
}

.reviews-item__avatar {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #1a6b5c;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.reviews-item__body {
  flex: 1;
  min-width: 0;
}

.reviews-item__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.reviews-item__identity {
  display: grid;
  gap: 0.2rem;
  min-width: 0;

  strong {
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.reviews-item__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  time {
    font-size: 0.8rem;
    color: #94a3b8;
  }
}

.reviews-item__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: $accent;
  flex-shrink: 0;
}

.reviews-item__stars {
  display: flex;
  align-items: center;
  gap: 0.05rem;
  flex-shrink: 0;
}

.reviews-item__star {
  color: #e2e8f0;
  font-size: 0.82rem;
  line-height: 1;

  &.filled {
    color: $star;
  }
}

.reviews-item__comment {
  margin: 0.45rem 0 0;
  color: #1e293b;
  font-size: 0.92rem;
  line-height: 1.5;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 767px) {
  .reserve-reviews__header {
    flex-wrap: wrap;
  }

  .reserve-reviews__title {
    font-size: 1.05rem;
  }

  .reserve-reviews__rating-value {
    font-size: 1.45rem;
  }

  .review-form__footer {
    flex-wrap: wrap;
  }

  .review-form__submit {
    margin-left: auto;
  }
}
</style>
