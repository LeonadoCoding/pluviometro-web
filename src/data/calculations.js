import { MONTHS_SAFRA, getDaysInMonth, getCalendarYearForSafraMonth } from '../utils/dates';

// Situação do mês em relação a hoje: 'past' (encerrado), 'current' (em andamento) ou 'future'
function getMonthStatus(year, month1Indexed, today = new Date()) {
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  if (year < ty || (year === ty && month1Indexed < tm)) return 'past';
  if (year === ty && month1Indexed === tm) return 'current';
  return 'future';
}

export function calculateSafraMetrics(safra, records) {
  const safraRecords = (records || []).filter(r => r.safra === safra);

  let safraTotal = 0;
  let safraRainyDays = 0;
  let safraMaxDay = { rain_mm: 0, date: null };

  const monthlyData = {};
  for (const m of MONTHS_SAFRA) {
    const calYear = getCalendarYearForSafraMonth(safra, m.key);
    const daysInMonth = getDaysInMonth(calYear, m.indexInYear);
    const status = getMonthStatus(calYear, m.indexInYear);
    const elapsedDays = status === 'past' ? daysInMonth : status === 'current' ? new Date().getDate() : 0;
    
    monthlyData[m.code] = {
      monthKey: m.key,
      code: m.code,
      name: m.name,
      shortName: m.shortName,
      year: calYear,
      daysInMonth: daysInMonth,
      status,
      isFuture: status === 'future',
      elapsedDays,
      total_mm: 0,
      average_mm_day: 0,
      average_mm_day_elapsed: 0,
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
    // Média considerando apenas os dias já decorridos (difere da anterior só no mês em andamento)
    mGroup.average_mm_day_elapsed = mGroup.elapsedDays > 0
      ? Math.round((mGroup.total_mm / mGroup.elapsedDays) * 100) / 100
      : 0;
    
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
      isFuture: mGroup.isFuture,
      // Meses futuros ficam sem acumulado para a curva terminar no mês atual
      cumulative: mGroup.isFuture ? null : Math.round(runningCumulative * 10) / 10,
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

// Mês exibido por padrão no card "Média Diária do Mês" e no PDF:
// o mês corrente do calendário, quando a safra o contém e ele já começou;
// senão, o último mês com chuva da safra (ou o primeiro do ciclo).
export function getDefaultMonth(safraMetrics) {
  const monthsMap = safraMetrics?.months || {};
  const monthsList = MONTHS_SAFRA.map(m => monthsMap[m.code]).filter(Boolean);
  const current = monthsList.find(m => m.status === 'current');
  if (current) return current;
  const withRain = monthsList.filter(m => m.total_mm > 0 && !m.isFuture);
  return withRain.length ? withRain[withRain.length - 1] : monthsList[0] || null;
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
    const inProgress = Object.values(metrics.months).some(m => m.isFuture || m.status === 'current');
    return { safra: s, total_mm: metrics.total_mm, rainy_days: metrics.rainy_days, max_day: metrics.max_day, inProgress };
  });

  const sortedByRain = [...safraTotals].sort((a, b) => b.total_mm - a.total_mm);
  const wettestSafra = sortedByRain[0] || { safra: null, total_mm: 0 };
  
  // Safra em andamento não entra na comparação de "mais seca" (ainda está acumulando)
  const completedOrSubstantial = safraTotals.filter(s => s.total_mm > 50 && !s.inProgress);
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
      item[`${s}_monthly`] = mProg && !mProg.isFuture ? mProg.monthTotal : null;
      item[`${s}_cum`] = mProg ? mProg.cumulative : null;
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
        daysInMonth: mData ? mData.daysInMonth : 30,
        isFuture: mData ? mData.isFuture : false
      };
    }
    return row;
  });

  // Média histórica por mês: somente meses já encerrados de cada safra
  const historicalMonthAvg = {};
  for (const m of MONTHS_SAFRA) {
    const totals = safras
      .map(s => safraMetricsMap[s]?.months[m.code])
      .filter(md => md && md.status === 'past')
      .map(md => md.total_mm);
    historicalMonthAvg[m.code] = totals.length
      ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
      : null;
  }

  const kpis = calculateGlobalKPIs(allRecords);

  return {
    availableSafras: safras,
    currentSafra: selectedSafra,
    currentSafraMetrics: safraMetricsMap[selectedSafra] || null,
    safraMetricsMap,
    historicalProgression,
    consolidatedMatrix,
    historicalMonthAvg,
    kpis,
    monthsList: MONTHS_SAFRA
  };
}
