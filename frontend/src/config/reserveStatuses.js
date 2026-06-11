/** Варианты статуса объекта (значение в БД — в нижнем регистре). */
export const RESERVE_STATUS_OPTIONS = [
  { value: 'местный', label: 'Местный' },
  { value: 'республиканский', label: 'Республиканский' },
]

export function normalizeReserveStatus(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return ''
  const found = RESERVE_STATUS_OPTIONS.find((o) => o.value === v)
  return found ? found.value : v
}

export function reserveStatusLabel(value) {
  const v = normalizeReserveStatus(value)
  if (!v) return ''
  const found = RESERVE_STATUS_OPTIONS.find((o) => o.value === v)
  return found ? found.label : v
}
