import React, { useState, useMemo } from 'react';
import { ListFilter, Search, Calendar, Trash2, Edit3, Droplet, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateBR } from '../utils/dates';

export default function DailyRecordsList({
  records,
  selectedSafra,
  onEditRecord,
  onDeleteRecord
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSafra, setFilterSafra] = useState(selectedSafra || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Clean number for quick view at the top of the dashboard

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    return (records || []).filter(r => {
      const matchSafra = filterSafra === 'all' || r.safra === filterSafra;
      const matchSearch = !searchTerm || 
        r.date.includes(searchTerm) || 
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSafra && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, filterSafra, searchTerm]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const currentItems = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRainBadgeClass = (mm) => {
    if (mm >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
    if (mm >= 25) return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-300 dark:border-sky-500/40';
    if (mm >= 10) return 'bg-rain-100 text-rain-800 dark:bg-rain-500/20 dark:text-rain-300 border-rain-300 dark:border-rain-500/40';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 relative transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-rain-600 dark:text-rain-400" />
            Diário de Lançamentos ({filteredRecords.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro cronológico das últimas leituras diárias do pluviômetro
          </p>
        </div>

        {/* Barra de busca e filtro */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar data ou nota..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rain-500"
            />
          </div>

          <select
            value={filterSafra}
            onChange={(e) => { setFilterSafra(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-rain-700 dark:text-rain-300 font-semibold focus:outline-none focus:ring-1 focus:ring-rain-500 cursor-pointer"
          >
            <option value="all">Todas as Safras</option>
            {[...new Set((records || []).map(r => r.safra))].sort().map(s => (
              <option key={s} value={s}>Safra {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Registros */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs">
          Nenhum registro encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {currentItems.map((record) => (
              <div
                key={record.id || record.date}
                className="bg-slate-50/80 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2.5 transition group"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rain-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-rain-600 dark:text-rain-400">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatDateBR(record.date)}
                      </span>
                    </div>
                    {record.notes ? (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {record.notes}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Safra {record.safra}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border font-mono ${getRainBadgeClass(record.rain_mm)}`}>
                    {record.rain_mm.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mm
                  </span>

                  <div className="flex items-center opacity-70 group-hover:opacity-100 transition">
                    <button
                      onClick={() => onEditRecord(record)}
                      title="Editar registro"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700/60"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRecord(record)}
                      title="Excluir registro"
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-700/60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Página <strong className="text-slate-800 dark:text-white">{currentPage}</strong> de <strong className="text-slate-800 dark:text-white">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
