<template>
  <div class="auth-page container">
    <div class="auth-card card-surface">
      <form v-if="token" class="auth-form" @submit.prevent="submit">
        <h1 class="auth-title">Новый пароль</h1>
        <p class="auth-subtitle">Придумайте новый пароль для входа в аккаунт.</p>

        <input
          v-model="password"
          class="app-input"
          placeholder="Новый пароль (минимум 6 символов)"
          required
          type="password"
          autocomplete="new-password"
        />
        <input
          v-model="passwordConfirm"
          class="app-input"
          placeholder="Повторите пароль"
          required
          type="password"
          autocomplete="new-password"
        />

        <button :disabled="loading" class="app-btn app-btn--primary auth-submit" type="submit">
          {{ loading ? 'Сохранение...' : 'Сохранить пароль' }}
        </button>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="success" class="auth-success">{{ success }}</p>
      </form>

      <div v-else class="auth-form">
        <h1 class="auth-title">Ссылка недействительна</h1>
        <p class="auth-subtitle">Запросите сброс пароля заново.</p>
        <router-link class="app-btn app-btn--primary auth-submit" to="/forgot-password">
          Забыли пароль?
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.query.token || '')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  success.value = ''

  if (password.value.length < 6) {
    error.value = 'Пароль должен быть минимум 6 символов'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'Пароли не совпадают'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/reset-password', {
      token: token.value,
      password: password.value,
    })
    success.value = res.data.data?.message || 'Пароль изменён'
    setTimeout(() => router.push('/login'), 2000)
  } catch (e) {
    error.value = e.response?.data?.error || 'Не удалось сменить пароль'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: calc(100vh - $header-height);
  display: grid;
  place-items: center;
  padding: 24px 0;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 10px;
}

.auth-form {
  padding: 20px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-title {
  color: #2e8b57;
  margin: 0;
  font-size: 1.6rem;
}

.auth-subtitle {
  margin: 0 0 4px;
  color: #667085;
  line-height: 1.5;
}

.auth-submit {
  width: 100%;
  margin-top: 4px;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.auth-error {
  color: #d9534f;
  margin: 2px 0 0;
  font-weight: 500;
}

.auth-success {
  color: #2e8b57;
  margin: 2px 0 0;
  font-weight: 500;
}
</style>
