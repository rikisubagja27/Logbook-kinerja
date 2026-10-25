export type AttendanceStatus = 'WFO' | 'Sakit' | 'Cuti';

export interface LogbookEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kehadiran: AttendanceStatus;
  waktuMulai: string; // HH:mm e.g. "07:30"
  waktuSelesai: string; // HH:mm e.g. "16:00"
  uraianPekerjaan: string;
  lokasiPekerjaan: string;
  luasLahan: string; // e.g. "1.200 m²", "800 m²", "-"
  fotoSebelum?: string; // base64 resized
  fotoSesudah?: string; // base64 resized
  keterangan?: string;
  suratSakit?: string; // base64 resized surat dokter/surat sakit
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  nama: string;
  nip: string;
  jabatan: string;
  statusKepegawaian: string; // e.g. "PPPK Paruh Waktu"
  unitKerja: string; // e.g. "Kebun Pemeriksaan Substantif PVT I Manoko"
  instansiInduk: string; // e.g. "Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian"
  kementerian: string; // e.g. "Kementerian Pertanian"
  tempatPenetapan: string; // e.g. "Bandung Barat"
  fotoProfil?: string;
  tandaTanganUrl?: string;
  email: string;
}

export type ReportType = 'bulanan' | 'triwulan' | 'tahunan';

export interface ReportConfig {
  tipe: ReportType;
  tahun: number;
  bulan: number; // 1-12 (for bulanan)
  triwulan: number; // 1-4 (for triwulan)
  tanggalCetak: string; // YYYY-MM-DD
}
