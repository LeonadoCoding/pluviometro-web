import { formatDateBR } from './dates';

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

    // Aguarda o Recharts recomputar as dimensões do SVG
    await new Promise(resolve => setTimeout(resolve, 100));

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

  // 1. Captura ambos os gráficos com garantia de proporção
  const chartProgression = await captureElementAsImage('chart-progression-card');
  const chartHistorical = await captureElementAsImage('chart-historical-card');

  // ==========================================
  // PÁGINA 1: BOLETIM EXECUTIVO & GRÁFICOS
  // ==========================================

  // Header Banner
  doc.setFillColor(11, 19, 41); // Deep Navy
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent Line Sky
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 25, pageWidth, 1.2, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('UBS SEMENTES OILEMA • PLACAS - BARREIRAS / BA', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(186, 230, 253);
  doc.text(`BOLETIM E RELATÓRIO PLUVIOMÉTRICO — SAFRA ${selectedSafra}`, margin, 17);

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emissão: ${dateFormatted}`, pageWidth - margin - 45, 17);

  let y = 31;

  // 1. CARDS DE KPIS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMO DOS INDICADORES DA SAFRA', margin, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 17;

  const cardsData = [
    {
      title: 'ACUMULADO SAFRA',
      value: `${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '0'} mm`,
      sub: `${currentSafraMetrics?.rainy_days || 0} dias com chuva`,
      color: [14, 165, 233]
    },
    {
      title: 'MÉDIA DIÁRIA MÊS',
      value: `${(currentSafraMetrics?.progression?.find(p => p.monthTotal > 0)?.dailyAverage || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/d`,
      sub: 'Total ÷ dias exatos',
      color: [16, 185, 129]
    },
    {
      title: 'PICO MÁXIMO SAFRA',
      value: `${currentSafraMetrics?.max_day?.rain_mm ? currentSafraMetrics.max_day.rain_mm.toLocaleString('pt-BR') : '0'} mm`,
      sub: currentSafraMetrics?.max_day?.date ? formatDateBR(currentSafraMetrics.max_day.date) : 'N/D',
      color: [245, 158, 11]
    },
    {
      title: 'RECORDE HISTÓRICO',
      value: `${kpis?.recordDay?.rain_mm ? kpis.recordDay.rain_mm.toLocaleString('pt-BR') : '0'} mm`,
      sub: kpis?.recordDay?.date ? `${formatDateBR(kpis.recordDay.date)} (${kpis.recordDay.safra})` : 'N/D',
      color: [99, 102, 241]
    }
  ];

  cardsData.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + 3));
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Colored left border
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, y, 2.2, cardHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 4.5, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(c.value, x + 4.5, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, x + 4.5, y + 14.5);
  });

  y += cardHeight + 7;

  // 2. SEÇÃO DE GRÁFICOS VISUAIS COM DIMENSIONAMENTO PERFEITO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Boletim Pluviométrico Oficial • UBS Sementes Oilema • Barreiras / BA', margin, pageHeight - 6);
  doc.text('Página 1 de 2', pageWidth - margin - 18, pageHeight - 6);

  // ==========================================
  // PÁGINA 2: TABELAS E DETALHAMENTO NUMÉRICO
  // ==========================================
  doc.addPage();

  // Header Compacto Página 2
  doc.setFillColor(11, 19, 41);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 15.2, pageWidth, 0.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('UBS SEMENTES OILEMA • DETALHAMENTO DO CICLO PLUVIOMÉTRICO', margin, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(186, 230, 253);
  doc.text(`Safra ${selectedSafra}`, pageWidth - margin - 22, 10.5);

  y = 24;

  // 3. TABELA DETALHADA DO CICLO AGRÍCOLA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETALHAMENTO MENSAL DA SAFRA (OUTUBRO A SETEMBRO)', margin, y);
  y += 4;

  // Cabeçalho da tabela
  doc.setFillColor(15, 23, 42);
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
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 5.5, 'F');

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${row.monthName} (${row.year})`, margin + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(`${row.monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 45, y + 4);
    doc.text(`${row.dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm/dia (${row.daysInMonth}d)`, margin + 90, y + 4);
    doc.text(`${row.rainyDays} dias`, margin + 135, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 165, 233);
    doc.text(`${row.cumulative.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 160, y + 4);

    y += 5.5;
  });

  // Linha de Total Acumulado
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ACUMULADO DA SAFRA', margin + 3, y + 4.5);
  doc.text(`${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 45, y + 4.5);
  doc.text(`${currentSafraMetrics?.rainy_days || 0} dias com chuva`, margin + 135, y + 4.5);
  doc.text(`${currentSafraMetrics?.total_mm?.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm`, margin + 160, y + 4.5);

  y += 14;

  // 4. COMPARATIVO HISTÓRICO DE TODAS AS SAFRAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. COMPARATIVO HISTÓRICO DE TODAS AS SAFRAS REGISTRADAS', margin, y);
  y += 4;

  doc.setFillColor(51, 65, 85);
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

    doc.setFillColor(isCurrent ? 240 : (idx % 2 === 0 ? 255 : 248), isCurrent ? 249 : 250, isCurrent ? 255 : 252);
    doc.rect(margin, y, contentWidth, 5, 'F');

    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(isCurrent ? 2 : 51, isCurrent ? 132 : 65, isCurrent ? 199 : 85);
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
    doc.setTextColor(15, 23, 42);
    doc.text('5. ÚLTIMAS LEITURAS REGISTRADAS NO PLUVIÔMETRO', margin, y);
    y += 4;

    const lastFive = recentRecords.slice(0, 5);
    const itemW = (contentWidth - 8) / lastFive.length;

    lastFive.forEach((r, idx) => {
      const rx = margin + (idx * (itemW + 2));
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(rx, y, itemW, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(formatDateBR(r.date), rx + 3, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(14, 165, 233);
      doc.text(`${r.rain_mm.toLocaleString('pt-BR')} mm`, rx + 3, y + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(r.notes ? (r.notes.length > 15 ? r.notes.substring(0, 15) + '...' : r.notes) : 'Leitura oficial', rx + 3, y + 12.5);
    });
  }

  // Footer Página 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Relatório gerado automaticamente pelo Sistema Pluviômetro Oilema • Validade Técnica e Agronômica', margin, pageHeight - 6);
  doc.text('Página 2 de 2', pageWidth - margin - 18, pageHeight - 6);

  return doc;
}
