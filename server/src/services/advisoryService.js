// Rule-based crop advisory. Deterministic on purpose: a farmer gets the same
// answer for the same inputs, and it works with no external API at all.

const SEASON_INFO = {
  kharif: { label: 'Kharif (monsoon)', window: 'June to October', sowing: 'Sow with the onset of monsoon rains (June to July).' },
  rabi: { label: 'Rabi (winter)', window: 'November to March', sowing: 'Sow after the monsoon retreats (October to December).' },
  zaid: { label: 'Zaid (summer)', window: 'April to May', sowing: 'Short summer window: sow early April, needs assured irrigation.' },
};

const SEASON_CROPS = {
  kharif: ['rice', 'maize', 'cotton', 'sugarcane', 'ragi', 'groundnut', 'soybean', 'tur'],
  rabi: ['wheat', 'mustard', 'chickpea', 'barley', 'peas', 'onion', 'potato'],
  zaid: ['watermelon', 'cucumber', 'muskmelon', 'fodder', 'moong', 'vegetables'],
};

// Which soils suit which crops - used to rank the seasonal list.
const SOIL_CROPS = {
  black: ['cotton', 'sugarcane', 'soybean', 'wheat', 'chickpea', 'tur', 'onion'],
  red: ['groundnut', 'ragi', 'tur', 'potato', 'maize'],
  sandy: ['groundnut', 'watermelon', 'muskmelon', 'barley', 'moong'],
  clay: ['rice', 'wheat', 'sugarcane'],
  loamy: ['wheat', 'maize', 'sugarcane', 'potato', 'vegetables', 'rice'],
  alluvial: ['rice', 'wheat', 'sugarcane', 'mustard', 'maize', 'potato'],
  laterite: ['ragi', 'cashew', 'tur', 'groundnut'],
};

const SOIL_ADVICE = {
  black: 'Black soil retains moisture well. Apply balanced NPK (10-26-26) at sowing, then top-dress nitrogen (urea) 30-45 days after sowing.',
  red: 'Red soil drains quickly and is low in nitrogen and phosphorus. Add 4-5 tonnes/acre of farmyard manure and use DAP at sowing.',
  sandy: 'Sandy soil holds little water or nutrients. Use split doses of fertilizer and slow-release forms; add organic matter every season.',
  clay: 'Clay soil holds water and nutrients well but drains slowly. Avoid excess nitrogen early and ensure field drainage channels.',
  loamy: 'Loamy soil is well balanced for most crops. A standard NPK schedule (e.g. 120:60:40 kg/ha for cereals) works well.',
  alluvial: 'Alluvial soil is fertile but often low in nitrogen. Apply nitrogen in 2-3 split doses and add zinc sulphate if leaves yellow.',
  laterite: 'Laterite soil is acidic and leached. Apply lime to correct pH, and add organic manure plus phosphorus.',
};
const DEFAULT_SOIL_ADVICE = 'Get a soil test (Soil Health Card) for tailored recommendations. Meanwhile, apply a balanced NPK fertilizer and organic manure.';

const IRRIGATION_BASE = {
  none: { interval: null, text: 'No irrigation access - time sowing to monsoon onset and choose drought-tolerant varieties.' },
  rainfed: { interval: null, text: 'Rain-fed - supplement with protective irrigation if a dry spell lasts longer than 7 days.' },
  canal: { interval: '7-10 days', text: 'Canal-fed - irrigate every 7-10 days, skipping a cycle after good rainfall.' },
  borewell: { interval: '5-7 days', text: 'Borewell - irrigate every 5-7 days, preferably early morning, and monitor groundwater use.' },
  drip: { interval: '2-3 days', text: 'Drip - irrigate lightly every 2-3 days; fertigation through drip saves 30-40% fertilizer.' },
  sprinkler: { interval: '3-5 days', text: 'Sprinkler - irrigate every 3-5 days; avoid midday to reduce evaporation loss.' },
};

const CROP_TIPS = {
  rice: 'Keep 2-5 cm standing water during tillering; drain the field 10 days before harvest.',
  wheat: 'Critical irrigation at crown-root initiation (about 21 days after sowing) and at flowering.',
  cotton: 'Watch for pink bollworm from flowering onward; use pheromone traps (5/acre).',
  maize: 'Most sensitive to water stress at tasselling and silking - do not skip irrigation then.',
  sugarcane: 'Earth up at 90-120 days and trash-mulch to conserve moisture.',
  chickpea: 'Avoid irrigation at flowering, which causes flower drop; one irrigation at pod filling helps.',
  mustard: 'Irrigate at rosette and pod-filling stages; scout for aphids in January.',
  groundnut: 'Apply gypsum (200 kg/acre) at flowering for better pod filling.',
  tomato: 'Stake plants and water at the base to reduce leaf disease.',
  onion: 'Stop irrigation 10-15 days before harvest to improve storage life.',
  potato: 'Earth up 25-30 days after planting; watch for late blight in cool humid weather.',
};

