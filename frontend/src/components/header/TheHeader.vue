<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/header/Navbar.vue'
import Logo from '@/components/header/Logo.vue'
import HeaderSearch from '@/components/header/HeaderSearch.vue'
import { useScrollLock } from '@/composables/useScrollLock'

const route = useRoute()

const mobileMenuOpen = ref(false)
const menuToggleRef = ref(null)
const mobileMenuRef = ref(null)
const { lock, unlock, forceUnlock } = useScrollLock()

/** Фокус не должен оставаться внутри панели при aria-hidden (a11y). */
const releaseMenuFocus = () => {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !mobileMenuRef.value?.contains(active)) return
  active.blur()
  menuToggleRef.value?.focus()
}

const onResize = () => {
  if (window.innerWidth >= 992) closeMenu()
}

const onEscape = (e) => {
  if (e.key === 'Escape' && mobileMenuOpen.value) closeMenu()
}

const toggleMenu = () => {
  const willOpen = !mobileMenuOpen.value
  mobileMenuOpen.value = willOpen
  if (willOpen) {
    lock()
    nextTick(() => {
      mobileMenuRef.value?.querySelector('input')?.focus()
    })
  } else {
    releaseMenuFocus()
    unlock()
  }
}

const closeMenu = () => {
  releaseMenuFocus()
  mobileMenuOpen.value = false
  unlock()
}

watch(
  () => route.fullPath,
  () => {
    if (mobileMenuOpen.value) closeMenu()
  },
)

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onEscape)
})
onUnmounted(() => {
  forceUnlock()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onEscape)
})
</script>

<template>
  <header :class="{ 'menu-open': mobileMenuOpen }" class="header">
    <div class="container header__container">
      <Logo />

      <div class="header__search-desktop">
        <HeaderSearch @navigate="closeMenu" />
      </div>

      <nav class="navbar-desktop">
        <Navbar @click="closeMenu" />
      </nav>

      <button
        ref="menuToggleRef"
        :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
        :aria-label="mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
        aria-controls="mobile-menu-panel"
        :class="{ active: mobileMenuOpen }"
        class="menu-toggle"
        type="button"
        @click="toggleMenu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div
        id="mobile-menu-panel"
        ref="mobileMenuRef"
        :aria-hidden="mobileMenuOpen ? 'false' : 'true'"
        :inert="!mobileMenuOpen"
        :class="{ open: mobileMenuOpen }"
        aria-label="Меню навигации"
        aria-modal="true"
        class="mobile-menu"
        role="dialog"
      >
        <div class="mobile-menu__inner">
          <HeaderSearch @navigate="closeMenu" />
          <Navbar @click="closeMenu" />
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  background: $color-surface;
  color: $color-text;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 4px rgba(16, 24, 40, 0.06);
}

.header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  position: relative;
  gap: 10px;
  min-width: 0;

  @media (max-width: 1240px) {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.header__search-desktop {
  display: none;
  flex: 1 1 0;
  min-width: 0;
  max-width: 560px;

  @media (min-width: 992px) {
    display: block;
  }

  :deep(.header-search) {
    width: 100%;
    max-width: 100%;
  }
}

.navbar-desktop {
  display: none;
  flex-shrink: 0;
  min-width: 0;

  @media (min-width: 992px) {
    display: block;
  }
}

.menu-toggle {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  z-index: 1001;

  span {
    width: 26px;
    height: 2.5px;
    background: $color-darker;
    border-radius: 3px;
    transition: all 0.3s ease;
    transform-origin: center;
  }

  &.active {
    span:nth-child(1) {
      transform: translateY(7.5px) rotate(45deg);
    }

    span:nth-child(2) {
      opacity: 0;
    }

    span:nth-child(3) {
      transform: translateY(-7.5px) rotate(-45deg);
    }
  }

  @media (min-width: 992px) {
    display: none;
  }
}

.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  transform: translateY(-100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;

  &.open {
    transform: translateY(0);
  }

  &__inner {
    margin-top: $header-height;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    width: 100%;

    :deep(.navbar) {
      flex-direction: column;
      align-items: stretch;
    }

    :deep(.nav-link) {
      justify-content: center;
      padding: 0.85rem 1.25rem;
      font-size: 1.05rem;
    }
  }

  @media (min-width: 992px) {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .mobile-menu {
    transition: transform 0.4s ease;
  }
}
</style>
