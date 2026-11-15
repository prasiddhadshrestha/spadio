/**
 * SPADIO Climate Telemetry Archive (1980 - 2026)
 * Source Truth:
 * - NASA Goddard Institute for Space Studies (GISS) Surface Temperature Analysis (GISTEMP v4)
 * - NOAA Global Monitoring Laboratory / NASA SVS 5196 (Mauna Loa Atmospheric CO2)
 * - NASA National Snow and Ice Data Center (NSIDC) Sea Ice Index
 */

export const CLIMATE_DATA = {
  1980: {
    tempAnomaly: 0.26,
    co2Ppm: 338.8,
    arcticIceMkm2: 7.85,
    eraTitle: 'Baseline Stability',
    summary: 'Summer Arctic ice sheet remains extensive and thick multi-year ice dominates. Severe heatwave recurrence cycles average once every 25 years.',
    everydayImpact: 'Snowpacks in temperate zones persist reliably into late spring, securing predictable irrigation for agriculture and steady river discharges.'
  },
  1985: {
    tempAnomaly: 0.12,
    co2Ppm: 346.1,
    arcticIceMkm2: 6.91,
    eraTitle: 'Volcanic Dip & Steady Accumulation',
    summary: 'Aerosol cooling from El Chichon causes a brief temperature plateau, while atmospheric greenhouse gas concentrations march steadily upward.',
    everydayImpact: 'Winter freeze dates remain consistent with mid-century patterns; summer cooling degree days stay near baseline averages.'
  },
  1990: {
    tempAnomaly: 0.45,
    co2Ppm: 354.4,
    arcticIceMkm2: 6.24,
    eraTitle: 'First IPCC Warning',
    summary: 'Clear thermal trend emerges above natural variability. Spring snowmelt dates begin advancing 7 to 10 days earlier across Eurasia and North America.',
    everydayImpact: 'Gardening and crop plant hardiness zones begin observable northward creep; ski seasons experience erratic early-winter starts.'
  },
  1995: {
    tempAnomaly: 0.45,
    co2Ppm: 360.8,
    arcticIceMkm2: 6.13,
    eraTitle: 'Post-Pinatubo Resurgence',
    summary: 'Atmospheric aerosols from Mount Pinatubo wash out, exposing accumulated greenhouse forcing with surge in North Atlantic sea surface temperatures.',
    everydayImpact: 'Coastal high-tide flooding ("sunny day flooding") begins increasing in frequency across low-lying coastal urban zones.'
  },
  1998: {
    tempAnomaly: 0.61,
    co2Ppm: 366.7,
    arcticIceMkm2: 6.56,
    eraTitle: 'Super El Nino Shock',
    summary: 'Massive tropical Pacific heat release causes first global-scale coral bleaching crisis and sets 20th-century temperature records.',
    everydayImpact: 'Extreme global weather disruption: torrential rains cause catastrophic landslides while severe droughts fuel Southeast Asian peat fires.'
  },
  2005: {
    tempAnomaly: 0.68,
    co2Ppm: 379.8,
    arcticIceMkm2: 5.57,
    eraTitle: 'Ocean Heat Accelerator',
    summary: 'Record warm ocean surface water fuels historic Atlantic hurricane season (Katrina, Rita, Wilma). Arctic multi-year sea ice thinning accelerates.',
    everydayImpact: 'Insurance underwriting re-evaluates coastal storm surge hazards; summer air conditioning electrical grid peak loads break records.'
  },
  2010: {
    tempAnomaly: 0.72,
    co2Ppm: 389.9,
    arcticIceMkm2: 4.93,
    eraTitle: 'Wobbly Jet Stream & Extreme Blocking',
    summary: 'Slower, meandering Rossby waves trap weather systems: unprecedented Russian heatwave/wildfires coincide with catastrophic Indus river floods in Pakistan.',
    everydayImpact: 'Weather patterns become "stuck" for weeks: heat domes refuse to break, and rainfall stalls over single river basins causing Flash Floods.'
  },
  2012: {
    tempAnomaly: 0.65,
    co2Ppm: 393.8,
    arcticIceMkm2: 3.63,
    eraTitle: 'Historic Arctic Ice Collapse',
    summary: 'NASA satellite observations confirm all-time record low Arctic sea ice minimum (3.63 million km2), less than half the area observed in 1980.',
    everydayImpact: 'Loss of planetary albedo: instead of reflecting 80% of sunlight back to space, open dark Arctic ocean absorbs 90% of solar radiation.'
  },
  2016: {
    tempAnomaly: 1.02,
    co2Ppm: 404.2,
    arcticIceMkm2: 4.72,
    eraTitle: 'The +1.0 C Threshold Breached',
    summary: 'First full calendar year averaging more than 1.0 C above the pre-industrial baseline. Back-to-back bleaching hits 93% of Great Barrier Reef reefs.',
    everydayImpact: 'Wildfire seasons expand into year-round operational risks; nighttime summer temperatures fail to drop, amplifying heat-related health hazards.'
  },
  2020: {
    tempAnomaly: 1.02,
    co2Ppm: 414.2,
    arcticIceMkm2: 4.00,
    eraTitle: 'Compound Extremes & Stratospheric Smoke',
    summary: 'Siberian Arctic reaches 38 C (100 F); Australian Black Summer fires generate towering pyrocumulonimbus storms that circle the southern stratosphere.',
    everydayImpact: 'Air quality degradation affects populations thousands of miles downwind from fire zones; agricultural growing cycles experience shifting frost dates.'
  },
  2023: {
    tempAnomaly: 1.18,
    co2Ppm: 421.1,
    arcticIceMkm2: 4.37,
    eraTitle: 'Global Ocean Thermal Surge',
    summary: 'North Atlantic and global sea surface temperatures break all instrumental records by margins unprecedented in modern climate history.',
    everydayImpact: 'Marine heatwaves devastate fisheries; warmer atmospheres hold 7% more moisture per 1 C warming, dumping unprecedented deluge rainfall.'
  },
  2024: {
    tempAnomaly: 1.48,
    co2Ppm: 424.5,
    arcticIceMkm2: 4.28,
    eraTitle: 'The 1.5 C Horizon Encounter',
    summary: 'First consecutive 12-month period touching 1.5 C above pre-industrial levels. Global coral bleaching confirmed across at least 54 nations and territories.',
    everydayImpact: 'Water reservoirs face simultaneous evaporation stress and flash siltation; tropical diseases expand latitudinal ranges into temperate cities.'
  },
  2026: {
    tempAnomaly: 1.52,
    co2Ppm: 427.8,
    arcticIceMkm2: 4.15,
    eraTitle: 'Current Frontier: The Active Climate Era',
    summary: 'Live planetary telemetry: ocean heat content at peak recorded capacity. Earth Information Center satellite constellation delivers continuous monitoring.',
    everydayImpact: 'Decarbonization, grid resilience, and early warning systems become critical everyday municipal infrastructure for communities worldwide.'
  }
};

