<template>
  <div ref="rootRef" :class="['list-sort', { 'list-sort--labeled': showLabel }]">
    <span v-if="showLabel" class="list-sort__title">Сортировка</span>

    <div class="list-sort__wrap">
      <button
        :aria-expanded="open ? 'true' : 'false'"
        aria-haspopup="listbox"
        class="list-sort__trigger app-input"
        type="button"
        @click="open = !open"
      >
        <span class="list-sort__current">
          <i
            :class="['bi', currentOption.icon, 'list-sort__icon', currentOption.iconClass]"
            aria-hidden="true"
          />
          <span class="list-sort__text">{{ currentOption.label }}</span>
        </span>
        <i
          :class="[
            'bi',
            'bi-chevron-down',
            'list-sort__chevron',
            { 'list-sort__chevron--open': open },
          ]"
          aria-hidden="true"
        />
      </button>

      <ul v-if="open" aria-label="Сортировка" class="list-sort__menu card-surface" role="listbox">
        <li v-for="opt in sortOptions" :key="opt.value" role="presentation">
          <button
            :aria-selected="modelValue === opt.value ? 'true' : 'false'"
            :class="{ 'list-sort__option--active': modelValue === opt.value }"
            class="list-sort__option"
            role="option"
            type="button"
            @click="select(opt.value)"
          >
            <i :class="['bi', opt.icon, 'list-sort__icon', opt.iconClass]" aria-hidden="true" />
            <span class="list-sort__option-label">{{ opt.label }}</span>
            <i
              v-if="modelValue === opt.value"
              aria-hidden="true"
              class="bi bi-check2 list-sort__check"
            />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  showLabel: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const sortOptions = [
  {
    value: 'popularity:desc',
    label: 'Популярные',
    icon: 'bi bi-fire',
    iconClass: '',
  },
  {
    value: 'name:asc',
    label: 'Название: А-Я',
    icon: 'bi-sort-alpha-down',
    iconClass: '',
  },
  {
    value: 'name:desc',
    label: 'Название: Я-А',
    icon: 'bi-sort-alpha-up',
    iconClass: '',
  },
  {
    value: 'has_review:desc',
    label: 'Есть отзыв',
    icon: 'bi-star-fill',
    iconClass: '',
  },
]

const open = ref(false)
const rootRef = ref(null)

const currentOption = computed(
  () => sortOptions.find((opt) => opt.value === props.modelValue) ?? sortOptions[0],
)

function select(value) {
  emit('update:modelValue', value)
  open.value = false
}

function onOutsideClick(event) {
  if (!open.value) return
  const root = rootRef.value
  if (root && !root.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})
</script>

<style lang="scss" scoped>
.list-sort {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.list-sort__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: $color-ink-subtle;
}

.list-sort__wrap {
  position: relative;
  min-width: 0;
}

.list-sort__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.list-sort__current {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.list-sort__icon {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
  color: $color-primary;

  &--star {
    color: #e8a317;
  }
}

.list-sort__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-sort__chevron {
  flex-shrink: 0;
  font-size: 0.95rem;
  line-height: 1;
  color: $color-ink-subtle;
  transition: transform 0.2s ease;

  &--open {
    transform: rotate(180deg);
  }
}

.list-sort__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 40;
  margin: 0;
  padding: 6px;
  list-style: none;
}

.list-sort__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $color-text;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: $color-gray-light;
  }

  &--active {
    background: $color-light;
    color: $color-primary;
    font-weight: 600;
  }
}

.list-sort__option-label {
  flex: 1;
  min-width: 0;
}

.list-sort__check {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
  color: $color-primary;
}
</style>
