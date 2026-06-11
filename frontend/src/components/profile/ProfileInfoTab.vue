<template>
  <section class="profile-panel">
    <h1 class="profile-panel__title">Основная информация</h1>

    <div class="profile-card">
      <h2 class="profile-card__title">Личные данные</h2>
      <p v-if="profileError" class="profile-error">{{ profileError }}</p>
      <p v-if="profileMessage" class="profile-success">{{ profileMessage }}</p>

      <form class="profile-form" @submit.prevent="$emit('save-profile')">
        <input
          v-model="localProfileForm.name"
          :disabled="!editMode || savingProfile"
          class="app-input"
          placeholder="Имя"
        />
        <input
          v-model="localProfileForm.email"
          :disabled="!editMode || savingProfile"
          class="app-input"
          placeholder="Email"
          type="email"
        />
        <div class="profile-actions">
          <button
            v-if="!editMode"
            class="app-btn app-btn--secondary"
            type="button"
            @click="$emit('set-edit-mode', true)"
          >
            Изменить данные
          </button>
          <template v-else>
            <button
              :disabled="savingProfile || !hasProfileChanges"
              class="app-btn app-btn--primary"
              type="submit"
            >
              {{ savingProfile ? 'Сохранение...' : 'Сохранить' }}
            </button>
            <button class="app-btn app-btn--ghost" type="button" @click="$emit('cancel-edit')">
              Отмена
            </button>
          </template>
        </div>
      </form>
    </div>

    <div class="profile-card">
      <h2 class="profile-card__title">Смена пароля</h2>
      <form class="profile-form" @submit.prevent="onChangePassword">
        <input
          v-model="passwordForm.current_password"
          :disabled="changingPassword"
          class="app-input"
          placeholder="Текущий пароль"
          type="password"
        />
        <input
          v-model="passwordForm.new_password"
          :disabled="changingPassword"
          class="app-input"
          placeholder="Новый пароль (минимум 6 символов)"
          type="password"
        />
        <p v-if="localPasswordError || passwordError" class="profile-error">
          {{ localPasswordError || passwordError }}
        </p>
        <p v-if="passwordMessage" class="profile-success">{{ passwordMessage }}</p>
        <div class="profile-actions">
          <button :disabled="changingPassword" class="app-btn app-btn--secondary" type="submit">
            {{ changingPassword ? 'Обновляем...' : 'Изменить пароль' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  profileForm: { type: Object, required: true },
  editMode: { type: Boolean, default: false },
  savingProfile: { type: Boolean, default: false },
  changingPassword: { type: Boolean, default: false },
  hasProfileChanges: { type: Boolean, default: false },
  profileError: { type: String, default: '' },
  profileMessage: { type: String, default: '' },
  passwordError: { type: String, default: '' },
  passwordMessage: { type: String, default: '' },
})

const emit = defineEmits(['save-profile', 'change-password', 'cancel-edit', 'set-edit-mode'])

const passwordForm = ref({
  current_password: '',
  new_password: '',
})
const localPasswordError = ref('')

const localProfileForm = computed({
  get: () => props.profileForm,
  set: () => {},
})

watch(
  () => props.passwordMessage,
  (message) => {
    if (message) {
      passwordForm.value = { current_password: '', new_password: '' }
    }
  },
)

const onChangePassword = () => {
  localPasswordError.value = ''
  if (!passwordForm.value.current_password || !passwordForm.value.new_password) {
    localPasswordError.value = 'Заполните текущий и новый пароль.'
    return
  }
  if (passwordForm.value.new_password.length < 6) {
    localPasswordError.value = 'Новый пароль должен быть не короче 6 символов.'
    return
  }
  emit('change-password', { ...passwordForm.value })
}
</script>
