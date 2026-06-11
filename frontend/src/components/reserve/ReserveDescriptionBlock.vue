<template>
  <section v-if="description" class="reserve__description">
    <h2 class="section-title reserve__section-title">Описание</h2>
    <div ref="textRef" :class="['text-content', { 'text-content--collapsed': collapsed }]">
      {{ description }}
    </div>
    <button
      v-if="showToggle"
      class="reserve__read-more"
      type="button"
      @click="collapsed = !collapsed"
    >
      {{ collapsed ? 'Развернуть' : 'Свернуть' }}
    </button>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  description: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
})

const textRef = ref(null)
const collapsed = ref(false)
const isLong = ref(false)

const showToggle = computed(() => props.collapsible && isLong.value)

async function measureText() {
  if (!props.collapsible || !props.description) {
    isLong.value = false
    collapsed.value = false
    return
  }
  await nextTick()
  const el = textRef.value
  if (!el) return
  isLong.value = el.scrollHeight > 120
  collapsed.value = isLong.value
}

onMounted(measureText)
watch(() => props.description, measureText)
</script>
