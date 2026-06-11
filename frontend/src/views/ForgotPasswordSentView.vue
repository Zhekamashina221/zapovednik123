<template>
  <div class="auth-page container">
    <div class="auth-card card-surface verify-card">
      <h1 class="auth-title">Проверьте почту</h1>
      <p class="auth-subtitle">
        Если аккаунт с адресом <strong>{{ email }}</strong> существует и email подтверждён, мы
        отправили ссылку для сброса пароля.
      </p>

      <p v-if="showDevHint" class="verify-dev-hint">
        SMTP не настроен — ссылка сброса выводится в консоль сервера backend.
      </p>

      <router-link class="verify-link" to="/login">Вернуться ко входу</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const email = computed(() => route.query.email || '')
const showDevHint = ref(false)

onMounted(async () => {
  try {
    const res = await api.get('/auth/config')
    showDevHint.value = !res.data?.data?.smtp_configured
  } catch {
    showDevHint.value = false
  }
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
  background: #fff8e6;
  border: 1px solid #f0d78c;
  border-radius: 8px;
  color: #5c4a1f;
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

.auth-page {
  min-height: calc(100vh - $header-height);
  display: grid;
  place-items: center;
  padding: 24px 0;
}
</style>
