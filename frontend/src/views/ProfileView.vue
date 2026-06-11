<template>
  <div class="profile-layout container">
    <ProfileSidebarTabs
      :active-tab="activeTab"
      :tabs="tabs"
      @logout="showLogoutModal = true"
      @change-tab="setTab"
    />

    <section class="profile-content">
      <div v-if="auth.user && !auth.user.email_verified" class="profile-verify-banner" role="alert">
        <p>
          Email не подтверждён. Избранное, отзывы и маршруты недоступны до подтверждения.
          <router-link :to="{ path: '/verify-email-sent', query: { email: auth.user.email } }">
            Отправить письмо повторно
          </router-link>
        </p>
      </div>

      <ProfileInfoTab
        v-if="activeTab === 'info'"
        :changing-password="changingPassword"
        :edit-mode="editMode"
        :has-profile-changes="hasProfileChanges"
        :password-error="passwordError"
        :password-message="passwordMessage"
        :profile-error="profileError"
        :profile-form="profileForm"
        :profile-message="profileMessage"
        :saving-profile="savingProfile"
        @cancel-edit="cancelEdit"
        @change-password="onChangePassword"
        @save-profile="showSaveModal = true"
        @set-edit-mode="editMode = $event"
      />

      <ProfileFavoritesTab
        v-else-if="activeTab === 'favorites'"
        :favorites="favorites"
        :favorites-error="favoritesError"
        :loading-favorites="loadingFavorites"
        @remove-favorite="onRemoveFavorite"
      />

      <ProfileRoutesTab
        v-else-if="activeTab === 'routes'"
        :deleting="deletingSavedRoute"
        :loading-routes="loadingSavedRoutes"
        :routes="savedRoutes"
        :routes-error="savedRoutesError"
        @delete-route="onDeleteSavedRoute"
      />

      <ProfileCommentsTab
        v-else-if="activeTab === 'comments'"
        :comments="myComments"
        :comments-error="commentsError"
        :deleting-comment-id="deletingCommentId"
        :format-date="formatReviewDate"
        :loading-comments="loadingComments"
        @delete-comment="requestCommentDelete"
      />
    </section>

    <div v-if="showSaveModal" class="modal-overlay">
      <div class="modal">
        <h3>Сохранить изменения?</h3>
        <div class="modal-actions">
          <button :disabled="savingProfile" class="app-btn app-btn--primary" @click="onSaveProfile">
            Да
          </button>
          <button class="app-btn app-btn--ghost" @click="showSaveModal = false">Отмена</button>
        </div>
      </div>
    </div>

    <div v-if="showLogoutModal" class="modal-overlay">
      <div class="modal">
        <h3>Вы действительно хотите выйти?</h3>
        <div class="modal-actions">
          <button class="app-btn app-btn--danger" @click="onLogout">Да</button>
          <button class="app-btn app-btn--ghost" @click="showLogoutModal = false">Отмена</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteCommentModal" class="modal-overlay">
      <div class="modal">
        <h3>Удалить отзыв?</h3>
        <div class="modal-actions">
          <button class="app-btn app-btn--danger" @click="confirmDeleteComment">Удалить</button>
          <button class="app-btn app-btn--ghost" @click="closeDeleteCommentModal">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ProfileSidebarTabs from '@/components/profile/ProfileSidebarTabs.vue'
import ProfileInfoTab from '@/components/profile/ProfileInfoTab.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue'
import ProfileRoutesTab from '@/components/profile/ProfileRoutesTab.vue'
import { useProfileData } from '@/composables/useProfileData'
import { formatReviewDate } from '@/utils/reserveFormatters'

const auth = useAuthStore()
const tabs = [
  { id: 'info', label: 'Основная информация' },
  { id: 'favorites', label: 'Избранное' },
  { id: 'routes', label: 'Маршруты' },
  { id: 'comments', label: 'Отзывы' },
]
const activeTab = ref('info')
const editMode = ref(false)
const showSaveModal = ref(false)
const showLogoutModal = ref(false)
const showDeleteCommentModal = ref(false)
const commentToDelete = ref(null)
const passwordError = ref('')
const favoritesLoaded = ref(false)
const routesLoaded = ref(false)
const commentsLoaded = ref(false)

const {
  profileForm,
  favorites,
  savedRoutes,
  myComments,
  loadingFavorites,
  loadingSavedRoutes,
  loadingComments,
  savingProfile,
  changingPassword,
  deletingCommentId,
  profileError,
  favoritesError,
  savedRoutesError,
  commentsError,
  profileMessage,
  passwordMessage,
  hasProfileChanges,
  loadProfile,
  saveProfile,
  updatePassword,
  loadFavorites,
  removeFromFavorites,
  loadSavedRoutes,
  deleteSavedRoute,
  loadMyComments,
  deleteMyComment,
  deletingSavedRoute,
} = useProfileData()

const cancelEdit = () => {
  loadProfile()
  editMode.value = false
}

