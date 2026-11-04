import React, { useState, useMemo, useEffect } from 'react';
import { LogbookEntry, AttendanceStatus } from '../types/logbook';
import { parseDateScore, parseTimeScore, parseDateDetails, normalizeLogbookEntry } from '../utils/storage';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  Edit3, 
  Trash2, 
  Eye, 
  FileDown, 
  FileUp, 
  PlusCircle, 
  X,
  Maximize2,
  AlertCircle,
  HardDrive,
  RotateCcw,
  CheckCircle2,
  Camera,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface LogbookListProps {
  entries: LogbookEntry[];
  onEditEntry: (entry: LogbookEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddNew: () => void;
  onImportBackup: (imported: LogbookEntry[]) => void;
  onRecoverPhotos?: () => { count: number; dates: string[] };
  onSortEntries?: (sorted: LogbookEntry[]) => void;
  onNavigateToReport?: () => void;
}

export const LogbookList: React.FC<LogbookListProps> = ({
  entries,
  onEditEntry,
  onDeleteEntry,
  onAddNew,
  onImportBackup,
  onRecoverPhotos,
  onSortEntries,
  onNavigateToReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default: Tanggal awal sampai akhir (1 -> 31)
  const [hasManuallySelectedMonth, setHasManuallySelectedMonth] = useState(false);
  const [previewPhotoEntry, setPreviewPhotoEntry] = useState<LogbookEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LogbookEntry | null>(null);
  const [recoveryFeedback, setRecoveryFeedback] = useState<{
    show: boolean;
    count: number;
    dates: string[];
  } | null>(null);
  const [sortFeedback, setSortFeedback] = useState<string | null>(null);

  // Missing photos detector (WFO entries without fotoSebelum or fotoSesudah)
  const missingPhotosEntries = useMemo(() => {
    return entries.filter((e) => e.kehadiran === 'WFO' && (!e.fotoSebelum || !e.fotoSesudah));
  }, [entries]);

  const handleTriggerRecovery = () => {
    if (onRecoverPhotos) {
      const res = onRecoverPhotos();
      setRecoveryFeedback({
        show: true,
        count: res.count,
        dates: res.dates,
      });
    }
  };

  // Eksekusi penyusunan tanggal secara berurutan dan langsung sinkronkan ke master data / Laporan Resmi
  const handleExecuteDateSort = (newOrder: 'asc' | 'desc' = 'asc') => {
    setSortOrder(newOrder);
    const sorted = [...entries].map(normalizeLogbookEntry).sort((a, b) => {
      const factor = newOrder === 'asc' ? 1 : -1;
      const scoreA = parseDateScore(a.tanggal);
      const scoreB = parseDateScore(b.tanggal);
      if (scoreA !== scoreB) return factor * (scoreA - scoreB);
      const timeA = parseTimeScore(a.waktuMulai);
      const timeB = parseTimeScore(b.waktuMulai);
      if (timeA !== timeB) return factor * (timeA - timeB);
      return factor * (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    if (onSortEntries) {
      onSortEntries(sorted);
    } else if (onImportBackup) {
      onImportBackup(sorted);
    }

    setSortFeedback(
      `Semua tanggal logbook (${sorted.length} kegiatan) telah disusun rapi berurutan (${newOrder === 'asc' ? '1 s/d 31' : '31 s/d 1'}) dan langsung terinput ke Laporan Resmi!`
    );
    setTimeout(() => setSortFeedback(null), 4500);
  };

  // Filtered and chronologically sorted entries
  const filteredEntries = useMemo(() => {
    return entries
      .map(normalizeLogbookEntry)
      .filter((entry) => {
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchUraian = entry.uraianPekerjaan.toLowerCase().includes(q);
          const matchLokasi = entry.lokasiPekerjaan.toLowerCase().includes(q);
          const matchKategori = (entry.kategori || '').toLowerCase().includes(q);
          if (!matchUraian && !matchLokasi && !matchKategori) return false;
        }

        // Attendance filter
        if (filterAttendance !== 'all' && entry.kehadiran !== filterAttendance) {
          return false;
        }

        // Month filter (YYYY-MM)
        if (filterMonth !== 'all') {
          const entryMonth = parseDateDetails(entry.tanggal).formattedYMD.substring(0, 7);
          if (entryMonth !== filterMonth) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        // 1. Urutkan tanggal secara numerik mutlak (1 s/d 31 setiap bulan)
        const dateScoreA = parseDateScore(a.tanggal);
        const dateScoreB = parseDateScore(b.tanggal);
        if (dateScoreA !== dateScoreB) {
          return factor * (dateScoreA - dateScoreB);
        }
        // 2. Jika tanggal sama, urutkan jam mulai (pagi ke sore)
        const timeScoreA = parseTimeScore(a.waktuMulai);
        const timeScoreB = parseTimeScore(b.waktuMulai);
        if (timeScoreA !== timeScoreB) {
          return factor * (timeScoreA - timeScoreB);
        }
        // 3. Fallback createdAt
        return factor * (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [entries, searchTerm, filterMonth, filterAttendance, sortOrder]);

  // Available months from entries, sorted descending (latest first, e.g. 2026-11, 2026-10, ...)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      const ym = parseDateDetails(e.tanggal).formattedYMD.substring(0, 7);
      set.add(ym);
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Compute month breakdown data with Indonesian labels and photo counts
  const monthDataMap = useMemo(() => {
    const map = new Map<string, {
      key: string;
      label: string;
      shortLabel: string;
      year: number;
      monthNum: number;
      totalEntries: number;
      wfoCount: number;
      sakitCount: number;
      cutiCount: number;
      photoCount: number;
    }>();

    entries.forEach((e) => {
      const pd = parseDateDetails(e.tanggal);
      const ym = pd.formattedYMD.substring(0, 7);
      if (!map.has(ym)) {
        const mIdx = Math.max(0, Math.min(11, pd.month - 1));
        const label = `${MONTH_NAMES[mIdx]} ${pd.year}`;
        const shortLabel = `${MONTH_NAMES[mIdx].substring(0, 3)} '${String(pd.year).substring(2)}`;
        map.set(ym, {
          key: ym,
          label,
          shortLabel,
          year: pd.year,
          monthNum: pd.month,
          totalEntries: 0,
          wfoCount: 0,
          sakitCount: 0,
          cutiCount: 0,
          photoCount: 0,
        });
      }
      const item = map.get(ym)!;
      item.totalEntries++;
      if (e.kehadiran === 'WFO') item.wfoCount++;
      else if (e.kehadiran === 'Sakit') item.sakitCount++;
      else if (e.kehadiran === 'Cuti') item.cutiCount++;

      if (e.fotoSebelum) item.photoCount++;
      if (e.fotoSesudah) item.photoCount++;
      if (e.suratSakit) item.photoCount++;
    });

    return map;
  }, [entries]);

  // Automatically select the latest month with entries so the view is always per satu bulan by default
  useEffect(() => {
    if (!hasManuallySelectedMonth && availableMonths.length > 0) {
      setFilterMonth(availableMonths[0]);
    } else if (filterMonth !== 'all' && availableMonths.length > 0 && !availableMonths.includes(filterMonth)) {
      setFilterMonth(availableMonths[0]);
    }
  }, [availableMonths, hasManuallySelectedMonth, filterMonth]);

  // Quick navigation between months (e.g. November -> Oktober)
  const currentMonthIdx = availableMonths.indexOf(filterMonth);
  const canGoPrevious = currentMonthIdx >= 0 && currentMonthIdx < availableMonths.length - 1; // older month
  const canGoNext = currentMonthIdx > 0; // newer month

  const handleGoPreviousMonth = () => {
    if (canGoPrevious) {
      setHasManuallySelectedMonth(true);
      setFilterMonth(availableMonths[currentMonthIdx + 1]);
    }
  };

  const handleGoNextMonth = () => {
    if (canGoNext) {
      setHasManuallySelectedMonth(true);
      setFilterMonth(availableMonths[currentMonthIdx - 1]);
    }
  };

  // Active month object if a single month is filtered
  const activeMonthData = filterMonth !== 'all' ? monthDataMap.get(filterMonth) : null;

  // Statistics for current filtered view
  const currentStats = useMemo(() => {
    let wfoCount = 0;
    let sakitCount = 0;
    let cutiCount = 0;

    filteredEntries.forEach((e) => {
      if (e.kehadiran === 'WFO') wfoCount++;
      else if (e.kehadiran === 'Sakit') sakitCount++;
      else if (e.kehadiran === 'Cuti') cutiCount++;
    });

    return {
      total: filteredEntries.length,
      wfoCount,
      sakitCount,
      cutiCount,
    };
  }, [filteredEntries]);

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Backup_Logbook_KPS1_Manoko_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportBackup(parsed);
          alert(`Berhasil mengimpor ${parsed.length} data logbook!`);
        } else {
          alert('Format file cadangan tidak sesuai.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON cadangan.');
      }
    };
    reader.readAsText(file);
  };

  // Estimate total storage size consumed by logbooks and photos
  const estimatedBytes = useMemo(() => {
    try {
      return new Blob([JSON.stringify(entries)]).size;
    } catch {
      return entries.length * 120000;
    }
  }, [entries]);
  const estimatedMb = (estimatedBytes / (1024 * 1024)).toFixed(1);
  const percentageOf1Gb = Math.min(100, Math.max(0.1, Number(((estimatedBytes / (1024 * 1024 * 1024)) * 100).toFixed(2))));

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-stone-950/75 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
            Riwayat & Rekap Logbook Harian
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            Data operasional kegiatan harian pegawai di Kebun Pemeriksaan Substantif PVT I Manoko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRecoverPhotos && (
            <button
              onClick={handleTriggerRecovery}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all shadow-xs border ${
                missingPhotosEntries.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-400 shadow-md ring-2 ring-amber-400/50'
                  : 'text-white bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              title="Pulihkan seluruh foto dokumentasi kegiatan yang hilang secara ketat sesuai tanggal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Pulihkan Foto (Recovery)</span>
              {missingPhotosEntries.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-200 text-[10px] font-bold">
                  {missingPhotosEntries.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors shadow-xs"
            title="Unduh cadangan data dalam format JSON"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-300" />
            <span>Cadangan Data</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shadow-xs">
            <FileUp className="w-3.5 h-3.5 text-emerald-300" />
            <span>Pulihkan</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs border border-emerald-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Catatan</span>
          </button>
        </div>
      </div>

      {/* Alert Banner: Pemberitahuan Foto Belum Lengkap / Terpotong */}
      {missingPhotosEntries.length > 0 && (
        <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>Pemberitahuan Foto Dokumentasi</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono">
                  {missingPhotosEntries.length} kegiatan belum lengkap
                </span>
              </p>
              <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
                Sebagian foto terpotong akibat kuota penyimpanan peramban. Klik tombol untuk mengembalikan foto dokumentasi (Foto Sebelum & Foto Sesudah) secara otomatis sesuai tanggal kegiatan.
              </p>
            </div>
          </div>
          <button
            onClick={handleTriggerRecovery}
            className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Pulihkan Foto Sekarang</span>
          </button>
        </div>
      )}

      {/* Feedback Toast / Banner saat Pemulihan Foto Berhasil */}
      {recoveryFeedback && recoveryFeedback.show && (
        <div className="bg-emerald-900/90 border border-emerald-400 text-white rounded-xl p-4 shadow-xl flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-emerald-100">
                Pemulihan Foto Dokumentasi Sesuai Tanggal Berhasil!
              </p>
              <p className="text-emerald-200 leading-relaxed">
                {recoveryFeedback.count > 0 
                  ? `Berhasil memulihkan ${recoveryFeedback.count} foto dokumentasi (Foto Sebelum & Foto Sesudah) yang langsung dicocokkan secara akurat dengan tanggal kegiatan (${recoveryFeedback.dates.length} tanggal terpulihkan).`
                  : 'Seluruh foto dokumentasi kegiatan telah lengkap dan sesuai dengan tanggal.'}
              </p>
              <p className="text-[11px] text-emerald-300">
                Foto kini telah aktif kembali di menu rekap dan langsung tertera pada Tabel Dokumentasi Laporan Resmi.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRecoveryFeedback(null)}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Feedback Banner saat Tanggal Berhasil Diurutkan & Terinput ke Laporan Resmi */}
      {sortFeedback && (
        <div className="bg-emerald-950/90 border border-emerald-400/80 text-white rounded-xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold text-emerald-100">
              {sortFeedback}
            </p>
          </div>
          <button
            onClick={() => setSortFeedback(null)}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KATEGORI BULAN (TAMPILAN TERPADU PER SATU BULAN) */}
      {/* Memudahkan pengguna berpindah antar bulan (misal November ke Oktober) dengan rapi & cepat */}
      {/* Setiap bulan tersimpan rapih & lengkap dengan seluruh foto dokumentasi */}
      {/* ========================================================================= */}
      {availableMonths.length > 0 && (
        <div className="bg-stone-950/85 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl space-y-3.5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Kategori Bulan Rekap Laporan</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {availableMonths.length} Bulan Tersimpan
                  </span>
                </h2>
                <p className="text-xs text-stone-300">
                  Data logbook disajikan per satu bulan lengkap dengan foto dokumentasi. Ketuk kategori bulan di bawah untuk berpindah periode:
                </p>
              </div>
            </div>

            {/* Quick Prev / Next Month Navigator */}
            {filterMonth !== 'all' && (
              <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleGoPreviousMonth}
                  disabled={!canGoPrevious}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 border border-stone-700 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-stone-300 hover:text-white cursor-pointer active:scale-95"
                  title="Lihat bulan sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Bulan Sebelumnya</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoNextMonth}
                  disabled={!canGoNext}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 border border-stone-700 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-stone-300 hover:text-white cursor-pointer active:scale-95"
                  title="Lihat bulan berikutnya"
                >
                  <span className="hidden xs:inline">Bulan Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Month Chips List (Horizontal scrollable & wrap) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {availableMonths.map((ym) => {
              const data = monthDataMap.get(ym);
              if (!data) return null;
              const isActive = filterMonth === ym;

              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => {
                    setHasManuallySelectedMonth(true);
                    setFilterMonth(ym);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer select-none border ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40 scale-[1.02]'
                      : 'bg-stone-900/90 text-stone-300 border-stone-700/80 hover:bg-stone-800 hover:text-white hover:border-emerald-500/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-300 animate-pulse' : 'bg-stone-500'}`} />
                  <span>{data.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-emerald-950/60 text-emerald-100' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {data.totalEntries}
                  </span>
                  {data.photoCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-300" title={`${data.photoCount} foto dokumentasi tersimpan`}>
                      <Camera className="w-3 h-3" />
                      <span>{data.photoCount}</span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* Opsi Tampilkan Semua Bulan */}
            <button
              type="button"
              onClick={() => {
                setHasManuallySelectedMonth(true);
                setFilterMonth('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                filterMonth === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-stone-900/70 text-stone-400 border-stone-800 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Bulan</span>
              <span className="text-[10px] font-mono opacity-80">({entries.length})</span>
            </button>
          </div>

          {/* Active Month Status Banner */}
          {activeMonthData ? (
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-amber-300 text-sm">📅</span>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">
                    Menampilkan Rekap: Bulan {activeMonthData.label}
                  </p>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    {activeMonthData.totalEntries} kegiatan tercatat ({activeMonthData.wfoCount} WFO, {activeMonthData.sakitCount} Sakit, {activeMonthData.cutiCount} Cuti) · Seluruh foto dokumentasi ({activeMonthData.photoCount} foto) tersimpan aman &amp; lengkap.
                  </p>
                </div>
              </div>

              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={onNavigateToReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
                  title="Lihat format resmi kedinasan untuk bulan ini"
                >
                  <span>Buka di Laporan Resmi</span>
                  <span>→</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-400 flex items-center justify-between">
              <span>Menampilkan seluruh {entries.length} catatan kegiatan dari semua bulan.</span>
              {availableMonths.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setHasManuallySelectedMonth(true);
                    setFilterMonth(availableMonths[0]);
                  }}
                  className="text-emerald-400 hover:underline text-[11px] font-semibold cursor-pointer"
                >
                  Kembali ke tampilan per bulan ({monthDataMap.get(availableMonths[0])?.label})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Attendance KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            Total Kegiatan
          </span>
          <span className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
            {currentStats.total}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">
            {filterMonth !== 'all' && activeMonthData ? `Bulan ${activeMonthData.label}` : 'Semua entri tercatat'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
            Kehadiran WFO
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 tabular-nums">
            {currentStats.wfoCount}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5">Hari kerja di kebun</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">
            Izin Sakit
          </span>
          <span className="text-2xl font-extrabold text-amber-800 mt-0.5 tabular-nums">
            {currentStats.sakitCount}
          </span>
          <span className="text-[11px] text-amber-600 mt-0.5">Hari keterangan sakit</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
            Cuti Resmi
          </span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 tabular-nums">
            {currentStats.cutiCount}
          </span>
          <span className="text-[11px] text-blue-600 mt-0.5">Hari cuti tahunan/resmi</span>
        </div>
      </div>

      {/* Indikator Kapasitas Penyimpanan Cloud & Lokal */}
      <div className="bg-stone-900/90 border border-emerald-500/25 rounded-xl p-3.5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">Status Penyimpanan Data:</span>
              <span className="text-emerald-300 font-semibold bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px]">
                Sangat Longgar ({percentageOf1Gb}% dari 1.000 MB)
              </span>
            </div>
            <p className="text-[11px] text-stone-300 mt-0.5">
              Terpakai perkiraan ~<strong>{estimatedMb} MB</strong> dari kuota gratis <strong>1 GB (1.000 MB)</strong>. Masih sangat luas untuk ribuan logbook &amp; foto.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-44 space-y-1 shrink-0">
          <div className="flex justify-between text-[10px] text-stone-400 font-mono">
            <span>{estimatedMb} MB</span>
            <span>1.000 MB</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-700">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(percentageOf1Gb, 1)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari uraian pekerjaan, blok kebun, atau kategori..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Sentuh Cepat: Urutkan Tanggal Otomatis & Terinput ke Laporan Resmi */}
          <button
            type="button"
            onClick={() => handleExecuteDateSort('asc')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white border border-emerald-400/50 shadow-xs cursor-pointer transition-all"
            title="Ketuk untuk menyusun seluruh tanggal secara berurutan rapi (1→31) dan langsung menginputkannya ke Laporan Resmi"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-300" />
            <span>Urutkan Tanggal (1→31)</span>
          </button>

          {/* Urutan Tanggal Selector */}
          <select
            value={sortOrder}
            onChange={(e) => handleExecuteDateSort(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-stone-800 cursor-pointer"
            title="Urutan Kronologis Tanggal Logbook"
          >
            <option value="asc">📅 Urutan: Tanggal Awal ke Akhir (1→31)</option>
            <option value="desc">📅 Urutan: Tanggal Akhir ke Awal (31→1)</option>
          </select>

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={(e) => {
              setHasManuallySelectedMonth(true);
              setFilterMonth(e.target.value);
            }}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
          >
            <option value="all">Semua Bulan ({entries.length})</option>
            {availableMonths.map((m) => {
              const data = monthDataMap.get(m);
              return (
                <option key={m} value={m}>
                  {data?.label || m} ({data?.totalEntries || 0} entri)
                </option>
              );
            })}
          </select>

          {/* Attendance filter */}
          <select
            value={filterAttendance}
            onChange={(e) => setFilterAttendance(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">Semua Kehadiran</option>
            <option value="WFO">WFO</option>
            <option value="Sakit">Sakit</option>
            <option value="Cuti">Cuti</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-stone-200">
          <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-800">Belum Ada Catatan Sesuai Filter</h3>
          <p className="text-xs text-stone-500 mt-1">
            Gunakan tombol tambah catatan untuk menginput kegiatan harian kebun.
          </p>
          <button
            onClick={onAddNew}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tambah Catatan Baru</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => {
            const dateObj = new Date(entry.tanggal);
            const formattedDate = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={entry.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 hover:border-emerald-300 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                {/* Left content */}
                <div className="space-y-2 flex-1">
                  {/* Meta line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono font-bold text-[11px] border border-stone-200" title={`Urutan #${index + 1}`}>
                      #{index + 1}
                    </span>
                    <span className="font-bold text-stone-900">{formattedDate}</span>
                    {entry.kehadiran === 'WFO' && entry.waktuMulai && entry.waktuMulai !== '-' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          {entry.waktuMulai} - {entry.waktuSelesai} WIB
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        entry.kehadiran === 'WFO'
                          ? 'bg-emerald-50 text-emerald-800'
                          : entry.kehadiran === 'Sakit'
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'bg-blue-100 text-blue-900 font-bold'
                      }`}
                    >
                      {entry.kehadiran === 'Sakit' ? '🏥 Sakit' : entry.kehadiran === 'Cuti' ? '🏖️ Cuti' : '🏢 WFO'}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <p className="text-sm font-semibold text-stone-900 mt-0.5 leading-relaxed">
                      {entry.uraianPekerjaan}
                    </p>
                  </div>

                  {/* Location & Area (Only if WFO or valid data) */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 pt-1">
                    {entry.kehadiran === 'WFO' && entry.lokasiPekerjaan && entry.lokasiPekerjaan !== '-' && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{entry.lokasiPekerjaan}</span>
                      </span>
                    )}
                    {entry.kehadiran === 'WFO' && entry.luasLahan && entry.luasLahan !== '-' && (
                      <span className="flex items-center gap-1 font-mono">
                        <Maximize2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>Luas: {/m²|m2/i.test(entry.luasLahan) ? entry.luasLahan : `${entry.luasLahan} m²`}</span>
                      </span>
                    )}
                    {entry.keterangan && entry.keterangan !== '-' && (
                      <span className="text-stone-500 italic">
                        Ket: {entry.keterangan}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Photos & Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 border-stone-100 w-full md:w-auto justify-between md:justify-end">
                  {/* Photo Thumbnails */}
                  <div className="flex items-center gap-2">
                    {/* Surat Sakit Thumbnail */}
                    {entry.suratSakit && (
                      <button
                        onClick={() => setPreviewPhotoEntry(entry)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-300 group bg-amber-50 shrink-0 cursor-pointer"
                        title="Lihat Surat Keterangan Sakit"
                      >
                        <img
                          src={entry.suratSakit}
                          alt="Surat Sakit"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-amber-800/80 text-[8px] text-white text-center py-0.5 font-bold">
                          Surat
                        </span>
                      </button>
                    )}

                    {entry.fotoSebelum && (
                      <button
                        onClick={() => setPreviewPhotoEntry(entry)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-200 group bg-stone-100 shrink-0 cursor-pointer"
                        title="Lihat Foto Sebelum & Sesudah"
                      >
                        <img
                          src={entry.fotoSebelum}
                          alt="Sebelum"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 font-bold">
                          Sblm
                        </span>
                      </button>
                    )}

                    {entry.fotoSesudah && (
                      <button
                        onClick={() => setPreviewPhotoEntry(entry)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-200 group bg-stone-100 shrink-0"
                        title="Lihat Foto Sebelum & Sesudah"
                      >
                        <img
                          src={entry.fotoSesudah}
                          alt="Sesudah"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[9px] text-white text-center py-0.5 font-bold">
                          Ssdh
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewPhotoEntry(entry)}
                      className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Detail Dokumentasi"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="p-2 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit Catatan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Comparison Modal */}
      {previewPhotoEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-200 animate-scale-up">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Dokumentasi Foto Logbook ({previewPhotoEntry.tanggal})
                </h3>
                <p className="text-xs text-stone-500 truncate max-w-md">
                  {previewPhotoEntry.uraianPekerjaan}
                </p>
              </div>
              <button
                onClick={() => setPreviewPhotoEntry(null)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-stone-50">
              {previewPhotoEntry.kehadiran === 'Sakit' ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-sm">Status Kehadiran: Izin Sakit Resmi</p>
                    <p><strong>Keterangan Sakit:</strong> {previewPhotoEntry.keterangan || previewPhotoEntry.uraianPekerjaan}</p>
                    <p className="text-stone-500 italic">Jam operasional lapangan tidak berlaku untuk status sakit.</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      📄 Bukti Surat Keterangan Sakit / Dokter
                    </span>
                    {previewPhotoEntry.suratSakit ? (
                      <div className="rounded-xl overflow-hidden border border-stone-300 max-h-[420px] bg-stone-900 flex items-center justify-center p-2">
                        <img
                          src={previewPhotoEntry.suratSakit}
                          alt="Surat Keterangan Sakit Dokter"
                          className="max-h-[400px] w-auto object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="p-8 rounded-xl border-2 border-dashed border-stone-300 text-center text-xs text-stone-400">
                        Tidak ada berkas foto surat dokter yang diunggah.
                      </div>
                    )}
                  </div>
                </div>
              ) : previewPhotoEntry.kehadiran === 'Cuti' ? (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center space-y-2">
                  <span className="text-3xl">🏖️</span>
                  <h4 className="font-bold text-base text-blue-950">Status Kehadiran: Cuti Resmi</h4>
                  <p className="text-sm text-blue-900 font-medium">
                    {previewPhotoEntry.keterangan || previewPhotoEntry.uraianPekerjaan}
                  </p>
                  <p className="text-xs text-stone-500 italic">
                    Jam operasional lapangan dan dokumentasi foto tidak berlaku untuk status cuti.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Foto Sebelum */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        📸 Foto Sebelum Kegiatan
                      </span>
                      <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-medium">
                        Masuk Laporan Resmi (Tabel 2)
                      </span>
                    </div>
                    {previewPhotoEntry.fotoSebelum ? (
                      <div className="space-y-1.5">
                        <div className="rounded-xl overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900">
                          <img
                            src={previewPhotoEntry.fotoSebelum}
                            alt="Sebelum"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Hapus Foto Sebelum dari entri kegiatan ini?')) {
                                const updated = { ...previewPhotoEntry, fotoSebelum: undefined };
                                onEditEntry(updated);
                                setPreviewPhotoEntry(updated);
                              }
                            }}
                            className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus Foto Sebelum</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-4/3 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400">
                        Tidak ada foto sebelum
                      </div>
                    )}
                  </div>

                  {/* Foto Sesudah */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        ✅ Foto Sesudah Kegiatan
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                        Tersimpan di Logbook
                      </span>
                    </div>
                    {previewPhotoEntry.fotoSesudah ? (
                      <div className="space-y-1.5">
                        <div className="rounded-xl overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900">
                          <img
                            src={previewPhotoEntry.fotoSesudah}
                            alt="Sesudah"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Hapus Foto Sesudah dari entri kegiatan ini?')) {
                                const updated = { ...previewPhotoEntry, fotoSesudah: undefined };
                                onEditEntry(updated);
                                setPreviewPhotoEntry(updated);
                              }
                            }}
                            className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus Foto Sesudah</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-4/3 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400">
                        Tidak ada foto sesudah
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setPreviewPhotoEntry(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-full bg-red-100">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Hapus Catatan Logbook?</h3>
                <p className="text-xs text-stone-500">Konfirmasi penghapusan data kegiatan</p>
              </div>
            </div>

            <p className="text-sm text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan kegiatan berikut? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
              <p><strong className="text-stone-800">Tanggal:</strong> {entryToDelete.tanggal}</p>
              <p><strong className="text-stone-800">Kegiatan:</strong> {entryToDelete.uraianPekerjaan}</p>
              <p><strong className="text-stone-800">Lokasi:</strong> {entryToDelete.lokasiPekerjaan}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(entryToDelete.id);
                  setEntryToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Catatan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
