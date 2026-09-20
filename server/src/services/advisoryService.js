const SEASON_CROPS = {
  kharif: ['rice', 'maize', 'cotton', 'sugarcane', 'ragi', 'groundnut'],
  rabi: ['wheat', 'mustard', 'chickpea', 'barley', 'peas'],
  zaid: ['watermelon', 'cucumber', 'fodder', 'moong'],
};

const SOIL_ADVICE = {
  'black soil': 'Retains moisture well and suits cotton and sugarcane. Apply balanced NPK (10-26-26) at sowing, then top-dress nitrogen mid-season.',
  'red soil': 'Drains quickly and is low in nitrogen and phosphorus. Add organic compost and a nitrogen-rich fertilizer.',
  'sandy soil': 'Poor water and nutrient retention. Irrigate more frequently in smaller amounts and use slow-release fertilizer.',
  'clay soil': 'Retains water and nutrients well but drains slowly. Avoid overwatering and ensure good drainage.',
  'loamy soil': 'Well-balanced for most crops. A standard NPK fertilizer schedule works well.',
};
const DEFAULT_SOIL_ADVICE = 'Get a soil test done for tailored fertilizer recommendations. In the meantime, apply a balanced general-purpose fertilizer.';

const IRRIGATION_BASE = {
  none: 'No irrigation access — time sowing to monsoon onset and monitor rainfall closely.',
  rainfed: 'Rain-fed — supplement with hand watering during dry spells longer than 5 days.',
  canal: 'Canal-fed — irrigate every 7-10 days, adjusting for rainfall.',
  borewell: 'Borewell access — irrigate every 5-7 days and monitor groundwater use.',
  drip: 'Drip irrigation available — irrigate lightly every 2-3 days for consistent soil moisture.',
  sprinkler: 'Sprinkler irrigation available — irrigate every 3-5 days; avoid midday to reduce evaporation loss.',
};

export function getSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 6 && month <= 10) return 'kharif';
  if (month >= 11 || month <= 3) return 'rabi';
  return 'zaid';
}

function buildIrrigationAdvice(irrigationAccess, weather) {
  let advice = IRRIGATION_BASE[irrigationAccess] || IRRIGATION_BASE.rainfed;

  if (weather) {
    if (weather.tempC != null && weather.tempC > 35) {
      advice += ' High temperatures forecast — increase frequency and consider mulching to retain soil moisture.';
    }
    if (weather.condition && /rain/i.test(weather.condition)) {
      advice += ' Rain expected — hold off irrigation to avoid waterlogging.';
    }
  }

  return advice;
}

function buildCropSuggestions(season, preferredCrops) {
  const seasonal = SEASON_CROPS[season];
  if (!preferredCrops || preferredCrops.length === 0) {
    return seasonal.slice(0, 5);
  }
  const preferredLower = preferredCrops.map((c) => c.toLowerCase());
  const matches = seasonal.filter((c) => preferredLower.includes(c));
  return matches.length > 0 ? matches : seasonal.slice(0, 5);
}

export function generateAdvisory({ farm, plot, weather }) {
  const season = getSeason();
  const soilAdvice = SOIL_ADVICE[(farm.soil_type || '').toLowerCase()] || DEFAULT_SOIL_ADVICE;

  return {
    plotName: plot.name,
    season,
    sowingWindow: `Current season is ${season}. Suitable crops: ${buildCropSuggestions(season, farm.preferred_crops).join(', ')}.`,
    irrigation: buildIrrigationAdvice(farm.irrigation_access, weather),
    fertilizer: soilAdvice,
    weather: weather
      ? {
          tempC: weather.tempC,
          humidity: weather.humidity,
          condition: weather.condition,
          description: weather.description,
        }
      : null,
    weatherNote: weather ? null : 'Live weather data unavailable — configure OPENWEATHER_API_KEY for location-aware recommendations.',
  };
}
