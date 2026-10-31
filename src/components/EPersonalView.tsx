import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types/logbook';
import { 
  findProfileByNip, 
  loadNipDirectory, 
  saveProfileToNipDirectory, 
  deleteProfileFromNipDirectory, 
  cleanNipDigits, 
  loadEpersonalAutoOpen, 
  saveEpersonalAutoOpen, 
  getEpersonalUrlWithNip, 
  DEFAULT_USER_PROFILE,
  mergeCloudNipDirectory,
  initRosterFromIDB
} from '../utils/storage';
import { 
  subscribeToCloudEmployees, 
  fetchCloudEmployees, 
  syncAllEmployeesToCloud,
  loginWithGoogle 
} from '../firebase';
import { 
  Building2, 
  KeyRound, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  User, 
  HelpCircle, 
  X,
  BadgeCheck,
  Check,
  ArrowRight,
  RefreshCw,
  LogIn
} from 'lucide-react';

interface EPersonalViewProps {
  currentProfile: UserProfile;
  officers?: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  onNavigateToProfile?: () => void;
  onRefreshOfficers?: () => Promise<void>;
  isRefreshingOfficers?: boolean;
}

export const EPersonalView: React.FC<EPersonalViewProps> = ({
  currentProfile,
  officers,
  onSelectProfile,
  onNavigateToProfile,
  onRefreshOfficers,
  isRefreshingOfficers = false,
}) => {
  const [nipSearchInput, setNipSearchInput] = useState('');
  const [internalDirectory, setInternalDirectory] = useState<UserProfile[]>(() => officers || loadNipDirectory());
  const officerDirectory = officers && officers.length > 0 ? officers : internalDirectory;

  const [nipSuccessInfo, setNipSuccessInfo] = useState<string | null>(null);
  const [nipErrorInfo, setNipErrorInfo] = useState<string | null>(null);
  const [justRegisteredOfficer, setJustRegisteredOfficer] = useState<UserProfile | null>(null);

  const [isRefreshingLocalRoster, setIsRefreshingLocalRoster] = useState(false);
  const [isSavingNewEmp, setIsSavingNewEmp] = useState(false);

  // Synchronize internalDirectory with props if props update
  useEffect(() => {
    if (officers && officers.length > 0) {
      setInternalDirectory(officers);
    }
  }, [officers]);

  // Load from IndexedDB and listen to cross-window updates
  useEffect(() => {
    initRosterFromIDB().then((idbList) => {
      if (idbList && idbList.length > 0) {
        setInternalDirectory(idbList);
        syncAllEmployeesToCloud(idbList).catch(() => {});
      }
    }).catch(() => {});

    fetchCloudEmployees().then((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        const merged = mergeCloudNipDirectory(cloudList);
        setInternalDirectory(merged);
      }
    }).catch(() => {});

    const unsub = subscribeToCloudEmployees((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        const merged = mergeCloudNipDirectory(cloudList);
        setInternalDirectory(merged);
      }
    });

    const handleDirectoryUpdated = (e: any) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setInternalDirectory(e.detail);
      }
    };
    window.addEventListener('kps-nip-directory-updated', handleDirectoryUpdated);

    return () => {
      unsub();
      window.removeEventListener('kps-nip-directory-updated', handleDirectoryUpdated);
    };
  }, []);

  const handleRefreshRoster = async () => {
    if (onRefreshOfficers) {
      await onRefreshOfficers();
      displayToast('Direktori NIP disinkronkan dari Cloud & Lokal.');
      return;
    }

    setIsRefreshingLocalRoster(true);
    try {
      const idbList = await initRosterFromIDB();
      if (idbList.length > 0) {
        setInternalDirectory(idbList);
        await syncAllEmployeesToCloud(idbList);
      }

      const cloudList = await fetchCloudEmployees();
      if (cloudList && cloudList.length > 0) {
        const merged = mergeCloudNipDirectory(cloudList);
        setInternalDirectory(merged);
        displayToast(`Direktori NIP disinkronkan (${merged.length} karyawan terdaftar di Cloud & Lokal)!`);
      } else {
        displayToast(`Direktori NIP dimuat ulang (${idbList.length} karyawan terdaftar).`);
      }
    } catch (err: any) {
      console.warn('Refresh roster error:', err);
      displayToast('Gagal memuat dari Cloud, menggunakan data lokal.');
    } finally {
      setIsRefreshingLocalRoster(false);
    }
  };

  // E-Personal Settings
  const [autoOpenEpersonal, setAutoOpenEpersonal] = useState<boolean>(() => loadEpersonalAutoOpen());
  const [copiedNipStatus, setCopiedNipStatus] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Register New Employee Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newEmpFormData, setNewEmpFormData] = useState<Partial<UserProfile>>({
    nama: '',
    nip: '',
    jabatan: 'Operator Layanan Operasional',
    statusKepegawaian: 'PPPK Paruh Waktu',
    unitKerja: 'Kebun Pemeriksaan Substantif PVT I Manoko',
    instansiInduk: 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
    kementerian: 'Kementerian Pertanian',
    tempatPenetapan: 'Bandung Barat',
    email: '',
  });
  const [newEmpError, setNewEmpError] = useState<string | null>(null);

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleToggleAutoOpenEpersonal = (enabled: boolean) => {
    setAutoOpenEpersonal(enabled);
    saveEpersonalAutoOpen(enabled);
    displayToast(enabled ? 'Otomatis buka tab E-Personal saat login NIP diaktifkan!' : 'Otomatis buka tab E-Personal dinonaktifkan.');
  };

  const handleOpenEpersonal = (nipToCopy?: string, employeeName?: string) => {
    const targetNip = nipToCopy || currentProfile.nip;
    const clean = cleanNipDigits(targetNip);
    if (clean) {
      try {
        navigator.clipboard.writeText(clean);
        setCopiedNipStatus(clean);
        setTimeout(() => setCopiedNipStatus(null), 4000);
      } catch {}
      const empName = employeeName || officerDirectory.find((o) => cleanNipDigits(o.nip) === clean)?.nama || currentProfile.nama || 'Pegawai';
      displayToast(`NIP ${empName} (${clean}) berhasil disalin! Silakan Tempel (Paste) di kolom login E-Personal.`);
    }
    const targetUrl = getEpersonalUrlWithNip(clean);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNipLogin = (targetNip: string) => {
    const cleaned = cleanNipDigits(targetNip);
    if (!cleaned) {
      setNipErrorInfo('Silakan masukkan nomor NIP (angka) pegawai.');
      setNipSuccessInfo(null);
      return;
    }

    const matched = findProfileByNip(cleaned);
    if (matched) {
      onSelectProfile(matched);
      setNipErrorInfo(null);

      // Auto-copy NIP to clipboard
      try {
        navigator.clipboard.writeText(matched.nip);
        setCopiedNipStatus(matched.nip);
        setTimeout(() => setCopiedNipStatus(null), 4000);
      } catch {}

      // Auto launch e-personal if toggled
      if (autoOpenEpersonal) {
        const targetUrl = getEpersonalUrlWithNip(matched.nip);
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }

      setNipSuccessInfo(`Login Berhasil! Pegawai "${matched.nama}" (${matched.nip}) sekarang aktif. NIP otomatis disalin ke clipboard.`);
      displayToast(`Login Berhasil! Profil ${matched.nama} aktif & NIP disalin.`);
    } else {
      setNipSuccessInfo(null);
      setNipErrorInfo(`NIP "${targetNip}" belum terdaftar di direktori KPS 1 Manoko. Klik tombol "+ Daftarkan Karyawan Baru" di bawah untuk mendaftarkan rekan Anda.`);
    }
  };

  const handleRegisterNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpFormData.nama?.trim()) {
      setNewEmpError('Silakan masukkan nama lengkap pegawai.');
      return;
    }
    const cleanNip = cleanNipDigits(newEmpFormData.nip);
    if (!cleanNip || cleanNip.length < 4) {
      setNewEmpError('Silakan masukkan nomor NIP pegawai yang valid (minimal 4 angka).');
      return;
    }

    const initialsPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newEmpFormData.nama.trim())}&backgroundColor=047857,0f766e,15803d&textColor=ffffff`;

    const newProfile: UserProfile = {
      nama: newEmpFormData.nama.trim().toUpperCase(),
      nip: cleanNip,
      jabatan: newEmpFormData.jabatan?.trim() || 'Operator Layanan Operasional',
      statusKepegawaian: newEmpFormData.statusKepegawaian?.trim() || 'PPPK Paruh Waktu',
      unitKerja: newEmpFormData.unitKerja?.trim() || 'Kebun Pemeriksaan Substantif PVT I Manoko',
      instansiInduk: newEmpFormData.instansiInduk?.trim() || 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
      kementerian: newEmpFormData.kementerian?.trim() || 'Kementerian Pertanian',
      tempatPenetapan: newEmpFormData.tempatPenetapan?.trim() || 'Bandung Barat',
      email: newEmpFormData.email?.trim() || '',
      fotoProfil: initialsPhoto,
      tandaTanganUrl: undefined,
    };

    setIsSavingNewEmp(true);
    setNewEmpError(null);

    try {
      // Await saving to LocalStorage, IndexedDB, and Cloud Firestore!
      await saveProfileToNipDirectory(newProfile);

      const updatedRoster = loadNipDirectory();
      setInternalDirectory(updatedRoster);
      if (onRefreshOfficers) {
        onRefreshOfficers().catch(() => {});
      }

      // Automatically load newly registered employee into active session
      onSelectProfile(newProfile);

      // Auto-copy NIP
      try {
        navigator.clipboard.writeText(newProfile.nip);
        setCopiedNipStatus(newProfile.nip);
        setTimeout(() => setCopiedNipStatus(null), 4000);
      } catch {}

      // Save the data to local and cloud storage, and only open if user explicitly clicks the action button
      setJustRegisteredOfficer(newProfile);

      setIsRegisterModalOpen(false);
      setNewEmpFormData({
        nama: '',
        nip: '',
        jabatan: 'Operator Layanan Operasional',
        statusKepegawaian: 'PPPK Paruh Waktu',
        unitKerja: 'Kebun Pemeriksaan Substantif PVT I Manoko',
        instansiInduk: 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
        kementerian: 'Kementerian Pertanian',
        tempatPenetapan: 'Bandung Barat',
        email: '',
      });

      displayToast(`Karyawan "${newProfile.nama}" berhasil didaftarkan & tersimpan di Cloud! Rekan kerja di perangkat lain langsung dapat melihatnya.`);
    } catch (err: any) {
      console.error('Registration save error:', err);
      setNewEmpError('Terjadi kendala saat menyimpan data: ' + (err.message || 'Coba periksa koneksi internet.'));
    } finally {
      setIsSavingNewEmp(false);
    }
  };

  const handleDeleteOfficer = async (e: React.MouseEvent, officerNip: string, officerName: string) => {
    e.stopPropagation();
    const cleanCurrent = cleanNipDigits(DEFAULT_USER_PROFILE.nip);
    const cleanTarget = cleanNipDigits(officerNip);
    if (cleanTarget === cleanCurrent) {
      alert('Pegawai utama (Riki Subagja) tidak dapat dihapus.');
      return;
    }

    if (window.confirm(`Hapus pegawai "${officerName}" dari direktori NIP KPS 1 Manoko?`)) {
      const updated = await deleteProfileFromNipDirectory(officerNip);
      setInternalDirectory(updated);
      if (onRefreshOfficers) {
        onRefreshOfficers().catch(() => {});
      }
      displayToast(`Pegawai "${officerName}" dihapus dari direktori lokal & Cloud.`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-500/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-stone-950/80 backdrop-blur-md p-6 rounded-2xl border border-stone-800/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>PORTAL KEPEGAWAIAN &amp; DATA NIP KPS 1 MANOKO</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Menu e-Personal &amp; Autentikasi NIP
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            Pusat pengelolaan nomor NIP karyawan, login akun pegawai, serta integrasi resmi ke portal SIMPEG e-Personal Kementerian Pertanian.
          </p>
        </div>

        {/* Current Active Account Status */}
        <div className="bg-emerald-950/80 border border-emerald-500/40 p-3.5 rounded-xl text-xs text-emerald-200 shadow-md shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-900 border border-emerald-400/50 flex items-center justify-center shrink-0">
            {currentProfile.fotoProfil ? (
              <img src={currentProfile.fotoProfil} alt={currentProfile.nama} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-stone-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[10px] uppercase font-bold text-emerald-400">Pegawai Aktif Saat Ini:</p>
            </div>
            <p className="font-bold text-white text-sm">{currentProfile.nama || 'Belum Dipilih'}</p>
            <p className="font-mono text-emerald-300 text-xs">NIP: {currentProfile.nip || '-'}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: E-PERSONAL KEMENTAN DIRECT ACCESS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950/70 to-stone-900 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Integrasi Portal E-Personal Kementerian Pertanian
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                SIMPEG Kementan
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
              Buka langsung portal SIMPEG E-Personal Kementerian Pertanian. Nomor NIP pegawai yang sedang aktif <strong>({currentProfile.nip})</strong> akan otomatis disalin ke clipboard Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenEpersonal(currentProfile.nip, currentProfile.nama)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold transition-all border border-emerald-400/50 shadow-lg cursor-pointer active:scale-95"
              title="Buka portal E-Personal dan salin NIP aktif ke clipboard"
            >
              <ExternalLink className="w-4 h-4 text-amber-300" />
              <span>Buka Portal E-Personal Kementan ↗</span>
            </button>
          </div>
        </div>

        {/* Auto-Open Option Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-900/50 text-xs">
          <label className="flex items-center gap-2.5 text-stone-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoOpenEpersonal}
              onChange={(e) => handleToggleAutoOpenEpersonal(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 bg-stone-950 border-stone-700 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="font-medium text-xs text-stone-200">
              Otomatis buka tab E-Personal Kementan setiap kali login NIP berhasil
            </span>
          </label>

          <span className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1">
            <Copy className="w-3.5 h-3.5" />
            <span>NIP otomatis tersalin ke clipboard</span>
          </span>
        </div>

        {/* Technical Autofill Explanation */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs space-y-2 text-stone-300">
          <div className="flex items-center gap-1.5 font-bold text-emerald-300">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mengapa di HP/Laptop Anda kolom E-Personal masih terisi NIP Pak Riki?</span>
          </div>
          <p className="leading-relaxed text-stone-300 text-[11px]">
            1. <strong>Autofill Sandi Browser:</strong> Google Chrome atau peramban HP Anda menyimpan data sandi akun E-Personal pemilik perangkat. Saat halaman kementerian terbuka, Chrome otomatis mengisikan data sandi yang tersimpan.
          </p>
          <p className="leading-relaxed text-stone-300 text-[11px]">
            2. <strong>Keamanan ASN Kementan:</strong> Server E-Personal Kementan tidak mengizinkan web luar menginjeksi password sembarangan tanpa izin SSO.
          </p>
          <p className="leading-relaxed text-emerald-200 text-[11px] bg-black/40 p-2.5 rounded-lg border border-emerald-500/20 font-medium">
            💡 <strong>Solusi:</strong> Sistem kami telah <strong>otomatis menyalin NIP pegawai aktif ke clipboard Anda</strong>. Di halaman login E-Personal, cukup hapus angka NIP lama lalu tekan <strong>Tempel / Paste (Ctrl+V)</strong>. Apabila rekan kerja membuka web ini dari HP mereka sendiri dan memilih nama mereka, NIP mereka yang akan tersalin!
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: LOGIN DENGAN NOMOR NIP */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Login Cepat dengan Nomor Induk Pegawai (NIP)
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Otomatis Isi Profil &amp; Laporan
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Ketik nomor NIP Anda atau klik kartu nama di daftar karyawan bawah. Data nama, jabatan, unit kerja, hingga format laporan kinerja Anda akan otomatis terisi.
            </p>
          </div>
        </div>

        {/* Input Box & Submit Button */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-stone-200">
            Ketik Nomor Induk Pegawai (NIP):
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={nipSearchInput}
                onChange={(e) => {
                  setNipSearchInput(e.target.value);
                  setNipErrorInfo(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNipLogin(nipSearchInput);
                  }
                }}
                placeholder="Contoh: 199808272025211042"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-700 bg-stone-950 text-white font-mono placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleNipLogin(nipSearchInput)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer border border-emerald-500/40 active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Masuk dengan NIP</span>
            </button>
          </div>

          {/* Feedback message banners */}
          {nipSuccessInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 text-xs space-y-2 animate-fade-in shadow-md">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="leading-relaxed font-semibold text-white">{nipSuccessInfo}</p>
                  {copiedNipStatus && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300 bg-black/40 px-2.5 py-1 rounded-md font-mono w-fit border border-amber-500/30">
                      <Copy className="w-3 h-3" />
                      <span>NIP {copiedNipStatus} disalin ke clipboard</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-800/40">
                <button
                  type="button"
                  onClick={() => handleOpenEpersonal(currentProfile.nip, currentProfile.nama)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-400/40 shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Portal E-Personal Sekarang ↗</span>
                </button>
              </div>
            </div>
          )}

          {nipErrorInfo && (
            <div className="p-3 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{nipErrorInfo}</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: DAFTAR KARYAWAN & DATA NIP KPS 1 MANOKO */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Data NIP Karyawan KPS PVT 1 Manoko:
            </span>
            <span className="text-xs text-stone-400 font-mono bg-stone-950 px-2.5 py-0.5 rounded-lg border border-stone-800">
              {officerDirectory.length} Karyawan Terdaftar
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleRefreshRoster}
              disabled={isRefreshingOfficers || isRefreshingLocalRoster}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-all border border-stone-700 shadow-sm cursor-pointer disabled:opacity-50"
              title="Perbarui daftar karyawan dari memori lokal dan Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshingOfficers || isRefreshingLocalRoster ? 'animate-spin' : ''}`} />
              <span>{isRefreshingOfficers || isRefreshingLocalRoster ? 'Memperbarui...' : 'Sinkron NIP'}</span>
            </button>

            {/* Register New Officer Button */}
            <button
              type="button"
              onClick={() => {
                setNewEmpError(null);
                setIsRegisterModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-500/50 shadow-sm cursor-pointer"
              title="Daftarkan rekan kerja karyawan KPS 1 Manoko ke dalam sistem"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>+ Daftarkan Karyawan Baru</span>
            </button>
          </div>
        </div>

        {/* Dedicated banner when employee was just registered: shows saved confirmation without auto-redirecting */}
        {justRegisteredOfficer && (
          <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-2 border-emerald-400 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center shrink-0 text-emerald-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Data Karyawan Berhasil Disimpan!</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    Tersimpan di Cloud
                  </span>
                </p>
                <p className="text-xs text-stone-200">
                  <strong>{justRegisteredOfficer.nama}</strong> · NIP: <span className="font-mono text-emerald-300 font-bold">{justRegisteredOfficer.nip}</span> telah tersimpan di direktori bersama.
                </p>
                <p className="text-[11px] text-stone-400">
                  Data NIP otomatis disalin. Ketuk tombol di samping jika Anda ingin membuka portal E-Personal Kementan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEpersonal(justRegisteredOfficer.nip, justRegisteredOfficer.nama)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-emerald-400/40 active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-amber-300" />
                <span>Buka E-Personal (Salin NIP) ↗</span>
              </button>
              <button
                type="button"
                onClick={() => setJustRegisteredOfficer(null)}
                className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
                title="Tutup konfirmasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-stone-300">
          Klik pada salah satu kartu karyawan untuk langsung masuk sebagai pengguna tersebut, atau klik tombol <strong>`↗`</strong> untuk langsung membuka E-Personal dengan NIP tersebut.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {officerDirectory.map((officer) => {
            const isCurrent = cleanNipDigits(currentProfile.nip) === cleanNipDigits(officer.nip);
            const isDefault = cleanNipDigits(officer.nip) === cleanNipDigits(DEFAULT_USER_PROFILE.nip);

            return (
              <div
                key={officer.nip}
                onClick={() => {
                  setNipSearchInput(officer.nip);
                  handleNipLogin(officer.nip);
                }}
                className={`group relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-950/70 border-emerald-400 ring-1 ring-emerald-400 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 hover:border-emerald-500/60 hover:bg-stone-800/80'
                }`}
                title={`Klik untuk otomatis masuk sebagai ${officer.nama} (${officer.nip})`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-stone-800 border border-emerald-500/40 shrink-0 flex items-center justify-center">
                  {officer.fotoProfil ? (
                    <img src={officer.fotoProfil} alt={officer.nama} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-stone-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pr-14">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">{officer.nama}</p>
                    {isCurrent && (
                      <span className="text-[9px] bg-emerald-500 text-stone-950 font-black px-1.5 py-0.2 rounded-full uppercase">Aktif</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-emerald-300 truncate">{officer.nip}</p>
                  <p className="text-[10px] text-stone-400 truncate">{officer.statusKepegawaian || officer.jabatan}</p>
                </div>

                {/* Action buttons on card */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNipLogin(officer.nip);
                      handleOpenEpersonal(officer.nip, officer.nama);
                    }}
                    className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-800/80 transition-all cursor-pointer"
                    title={`Buka E-Personal langsung dengan NIP ${officer.nama} (${officer.nip})`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {!isDefault && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOfficer(e, officer.nip, officer.nama)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/60 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                      title={`Hapus ${officer.nama} dari direktori`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {onNavigateToProfile && (
          <div className="pt-2 flex items-center justify-between text-xs text-stone-400 border-t border-stone-800">
            <span>Ingin melengkapi tanda tangan atau foto profil?</span>
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Menu Profil Pegawai</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DAFTARKAN KARYAWAN BARU */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden text-stone-900 my-8">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700"></div>

            <form onSubmit={handleRegisterNewEmployee} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">KPS PVT 1 Manoko</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900">
                    Daftarkan Karyawan Baru
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Masukkan data karyawan resmi KPS PVT 1 Manoko agar saat login dengan nomor NIP, profil dan laporan otomatis terisi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {newEmpError && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newEmpError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Lengkap Pegawai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NAMA LENGKAP KARYAWAN"
                    value={newEmpFormData.nama || ''}
                    onChange={(e) => setNewEmpFormData({ ...newEmpFormData, nama: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nomor Induk Pegawai (NIP) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="18 digit angka NIP"
                      value={newEmpFormData.nip || ''}
                      onChange={(e) => setNewEmpFormData({ ...newEmpFormData, nip: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Status Kepegawaian
                    </label>
                    <select
                      value={newEmpFormData.statusKepegawaian || 'PPPK Paruh Waktu'}
                      onChange={(e) => setNewEmpFormData({ ...newEmpFormData, statusKepegawaian: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                      <option value="PPPK Penuh Waktu">PPPK Penuh Waktu</option>
                      <option value="Pegawai Negeri Sipil (PNS)">Pegawai Negeri Sipil (PNS)</option>
                      <option value="Tenaga Teknis Lapangan">Tenaga Teknis Lapangan</option>
                      <option value="Operator Kebun">Operator Kebun</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Jabatan Kedinasan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Operator Layanan Operasional"
                    value={newEmpFormData.jabatan || ''}
                    onChange={(e) => setNewEmpFormData({ ...newEmpFormData, jabatan: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Alamat Email (Kedinasan / Google)
                  </label>
                  <input
                    type="email"
                    placeholder="pegawai@gmail.com atau @pertanian.go.id"
                    value={newEmpFormData.email || ''}
                    onChange={(e) => setNewEmpFormData({ ...newEmpFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Unit Kerja
                    </label>
                    <input
                      type="text"
                      value={newEmpFormData.unitKerja || 'Kebun Pemeriksaan Substantif PVT I Manoko'}
                      onChange={(e) => setNewEmpFormData({ ...newEmpFormData, unitKerja: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Kota Penetapan
                    </label>
                    <input
                      type="text"
                      value={newEmpFormData.tempatPenetapan || 'Bandung Barat'}
                      onChange={(e) => setNewEmpFormData({ ...newEmpFormData, tempatPenetapan: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewEmp}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow-md transition-all border border-emerald-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingNewEmp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    <span>Simpan &amp; Daftarkan Karyawan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
