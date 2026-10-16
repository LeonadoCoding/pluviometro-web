import seedData from '../data/seedData.json';
import { generateDashboardState } from '../data/calculations';
import { getSafraFromDate } from '../utils/dates';
import { getSupabaseConfig, getValidAccessToken } from './auth';

const TABLE = 'rain_records';
const DEFAULT_PROPERTY = 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS';

function requireConfig() {
  return getSupabaseConfig();
}
export async function supabaseFetch(path, options = {}) {
  const { url, anonKey } = requireConfig();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sessão expirada. Entre novamente.');
    if (response.status === 403 || data.code === '42501') throw new Error('Acesso negado pelas regras de segurança do Supabase. Verifique se sua conta está cadastrada como administradora.');
    throw new Error(data.message || data.details || 'Erro ao acessar os dados no Supabase.');
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}
async function fetchAllRecords() {
  const all = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const batch = await supabaseFetch(`${TABLE}?select=*&order=date.desc&limit=${pageSize}&offset=${start}`);
    all.push(...(batch || []));
    if (!batch || batch.length < pageSize) break;
  }
  return all;
}
function normalizeRecord(record) {
  return {
    ...record,
    rain_mm: Number(record.rain_mm) || 0,
    safra: record.safra || getSafraFromDate(record.date),
    property: record.property || DEFAULT_PROPERTY
  };
}
function localRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem('pluviometro_oilema_records_v1') || 'null');
    return Array.isArray(parsed) && parsed.length ? parsed : seedData;
  } catch { return seedData; }
}
export async function checkBackendConnection() {
  const { url, anonKey } = requireConfig();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch(`${url}/rest/v1/${TABLE}?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Não foi possível conectar ao banco de dados do Supabase.');
  }
  let records = await fetchAllRecords();
  // Inicializa o banco vazio com os registros históricos do projeto, uma única vez.
  if (records.length === 0) {
    await supabaseFetch(`${TABLE}?on_conflict=date`, {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(seedData.map(r => ({ ...r, notes: r.notes || null })))
    });
    records = await fetchAllRecords();
  }
  return { online: true, count: records.length };
}
export async function fetchDashboardData(selectedSafra = null) {
  const records = (await fetchAllRecords()).map(normalizeRecord);
  return { data: generateDashboardState(records, selectedSafra), isLocalMode: false };
}
export async function fetchRecordsList(safra = null) {
  const records = (await fetchAllRecords()).map(normalizeRecord);
  return (safra ? records.filter(r => r.safra === safra) : records)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export async function saveRainRecord({ date, rain_mm, notes, property }) {
  const rain = typeof rain_mm === 'string' ? parseFloat(rain_mm.replace(',', '.')) : Number(rain_mm);
  if (!date || !Number.isFinite(rain) || rain < 0) throw new Error('Informe uma data e um volume de chuva válido.');
  const record = {
    date,
    rain_mm: Math.round(rain * 10) / 10,
    safra: getSafraFromDate(date),
    property: property || DEFAULT_PROPERTY,
    notes: notes || null,
    updated_at: new Date().toISOString()
  };
  const result = await supabaseFetch(`${TABLE}?on_conflict=date`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(record)
  });
  return normalizeRecord(result?.[0] || record);
}
export async function deleteRainRecord(record) {
  if (!record?.id) throw new Error('O registro não possui um identificador válido.');
  await supabaseFetch(`${TABLE}?id=eq.${encodeURIComponent(record.id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' }
  });
  return true;
}
export async function resetDatabaseToSeed() {
  await supabaseFetch(`${TABLE}?id=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await supabaseFetch(`${TABLE}?on_conflict=date`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(seedData.map(r => ({ ...r, notes: r.notes || null })))
  });
  return true;
}
export async function exportAllData() {
  return (await fetchAllRecords()).map(normalizeRecord);
}
export async function importDataBatch(recordsArray) {
  if (!Array.isArray(recordsArray)) throw new Error('Formato inválido.');
  const normalized = recordsArray
    .filter(r => r?.date && r.rain_mm !== undefined)
    .map(r => {
      const rain = typeof r.rain_mm === 'string' ? parseFloat(r.rain_mm.replace(',', '.')) : Number(r.rain_mm);
      if (!Number.isFinite(rain) || rain < 0) return null;
      return {
        date: r.date,
        rain_mm: Math.round(rain * 10) / 10,
        safra: r.safra || getSafraFromDate(r.date),
        property: r.property || DEFAULT_PROPERTY,
        notes: r.notes || null,
        updated_at: new Date().toISOString()
      };
    }).filter(Boolean);
  if (!normalized.length) return 0;
  await supabaseFetch(`${TABLE}?on_conflict=date`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(normalized)
  });
  return normalized.length;
}