export const HOTSPOTS = [
  {
    id: 'arctic',
    name: 'Arctic Ocean',
    lat: 78.0,
    lng: 0.0,
    metric: '-47% Ice Coverage Since 1980',
    mechanism: 'Albedo Feedback Loop',
    detail: 'As reflective white ice melts into dark open water, solar absorption increases tenfold, warming the Arctic three times faster than the global average.'
  },
  {
    id: 'amazon',
    name: 'Amazon Rainforest Basin',
    lat: -3.5,
    lng: -62.0,
    metric: '150 Billion Tons Biomass Carbon',
    mechanism: 'Atmospheric Rivers & Biome Respiration',
    detail: 'The world\'s largest tropical biome transpires 20 billion tons of water vapor daily into airborne moisture corridors, stabilizing rainfall for South America.'
  },
  {
    id: 'amoc',
    name: 'North Atlantic Conveyor (AMOC)',
    lat: 52.0,
    lng: -35.0,
    metric: 'Thermohaline Circulation Stream',
    mechanism: 'Deep Water Heat Redistribution',
    detail: 'Dense salty cold water sinks near Greenland, driving the conveyor that transports equatorial warmth northward and regulates European climates.'
  },
  {
    id: 'sahara',
    name: 'Sahara Dust Corridor (Bodélé)',
    lat: 17.0,
    lng: 18.0,
    metric: '180 Million Tons Dust / Year',
    mechanism: 'Trans-Atlantic Nutrient Transport',
    detail: 'Mineral-rich dust plumes sweep across the Atlantic Ocean, fertilizing Amazonian soils with phosphorus and reflecting solar radiation back into space.'
  },
  {
    id: 'australia',
    name: 'Southeast Australian Fire Basin',
    lat: -34.0,
    lng: 148.0,
    metric: 'Pyrocumulonimbus Stratospheric Injection',
    mechanism: 'Wildfire Weather Coupling',
    detail: 'Intense firestorm heat generates thunderstorms that pump smoke and particulate matter directly into the stratosphere, altering planetary solar transmission.'
  }
];

export function getYearsList() {
  return Object.keys(CLIMATE_DATA).map(Number).sort((a, b) => a - b);
}
