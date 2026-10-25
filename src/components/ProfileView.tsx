import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types/logbook';
import { resizeImageFile } from '../utils/imageUtils';
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
  X
} from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Profil Pegawai Berhasil Diperbarui!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setToastMessage('Profil Pegawai Berhasil Diperbarui!');
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
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
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
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>
      </form>
    </div>
  );
};
