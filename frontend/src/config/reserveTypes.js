export const RESERVE_TYPE_CONFIG = {
  'заповедник': {
    color: '#d32f2f',
    label: 'Заповедник'
  },
  'национальный парк': {
    color: '#fbc02d',
    label: 'Национальный парк'
  },
  'заказник': {
    color: '#388e3c',
    label: 'Заказник'
  },
  'геологический памятник природы': {
    color: '#1a237e',
    label: 'Памятник природы (геологический)'
  },
  'гидрологический памятник природы': {
    color: '#1976d2',
    label: 'Памятник природы (гидрологический)'
  },
  'ботанический памятник природы': {
    color: '#42a5f5',
    label: 'Памятник природы (ботанический)'
  }
}

export function getTypeConfig(type = '') {
  const lower = type.toLowerCase()
  for (const [key, config] of Object.entries(RESERVE_TYPE_CONFIG)) {
    if (lower.includes(key) || key.includes(lower)) {
      return config
    }
  }
  return { color: '#757575', icon: null, label: 'Другое' }
}
