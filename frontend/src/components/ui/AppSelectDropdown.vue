<template>
  <div ref="rootRef" class="type-select-wrap">
    <button
      :aria-expanded="open"
      :disabled="disabled"
      aria-haspopup="listbox"
      class="type-trigger app-input"
      type="button"
      @click.stop="toggle"
    >
      <span class="type-trigger__label">{{ triggerLabel }}</span>
      <span :class="{ 'type-trigger__arrow--open': open }" class="type-trigger__arrow">▾</span>
    </button>
    <div v-if="open" class="type-dropdown card-surface" role="listbox">
      <button
        v-if="showEmptyOption"
        :class="{ 'type-option--active': isSelected(emptyValue) }"
        class="type-option"
        type="button"
        @click="select(emptyValue)"
      >
        <span class="type-option__label">{{ emptyLabel }}</span>
        <span v-if="isSelected(emptyValue)" aria-hidden="true" class="type-option__check">✓</span>
      </button>
      <button
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        :class="{ 'type-option--active': isSelected(opt.value) }"
        class="type-option"
        type="button"
        @click="select(opt.value)"
      >
        <span class="type-option__label">{{ opt.label }}</span>
        <span v-if="isSelected(opt.value)" aria-hidden="true" class="type-option__check">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Выберите' },
  emptyLabel: { type: String, default: 'Все' },
  emptyValue: { type: [String, Number], default: '' },
  showEmptyOption: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const open = ref(false)

const normalizedOptions = computed(() =>
  (props.options || []).map((item) => {
    if (item != null && typeof item === 'object') {
      return { value: item.value, label: item.label ?? String(item.value) }
    }
    return { value: item, label: String(item) }
  }),
)

const triggerLabel = computed(() => {
  const current = props.modelValue
  if (current === '' || current == null) return props.placeholder
  const found = normalizedOptions.value.find((o) => o.value === current)
  return found ? found.label : String(current)
})

function isSelected(value) {
  return String(props.modelValue ?? '') === String(value ?? '')
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function close() {
  open.value = false
}

function select(value) {
  const next = value == null ? props.emptyValue : value
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
    emit('change', next)
  }
  close()
}

useClickOutside(rootRef, close, { active: open })
</script>
