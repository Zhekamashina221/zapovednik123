<template>
  <nav class="navbar">
    <router-link class="nav-link" title="Карта" to="/">
      <i aria-hidden="true" class="bi bi-map-fill"></i>
      <span class="nav-link__label">Карта</span>
    </router-link>
    <router-link class="nav-link" title="Список" to="/list">
      <i aria-hidden="true" class="bi bi-list-ul"></i>
      <span class="nav-link__label">Список</span>
    </router-link>
    <router-link class="nav-link" title="Маршруты" to="/marshruty">
      <i aria-hidden="true" class="bi bi-car-front-fill"></i>
      <span class="nav-link__label">Маршруты</span>
    </router-link>
    <template v-if="auth.user">
      <router-link class="nav-link" title="Профиль" to="/profile">
        <i aria-hidden="true" class="bi bi-person-fill"></i>
        <span class="nav-link__label">Профиль</span>
      </router-link>
      <router-link v-if="auth.user.role === 'admin'" class="nav-link" title="Админка" to="/admin">
        <i aria-hidden="true" class="bi bi-gear-fill"></i>
        <span class="nav-link__label">Админка</span>
      </router-link>
    </template>
    <router-link v-else class="nav-link" title="Войти" to="/login">
      <i aria-hidden="true" class="bi bi-person-fill"></i>
      <span class="nav-link__label">Войти</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
</script>

<style lang="scss" scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  color: $color-text;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid transparent;
  transition: $transition;
  white-space: nowrap;

  &:hover {
    background: $color-gray-light;
    color: $color-darker;
  }

  &.router-link-active {
    background: $color-light;
    color: $color-primary;
    border-color: rgba($color-primary, 0.2);
  }
}

.nav-link .bi {
  flex-shrink: 0;
  font-size: 1.05rem;
  line-height: 1;
}

/* 992px–1240px: мало места для поиска + подписи в навигации */
@media (min-width: 992px) and (max-width: 1240px) {
  .nav-link {
    padding: 0.45rem 0.5rem;
    gap: 0;
  }

  .nav-link__label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

@media (min-width: 1241px) {
  .nav-link {
    padding: 0.45rem 0.85rem;
  }
}
</style>
