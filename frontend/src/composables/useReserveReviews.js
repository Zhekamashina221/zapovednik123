import { computed, ref, toValue } from 'vue'
import api from '@/services/api'

export function useReserveReviews(id) {
  const reviews = ref([])
  const reviewsLoading = ref(false)
  const reviewsError = ref('')
  const reviewSubmitting = ref(false)
  const reviewSubmitError = ref('')
  const reviewForm = ref({
    rating: 5,
    comment: '',
  })

  const canSubmitReview = computed(() => {
    const length = reviewForm.value.comment.trim().length
    return reviewForm.value.rating >= 1 && reviewForm.value.rating <= 5 && length >= 10 && length <= 2000
  })

  async function loadReviews() {
    const rid = toValue(id)
    reviewsLoading.value = true
    reviewsError.value = ''
    try {
      const { data } = await api.getReserveReviews(rid)
      reviews.value = data.data || []
    } catch (err) {
      reviewsError.value = 'Не удалось загрузить отзывы'
      reviews.value = []
    } finally {
      reviewsLoading.value = false
    }
  }

  async function submitReview(isLoggedIn, onAuthRequired) {
    if (!isLoggedIn) {
      onAuthRequired()
      return
    }
    if (!canSubmitReview.value) {
      reviewSubmitError.value = 'Оценка и отзыв (минимум 10 символов) обязательны.'
      return
    }

    reviewSubmitting.value = true
    reviewSubmitError.value = ''
    try {
      const rid = toValue(id)
      await api.createReserveReview(rid, {
        rating: reviewForm.value.rating,
        comment: reviewForm.value.comment.trim(),
      })
      reviewForm.value.comment = ''
      reviewForm.value.rating = 5
      await loadReviews()
      return { ok: true, message: 'Отзыв успешно отправлен' }
    } catch (err) {
      reviewSubmitError.value = err?.response?.data?.error || 'Не удалось отправить отзыв'
      return { ok: false, message: reviewSubmitError.value }
    } finally {
      reviewSubmitting.value = false
    }
  }

  return {
    reviews,
    reviewsLoading,
    reviewsError,
    reviewSubmitting,
    reviewSubmitError,
    reviewForm,
    canSubmitReview,
    loadReviews,
    submitReview,
  }
}
