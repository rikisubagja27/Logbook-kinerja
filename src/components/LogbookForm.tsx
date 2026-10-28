import React, { useState, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  Camera,
  RefreshCw
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

const DRAFT_STORAGE_KEY = 'kps1_manoko_logbook_draft_v2';

export const LogbookForm: React.FC<LogbookFormProps> = ({
  onSaveEntry,
  onCancelEdit,
  editingEntry,
  onNavigateToReport,
}) => {
  // Direct file input refs for 100% reliable click triggering
  const fileInputSebelumRef = useRef<HTMLInputElement | null>(null);
  const fileInputSesudahRef = useRef<HTMLInputElement | null>(null);
  const fileInputSuratRef = useRef<HTMLInputElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

  const triggerUploadSebelum = () => {
    if (fileInputSebelumRef.current) {
      fileInputSebelumRef.current.value = '';
      fileInputSebelumRef.current.click();
    }
  };

  const triggerUploadSesudah = () => {
    if (fileInputSesudahRef.current) {
      fileInputSesudahRef.current.value = '';
      fileInputSesudahRef.current.click();
    }
  };

  const triggerUploadSurat = () => {
    if (fileInputSuratRef.current) {
      fileInputSuratRef.current.value = '';
      fileInputSuratRef.current.click();
    }
  };

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
  const [uraianPekerjaan, setUraianPekerjaan] = useState<string>(
    editingEntry?.uraianPekerjaan || initialDraft?.uraianPekerjaan || ''
  );
  const [lokasiPekerjaan, setLokasiPekerjaan] = useState<string>(
    editingEntry?.lokasiPekerjaan || initialDraft?.lokasiPekerjaan || ''
  );
  const [luasLahan, setLuasLahan] = useState<string>(
    editingEntry?.luasLahan || initialDraft?.luasLahan || ''
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
            uraianPekerjaan,
            lokasiPekerjaan,
            luasLahan,
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
    uraianPekerjaan,
    lokasiPekerjaan,
    luasLahan,
    keterangan,
    suratSakit,
    suratSakitMeta,
    fotoSebelum,
    fotoSesudah,
    sebelumMeta,
    sesudahMeta,
    editingEntry,
  ]);

  // Synchronize when editing entry changes
  useEffect(() => {
    if (editingEntry) {
      setKehadiran(editingEntry.kehadiran);
      setTanggal(editingEntry.tanggal);
      setWaktuMulai(editingEntry.waktuMulai || '07:30');
      setWaktuSelesai(editingEntry.waktuSelesai || '16:00');
      setUraianPekerjaan(editingEntry.uraianPekerjaan || '');
      setLokasiPekerjaan(editingEntry.lokasiPekerjaan === '-' ? '' : (editingEntry.lokasiPekerjaan || ''));
      setLuasLahan(editingEntry.luasLahan === '-' ? '-' : (editingEntry.luasLahan?.replace(/\s*(m²|m2)/gi, '').trim() || ''));
      setKeterangan(editingEntry.keterangan === '-' ? '' : (editingEntry.keterangan || ''));
      setSuratSakit(editingEntry.suratSakit);
      setFotoSebelum(editingEntry.fotoSebelum);
      setFotoSesudah(editingEntry.fotoSesudah);
      setSebelumMeta(null);
      setSesudahMeta(null);
      setSuratSakitMeta(null);
    }
  }, [editingEntry]);

  // Completely resets form to initial blank slate
  const resetFormToEmpty = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setKehadiran('WFO');
    setTanggal(new Date().toISOString().split('T')[0]);
    setWaktuMulai('07:30');
    setWaktuSelesai('16:00');
    setUraianPekerjaan('');
    setLokasiPekerjaan('');
    setLuasLahan('');
    setKeterangan('');
    setSuratSakit(undefined);
    setSuratSakitMeta(null);
    setFotoSebelum(undefined);
    setFotoSesudah(undefined);
    setSebelumMeta(null);
    setSesudahMeta(null);
    setLastSavedTime(null);

    if (fileInputSebelumRef.current) fileInputSebelumRef.current.value = '';
    if (fileInputSesudahRef.current) fileInputSesudahRef.current.value = '';
    if (fileInputSuratRef.current) fileInputSuratRef.current.value = '';
  };

  // Smooth scroll to top helper
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    if (typeof document !== 'undefined') {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    }
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleClearDraft = () => {
    if (confirm('Kosongkan formulir pengisian logbook dan mulai baru?')) {
      resetFormToEmpty();
      scrollToTop();
    }
  };

  // Quick preset work hours
  const setStandardHours = (start: string, end: string) => {
    setWaktuMulai(start);
    setWaktuSelesai(end);
  };

  // Upload & Process Surat Sakit
  const processSuratFile = async (file: File) => {
    if (!file) return;
    try {
      setIsProcessingSurat(true);
      const result = await resizeImageFile(file, 1200, 0.85);
      const meta = `Ukuran: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.newSize)} (${result.width}×${result.height}px)`;
      setSuratSakit(result.dataUrl);
      setSuratSakitMeta(meta);
    } catch (err: any) {
      console.error('Error processing surat file:', err);
      alert('Gagal memproses gambar surat sakit: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsProcessingSurat(false);
    }
  };

  const handleSuratSakitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSuratFile(file);
    }
  };

  // Upload & Process Field Photo (Sebelum & Sesudah)
  const processPhotoFile = async (file: File, type: 'sebelum' | 'sesudah') => {
    if (!file) return;
    if (type === 'sebelum') setIsProcessingSebelum(true);
    else setIsProcessingSesudah(true);

    try {
      const result = await resizeImageFile(file, 1080, 0.8);
      const metaInfo = `Ukuran: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.newSize)} (${result.width}×${result.height}px)`;

      if (type === 'sebelum') {
        setFotoSebelum(result.dataUrl);
        setSebelumMeta(metaInfo);
      } else {
        setFotoSesudah(result.dataUrl);
        setSesudahMeta(metaInfo);
      }
    } catch (err: any) {
      console.error('Error processing photo:', err);
      alert('Gagal memproses gambar: ' + (err.message || 'Format tidak didukung'));
    } finally {
      if (type === 'sebelum') setIsProcessingSebelum(false);
      else setIsProcessingSesudah(false);
    }
  };

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'sebelum' | 'sesudah'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file, type);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedUraian = '';
    let finalLokasi = '-';
    let finalLuas = '-';
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
      const trimmedLuas = luasLahan.trim();
      finalLuas = (!trimmedLuas || trimmedLuas === '-' || trimmedLuas === '—')
        ? '-'
        : (/m²|m2/i.test(trimmedLuas) ? trimmedLuas : `${trimmedLuas} m²`);
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
      kategori: 'Umum',
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

    // Completely empty and reset the form state so the page is clean for the next entry
    resetFormToEmpty();

    // If editing existing entry, exit edit mode
    if (editingEntry && onCancelEdit) {
      onCancelEdit();
    }

    // Automatically scroll to the top of the page smoothly
    scrollToTop();
    setTimeout(scrollToTop, 80);
    setTimeout(scrollToTop, 250);

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-4">
      {/* Scroll anchor target */}
      <div ref={formTopRef} id="logbook-form-top" className="h-0 w-0 -mt-6" />

      {/* Top Banner on Successful Save & Form Clear for instant visual confirmation after auto-scroll */}
      {showSuccessToast && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 text-white p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-wide">
                Logbook Berhasil Disimpan & Halaman Dikosongkan!
              </p>
              <p className="text-xs text-emerald-200 mt-0.5">
                Data otomatis tersinkronisasi ke laporan resmi & riwayat kinerja. Form telah di-reset bersih, siap untuk pengisian logbook berikutnya.
              </p>
            </div>
          </div>
          {onNavigateToReport && (
            <button
              type="button"
              onClick={onNavigateToReport}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <span>Buka Laporan Resmi</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Logbook Berhasil Disimpan!</p>
            <p className="text-xs text-emerald-200">
              Data otomatis tersinkronisasi & form telah dikosongkan.
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
          <h1 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {editingEntry ? 'Edit Catatan Logbook Kinerja' : 'Isi & Catat Logbook Kinerja Harian'}
          </h1>
          
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
                  onClick={() => setStandardHours('07:30', '12:00')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                >
                  07:30 - 12:00 (Setengah Hari)
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

              {/* Native accessible file input */}
              <input
                id="surat-sakit-input"
                ref={fileInputSuratRef}
                type="file"
                accept="image/*"
                disabled={isProcessingSurat}
                onChange={handleSuratSakitUpload}
                onClick={(e) => {
                  (e.currentTarget as HTMLInputElement).value = '';
                }}
                className="sr-only"
              />

              {suratSakit ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-stone-300 max-h-[300px] bg-stone-900 group flex items-center justify-center">
                    <img
                      src={suratSakit}
                      alt="Surat Keterangan Sakit Dokter"
                      className="max-h-[290px] w-auto object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        htmlFor="surat-sakit-input"
                        className="cursor-pointer bg-white text-stone-900 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-stone-100 transition-colors shadow-md flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Ganti Surat Sakit</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSuratSakit(undefined);
                          setSuratSakitMeta(null);
                        }}
                        className="cursor-pointer bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-md flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="surat-sakit-input"
                      className="cursor-pointer text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Ganti File Surat</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSuratSakit(undefined);
                        setSuratSakitMeta(null);
                      }}
                      className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-medium cursor-pointer transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                  {suratSakitMeta && (
                    <div className="text-[11px] text-emerald-800 font-mono bg-emerald-50/80 p-1.5 rounded border border-emerald-100">
                      {suratSakitMeta}
                    </div>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="surat-sakit-input"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSuratFile(file);
                  }}
                  className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50/50 transition-all select-none group"
                >
                  {isProcessingSurat ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-stone-500">Mengompres & me-resize file surat...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-emerald-600 mb-2 group-hover:scale-110 transition-transform pointer-events-none" />
                      <span className="text-xs font-bold text-stone-800 text-center pointer-events-none">
                        Unggah Foto Surat Keterangan Sakit / Dokter
                      </span>
                      <span className="text-[11px] text-stone-500 mt-1 pointer-events-none">
                        Klik untuk memilih file foto / scan surat dari galeri atau kamera
                      </span>
                      <span className="mt-3 px-4 py-2 rounded-lg bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 pointer-events-none transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Surat Dokter</span>
                      </span>
                    </>
                  )}
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
            {/* Section 2: Detail Pekerjaan & Lingkup Operasional Lapangan */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4 animate-fade-in">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                2. Uraian Pekerjaan & Lingkup Operasional Lapangan
              </h2>

              {/* 1. Uraian Pekerjaan Lengkap (First) */}
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

              {/* 2. Lokasi Pekerjaan di KPS 1 Manoko (Second) */}
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
              </div>

              {/* 3. Luas Lahan (Third) - Opsional / Boleh Kosong atau Simbol (-) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Luas Lahan <span className="text-stone-400 font-normal">(Opsional jika tidak diketahui)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLuasLahan('-')}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors cursor-pointer border ${
                        luasLahan.trim() === '-'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-300'
                      }`}
                      title="Isi simbol (-) jika luas lahan tidak diketahui"
                    >
                      Isi (-)
                    </button>
                    {luasLahan && (
                      <button
                        type="button"
                        onClick={() => setLuasLahan('')}
                        className="text-[11px] px-2 py-0.5 rounded font-medium text-stone-500 hover:text-red-600 bg-stone-100 hover:bg-red-50 border border-stone-200 transition-colors cursor-pointer"
                        title="Kosongkan kolom luas lahan"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={luasLahan}
                    onChange={(e) => setLuasLahan(e.target.value)}
                    placeholder="Contoh: 500, atau ketik - / kosongkan jika tidak diketahui"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 pr-16 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  {/* Satuan m² otomatis muncul jika diisi angka */}
                  {luasLahan.trim() && luasLahan.trim() !== '-' && !/m²|m2/i.test(luasLahan) && (
                    <span className="absolute right-3 text-stone-600 text-xs font-medium pointer-events-none bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      m²
                    </span>
                  )}
                  {luasLahan.trim() === '-' && (
                    <span className="absolute right-3 text-stone-500 text-[11px] font-medium pointer-events-none bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      -
                    </span>
                  )}
                  {!luasLahan.trim() && (
                    <span className="absolute right-3 text-stone-400 text-[11px] font-normal pointer-events-none bg-stone-50 px-1.5 py-0.5 rounded">
                      Opsional
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Masukkan angka (satuan m² otomatis), atau isi simbol <strong>(-)</strong> / kosongkan kolom jika luas lahan tidak diketahui.
                </p>
              </div>

              {/* 4. Keterangan / Hasil Pelaksanaan (Fourth) */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Native accessible File Inputs */}
                <input
                  id="foto-sebelum-input"
                  ref={fileInputSebelumRef}
                  type="file"
                  accept="image/*"
                  disabled={isProcessingSebelum}
                  onChange={(e) => handlePhotoUpload(e, 'sebelum')}
                  onClick={(e) => {
                    (e.currentTarget as HTMLInputElement).value = '';
                  }}
                  className="sr-only"
                />
                <input
                  id="foto-sesudah-input"
                  ref={fileInputSesudahRef}
                  type="file"
                  accept="image/*"
                  disabled={isProcessingSesudah}
                  onChange={(e) => handlePhotoUpload(e, 'sesudah')}
                  onClick={(e) => {
                    (e.currentTarget as HTMLInputElement).value = '';
                  }}
                  className="sr-only"
                />

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
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900 group">
                          <img
                            src={fotoSebelum}
                            alt="Foto Sebelum Kegiatan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label
                              htmlFor="foto-sebelum-input"
                              className="cursor-pointer bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 transition-colors shadow-md flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ganti Foto</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setFotoSebelum(undefined);
                                setSebelumMeta(null);
                              }}
                              className="cursor-pointer bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-md flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="foto-sebelum-input"
                            className="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Ganti File Foto</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setFotoSebelum(undefined);
                              setSebelumMeta(null);
                            }}
                            className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-medium cursor-pointer transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="foto-sebelum-input"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) processPhotoFile(file, 'sebelum');
                        }}
                        className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-lg aspect-4/3 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-emerald-50/50 transition-all select-none group"
                      >
                        {isProcessingSebelum ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-stone-500">Mengompres & me-resize...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform pointer-events-none" />
                            <span className="text-xs font-bold text-stone-800 text-center pointer-events-none">
                              Unggah Foto Sebelum
                            </span>
                            <span className="text-[11px] text-stone-500 mt-0.5 pointer-events-none text-center">
                              Pilih file foto JPG/PNG dari galeri atau kamera
                            </span>
                            <span className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 pointer-events-none transition-colors">
                              <Camera className="w-3.5 h-3.5" />
                              <span>Pilih Foto</span>
                            </span>
                          </>
                        )}
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
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-stone-300 aspect-4/3 bg-stone-900 group">
                          <img
                            src={fotoSesudah}
                            alt="Foto Sesudah Kegiatan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label
                              htmlFor="foto-sesudah-input"
                              className="cursor-pointer bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 transition-colors shadow-md flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ganti Foto</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setFotoSesudah(undefined);
                                setSesudahMeta(null);
                              }}
                              className="cursor-pointer bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-md flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="foto-sesudah-input"
                            className="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Ganti File Foto</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setFotoSesudah(undefined);
                              setSesudahMeta(null);
                            }}
                            className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-medium cursor-pointer transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="foto-sesudah-input"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) processPhotoFile(file, 'sesudah');
                        }}
                        className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-lg aspect-4/3 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-emerald-50/50 transition-all select-none group"
                      >
                        {isProcessingSesudah ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-stone-500">Mengompres & me-resize...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform pointer-events-none" />
                            <span className="text-xs font-bold text-stone-800 text-center pointer-events-none">
                              Unggah Foto Sesudah
                            </span>
                            <span className="text-[11px] text-stone-500 mt-0.5 pointer-events-none text-center">
                              Pilih file foto JPG/PNG dari galeri atau kamera
                            </span>
                            <span className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 pointer-events-none transition-colors">
                              <Camera className="w-3.5 h-3.5" />
                              <span>Pilih Foto</span>
                            </span>
                          </>
                        )}
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
          <button
            type="button"
            onClick={() => {
              if (confirm('Kosongkan semua isian form logbook sekarang?')) {
                resetFormToEmpty();
                scrollToTop();
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Bersihkan seluruh isian form"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span>Kosongkan Form</span>
          </button>

          {editingEntry && (
            <button
              type="button"
              onClick={() => {
                resetFormToEmpty();
                onCancelEdit?.();
                scrollToTop();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              Batal Edit
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
