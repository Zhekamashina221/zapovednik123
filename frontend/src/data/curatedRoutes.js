/** Подписи профиля маршрутизации (публичные страницы и админка). */
export function profileLabel(profile) {
  return profile === 'foot-walking' ? 'Пешком' : 'На авто'
}

/** Сложность по профилю (как на детальной странице маршрута). */
export function difficultyLabel(profile) {
  return profile === 'foot-walking' ? 'Умеренный' : 'Лёгкий'
}
