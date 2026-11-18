import React, { useState, useMemo, useEffect } from 'react';
import { NotebookPen, Search, Trash2, PencilLine, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PanelHeader } from './ui/primitives';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const PER_PAGE = 8;

const fmt1 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Intensidade da leitura: sempre com texto, nunca só a cor
function intensity(mm) {
  if (mm <= 0) return { label: 'Sem chuva', bar: 'bg-line', text: 'text-ink-muted' };
  if (mm < 10) return { label: 'Fraca', bar: 'bg-orange-300 dark:bg-orange-400/70', text: 'text-ink-muted' };
  if (mm < 25) return { label: 'Moderada', bar: 'bg-accent', text: 'text-accent-text' };
  if (mm < 50) return { label: 'Forte', bar: 'bg-orange-600', text: 'text-accent-text' };
  return { label: 'Muito forte', bar: 'bg-warning', text: 'text-warning' };
}

function RecordTile({ record, canEdit, canDelete, onEdit, onDelete, index }) {
  const d = new Date(`${record.date}T12:00:00`);
  const level = intensity(record.rain_mm);
  const width = Math.min(100, (record.rain_mm / 60) * 100);
  return (
    <li
      className="group relative rounded-lg border border-line bg-surface-sunken p-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:border-[rgba(242,131,34,.45)] hover:shadow-card-hover hover:-translate-y-0.5 [animation:fade-up_.35s_cubic-bezier(.2,.8,.2,1)_both]"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-12 rounded-md bg-surface border border-line flex flex-col items-center justify-center flex-shrink-0">
            <span className="num font-display text-[19px] leading-5 font-bold text-ink-strong">{String(d.getDate()).padStart(2, '0')}</span>
            <span className="text-[10px] leading-3 font-semibold uppercase tracking-wide text-ink-muted">{MONTHS[d.getMonth()]}</span>
          </div>
          <div className="min-w-0">
            <p className="flex items-baseline gap-1">
              <span className="num font-display text-[22px] leading-6 font-bold text-ink-strong">{fmt1(record.rain_mm)}</span>
              <span className="text-[13px] font-bold text-accent-text">mm</span>
            </p>
            <p className="text-[12px] leading-4 text-ink-muted mt-0.5 truncate">
              <span className="capitalize">{WEEKDAYS[d.getDay()]}</span> · <span className={`font-semibold ${level.text}`}>{level.label}</span>
            </p>
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center -mr-1.5 -mt-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
            {canEdit && (
              <button type="button" onClick={() => onEdit(record)} className="btn btn-icon-sm" title="Editar leitura" aria-label={`Editar leitura de ${record.date.split('-').reverse().join('/')}`}>
                <PencilLine />
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => onDelete(record)} className="btn btn-icon-sm is-danger" title="Excluir leitura" aria-label={`Excluir leitura de ${record.date.split('-').reverse().join('/')}`}>
                <Trash2 />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 h-1 rounded-full bg-surface-control overflow-hidden">
        <span className={`block h-full rounded-full ${level.bar}`} style={{ width: `${Math.max(record.rain_mm > 0 ? 4 : 0, width)}%` }} />
      </div>
      {record.notes && <p className="mt-2 text-[12px] leading-4 text-ink truncate" title={record.notes}>{record.notes}</p>}
    </li>
  );
}

export default function DailyRecordsList({ records, selectedSafra, onEditRecord, onDeleteRecord, canEdit = true, canDelete = true }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSafra, setFilterSafra] = useState(selectedSafra || 'all');
  const [currentPage, setCurrentPage] = useState(1);

  // Acompanha a safra escolhida no topo
  useEffect(() => { setFilterSafra(selectedSafra || 'all'); setCurrentPage(1); }, [selectedSafra]);

  const safras = useMemo(() => [...new Set((records || []).map(r => r.safra))].sort().reverse(), [records]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (records || []).filter(r => {
      if (filterSafra !== 'all' && r.safra !== filterSafra) return false;
      if (!term) return true;
      const br = r.date.split('-').reverse().join('/');
      return br.includes(term) || r.date.includes(term) || (r.notes || '').toLowerCase().includes(term);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, filterSafra, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const items = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sum = filtered.reduce((a, r) => a + r.rain_mm, 0);

  return (
    <div className="panel panel-pad enter" style={{ '--i': 1 }}>
      <PanelHeader
        icon={NotebookPen}
        title="Diário de leituras"
        subtitle={
          <span className="num">
            {filtered.length.toLocaleString('pt-BR')} {filtered.length === 1 ? 'leitura' : 'leituras'} · {fmt1(sum)} mm no filtro
          </span>
        }
        actions={
          <>
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar data ou nota"
                aria-label="Buscar por data ou observação"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="input input-sm pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-icon-sm w-7 h-7" aria-label="Limpar busca">
                  <X />
                </button>
              )}
            </div>
            <select
              value={filterSafra}
              onChange={(e) => { setFilterSafra(e.target.value); setCurrentPage(1); }}
              aria-label="Filtrar por safra"
              className="input input-sm w-auto font-semibold"
            >
              <option value="all">Todas as safras</option>
              {safras.map(s => <option key={s} value={s}>Safra {s}</option>)}
            </select>
          </>
        }
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line py-10 text-center">
          <p className="text-[15px] font-semibold text-ink-strong">Nenhuma leitura encontrada</p>
          <p className="t-body-small text-ink-muted mt-1">Troque a safra ou limpe a busca para ver mais.</p>
        </div>
      ) : (
        <>
          <ul key={`${filterSafra}-${page}-${searchTerm}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {items.map((record, i) => (
              <RecordTile key={record.id || record.date} index={i} record={record} canEdit={canEdit} canDelete={canDelete} onEdit={onEditRecord} onDelete={onDeleteRecord} />
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-4 mt-1">
              <span className="text-[13px] text-ink-muted num">
                Página <b className="text-ink-strong">{page}</b> de <b className="text-ink-strong">{totalPages}</b>
              </span>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={page === 1} onClick={() => setCurrentPage(page - 1)} className="btn btn-secondary px-3" aria-label="Página anterior">
                  <ChevronLeft /><span className="hidden sm:inline">Anterior</span>
                </button>
                <button type="button" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)} className="btn btn-secondary px-3" aria-label="Próxima página">
                  <span className="hidden sm:inline">Próxima</span><ChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
