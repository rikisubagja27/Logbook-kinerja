import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, GoogleAccount } from '../types/logbook';
import { resizeImageFile } from '../utils/imageUtils';
import { 
  loadGoogleAccount, 
  saveGoogleAccount, 
  clearGoogleAccount,
  findProfileByNip,
  loadNipDirectory,
  saveProfileToNipDirectory,
  deleteProfileFromNipDirectory,
  cleanNipDigits,
  loadEpersonalAutoOpen,
  saveEpersonalAutoOpen,
  EPERSONAL_PORTAL_URL,
  DEFAULT_USER_PROFILE
} from '../utils/storage';
import { 
  User, 
  Upload, 
  Camera, 
  Building2, 
  PenTool, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  Trash2, 
  AlertCircle, 
  X,
  LogIn,
  LogOut,
  Sparkles,
  UserPlus,
  Mail,
  ShieldCheck,
  Check,
  BadgeCheck,
  KeyRound,
  UserCheck,
  ExternalLink,
  PlusCircle,
  Copy,
  HelpCircle
} from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
}

const GoogleLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
    />
  </svg>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Profil Pegawai Berhasil Diperbarui!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // NIP Authentication & Auto-Fill State
  const [activeAuthTab, setActiveAuthTab] = useState<'nip' | 'google'>('nip');
  const [nipSearchInput, setNipSearchInput] = useState('');
  const [officerDirectory, setOfficerDirectory] = useState<UserProfile[]>(() => loadNipDirectory());
  const [nipSuccessInfo, setNipSuccessInfo] = useState<string | null>(null);
  const [nipErrorInfo, setNipErrorInfo] = useState<string | null>(null);

  // E-Personal Settings & Integration
  const [autoOpenEpersonal, setAutoOpenEpersonal] = useState<boolean>(() => loadEpersonalAutoOpen());
  const [copiedNipStatus, setCopiedNipStatus] = useState<string | null>(null);

  // New Employee Registration Modal State
  const [isRegisterEmployeeModalOpen, setIsRegisterEmployeeModalOpen] = useState(false);
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

  // Google Authentication State
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(() => loadGoogleAccount());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginModalError, setLoginModalError] = useState<string | null>(null);

  // File input refs for reliable click triggering
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureFileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerPhotoUpload = () => {
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
      profilePhotoInputRef.current.click();
    }
  };

  const triggerSignatureUpload = () => {
    if (signatureFileInputRef.current) {
      signatureFileInputRef.current.value = '';
      signatureFileInputRef.current.click();
    }
  };

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      setErrorMessage(null);
      // Auto resize photo to avatar friendly size
      const result = await resizeImageFile(file, 600, 0.85);
      setFormData((prev) => ({ ...prev, fotoProfil: result.dataUrl }));
    } catch (err: any) {
      setErrorMessage('Gagal memproses foto: ' + err.message);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const result = await resizeImageFile(file, 500, 0.9);
      setFormData((prev) => ({ ...prev, tandaTanganUrl: result.dataUrl }));
    } catch (err: any) {
      setErrorMessage('Gagal memproses tanda tangan: ' + err.message);
    }
  };

  // Canvas drawing for interactive signature pad
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const sigData = canvas.toDataURL('image/png');
      setFormData((prev) => ({ ...prev, tandaTanganUrl: sigData }));
    }
  };

  const clearCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setFormData((prev) => ({ ...prev, tandaTanganUrl: undefined }));
  };

  const handleToggleAutoOpenEpersonal = (enabled: boolean) => {
    setAutoOpenEpersonal(enabled);
    saveEpersonalAutoOpen(enabled);
    setToastMessage(enabled ? 'Otomatis buka E-Personal diaktifkan saat login NIP!' : 'Otomatis buka E-Personal dinonaktifkan.');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const handleOpenEpersonal = (nipToCopy?: string) => {
    const nip = nipToCopy || formData.nip;
    if (nip) {
      const clean = cleanNipDigits(nip);
      try {
        navigator.clipboard.writeText(clean);
        setCopiedNipStatus(clean);
        setTimeout(() => setCopiedNipStatus(null), 3500);
      } catch {
        // clipboard write fallback
      }
    }
    window.open(EPERSONAL_PORTAL_URL, '_blank', 'noopener,noreferrer');
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
      setFormData(matched);
      onSaveProfile(matched);
      setNipErrorInfo(null);

      // Auto-copy NIP to clipboard for instant pasting on E-Personal
      try {
        navigator.clipboard.writeText(matched.nip);
        setCopiedNipStatus(matched.nip);
        setTimeout(() => setCopiedNipStatus(null), 4000);
      } catch {
        // clipboard fallback
      }

      // Check if user has enabled auto-open E-Personal portal
      if (autoOpenEpersonal) {
        window.open(EPERSONAL_PORTAL_URL, '_blank', 'noopener,noreferrer');
      }

      setNipSuccessInfo(`Login Berhasil! Data profil "${matched.nama}" (${matched.nip}) otomatis dimuat. NIP telah otomatis disalin ke clipboard untuk kemudahan akses E-Personal.`);
      setToastMessage(`Login Berhasil! Profil ${matched.nama} otomatis terisi & NIP disalin.`);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 4000);
    } else {
      setNipSuccessInfo(null);
      setNipErrorInfo(`NIP "${targetNip}" belum terdaftar di daftar karyawan KPS 1 Manoko. Klik tombol "+ Daftarkan Karyawan Baru" di bawah untuk mendaftarkan rekan Anda.`);
      setFormData((prev) => ({ ...prev, nip: targetNip }));
    }
  };

  const handleRegisterNewEmployee = (e: React.FormEvent) => {
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

    // Default clean initials avatar
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

    saveProfileToNipDirectory(newProfile);
    const updatedRoster = loadNipDirectory();
    setOfficerDirectory(updatedRoster);

    // Automatically load newly registered employee into active session
    setFormData(newProfile);
    onSaveProfile(newProfile);

    // Auto-copy NIP
    try {
      navigator.clipboard.writeText(newProfile.nip);
      setCopiedNipStatus(newProfile.nip);
      setTimeout(() => setCopiedNipStatus(null), 4000);
    } catch {
      // clipboard fallback
    }

    if (autoOpenEpersonal) {
      window.open(EPERSONAL_PORTAL_URL, '_blank', 'noopener,noreferrer');
    }

    setIsRegisterEmployeeModalOpen(false);
    setNewEmpError(null);
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

    setToastMessage(`Karyawan "${newProfile.nama}" berhasil didaftarkan & data otomatis dimuat!`);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 4000);
  };

  const handleDeleteOfficer = (e: React.MouseEvent, officerNip: string, officerName: string) => {
    e.stopPropagation();
    const cleanCurrent = cleanNipDigits(DEFAULT_USER_PROFILE.nip);
    const cleanTarget = cleanNipDigits(officerNip);
    if (cleanTarget === cleanCurrent) {
      alert('Pegawai utama (Riki Subagja) tidak dapat dihapus.');
      return;
    }

    if (window.confirm(`Hapus pegawai "${officerName}" dari direktori NIP KPS 1 Manoko?`)) {
      const updated = deleteProfileFromNipDirectory(officerNip);
      setOfficerDirectory(updated);
      setToastMessage(`Pegawai "${officerName}" dihapus dari direktori.`);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    if (formData.nip && cleanNipDigits(formData.nip).length >= 4) {
      saveProfileToNipDirectory(formData);
      setOfficerDirectory(loadNipDirectory());
    }
    setToastMessage('Profil Pegawai & NIP Berhasil Disimpan!');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Automatically clears all profile fields, photo, and signature
  const handleResetToEmpty = () => {
    const emptyProfile: UserProfile = {
      nama: '',
      nip: '',
      jabatan: '',
      statusKepegawaian: '',
      unitKerja: '',
      instansiInduk: '',
      kementerian: '',
      tempatPenetapan: '',
      email: '',
      fotoProfil: undefined,
      tandaTanganUrl: undefined,
    };

    setFormData(emptyProfile);
    onSaveProfile(emptyProfile);
    setNipSuccessInfo(null);
    setNipErrorInfo(null);

    // Clear signature canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setToastMessage('Profil berhasil dikosongkan!');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // --- GOOGLE SIGN-IN HANDLERS ---
  const handleExecuteGoogleLogin = (name: string, email: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setLoginModalError('Silakan masukkan nama lengkap dan email Google.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setLoginModalError('Format alamat email tidak valid.');
      return;
    }

    // High-resolution avatar generation with DiceBear
    const initialsPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=047857,0f766e,15803d&textColor=ffffff`;

    const newAccount: GoogleAccount = {
      uid: `google-${Date.now()}`,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: initialsPhoto,
      provider: 'google.com',
      lastLogin: new Date().toISOString(),
    };

    saveGoogleAccount(newAccount);
    setGoogleAccount(newAccount);
    setIsLoginModalOpen(false);
    setLoginModalError(null);
    setLoginNameInput('');
    setLoginEmailInput('');

    setToastMessage(`Login berhasil sebagai: ${newAccount.displayName}`);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3500);
  };

  // Synchronize Google Account info to current profile form
  const handleApplyGoogleToForm = () => {
    if (!googleAccount) return;

    setFormData((prev) => ({
      ...prev,
      nama: googleAccount.displayName.toUpperCase(),
      email: googleAccount.email,
      fotoProfil: googleAccount.photoURL || prev.fotoProfil,
    }));

    setToastMessage('Data Akun Google berhasil diterapkan ke formulir!');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Create clean new profile session for a new officer using their Google Account
  const handleCreateNewOfficerProfile = () => {
    if (!googleAccount) return;

    const newProfile: UserProfile = {
      nama: googleAccount.displayName.toUpperCase(),
      nip: '',
      jabatan: 'Operator Layanan Operasional',
      statusKepegawaian: 'PPPK Paruh Waktu',
      unitKerja: 'Kebun Pemeriksaan Substantif PVT I Manoko',
      instansiInduk: 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
      kementerian: 'Kementerian Pertanian',
      tempatPenetapan: 'Bandung Barat',
      email: googleAccount.email,
      fotoProfil: googleAccount.photoURL,
      tandaTanganUrl: undefined,
    };

    setFormData(newProfile);
    onSaveProfile(newProfile);
    clearCanvasSignature();

    setToastMessage('Profil pegawai baru berhasil dibuat & disimpan!');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3500);
  };

  // Sign out from Google session
  const handleGoogleLogout = () => {
    clearGoogleAccount();
    setGoogleAccount(null);
    setToastMessage('Berhasil keluar dari Akun Google.');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-500/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/80 backdrop-blur-md border border-red-500/40 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-stone-950/80 backdrop-blur-md p-6 rounded-2xl border border-stone-800/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Profil Pegawai & Tanda Tangan Resmi
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            Data pengguna untuk identitas laporan kinerja operasional KPS PVT 1 Manoko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Tapping this button automatically empties the profile */}
          <button
            type="button"
            onClick={handleResetToEmpty}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/70 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Ketuk untuk otomatis mengosongkan seluruh data profil"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset (Kosongkan Profil)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTICATION & LOGIN HUB (NIP DIRECTORY AUTO-FILL & GOOGLE SIGN-IN) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-emerald-950/90 border border-emerald-500/30 rounded-2xl shadow-xl text-white overflow-hidden">
        {/* Method Switcher Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveAuthTab('nip')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeAuthTab === 'nip'
                ? 'bg-emerald-700 text-white shadow-md border border-emerald-500/50'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-emerald-300" />
            <span>Masuk dengan No. NIP (Otomatis Isi Profil)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveAuthTab('google')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeAuthTab === 'google'
                ? 'bg-stone-800 text-white shadow-md border border-stone-700'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GoogleLogo className="w-4 h-4" />
            <span>Masuk dengan Akun Google</span>
            {googleAccount && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {activeAuthTab === 'nip' ? (
            /* =================================================================== */
            /* TAB 1: NIP LOGIN & AUTOMATIC PROFILE PRE-FILL */
            /* =================================================================== */
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Login Cepat dengan Nomor Induk Pegawai (NIP)
                    </h2>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      Otomatis Isi Profil
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed max-w-2xl">
                    Ketik nomor NIP Anda atau klik kartu nama di bawah. Saat berhasil masuk, seluruh data profil pegawai (Nama, Jabatan, Status Kepegawaian, Unit Kerja, Kementerian, Email, Foto, hingga Tanda Tangan) akan <strong>otomatis terisi</strong>.
                  </p>
                </div>

                {formData.nip && cleanNipDigits(formData.nip).length >= 8 && (
                  <div className="shrink-0 bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white text-[11px]">NIP Aktif Saat Ini:</p>
                      <p className="font-mono text-emerald-300 text-xs">{formData.nip} &bull; {formData.nama}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Box & Submit Button */}
              <div className="bg-stone-900/90 border border-stone-700/80 p-4 rounded-xl space-y-3">
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
                    <span>Masuk &amp; Isi Profil Otomatis</span>
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
                        onClick={() => handleOpenEpersonal(formData.nip)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-400/40 shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Portal E-Personal Kementan Sekarang ↗</span>
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

              {/* ================================================================= */}
              {/* E-PERSONAL KEMENTAN QUICK ACCESS & AUTO-LAUNCH CONTROL */}
              {/* ================================================================= */}
              <div className="bg-gradient-to-r from-stone-900 via-emerald-950/60 to-stone-900 border border-emerald-600/30 rounded-xl p-4 space-y-3 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        Integrasi Portal E-Personal Kementan
                      </h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                        epersonal.pertanian.go.id
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Akses cepat ke portal SIMPEG E-Personal Kementerian Pertanian dengan nomor NIP Anda.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEpersonal(formData.nip)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-500/50 shadow-md cursor-pointer active:scale-95 shrink-0"
                      title="Buka epersonal.pertanian.go.id di tab baru & otomatis salin NIP ke clipboard"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                      <span>Buka E-Personal Kementan</span>
                    </button>
                  </div>
                </div>

                {/* Auto-Open Option Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-emerald-900/50 text-xs">
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
                    <Copy className="w-3 h-3" />
                    <span>NIP otomatis tersalin ke clipboard</span>
                  </span>
                </div>

                {/* Clarification Note for Cross-Origin E-Personal portal login */}
                <div className="bg-black/30 border border-stone-800 p-2.5 rounded-lg text-[11px] text-stone-400 space-y-1">
                  <p className="flex items-center gap-1.5 font-semibold text-stone-300">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Informasi Teknis Login Portal E-Personal:</span>
                  </p>
                  <p className="leading-relaxed text-stone-400">
                    Portal E-Personal Kementan dilindungi keamanan ketat peramban pemerintah (CORS &amp; perlindungan session cookies). Demi keamanan data ASN, peramban web tidak mengizinkan aplikasi eksternal menginjeksi password langsung ke halaman kementerian tanpa SSO server resmi. Sebagai gantinya, sistem ini <strong>otomatis menyalin nomor NIP Anda ke clipboard</strong> dan langsung membuka portal, sehingga Anda tinggal melakukan <em>Paste / Tempel</em> (Ctrl+V) pada kolom username E-Personal.
                  </p>
                </div>
              </div>

              {/* Quick Officer Directory / 1-Tap Pickers */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                      Daftar Karyawan KPS PVT 1 Manoko:
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      {officerDirectory.length} Karyawan
                    </span>
                  </div>

                  {/* Register New Officer Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmpError(null);
                      setIsRegisterEmployeeModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-500/50 shadow-sm cursor-pointer self-start sm:self-auto"
                    title="Daftarkan rekan kerja karyawan KPS 1 Manoko ke dalam sistem"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Daftarkan Karyawan Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {officerDirectory.map((officer) => {
                    const isCurrent = cleanNipDigits(formData.nip) === cleanNipDigits(officer.nip);
                    const isDefault = cleanNipDigits(officer.nip) === cleanNipDigits(DEFAULT_USER_PROFILE.nip);

                    return (
                      <div
                        key={officer.nip}
                        onClick={() => {
                          setNipSearchInput(officer.nip);
                          handleNipLogin(officer.nip);
                        }}
                        className={`group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-900/60 border-emerald-400 ring-1 ring-emerald-400 shadow-md'
                            : 'bg-stone-900/70 border-stone-800 hover:border-emerald-500/60 hover:bg-stone-800/80'
                        }`}
                        title={`Klik untuk otomatis masuk sebagai ${officer.nama} (${officer.nip})`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-800 border border-emerald-500/40 shrink-0 flex items-center justify-center">
                          {officer.fotoProfil ? (
                            <img src={officer.fotoProfil} alt={officer.nama} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-stone-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pr-6">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">{officer.nama}</p>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-500 text-stone-950 font-black px-1.5 py-0.2 rounded-full uppercase">Aktif</span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-emerald-300 truncate">{officer.nip}</p>
                          <p className="text-[10px] text-stone-400 truncate">{officer.statusKepegawaian || officer.jabatan}</p>
                        </div>

                        {/* Action buttons on card hover */}
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOfficer(e, officer.nip, officer.nama)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/60 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                              title={`Hapus ${officer.nama} dari direktori`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-stone-400 italic">
                  * Nama-nama yang tercantum di atas khusus pegawai yang terdaftar di KPS PVT 1 Manoko. Anda dapat menambah atau mengelola daftar pegawai sesuai kebutuhan operasional kebun.
                </p>
              </div>
            </div>
          ) : (
            /* =================================================================== */
            /* TAB 2: GOOGLE SIGN-IN PANEL */
            /* =================================================================== */
            <div className="animate-fade-in">
              {googleAccount ? (
                /* Logged In Google Account State */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
                    <div className="flex items-center gap-2">
                      <GoogleLogo className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold text-white tracking-tight">
                        Akun Google Terhubung (Pengguna Aktif)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-500/40 w-fit">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Terautentikasi Resmi</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Account details */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-400 bg-stone-800 flex items-center justify-center shadow-md">
                          {googleAccount.photoURL ? (
                            <img
                              src={googleAccount.photoURL}
                              alt={googleAccount.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-stone-300" />
                          )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-stone-950 rounded-full"></span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-base">
                            {googleAccount.displayName}
                          </p>
                          <span className="text-[10px] bg-white/10 text-stone-300 px-2 py-0.5 rounded font-mono">
                            Google User
                          </span>
                        </div>
                        <p className="text-xs text-emerald-300/90 font-mono mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-emerald-400" />
                          <span>{googleAccount.email}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons for Logged In User */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyGoogleToForm}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all cursor-pointer border border-emerald-500/40"
                        title="Salin Nama Lengkap dan Email Google ke Formulir Profil di bawah"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Sinkron ke Form</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateNewOfficerProfile}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer border border-white/20"
                        title="Buat profil pegawai baru dengan nama dan email akun Google ini"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Buat Profil Baru</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/60 rounded-xl transition-all cursor-pointer border border-rose-500/30"
                        title="Keluar dari akun Google ini"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not Logged In State (Prompts New Users to Sign In with Google) */
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 border border-white/15">
                        <GoogleLogo className="w-5 h-5" />
                      </div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Login Pengguna Baru dengan Akun Google
                      </h2>
                      <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                        Pengguna Baru
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Bagi pegawai baru atau pengguna yang baru bertugas di KPS PVT 1 Manoko, Anda dapat langsung masuk dengan Akun Google untuk sinkronisasi identitas otomatis dan mengisi profil dinas Anda dengan mudah.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all border border-stone-200 cursor-pointer active:scale-95"
                    >
                      <GoogleLogo className="w-4 h-4" />
                      <span>Masuk dengan Akun Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GOOGLE SIGN-IN MODAL (AUTHENTIC GOOGLE DIALOG EXPERIENCE) */}
      {/* ========================================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden text-stone-900">
            {/* Modal Top Google Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-red-500 via-amber-500 to-emerald-500"></div>

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GoogleLogo className="w-6 h-6" />
                    <span className="text-lg font-bold text-stone-900">Google</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900">
                    Masuk dengan Akun Google
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pilih akun atau masukkan data akun Google Anda untuk melanjutkan ke Logbook Kinerja KPS 1 Manoko.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loginModalError && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginModalError}</span>
                </div>
              )}

              {/* Quick 1-Tap Option: Current officer preset account */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Pilih Akun yang Tersedia
                </span>
                <button
                  type="button"
                  onClick={() => handleExecuteGoogleLogin('Riki Subagja', 'rikisu393@gmail.com')}
                  className="w-full p-3 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      RS
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900 group-hover:text-emerald-800">
                        Riki Subagja
                      </p>
                      <p className="text-xs text-stone-500 font-mono">
                        rikisu393@gmail.com
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                    Pilih
                  </span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-3 text-stone-400 text-[11px] font-semibold uppercase">
                  Atau Masuk Sebagai Pengguna Baru
                </span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              {/* New User Account Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Lengkap Pegawai Baru
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso / Siti Rahmawati"
                    value={loginNameInput}
                    onChange={(e) => setLoginNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Email Google / Kedinasan
                  </label>
                  <input
                    type="email"
                    placeholder="nama.pegawai@gmail.com"
                    value={loginEmailInput}
                    onChange={(e) => setLoginEmailInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteGoogleLogin(loginNameInput, loginEmailInput)}
                  className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk dengan Akun Ini</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-stone-500 leading-normal">
                  Data akun Anda disimpan secara aman di browser ini untuk keperluan identitas pengesahan laporan kinerja PVTPP Kementerian Pertanian.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REGISTER NEW KPS 1 MANOKO EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {isRegisterEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden text-stone-900 my-8">
            {/* Modal Top Green Accent Bar */}
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
                    Masukkan data karyawan resmi KPS PVT 1 Manoko agar saat login dengan nomor NIP, profil otomatis terisi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterEmployeeModalOpen(false)}
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
                    placeholder="Contoh: RIKI SUBAGJA"
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
                  onClick={() => setIsRegisterEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Daftarkan &amp; Masuk Otomatis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN PROFILE FORM */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo & Main Identity Card */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Foto Profil Pengguna */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-emerald-600/30 shadow-md bg-stone-100 flex items-center justify-center group">
              {formData.fotoProfil ? (
                <img
                  src={formData.fotoProfil}
                  alt={formData.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-stone-400">
                  <User className="w-12 h-12 mb-1" />
                  <span className="text-[10px] font-medium">Pas Foto</span>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*,image/jpeg,image/png,image/webp,image/jpg"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Upload Overlay */}
              <button
                type="button"
                onClick={triggerPhotoUpload}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-semibold">Ganti Foto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={triggerPhotoUpload}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 font-medium text-stone-700 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>{isProcessingPhoto ? 'Memproses...' : 'Unggah Foto'}</span>
            </button>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Lengkap Pegawai
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50 uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nomor Induk Pegawai (NIP)
              </label>
              <input
                type="text"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Jabatan Kedinasan
              </label>
              <input
                type="text"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Status Kepegawaian
              </label>
              <input
                type="text"
                value={formData.statusKepegawaian}
                onChange={(e) => setFormData({ ...formData, statusKepegawaian: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            {/* Email Field with Google account hint */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alamat Email Kedinasan / Akun Google
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pegawai@gmail.com"
                  className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50 font-mono"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Agency and Work Location Card */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            Unit Kerja & Instansi Penetapan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unit / Kebun Kerja
              </label>
              <input
                type="text"
                value={formData.unitKerja}
                onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Instansi Induk Satker
              </label>
              <input
                type="text"
                value={formData.instansiInduk}
                onChange={(e) => setFormData({ ...formData, instansiInduk: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kementerian / Lembaga
              </label>
              <input
                type="text"
                value={formData.kementerian}
                onChange={(e) => setFormData({ ...formData, kementerian: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kota Tempat Penetapan Laporan
              </label>
              <input
                type="text"
                value={formData.tempatPenetapan}
                onChange={(e) => setFormData({ ...formData, tempatPenetapan: e.target.value })}
                required
                placeholder="Contoh: Bandung Barat"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>
          </div>
        </div>

        {/* Tanda Tangan Resmi Card */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-2">
              <PenTool className="w-4 h-4 text-emerald-700" />
              Tanda Tangan Digital Resmi
            </h2>
            {formData.tandaTanganUrl && (
              <button
                type="button"
                onClick={clearCanvasSignature}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Tanda Tangan</span>
              </button>
            )}
          </div>

          <p className="text-xs text-stone-500">
            Tanda tangan ini akan otomatis dicetak pada lembar penutup laporan resmi (BAB III). Anda dapat menggambar langsung di kotak bawah atau mengunggah gambar tanda tangan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Draw Signature Pad */}
            <div className="border border-stone-300 rounded-xl p-3 bg-stone-50/50 flex flex-col items-center">
              <span className="text-xs font-semibold text-stone-700 mb-2">
                Gambar Tanda Tangan Langsung
              </span>
              <canvas
                ref={canvasRef}
                width={320}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="bg-white border border-stone-300 rounded-lg cursor-crosshair shadow-inner touch-none"
              ></canvas>
              <span className="text-[11px] text-stone-400 mt-1">
                Gunakan mouse atau jari di layar sentuh
              </span>
            </div>

            {/* Current Signature Preview & Upload */}
            <div className="border border-stone-300 rounded-xl p-3 bg-stone-50/50 flex flex-col items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 mb-2">
                Pratinjau Tanda Tangan Aktif
              </span>
              <div className="h-[130px] w-full bg-white border border-stone-200 rounded-lg flex items-center justify-center p-2">
                {formData.tandaTanganUrl ? (
                  <img
                    src={formData.tandaTanganUrl}
                    alt="Tanda Tangan"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-stone-400 italic">Belum ada tanda tangan</span>
                )}
              </div>

              {/* Hidden signature file input */}
              <input
                ref={signatureFileInputRef}
                type="file"
                accept="image/*,image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleSignatureUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={triggerSignatureUpload}
                className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 font-medium text-stone-700 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>Unggah File Tanda Tangan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>
      </form>
    </div>
  );
};