export function getSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 6 && month <= 10) return 'kharif';
  if (month >= 11 || month <= 3) return 'rabi';
  return 'zaid';
}

// "Black Soil", "black", "BLACK cotton soil" -> "black"
export function normalizeSoil(soilType) {
  const text = (soilType || '').toLowerCase();
  return Object.keys(SOIL_ADVICE).find((key) => text.includes(key)) || null;
}

function rankCrops(season, soilKey, preferredCrops) {
  const seasonal = SEASON_CROPS[season];
  const preferred = (preferredCrops || []).map((c) => c.toLowerCase().trim());
  const soilFit = soilKey ? SOIL_CROPS[soilKey] : [];
  const score = (crop) => (preferred.includes(crop) ? 2 : 0) + (soilFit.includes(crop) ? 1 : 0);
  return [...seasonal].sort((a, b) => score(b) - score(a)).slice(0, 5);
}

function buildAlerts(weather) {
  const alerts = [];
  if (!weather) return alerts;
  if (weather.tempC != null && weather.tempC >= 38) {
    alerts.push({ level: 'critical', text: `Heat stress risk (${Math.round(weather.tempC)}°C): irrigate in the evening and mulch to retain moisture.` });
  } else if (weather.tempC != null && weather.tempC >= 35) {
    alerts.push({ level: 'warning', text: `High temperature (${Math.round(weather.tempC)}°C): increase irrigation frequency.` });
  }
  if (weather.tempC != null && weather.tempC <= 4) {
    alerts.push({ level: 'warning', text: 'Frost risk: light irrigation in the evening helps protect crops.' });
  }
  if (weather.condition && /rain|thunder|drizzle/i.test(weather.condition)) {
    alerts.push({ level: 'info', text: 'Rain in the area: hold off irrigation and fertilizer application to avoid runoff.' });
  }
  if (weather.humidity != null && weather.humidity >= 85) {
    alerts.push({ level: 'warning', text: `High humidity (${weather.humidity}%) favours fungal disease - scout for blight and mildew.` });
  }
  if (weather.windSpeed != null && weather.windSpeed >= 10) {
    alerts.push({ level: 'info', text: 'Strong winds: postpone pesticide spraying.' });
  }
  return alerts;
}

export function generateAdvisory({ farm, plot, weather, activeCycles = [] }) {
  const season = getSeason();
  const soilKey = normalizeSoil(farm.soil_type);
  const irrigation = IRRIGATION_BASE[farm.irrigation_access] || IRRIGATION_BASE.rainfed;
  const suggestedCrops = rankCrops(season, soilKey, farm.preferred_crops);
  const alerts = buildAlerts(weather);

  let irrigationText = irrigation.text;
  if (weather?.condition && /rain/i.test(weather.condition)) irrigationText += ' Rain expected - skip the next cycle.';
  if (weather?.tempC != null && weather.tempC > 35) irrigationText += ' Hot weather - shorten the interval by a day.';

  const cropTips = activeCycles
    .map((c) => ({ crop: c.crop_name, tip: CROP_TIPS[c.crop_name.toLowerCase()] }))
    .filter((t) => t.tip);

  return {
    plotName: plot.name,
    season,
    seasonLabel: SEASON_INFO[season].label,
    seasonWindow: SEASON_INFO[season].window,
    suggestedCrops,
    sowingWindow: `${SEASON_INFO[season].sowing} Best fits for your farm: ${suggestedCrops.join(', ')}.`,
    irrigation: irrigationText,
    irrigationInterval: irrigation.interval,
    fertilizer: soilKey ? SOIL_ADVICE[soilKey] : DEFAULT_SOIL_ADVICE,
    soilRecognized: Boolean(soilKey),
    cropTips,
    alerts,
    weather: weather
      ? {
          tempC: weather.tempC,
          humidity: weather.humidity,
          condition: weather.condition,
          description: weather.description,
          windSpeed: weather.windSpeed,
        }
      : null,
    weatherNote: weather ? null : 'Live weather unavailable - set OPENWEATHER_API_KEY for weather-aware alerts.',
  };
}
