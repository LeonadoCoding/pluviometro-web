import { formatDateBR } from './dates';
import { getDefaultMonth } from '../data/calculations';

// Paleta Oilema (Oilema_Theme.json)
const BRAND = {
  petrol: [56, 80, 89],       // #385059
  orange: [242, 131, 34],     // #F28322
  orangeText: [210, 101, 27], // laranja escurecido para leitura de texto
  orangeSoft: [254, 245, 236],
  ink: [26, 43, 49],
  text: [39, 59, 67],
  muted: [74, 98, 107],
  subtle: [98, 120, 128],
  line: [220, 227, 229],
  zebra: [245, 247, 247],
  card: [252, 252, 252],
  positive: [5, 150, 105],
  negative: [217, 119, 6]
};

const BASE = import.meta.env.BASE_URL;
const FONT = 'PlusJakartaSans';
const EM_DASH = '—';

// Evento ouvido pelo App: durante a captura os gráficos são renderizados no tema claro e sem animação
export const PDF_CAPTURE_EVENT = 'pluviometro:pdf-capture';
const setCaptureMode = (active) => window.dispatchEvent(new CustomEvent(PDF_CAPTURE_EVENT, { detail: active }));

const fmt = (n, digits = 1) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

async function fetchAsDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Carrega a logo como DataURL + dimensões (para manter a proporção no PDF)
async function loadLogo() {
  try {
    const dataUrl = await fetchAsDataUrl(`${BASE}logo-oilema.png`);
    const { width, height } = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, width, height };
  } catch (err) {
    console.warn('Não foi possível carregar a logo para o PDF:', err);
    return null;
  }
}

// Embute a Plus Jakarta Sans (fonte do site) no PDF; se falhar, usa Helvetica
async function registerBrandFont(doc) {
  try {
    const files = [['PlusJakartaSans-Regular.ttf', 'normal'], ['PlusJakartaSans-Bold.ttf', 'bold']];
    for (const [file, style] of files) {
      const dataUrl = await fetchAsDataUrl(`${BASE}fonts/${file}`);
      doc.addFileToVFS(file, dataUrl.split(',')[1]);
      doc.addFont(file, FONT, style);
    }
    return FONT;
  } catch (err) {
    console.warn('Fonte da marca indisponível, usando Helvetica:', err);
    return 'helvetica';
  }
}

async function captureElementAsImage(elementId) {
  const html2canvas = (await import('html2canvas')).default;
  const el = document.getElementById(elementId);
  if (!el) return null;

  const originalWidth = el.style.width;
  const originalMaxWidth = el.style.maxWidth;
  const originalAlignSelf = el.style.alignSelf;

  try {
    // Largura fixa de captura: mesma proporção no celular e no computador
    el.style.width = '740px';
    el.style.maxWidth = '740px';
    // Evita que o card seja esticado pela grade (altura do card vizinho) durante a captura
    el.style.alignSelf = 'start';
    window.dispatchEvent(new Event('resize'));

    // Aguarda o Recharts recomputar as dimensões do SVG (animações ficam desligadas na captura)
    await new Promise(resolve => setTimeout(resolve, 400));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Controles interativos (botões, chips) têm data-html2canvas-ignore e não entram na captura
      onclone: (clonedDoc) => {
        const card = clonedDoc.getElementById(elementId);
        if (!card) return;
        // Sem moldura de card: o gráfico entra "limpo" na página
        Object.assign(card.style, {
          border: 'none', boxShadow: 'none', background: '#ffffff',
          backdropFilter: 'none', borderRadius: '0', padding: '0'
        });
      }
    });

    return {
      // JPEG com fundo branco: arquivo final muito menor que PNG sem compressão
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
      width: canvas.width,
      height: canvas.height
    };
  } catch (err) {
    console.warn(`Erro ao capturar #${elementId}:`, err);
    return null;
  } finally {
    // Restaura o layout responsivo original da página
    el.style.width = originalWidth;
    el.style.maxWidth = originalMaxWidth;
    el.style.alignSelf = originalAlignSelf;
    window.dispatchEvent(new Event('resize'));
  }
}

// Renderiza a imagem preservando a proporção, centralizada na largura disponível
function drawPreservedImage(doc, imgData, x, y, maxW, maxH) {
  if (!imgData || !imgData.dataUrl) return y;

  const ratio = imgData.width / imgData.height;
  let targetW = maxW;
  let targetH = targetW / ratio;

  if (targetH > maxH) {
    targetH = maxH;
    targetW = targetH * ratio;
  }

  const targetX = x + (maxW - targetW) / 2;
  doc.addImage(imgData.dataUrl, 'JPEG', targetX, y, targetW, targetH, undefined, 'FAST');
  return y + targetH;
}

