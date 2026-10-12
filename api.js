import seedData from '../data/seedData.json';
import { generateDashboardState } from '../data/calculations';
import { getSafraFromDate } from '../utils/dates';
import { getAuthHeaders } from './auth';

const STORAGE_KEY = 'pluviometro_oilema_records_v1';
const API_URL = import.meta.env.VITE_API_URL || '';

// Safely access local storage
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // fallback if private storage blocked
  }
}

// In-memory cache fallback if localStorage is disabled
let memRecords = null;

// Initialize local storage from seed if empty
function getLocalRecords() {
  if (memRecords && memRecords.length > 0) return memRecords;
  const stored = safeGetItem(STORAGE_KEY);
  if (!stored) {
    safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
    memRecords = [...seedData];
    return memRecords;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
      memRecords = [...seedData];
      return memRecords;
    }
    memRecords = parsed;
    return memRecords;
  } catch {
    safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
    memRecords = [...seedData];
    return memRecords;
  }
}

function saveLocalRecords(records) {
  memRecords = records;
  safeSetItem(STORAGE_KEY, JSON.stringify(records));
}

let isBackendAvailable = null;

export async function checkBackendConnection() {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const cType = res.headers.get('content-type') || '';
    if (res.ok && cType.includes('application/json')) {
      const data = await res.json();
      isBackendAvailable = true;
      return { online: true, count: data.recordsCount };
    }
  } catch {
    // backend not available or Netlify static
  }
  isBackendAvailable = false;
  return { online: false, count: getLocalRecords().length };
}

export async function fetchDashboardData(selectedSafra = null) {
  // If backend is active, try to fetch from API
  if (isBackendAvailable !== false) {
    try {
      const url = selectedSafra ? `${API_URL}/api/metrics?safra=${encodeURIComponent(selectedSafra)}` : `${API_URL}/api/metrics`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      });
      const cType = res.headers.get('content-type') || '';
      if (res.ok && cType.includes('application/json')) {
        const data = await res.json();
        isBackendAvailable = true;
        return { data, isLocalMode: false };
      }
    } catch {
      isBackendAvailable = false;
    }
  }

  // Fallback to local mode (Netlify / offline)
  const records = getLocalRecords();
  const dashboard = generateDashboardState(records, selectedSafra);
  return { data: dashboard, isLocalMode: true };
}

export async function fetchRecordsList(safra = null) {
  if (isBackendAvailable) {
    try {
      const url = safra ? `${API_URL}/api/records?safra=${encodeURIComponent(safra)}&limit=1000` : `${API_URL}/api/records?limit=1000`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        const json = await res.json();
        return json.records || [];
      }
    } catch {
      // fallback
    }
  }

  const records = getLocalRecords();
  let filtered = [...records];
  if (safra) {
    filtered = filtered.filter(r => r.safra === safra);
  }
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveRainRecord({ date, rain_mm, notes, property }) {
  const parsedRain = typeof rain_mm === 'string' ? parseFloat(rain_mm.replace(',', '.')) : parseFloat(rain_mm);
  const cleanRain = Math.round(parsedRain * 10) / 10;
  const safra = getSafraFromDate(date);
  const prop = property || 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS';

  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ date, rain_mm: cleanRain, notes, property: prop })
      });
      if (res.ok) {
        const json = await res.json();
        return json.record;
      }
    } catch {
      // fallback to local
    }
  }

  // Local storage save
  const records = getLocalRecords();
  const existingIdx = records.findIndex(r => r.date === date);
  const newRecord = {
    id: existingIdx >= 0 ? records[existingIdx].id || Date.now() : Date.now(),
    date,
    rain_mm: cleanRain,
    safra,
    property: prop,
    notes: notes || null,
    updated_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    records[existingIdx] = newRecord;
  } else {
    records.push(newRecord);
  }

  saveLocalRecords(records);
  return newRecord;
}

export async function deleteRainRecord(record) {
  if (isBackendAvailable && record.id) {
    try {
      const res = await fetch(`${API_URL}/api/records/${record.id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (res.ok) return true;
    } catch {
      // fallback
    }
  }

  const records = getLocalRecords();
  const filtered = records.filter(r => (record.id ? r.id !== record.id : r.date !== record.date));
  saveLocalRecords(filtered);
  return true;
}

export async function resetDatabaseToSeed() {
  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_URL}/api/reset-seed`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
        return true;
      }
    } catch {
      // fallback
    }
  }
  safeSetItem(STORAGE_KEY, JSON.stringify(seedData));
  return true;
}

export async function exportAllData() {
  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_URL}/api/export`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
  }
  return getLocalRecords();
}

export async function importDataBatch(recordsArray) {
  if (!Array.isArray(recordsArray)) throw new Error('Formato inválido.');

  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(recordsArray)
      });
      if (res.ok) {
        const json = await res.json();
        return json.count;
      }
    } catch {
      // fallback
    }
  }

  // Local import
  const current = getLocalRecords();
  const map = new Map();
  for (const r of current) map.set(r.date, r);
  for (const r of recordsArray) {
    if (!r.date || r.rain_mm === undefined) continue;
    const rain = typeof r.rain_mm === 'string' ? parseFloat(r.rain_mm.replace(',', '.')) : parseFloat(r.rain_mm);
    if (isNaN(rain) || rain < 0) continue;
    map.set(r.date, {
      ...r,
      rain_mm: Math.round(rain * 10) / 10,
      safra: r.safra || getSafraFromDate(r.date)
    });
  }

  const updated = Array.from(map.values());
  saveLocalRecords(updated);
  return updated.length;
}
