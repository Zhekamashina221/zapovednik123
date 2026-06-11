<template>
  <div class="auth-page container">
    <div class="auth-card card-surface verify-card">
      <h1 class="auth-title">Проверьте почту</h1>
      <p class="auth-subtitle">
        Мы отправили письмо с подтверждением на
        <strong>{{ email }}</strong
        >. Перейдите по ссылке в письме, чтобы активировать аккаунт.
      </p>

      <p v-if="showDevHint" class="verify-dev-hint">
        SMTP не настроен — ссылка подтверждения выводится в консоль сервера backend.
      </p>

      <button
        :disabled="resendLoading || resendCooldown > 0"
        class="app-btn app-btn--primary auth-submit"
        type="button"
        @click="resend"
      >
        {{
          resendCooldown > 0
            ? `Повторить через ${resendCooldown} с`
            : resendLoading
              ? 'Отправка...'
              : 'Отправить письмо повторно'
        }}
      </button>

      <router-link class="verify-link" to="/login">Вернуться ко входу</router-link>

      <p v-if="message" class="verify-message">{{ message }}</p>
      <p v-if="error" class="auth-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const email = computed(() => route.query.email || '')
const message = ref('')
const error = ref('')
const showDevHint = ref(false)
const resendLoading = ref(false)
const resendCooldown = ref(0)
let cooldownTimer = null

async function resend() {
  if (!email.value) {
    error.value = 'Email не указан'
    return
  }
  error.value = ''
  message.value = ''
  resendLoading.value = true
  try {
    const res = await api.post('/auth/resend-verification', { email: email.value })
    message.value = res.data.data?.message || 'Письмо отправлено'
    startCooldown(120)
  } catch (e) {
    error.value = e.response?.data?.error || 'Не удалось отправить письмо'
    const waitMatch = String(error.value).match(/(\d+)\s*сек/)
    if (waitMatch) {
      startCooldown(Number.parseInt(waitMatch[1], 10))
    }
  } finally {
    resendLoading.value = false
  }
}

function startCooldown(sec) {
  resendCooldown.value = sec
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

onMounted(async () => {
  try {
    const res = await api.get('/auth/config')
    showDevHint.value = !res.data?.data?.smtp_configured
  } catch {
    showDevHint.value = false
  }
})

onUnmounted(() => {
  clearInterval(cooldownTimer)
})
</script>

<style lang="scss" scoped>
.verify-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 20px;
}

.auth-title {
  color: #2e8b57;
  margin: 0 0 8px;
  font-size: 1.6rem;
}

.auth-subtitle {
  margin: 0 0 16px;
  color: #667085;
  line-height: 1.5;
}

.verify-dev-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: #f0f7f4;
  border-radius: 8px;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.45;
}

.verify-link {
  display: inline-block;
  margin-top: 12px;
  color: #2e8b57;
  font-weight: 600;
  text-decoration: none;
}

.verify-link:hover {
  text-decoration: underline;
}

.verify-message {
  margin: 12px 0 0;
  color: #2e8b57;
  font-weight: 500;
}

.auth-error {
  color: #d9534f;
  margin: 8px 0 0;
}

.auth-page {
  min-height: calc(100vh - $header-height);
  display: grid;
  place-items: center;
  padding: 24px 0;
}

.auth-submit {
  width: 100%;
}
</style>
