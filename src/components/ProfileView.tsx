import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, GoogleAccount } from '../types/logbook';
import { resizeImageFile } from '../utils/imageUtils';
import { 
  loadGoogleAccount, 
  saveGoogleAccount, 
  clearGoogleAccount,
  saveProfileToNipDirectory,
  cleanNipDigits,
  DEFAULT_USER_PROFILE
} from '../utils/storage';
import { loginWithGoogle, logoutUser, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  User, 
  Upload, 
  Camera, 
  Building2, 
  PenTool, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  X,
  LogIn,
  LogOut,
  Sparkles,
  UserPlus,
  Mail,
  ShieldCheck,
  Check,
  Trash2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { ManualRefreshAppButton } from './AppUpdateNotification';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
  onNavigateToEpersonal?: () => void;
  onNavigateToCloudSync?: () => void;
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

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  profile, 
  onSaveProfile,
  onNavigateToEpersonal,
  onNavigateToCloudSync
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Profil Pegawai Berhasil Diperbarui!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const acc: GoogleAccount = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pegawai',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || undefined,
          provider: 'google.com',
          lastLogin: new Date().toISOString(),
        };
        setGoogleAccount(acc);
      } else {
        setGoogleAccount(loadGoogleAccount());
      }
    });
    return () => unsub();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      setErrorMessage(null);
      // Auto resize photo to avatar friendly size
      const result = await resizeImageFile(file, 600, 0.85);
      const updatedProfile = { ...formData, fotoProfil: result.dataUrl };
      setFormData(updatedProfile);
      // Simpan otomatis agar langsung muncul di pojok kanan atas secara real-time
      onSaveProfile(updatedProfile);
      if (updatedProfile.nip && cleanNipDigits(updatedProfile.nip).length >= 4) {
        saveProfileToNipDirectory(updatedProfile);
      }
      setToastMessage('Foto profil berhasil diunggah & otomatis terpasang!');
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err: any) {
      setErrorMessage('Gagal memproses foto: ' + err.message);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    const updatedProfile = { ...formData, fotoProfil: undefined };
    setFormData(updatedProfile);
    onSaveProfile(updatedProfile);
    if (updatedProfile.nip && cleanNipDigits(updatedProfile.nip).length >= 4) {
      saveProfileToNipDirectory(updatedProfile);
    }
    setToastMessage('Foto profil berhasil dihapus.');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    if (formData.nip && cleanNipDigits(formData.nip).length >= 4) {
      saveProfileToNipDirectory(formData);
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
  const handleDirectGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      const fbUser = await loginWithGoogle();
      if (fbUser) {
        setToastMessage(`Login berhasil sebagai: ${fbUser.displayName || fbUser.email}`);
        setShowSavedToast(true);
        setIsLoginModalOpen(false);
        setTimeout(() => setShowSavedToast(false), 3500);
      }
    } catch (err: any) {
      console.warn('Direct Google sign in error:', err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'logbook-kinerja.vercel.app';
        setLoginModalError(`Domain "${host}" belum diotorisasi di Firebase Console. Tambahkan domain ini di Firebase Console > Authentication > Settings > Authorized domains. Atau pilih akun preset di bawah.`);
      }
      // If popup was blocked or failed, open manual dialog
      setIsLoginModalOpen(true);
    }
  };

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
  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Firebase logout notice:', err);
    }
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

      {/* Information Banner: Data NIP & Direktori Dipindahkan ke Menu E-Personal */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-stone-900 to-emerald-950/90 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                Menu e-Personal &amp; Data NIP Pegawai
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                Telah Dipindahkan
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
              Pengelolaan seluruh data NIP karyawan KPS PVT 1 Manoko, login dengan nomor NIP, dan integrasi portal SIMPEG Kementerian Pertanian kini berada di menu <strong>e-Personal</strong>.
            </p>
          </div>
        </div>

        {onNavigateToEpersonal && (
          <button
            type="button"
            onClick={onNavigateToEpersonal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto border border-emerald-500/40 active:scale-95"
          >
            <span>Buka Menu e-Personal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GOOGLE SIGN-IN PANEL (UNTUK PENGGUNA BARU) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-emerald-950/90 border border-emerald-500/30 rounded-2xl shadow-xl text-white p-5 sm:p-6 overflow-hidden">
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

            {/* Multi-Device Cloud Sync Status Note */}
            <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-xl p-3 text-xs text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 text-base shrink-0">☁️</span>
                <div className="leading-relaxed">
                  <strong className="text-emerald-300">Sinkronisasi Multi-Perangkat Aktif:</strong> Logbook dan profil tersimpan aman di Cloud Firebase untuk akun <strong>{googleAccount.email}</strong>.
                </div>
              </div>
              {onNavigateToCloudSync && (
                <button
                  type="button"
                  onClick={onNavigateToCloudSync}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer shrink-0 transition-colors self-start sm:self-auto border border-emerald-600/50"
                >
                  Buka Menu Sinkron Cloud →
                </button>
              )}
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
                  Sinkronisasi Akun Google (Cloud Firebase)
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Multi-Perangkat
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Masuk dengan Akun Google agar data logbook dan profil tersimpan di cloud. Saat membuka aplikasi di HP, laptop, atau tablet lain dengan akun yang sama, seluruh catatan Anda akan otomatis ada dan terjaga.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectGoogleLogin}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all border border-stone-200 cursor-pointer active:scale-95"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>Masuk dengan Google</span>
              </button>
            </div>
          </div>
        )}
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
                <button
                  type="button"
                  onClick={handleDirectGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <GoogleLogo className="w-4 h-4" />
                  <span>Buka Dialog Popup Akun Google Resmi</span>
                </button>

                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block pt-1">
                  Atau Pilih Profil Riki Subagja
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={triggerPhotoUpload}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 font-medium text-stone-700 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>{isProcessingPhoto ? 'Memproses...' : formData.fotoProfil ? 'Ganti Foto' : 'Unggah Foto'}</span>
              </button>
              {formData.fotoProfil && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Hapus foto profil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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

      {/* App Version & Refresh Card */}
      <div className="pt-2">
        <ManualRefreshAppButton variant="card" />
      </div>
    </div>
  );
};
