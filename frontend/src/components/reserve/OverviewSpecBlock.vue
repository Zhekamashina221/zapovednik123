<template>
  <div :class="['reserve-spec-block', { 'reserve-spec-block--compact': compact }]">
    <h2 class="reserve-spec-block__title">
      <i :class="['bi', icon]" aria-hidden="true"></i>
      {{ title }}
    </h2>
    <dl class="reserve-spec-card reserve-spec-list card-surface">
      <div v-for="row in rows" :key="row.label" class="reserve-spec-list__row">
        <dt>{{ row.label }}</dt>
        <dd :class="{ 'reserve-spec-list__coords': row.copyable }">
          <a
            v-if="row.href"
            :class="[
              'reserve-spec-list__link',
              { 'reserve-spec-list__link--external': row.external },
            ]"
            :href="row.href"
            :rel="row.external ? 'noopener' : undefined"
            :target="row.external ? '_blank' : undefined"
          >
            {{ row.value }}
            <i v-if="row.external" aria-hidden="true" class="bi bi-box-arrow-up-right"></i>
          </a>
          <template v-else>{{ row.value }}</template>
          <button
            v-if="row.copyable"
            aria-label="Скопировать координаты"
            class="reserve-spec-list__copy"
            title="Скопировать координаты"
            type="button"
            @click="$emit('copy-coords')"
          >
            <i aria-hidden="true" class="bi bi-copy"></i>
          </button>
        </dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

defineEmits(['copy-coords'])
</script>
