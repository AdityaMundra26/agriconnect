// Shared option lists and status → visual-tone maps.

export const IRRIGATION_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'rainfed', label: 'Rain-fed' },
  { value: 'canal', label: 'Canal' },
  { value: 'borewell', label: 'Borewell' },
  { value: 'drip', label: 'Drip' },
  { value: 'sprinkler', label: 'Sprinkler' },
];

export const SOIL_TYPES = ['Alluvial soil', 'Black soil', 'Red soil', 'Laterite soil', 'Loamy soil', 'Clay soil', 'Sandy soil'];

export const UNITS = ['kg', 'quintal', 'tonne', 'dozen', 'crate', 'litre'];

export const CYCLE_STATUSES = ['planned', 'sown', 'growing', 'harvested', 'failed'];
export const ORDER_FLOW = ['pending', 'confirmed', 'shipped', 'delivered'];
export const ORDER_NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'];
export const REPORT_CATEGORIES = ['irrigation', 'pest', 'disease', 'equipment', 'weather_damage', 'soil', 'other'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

// tone names map to .tone-* classes in index.css
export const TONES = {
  order: { pending: 'amber', confirmed: 'blue', shipped: 'violet', delivered: 'green', cancelled: 'gray' },
  listing: { active: 'green', sold_out: 'amber', closed: 'gray' },
  report: { open: 'red', in_progress: 'amber', resolved: 'green', rejected: 'gray' },
  severity: { low: 'green', medium: 'amber', high: 'red', critical: 'red' },
  cycle: { planned: 'gray', sown: 'blue', growing: 'green', harvested: 'amber', failed: 'red' },
  role: { farmer: 'green', buyer: 'blue', admin: 'violet' },
};

const CROP_EMOJI = {
  tomato: '🍅', onion: '🧅', potato: '🥔', rice: '🌾', wheat: '🌾', ragi: '🌾', barley: '🌾', maize: '🌽', corn: '🌽',
  grapes: '🍇', grape: '🍇', mango: '🥭', banana: '🍌', apple: '🍎', orange: '🍊', watermelon: '🍉', coconut: '🥥',
  groundnut: '🥜', peanut: '🥜', chilli: '🌶️', chili: '🌶️', carrot: '🥕', cabbage: '🥬', spinach: '🥬', cucumber: '🥒',
  brinjal: '🍆', eggplant: '🍆', garlic: '🧄', sugarcane: '🎋', jaggery: '🍯', cotton: '☁️', soybean: '🫘', chickpea: '🫘',
  tur: '🫘', moong: '🫘', peas: '🫛', mustard: '🌼', lemon: '🍋', pumpkin: '🎃', strawberry: '🍓', coffee: '☕', tea: '🍵',
};

export function cropEmoji(name = '') {
  const key = name.toLowerCase().trim();
  if (CROP_EMOJI[key]) return CROP_EMOJI[key];
  const partial = Object.keys(CROP_EMOJI).find((k) => key.includes(k));
  return partial ? CROP_EMOJI[partial] : '🌱';
}

const CROP_TINTS = ['tone-green', 'tone-amber', 'tone-blue', 'tone-violet', 'tone-red'];
export function cropTint(name = '') {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CROP_TINTS[h % CROP_TINTS.length];
}
