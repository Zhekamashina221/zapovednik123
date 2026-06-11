<template>
  <div ref="rootRef" class="header-search">
    <div class="header-search__wrapper">
      <input
        v-model.trim="query"
        :class="{ 'header-search__input--filled': query.length }"
        autocomplete="off"
        autocorrect="off"
        class="app-input header-search__input"
        enterkeyhint="search"
        placeholder="Поиск объектов"
        role="searchbox"
        spellcheck="false"
        type="text"
        @focus="onFocus"
        @keydown.esc="closeDropdown"
        @keydown.enter="handleEnterPress"
      />

      <!-- Иконка поиска -->
      <svg
        class="header-search__icon"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>

      <!-- Кнопка очистки -->
      <button
        v-if="query.length"
        aria-label="Очистить поиск"
        class="header-search__clear"
        type="button"
        @click="clearQuery"
      >
        <svg
          fill="none"
          height="16"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
          />
        </svg>
      </button>
    </div>

    <Transition name="dropdown-fade" @after-leave="onTransitionLeave">
      <div
        v-if="dropdownOpen && (loading || query.length >= 1)"
        class="header-search__dropdown card-surface"
      >
        <!-- Состояния загрузки -->
        <div v-if="loading" class="header-search__state header-search__state--loading">
          <div class="header-search__spinner"></div>
          <span>Поиск...</span>
        </div>

        <!-- Состояние: недостаточно символов -->
        <div v-else-if="query.length && query.length < 2" class="header-search__state">
          <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
            <path
              d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
            />
          </svg>
          <span>Введите минимум 2 символа</span>
        </div>

        <!-- Состояние: нет результатов -->
        <div
          v-else-if="query.length >= 2 && !results.length && !loading"
          class="header-search__state"
        >
          <i aria-hidden="true" class="bi bi-emoji-frown header-search__state-icon"></i>
          <span>Ничего не найдено</span>
          <span class="header-search__state-hint">Попробуйте изменить запрос</span>
        </div>

        <!-- Результаты поиска -->
        <ul v-else-if="results.length" class="header-search__list">
          <li v-for="(item, index) in results" :key="item.id">
            <button
              :class="{ 'header-search__item--active': activeIndex === index }"
              class="header-search__item"
              type="button"
              @click="goToReserve(item.id)"
              @mouseenter="activeIndex = index"
            >
              <div class="header-search__thumb-wrap">
                <img
                  v-if="item.photos?.[0]"
                  :alt="item.name"
                  :src="item.photos[0]"
                  class="header-search__thumb"
                  loading="lazy"
                  @error="onThumbError"
                />
                <div v-else class="header-search__thumb-placeholder">
                  <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                    <path
                      d="M4 16L8 12L12 16L16 8L20 12M4 4H20M4 20H20"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-width="1.5"
                    />
                  </svg>
                </div>
              </div>
              <div class="header-search__meta">
                <span class="header-search__name" v-html="highlightMatch(item.name)"></span>
                <small v-if="item.region" class="header-search__region">
                  <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                    <path
                      d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path
                      d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                  </svg>
                  {{ item.region }}
                </small>
              </div>
            </button>
          </li>
        </ul>

        <!-- Кнопка "Показать все" -->
        <button
          v-if="results.length"
          class="header-search__all app-btn app-btn--ghost"
          type="button"
          @click="goToList"
        >
          Показать все результаты ({{ resultsTotal }})
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onUnmounted, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useReservesStore } from '@/stores/reserves'
import api from '@/services/api'

const emit = defineEmits(['navigate'])

const router = useRouter()
const store = useReservesStore()

const rootRef = ref(null)
const query = ref(store.filters.search || '')
const loading = ref(false)
const results = ref([])
const resultsTotal = ref(0)
const dropdownOpen = ref(false)
const activeIndex = ref(-1)
let debounceTimer = null
let abortController = null

const searchReserves = async (value) => {
  // Отменяем предыдущий запрос
  if (abortController) {
    abortController.abort()
  }

  if (value.length < 2) {
    results.value = []
    resultsTotal.value = 0
    loading.value = false
    return
  }

  loading.value = true
  abortController = new AbortController()

  try {
    const res = await api.get('/reserves', {
      params: {
        search: value,
        limit: 5, // Ограничиваем результаты для дропдауна
        offset: 0,
        sort_by: 'name',
        sort_dir: 'asc',
      },
      signal: abortController.signal,
    })
    results.value = res.data?.data || []
    const t = Number(res.data?.total)
    resultsTotal.value = Number.isFinite(t) ? t : results.value.length
  } catch (_error) {
    if (_error.name !== 'AbortError') {
      results.value = []
      resultsTotal.value = 0
    }
  } finally {
    loading.value = false
    abortController = null
  }
}