export async function generatePluviometroPDF({
  selectedSafra,
  currentSafraMetrics,
  kpis,
  safraMetricsMap,
  availableSafras,
  recentRecords,
  historicalMonthAvg = {}
}) {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);
  const right = pageWidth - margin;

  const [logo, fontName] = await Promise.all([loadLogo(), registerBrandFont(doc)]);
  const font = (style = 'normal', size = 8, color = BRAND.text) => {
    doc.setFont(fontName, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawLogo = (x, y, h) => {
    if (!logo) return 0;
    const w = h * (logo.width / logo.height);
    doc.addImage(logo.dataUrl, 'PNG', x, y, w, h, 'logo', 'FAST');
    return w;
  };

  const sectionTitle = (text, y) => {
    font('bold', 10, BRAND.petrol);
    doc.text(text, margin, y);
    return y + 4;
  };

  const drawFooter = (pageLabel) => {
    doc.setFillColor(...BRAND.orange);
    doc.rect(margin, pageHeight - 10, contentWidth, 0.4, 'F');
    font('normal', 7, BRAND.subtle);
    doc.text('Dados registrados no pluviômetro da UBS Placas • Barreiras/BA', margin, pageHeight - 6);
    font('bold', 7, BRAND.petrol);
    doc.text(pageLabel, right, pageHeight - 6, { align: 'right' });
  };

  // Gráficos capturados antes de desenhar (a captura altera o layout por alguns instantes)
  let chartProgression = null;
  let chartHistorical = null;
  setCaptureMode(true);
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    chartProgression = await captureElementAsImage('chart-progression-card');
    chartHistorical = await captureElementAsImage('chart-historical-card');
  } finally {
    setCaptureMode(false);
  }

  const progression = currentSafraMetrics?.progression || [];
  const monthsMap = currentSafraMetrics?.months || {};

  // ==========================================
  // PÁGINA 1: INDICADORES E GRÁFICOS
  // ==========================================

  const logoW = drawLogo(margin, 4.5, 16);
  const titleX = logoW ? margin + logoW + 5 : margin;
  if (logoW) {
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.line(titleX - 2.5, 6, titleX - 2.5, 20);
  }

  font('bold', 13, BRAND.petrol);
  doc.text('UBS Placas • Barreiras/BA', titleX, 10.5);
  font('bold', 8.5, BRAND.orangeText);
  doc.text(`BOLETIM PLUVIOMÉTRICO • SAFRA ${selectedSafra}`, titleX, 15.5);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  font('normal', 7.5, BRAND.subtle);
  doc.text(`Emissão: ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} às ${pad(now.getHours())}:${pad(now.getMinutes())}`, titleX, 20);

  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 24.2, pageWidth, 1.2, 'F');
  doc.setFillColor(...BRAND.petrol);
  doc.rect(0, 25.4, pageWidth, 0.6, 'F');

  let y = sectionTitle('1. Resumo dos indicadores da safra', 33);

  // Mesma regra do card do site para o mês exibido
  const activeMonth = getDefaultMonth(currentSafraMetrics);
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 18;
  const cardsData = [
    {
      title: 'ACUMULADO DA SAFRA',
      value: `${fmt(currentSafraMetrics?.total_mm)} mm`,
      sub: `${currentSafraMetrics?.rainy_days || 0} dias com chuva`,
      color: BRAND.orange
    },
    {
      title: 'MÉDIA DIÁRIA DO MÊS',
      value: `${fmt(activeMonth?.average_mm_day, 2)} mm/dia`,
      sub: activeMonth ? `${activeMonth.name} • ${fmt(activeMonth.total_mm)} mm ÷ ${activeMonth.daysInMonth} dias` : EM_DASH,
      color: BRAND.petrol
    },
    {
      title: 'PICO MÁXIMO DA SAFRA',
      value: `${fmt(currentSafraMetrics?.max_day?.rain_mm)} mm`,
      sub: currentSafraMetrics?.max_day?.date ? formatDateBR(currentSafraMetrics.max_day.date) : EM_DASH,
      color: BRAND.petrol
    },
    {
      title: 'RECORDE HISTÓRICO',
      value: `${fmt(kpis?.recordDay?.rain_mm)} mm`,
      sub: kpis?.recordDay?.date ? `${formatDateBR(kpis.recordDay.date)} • Safra ${kpis.recordDay.safra}` : EM_DASH,
      color: BRAND.petrol
    }
  ];

  cardsData.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + 3));
    doc.setFillColor(...BRAND.card);
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
    doc.setFillColor(...c.color);
    doc.rect(x, y, 1.6, cardHeight, 'F');

    font('bold', 6.5, BRAND.subtle);
    doc.text(c.title, x + 4.5, y + 4.6);
    font('bold', 11, BRAND.ink);
    doc.text(c.value, x + 4.5, y + 10.8);
    font('normal', 6.3, BRAND.muted);
    doc.text(c.sub, x + 4.5, y + 15.2, { maxWidth: cardWidth - 6 });
  });

  y += cardHeight + 9;

  y = sectionTitle('2. Análise gráfica: progresso e histórico sobreposto', y);
  y += 1;
  const maxChartH = 104;
  if (chartProgression) {
    y = drawPreservedImage(doc, chartProgression, margin, y, contentWidth, maxChartH);
    y += 4;
    doc.setDrawColor(...BRAND.line);
    doc.line(margin, y, right, y);
    y += 4;
  }
  if (chartHistorical) {
    drawPreservedImage(doc, chartHistorical, margin, y, contentWidth, Math.min(maxChartH, pageHeight - 14 - y));
  }

  drawFooter('Página 1 de 2');

  // ==========================================
  // PÁGINA 2: TABELAS E DETALHAMENTO NUMÉRICO
  // ==========================================
  doc.addPage();

  const logoW2 = drawLogo(margin, 3, 10);
  const title2X = logoW2 ? margin + logoW2 + 4 : margin;
  font('bold', 10, BRAND.petrol);
  doc.text('Detalhamento do ciclo pluviométrico', title2X, 9.5);
  font('bold', 8, BRAND.orangeText);
  doc.text(`Safra ${selectedSafra}`, right, 9.5, { align: 'right' });
  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 14.6, pageWidth, 0.8, 'F');
  doc.setFillColor(...BRAND.petrol);
  doc.rect(0, 15.4, pageWidth, 0.4, 'F');

  // Tabela genérica: colunas com largura e alinhamento; números à direita
  const drawTable = (columns, rows, startY, { headerH = 6.5, rowH = 5.6 } = {}) => {
    let ty = startY;
    doc.setFillColor(...BRAND.petrol);
    doc.rect(margin, ty, contentWidth, headerH, 'F');
    font('bold', 6.8, [255, 255, 255]);
    let cx = margin;
    columns.forEach(col => {
      const tx = col.align === 'right' ? cx + col.w - 2.5 : cx + 2.5;
      doc.text(col.label, tx, ty + headerH / 2 + 1.2, { align: col.align || 'left' });
      cx += col.w;
    });
    ty += headerH;

    rows.forEach((row, i) => {
      const bg = row.highlight ? BRAND.orangeSoft : (i % 2 === 1 ? BRAND.zebra : [255, 255, 255]);
      doc.setFillColor(...bg);
      doc.rect(margin, ty, contentWidth, rowH, 'F');
      if (row.highlight) {
        doc.setFillColor(...BRAND.orange);
        doc.rect(margin, ty, 1.2, rowH, 'F');
      }
      let rx = margin;
      columns.forEach((col, ci) => {
        const cell = row.cells[ci];
        const value = typeof cell === 'object' && cell !== null ? cell : { text: cell };
        font(value.bold || row.bold ? 'bold' : 'normal', 7.3, value.color || (row.highlight ? BRAND.ink : BRAND.text));
        const tx = col.align === 'right' ? rx + col.w - 2.5 : rx + 2.5;
        doc.text(String(value.text ?? EM_DASH), tx, ty + rowH / 2 + 1.2, { align: col.align || 'left' });
        // Selo após o texto (ex.: "ATUAL"), posicionado pela largura real do texto
        if (value.badge) {
          const textW = doc.getTextWidth(String(value.text));
          const bx = tx + textW + 2;
          font('bold', 5.5, [255, 255, 255]);
          const bw = doc.getTextWidth(value.badge) + 3;
          doc.setFillColor(...BRAND.orange);
          doc.roundedRect(bx, ty + 1.2, bw, rowH - 2.4, 0.8, 0.8, 'F');
          doc.text(value.badge, bx + 1.5, ty + rowH / 2 + 0.9);
        }
        rx += col.w;
      });
      ty += rowH;
    });
    return ty;
  };

  // 3. DETALHAMENTO MENSAL (com média histórica e desvio)
  y = sectionTitle('3. Detalhamento mensal da safra (outubro a setembro)', 24);

  const deviationCell = (value, reference) => {
    if (reference == null || reference <= 0 || value == null) return EM_DASH;
    const pct = Math.round(((value - reference) / reference) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, bold: true, color: pct >= 0 ? BRAND.positive : BRAND.negative };
  };

  let histToDate = 0;
  const monthRows = progression.map(row => {
    const m = monthsMap[row.monthCode];
    const hist = historicalMonthAvg[row.monthCode];
    const label = `${row.monthName} (${row.year})${m?.status === 'current' ? ' *' : ''}`;
    if (row.isFuture) {
      return { cells: [{ text: label, color: BRAND.subtle }, EM_DASH, EM_DASH, EM_DASH, EM_DASH, hist != null ? fmt(hist) : EM_DASH, EM_DASH] };
    }
    if (hist != null) histToDate += hist;
    return {
      cells: [
        { text: label, bold: true },
        fmt(row.monthTotal),
        `${fmt(row.dailyAverage, 2)} (${row.daysInMonth}d)`,
        String(row.rainyDays),
        { text: fmt(row.cumulative), bold: true, color: BRAND.orangeText },
        hist != null ? fmt(hist) : EM_DASH,
        m?.status === 'current' ? { text: 'em curso', color: BRAND.subtle } : deviationCell(row.monthTotal, hist)
      ]
    };
  });
  monthRows.push({
    highlight: true,
    bold: true,
    cells: [
      'TOTAL DA SAFRA',
      fmt(currentSafraMetrics?.total_mm),
      EM_DASH,
      String(currentSafraMetrics?.rainy_days || 0),
      { text: fmt(currentSafraMetrics?.total_mm), color: BRAND.orangeText },
      histToDate > 0 ? fmt(histToDate) : EM_DASH,
      deviationCell(currentSafraMetrics?.total_mm, histToDate)
    ]
  });

  y = drawTable([
    { label: 'MÊS', w: 40 },
    { label: 'TOTAL (mm)', w: 22, align: 'right' },
    { label: 'MÉDIA (mm/dia)', w: 28, align: 'right' },
    { label: 'DIAS C/ CHUVA', w: 22, align: 'right' },
    { label: 'ACUMULADO (mm)', w: 26, align: 'right' },
    { label: 'MÉDIA HIST. (mm)', w: 26, align: 'right' },
    { label: 'DESVIO', w: 22, align: 'right' }
  ], monthRows, y);

  font('normal', 6.3, BRAND.subtle);
  doc.text('* Mês em andamento (valores parciais). Média histórica: média dos meses já encerrados de todas as safras. Desvio: total do mês em relação à média histórica.', margin, y + 4, { maxWidth: contentWidth });
  y += 12;

  // 4. COMPARATIVO HISTÓRICO
  y = sectionTitle('4. Comparativo histórico de todas as safras registradas', y);
  const safraRows = (availableSafras || []).map(safraName => {
    const sMetrics = safraMetricsMap[safraName];
    const isCurrent = safraName === selectedSafra;
    return {
      highlight: isCurrent,
      cells: [
        isCurrent ? { text: `Safra ${safraName}`, bold: true, badge: 'ATUAL' } : `Safra ${safraName}`,
        fmt(sMetrics?.total_mm),
        String(sMetrics?.rainy_days || 0),
        sMetrics?.max_day?.rain_mm ? fmt(sMetrics.max_day.rain_mm) : EM_DASH,
        sMetrics?.max_day?.date ? formatDateBR(sMetrics.max_day.date) : EM_DASH
      ]
    };
  });
  y = drawTable([
    { label: 'SAFRA', w: 54 },
    { label: 'VOLUME TOTAL (mm)', w: 34, align: 'right' },
    { label: 'DIAS C/ CHUVA', w: 30, align: 'right' },
    { label: 'MAIOR CHUVA EM 24H (mm)', w: 40, align: 'right' },
    { label: 'DATA DO PICO', w: 28, align: 'right' }
  ], safraRows, y);
  y += 10;

  // 5. ÚLTIMAS LEITURAS
  if (recentRecords && recentRecords.length > 0) {
    y = sectionTitle('5. Últimas leituras registradas no pluviômetro', y);
    const lastFive = recentRecords.slice(0, 5);
    const gap = 2.5;
    const itemW = (contentWidth - gap * (lastFive.length - 1)) / lastFive.length;
    const itemH = 19;

    lastFive.forEach((r, idx) => {
      const rx = margin + (idx * (itemW + gap));
      doc.setFillColor(...BRAND.card);
      doc.setDrawColor(...BRAND.line);
      doc.roundedRect(rx, y, itemW, itemH, 1.5, 1.5, 'FD');

      font('bold', 7, BRAND.subtle);
      doc.text(formatDateBR(r.date), rx + 3, y + 4.8);
      font('bold', 10, BRAND.orangeText);
      doc.text(`${fmt(r.rain_mm)} mm`, rx + 3, y + 10);
      font('normal', 6.3, BRAND.muted);
      const note = doc.splitTextToSize(r.notes || 'Leitura registrada', itemW - 6).slice(0, 2);
      doc.text(note, rx + 3, y + 13.6);
    });
  }

  drawFooter('Página 2 de 2');

  return doc;
}
