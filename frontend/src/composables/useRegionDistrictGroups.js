/**
 * Группы районов для выпадающего списка (как в фильтрах карты/списка).
 */
export function computeDistrictGroups({ regions = [], districts = [], regionDistrictPairs = [], selectedRegion = '' }) {
  const pairs = regionDistrictPairs || []
  const apiSet = new Set(
    (districts || [])
      .filter(Boolean)
      .map((d) => String(d)),
  )
  const sel = typeof selectedRegion === 'string' ? selectedRegion.trim() : ''

  const districtsForRegion = (regionName) => {
    const out = []
    const seen = new Set()
    for (const p of pairs) {
      if (p.region !== regionName || !apiSet.has(p.district)) continue
      if (seen.has(p.district)) continue
      seen.add(p.district)
      out.push(p.district)
    }
    out.sort((a, b) => String(a).localeCompare(String(b), 'ru'))
    return out
  }

  const makeGroup = (regionKey, regionTitle, groupDistricts, showHeader) => ({
    regionKey,
    regionTitle,
    districts: groupDistricts,
    showHeader,
  })

  if (!pairs.length) {
    const flat = [...apiSet].sort((a, b) => String(a).localeCompare(String(b), 'ru'))
    return flat.length ? [makeGroup('_flat', '', flat, false)] : []
  }

  if (sel) {
    const list = districtsForRegion(sel)
    return list.length ? [makeGroup(sel, sel, list, true)] : []
  }

  const regionsWithData = new Set()
  for (const p of pairs) {
    if (apiSet.has(p.district)) regionsWithData.add(p.region)
  }

  const ordered = [
    ...(regions || []).filter((r) => regionsWithData.has(r)),
    ...[...regionsWithData]
      .filter((r) => !(regions || []).includes(r))
      .sort((a, b) => String(a).localeCompare(String(b), 'ru')),
  ]

  return ordered
    .map((region) => {
      const groupDistricts = districtsForRegion(region)
      return makeGroup(region, region, groupDistricts, true)
    })
    .filter((g) => g.districts.length > 0)
}

export function applyRegionSelection({ region, district, regionDistrictPairs = [] }) {
  const nextRegion = region == null ? '' : String(region).trim()
  let nextDistrict = district == null ? '' : String(district).trim()

  if (nextRegion && nextDistrict) {
    const ok = regionDistrictPairs.some(
      (p) => p.region === nextRegion && p.district === nextDistrict,
    )
    if (!ok) nextDistrict = ''
  }

  return { region: nextRegion, district: nextDistrict }
}

export function applyDistrictSelection({ region, district, regionDistrictPairs = [] }) {
  const nextDistrict = district == null ? '' : String(district).trim()
  if (!nextDistrict) {
    return { region: region == null ? '' : String(region).trim(), district: '' }
  }

  const reg = region == null ? '' : String(region).trim()
  const pairs = regionDistrictPairs || []
  const candidates = pairs.filter((p) => p.district === nextDistrict && (!reg || p.region === reg))
  const pick = candidates[0] || pairs.find((p) => p.district === nextDistrict)

  return {
    region: pick?.region || reg,
    district: nextDistrict,
  }
}
