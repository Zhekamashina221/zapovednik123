<template>
  <div class="region-district-select">
    <AppSelectDropdown
      :model-value="region"
      :options="regionOptions"
      :placeholder="regionPlaceholder"
      :empty-label="regionEmptyLabel"
      @update:model-value="onRegionUpdate"
      @change="emitChange"
    />
    <div ref="districtRootRef" class="type-select-wrap">
      <button
        :aria-expanded="districtOpen"
        aria-haspopup="listbox"
        class="type-trigger app-input"
        type="button"
        @click.stop="districtOpen = !districtOpen"
      >
        <span class="type-trigger__label">{{ districtTriggerLabel }}</span>
        <span :class="{ 'type-trigger__arrow--open': districtOpen }" class="type-trigger__arrow"
          >▾</span
        >
      </button>
      <div v-if="districtOpen" class="type-dropdown card-surface" role="listbox">
        <button
          :class="{ 'type-option--active': !district }"
          class="type-option"
          type="button"
          @click="selectDistrict('')"
        >
          <span class="type-option__label">{{ districtEmptyLabel }}</span>
          <span v-if="!district" aria-hidden="true" class="type-option__check">✓</span>
        </button>
        <template v-for="group in districtGroups" :key="group.regionKey">
          <div v-if="group.showHeader" class="district-group__header">
            {{ group.regionTitle }}
          </div>
          <button
            v-for="d in group.districts"
            :key="`${group.regionKey}::${d}`"
            :class="{ 'type-option--active': district === d, 'district-group__item': group.showHeader }"
            class="type-option"
            type="button"
            @click="selectDistrict(d)"
          >
            <span class="type-option__label">{{ d }}</span>
            <span v-if="district === d" aria-hidden="true" class="type-option__check">✓</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import { useClickOutside } from '@/composables/useClickOutside'
import {
  applyDistrictSelection,
  applyRegionSelection,
  computeDistrictGroups,
} from '@/composables/useRegionDistrictGroups'

const props = defineProps({
  region: { type: String, default: '' },
  district: { type: String, default: '' },
  regions: { type: Array, default: () => [] },
  districts: { type: Array, default: () => [] },
  regionDistrictPairs: { type: Array, default: () => [] },
  regionPlaceholder: { type: String, default: 'Все области' },
  districtPlaceholder: { type: String, default: 'Все районы' },
  regionEmptyLabel: { type: String, default: 'Все области' },
  districtEmptyLabel: { type: String, default: 'Все районы' },
})

const emit = defineEmits(['update:region', 'update:district', 'change'])

const districtRootRef = ref(null)
const districtOpen = ref(false)

const regionOptions = computed(() =>
  (props.regions || []).map((r) => ({ value: r, label: r })),
)

const districtGroups = computed(() =>
  computeDistrictGroups({
    regions: props.regions,
    districts: props.districts,
    regionDistrictPairs: props.regionDistrictPairs,
    selectedRegion: props.region,
  }),
)

const districtTriggerLabel = computed(() => {
  const d = String(props.district || '').trim()
  return d || props.districtPlaceholder
})

function emitChange() {
  emit('change', { region: props.region, district: props.district })
}

function onRegionUpdate(nextRegion) {
  const applied = applyRegionSelection({
    region: nextRegion,
    district: props.district,
    regionDistrictPairs: props.regionDistrictPairs,
  })
  emit('update:region', applied.region)
  emit('update:district', applied.district)
  emitChange()
}

function selectDistrict(value) {
  const applied = applyDistrictSelection({
    region: props.region,
    district: value,
    regionDistrictPairs: props.regionDistrictPairs,
  })
  emit('update:region', applied.region)
  emit('update:district', applied.district)
  districtOpen.value = false
  emitChange()
}

useClickOutside(districtRootRef, () => {
  districtOpen.value = false
}, { active: districtOpen })
</script>

<style scoped lang="scss">
.region-district-select {
  display: contents;
}
</style>