const setTab = async (tab) => {
  activeTab.value = tab
  if (tab === 'favorites' && !favoritesLoaded.value) {
    await loadFavorites()
    favoritesLoaded.value = true
  }
  if (tab === 'routes' && !routesLoaded.value) {
    await loadSavedRoutes()
    routesLoaded.value = true
  }
  if (tab === 'comments' && !commentsLoaded.value) {
    await loadMyComments()
    commentsLoaded.value = true
  }
}

const onSaveProfile = async () => {
  showSaveModal.value = false
  const result = await saveProfile()
  if (result.ok) {
    editMode.value = false
  }
}

const onChangePassword = async (payload) => {
  passwordError.value = ''
  const result = await updatePassword(payload)
  if (!result.ok) {
    passwordError.value = result.message
  }
}

const onRemoveFavorite = async (id) => {
  await removeFromFavorites(id)
}

const onDeleteSavedRoute = async (id) => {
  await deleteSavedRoute(id)
}

const requestCommentDelete = (commentId) => {
  commentToDelete.value = commentId
  showDeleteCommentModal.value = true
}

const closeDeleteCommentModal = () => {
  showDeleteCommentModal.value = false
  commentToDelete.value = null
}

const confirmDeleteComment = async () => {
  if (!commentToDelete.value) return
  await deleteMyComment(commentToDelete.value)
  closeDeleteCommentModal()
}

const onLogout = async () => {
  showLogoutModal.value = false
  await auth.logout()
}

onMounted(async () => {
  await loadProfile()
})
</script>

<style lang="scss" scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  padding-top: 20px;
  padding-bottom: 24px;
}

.profile-content {
  min-width: 0;
}

.profile-verify-banner {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff8e6;
  border: 1px solid #f0d78c;

  p {
    margin: 0;
    color: #5c4a1f;
    line-height: 1.45;
  }

  a {
    color: #2e8b57;
    font-weight: 600;
    margin-left: 4px;
  }
}

:deep(.profile-sidebar) {
  background-color: #fff;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: calc($header-height + 16px);
}

:deep(.profile-sidebar__title) {
  margin: 0 0 12px;
  color: #2e8b57;
}

:deep(.profile-sidebar__nav) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.profile-sidebar__link) {
  text-decoration: none;
  color: #344054;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

:deep(.profile-sidebar__link.active) {
  background: #e6f7ee;
  color: #1f6b42;
}

:deep(.profile-sidebar__logout) {
  margin-top: 14px;
  width: 100%;
}

:deep(.profile-panel__title) {
  margin: 0 0 16px;
  color: #2e8b57;
}

:deep(.profile-card) {
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

:deep(.profile-card__title) {
  margin: 0 0 12px;
}

:deep(.profile-form) {
  display: grid;
  gap: 10px;
}

:deep(.profile-actions) {
  display: flex;
  gap: 10px;
}

:deep(.profile-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

:deep(.profile-muted) {
  color: #667085;
}

:deep(.profile-error) {
  color: #d9534f;
  margin: 0 0 8px;
}

:deep(.profile-success) {
  color: #1f6b42;
  margin: 0 0 8px;
}

:deep(.comments-list) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

:deep(.comment-card) {
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  padding: 14px;
  min-width: 0;
}

:deep(.comment-card__head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

:deep(.comment-card__reserve) {
  color: #2e8b57;
  font-weight: 700;
  text-decoration: none;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

:deep(.comment-card__reserve:hover) {
  text-decoration: underline;
}

:deep(.comment-card__rating) {
  flex-shrink: 0;
  color: #f5b942;
  white-space: nowrap;
}

:deep(.comment-card__text) {
  margin: 10px 0;
  color: #344054;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

:deep(.comment-card__footer) {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

:deep(.comment-card__meta) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

:deep(.comment-card__status) {
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

:deep(.comment-card__status--pending) {
  background: #fff4d9;
  color: #b8860b;
}

:deep(.comment-card__status--approved) {
  background: #e6f3ec;
  color: #2e8b57;
}

:deep(.comment-card__status--hidden),
:deep(.comment-card__status--rejected) {
  background: #fee4e2;
  color: #b42318;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal {
  background: white;
  padding: 25px;
  border-radius: 14px;
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
    gap: 14px;
    padding-top: 14px;
    padding-bottom: 20px;
  }

  :deep(.profile-sidebar) {
    position: static;
    padding: 12px;
  }

  :deep(.profile-sidebar__nav) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 6px;
    padding-bottom: 2px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  :deep(.profile-sidebar__link) {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 8px 12px;
    font-size: 0.88rem;
  }

  :deep(.profile-sidebar__logout) {
    margin-top: 10px;
  }

  :deep(.profile-grid) {
    grid-template-columns: 1fr;
  }

  :deep(.profile-actions) {
    flex-wrap: wrap;
  }

  :deep(.profile-card) {
    padding: 14px;
  }

  :deep(.comment-card__footer) {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .modal {
    width: calc(100% - 32px);
    max-width: none;
    margin: 0 16px;
    padding: 20px 16px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 10px;

    .app-btn {
      width: 100%;
    }
  }
}
</style>
