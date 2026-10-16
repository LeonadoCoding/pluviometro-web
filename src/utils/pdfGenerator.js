import { formatDateBR } from './dates';

// Paleta Oilema (Oilema_Theme.json)
const BRAND = {
  petrol: [56, 80, 89],       // #385059
  orange: [242, 131, 34],     // #F28322
  flame: [242, 110, 34],      // #F26E22
  clay: [217, 126, 74],       // #D97E4A
  orangeText: [210, 101, 27], // laranja escurecido para leitura de texto
  orangeSoft: [254, 245, 236],
  ink: [26, 43, 49],
  text: [39, 59, 67],
  muted: [98, 120, 128],
  subtle: [141, 160, 167],
  line: [220, 227, 229],
  zebra: [245, 247, 247],
  card: [252, 252, 252]
};

const LOGO_URL = `${import.meta.env.BASE_URL}logo-oilema.png`;

// Carrega a logo como DataURL + dimensões (para manter a proporção no PDF)
async function loadLogo() {
  try {
    const blob = await (await fetch(LOGO_URL)).blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

// Desenha a logo com altura fixa e retorna a largura ocupada
function drawLogo(doc, logo, x, y, h) {
  if (!logo) return 0;
  const w = h * (logo.width / logo.height);
  doc.addImage(logo.dataUrl, 'PNG', x, y, w, h);
  return w;
}

function drawFooter(doc, text, pageLabel, pageWidth, pageHeight, margin) {
  doc.setFillColor(...BRAND.orange);
  doc.rect(margin, pageHeight - 10, pageWidth - margin * 2, 0.4, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.subtle);
  doc.text(text, margin, pageHeight - 6);
  doc.setTextColor(...BRAND.petrol);
  doc.text(pageLabel, pageWidth - margin, pageHeight - 6, { align: 'right' });
}

async function captureElementAsImage(elementId) {
  const html2canvas = (await import('html2canvas')).default;
  const el = document.getElementById(elementId);
  if (!el) return null;

  const originalWidth = el.style.width;
  const originalMaxWidth = el.style.maxWidth;

  try {
    // Padroniza a largura temporariamente para proporção ideal de relatório (740px)
    // Isso garante que tanto no smartphone quanto no computador o gráfico seja capturado na proporção perfeita
    el.style.width = '740px';
    el.style.maxWidth = '740px';
    window.dispatchEvent(new Event('resize'));

    // Aguarda o Recharts recomputar as dimensões do SVG e concluir a animação das linhas
    await new Promise(resolve => setTimeout(resolve, 1600));

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: null
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
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
    window.dispatchEvent(new Event('resize'));
  }
}

// Função matemática para renderizar imagem preservando RIGOROSAMENTE a proporção (Zero distorção)
function drawPreservedImage(doc, imgData, x, y, maxW, maxH) {
  if (!imgData || !imgData.dataUrl) return y;

  const ratio = imgData.width / imgData.height;
  let targetW = maxW;
  let targetH = targetW / ratio;

  if (targetH > maxH) {
    targetH = maxH;
    targetW = targetH * ratio;
  }

  // Centraliza horizontalmente na área útil da página
  const targetX = x + (maxW - targetW) / 2;

  doc.addImage(imgData.dataUrl, 'PNG', targetX, y, targetW, targetH);
  return y + targetH;
}

export async function generatePluviometroPDF({
  selectedSafra,
  currentSafraMetrics,
  kpis,
  safraMetricsMap,
  availableSafras,
  recentRecords
}) {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  const logo = await loadLogo();

  // 1. Captura ambos os gráficos com garantia de proporção
  const chartProgression = await captureElementAsImage('chart-progression-card');
  const chartHistorical = await captureElementAsImage('chart-historical-card');

  // ==========================================
  // PÁGINA 1: BOLETIM EXECUTIVO & GRÁFICOS
  // ==========================================

  // Header: logo Oilema + identificação, com faixa de destaque laranja/petróleo
  const logoW = drawLogo(doc, logo, margin, 4.5, 16);
  const titleX = logoW ? margin + logoW + 5 : margin;
  if (logoW) {
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.3);
    doc.line(titleX - 2.5, 6, titleX - 2.5, 20);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('UBS SEMENTES OILEMA • PLACAS - BARREIRAS / BA', titleX, 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.orangeText);
  doc.text(`BOLETIM E RELATÓRIO PLUVIOMÉTRICO — SAFRA ${selectedSafra}`, titleX, 15.5);

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Emissão: ${dateFormatted}`, titleX, 20);

  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 24.2, pageWidth, 1.2, 'F');
  doc.setFillColor(...BRAND.petrol);
  doc.rect(0, 25.4, pageWidth, 0.6, 'F');

  let y = 31;

  // 1. CARDS DE KPIS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('1. RESUMO DOS INDICADORES DA SAFRA', margin, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 17;

  const cardsData = [
    {
      title: 'ACUMULADO SAFRA',
      value: `${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '0'} mm`,
      sub: `${currentSafraMetrics?.rainy_days || 0} dias com chuva`,
      color: BRAND.orange
    },
    {
      title: 'MÉDIA DIÁRIA MÊS',
      value: `${(currentSafraMetrics?.progression?.find(p => p.monthTotal > 0)?.dailyAverage || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/d`,
      sub: 'Total ÷ dias exatos',
      color: BRAND.petrol
    },
    {
      title: 'PICO MÁXIMO SAFRA',
      value: `${currentSafraMetrics?.max_day?.rain_mm ? currentSafraMetrics.max_day.rain_mm.toLocaleString('pt-BR') : '0'} mm`,
      sub: currentSafraMetrics?.max_day?.date ? formatDateBR(currentSafraMetrics.max_day.date) : 'N/D',
      color: BRAND.clay
    },
    {
      title: 'RECORDE HISTÓRICO',
      value: `${kpis?.recordDay?.rain_mm ? kpis.recordDay.rain_mm.toLocaleString('pt-BR') : '0'} mm`,
      sub: kpis?.recordDay?.date ? `${formatDateBR(kpis.recordDay.date)} (${kpis.recordDay.safra})` : 'N/D',
      color: BRAND.flame
    }
  ];

  cardsData.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + 3));
    doc.setFillColor(...BRAND.card);
    doc.setDrawColor(...BRAND.line);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Colored left border
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, y, 2.2, cardHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(c.title, x + 4.5, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.ink);
    doc.text(c.value, x + 4.5, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...BRAND.muted);
    doc.text(c.sub, x + 4.5, y + 14.5);
  });

  y += cardHeight + 7;

  // 2. SEÇÃO DE GRÁFICOS VISUAIS COM DIMENSIONAMENTO PERFEITO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('2. ANÁLISE GRÁFICA: PROGRESSO E HISTÓRICO SOBREPOSTO', margin, y);
  y += 4;

  const maxChartH = 94; // Altura máxima permitida para cada gráfico

  // Inserção do Gráfico 1 (Progresso Pluviométrico) com proporção preservada
  if (chartProgression) {
    y = drawPreservedImage(doc, chartProgression, margin, y, contentWidth, maxChartH);
    y += 5;
  }

  // Inserção do Gráfico 2 (Comparativo Histórico Sobreposto) com proporção preservada
  if (chartHistorical) {
    drawPreservedImage(doc, chartHistorical, margin, y, contentWidth, maxChartH);
  }

  // Footer Página 1
  drawFooter(doc, 'Boletim Pluviométrico Oficial • UBS Sementes Oilema • Barreiras / BA', 'Página 1 de 2', pageWidth, pageHeight, margin);

  // ==========================================
  // PÁGINA 2: TABELAS E DETALHAMENTO NUMÉRICO
  // ==========================================
  doc.addPage();

  // Header Compacto Página 2
  const logoW2 = drawLogo(doc, logo, margin, 3, 10);
  const title2X = logoW2 ? margin + logoW2 + 4 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('DETALHAMENTO DO CICLO PLUVIOMÉTRICO', title2X, 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.orangeText);
  doc.text(`Safra ${selectedSafra}`, pageWidth - margin, 9.5, { align: 'right' });

  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 14.6, pageWidth, 0.8, 'F');
  doc.setFillColor(...BRAND.petrol);
  doc.rect(0, 15.4, pageWidth, 0.4, 'F');

  y = 24;

  // 3. TABELA DETALHADA DO CICLO AGRÍCOLA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('3. DETALHAMENTO MENSAL DA SAFRA (OUTUBRO A SETEMBRO)', margin, y);
  y += 4;

  // Cabeçalho da tabela
  doc.setFillColor(...BRAND.petrol);
  doc.rect(margin, y, contentWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MÊS / ANO', margin + 3, y + 4.2);
  doc.text('TOTAL DO MÊS (mm)', margin + 45, y + 4.2);
  doc.text('MÉDIA DIÁRIA (mm/dia)', margin + 90, y + 4.2);
  doc.text('DIAS C/ CHUVA', margin + 135, y + 4.2);
  doc.text('ACUMULADO (mm)', margin + 160, y + 4.2);

  y += 6;

  const progression = currentSafraMetrics?.progression || [];
  progression.forEach((row, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(...(isEven ? [255, 255, 255] : BRAND.zebra));
    doc.rect(margin, y, contentWidth, 5.5, 'F');

    doc.setDrawColor(...BRAND.line);
    doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.text);
    doc.text(`${row.monthName} (${row.year})`, margin + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(`${row.monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 45, y + 4);
    doc.text(`${row.dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/dia (${row.daysInMonth}d)`, margin + 90, y + 4);
    doc.text(`${row.rainyDays} dias`, margin + 135, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.orangeText);
    doc.text(`${row.cumulative.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 160, y + 4);

    y += 5.5;
  });

  // Linha de Total Acumulado
  doc.setFillColor(...BRAND.orangeSoft);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFillColor(...BRAND.orange);
  doc.rect(margin, y, 1.2, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.petrol);
  doc.text('TOTAL ACUMULADO DA SAFRA', margin + 3, y + 4.5);
  doc.text(`${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 45, y + 4.5);
  doc.text(`${currentSafraMetrics?.rainy_days || 0} dias com chuva`, margin + 135, y + 4.5);
  doc.text(`${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 160, y + 4.5);

  y += 14;

  // 4. COMPARATIVO HISTÓRICO DE TODAS AS SAFRAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.petrol);
  doc.text('4. COMPARATIVO HISTÓRICO DE TODAS AS SAFRAS REGISTRADAS', margin, y);
  y += 4;

  doc.setFillColor(...BRAND.petrol);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SAFRA', margin + 3, y + 4);
  doc.text('VOLUME TOTAL (mm)', margin + 45, y + 4);
  doc.text('DIAS C/ CHUVA', margin + 95, y + 4);
  doc.text('MAIOR CHUVA EM 24H (PICO)', margin + 135, y + 4);

  y += 5.5;

  (availableSafras || []).forEach((safraName, idx) => {
    const sMetrics = safraMetricsMap[safraName];
    const isCurrent = safraName === selectedSafra;

    doc.setFillColor(...(isCurrent ? BRAND.orangeSoft : (idx % 2 === 0 ? [255, 255, 255] : BRAND.zebra)));
    doc.rect(margin, y, contentWidth, 5, 'F');

    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...(isCurrent ? BRAND.orangeText : BRAND.text));
    doc.text(`Safra ${safraName}${isCurrent ? ' (Safra Visualizada)' : ''}`, margin + 3, y + 3.8);

    doc.text(`${sMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || 0} mm`, margin + 45, y + 3.8);
    doc.text(`${sMetrics?.rainy_days || 0} dias`, margin + 95, y + 3.8);
    doc.text(`${sMetrics?.max_day?.rain_mm ? `${sMetrics.max_day.rain_mm} mm em ${formatDateBR(sMetrics.max_day.date)}` : '-'}`, margin + 135, y + 3.8);

    y += 5;
  });

  y += 12;

  // 5. ÚLTIMOS LANÇAMENTOS REGISTRADOS
  if (recentRecords && recentRecords.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND.petrol);
    doc.text('5. ÚLTIMAS LEITURAS REGISTRADAS NO PLUVIÔMETRO', margin, y);
    y += 4;

    const lastFive = recentRecords.slice(0, 5);
    const itemW = (contentWidth - 8) / lastFive.length;

    lastFive.forEach((r, idx) => {
      const rx = margin + (idx * (itemW + 2));
      doc.setFillColor(...BRAND.card);
      doc.setDrawColor(...BRAND.line);
      doc.roundedRect(rx, y, itemW, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.muted);
      doc.text(formatDateBR(r.date), rx + 3, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.orangeText);
      doc.text(`${r.rain_mm.toLocaleString('pt-BR')} mm`, rx + 3, y + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...BRAND.subtle);
      doc.text(r.notes ? (r.notes.length > 15 ? r.notes.substring(0, 15) + '...' : r.notes) : 'Leitura oficial', rx + 3, y + 12.5);
    });
  }

  // Footer Página 2
  drawFooter(doc, 'Relatório gerado automaticamente pelo Sistema Pluviômetro Oilema • Validade Técnica e Agronômica', 'Página 2 de 2', pageWidth, pageHeight, margin);

  return doc;
}
