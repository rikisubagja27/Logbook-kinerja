import React, { useState, useMemo } from 'react';
import { LogbookEntry, AttendanceStatus } from '../types/logbook';
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
  AlertCircle
} from 'lucide-react';

interface LogbookListProps {
  entries: LogbookEntry[];
  onEditEntry: (entry: LogbookEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddNew: () => void;
  onImportBackup: (imported: LogbookEntry[]) => void;
}

export const LogbookList: React.FC<LogbookListProps> = ({
  entries,
  onEditEntry,
  onDeleteEntry,
  onAddNew,
  onImportBackup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [previewPhotoEntry, setPreviewPhotoEntry] = useState<LogbookEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LogbookEntry | null>(null);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries
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
          const entryMonth = entry.tanggal.substring(0, 7);
          if (entryMonth !== filterMonth) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [entries, searchTerm, filterMonth, filterAttendance]);

  // Available months from entries
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      set.add(e.tanggal.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Statistics
  const stats = useMemo(() => {
    let wfoCount = 0;
    let sakitCount = 0;
    let cutiCount = 0;

    entries.forEach((e) => {
      if (e.kehadiran === 'WFO') wfoCount++;
      else if (e.kehadiran === 'Sakit') sakitCount++;
      else if (e.kehadiran === 'Cuti') cutiCount++;
    });

    return {
      total: entries.length,
      wfoCount,
      sakitCount,
      cutiCount,
    };
  }, [entries]);

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

        <div className="flex items-center gap-2">
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

      {/* Quick Attendance KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            Total Kegiatan
          </span>
          <span className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
            {stats.total}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5">Semua entri tercatat</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
            Kehadiran WFO
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 tabular-nums">
            {stats.wfoCount}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5">Hari kerja di kebun</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">
            Izin Sakit
          </span>
          <span className="text-2xl font-extrabold text-amber-800 mt-0.5 tabular-nums">
            {stats.sakitCount}
          </span>
          <span className="text-[11px] text-amber-600 mt-0.5">Hari keterangan sakit</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
            Cuti Resmi
          </span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 tabular-nums">
            {stats.cutiCount}
          </span>
          <span className="text-[11px] text-blue-600 mt-0.5">Hari cuti tahunan/resmi</span>
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

        <div className="flex items-center gap-2">
          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">Semua Bulan</option>
            {availableMonths.map((m) => {
              const [y, mon] = m.split('-');
              const date = new Date(parseInt(y), parseInt(mon) - 1, 1);
              const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label}
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
          {filteredEntries.map((entry) => {
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
                        <span>Luas: {entry.luasLahan} m²</span>
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
                      <div className="rounded-xl overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900">
                        <img
                          src={previewPhotoEntry.fotoSebelum}
                          alt="Sebelum"
                          className="w-full h-full object-contain"
                        />
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
                      <div className="rounded-xl overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900">
                        <img
                          src={previewPhotoEntry.fotoSesudah}
                          alt="Sesudah"
                          className="w-full h-full object-contain"
                        />
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
