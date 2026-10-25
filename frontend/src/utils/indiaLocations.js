import localCatalog from '../data/indiaStatesDistricts.json';
import api from '../services/api';

export const defaultStatesDistricts = localCatalog.states || {};

export const UNION_TERRITORIES = new Set([
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]);

export function isUnionTerritory(name) {
  if (!name) return false;
  return UNION_TERRITORIES.has(name.trim());
}

export function getAllIndiaStates(locations = defaultStatesDistricts) {
  if (!locations || typeof locations !== 'object') return [];
  return Object.keys(locations).sort((a, b) => a.localeCompare(b));
}

function hasCompleteDistrictCoverage(candidate) {
  const localStates = defaultStatesDistricts;
  if (!candidate || typeof candidate !== 'object') return false;

  return Object.entries(localStates).every(([state, districts]) => {
    const serverState = Object.keys(candidate).find((name) => name.toLowerCase() === state.toLowerCase());
    const serverDistricts = serverState ? candidate[serverState] : null;
    if (!Array.isArray(serverDistricts)) return false;
    const normalizedDistricts = new Set(serverDistricts.map((district) => String(district).toLowerCase()));
    return districts.every((district) => normalizedDistricts.has(district.toLowerCase()));
  });
}

export async function loadIndiaStatesDistricts() {
  try {
    const response = await api.get('/public/locations');
    const locations = response.data?.states || response.data;
    if (hasCompleteDistrictCoverage(locations)) return locations;
  } catch {
    return defaultStatesDistricts;
  }

  return defaultStatesDistricts;
}
