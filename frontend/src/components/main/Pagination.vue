<template>
  <nav v-if="total > 0" class="pagination card-surface" aria-label="Постраничная навигация">
    <p class="pagination__summary">
      <span class="pagination__summary-text">
        Показано <strong>{{ rangeFrom }}–{{ rangeTo }}</strong> из {{ total }}
      </span>
      <span v-if="totalPages > 1" class="pagination__summary-pages">
        · стр. <strong>{{ clampedPage }}</strong> / {{ totalPages }}
      </span>
    </p>

    <div v-if="totalPages > 1" class="pagination__bar">
      <!-- Mobile: компактные стрелки + счётчик -->
      <div class="pagination__mobile" aria-label="Страницы (мобильный вид)">
        <button
          type="button"
          class="pagination__icon-btn"
          aria-label="Первая страница"
          :disabled="clampedPage <= 1"
          @click="goTo(1)"
        >
          <i aria-hidden="true" class="bi bi-chevron-double-left"></i>
        </button>
        <button
          type="button"
          class="pagination__icon-btn"
          aria-label="Предыдущая страница"
          :disabled="clampedPage <= 1"
          @click="goTo(clampedPage - 1)"
        >
          <i aria-hidden="true" class="bi bi-chevron-left"></i>
        </button>

        <label class="pagination__mobile-jump">
          <span class="visually-hidden">Номер страницы</span>
          <select
            class="pagination__mobile-select"
            :value="clampedPage"
            aria-label="Выбор страницы"
            @change="onMobileSelect($event)"
          >
            <option v-for="p in totalPages" :key="p" :value="p">Стр. {{ p }}</option>
          </select>
        </label>

        <button
          type="button"
          class="pagination__icon-btn"
          aria-label="Следующая страница"
          :disabled="clampedPage >= totalPages"
          @click="goTo(clampedPage + 1)"
        >
          <i aria-hidden="true" class="bi bi-chevron-right"></i>
        </button>
        <button
          type="button"
          class="pagination__icon-btn"
          aria-label="Последняя страница"
          :disabled="clampedPage >= totalPages"
          @click="goTo(totalPages)"
        >
          <i aria-hidden="true" class="bi bi-chevron-double-right"></i>
        </button>
      </div>

      <!-- Desktop: полный набор -->
      <div class="pagination__desktop" aria-label="Страницы">
        <button
          type="button"
          class="pagination__nav"
          aria-label="Первая страница"
          :disabled="clampedPage <= 1"
          @click="goTo(1)"
        >
          <i aria-hidden="true" class="bi bi-chevron-double-left"></i>
        </button>
        <button
          type="button"
          class="pagination__nav"
          aria-label="Предыдущая страница"
          :disabled="clampedPage <= 1"
          @click="goTo(clampedPage - 1)"
        >
          <i aria-hidden="true" class="bi bi-chevron-left"></i>
          <span>Назад</span>
        </button>

        <ol class="pagination__pages">
          <li v-for="(item, index) in pageItems" :key="`p-${index}-${item}`">
            <span v-if="item === 'ellipsis'" class="pagination__ellipsis" aria-hidden="true">
              <i class="bi bi-three-dots"></i>
            </span>
            <button
              v-else
              type="button"
              class="pagination__page"
              :class="{ 'pagination__page--current': item === clampedPage }"
              :aria-current="item === clampedPage ? 'page' : undefined"
              :aria-label="item === clampedPage ? `Текущая страница ${item}` : `Страница ${item}`"
              @click="goTo(item)"
            >
              {{ item }}
            </button>
          </li>
        </ol>

        <button
          type="button"
          class="pagination__nav"
          aria-label="Следующая страница"
          :disabled="clampedPage >= totalPages"
          @click="goTo(clampedPage + 1)"
        >
          <span>Вперёд</span>
          <i aria-hidden="true" class="bi bi-chevron-right"></i>
        </button>
        <button
          type="button"
          class="pagination__nav"
          aria-label="Последняя страница"
          :disabled="clampedPage >= totalPages"
          @click="goTo(totalPages)"
        >
          <i aria-hidden="true" class="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, required: true },
  total: { type: Number, required: true },
  limit: { type: Number, required: true },
})

const emit = defineEmits(['change'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.limit))))

const clampedPage = computed(() => {
  const p = Number(props.current) || 1
  return Math.min(Math.max(1, p), totalPages.value)
})

const rangeFrom = computed(() => {
  if (props.total <= 0) return 0
  return (clampedPage.value - 1) * props.limit + 1
})

const rangeTo = computed(() => {
  if (props.total <= 0) return 0
  return Math.min(clampedPage.value * props.limit, props.total)
})

function goTo(page) {
  const next = Math.min(Math.max(1, page), totalPages.value)
  if (next !== clampedPage.value) emit('change', next)
}

function onMobileSelect(event) {
  goTo(Number(event.target.value))
}

function buildPageItems(current, total, siblings = 1) {
  if (total <= 1) return []
  const maxButtons = siblings * 2 + 5
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const items = [1]
  const left = Math.max(2, current - siblings)
  const right = Math.min(total - 1, current + siblings)

  if (left > 2) items.push('ellipsis')
  for (let i = left; i <= right; i += 1) items.push(i)
  if (right < total - 1) items.push('ellipsis')
  items.push(total)
  return items
}

const pageItems = computed(() => buildPageItems(clampedPage.value, totalPages.value, 1))
</script>

<style scoped lang="scss">
.visually-hidden {
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

.pagination {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  margin: 1.75rem 0;
  padding: 1rem 1.15rem;
  width: 100%;
}

.pagination__summary {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: $color-ink-muted;
  line-height: 1.45;

  strong {
    color: $color-ink;
    font-weight: 700;
  }
}

.pagination__summary-pages {
  color: $color-ink-subtle;
}

.pagination__bar {
  width: 100%;
}

.pagination__mobile {
  display: none;
}

.pagination__desktop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem 0.5rem;
}

.pagination__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  padding: 0 0.85rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: #fff;
  color: $color-primary;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  .bi {
    font-size: 1rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: $color-light;
    border-color: rgba($color-primary, 0.35);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.pagination__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: #fff;
  color: $color-primary;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  .bi {
    font-size: 1.1rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: $color-light;
    border-color: rgba($color-primary, 0.35);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pagination__mobile-jump {
  flex: 1;
  min-width: 0;
  max-width: 9rem;
}

.pagination__mobile-select {
  width: 100%;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: #fff;
  color: $color-ink;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:focus-visible {
    border-color: $color-primary;
    outline: none;
    box-shadow: 0 0 0 3px rgba($color-primary, 0.16);
  }
}

.pagination__pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.5rem;
  color: $color-ink-subtle;

  .bi {
    font-size: 1.1rem;
    line-height: 1;
  }
}

.pagination__page {
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.4rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: #fff;
  color: $color-ink;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover:not(.pagination__page--current) {
    background: $color-light;
    border-color: rgba($color-primary, 0.35);
    color: $color-primary-dark;
  }

  &--current {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;
    cursor: default;
  }
}

@media (max-width: 640px) {
  .pagination {
    padding: 0.85rem 0.75rem;
    margin: 1.25rem 0;
  }

  .pagination__summary {
    font-size: 0.82rem;
  }

  .pagination__mobile {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
  }

  .pagination__desktop {
    display: none;
  }
}
</style>
