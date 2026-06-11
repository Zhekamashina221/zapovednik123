<template>
  <div class="auth-page container">
    <div class="auth-card card-surface verify-card">
      <template v-if="loading">
        <h1 class="auth-title">Подтверждение email</h1>
        <p class="auth-subtitle">Проверяем ссылку...</p>
      </template>

      <template v-else-if="success">
        <h1 class="auth-title">Готово</h1>
        <p class="auth-subtitle">{{ successMessage }}</p>
        <router-link class="app-btn app-btn--primary auth-submit" to="/">На главную</router-link>
      </template>

      <template v-else>
        <h1 class="auth-title">Не удалось подтвердить</h1>
        <p class="auth-subtitle">{{ error }}</p>
        <router-link
          v-if="email"
          class="app-btn app-btn--primary auth-submit"
          :to="{ path: '/verify-email-sent', query: { email } }"
        >
          Запросить письмо повторно
        </router-link>
        <router-link class="verify-link" to="/login">Войти</router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const success = ref(false)
const error = ref('')
const successMessage = ref('')
const email = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    loading.value = false
    error.value = 'Ссылка недействительна.'
    return
  }

  try {
    const res = await api.get('/auth/verify-email', { params: { token } })
    const data = res.data.data

    if (data.already_verified) {
      success.value = true
      successMessage.value = data.message || 'Email уже подтверждён. Войдите в аккаунт.'
      setTimeout(() => router.push('/login'), 2500)
      return
    }

    auth.setSession(data.token, data.refresh_token)
    auth.user = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      email_verified: true,
    }
    success.value = true
    successMessage.value = data.message || 'Email подтверждён. Добро пожаловать!'
    setTimeout(() => router.push('/'), 2000)
  } catch (e) {
    error.value = e.response?.data?.error || 'Ссылка недействительна или устарела.'
    email.value = route.query.email || ''
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.verify-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 20px;
  text-align: center;
}

.auth-title {
  color: #2e8b57;
  margin: 0 0 8px;
  font-size: 1.6rem;
}

.auth-subtitle {
  margin: 0 0 20px;
  color: #667085;
  line-height: 1.5;
}

.verify-link {
  display: inline-block;
  margin-top: 12px;
  color: #2e8b57;
  font-weight: 600;
  text-decoration: none;
}

.auth-page {
  min-height: calc(100vh - $header-height);
  display: grid;
  place-items: center;
  padding: 24px 0;
}

.auth-submit {
  display: inline-flex;
  justify-content: center;
  width: 100%;
  text-decoration: none;
}
</style>