const onFocus = () => {
  if (query.value.trim().length >= 1 || loading.value) {
    dropdownOpen.value = true
  }
}

const closeDropdown = () => {
  dropdownOpen.value = false
  activeIndex.value = -1
}

const onTransitionLeave = () => {
  if (!dropdownOpen.value && !query.value) {
    results.value = []
    resultsTotal.value = 0
  }
}

const onOutsideClick = (event) => {
  if (!rootRef.value?.contains(event.target)) {
    closeDropdown()
  }
}

const goToReserve = async (id) => {
  closeDropdown()
  emit('navigate')
  await router.push(`/reserve/${id}`)
}

const goToList = async () => {
  store.setFilters({
    ...store.filters,
    search: query.value,
  })
  closeDropdown()
  emit('navigate')
  await router.push('/list')
}

const clearQuery = () => {
  query.value = ''
  results.value = []
  resultsTotal.value = 0
  closeDropdown()
  if ((store.filters.search || '').trim()) {
    store.setFilters({
      ...store.filters,
      search: '',
    })
  }
}

const handleEnterPress = () => {
  if (activeIndex.value >= 0 && results.value[activeIndex.value]) {
    goToReserve(results.value[activeIndex.value].id)
  } else if (results.value.length) {
    goToList()
  }
}

// Навигация по клавишам
const handleKeydown = (event) => {
  if (!dropdownOpen.value || !results.value.length) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % results.value.length
      scrollToActive()
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value = activeIndex.value <= 0 ? results.value.length - 1 : activeIndex.value - 1
      scrollToActive()
      break
    case 'Enter':
      event.preventDefault()
      if (activeIndex.value >= 0) {
        goToReserve(results.value[activeIndex.value].id)
      }
      break
  }
}

const scrollToActive = () => {
  nextTick(() => {
    const activeElement = rootRef.value?.querySelector('.header-search__item--active')
    activeElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const highlightMatch = (text) => {
  if (!query.value || query.value.length < 2) return escapeHtml(text)

  const pattern = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${pattern})`, 'gi')
  const safe = escapeHtml(text)
  return safe.replace(regex, '<mark class="header-search__highlight">$1</mark>')
}

const onThumbError = (event) => {
  const placeholder = event.target.nextElementSibling
  if (placeholder) {
    event.target.style.display = 'none'
    placeholder.style.display = 'flex'
  }
}

watch(query, (value, oldValue) => {
  if (value !== oldValue) {
    dropdownOpen.value = !!value
    activeIndex.value = -1

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchReserves(value)
      debounceTimer = null
    }, 350)
  }
})

watch(
  () => store.filters.search,
  (s) => {
    const next = (s || '').trim()
    if (next === '' && query.value !== '') {
      query.value = ''
      results.value = []
      resultsTotal.value = 0
    }
  },
)

document.addEventListener('click', onOutsideClick)
document.addEventListener('keydown', handleKeydown)

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortController) abortController.abort()
  document.removeEventListener('click', onOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.header-search {
  position: relative;
  width: 100%;
  max-width: 560px;
}

.header-search__wrapper {
  position: relative;
}

.header-search__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  transition: color 0.2s ease;
}

.header-search__input {
  width: 100%;
  padding: 10px 32px 10px 40px;
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    background: #ffffff;
    border-color: $color-primary;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    outline: none;
  }

  &--filled {
    padding-right: 40px;
  }
}

.header-search__clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }
}

.header-search__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 1100;
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  max-height: 480px;
  overflow: auto;
}

.header-search__list {
  list-style: none;
  margin: 0;
  padding: 8px;
  display: grid;
  gap: 4px;
}

.header-search__item {
  width: 100%;
  border: none;
  text-align: left;
  padding: 12px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  cursor: pointer;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  transition: all 0.15s ease;

  &:hover,
  &--active {
    background: #f0fdf4;

    .header-search__name {
      color: #059669;
    }
  }
}

.header-search__thumb-wrap {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-search__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-search__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  background: #f9fafb;
}

.header-search__meta {
  display: grid;
  gap: 4px;
}

.header-search__name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  transition: color 0.15s ease;
}

.header-search__region {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;

  svg {
    flex-shrink: 0;
  }
}

.header-search__state {
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  svg {
    color: #9ca3af;
  }

  &--loading {
    flex-direction: row;
    justify-content: center;
    gap: 12px;
  }
}

.header-search__state-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: -4px;
}

.header-search__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.header-search__all {
  margin: 8px;
  width: calc(100% - 16px);
  padding: 10px;
  border: 1px solid #d1fae5;
  background: #f0fdf4;
  color: #059669;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;

  &:hover {
    background: #d1fae5;
    border-color: #a7f3d0;
  }
}

.header-search__highlight {
  background: #fef3c7;
  color: #d97706;
  border-radius: 2px;
  font-weight: 600;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
