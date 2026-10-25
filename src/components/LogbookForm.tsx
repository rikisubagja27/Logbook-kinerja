import React, { useState, useEffect } from 'react';
import { 
  AttendanceStatus, 
  JobCategory, 
  LogbookEntry 
} from '../types/logbook';
import { resizeImageFile, formatBytes } from '../utils/imageUtils';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Maximize2, 
  Upload,
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles,
  FileCheck,
  FileText,
  FileSpreadsheet
} from 'lucide-react';

interface LogbookFormProps {
  onSaveEntry: (entry: LogbookEntry) => void;
  onCancelEdit?: () => void;
  editingEntry?: LogbookEntry | null;
  onNavigateToReport?: () => void;
}

const COMMON_LOCATIONS = [
  'Blok C7 (sekitar screen house)',
  'Blok C4 & C7',
  'Blok C1 & C2',
  'Blok B2 & C6',
  'Blok E4 Nahkoda',
  'Lahan Uji BUSS Manoko',
  'Screen House Utama',
  'Gedung Kantor & Aula',
  'Area Embung & Irigasi',
];

const JOB_CATEGORIES: JobCategory[] = [
  'Pengolahan Lahan & Persiapan Tanam',
  'Pemeliharaan & Sanitasi',
  'Penanaman & Persemaian',
  'Uji BUSS',
  'Panen & Pasca Panen',
  'Pemupukan & Saprodi',
  'Sarana / Administrasi',
  'Dukungan Operasional & Kedinasan',
  'Lainnya',
];

const DRAFT_STORAGE_KEY = 'kps1_manoko_logbook_draft_v2';

