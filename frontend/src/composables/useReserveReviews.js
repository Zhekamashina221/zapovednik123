import { computed, ref, toValue } from 'vue'
import api from '@/services/api'

export function useReserveReviews(id) {
  const reviews = ref([])
  const userReview = ref(null)
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

  async function loadUserReview() {
    const rid = toValue(id)
    try {
      const { data } = await api.getMyReviews()
      userReview.value =
        (data.data || []).find((review) => String(review.reserve_id) === String(rid)) || null
    } catch {
      userReview.value = null
    }
  }

  async function loadReviews(isLoggedIn = false) {
    const rid = toValue(id)
    reviewsLoading.value = true
    reviewsError.value = ''
    try {
      const requests = [api.getReserveReviews(rid)]
      if (isLoggedIn) {
        requests.push(loadUserReview())
      } else {
        userReview.value = null
      }
      const [{ data }] = await Promise.all(requests)
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
      const { data } = await api.createReserveReview(rid, {
        rating: reviewForm.value.rating,
        comment: reviewForm.value.comment.trim(),
      })
      reviewForm.value.comment = ''
      reviewForm.value.rating = 5
      userReview.value = data.data || null
      await loadReviews(true)
      return { ok: true, message: 'Отзыв отправлен на модерацию' }
    } catch (err) {
      reviewSubmitError.value = err?.response?.data?.error || 'Не удалось отправить отзыв'
      return { ok: false, message: reviewSubmitError.value }
    } finally {
      reviewSubmitting.value = false
    }
  }

  return {
    reviews,
    userReview,
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
