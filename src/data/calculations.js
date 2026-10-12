import { MONTHS_SAFRA, getDaysInMonth, getCalendarYearForSafraMonth } from '../utils/dates';

export function calculateSafraMetrics(safra, records) {
  const safraRecords = (records || []).filter(r => r.safra === safra);

  let safraTotal = 0;
  let safraRainyDays = 0;
  let safraMaxDay = { rain_mm: 0, date: null };

  const monthlyData = {};
  for (const m of MONTHS_SAFRA) {
    const calYear = getCalendarYearForSafraMonth(safra, m.key);
    const daysInMonth = getDaysInMonth(calYear, m.indexInYear);
    
    monthlyData[m.code] = {
      monthKey: m.key,
      code: m.code,
      name: m.name,
      shortName: m.shortName,
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
    const rain = Number(r.rain_mm) || 0;
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

  let runningCumulative = 0;
  const progression = [];

  for (const m of MONTHS_SAFRA) {
    const mGroup = monthlyData[m.code];
    mGroup.total_mm = Math.round(mGroup.total_mm * 10) / 10;
    // Obligatory calculation: Total do Mês / quantidade exata de dias do mês
    mGroup.average_mm_day = Math.round((mGroup.total_mm / mGroup.daysInMonth) * 100) / 100;
    
    safraTotal += mGroup.total_mm;
    runningCumulative += mGroup.total_mm;

    progression.push({
      monthCode: m.code,
      monthName: m.name,
      shortName: m.shortName,
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

export function calculateGlobalKPIs(allRecords) {
  if (!allRecords || allRecords.length === 0) {
    return {
      recordDay: { rain_mm: 0, date: null, safra: null },
      wettestSafra: { safra: null, total_mm: 0 },
      driestSafra: { safra: null, total_mm: 0 },
      totalHistoricalRain: 0,
      totalHistoricalRainyDays: 0,
      totalRecords: 0,
      safrasSummary: []
    };
  }

  const safras = [...new Set(allRecords.map(r => r.safra))].sort();

  let maxDay = { rain_mm: 0, date: null, safra: null };
  let totalRain = 0;
  let totalRainyDays = 0;

  for (const r of allRecords) {
    const rain = Number(r.rain_mm) || 0;
    if (rain > 0) totalRainyDays++;
    totalRain += rain;
    if (rain > maxDay.rain_mm) {
      maxDay = { rain_mm: rain, date: r.date, safra: r.safra };
    }
  }

  const safraTotals = safras.map(s => {
    const metrics = calculateSafraMetrics(s, allRecords);
    return { safra: s, total_mm: metrics.total_mm, rainy_days: metrics.rainy_days, max_day: metrics.max_day };
  });

  const sortedByRain = [...safraTotals].sort((a, b) => b.total_mm - a.total_mm);
  const wettestSafra = sortedByRain[0] || { safra: null, total_mm: 0 };
  
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

export function generateDashboardState(allRecords, requestedSafra = null) {
  const safras = [...new Set((allRecords || []).map(r => r.safra))].sort();
  const selectedSafra = requestedSafra && safras.includes(requestedSafra) 
    ? requestedSafra 
    : (safras.length > 0 ? safras[safras.length - 1] : '2026/2027');

  const safraMetricsMap = {};
  for (const s of safras) {
    safraMetricsMap[s] = calculateSafraMetrics(s, allRecords);
  }

  const historicalProgression = MONTHS_SAFRA.map(m => {
    const item = { monthCode: m.code, monthName: m.name, shortName: m.shortName };
    for (const s of safras) {
      const sData = safraMetricsMap[s];
      const mProg = sData ? sData.progression.find(p => p.monthCode === m.code) : null;
      item[`${s}_monthly`] = mProg ? mProg.monthTotal : 0;
      item[`${s}_cum`] = mProg ? mProg.cumulative : 0;
    }
    return item;
  });

  const consolidatedMatrix = MONTHS_SAFRA.map(m => {
    const row = {
      monthCode: m.code,
      monthName: m.name,
      shortName: m.shortName,
      safras: {}
    };
    for (const s of safras) {
      const sData = safraMetricsMap[s];
      const mData = sData ? sData.months[m.code] : null;
      row.safras[s] = {
        total_mm: mData ? mData.total_mm : 0,
        average_mm_day: mData ? mData.average_mm_day : 0,
        rainy_days: mData ? mData.rainy_days : 0,
        daysInMonth: mData ? mData.daysInMonth : 30
      };
    }
    return row;
  });

  const kpis = calculateGlobalKPIs(allRecords);

  return {
    availableSafras: safras,
    currentSafra: selectedSafra,
    currentSafraMetrics: safraMetricsMap[selectedSafra] || null,
    safraMetricsMap,
    historicalProgression,
    consolidatedMatrix,
    kpis,
    monthsList: MONTHS_SAFRA
  };
}
