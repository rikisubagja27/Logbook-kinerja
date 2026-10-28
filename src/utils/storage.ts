import { LogbookEntry, UserProfile, GoogleAccount } from '../types/logbook';

const LOGBOOK_STORAGE_KEY = 'kps1_manoko_logbook_entries_v1';
const PROFILE_STORAGE_KEY = 'kps1_manoko_user_profile_v1';
const GOOGLE_AUTH_STORAGE_KEY = 'kps1_manoko_google_auth_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  nama: 'RIKI SUBAGJA',
  nip: '199808272025211042',
  jabatan: 'Operator Layanan Operasional',
  statusKepegawaian: 'PPPK Paruh Waktu',
  unitKerja: 'Kebun Pemeriksaan Substantif PVT I Manoko',
  instansiInduk: 'Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian',
  kementerian: 'Kementerian Pertanian',
  tempatPenetapan: 'Bandung Barat',
  email: 'rikisu393@gmail.com',
  // Default clean signature placeholder SVG
  tandaTanganUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90"><path d="M 20 65 Q 45 15, 60 70 T 80 40 Q 100 80, 120 30 T 150 75 Q 170 20, 190 60 T 225 50" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M 40 75 L 210 68" fill="none" stroke="%231e293b" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

// Generates an illustrative SVG placeholder for sample photos
function createSamplePhotoSvg(label: string, sub: string, bgColor = '#e2e8f0', textColor = '#334155'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${bgColor}"/>
    <rect x="10" y="10" width="380" height="280" rx="8" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"/>
    <circle cx="200" cy="110" r="40" fill="#cbd5e1"/>
    <path d="M 175 125 L 225 125 L 215 95 L 185 95 Z" fill="#94a3b8"/>
    <text x="200" y="175" font-family="sans-serif" font-size="14" font-weight="bold" fill="${textColor}" text-anchor="middle">${label}</text>
    <text x="200" y="200" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${sub}</text>
    <rect x="20" y="240" width="360" height="40" rx="4" fill="rgba(15,23,42,0.7)"/>
    <text x="30" y="258" font-family="monospace" font-size="9" fill="#f8fafc">KPS PVT I Manoko - Lembang</text>
    <text x="30" y="272" font-family="monospace" font-size="8" fill="#cbd5e1">S 6°48'16.074" E 107°36'50.629" · 1289m dpl</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_LOGBOOK_ENTRIES: LogbookEntry[] = [
  // --- JULI 2026 ---
  {
    id: 'entry-jul-1',
    tanggal: '2026-07-06',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Pengolahan Lahan & Persiapan Tanam',
    uraianPekerjaan: 'Pengolahan lahan Blok C7 (belakang/sekitar screen house), penggaritan dan pembuatan bedengan menggunakan cultivator',
    lokasiPekerjaan: 'Blok C7 (sekitar screen house)',
    luasLahan: '800 m²',
    keterangan: 'Bedengan selesai dibuat siap untuk aplikasi pupuk dasar',
    fotoSebelum: createSamplePhotoSvg('Pengolahan Lahan Blok C7', 'Persiapan cultivator & penggemburan', '#f0fdf4', '#166534'),
    fotoSesudah: createSamplePhotoSvg('Hasil Bedengan Blok C7', 'Bedengan rapi siap tanam', '#dcfce7', '#14532d'),
    createdAt: '2026-07-06T16:00:00.000Z',
    updatedAt: '2026-07-06T16:00:00.000Z',
  },
  {
    id: 'entry-jul-2',
    tanggal: '2026-07-14',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:30',
    kategori: 'Pemeliharaan & Sanitasi',
    uraianPekerjaan: 'Pembersihan gulma di Blok B2 dan C6 serta penyiraman tanaman koleksi',
    lokasiPekerjaan: 'Blok B2 & Blok C6',
    luasLahan: '1.200 m²',
    keterangan: 'Pembersihan manual menggunakan cangkul dan kored',
    fotoSebelum: createSamplePhotoSvg('Pembersihan Gulma', 'Kondisi gulma awal di Blok B2', '#fefce8', '#854d0e'),
    fotoSesudah: createSamplePhotoSvg('Area Bersih', 'Gulma terangkat bersih di sekitar bedengan', '#fef9c3', '#713f12'),
    createdAt: '2026-07-14T15:30:00.000Z',
    updatedAt: '2026-07-14T15:30:00.000Z',
  },
  {
    id: 'entry-jul-3',
    tanggal: '2026-07-21',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Penanaman & Persemaian',
    uraianPekerjaan: 'Persiapan persemaian Uji BUSS bawang merah TSS, pembelian bibit selada, penanaman dan penyiraman selada',
    lokasiPekerjaan: 'Screen House & Blok C1',
    luasLahan: '600 m²',
    keterangan: 'Bibit selada berhasil ditransplanting ke bedengan',
    fotoSebelum: createSamplePhotoSvg('Persiapan Persemaian', 'Media semai bawang merah TSS', '#ecfdf5', '#047857'),
    fotoSesudah: createSamplePhotoSvg('Bibit Tertanam', 'Bibit selada terpasang di bedengan', '#d1fae5', '#065f46'),
    createdAt: '2026-07-21T16:00:00.000Z',
    updatedAt: '2026-07-21T16:00:00.000Z',
  },
  {
    id: 'entry-jul-4',
    tanggal: '2026-07-27',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:00',
    kategori: 'Panen & Pasca Panen',
    uraianPekerjaan: 'Panen koleksi pakcoy di Blok E4 Nahkoda dan pemilahan kualitas daun',
    lokasiPekerjaan: 'Blok E4 Nahkoda',
    luasLahan: '400 m²',
    keterangan: 'Hasil panen ditimbang dan dicatat untuk koleksi',
    fotoSebelum: createSamplePhotoSvg('Panen Koleksi Pakcoy', 'Kondisi tanaman siap panen di Blok E4', '#f1f5f9', '#334155'),
    fotoSesudah: createSamplePhotoSvg('Hasil Panen Pakcoy', 'Pembersihan dan sortir hasil panen', '#e2e8f0', '#1e293b'),
    createdAt: '2026-07-27T15:00:00.000Z',
    updatedAt: '2026-07-27T15:00:00.000Z',
  },
  {
    id: 'entry-jul-5',
    tanggal: '2026-07-30',
    kehadiran: 'WFO',
    waktuMulai: '08:00',
    waktuSelesai: '16:00',
    kategori: 'Dukungan Operasional & Kedinasan',
    uraianPekerjaan: 'Pemasangan/perbaikan lampu, perbaikan kabel aula, pemasangan bingkai SOP laboratorium, pemasangan bendera, pembelian tong, persiapan kunjungan Sekjen dan praktik Biosaka',
    lokasiPekerjaan: 'Gedung Kantor, Aula & Laboratorium',
    luasLahan: '-',
    keterangan: 'Seluruh instalasi penerangan aula dan bingkai SOP selesai',
    fotoSebelum: createSamplePhotoSvg('Dukungan Fasilitas', 'Perbaikan instalasi aula kantor', '#f8fafc', '#475569'),
    fotoSesudah: createSamplePhotoSvg('Hasil Perbaikan', 'Aula siap digunakan untuk agenda kedinasan', '#f1f5f9', '#334155'),
    createdAt: '2026-07-30T16:00:00.000Z',
    updatedAt: '2026-07-30T16:00:00.000Z',
  },

  // --- AGUSTUS 2026 ---
  {
    id: 'entry-aug-1',
    tanggal: '2026-08-03',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Pengolahan Lahan & Persiapan Tanam',
    uraianPekerjaan: 'Persiapan Lahan: pemasangan mulsa, pembuatan lubang tanam, pengolahan lahan Blok C4 dan C7 serta pembongkaran mulsa lama',
    lokasiPekerjaan: 'Blok C4 & C7',
    luasLahan: '1.200 m²',
    keterangan: 'Mulsa plastik perak hitam terbentang kencang',
    fotoSebelum: createSamplePhotoSvg('Pemasangan Mulsa', 'Persiapan tanam koleksi Blok C4', '#eff6ff', '#1d4ed8'),
    fotoSesudah: createSamplePhotoSvg('Bedengan Bermulsa', 'Bedengan tertutup mulsa rapi', '#dbeafe', '#1e40af'),
    createdAt: '2026-08-03T16:00:00.000Z',
    updatedAt: '2026-08-03T16:00:00.000Z',
  },
  {
    id: 'entry-aug-2',
    tanggal: '2026-08-11',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:30',
    kategori: 'Pemeliharaan & Sanitasi',
    uraianPekerjaan: 'Pemberian pupuk susulan dan penyemprotan nutrisi tanaman di Blok C1 dan C4',
    lokasiPekerjaan: 'Blok C1 & Blok C4',
    luasLahan: '1.500 m²',
    keterangan: 'Aplikasi menggunakan knapsack sprayer elektrik',
    fotoSebelum: createSamplePhotoSvg('Pemberian Pupuk Susulan', 'Penyemprotan larutan nutrisi tanaman', '#faf5ff', '#7e22ce'),
    fotoSesudah: createSamplePhotoSvg('Aplikasi Selesai', 'Seluruh bedengan terdistribusi merata', '#f3e8ff', '#6b21a8'),
    createdAt: '2026-08-11T15:30:00.000Z',
    updatedAt: '2026-08-11T15:30:00.000Z',
  },
  {
    id: 'entry-aug-3',
    tanggal: '2026-08-19',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Penanaman & Persemaian',
    uraianPekerjaan: 'Penanaman tomat monitoring di Blok C1, penanaman/penyulaman selada, penanaman brokoli, penyiraman tomat monev dan koleksi',
    lokasiPekerjaan: 'Blok C1',
    luasLahan: '800 m²',
    keterangan: 'Penyulaman bibit yang layu diganti dengan bibit sehat',
    fotoSebelum: createSamplePhotoSvg('Penanaman Tomat Monev', 'Bibit tomat di Blok C1', '#fff1f2', '#be123c'),
    fotoSesudah: createSamplePhotoSvg('Tanaman Tertata', 'Bibit berdiri kokoh dengan ajir awal', '#ffe4e6', '#9f1239'),
    createdAt: '2026-08-19T16:00:00.000Z',
    updatedAt: '2026-08-19T16:00:00.000Z',
  },
  {
    id: 'entry-aug-4',
    tanggal: '2026-08-26',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Uji BUSS',
    uraianPekerjaan: 'Uji BUSS: pembuatan lubang tanam, plang dan penanaman jagung Uji BUSS; pembuatan plang Uji BUSS bawang merah dan penanaman bawang merah',
    lokasiPekerjaan: 'Lahan Uji BUSS Manoko',
    luasLahan: '950 m²',
    keterangan: 'Plang identitas varietas dipasang sesuai petunjuk penguji',
    fotoSebelum: createSamplePhotoSvg('Penanaman Uji BUSS', 'Penanaman bawang merah & jagung Uji BUSS', '#fefce8', '#a16207'),
    fotoSesudah: createSamplePhotoSvg('Plang Uji Terpasang', 'Plang uji BUSS berdiri rapi di batas petak', '#fef9c3', '#854d0e'),
    createdAt: '2026-08-26T16:00:00.000Z',
    updatedAt: '2026-08-26T16:00:00.000Z',
  },
  {
    id: 'entry-aug-5',
    tanggal: '2026-08-28',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:30',
    kategori: 'Pemupukan & Saprodi',
    uraianPekerjaan: 'Pemupukan & Saprodi: pengangkutan/penebaran pupuk kandang ayam, pembelanjaan sarana produksi, pembelian botol spray, perbaikan cultivator',
    lokasiPekerjaan: 'Blok C5 & Bengkel Alsintan',
    luasLahan: '1.000 m²',
    keterangan: 'Cultivator siap operasional kembali',
    fotoSebelum: createSamplePhotoSvg('Penebaran Pupuk Kandang', 'Pemberian pupuk dasar pada tanah olahan', '#fef2f2', '#b91c1c'),
    fotoSesudah: createSamplePhotoSvg('Penyebaran Rata', 'Tanah dan kompos tercampur merata', '#fee2e2', '#991b1b'),
    createdAt: '2026-08-28T15:30:00.000Z',
    updatedAt: '2026-08-28T15:30:00.000Z',
  },

  // --- SEPTEMBER 2026 ---
  {
    id: 'entry-sep-1',
    tanggal: '2026-09-02',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Pengolahan Lahan & Persiapan Tanam',
    uraianPekerjaan: 'Pemasangan mulsa untuk persiapan tanam koleksi dan pengolahan lahan Blok C4 dan C5',
    lokasiPekerjaan: 'Blok C4 & Blok C5',
    luasLahan: '1.200 m²',
    keterangan: 'Pemasangan mulsa menggunakan pasak bambu semat',
    fotoSebelum: createSamplePhotoSvg('Pemasangan Mulsa', 'Pemasangan mulsa untuk persiapan tanam koleksi', '#eff6ff', '#1e40af'),
    fotoSesudah: createSamplePhotoSvg('Mulsa Rapih', 'Semua bedengan telah terpasang mulsa dengan rapi', '#dbeafe', '#1d4ed8'),
    createdAt: '2026-09-02T16:00:00.000Z',
    updatedAt: '2026-09-02T16:00:00.000Z',
  },
  {
    id: 'entry-sep-2',
    tanggal: '2026-09-09',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:30',
    kategori: 'Pengolahan Lahan & Persiapan Tanam',
    uraianPekerjaan: 'Pemasangan dan pembuatan lubang tanam dengan alat pelubang arang panas pada bedengan bermulsa',
    lokasiPekerjaan: 'Blok C4',
    luasLahan: '800 m²',
    keterangan: 'Jarak tanam disesuaikan dengan SOP komoditas (50 x 60 cm)',
    fotoSebelum: createSamplePhotoSvg('Pembuatan Lubang Tanam', 'Pemasangan dan pembuatan lubang tanam', '#f8fafc', '#334155'),
    fotoSesudah: createSamplePhotoSvg('Lubang Tanam Selesai', 'Lubang tanam teratur sesuai jarak tanam', '#f1f5f9', '#1e293b'),
    createdAt: '2026-09-09T15:30:00.000Z',
    updatedAt: '2026-09-09T15:30:00.000Z',
  },
  {
    id: 'entry-sep-3',
    tanggal: '2026-09-10',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:00',
    kategori: 'Panen & Pasca Panen',
    uraianPekerjaan: 'Panen Seladah keriting koleksi di kebun Manoko, pembersihan kotoran tanah dan penimbangan',
    lokasiPekerjaan: 'Blok B1 Manoko',
    luasLahan: '500 m²',
    keterangan: 'Kondisi tanaman segar dan bobot memenuhi standar',
    fotoSebelum: createSamplePhotoSvg('Panen Seladah Keriting', 'Panen Seladah keriting', '#f0fdf4', '#15803d'),
    fotoSesudah: createSamplePhotoSvg('Hasil Panen Selada', 'Selada bersih terkemas dalam keranjang panen', '#dcfce7', '#166534'),
    createdAt: '2026-09-10T15:00:00.000Z',
    updatedAt: '2026-09-10T15:00:00.000Z',
  },
  {
    id: 'entry-sep-4',
    tanggal: '2026-09-14',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Pengolahan Lahan & Persiapan Tanam',
    uraianPekerjaan: 'Pengolahan lahan untuk persiapan penanaman tanaman koleksi di Blok C7 belakang screen house',
    lokasiPekerjaan: 'Blok C7 (belakang screen house)',
    luasLahan: '1.000 m²',
    keterangan: 'Pencangkulan tanah dan pembuangan sisa perakaran gulma',
    fotoSebelum: createSamplePhotoSvg('Pengolahan Lahan Koleksi', 'Pengolahan lahan untuk persiapan penanaman tanaman koleksi', '#fefce8', '#a16207'),
    fotoSesudah: createSamplePhotoSvg('Lahan Siap Bedeng', 'Tanah gembur dan bersih dari batu dan gulma', '#fef9c3', '#854d0e'),
    createdAt: '2026-09-14T16:00:00.000Z',
    updatedAt: '2026-09-14T16:00:00.000Z',
  },
  {
    id: 'entry-sep-5',
    tanggal: '2026-09-21',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '16:00',
    kategori: 'Pemeliharaan & Sanitasi',
    uraianPekerjaan: 'Pemasangan/pengikatan turus tomat monev, penyetekan tomat ceri, pengikatan tomat ceri, penyiraman bawang merah, tomat monev, jagung Uji BUSS',
    lokasiPekerjaan: 'Blok C1 & C3',
    luasLahan: '1.100 m²',
    keterangan: 'Turus bambu terikat kuat menopang percabangan tomat',
    fotoSebelum: createSamplePhotoSvg('Pemeliharaan Tomat Monev', 'Pengikatan turus dan penyiraman', '#eff6ff', '#1d4ed8'),
    fotoSesudah: createSamplePhotoSvg('Pohon Tomat Terikat', 'Batang tegak tidak menyentuh mulsa', '#dbeafe', '#1e40af'),
    createdAt: '2026-09-21T16:00:00.000Z',
    updatedAt: '2026-09-21T16:00:00.000Z',
  },
  {
    id: 'entry-sep-6',
    tanggal: '2026-09-25',
    kehadiran: 'WFO',
    waktuMulai: '07:30',
    waktuSelesai: '15:30',
    kategori: 'Pemeliharaan & Sanitasi',
    uraianPekerjaan: 'Penyiraman tanaman koleksi di lahan terbuka dan pembabadan/penyiangan gulma dan ranting sekitar pagar kantor',
    lokasiPekerjaan: 'Area Pagar & Blok Koleksi',
    luasLahan: '1.400 m²',
    keterangan: 'Penyiraman intensif karena cuaca terik di siang hari',
    fotoSebelum: createSamplePhotoSvg('Penyiraman Tanaman', 'Penyiraman tanaman di Blok Koleksi', '#f0fdf4', '#15803d'),
    fotoSesudah: createSamplePhotoSvg('Lahan Basah Optimal', 'Kelembapan tanah tercukupi', '#dcfce7', '#166534'),
    createdAt: '2026-09-25T15:30:00.000Z',
    updatedAt: '2026-09-25T15:30:00.000Z',
  },
  {
    id: 'entry-sep-7',
    tanggal: '2026-09-28',
    kehadiran: 'WFO',
    waktuMulai: '08:00',
    waktuSelesai: '16:00',
    kategori: 'Dukungan Operasional & Kedinasan',
    uraianPekerjaan: 'Rapat koordinasi PPPK Paruh Waktu, rapat sosialisasi SOP pengamanan, bahaya judol dan pinjol, evaluasi e-Personal dan rekap logbook',
    lokasiPekerjaan: 'Ruang Rapat Utama Gedung Kantor',
    luasLahan: '-',
    keterangan: 'Mengikuti seluruh rangkaian pengarahan pimpinan kantor',
    fotoSebelum: createSamplePhotoSvg('Rapat Sosialisasi SOP', 'Rapat sosialisasi SOP pengamanan, bahaya judol dan pinjol', '#f8fafc', '#334155'),
    fotoSesudah: createSamplePhotoSvg('Dokumentasi Rapat', 'Notulensi dan daftar hadir ditandatangani', '#f1f5f9', '#1e293b'),
    createdAt: '2026-09-28T16:00:00.000Z',
    updatedAt: '2026-09-28T16:00:00.000Z',
  },
];

