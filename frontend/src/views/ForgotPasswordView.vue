<template>
  <div class="auth-page container">
    <div class="auth-card card-surface">
      <form class="auth-form" @submit.prevent="submit">
        <h1 class="auth-title">Забыли пароль?</h1>
        <p class="auth-subtitle">
          Укажите email аккаунта — отправим ссылку для установки нового пароля.
        </p>

        <input v-model="email" class="app-input" placeholder="Email" required type="email" />

        <button :disabled="loading" class="app-btn app-btn--primary auth-submit" type="submit">
          {{ loading ? 'Отправка...' : 'Отправить ссылку' }}
        </button>

        <router-link class="auth-back-link" to="/login">Вернуться ко входу</router-link>

        <p v-if="error" class="auth-error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const email = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function submit() {
  error.value = ''
  if (!email.value || !/.+@.+\..+/.test(email.value)) {
    error.value = 'Введите корректный email'
    return
  }

  loading.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    router.push({ path: '/forgot-password-sent', query: { email: email.value } })
  } catch (e) {
    error.value = e.response?.data?.error || 'Не удалось отправить письмо'
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
}

.auth-back-link {
  color: #2e8b57;
  font-weight: 600;
  text-decoration: none;
  margin-top: 4px;
}

.auth-back-link:hover {
  text-decoration: underline;
}

.auth-error {
  color: #d9534f;
  margin: 2px 0 0;
  font-weight: 500;
}
</style>
