export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const parts = dateStr.trim().split('.')
  if (parts.length === 3) {
    const [d, m, y] = parts.map((p) => p.padStart(2, '0'))
    const date = new Date(`${y}-${m}-${d}`)
    return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('ru-BY')
  }
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('ru-BY')
}

export const formatReviewDate = (dateStr) => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr || '—'
  return date.toLocaleString('ru-BY')
}

export const formatArea = (area) =>
  area !== null && area !== undefined
    ? `${Number(area).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} га`
    : '—'