/**
 * Urutkan catatan logbook secara kronologis dari tanggal awal sampai tanggal akhir (Ascending: 1 -> 31)
 * Jika berada pada tanggal yang sama, urutkan berdasarkan waktuMulai (pagi ke sore)
 */
export function sortLogbookEntriesByDateAscending(entries: LogbookEntry[]): LogbookEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Urutkan tanggal awal sampai tanggal akhir (ascending)
    const dateDiff = a.tanggal.localeCompare(b.tanggal);
    if (dateDiff !== 0) return dateDiff;

    // 2. Jika tanggal sama, urutkan berdasarkan jam mulai (pagi ke sore)
    const timeA = a.waktuMulai && a.waktuMulai !== '-' ? a.waktuMulai : '';
    const timeB = b.waktuMulai && b.waktuMulai !== '-' ? b.waktuMulai : '';
    const timeDiff = timeA.localeCompare(timeB);
    if (timeDiff !== 0) return timeDiff;

    // 3. Fallback createdAt
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

export function loadLogbookEntries(): LogbookEntry[] {
  try {
    const raw = localStorage.getItem(LOGBOOK_STORAGE_KEY);
    if (!raw) {
      const sorted = sortLogbookEntriesByDateAscending(INITIAL_LOGBOOK_ENTRIES);
      saveLogbookEntries(sorted);
      return sorted;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : INITIAL_LOGBOOK_ENTRIES;
    return sortLogbookEntriesByDateAscending(list);
  } catch (err) {
    console.error('Error loading logbook entries:', err);
    return sortLogbookEntriesByDateAscending(INITIAL_LOGBOOK_ENTRIES);
  }
}

export function saveLogbookEntries(entries: LogbookEntry[]): void {
  try {
    const sorted = sortLogbookEntriesByDateAscending(entries);
    localStorage.setItem(LOGBOOK_STORAGE_KEY, JSON.stringify(sorted));
  } catch (err) {
    console.error('Error saving logbook entries:', err);
  }
}

export const EPERSONAL_PORTAL_URL = 'https://epersonal.pertanian.go.id/login';
const EPERSONAL_AUTO_OPEN_KEY = 'kps1_manoko_epersonal_auto_open_v1';

export function getEpersonalUrlWithNip(nip?: string): string {
  const clean = cleanNipDigits(nip);
  if (clean) {
    return `https://epersonal.pertanian.go.id/login?nip=${encodeURIComponent(clean)}&username=${encodeURIComponent(clean)}`;
  }
  return 'https://epersonal.pertanian.go.id/login';
}

// Legacy mock NIPs to actively purge from previous sessions
const LEGACY_MOCK_NIPS = new Set([
  '198503152010121002',
  '199004122015031004',
  '199405182020122008',
  '199211052023211015',
]);

const NIP_DIRECTORY_STORAGE_KEY = 'kps1_manoko_nip_directory_v2';

// Pre-seeded official roster for KPS PVT I Manoko (ONLY real personnel: Riki Subagja)
export const PRESEEDED_OFFICER_ROSTER: UserProfile[] = [
  DEFAULT_USER_PROFILE,
];

export function cleanNipDigits(nip?: string): string {
  if (!nip) return '';
  return nip.replace(/\D/g, '');
}

export function loadNipDirectory(): UserProfile[] {
  try {
    // Also check and clean old key if exists
    const oldRaw = localStorage.getItem('kps1_manoko_nip_directory_v1');
    const currentRaw = localStorage.getItem(NIP_DIRECTORY_STORAGE_KEY) || oldRaw;

    if (!currentRaw) {
      saveNipDirectory(PRESEEDED_OFFICER_ROSTER);
      return PRESEEDED_OFFICER_ROSTER;
    }

    const stored: UserProfile[] = JSON.parse(currentRaw);
    if (!Array.isArray(stored)) {
      saveNipDirectory(PRESEEDED_OFFICER_ROSTER);
      return PRESEEDED_OFFICER_ROSTER;
    }

    // Filter out legacy mock officers
    const filtered = stored.filter((item) => {
      const clean = cleanNipDigits(item.nip);
      return clean && !LEGACY_MOCK_NIPS.has(clean);
    });

    // Ensure Riki Subagja is present
    const hasRiki = filtered.some((m) => cleanNipDigits(m.nip) === cleanNipDigits(DEFAULT_USER_PROFILE.nip));
    if (!hasRiki) {
      filtered.unshift(DEFAULT_USER_PROFILE);
    }

    // Save cleaned roster back
    saveNipDirectory(filtered);
    return filtered;
  } catch (err) {
    console.error('Error loading NIP directory:', err);
    return PRESEEDED_OFFICER_ROSTER;
  }
}

export function saveNipDirectory(directory: UserProfile[]): void {
  try {
    localStorage.setItem(NIP_DIRECTORY_STORAGE_KEY, JSON.stringify(directory));
  } catch (err) {
    console.error('Error saving NIP directory:', err);
  }
}

export function findProfileByNip(nipInput: string): UserProfile | null {
  const cleanInput = cleanNipDigits(nipInput);
  if (!cleanInput) return null;

  const directory = loadNipDirectory();
  const match = directory.find((item) => cleanNipDigits(item.nip) === cleanInput);
  return match || null;
}

export function saveProfileToNipDirectory(profile: UserProfile): void {
  const cleanInput = cleanNipDigits(profile.nip);
  if (!cleanInput) return;

  const directory = loadNipDirectory();
  const index = directory.findIndex((item) => cleanNipDigits(item.nip) === cleanInput);

  let updated: UserProfile[];
  if (index >= 0) {
    updated = [...directory];
    updated[index] = { ...updated[index], ...profile };
  } else {
    updated = [profile, ...directory];
  }

  saveNipDirectory(updated);
}

export function deleteProfileFromNipDirectory(nipInput: string): UserProfile[] {
  const cleanInput = cleanNipDigits(nipInput);
  if (!cleanInput) return loadNipDirectory();

  const directory = loadNipDirectory();
  // Don't delete Riki Subagja as he is default personnel
  const updated = directory.filter((item) => cleanNipDigits(item.nip) !== cleanInput || cleanInput === cleanNipDigits(DEFAULT_USER_PROFILE.nip));
  saveNipDirectory(updated);
  return updated;
}

export function loadEpersonalAutoOpen(): boolean {
  try {
    return localStorage.getItem(EPERSONAL_AUTO_OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveEpersonalAutoOpen(enabled: boolean): void {
  try {
    localStorage.setItem(EPERSONAL_AUTO_OPEN_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving E-Personal auto-open preference:', err);
  }
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      saveUserProfile(DEFAULT_USER_PROFILE);
      return DEFAULT_USER_PROFILE;
    }
    return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading user profile:', err);
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (profile.nip && cleanNipDigits(profile.nip).length >= 8) {
      saveProfileToNipDirectory(profile);
    }
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

export function loadGoogleAccount(): GoogleAccount | null {
  try {
    const raw = localStorage.getItem(GOOGLE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading Google account:', err);
    return null;
  }
}

export function saveGoogleAccount(account: GoogleAccount): void {
  try {
    localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, JSON.stringify(account));
  } catch (err) {
    console.error('Error saving Google account:', err);
  }
}

export function clearGoogleAccount(): void {
  try {
    localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing Google account:', err);
  }
}

/**
 * Formats a raw area input into standard meter persegi string (e.g. "800 m²").
 * If already has unit or is empty/'-', normalizes appropriately.
 */
export function formatAreaUnit(raw?: string): string {
  if (!raw) return '-';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return '-';

  // Strip existing m², m2, m^2, meter persegi
  const cleaned = trimmed.replace(/\s*(m²|m2|m\^2|meter\s*persegi)\s*/gi, '').trim();
  if (!cleaned || cleaned === '-') return '-';

  return `${cleaned} m²`;
}

/**
 * Extracts only digits and decimal/thousand separators for input editing (e.g. "800 m²" -> "800").
 */
export function parseAreaDigitsOnly(raw?: string): string {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return '';
  return raw.replace(/\s*(m²|m2|m\^2|meter\s*persegi)\s*/gi, '').trim();
}


