export const MONTHS_SAFRA = [
  { key: '10', code: 'OUT', name: 'Outubro', shortName: 'Out', indexInYear: 10 },
  { key: '11', code: 'NOV', name: 'Novembro', shortName: 'Nov', indexInYear: 11 },
  { key: '12', code: 'DEZ', name: 'Dezembro', shortName: 'Dez', indexInYear: 12 },
  { key: '01', code: 'JAN', name: 'Janeiro', shortName: 'Jan', indexInYear: 1 },
  { key: '02', code: 'FEV', name: 'Fevereiro', shortName: 'Fev', indexInYear: 2 },
  { key: '03', code: 'MAR', name: 'Março', shortName: 'Mar', indexInYear: 3 },
  { key: '04', code: 'ABR', name: 'Abril', shortName: 'Abr', indexInYear: 4 },
  { key: '05', code: 'MAI', name: 'Maio', shortName: 'Mai', indexInYear: 5 },
  { key: '06', code: 'JUN', name: 'Junho', shortName: 'Jun', indexInYear: 6 },
  { key: '07', code: 'JUL', name: 'Julho', shortName: 'Jul', indexInYear: 7 },
  { key: '08', code: 'AGO', name: 'Agosto', shortName: 'Ago', indexInYear: 8 },
  { key: '09', code: 'SET', name: 'Setembro', shortName: 'Set', indexInYear: 9 }
];

export function getDaysInMonth(year, month1Indexed) {
  return new Date(year, month1Indexed, 0).getDate();
}

export function getSafraFromDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (month >= 10) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

export function getCalendarYearForSafraMonth(safra, monthKey) {
  if (!safra) return new Date().getFullYear();
  const [startYearStr, endYearStr] = safra.split('/');
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);
  const m = parseInt(monthKey, 10);
  return m >= 10 ? startYear : endYear;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
