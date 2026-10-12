const MONTHS_SAFRA = [
  { key: '10', code: 'OUT', name: 'Outubro', indexInYear: 10 },
  { key: '11', code: 'NOV', name: 'Novembro', indexInYear: 11 },
  { key: '12', code: 'DEZ', name: 'Dezembro', indexInYear: 12 },
  { key: '01', code: 'JAN', name: 'Janeiro', indexInYear: 1 },
  { key: '02', code: 'FEV', name: 'Fevereiro', indexInYear: 2 },
  { key: '03', code: 'MAR', name: 'Março', indexInYear: 3 },
  { key: '04', code: 'ABR', name: 'Abril', indexInYear: 4 },
  { key: '05', code: 'MAI', name: 'Maio', indexInYear: 5 },
  { key: '06', code: 'JUN', name: 'Junho', indexInYear: 6 },
  { key: '07', code: 'JUL', name: 'Julho', indexInYear: 7 },
  { key: '08', code: 'AGO', name: 'Agosto', indexInYear: 8 },
  { key: '09', code: 'SET', name: 'Setembro', indexInYear: 9 }
];

function getDaysInMonth(year, month1Indexed) {
  return new Date(year, month1Indexed, 0).getDate();
}

function getCalendarYearForSafraMonth(safra, monthKey) {
  const [startYearStr, endYearStr] = safra.split('/');
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);
  const m = parseInt(monthKey, 10);
  return m >= 10 ? startYear : endYear;
}

function calculateSafraMetrics(safra, records) {
  // Filter records belonging to this safra
  const safraRecords = records.filter(r => r.safra === safra);

  let safraTotal = 0;
  let safraRainyDays = 0;
  let safraMaxDay = { rain_mm: 0, date: null };

  // Group by month
  const monthlyData = {};
  for (const m of MONTHS_SAFRA) {
    const calYear = getCalendarYearForSafraMonth(safra, m.key);
    const daysInMonth = getDaysInMonth(calYear, m.indexInYear);
    
    monthlyData[m.code] = {
      monthKey: m.key,
      code: m.code,
      name: m.name,
      year: calYear,
      daysInMonth: daysInMonth,
      total_mm: 0,
      average_mm_day: 0,
      rainy_days: 0,
      max_day: { rain_mm: 0, date: null },
      records: []
    };
  }

  for (const r of safraRecords) {
    const parts = r.date.split('-');
    const mNum = parts[1];
    const monthDef = MONTHS_SAFRA.find(m => m.key === mNum);
    if (!monthDef) continue;

    const mGroup = monthlyData[monthDef.code];
    const rain = Number(r.rain_mm);
    mGroup.total_mm += rain;
    if (rain > 0) {
      mGroup.rainy_days += 1;
      safraRainyDays += 1;
    }
    if (rain > mGroup.max_day.rain_mm) {
      mGroup.max_day = { rain_mm: rain, date: r.date };
    }
    if (rain > safraMaxDay.rain_mm) {
      safraMaxDay = { rain_mm: rain, date: r.date };
    }
    mGroup.records.push(r);
  }

  // Calculate averages and cumulative progression
  let runningCumulative = 0;
  const progression = [];

  for (const m of MONTHS_SAFRA) {
    const mGroup = monthlyData[m.code];
    mGroup.total_mm = Math.round(mGroup.total_mm * 10) / 10;
    // Monthly average: Total / exact days in that month
    mGroup.average_mm_day = Math.round((mGroup.total_mm / mGroup.daysInMonth) * 100) / 100;
    
    safraTotal += mGroup.total_mm;
    runningCumulative += mGroup.total_mm;

    progression.push({
      monthCode: m.code,
      monthName: m.name,
      year: mGroup.year,
      monthTotal: mGroup.total_mm,
      dailyAverage: mGroup.average_mm_day,
      daysInMonth: mGroup.daysInMonth,
      cumulative: Math.round(runningCumulative * 10) / 10,
      rainyDays: mGroup.rainy_days
    });
  }

  safraTotal = Math.round(safraTotal * 10) / 10;

  return {
    safra,
    total_mm: safraTotal,
    rainy_days: safraRainyDays,
    max_day: safraMaxDay,
    months: monthlyData,
    progression
  };
}

function calculateGlobalKPIs(allRecords) {
  if (!allRecords || allRecords.length === 0) {
    return {
      recordDay: { rain_mm: 0, date: null },
      wettestSafra: { safra: null, total_mm: 0 },
      driestSafra: { safra: null, total_mm: 0 },
      totalHistoricalRain: 0,
      totalHistoricalRainyDays: 0,
      totalRecords: 0
    };
  }

  // Distinct safras
  const safras = [...new Set(allRecords.map(r => r.safra))].sort();

  let maxDay = { rain_mm: 0, date: null };
  let totalRain = 0;
  let totalRainyDays = 0;

  for (const r of allRecords) {
    const rain = Number(r.rain_mm);
    if (rain > 0) totalRainyDays++;
    totalRain += rain;
    if (rain > maxDay.rain_mm) {
      maxDay = { rain_mm: rain, date: r.date, safra: r.safra };
    }
  }

  const safraTotals = safras.map(s => {
    const metrics = calculateSafraMetrics(s, allRecords);
    return { safra: s, total_mm: metrics.total_mm, rainy_days: metrics.rainy_days };
  });

  // For wettest and driest, we evaluate completed safras vs in-progress
  // Safra with max total
  const sortedByRain = [...safraTotals].sort((a, b) => b.total_mm - a.total_mm);
  const wettestSafra = sortedByRain[0] || { safra: null, total_mm: 0 };
  
  // Safra driest: filter out safras with 0 or in-progress initial month (e.g. total > 50mm or completed)
  const completedOrSubstantial = safraTotals.filter(s => s.total_mm > 50);
  const driestSafra = completedOrSubstantial.length > 0 
    ? [...completedOrSubstantial].sort((a, b) => a.total_mm - b.total_mm)[0]
    : sortedByRain[sortedByRain.length - 1];

  return {
    recordDay: maxDay,
    wettestSafra,
    driestSafra: driestSafra || { safra: null, total_mm: 0 },
    totalHistoricalRain: Math.round(totalRain * 10) / 10,
    totalHistoricalRainyDays: totalRainyDays,
    totalRecords: allRecords.length,
    safrasSummary: safraTotals
  };
}

module.exports = {
  MONTHS_SAFRA,
  getDaysInMonth,
  getCalendarYearForSafraMonth,
  calculateSafraMetrics,
  calculateGlobalKPIs
};
