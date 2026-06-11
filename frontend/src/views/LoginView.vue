<template>
  <div class="auth-page container">
    <div class="auth-card card-surface">
      <div class="auth-toggle">
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': mode === 'login' }"
          @click="mode = 'login'"
        >
          Вход
        </button>
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': mode === 'register' }"
          @click="mode = 'register'"
        >
          Регистрация
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <h1 class="auth-title">{{ mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт' }}</h1>
        <p class="auth-subtitle">
          {{
            mode === 'login'
              ? 'Войдите, чтобы сохранять избранное и управлять профилем.'
              : 'Зарегистрируйтесь, чтобы получить доступ к персональным возможностям.'
          }}
        </p>

        <input v-model="form.email" class="app-input" placeholder="Email" required type="email" />
        <input
          v-model="form.password"
          class="app-input"
          placeholder="Пароль (минимум 6 символов)"
          required
          type="password"
        />
        <input
          v-if="mode === 'register'"
          v-model="form.name"
          class="app-input"
          placeholder="Имя"
          type="text"
        />

        <button :disabled="loading" class="app-btn app-btn--primary auth-submit" type="submit">
          {{ loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}
        </button>

        <router-link v-if="mode === 'login'" class="auth-forgot-link" to="/forgot-password">
          Забыли пароль?
        </router-link>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <p v-if="unverifiedEmail" class="auth-unverified">
          Email не подтверждён.
          <router-link :to="{ path: '/verify-email-sent', query: { email: unverifiedEmail } }">
            Отправить письмо повторно
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const mode = ref('login')
const form = ref({ email: '', password: '', name: '' })
const error = ref('')
const unverifiedEmail = ref('')
const loading = ref(false)
const router = useRouter()
const auth = useAuthStore()

function validate() {
  if (!form.value.email || !/.+@.+\..+/.test(form.value.email)) {
    error.value = 'Введите корректный email'
    return false
  }
  if (!form.value.password || form.value.password.length < 6) {
    error.value = 'Пароль должен быть минимум 6 символов'
    return false
  }
  if (mode.value === 'register' && !form.value.name.trim()) {
    error.value = 'Введите имя'
    return false
  }
  return true
}

async function submit() {
  error.value = ''
  unverifiedEmail.value = ''
  if (!validate()) return

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.value)
      router.push('/')
    } else {
      const data = await auth.register(form.value)
      router.push({ path: '/verify-email-sent', query: { email: data.email || form.value.email } })
    }
  } catch (e) {
    const code = e.response?.data?.code
    if (code === 'EMAIL_NOT_VERIFIED') {
      unverifiedEmail.value = e.response?.data?.email || form.value.email
    }
    error.value = e.response?.data?.error || 'Ошибка'
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
  padding-top: 24px;
  padding-bottom: 24px;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 10px;
}

.auth-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  background: #f1f4f3;
  border-radius: 12px;
  padding: 6px;
}

.auth-tab {
  border: none;
  background: transparent;
  color: #4b5563;
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 600;
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auth-tab--active {
  background: #fff;
  color: #2e8b57;
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.08);
}

.auth-form {
  padding: 20px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-title {
  text-align: left;
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

.auth-error {
  color: #d9534f;
  text-align: left;
  margin: 2px 0 0;
  font-weight: 500;
}

.auth-forgot-link {
  align-self: flex-end;
  color: #2e8b57;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  margin-top: -4px;
}

.auth-forgot-link:hover {
  text-decoration: underline;
}

.auth-unverified {
  margin: 4px 0 0;
  color: #667085;
  font-size: 0.92rem;
  line-height: 1.45;

  a {
    color: #2e8b57;
    font-weight: 600;
  }
}

@media (max-width: 640px) {
  .auth-page {
    align-items: flex-start;
    padding-top: 16px;
    padding-bottom: 20px;
  }

  .auth-card {
    max-width: none;
  }

  .auth-form {
    padding: 16px 10px 12px;
  }

  .auth-title {
    font-size: 1.35rem;
  }

  .auth-subtitle {
    font-size: 0.92rem;
  }
}
</style>