export const LogbookForm: React.FC<LogbookFormProps> = ({
  onSaveEntry,
  onCancelEdit,
  editingEntry,
  onNavigateToReport,
}) => {
  // Load draft if not editing existing historical entry
  const getInitialDraft = () => {
    if (editingEntry) return null;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading draft:', e);
    }
    return null;
  };

  const initialDraft = getInitialDraft();

  const [kehadiran, setKehadiran] = useState<AttendanceStatus>(
    editingEntry?.kehadiran || initialDraft?.kehadiran || 'WFO'
  );
  const [tanggal, setTanggal] = useState<string>(
    editingEntry?.tanggal || initialDraft?.tanggal || new Date().toISOString().split('T')[0]
  );
  const [waktuMulai, setWaktuMulai] = useState<string>(
    editingEntry?.waktuMulai || initialDraft?.waktuMulai || '07:30'
  );
  const [waktuSelesai, setWaktuSelesai] = useState<string>(
    editingEntry?.waktuSelesai || initialDraft?.waktuSelesai || '16:00'
  );
  const [kategori, setKategori] = useState<JobCategory>(
    editingEntry?.kategori || initialDraft?.kategori || 'Pengolahan Lahan & Persiapan Tanam'
  );
  const [lokasiPekerjaan, setLokasiPekerjaan] = useState<string>(
    editingEntry?.lokasiPekerjaan || initialDraft?.lokasiPekerjaan || ''
  );
  const [luasLahan, setLuasLahan] = useState<string>(
    editingEntry?.luasLahan || initialDraft?.luasLahan || ''
  );
  const [uraianPekerjaan, setUraianPekerjaan] = useState<string>(
    editingEntry?.uraianPekerjaan || initialDraft?.uraianPekerjaan || ''
  );
  const [keterangan, setKeterangan] = useState<string>(
    editingEntry?.keterangan || initialDraft?.keterangan || ''
  );

  // Surat Sakit (Doctor note image)
  const [suratSakit, setSuratSakit] = useState<string | undefined>(
    editingEntry?.suratSakit || initialDraft?.suratSakit
  );
  const [suratSakitMeta, setSuratSakitMeta] = useState<string | null>(initialDraft?.suratSakitMeta || null);
  const [isProcessingSurat, setIsProcessingSurat] = useState(false);

  // Field Photos (for WFO)
  const [fotoSebelum, setFotoSebelum] = useState<string | undefined>(
    editingEntry?.fotoSebelum || initialDraft?.fotoSebelum
  );
  const [fotoSesudah, setFotoSesudah] = useState<string | undefined>(
    editingEntry?.fotoSesudah || initialDraft?.fotoSesudah
  );
  const [sebelumMeta, setSebelumMeta] = useState<string | null>(initialDraft?.sebelumMeta || null);
  const [sesudahMeta, setSesudahMeta] = useState<string | null>(initialDraft?.sesudahMeta || null);
  const [isProcessingSebelum, setIsProcessingSebelum] = useState(false);
  const [isProcessingSesudah, setIsProcessingSesudah] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Auto-save timestamp indicator
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(initialDraft?.savedAt || null);

  // Auto-save effect
  useEffect(() => {
    if (editingEntry) return;

    const hasContent =
      uraianPekerjaan.trim() ||
      lokasiPekerjaan.trim() ||
      luasLahan.trim() ||
      keterangan.trim() ||
      suratSakit ||
      fotoSebelum ||
      fotoSesudah;

    if (hasContent) {
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            kehadiran,
            tanggal,
            waktuMulai,
            waktuSelesai,
            kategori,
            lokasiPekerjaan,
            luasLahan,
            uraianPekerjaan,
            keterangan,
            suratSakit,
            suratSakitMeta,
            fotoSebelum,
            fotoSesudah,
            sebelumMeta,
            sesudahMeta,
            savedAt: nowStr,
          })
        );
        setLastSavedTime(nowStr);
      } catch (err) {
        console.warn('Auto-save storage quota limit:', err);
      }
    }
  }, [
    kehadiran,
    tanggal,
    waktuMulai,
    waktuSelesai,
    kategori,
    lokasiPekerjaan,
    luasLahan,
    uraianPekerjaan,
    keterangan,
    suratSakit,
    suratSakitMeta,
    fotoSebelum,
    fotoSesudah,
    sebelumMeta,
    sesudahMeta,
    editingEntry,
  ]);

  const handleClearDraft = () => {
    if (confirm('Kosongkan draf pengisian yang belum disimpan dan mulai baru?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setKehadiran('WFO');
      setTanggal(new Date().toISOString().split('T')[0]);
      setWaktuMulai('07:30');
      setWaktuSelesai('16:00');
      setKategori('Pengolahan Lahan & Persiapan Tanam');
      setLokasiPekerjaan('');
      setLuasLahan('');
      setUraianPekerjaan('');
      setKeterangan('');
      setSuratSakit(undefined);
      setSuratSakitMeta(null);
      setFotoSebelum(undefined);
      setFotoSesudah(undefined);
      setSebelumMeta(null);
      setSesudahMeta(null);
      setLastSavedTime(null);
    }
  };

  // Quick preset work hours
  const setStandardHours = (start: string, end: string) => {
    setWaktuMulai(start);
    setWaktuSelesai(end);
  };

  // Upload Surat Sakit
  const handleSuratSakitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingSurat(true);
      const result = await resizeImageFile(file, 1200, 0.85);
      const meta = `Ukuran: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.newSize)} (Resize otomatis ${result.width}×${result.height}px)`;
      setSuratSakit(result.dataUrl);
      setSuratSakitMeta(meta);
    } catch (err: any) {
      alert('Gagal memproses gambar surat sakit: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsProcessingSurat(false);
    }
  };

  // Upload Field Photo (Sebelum & Sesudah)
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'sebelum' | 'sesudah'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'sebelum') setIsProcessingSebelum(true);
    else setIsProcessingSesudah(true);

    try {
      const result = await resizeImageFile(file, 1080, 0.8);
      const metaInfo = `Ukuran: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.newSize)} (Resize otomatis ${result.width}×${result.height}px)`;

      if (type === 'sebelum') {
        setFotoSebelum(result.dataUrl);
        setSebelumMeta(metaInfo);
      } else {
        setFotoSesudah(result.dataUrl);
        setSesudahMeta(metaInfo);
      }
    } catch (err: any) {
      alert('Gagal memproses gambar: ' + (err.message || 'Format tidak didukung'));
    } finally {
      if (type === 'sebelum') setIsProcessingSebelum(false);
      else setIsProcessingSesudah(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedUraian = '';
    let finalLokasi = '-';
    let finalLuas = '-';
    let finalKategori: JobCategory = 'Lainnya';
    let finalWaktuMulai = '-';
    let finalWaktuSelesai = '-';
    let finalFotoSebelum: string | undefined = undefined;
    let finalFotoSesudah: string | undefined = undefined;
    let finalSuratSakit: string | undefined = undefined;

    if (kehadiran === 'Sakit') {
      if (!keterangan.trim()) {
        alert('Harap isi keterangan sakit (misal: keluhan penyakit atau anjuran istirahat dokter)!');
        return;
      }
      computedUraian = `Izin Sakit: ${keterangan.trim()}${suratSakit ? ' (Surat Dokter Terlampir)' : ''}`;
      finalSuratSakit = suratSakit;
    } else if (kehadiran === 'Cuti') {
      if (!keterangan.trim()) {
        alert('Harap isi keterangan cuti (misal: Cuti Tahunan, Cuti Alasan Penting)!');
        return;
      }
      computedUraian = `Cuti: ${keterangan.trim()}`;
    } else {
      // WFO
      if (!uraianPekerjaan.trim()) {
        alert('Harap isi uraian pekerjaan logbook!');
        return;
      }
      computedUraian = uraianPekerjaan.trim();
      finalLokasi = lokasiPekerjaan.trim() || '-';
      finalLuas = luasLahan.trim() || '-';
      finalKategori = kategori;
      finalWaktuMulai = waktuMulai;
      finalWaktuSelesai = waktuSelesai;
      finalFotoSebelum = fotoSebelum;
      finalFotoSesudah = fotoSesudah;
    }

    const newEntry: LogbookEntry = {
      id: editingEntry?.id || `entry-${Date.now()}`,
      tanggal,
      kehadiran,
      waktuMulai: finalWaktuMulai,
      waktuSelesai: finalWaktuSelesai,
      kategori: finalKategori,
      uraianPekerjaan: computedUraian,
      lokasiPekerjaan: finalLokasi,
      luasLahan: finalLuas,
      fotoSebelum: finalFotoSebelum,
      fotoSesudah: finalFotoSesudah,
      suratSakit: finalSuratSakit,
      keterangan: keterangan.trim() || '-',
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveEntry(newEntry);
    setShowSuccessToast(true);

    // Clear auto-save draft upon successful submit
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLastSavedTime(null);

    if (!editingEntry) {
      setUraianPekerjaan('');
      setKeterangan('');
      setSuratSakit(undefined);
      setSuratSakitMeta(null);
      setFotoSebelum(undefined);
      setFotoSesudah(undefined);
      setSebelumMeta(null);
      setSesudahMeta(null);
    }

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-4">
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Logbook Berhasil Disimpan!</p>
            <p className="text-xs text-emerald-200">
              Data otomatis tersinkronisasi ke laporan resmi & riwayat kinerja harian.
            </p>
          </div>
          {onNavigateToReport && (
            <button
              onClick={onNavigateToReport}
              className="ml-3 text-xs bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Lihat Laporan
            </button>
          )}
        </div>
      )}

      {/* Auto-Save Draft Banner */}
      {lastSavedTime && !editingEntry && (
        <div className="bg-emerald-950/80 border border-emerald-400/30 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              <strong>Auto-Save Aktif:</strong> Draf pengisian Anda otomatis tersimpan (pukul {lastSavedTime}). Aman jika aplikasi tertutup.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] underline text-emerald-300 hover:text-white transition-colors shrink-0 font-medium cursor-pointer"
          >
            Kosongkan Draf
          </button>
        </div>
      )}

      {/* Header Form */}
      <div className="bg-stone-950/75 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>KPS PVT I MANOKO · LEMBANG</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {editingEntry ? 'Edit Catatan Logbook Kinerja' : 'Isi & Catat Logbook Kinerja Harian'}
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            Pencatatan presisi operasional lapangan WFO, izin sakit bersurat, dan cuti kedinasan.
          </p>
        </div>

        {editingEntry && (
          <button
            onClick={onCancelEdit}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors border border-white/20 cursor-pointer"
          >
            Batal Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Kehadiran & Tanggal */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            1. Status Kehadiran Pegawai
          </h2>

          {/* Status Selection Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['WFO', 'Sakit', 'Cuti'] as AttendanceStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setKehadiran(status)}
                className={`py-3 px-4 rounded-xl text-sm font-medium border text-center transition-all cursor-pointer ${
                  kehadiran === status
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                {status === 'WFO' && '🏢 WFO (Hadir di Kebun)'}
                {status === 'Sakit' && '🏥 Sakit (Surat Dokter)'}
                {status === 'Cuti' && '🏖️ Cuti Resmi'}
              </button>
            ))}
          </div>

          {/* Tanggal Pelaksanaan (Always Required for All) */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Tanggal Logbook
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full sm:w-72 px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50 font-medium"
            />
          </div>

          {/* Jam Operasional Lapangan: ONLY FOR WFO! */}
          {kehadiran === 'WFO' && (
            <div className="space-y-3 pt-2 border-t border-stone-100 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jam Mulai */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    Waktu Mulai Kerja (WIB)
                  </label>
                  <input
                    type="time"
                    value={waktuMulai}
                    onChange={(e) => setWaktuMulai(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                  />
                </div>

                {/* Jam Selesai */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    Waktu Selesai Kerja (WIB)
                  </label>
                  <input
                    type="time"
                    value={waktuSelesai}
                    onChange={(e) => setWaktuSelesai(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                  />
                </div>
              </div>

              {/* Quick hour shortcuts */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-500">
                <span className="font-medium">Preset Jam:</span>
                <button
                  type="button"
                  onClick={() => setStandardHours('07:30', '16:00')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                >
                  07:30 - 16:00 (Senin-Kamis)
                </button>
                <button
                  type="button"
                  onClick={() => setStandardHours('07:30', '16:30')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                >
                  07:30 - 16:30 (Jumat)
                </button>
                <button
                  type="button"
                  onClick={() => setStandardHours('08:00', '12:00')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                >
                  08:00 - 12:00 (Setengah Hari)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FITUR KHUSUS: SAKIT (Hanya Keterangan & Upload Surat Sakit) */}
        {/* ========================================================================= */}
        {kehadiran === 'Sakit' && (
          <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-md space-y-4 animate-fade-in">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Ketentuan Kehadiran Sakit:</strong> Jam operasional lapangan dan foto pekerjaan lapangan tidak berlaku. Anda hanya perlu mengisi keterangan sakit dan mengunggah bukti surat sakit/dokter.
              </div>
            </div>

            {/* Keterangan Sakit */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Keterangan Sakit <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                required
                placeholder="Tuliskan keterangan sakit atau anjuran istirahat dokter (contoh: Mengalami demam dan flu, disarankan dokter istirahat di rumah selama 2 hari)..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-stone-50/50"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Keterangan ini akan otomatis dirangkum ke dalam <strong>Tabel 1 Laporan Resmi</strong> sebagai catatan izin sakit resmi.
              </p>
            </div>

            {/* Upload Surat Sakit */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Upload Surat Sakit / Surat Dokter
                </span>
                {suratSakit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuratSakit(undefined);
                      setSuratSakitMeta(null);
                    }}
                    className="text-stone-400 hover:text-red-600 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                    title="Hapus Surat Sakit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Surat</span>
                  </button>
                )}
              </div>

              {suratSakit ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-stone-300 max-h-[300px] bg-stone-900 group flex items-center justify-center">
                    <img
                      src={suratSakit}
                      alt="Surat Keterangan Sakit Dokter"
                      className="max-h-[290px] w-auto object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition-colors">
                        Ganti File Surat Sakit
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSuratSakitUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  {suratSakitMeta && (
                    <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50/80 p-1.5 rounded border border-emerald-100">
                      {suratSakitMeta}
                    </div>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50/30 transition-colors">
                  {isProcessingSurat ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-stone-500">Mengompres & me-resize file surat...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-emerald-600/70 mb-2" />
                      <span className="text-xs font-semibold text-stone-800 text-center">
                        Unggah Foto Surat Keterangan Sakit / Dokter
                      </span>
                      <span className="text-[11px] text-stone-500 mt-1">
                        Pilih foto atau hasil pindai dokumen (JPG/PNG)
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2">
                        Resize otomatis & tersimpan aman
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isProcessingSurat}
                    onChange={handleSuratSakitUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FITUR KHUSUS: CUTI (Hanya Keterangan Cuti) */}
        {/* ========================================================================= */}
        {kehadiran === 'Cuti' && (
          <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-md space-y-4 animate-fade-in">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Ketentuan Kehadiran Cuti:</strong> Jam operasional lapangan dan foto pekerjaan tidak berlaku. Anda hanya perlu mengisi keterangan keperluan cuti dinas.
              </div>
            </div>

            {/* Keterangan Cuti */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Keterangan Cuti <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                required
                placeholder="Tuliskan keterangan atau keperluan cuti (contoh: Cuti Tahunan yang disetujui pimpinan, cuti alasan penting keperluan keluarga)..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-stone-50/50"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Keterangan cuti ini otomatis tercatat pada <strong>Tabel 1 Laporan Resmi</strong> sebagai keterangan resmi ketidakhadiran.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FITUR WFO: Detail Pekerjaan, Kategori, Lokasi, Luas & Foto Dokumentasi */}
        {/* ========================================================================= */}
        {kehadiran === 'WFO' && (
          <>
            {/* Section 2: Detail Pekerjaan, Kategori & Lokasi */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                2. Uraian Pekerjaan & Lingkup Operasional Lapangan
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kategori Pekerjaan */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori Pekerjaan
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as JobCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Luas Lahan */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
                    Luas Lahan / Volume Kerja
                  </label>
                  <input
                    type="text"
                    value={luasLahan}
                    onChange={(e) => setLuasLahan(e.target.value)}
                    placeholder="Contoh: 800 m², 1.200 m², 0.5 ha, atau '-'"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                  />
                </div>
              </div>

              {/* Lokasi Pekerjaan */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-500" />
                  Lokasi Pekerjaan di KPS 1 Manoko
                </label>
                <input
                  type="text"
                  value={lokasiPekerjaan}
                  onChange={(e) => setLokasiPekerjaan(e.target.value)}
                  placeholder="Contoh: Blok C7 (sekitar screen house), Blok C4, Blok B2, dsb"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                />
                {/* Quick Location Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-stone-400">Pilih cepat:</span>
                  {COMMON_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLokasiPekerjaan(loc)}
                      className="text-xs px-2 py-0.5 rounded bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-600 transition-colors cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uraian Pekerjaan Detail */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Uraian Pekerjaan Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={uraianPekerjaan}
                  onChange={(e) => setUraianPekerjaan(e.target.value)}
                  required
                  placeholder="Jelaskan secara rinci pekerjaan yang dilakukan (contoh: Pengolahan lahan Blok C7 menggunakan cultivator, penyiangan gulma di Blok B2, dsb)..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Uraian ini akan dirangkum otomatis ke dalam <strong>Tabel 1 Rincian Pekerjaan</strong> pada laporan resmi.
                </p>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Keterangan / Hasil Pelaksanaan
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Bedengan rapi siap tanam, cuaca mendung, kondisi bibit sehat"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50/50"
                />
              </div>
            </div>

            {/* Section 3: Dokumentasi Foto (Sebelum & Sesudah - Resize Otomatis) */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  3. Dokumentasi Foto (Sebelum & Sesudah)
                </h2>
                <span className="text-xs text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                  ⚡ Fitur Resize Otomatis Aktif
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Ketentuan Laporan Resmi:</strong> Foto yang diunggah akan otomatis di-resize agar hemat memori. Sesuai ketentuan kedinasan, <strong>hanya Foto Sebelum yang otomatis masuk ke dalam Tabel 2 Dokumentasi Laporan Resmi</strong>, sedangkan Foto Sesudah tersimpan lengkap dalam rekap harian Anda.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Foto Sebelum */}
                <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        Unggah Foto Sebelum (Wajib Laporan)
                      </span>
                      {fotoSebelum && (
                        <button
                          type="button"
                          onClick={() => {
                            setFotoSebelum(undefined);
                            setSebelumMeta(null);
                          }}
                          className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {fotoSebelum ? (
                      <div className="relative rounded-lg overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900 group">
                        <img
                          src={fotoSebelum}
                          alt="Foto Sebelum Kegiatan"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition-colors">
                            Ganti File Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, 'sebelum')}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg aspect-4/3 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                        {isProcessingSebelum ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-stone-500">Mengompres & me-resize...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-emerald-600/70 mb-2" />
                            <span className="text-xs font-semibold text-stone-800 text-center">
                              Unggah File Foto Sebelum
                            </span>
                            <span className="text-[11px] text-stone-500 mt-1">
                              Pilih file JPG/PNG dari perangkat
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2">
                              Resize otomatis saat diunggah
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isProcessingSebelum}
                          onChange={(e) => handlePhotoUpload(e, 'sebelum')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {sebelumMeta && (
                    <div className="mt-2 text-[11px] text-emerald-800 font-mono bg-emerald-50/80 p-1.5 rounded border border-emerald-100">
                      {sebelumMeta}
                    </div>
                  )}
                </div>

                {/* Foto Sesudah */}
                <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        Unggah Foto Sesudah (Hasil Akhir)
                      </span>
                      {fotoSesudah && (
                        <button
                          type="button"
                          onClick={() => {
                            setFotoSesudah(undefined);
                            setSesudahMeta(null);
                          }}
                          className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {fotoSesudah ? (
                      <div className="relative rounded-lg overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900 group">
                        <img
                          src={fotoSesudah}
                          alt="Foto Sesudah Kegiatan"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition-colors">
                            Ganti File Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, 'sesudah')}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg aspect-4/3 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                        {isProcessingSesudah ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-stone-500">Mengompres & me-resize...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-emerald-600/70 mb-2" />
                            <span className="text-xs font-semibold text-stone-800 text-center">
                              Unggah File Foto Sesudah
                            </span>
                            <span className="text-[11px] text-stone-500 mt-1">
                              Pilih file JPG/PNG dari perangkat
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2">
                              Resize otomatis saat diunggah
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isProcessingSesudah}
                          onChange={(e) => handlePhotoUpload(e, 'sesudah')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {sesudahMeta && (
                    <div className="mt-2 text-[11px] text-emerald-800 font-mono bg-emerald-50/80 p-1.5 rounded border border-emerald-100">
                      {sesudahMeta}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {editingEntry && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>
              {editingEntry
                ? 'Perbarui Logbook'
                : kehadiran === 'Sakit'
                ? 'Simpan Catatan Sakit'
                : kehadiran === 'Cuti'
                ? 'Simpan Catatan Cuti'
                : 'Simpan & Catat Logbook'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
