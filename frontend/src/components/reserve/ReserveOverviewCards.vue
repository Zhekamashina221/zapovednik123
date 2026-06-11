<template>
  <section
    :class="[
      'reserve__overview',
      rootClass,
      { 'reserve__overview--sidebar': variant === 'sidebar' },
    ]"
  >
    <section v-if="variant === 'mobile'" class="reserve__specs-mobile">
      <OverviewSpecBlock
        icon="bi-info-circle"
        title="Основное"
        :rows="mainRows"
        @copy-coords="$emit('copy-coords')"
      />
      <OverviewSpecBlock
        v-if="hasContacts"
        icon="bi-telephone"
        title="Контакты"
        :rows="contactRows"
        @copy-coords="$emit('copy-coords')"
      />
    </section>

    <div v-if="variant === 'sidebar'" class="reserve__overview-desktop">
      <OverviewSpecBlock
        compact
        icon="bi-info-circle"
        title="Основное"
        :rows="desktopMainRows"
        @copy-coords="$emit('copy-coords')"
      />
      <OverviewSpecBlock
        v-if="hasContacts"
        compact
        icon="bi-telephone"
        title="Контакты"
        :rows="contactRows"
        @copy-coords="$emit('copy-coords')"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import OverviewSpecBlock from '@/components/reserve/OverviewSpecBlock.vue'

const props = defineProps({
  reserve: { type: Object, required: true },
  formatDate: { type: Function, required: true },
  formatArea: { type: Function, required: true },
  rootClass: { type: String, default: '' },
  variant: {
    type: String,
    default: 'mobile',
    validator: (v) => ['mobile', 'sidebar'].includes(v),
  },
})

defineEmits(['copy-coords'])

const hasContacts = computed(
  () =>
    props.reserve?.phone ||
    props.reserve?.email ||
    props.reserve?.website ||
    props.reserve?.postal_address,
)

const desktopMainRows = computed(() => {
  const rows = [{ label: 'Создан', value: props.formatDate(props.reserve.created) }]
  if (props.reserve.status_date) {
    rows.push({ label: 'Статус с', value: props.formatDate(props.reserve.status_date) })
  }
  if (props.reserve.area != null && props.reserve.area !== '') {
    rows.push({ label: 'Площадь', value: props.formatArea(props.reserve.area) })
  }
  if (props.reserve.region) rows.push({ label: 'Регион', value: props.reserve.region })
  if (props.reserve.district) rows.push({ label: 'Район', value: props.reserve.district })
  if (props.reserve.latitude && props.reserve.longitude) {
    rows.push({
      label: 'Координаты',
      value: `${props.reserve.latitude.toFixed(6)}, ${props.reserve.longitude.toFixed(6)}`,
      copyable: true,
    })
  }
  return rows
})

const mainRows = computed(() => {
  const rows = []
  if (props.reserve.area != null && props.reserve.area !== '') {
    rows.push({ label: 'Площадь', value: props.formatArea(props.reserve.area) })
  }
  if (props.reserve.region) rows.push({ label: 'Регион', value: props.reserve.region })
  if (props.reserve.district) rows.push({ label: 'Район', value: props.reserve.district })
  rows.push({ label: 'Создан', value: props.formatDate(props.reserve.created) })
  if (props.reserve.status_date) {
    rows.push({ label: 'Статус с', value: props.formatDate(props.reserve.status_date) })
  }
  if (props.reserve.latitude && props.reserve.longitude) {
    rows.push({
      label: 'Координаты',
      value: `${props.reserve.latitude.toFixed(6)}, ${props.reserve.longitude.toFixed(6)}`,
      copyable: true,
    })
  }
  return rows
})

const contactRows = computed(() => {
  const rows = []
  if (props.reserve.phone) {
    rows.push({
      label: 'Телефон',
      value: props.reserve.phone,
      href: `tel:${props.reserve.phone.replace(/[^+\\d]/g, '')}`,
    })
  }
  if (props.reserve.email) {
    rows.push({
      label: 'Email',
      value: props.reserve.email,
      href: `mailto:${props.reserve.email}`,
      link: true,
    })
  }
  if (props.reserve.website) {
    rows.push({
      label: 'Сайт',
      value: 'Перейти',
      href: props.reserve.website,
      external: true,
      link: true,
    })
  }
  if (props.reserve.postal_address) {
    rows.push({ label: 'Адрес', value: props.reserve.postal_address })
  }
  return rows
})

</script>
