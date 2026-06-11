import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

export function useProfileData() {
  const auth = useAuthStore()

  const profileForm = ref({ name: '', email: '' })
  const originalProfile = ref({})
  const favorites = ref([])
  const myComments = ref([])
  const savedRoutes = ref([])

  const loadingProfile = ref(false)
  const loadingFavorites = ref(false)
  const loadingComments = ref(false)
  const loadingSavedRoutes = ref(false)
  const savingProfile = ref(false)
  const changingPassword = ref(false)
  const deletingCommentId = ref(null)
  const deletingSavedRoute = ref(false)

  const profileError = ref('')
  const favoritesError = ref('')
  const commentsError = ref('')
  const savedRoutesError = ref('')
  const profileMessage = ref('')
  const passwordMessage = ref('')

  const hasProfileChanges = computed(
    () =>
      profileForm.value.name !== (originalProfile.value.name || '') ||
      profileForm.value.email !== (originalProfile.value.email || ''),
  )

  const initializeProfileForm = () => {
    profileForm.value = {
      name: auth.user?.name || '',
      email: auth.user?.email || '',
    }
    originalProfile.value = { ...profileForm.value }
  }

  async function loadProfile() {
    loadingProfile.value = true
    profileError.value = ''
    try {
      await auth.loadProfile()
      initializeProfileForm()
    } catch (error) {
      profileError.value = error?.response?.data?.error || 'Не удалось загрузить профиль.'
    } finally {
      loadingProfile.value = false
    }
  }

  async function saveProfile() {
    savingProfile.value = true
    profileError.value = ''
    profileMessage.value = ''
    try {
      const res = await auth.updateProfile(profileForm.value)
      await auth.loadProfile()
      initializeProfileForm()
      profileMessage.value =
        res?.data?.data?.message ||
        (res?.data?.data?.needs_email_verification
          ? 'Профиль обновлён. На старый и новый email отправлены уведомления.'
          : 'Профиль обновлен.')
      return { ok: true }
    } catch (error) {
      profileError.value = error?.response?.data?.error || 'Не удалось обновить профиль.'
      return { ok: false, message: profileError.value }
    } finally {
      savingProfile.value = false
    }
  }

  async function updatePassword(payload) {
    changingPassword.value = true
    passwordMessage.value = ''
    try {
      const res = await api.changePassword(payload)
      passwordMessage.value = res?.data?.data?.message || 'Пароль успешно изменен.'
      return { ok: true, message: passwordMessage.value }
    } catch (error) {
      const message = error?.response?.data?.error || 'Не удалось изменить пароль.'
      return { ok: false, message }
    } finally {
      changingPassword.value = false
    }
  }

  async function loadFavorites() {
    loadingFavorites.value = true
    favoritesError.value = ''
    try {
      const res = await api.get('/favorites')
      favorites.value = res.data?.data || []
    } catch (error) {
      favoritesError.value = error?.response?.data?.error || 'Не удалось загрузить избранное.'
    } finally {
      loadingFavorites.value = false
    }
  }

  async function removeFromFavorites(id) {
    await api.delete(`/favorites/${id}`)
    favorites.value = favorites.value.filter((item) => item.id !== id)
  }

  async function loadMyComments() {
    loadingComments.value = true
    commentsError.value = ''
    try {
      const res = await api.getMyReviews()
      myComments.value = res.data?.data || []
    } catch (error) {
      commentsError.value = error?.response?.data?.error || 'Не удалось загрузить отзывы.'
    } finally {
      loadingComments.value = false
    }
  }

  async function loadSavedRoutes() {
    loadingSavedRoutes.value = true
    savedRoutesError.value = ''
    try {
      const res = await api.getProfileRoutes()
      savedRoutes.value = res.data?.data || []
    } catch (error) {
      savedRoutesError.value = error?.response?.data?.error || 'Не удалось загрузить маршруты.'
    } finally {
      loadingSavedRoutes.value = false
    }
  }

  async function deleteSavedRoute(routeId) {
    deletingSavedRoute.value = true
    savedRoutesError.value = ''
    try {
      await api.deleteProfileRoute(routeId)
      savedRoutes.value = savedRoutes.value.filter((r) => r.id !== routeId)
      return { ok: true }
    } catch (error) {
      const message = error?.response?.data?.error || 'Не удалось удалить маршрут.'
      savedRoutesError.value = message
      return { ok: false, message }
    } finally {
      deletingSavedRoute.value = false
    }
  }

  async function deleteMyComment(commentId) {
    deletingCommentId.value = commentId
    commentsError.value = ''
    try {
      await api.deleteMyReview(commentId)
      myComments.value = myComments.value.filter((comment) => comment.id !== commentId)
      return { ok: true, message: 'Отзыв удален.' }
    } catch (error) {
      const message = error?.response?.data?.error || 'Не удалось удалить отзыв.'
      commentsError.value = message
      return { ok: false, message }
    } finally {
      deletingCommentId.value = null
    }
  }

  return {
    profileForm,
    favorites,
    myComments,
    savedRoutes,
    loadingProfile,
    loadingFavorites,
    loadingComments,
    loadingSavedRoutes,
    savingProfile,
    changingPassword,
    deletingCommentId,
    deletingSavedRoute,
    profileError,
    favoritesError,
    commentsError,
    savedRoutesError,
    profileMessage,
    passwordMessage,
    hasProfileChanges,
    loadProfile,
    saveProfile,
    updatePassword,
    loadFavorites,
    removeFromFavorites,
    loadMyComments,
    loadSavedRoutes,
    deleteSavedRoute,
    deleteMyComment,
  }
}
