import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LogbookEntry, 
  UserProfile, 
  ReportConfig, 
  ReportType 
} from '../types/logbook';
import { MinistryLogo } from './MinistryLogo';
import { 
  exportReportToDocx, 
  getReportPeriodTitle, 
  getReportPeriodText,
  CustomReportData 
} from '../utils/docxExport';
import { resizeImageFile } from '../utils/imageUtils';
import { downloadOrShareBlob } from '../utils/downloadUtils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  FileDown, 
  Printer, 
  Upload, 
  Edit3, 
  Plus, 
  Trash2, 
  RotateCcw, 
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bot,
  Wand2,
  Share2,
  ExternalLink,
  AlertCircle,
  X,
  Download,
  RefreshCw,
  Check,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import { 
  summarizeReport, 
  generateLocalReportSummary,
  AiSummarizeResult, 
  OFFICIAL_CATEGORIES 
} from '../utils/aiReportSummarizer';
import { 
  parseDateDetails, 
  parseDateScore, 
  parseTimeScore, 
  normalizeLogbookEntry 
} from '../utils/storage';

interface OfficialReportViewProps {
  entries: LogbookEntry[];
  profile: UserProfile;
  onUpdateEntry?: (entry: LogbookEntry) => void;
  onRecoverPhotos?: () => { count: number; dates: string[] };
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ROMAN_QUARTERS = ['I', 'II', 'III', 'IV'];

export interface ReportPhotoItem {
  id: string;
  foto: string;
  keterangan: string;
  lokasi?: string;
  tanggal?: string;
}

export interface Table1RowItem {
  label: string;
  items: string[];
  keterangan: string;
}

export interface PdfDiagnosticData {
  deviceType: 'iPhone' | 'iPad' | 'Android' | 'Desktop';
  osInfo: string;
  userAgent: string;
  screenDim: { w: number; h: number; dpr: number };
  domDim: { offsetW: number; offsetH: number; clientW: number; clientH: number; rectW: number; rectH: number };
  targetScale: number;
  renderSuccess: boolean;
  durationMs: number;
  canvasDim?: { w: number; h: number };
  blobSizeKb?: number;
  thumbnailUrl?: string;
  testBlobUrl?: string;
  errorMessage?: string;
}

export function formatNipNumberOnly(nip?: string): string {
  if (!nip) return '-';
  // Strip "NIP", "NIP.", "NIP:", and leading/trailing whitespace
  const cleaned = nip.replace(/^NIP[:.\s]*/i, '').trim();
  return cleaned || '-';
}

/**
 * Pure mathematical OKLCH to sRGB converter
 * Guarantees html2canvas never receives unsupported oklch() color functions
 */
export function oklchToRgb(str: string): string {
  const m = str.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
  if (!m) return 'rgb(28, 25, 23)';
  let L = parseFloat(m[1]);
  if (m[0].includes('%') && parseFloat(m[1]) > 1) L = L / 100;
  else if (L > 1) L = L / 100;
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r = +4.0767434772 * l - 3.3077115913 * m3 + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m3 - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m3 + 1.7076147010 * s;
  const gamma = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  const R = Math.round(gamma(r) * 255);
  const G = Math.round(gamma(g) * 255);
  const B = Math.round(gamma(bl) * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export function cleanColorString(val: any): string {
  if (!val || typeof val !== 'string') return val;
  if (
    !val.includes('oklch') &&
    !val.includes('oklab') &&
    !val.includes('color-mix') &&
    !val.includes('light-dark')
  ) {
    return val;
  }
  let res = val.replace(/oklch\([^)]+\)/gi, (match) => oklchToRgb(match));
  res = res.replace(/oklab\([^)]+\)/gi, 'rgb(28, 25, 23)');
  res = res.replace(/color-mix\([^)]+\)/gi, 'rgb(28, 25, 23)');
  res = res.replace(/light-dark\([^)]+\)/gi, 'rgb(28, 25, 23)');
  return res;
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const pd = parseDateDetails(dateStr);
  return `${pd.day} ${MONTH_NAMES[pd.month - 1] || ''} ${pd.year}`;
}

export const OfficialReportView: React.FC<OfficialReportViewProps> = ({ entries, profile, onUpdateEntry, onRecoverPhotos }) => {
  // Dynamic initialization: Default ke 'bulanan' resmi (langsung menyesuaikan dengan bulan yang terisi)
  const [reportConfig, setReportConfig] = useState<ReportConfig>(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];

    if (!entries || entries.length === 0) {
      return {
        tipe: 'bulanan',
        tahun: currentYear,
        bulan: today.getMonth() + 1,
        triwulan: Math.ceil((today.getMonth() + 1) / 3),
        tanggalCetak: todayStr,
      };
    }

    // Cari bulan dan tahun utama yang memiliki entri logbook terbanyak
    const monthCounts = new Map<string, { year: number; month: number; count: number }>();
    entries.forEach((e) => {
      if (e.tanggal) {
        const pd = parseDateDetails(e.tanggal);
        const key = `${pd.year}-${pd.month}`;
        const current = monthCounts.get(key) || { year: pd.year, month: pd.month, count: 0 };
        current.count++;
        monthCounts.set(key, current);
      }
    });

    let best = { year: currentYear, month: today.getMonth() + 1, count: 0 };
    monthCounts.forEach((val) => {
      if (val.count > best.count) {
        best = val;
      }
    });

    return {
      tipe: 'bulanan', // Kategori default resmi: Bulanan (langsung lengkap per tanggal 1 s/d 31)
      tahun: best.year,
      bulan: best.month,
      triwulan: Math.ceil(best.month / 3),
      tanggalCetak: todayStr,
    };
  });

  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPanelHidden, setIsPanelHidden] = useState(false);

  // AI Summarization State for Quarterly & Annual Official Reports
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSummarizingAi, setIsSummarizingAi] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState<AiSummarizeResult | null>(null);
  const [isUsingAiSummary, setIsUsingAiSummary] = useState(false);

  // Ready PDF info for mobile download/share
  const [readyPdfInfo, setReadyPdfInfo] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);

  // Editable custom overrides state
  const [customTable1, setCustomTable1] = useState<Table1RowItem[]>([]);
  const [customPhotos, setCustomPhotos] = useState<ReportPhotoItem[]>([]);
  const [customLatarBelakang, setCustomLatarBelakang] = useState<string>('');
  const [customTujuan, setCustomTujuan] = useState<string>('');
  const [customWaktuPelaksanaan, setCustomWaktuPelaksanaan] = useState<string>('');
  const [customPenutup, setCustomPenutup] = useState<string>('');
  const [hasCustomEdits, setHasCustomEdits] = useState(false);

  // Photo Curation & Deletion State
  const [photoToDelete, setPhotoToDelete] = useState<{ index: number; item: ReportPhotoItem } | null>(null);
  const [isPhotoCuratorOpen, setIsPhotoCuratorOpen] = useState(false);
  const [photoActionToast, setPhotoActionToast] = useState<string | null>(null);

  const displayPhotoToast = (msg: string) => {
    setPhotoActionToast(msg);
    setTimeout(() => setPhotoActionToast(null), 3500);
  };

  const reportContainerRef = useRef<HTMLDivElement | null>(null);
  const newPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingPhotoIndex, setReplacingPhotoIndex] = useState<number | null>(null);

  const triggerAddNewPhoto = () => {
    if (newPhotoInputRef.current) {
      newPhotoInputRef.current.value = '';
      newPhotoInputRef.current.click();
    }
  };

  const triggerReplacePhoto = (index: number) => {
    setReplacingPhotoIndex(index);
    if (replacePhotoInputRef.current) {
      replacePhotoInputRef.current.value = '';
      replacePhotoInputRef.current.click();
    }
  };

  // Auto-synchronize report period when new entries are added so they immediately show up!
  useEffect(() => {
    if (entries && entries.length > 0) {
      const monthCounts = new Map<string, { year: number; month: number; count: number }>();
      entries.forEach((e) => {
        if (e.tanggal) {
          const pd = parseDateDetails(e.tanggal);
          const key = `${pd.year}-${pd.month}`;
          const current = monthCounts.get(key) || { year: pd.year, month: pd.month, count: 0 };
          current.count++;
          monthCounts.set(key, current);
        }
      });

      let best = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, count: 0 };
      monthCounts.forEach((val) => {
        if (val.count > best.count) {
          best = val;
        }
      });

      setReportConfig((prev) => {
        // If config month currently has 0 entries, switch to the month with the most entries
        const hasCurrentMonthEntries = entries.some((e) => {
          const pd = parseDateDetails(e.tanggal);
          return pd.year === prev.tahun && pd.month === prev.bulan;
        });

        if (!hasCurrentMonthEntries && best.count > 0) {
          return {
            ...prev,
            tahun: best.year,
            bulan: best.month,
            triwulan: Math.ceil(best.month / 3),
          };
        }
        return prev;
      });
    }
  }, [entries]);

  // Filter entries for this report period and strictly sort chronologically from earliest to latest date (1 -> 31)
  const filteredEntries = useMemo(() => {
    return entries
      .map(normalizeLogbookEntry)
      .filter((e) => {
        if (reportConfig.tipe === 'semua') {
          return true; // Show all logbook entries
        }

        const pd = parseDateDetails(e.tanggal);
        const entryYear = pd.year;
        const entryMonth = pd.month;

        if (entryYear !== reportConfig.tahun) return false;

        if (reportConfig.tipe === 'bulanan') {
          return entryMonth === reportConfig.bulan;
        }
        if (reportConfig.tipe === 'triwulan') {
          const quarterMonths = ({
            1: [1, 2, 3],
            2: [4, 5, 6],
            3: [7, 8, 9],
            4: [10, 11, 12],
          } as Record<number, number[]>)[reportConfig.triwulan] || [];
          return quarterMonths.includes(entryMonth);
        }
        return true; // Tahunan
      })
      .sort((a, b) => {
        // 1. Urutkan tanggal dari awal sampai akhir secara numerik kronologis (1 -> 31)
        const scoreA = parseDateScore(a.tanggal);
        const scoreB = parseDateScore(b.tanggal);
        if (scoreA !== scoreB) return scoreA - scoreB;
        // 2. Jika tanggal sama, urutkan jam mulai (pagi ke sore)
        const timeScoreA = parseTimeScore(a.waktuMulai);
        const timeScoreB = parseTimeScore(b.waktuMulai);
        if (timeScoreA !== timeScoreB) return timeScoreA - timeScoreB;
        // 3. Fallback createdAt
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [entries, reportConfig]);

  const periodTitle = getReportPeriodTitle(reportConfig, filteredEntries);
  const periodText = getReportPeriodText(reportConfig, filteredEntries);

  // Compute default text values
  const defaultLatarBelakang = useMemo(() => {
    return `Dalam rangka mendukung kelancaran pelaksanaan tugas dan fungsi organisasi, diperlukan dukungan sumber daya manusia yang mampu melaksanakan kegiatan operasional dan pelayanan perkantoran secara efektif, tertib, dan berkesinambungan. Salah satu bentuk dukungan tersebut dilaksanakan melalui penempatan ${profile.statusKepegawaian || 'pegawai'} pada jabatan ${profile.jabatan || 'operasional'}.\n\n${profile.statusKepegawaian || 'Pegawai'} pada jabatan tersebut memiliki peran dalam membantu pelaksanaan kegiatan administrasi, layanan internal, pengelolaan kebutuhan umum, penataan dokumen, pengelolaan sarana dan prasarana, serta dukungan terhadap berbagai kegiatan kedinasan. Pelaksanaan tugas tersebut diperlukan untuk memastikan kegiatan operasional kantor dapat berjalan dengan baik dan memberikan pelayanan yang optimal kepada pegawai maupun unit kerja. Sejalan dengan kebutuhan organisasi, pelaksanaan tugas ${profile.statusKepegawaian || 'pegawai'} perlu diarahkan secara jelas berdasarkan peran, tanggung jawab, dan hasil yang diharapkan. Oleh karena itu, diperlukan uraian mengenai ruang lingkup pekerjaan dan hasil pelaksanaan sebagai dasar dalam pengelolaan, pemantauan, dan evaluasi kinerja ${profile.statusKepegawaian || 'pegawai'}.`;
  }, [profile]);

  const defaultTujuan = useMemo(() => {
    return `Tujuan penyusunan laporan pelaksanaan tugas dan fungsi jabatan ${profile.jabatan || 'operasional'}, adalah sebagai bentuk pertanggungjawaban kinerja pegawai di lingkungan ${profile.instansiInduk || 'Pusat Perlindungan Varietas Tanaman dan Perizinan Pertanian'}, sesuai dengan uraian tugas yang tercantum dalam Matriks Peran Hasil (MPH) yang ditetapkan.`;
  }, [profile]);

  const defaultWaktuPelaksanaan = useMemo(() => {
    return `Kegiatan ${profile.jabatan || 'operasional'} dilaksanakan di ${profile.unitKerja || 'Kebun Pemeriksaan Substantif PVT I Manoko'} pada satuan Kerja Kantor Pusat ${profile.instansiInduk || 'PVTPP'} pada ${periodText}.`;
  }, [profile, periodText]);

  const defaultPenutup = useMemo(() => {
    return `Pada ${periodText}, pelaksanaan tugas ${profile.statusKepegawaian || 'pegawai'} jabatan ${profile.jabatan || 'operasional'} telah mendukung kelancaran operasional KPS PVT I Manoko. Kegiatan utama meliputi pengolahan lahan, pemeliharaan, penyiraman, penyiangan dan pengendalian gulma, panen dan penanganan hasil panen, serta pelaksanaan uji BUSS, pembersihan area kerja, pemeliharaan sarana pendukung, dan dukungan kegiatan lainnya yang berhubungan dengan kegiatan operasional kebun. Secara umum kegiatan terlaksana secara tertib, efektif, dan sesuai dengan tugas serta mendukung pencapaian tujuan dan kelancaran tugas organisasi.\n\nDemikian laporan ini disampaikan. Atas perhatian dan kerjasamanya, diucapkan terima kasih.`;
  }, [profile, periodText]);

  // Generate default Table 1 data:
  // - For 'bulanan': Rincian harian lengkap berurutan secara kronologis (1 -> 31)
  // - For 'triwulan' & 'tahunan': Otomatis berformat rangkuman bulanan terpadu per 9 kategori kedinasan resmi Kementerian Pertanian
  const defaultTable1Data = useMemo(() => {
    if (reportConfig.tipe === 'bulanan') {
      const groups: Table1RowItem[] = [];

      filteredEntries.forEach((e) => {
        const pd = parseDateDetails(e.tanggal);
        const dateStr = `${pd.day} ${MONTH_NAMES[pd.month - 1]}`;

        let itemDesc = '';

        if (e.kehadiran === 'Sakit') {
          itemDesc = `Izin Sakit: ${e.keterangan || 'Istirahat Sakit'}${e.suratSakit ? ' (Surat Dokter Terlampir)' : ''}`;
        } else if (e.kehadiran === 'Cuti') {
          itemDesc = `Cuti: ${e.keterangan || 'Cuti Resmi'}`;
        } else {
          let desc = e.uraianPekerjaan;
          const locDetails: string[] = [];
          if (e.lokasiPekerjaan && e.lokasiPekerjaan !== '-') locDetails.push(`Lokasi: ${e.lokasiPekerjaan}`);
          if (e.luasLahan && e.luasLahan !== '-') {
            locDetails.push(`Luas: ${/m²|m2/i.test(e.luasLahan) ? e.luasLahan : `${e.luasLahan} m²`}`);
          }
          if (e.keterangan && e.keterangan !== '-') locDetails.push(`Ket: ${e.keterangan}`);
          if (locDetails.length > 0) {
            desc += ` (${locDetails.join(', ')})`;
          }
          itemDesc = desc;
        }

        groups.push({
          label: dateStr,
          items: [itemDesc],
          keterangan: e.kehadiran || 'WFO',
        });
      });

      return groups;
    }

    // For Triwulan & Tahunan: Otomatis hasilkan format rangkuman bulanan
    // (misal Triwulan IV: baris Oktober, November, Desember; Tahunan: Januari s/d Desember)
    const summary = generateLocalReportSummary(filteredEntries, reportConfig);
    const groups: Table1RowItem[] = summary.months.map((m) => {
      const items = m.categories.length > 0
        ? m.categories.map((c) => `${c.categoryTitle} : ${c.summary}`)
        : ['Tidak ada catatan kegiatan operasional pada bulan ini'];
      return {
        label: m.monthName,
        items,
        keterangan: m.categories.length > 0 ? (m.keterangan || 'WFO / Kedinasan') : '-',
      };
    });

    return groups;
  }, [filteredEntries, reportConfig]);

  // Generate default photos: REQUIREMENT -> ONLY "Foto Sebelum" enters the official report, and ONLY for WFO entries!
  const defaultPhotos = useMemo(() => {
    return filteredEntries
      .filter((e) => e.kehadiran === 'WFO' && !!e.fotoSebelum)
      .map((e) => ({
        id: e.id,
        foto: e.fotoSebelum!,
        keterangan: e.uraianPekerjaan,
        lokasi: e.lokasiPekerjaan,
        tanggal: e.tanggal,
      }));
  }, [filteredEntries]);

  // Period tracker to prevent custom photo deletions from being wiped unexpectedly
  const periodKey = `${reportConfig.tipe}-${reportConfig.tahun}-${reportConfig.bulan}-${reportConfig.triwulan}`;
  const prevPeriodKeyRef = useRef(periodKey);

  // Sync state whenever period or filtered entries change
  useEffect(() => {
    if (prevPeriodKeyRef.current !== periodKey) {
      prevPeriodKeyRef.current = periodKey;
      setCustomTable1(defaultTable1Data);
      setCustomPhotos(defaultPhotos);
      setCustomLatarBelakang(defaultLatarBelakang);
      setCustomTujuan(defaultTujuan);
      setCustomWaktuPelaksanaan(defaultWaktuPelaksanaan);
      setCustomPenutup(defaultPenutup);
      setHasCustomEdits(false);
    } else if (!hasCustomEdits) {
      setCustomTable1(defaultTable1Data);
      setCustomPhotos(defaultPhotos);
      setCustomLatarBelakang(defaultLatarBelakang);
      setCustomTujuan(defaultTujuan);
      setCustomWaktuPelaksanaan(defaultWaktuPelaksanaan);
      setCustomPenutup(defaultPenutup);
    }
  }, [periodKey, defaultTable1Data, defaultPhotos, defaultLatarBelakang, defaultTujuan, defaultWaktuPelaksanaan, defaultPenutup, hasCustomEdits]);

  // Image replacement handler for a specific row in Tabel 2
  const handleReplacePhoto = async (index: number, file: File) => {
    try {
      const resized = await resizeImageFile(file, 1080, 0.85);
      setCustomPhotos((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          foto: resized.dataUrl,
        };
        return copy;
      });
      setHasCustomEdits(true);
      displayPhotoToast('Foto berhasil diganti.');
    } catch (err: any) {
      alert('Gagal memproses gambar baru: ' + err.message);
    }
  };

  // Add a new photo row to Tabel 2
  const handleAddNewPhotoRow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageFile(file, 1080, 0.85);
      const newPhotoItem: ReportPhotoItem = {
        id: `custom-photo-${Date.now()}`,
        foto: resized.dataUrl,
        keterangan: 'Dokumentasi kegiatan operasional kebun',
        lokasi: profile.unitKerja || 'KPS PVT I Manoko',
        tanggal: reportConfig.tanggalCetak,
      };
      setCustomPhotos((prev) => [...prev, newPhotoItem]);
      setHasCustomEdits(true);
      displayPhotoToast('Foto dokumentasi baru berhasil ditambahkan.');
    } catch (err: any) {
      alert('Gagal mengunggah foto baru: ' + err.message);
    }
  };

  // Remove a photo row directly
  const handleDeletePhotoRow = (index: number) => {
    setCustomPhotos((prev) => prev.filter((_, idx) => idx !== index));
    setHasCustomEdits(true);
    displayPhotoToast('Foto berhasil dihapus dari tabel laporan.');
  };

  // Confirm delete from report only
  const handleConfirmDeletePhotoFromReport = () => {
    if (!photoToDelete) return;
    const targetIdx = photoToDelete.index;
    setCustomPhotos((prev) => prev.filter((_, idx) => idx !== targetIdx));
    setHasCustomEdits(true);
    displayPhotoToast('Foto berhasil dihapus dari laporan resmi.');
    setPhotoToDelete(null);
  };

  // Confirm delete from report AND permanently from logbook
  const handleConfirmDeletePhotoPermanent = () => {
    if (!photoToDelete) return;
    const targetIdx = photoToDelete.index;
    const photoItem = photoToDelete.item;

    // 1. Remove from report
    setCustomPhotos((prev) => prev.filter((_, idx) => idx !== targetIdx));
    setHasCustomEdits(true);

    // 2. Remove permanently from entry in logbook database if onUpdateEntry exists
    if (photoItem.id && onUpdateEntry) {
      const matched = entries.find((e) => e.id === photoItem.id);
      if (matched) {
        const updatedEntry: LogbookEntry = {
          ...matched,
          fotoSebelum: undefined,
          updatedAt: new Date().toISOString(),
        };
        onUpdateEntry(updatedEntry);
      }
    }

    displayPhotoToast('Foto dihapus dari laporan & dihapus permanen dari logbook.');
    setPhotoToDelete(null);
  };

  // Restore all original photos from logbook for this period
  const handleRestoreAllOriginalPhotos = () => {
    setCustomPhotos(defaultPhotos);
    setHasCustomEdits(true);
    displayPhotoToast(`Semua foto dokumentasi asli (${defaultPhotos.length} foto) dipulihkan ke laporan.`);
  };

  // Toggle photo inclusion in report
  const handleTogglePhotoInReport = (item: ReportPhotoItem) => {
    const isCurrentlyIncluded = customPhotos.some((p) => p.id === item.id || p.foto === item.foto);
    if (isCurrentlyIncluded) {
      setCustomPhotos((prev) => prev.filter((p) => p.id !== item.id && p.foto !== item.foto));
    } else {
      setCustomPhotos((prev) => [...prev, item]);
    }
    setHasCustomEdits(true);
  };

  // Update photo caption
  const handleUpdatePhotoCaption = (index: number, text: string) => {
    setCustomPhotos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], keterangan: text };
      return copy;
    });
    setHasCustomEdits(true);
  };

  // Reset custom edits
  const handleResetEdits = () => {
    setCustomTable1(defaultTable1Data);
    setCustomPhotos(defaultPhotos);
    setCustomLatarBelakang(defaultLatarBelakang);
    setCustomTujuan(defaultTujuan);
    setCustomWaktuPelaksanaan(defaultWaktuPelaksanaan);
    setCustomPenutup(defaultPenutup);
    setHasCustomEdits(false);
  };

  // Dynamic optimized pagination for Table 1:
  // Maximizes space on each A4 page so table rows fill the page neatly without massive empty gaps
  const table1Pages = useMemo(() => {
    if (customTable1.length === 0) return [[]];
    const maxPage0 = 15;
    const maxContinuation = 19;

    // If 15 rows or fewer, fits cleanly on a single page!
    if (customTable1.length <= maxPage0) return [customTable1];

    // If between 16 and 34 rows, balance across 2 pages (so neither page looks empty or sparse)
    if (customTable1.length <= maxPage0 + maxContinuation) {
      const page0Count = Math.min(
        maxPage0,
        Math.max(Math.ceil(customTable1.length * 0.52), customTable1.length - maxContinuation)
      );
      return [
        customTable1.slice(0, page0Count),
        customTable1.slice(page0Count)
      ];
    }

    // For larger sets (>34 rows, e.g. Triwulan or Tahunan): Page 0 holds 15 rows, continuation pages hold up to 19 rows each
    const pages: Table1RowItem[][] = [];
    pages.push(customTable1.slice(0, maxPage0));
    for (let i = maxPage0; i < customTable1.length; i += maxContinuation) {
      pages.push(customTable1.slice(i, i + maxContinuation));
    }
    return pages;
  }, [customTable1]);

  // Paginate Table 2 photos: exactly 4 photos per A4 sheet to maximize space and avoid excessive pages
  const photoPages = useMemo(() => {
    if (customPhotos.length === 0) return [];
    const pages: ReportPhotoItem[][] = [];
    const chunkSize = 4;
    for (let i = 0; i < customPhotos.length; i += chunkSize) {
      pages.push(customPhotos.slice(i, i + chunkSize));
    }
    return pages;
  }, [customPhotos]);

  // Standardized DOM cleaner for html2canvas-pro to guarantee clean A4 output without cutoffs or style artifacts
  const sanitizeReportClonedDoc = (clonedDoc: Document) => {
    // Strip card borders, shadows, and rounded corners in cloned document for pure paper output
    const clonedPages = clonedDoc.querySelectorAll<HTMLElement>('.report-page');
    clonedPages.forEach((p) => {
      p.style.boxShadow = 'none';
      p.style.borderRadius = '0px';
      p.style.border = 'none';
      p.style.width = '794px';
      p.style.minHeight = '1123px';
      p.style.backgroundColor = '#ffffff';
      p.style.margin = '0 auto';
      p.style.fontFamily = 'Arial, sans-serif';
      p.style.boxSizing = 'border-box';
      if (p.classList.contains('report-cover-page')) {
        p.style.display = 'flex';
        p.style.flexDirection = 'column';
        p.style.justifyContent = 'space-between';
        p.style.alignItems = 'center';
        p.style.textAlign = 'center';
        p.style.height = '1123px';
        p.style.maxHeight = '1123px';
        p.style.overflow = 'hidden';
        p.style.padding = '48px 40px';
      }
    });

    // Enforce Arial MT for all titles/headings and Arial for content
    const clonedHeadings = clonedDoc.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, th, .report-title');
    clonedHeadings.forEach((h) => {
      h.style.fontFamily = "'Arial MT', Arial, 'Helvetica Neue', Helvetica, sans-serif";
      h.style.color = '#000000';
    });

    const coverText = clonedDoc.querySelectorAll<HTMLElement>('.report-cover-page h1, .report-cover-page h2, .report-cover-page h3, .report-cover-page p');
    coverText.forEach((t) => {
      t.style.textAlign = 'center';
    });

    const clonedBodies = clonedDoc.querySelectorAll<HTMLElement>('p, td, input, textarea, span, div');
    clonedBodies.forEach((b) => {
      if (!b.matches('h1, h2, h3, h4, h5, th, .report-title')) {
        b.style.fontFamily = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
        b.style.fontSize = '12pt';
        b.style.lineHeight = '1.5';
      }
    });

    // Enforce crisp 1px solid black borders for all tables and cells in clonedDoc
    const clonedTables = clonedDoc.querySelectorAll<HTMLTableElement>('table');
    clonedTables.forEach((t) => {
      t.style.borderCollapse = 'collapse';
      t.style.width = '100%';
      t.style.tableLayout = 'fixed';
      t.style.border = '1px solid #000000';
    });

    const tableCells = clonedDoc.querySelectorAll<HTMLElement>('table td, table th');
    tableCells.forEach((c) => {
      c.style.fontSize = '11pt';
      c.style.border = '1px solid #000000';
      c.style.borderColor = '#000000';
      c.style.boxSizing = 'border-box';
    });

    // Mathematically fit all documentation photos inside cell containers so they NEVER overflow or spill out
    const docPhotoImgs = clonedDoc.querySelectorAll<HTMLImageElement>('table img');
    docPhotoImgs.forEach((img) => {
      const parentContainer = img.closest<HTMLElement>('div');
      if (parentContainer) {
        parentContainer.style.width = '260px';
        parentContainer.style.maxWidth = '260px';
        parentContainer.style.height = '165px';
        parentContainer.style.maxHeight = '165px';
        parentContainer.style.overflow = 'hidden';
        parentContainer.style.display = 'flex';
        parentContainer.style.alignItems = 'center';
        parentContainer.style.justifyContent = 'center';
        parentContainer.style.margin = '0 auto';
        parentContainer.style.boxSizing = 'border-box';
        parentContainer.style.border = '1px solid #555555';
        parentContainer.style.backgroundColor = '#f8fafc';
      }

      const maxW = 250;
      const maxH = 160;
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        img.style.width = `${Math.round(img.naturalWidth * ratio)}px`;
        img.style.height = `${Math.round(img.naturalHeight * ratio)}px`;
      } else {
        img.style.maxWidth = '250px';
        img.style.maxHeight = '160px';
        img.style.width = 'auto';
        img.style.height = 'auto';
      }
      img.style.display = 'block';
      img.style.margin = '0 auto';
      img.style.boxSizing = 'border-box';
    });

    // Hide all interactive UI / controls in cloned document
    const noPrintElements = clonedDoc.querySelectorAll<HTMLElement>('.no-print');
    noPrintElements.forEach((el) => {
      el.style.display = 'none';
    });

    const win = clonedDoc.defaultView;
    if (win && typeof win.getComputedStyle === 'function') {
      const origGetComputedStyle = win.getComputedStyle.bind(win);
      win.getComputedStyle = function (el: Element, pseudo?: string | null) {
        const style = origGetComputedStyle(el, pseudo);
        return new Proxy(style, {
          get(target: any, prop: string | symbol) {
            if (prop === 'getPropertyValue') {
              return function (propName: string) {
                const val = target.getPropertyValue(propName);
                return cleanColorString(val);
              };
            }
            const val = target[prop];
            if (typeof val === 'function') {
              return function (...args: any[]) {
                const res = val.apply(target, args);
                if (typeof res === 'string') {
                  return cleanColorString(res);
                }
                return res;
              };
            }
            if (typeof val === 'string') {
              return cleanColorString(val);
            }
            return val;
          },
        });
      };
    }

    // Clean all text inside <style> tags in cloned document
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((s) => {
      if (s.textContent && (s.textContent.includes('oklch') || s.textContent.includes('oklab') || s.textContent.includes('color-mix') || s.textContent.includes('light-dark'))) {
        s.textContent = cleanColorString(s.textContent);
      }
    });

    // Sanitize inline styles on all nodes
    const allNodes = clonedDoc.querySelectorAll('*');
    allNodes.forEach((node) => {
      const el = node as HTMLElement;
      if (!el.style) return;
      try {
        ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'].forEach((attr) => {
          const current = (el.style as any)[attr];
          if (current && typeof current === 'string' && (current.includes('oklch') || current.includes('oklab') || current.includes('color-mix') || current.includes('light-dark'))) {
            (el.style as any)[attr] = cleanColorString(current);
          }
        });
      } catch {}
    });
  };

  // HIGH-PRECISION ISOLATED A4 PAGE RENDERER (1:1 with Microsoft Word layout, zero spillover, zero cutting)
  const renderIsolatedPageCanvas = async (
    pageElem: HTMLElement,
    pageIndex: number,
    scale: number
  ): Promise<HTMLCanvasElement> => {
    return await html2canvas(pageElem, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      windowWidth: 794,
      windowHeight: 1123,
      width: 794,
      height: 1123,
      onclone: (clonedDoc) => {
        // Find target page among cloned pages
        const allClonedPages = clonedDoc.querySelectorAll<HTMLElement>('.report-page');
        const targetPage = allClonedPages[pageIndex];

        if (targetPage) {
          // Empty cloned body completely and mount ONLY targetPage at absolute (0, 0)
          clonedDoc.body.innerHTML = '';
          clonedDoc.body.appendChild(targetPage);

          clonedDoc.documentElement.style.margin = '0';
          clonedDoc.documentElement.style.padding = '0';
          clonedDoc.documentElement.style.width = '794px';
          clonedDoc.documentElement.style.minWidth = '794px';
          clonedDoc.documentElement.style.maxWidth = '794px';
          clonedDoc.documentElement.style.height = '1123px';
          clonedDoc.documentElement.style.overflow = 'hidden';
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';

          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.width = '794px';
          clonedDoc.body.style.minWidth = '794px';
          clonedDoc.body.style.maxWidth = '794px';
          clonedDoc.body.style.height = '1123px';
          clonedDoc.body.style.overflow = 'hidden';
          clonedDoc.body.style.backgroundColor = '#ffffff';

          // Force strict A4 794px x 1123px dimensions and pristine paper styling
          targetPage.style.display = targetPage.classList.contains('report-cover-page') ? 'flex' : 'block';
          targetPage.style.position = 'absolute';
          targetPage.style.top = '0';
          targetPage.style.left = '0';
          targetPage.style.width = '794px';
          targetPage.style.minWidth = '794px';
          targetPage.style.maxWidth = '794px';
          targetPage.style.height = '1123px';
          targetPage.style.minHeight = '1123px';
          targetPage.style.maxHeight = '1123px';
          targetPage.style.boxSizing = 'border-box';
          targetPage.style.margin = '0';
          targetPage.style.boxShadow = 'none';
          targetPage.style.border = 'none';
          targetPage.style.borderRadius = '0';
          targetPage.style.overflow = 'hidden';
          targetPage.style.backgroundColor = '#ffffff';

          if (targetPage.classList.contains('report-cover-page')) {
            targetPage.style.flexDirection = 'column';
            targetPage.style.justifyContent = 'space-between';
            targetPage.style.alignItems = 'center';
            targetPage.style.textAlign = 'center';
            targetPage.style.padding = '44px 38px';
          } else {
            targetPage.style.padding = '48px 44px';
          }

          // Replace textareas with clean static text for a perfect printed document look
          targetPage.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((ta) => {
            const div = clonedDoc.createElement('div');
            div.textContent = ta.value;
            div.style.cssText = ta.style.cssText;
            div.style.border = 'none';
            div.style.background = 'transparent';
            div.style.padding = '0';
            div.style.whiteSpace = 'pre-wrap';
            div.style.fontFamily = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
            ta.parentNode?.replaceChild(div, ta);
          });

          // Replace text inputs with clean static spans
          targetPage.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach((inp) => {
            const span = clonedDoc.createElement('span');
            span.textContent = inp.value;
            span.style.cssText = inp.style.cssText;
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.padding = '0';
            span.style.fontFamily = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
            inp.parentNode?.replaceChild(span, inp);
          });
        }

        // Reset document scroll
        clonedDoc.defaultView?.scrollTo(0, 0);

        // Sanitize fonts and OKLCH colors
        sanitizeReportClonedDoc(clonedDoc);
      },
    });
  };

  // DIRECT HIGH-FIDELITY PDF GENERATOR (Authentic A4 proportions, 1:1 matching Word layout)
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfProgress('Menyiapkan dokumen A4...');

      // Find all discrete report pages
      const pages = document.querySelectorAll<HTMLElement>('.report-page');
      if (pages.length === 0) {
        throw new Error('Halaman laporan tidak ditemukan');
      }

      // Initialize jsPDF in A4 portrait (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const totalPages = pages.length;
      let isFirstPage = true;

      // Adaptive scaling based on device constraints (iPhone/Android optimized)
      const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      const targetScale = isMobile ? 1.5 : 2;

      for (let i = 0; i < totalPages; i++) {
        setPdfProgress(`Memproses halaman ${i + 1} dari ${totalPages}...`);
        const pageElem = pages[i];
        console.log(`[PDF Generator] Rendering page ${i + 1}/${totalPages} with complete page isolation`);

        let canvas: HTMLCanvasElement;
        try {
          canvas = await renderIsolatedPageCanvas(pageElem, i, targetScale);
        } catch (renderErr) {
          console.warn(`Render page ${i + 1} at scale ${targetScale} failed, retrying with fallback scale 1.2:`, renderErr);
          try {
            canvas = await renderIsolatedPageCanvas(pageElem, i, 1.2);
          } catch (retryErr) {
            console.warn(`Fallback scale 1.2 failed, retrying with baseline scale 1.0:`, retryErr);
            canvas = await renderIsolatedPageCanvas(pageElem, i, 1.0);
          }
        }

        // Each isolated page is guaranteed to be exactly 1 pristine A4 sheet!
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (!isFirstPage) {
          pdf.addPage('a4', 'p');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        isFirstPage = false;

        // Immediate memory release for iOS Safari & Android WebView
        canvas.width = 0;
        canvas.height = 0;
      }

      setPdfProgress('Menyimpan file PDF...');
      const cleanName = (profile.nama || 'Pegawai').replace(/\s+/g, '_');
      const cleanTitle = periodTitle.replace(/\s+/g, '_');
      const filename = `Laporan_Kinerja_${cleanName}_${cleanTitle}.pdf`;

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Save into state so user can also open/share directly if mobile browser limits background triggers
      setReadyPdfInfo({
        blob: pdfBlob,
        url: pdfUrl,
        filename,
      });

      try {
        await downloadOrShareBlob(pdfBlob, filename, `Laporan Kinerja - ${periodTitle}`);
      } catch (dlErr) {
        console.warn('Auto download error, but PDF is ready in modal:', dlErr);
      }
      setPdfProgress('');
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Gagal membuat file PDF: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  // Handler untuk membuka modal AI Summarizer & inisialisasi rangkuman
  const handleOpenAiSummarizer = () => {
    setIsAiModalOpen(true);
    if (!aiSummaryResult) {
      handleRunAiSummarize();
    }
  };

  const handleRunAiSummarize = async () => {
    setIsSummarizingAi(true);
    try {
      const res = await summarizeReport(filteredEntries, reportConfig);
      setAiSummaryResult(res);
    } catch (err: any) {
      console.error('AI summarize error:', err);
      alert('Gagal memproses rangkuman AI: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSummarizingAi(false);
    }
  };

  const handleApplyAiSummary = (customRes?: AiSummarizeResult) => {
    const res = customRes || aiSummaryResult;
    if (!res || res.months.length === 0) {
      alert('Tidak ada data rangkuman yang dapat diterapkan. Pastikan ada entri logbook pada periode ini.');
      return;
    }

    const rows: Table1RowItem[] = res.months.map((m) => ({
      label: m.monthName,
      items: m.categories.map((c) => `${c.categoryTitle} : ${c.summary}`),
      keterangan: m.keterangan || 'WFO / Kedinasan',
    }));

    setCustomTable1(rows);
    setHasCustomEdits(true);
    setIsUsingAiSummary(true);
    setIsAiModalOpen(false);
    displayPhotoToast('Rangkuman Kategori Kedinasan (AI) berhasil diterapkan ke Tabel 1 Laporan!');
  };

  const handleRestoreDailyRows = () => {
    setCustomTable1(defaultTable1Data);
    setIsUsingAiSummary(false);
    setHasCustomEdits(false);
    displayPhotoToast(
      reportConfig.tipe === 'bulanan'
        ? 'Tabel 1 dikembalikan ke susunan rincian harian logbook.'
        : 'Tabel 1 dikembalikan ke susunan rangkuman bulanan standar.'
    );
  };

  // DIRECT WORD DOCX EXPORT
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      const customData: CustomReportData = {
        table1Groups: customTable1,
        documentationPhotos: customPhotos,
        latarBelakang: customLatarBelakang,
        tujuan: customTujuan,
        waktuPelaksanaan: customWaktuPelaksanaan,
        penutup: customPenutup,
      };

      await exportReportToDocx(reportConfig, profile, entries, customData);
      displayPhotoToast('File Word (.docx) berhasil diunduh ke folder Download HP Anda! Silakan buka dengan WPS Office atau MS Word.');
    } catch (err: any) {
      alert('Gagal mengekspor dokumen Word: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Configuration & Control Panel */}
      <div className="bg-stone-950/85 backdrop-blur-md p-5 rounded-2xl border border-white/15 shadow-2xl space-y-4 no-print text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Laporan Resmi Kinerja Operasional
            </h1>
            <p className="text-xs text-stone-300 mt-0.5">
              Standar format PVTPP Kementerian Pertanian. Dilengkapi fitur unduh PDF rapi, Word (.docx), dan edit laporan langsung.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                isEditMode
                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md ring-2 ring-amber-300/50'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title="Edit teks laporan dan gambar tabel secara langsung"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Selesai Edit' : 'Edit Laporan'}</span>
            </button>

            {onRecoverPhotos && (
              <button
                onClick={() => {
                  const res = onRecoverPhotos();
                  alert(
                    res.count > 0
                      ? `Berhasil memulihkan ${res.count} foto dokumentasi sesuai tanggal (${res.dates.length} tanggal). Foto langsung muncul di Tabel Dokumentasi!`
                      : 'Seluruh foto dokumentasi sudah lengkap sesuai tanggal.'
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md transition-colors border border-amber-400/40 cursor-pointer"
                title="Pulihkan seluruh foto dokumentasi kegiatan yang hilang secara ketat sesuai tanggal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-200" />
                <span>Pulihkan Foto</span>
              </button>
            )}

            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx || isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? 'Word...' : 'Word (.docx)'}</span>
            </button>

            <button
              onClick={handleOpenAiSummarizer}
              disabled={isGeneratingPdf || isExportingDocx || isSummarizingAi}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md transition-all border border-purple-400/40 cursor-pointer active:scale-95"
              title="Rangkuman AI: Rangkum kegiatan Triwulan & Tahunan secara otomatis ke format kategori kedinasan resmi Kementerian Pertanian"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSummarizingAi ? 'animate-spin text-amber-200' : 'text-amber-300'}`} />
              <span>{isSummarizingAi ? 'Merangkum...' : 'Rangkuman AI'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isExportingDocx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 border border-emerald-500/30 cursor-pointer"
              title="Unduh file dokumen PDF secara langsung"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? pdfProgress || 'PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/20 cursor-pointer"
              title="Buka dialog cetak browser"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-300" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Category & Period Selectors with Hide Toggle to save vertical space */}
        {!isPanelHidden ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 animate-fade-in">
            {/* Kategori Laporan (Hanya Bulanan, Triwulan, Tahunan) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Kategori Laporan (Pilih Periode)
              </label>
              <div className="grid grid-cols-3 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-700">
                {(['bulanan', 'triwulan', 'tahunan'] as const).map((tipe) => (
                  <button
                    key={tipe}
                    type="button"
                    onClick={() => setReportConfig((prev) => ({ ...prev, tipe }))}
                    className={`py-2 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer text-center ${
                      reportConfig.tipe === tipe
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {tipe}
                  </button>
                ))}
              </div>
            </div>

            {/* Tahun */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Tahun Anggaran
              </label>
              <select
                value={reportConfig.tahun}
                onChange={(e) =>
                  setReportConfig((prev) => ({ ...prev, tahun: parseInt(e.target.value) }))
                }
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub Period Selection */}
            {reportConfig.tipe === 'bulanan' && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Pilih Bulan Laporan
                </label>
                <select
                  value={reportConfig.bulan}
                  onChange={(e) =>
                    setReportConfig((prev) => ({ ...prev, bulan: parseInt(e.target.value) }))
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      Bulan {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportConfig.tipe === 'triwulan' && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Pilih Triwulan
                </label>
                <select
                  value={reportConfig.triwulan}
                  onChange={(e) =>
                    setReportConfig((prev) => ({ ...prev, triwulan: parseInt(e.target.value) }))
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
                >
                  <option value={1}>Triwulan I (Jan - Mar)</option>
                  <option value={2}>Triwulan II (Apr - Jun)</option>
                  <option value={3}>Triwulan III (Jul - Sep)</option>
                  <option value={4}>Triwulan IV (Okt - Des)</option>
                </select>
              </div>
            )}

            {/* Tanggal Penetapan Laporan dengan Ikon Panah Hide */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-300">
                  Tanggal Penetapan Laporan
                </label>
                <button
                  type="button"
                  onClick={() => setIsPanelHidden(true)}
                  className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-stone-800 rounded transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                  title="Sembunyikan panel"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Sembunyikan</span>
                </button>
              </div>
              <input
                type="date"
                value={reportConfig.tanggalCetak}
                onChange={(e) =>
                  setReportConfig((prev) => ({ ...prev, tanggalCetak: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
              />
            </div>
          </div>
        ) : (
          /* Collapsed State: Compact single bar to save vertical space */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 bg-stone-900/80 p-2.5 rounded-xl border border-stone-700/70 animate-fade-in shadow-inner">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Kategori Laporan:
              </span>
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/50 rounded-lg uppercase">
                {reportConfig.tipe} &bull; {reportConfig.tipe === 'bulanan' ? MONTH_NAMES[reportConfig.bulan - 1] : reportConfig.tipe === 'triwulan' ? `Triwulan ${reportConfig.triwulan}` : 'Tahunan'} {reportConfig.tahun}
              </span>
              <span className="text-[11px] text-stone-400 italic hidden md:inline">
                (Panel disembunyikan agar hemat ruang)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="text-xs font-semibold text-stone-300 shrink-0">
                Tanggal Penetapan:
              </label>
              <input
                type="date"
                value={reportConfig.tanggalCetak}
                onChange={(e) =>
                  setReportConfig((prev) => ({ ...prev, tanggalCetak: e.target.value }))
                }
                className="px-2.5 py-1 text-xs rounded-lg border border-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
              />
              <button
                type="button"
                onClick={() => setIsPanelHidden(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950 hover:bg-emerald-900 rounded-lg border border-emerald-600/60 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                title="Tampilkan kembali pilihan kategori laporan"
              >
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buka Panel</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Edit Mode Banner */}
        {isEditMode && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>
                <strong>Mode Edit Langsung Aktif:</strong> Anda dapat mengedit teks laporan, mengubah foto dokumentasi, menambah atau menghapus baris langsung di bawah.
              </span>
            </div>
            {hasCustomEdits && (
              <button
                onClick={handleResetEdits}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-stone-700 border border-amber-300 hover:bg-amber-100 rounded-md transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Reset ke Data Awal</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Compact Real-Time Sync Indicator */}
      <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Status Laporan:</strong> Menampilkan <strong>{filteredEntries.length} kegiatan lengkap</strong> &amp; <strong>{defaultPhotos.length} foto</strong> untuk periode <strong>{reportConfig.tipe === 'bulanan' ? `Bulan ${MONTH_NAMES[reportConfig.bulan - 1]}` : reportConfig.tipe === 'triwulan' ? `Triwulan ${reportConfig.triwulan}` : 'Tahunan'} {reportConfig.tahun}</strong> (tersusun berurutan tanggal 1 s/d 31).
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTIC OFFICIAL A4 REPORT SHEETS CONTAINER (FIXED 794px A4 PROPORTIONS) */}
      {/* ========================================================================= */}
      <div className="w-full overflow-x-auto pb-8 scrollbar-thin">
        <div ref={reportContainerRef} className="w-[794px] min-w-[794px] mx-auto space-y-10 print:space-y-0 text-stone-900 font-sans">
          
          {/* ==================== PAGE 1: COVER (SAMPUL LAPORAN) ==================== */}
          <div className="relative">
            <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
              — Halaman 1: Sampul Laporan Resmi —
            </div>
            <div 
              className="report-page report-cover-page bg-white w-[794px] min-w-[794px] max-w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] mx-auto p-10 sm:p-14 shadow-2xl border border-stone-300/80 flex flex-col justify-between text-center print:shadow-none print:border-none print:m-0"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                padding: '48px 40px',
                backgroundColor: '#ffffff'
              }}
            >
            <div style={{ textAlign: 'center', width: '100%' }} className="space-y-2 mt-2">
              <h1 style={{ textAlign: 'center' }} className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-snug">
                LAPORAN KINERJA
              </h1>
              <h2 style={{ textAlign: 'center' }} className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-snug">
                PELAKSANAAN TUGAS OPERASIONAL KANTOR
              </h2>
              <h3 style={{ textAlign: 'center' }} className="text-lg sm:text-xl font-bold uppercase tracking-wide leading-snug text-stone-900">
                {periodTitle}
              </h3>
            </div>

            {/* Official Wikipedia Kementan Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }} className="my-6">
              <MinistryLogo size={130} />
            </div>

            {/* Author Block */}
            <div style={{ textAlign: 'center', width: '100%' }} className="space-y-1">
              <p style={{ textAlign: 'center' }} className="text-sm text-stone-700">Disusun oleh :</p>
              <p style={{ textAlign: 'center' }} className="text-lg font-bold tracking-wider uppercase text-stone-900 mt-1">
                {profile.nama || 'PEGAWAI KPS PVT I MANOKO'}
              </p>
              <p style={{ textAlign: 'center' }} className="text-base text-stone-800 font-mono tracking-wide">
                {formatNipNumberOnly(profile.nip)}
              </p>
              <p style={{ textAlign: 'center' }} className="text-sm text-stone-700 mt-2 font-medium">
                {profile.jabatan || 'Pengelola Pemeliharaan Kebun'}
              </p>
            </div>

            {/* Cover Footer */}
            <div style={{ textAlign: 'center', width: '100%' }} className="mt-8 mb-2 space-y-1 text-stone-900">
              <p style={{ textAlign: 'center' }} className="text-sm sm:text-base font-bold tracking-wide uppercase">
                {profile.instansiInduk || 'PUSAT PERLINDUNGAN VARIETAS TANAMAN DAN PERIZINAN PERTANIAN'}
              </p>
              <p style={{ textAlign: 'center' }} className="text-sm sm:text-base font-bold tracking-wide uppercase">
                {profile.kementerian || 'KEMENTERIAN PERTANIAN'}
              </p>
              <p style={{ textAlign: 'center' }} className="text-sm sm:text-base font-bold tracking-wider mt-1">
                {reportConfig.tahun}
              </p>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 2: BAB I PENDAHULUAN ==================== */}
        <div className="relative">
          <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
            — Halaman 2: BAB I Pendahuluan —
          </div>
          <div className="report-page bg-white w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 page-break">
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold uppercase tracking-wider">BAB I</h2>
              <h3 className="text-lg font-bold uppercase tracking-wider">PENDAHULUAN</h3>
            </div>

            <div className="space-y-6 text-[12pt] text-stone-900 leading-relaxed font-sans">
              <div>
                <h4 className="font-bold text-[12pt] text-stone-900 mb-3">1.1 LATAR BELAKANG</h4>
                {isEditMode ? (
                  <textarea
                    rows={8}
                    value={customLatarBelakang}
                    onChange={(e) => {
                      setCustomLatarBelakang(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-[12pt] border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <div className="space-y-3">
                    {customLatarBelakang.split('\n\n').map((para, idx) => (
                      <p key={idx} className="indent-8 leading-relaxed text-[12pt]">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-[12pt] text-stone-900 mb-3">1.2 TUJUAN</h4>
                {isEditMode ? (
                  <textarea
                    rows={3}
                    value={customTujuan}
                    onChange={(e) => {
                      setCustomTujuan(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-[12pt] border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <p className="indent-8 leading-relaxed text-[12pt]">
                    {customTujuan}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-[12pt] text-stone-900 mb-3">1.3 WAKTU PELAKSANAAN</h4>
                {isEditMode ? (
                  <input
                    type="text"
                    value={customWaktuPelaksanaan}
                    onChange={(e) => {
                      setCustomWaktuPelaksanaan(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-[12pt] border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <p className="indent-8 leading-relaxed text-[12pt]">
                    {customWaktuPelaksanaan}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 3+: BAB II AKUNTABILITAS KINERJA (TABEL 1) ==================== */}
        {table1Pages.map((pageRows, pageIdx) => {
          const globalStartIndex = table1Pages.slice(0, pageIdx).reduce((acc, curr) => acc + curr.length, 0);

          return (
            <div key={`table1-page-${pageIdx}`} className="relative">
              <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
                — Halaman {3 + pageIdx}: BAB II Akuntabilitas Kinerja (Tabel 1{pageIdx > 0 ? ' Lanjutan' : ''}) —
              </div>
              <div className="report-page bg-white w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 page-break">
                {pageIdx === 0 && (
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wider">BAB II</h2>
                    <h3 className="text-lg font-bold uppercase tracking-wider">AKUNTABILITAS KINERJA</h3>
                  </div>
                )}

                <div className="space-y-4 text-[12pt] text-stone-900 leading-relaxed font-sans">
                  {pageIdx === 0 ? (
                    <div>
                      <h4 className="font-bold text-[12pt] text-stone-900">2.1 HASIL PELAKSANAAN</h4>
                      <p className="mt-1 font-medium text-[12pt] text-stone-900">Kegiatan {profile.jabatan}</p>
                      <p className="mt-2 text-[11pt] italic text-stone-600">
                        Tabel 1. Rincian kegiatan {profile.jabatan.toLowerCase()} {periodText}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <p className="text-[11pt] italic text-stone-600">
                        Tabel 1. Rincian kegiatan {profile.jabatan.toLowerCase()} {periodText} (Lanjutan)
                      </p>
                    </div>
                  )}

                  {/* Official Table 1 with strict solid black borders and explicit cell constraints */}
                  <div style={{ border: '1px solid #000000', width: '100%', boxSizing: 'border-box' }}>
                    <table className="w-full text-left text-[11pt] border-collapse font-sans" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #000000' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }} className="font-bold text-[10.5pt]">
                          <th style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', width: '8%', boxSizing: 'border-box' }}>No.</th>
                          <th style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', width: '22%', boxSizing: 'border-box' }}>
                            {reportConfig.tipe === 'bulanan' ? 'Tanggal' : 'Bulan'}
                          </th>
                          <th style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', width: '54%', boxSizing: 'border-box' }}>
                            Rincian Pekerjaan
                          </th>
                          <th style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', width: '16%', boxSizing: 'border-box' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, rowIdx) => {
                          const actualIdx = globalStartIndex + rowIdx;
                          return (
                            <tr key={actualIdx} style={{ borderBottom: '1px solid #000000' }} className="align-top text-[10.5pt]">
                              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', wordBreak: 'break-word', boxSizing: 'border-box' }} className="font-medium">
                                {actualIdx + 1}
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', wordBreak: 'break-word', boxSizing: 'border-box' }} className="font-semibold">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={row.label}
                                    onChange={(e) => {
                                      const copy = [...customTable1];
                                      copy[actualIdx].label = e.target.value;
                                      setCustomTable1(copy);
                                      setHasCustomEdits(true);
                                    }}
                                    className="w-full p-1 border border-amber-300 rounded text-center text-xs font-sans"
                                  />
                                ) : (
                                  row.label
                                )}
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '5px 8px', wordBreak: 'break-word', boxSizing: 'border-box' }} className="space-y-1">
                                {isEditMode ? (
                                  <textarea
                                    rows={2}
                                    value={row.items.join('\n')}
                                    onChange={(e) => {
                                      const copy = [...customTable1];
                                      copy[actualIdx].items = e.target.value.split('\n');
                                      setCustomTable1(copy);
                                      setHasCustomEdits(true);
                                    }}
                                    className="w-full p-1.5 border border-amber-300 rounded text-xs leading-relaxed font-sans"
                                  />
                                ) : (
                                  row.items.map((it, itemIdx) => {
                                    const colonIdx = it.indexOf(':');
                                    if (colonIdx > 0 && colonIdx < 50) {
                                      let catTitle = it.substring(0, colonIdx).trim();
                                      if (catTitle.startsWith('•')) {
                                        catTitle = catTitle.substring(1).trim();
                                      }
                                      const descText = it.substring(colonIdx + 1).trim();
                                      return (
                                        <div key={itemIdx} className="leading-snug mb-1 text-left">
                                          <span className="font-bold">• {catTitle}</span>
                                          <span className="font-semibold"> : </span>
                                          <span>{descText}</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={itemIdx} className="leading-snug text-left">
                                        <span className="font-semibold">• </span>
                                        <span>{it}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'center', fontSize: '10.5pt', wordBreak: 'break-word', boxSizing: 'border-box' }} className="text-stone-700">
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    value={row.keterangan}
                                    onChange={(e) => {
                                      const copy = [...customTable1];
                                      copy[actualIdx].keterangan = e.target.value;
                                      setCustomTable1(copy);
                                      setHasCustomEdits(true);
                                    }}
                                    className="w-full p-1 border border-amber-300 rounded text-center text-xs font-sans"
                                  />
                                ) : (
                                  row.keterangan
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Hidden inputs for adding/replacing photos in Table 2 */}
        <input
          ref={newPhotoInputRef}
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleAddNewPhotoRow}
          className="hidden"
        />
        <input
          ref={replacePhotoInputRef}
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/jpg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && replacingPhotoIndex !== null) {
              handleReplacePhoto(replacingPhotoIndex, file);
            }
          }}
          className="hidden"
        />

        {/* ==================== PAGE 4+: TABEL 2 DOKUMENTASI KEGIATAN (2 PHOTOS PER A4 PAGE) ==================== */}
        {photoPages.length === 0 ? (
          <div className="relative">
            <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
              — Halaman {3 + table1Pages.length}: Tabel 2 Dokumentasi Kegiatan —
            </div>
            <div className="report-page bg-white w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 page-break">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[12pt] text-stone-900">
                      Tabel 2. Dokumentasi Kegiatan
                    </h4>
                    <p className="text-[11pt] text-stone-500 italic mt-0.5">
                      Dokumentasi foto kegiatan operasional kebun KPS PVT I Manoko ({periodText})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={triggerAddNewPhoto}
                    className="no-print cursor-pointer px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Foto Baru</span>
                  </button>
                </div>

                <div className="p-12 border border-stone-400 text-center text-xs text-stone-500 rounded-none bg-stone-50 space-y-3">
                  <p>Belum ada dokumentasi foto sebelum untuk kegiatan pada periode ini.</p>
                  <button
                    type="button"
                    onClick={triggerAddNewPhoto}
                    className="no-print inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Foto Dokumentasi Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          photoPages.map((pagePhotos, pageIdx) => {
            const globalStartIndex = pageIdx * 2;

            return (
              <div key={`photo-page-${pageIdx}`} className="relative">
                <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
                  — Halaman {3 + table1Pages.length + pageIdx}: Tabel 2 Dokumentasi Kegiatan{pageIdx > 0 ? ' (Lanjutan)' : ''} —
                </div>
                <div className="report-page bg-white w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 leading-relaxed print:shadow-none print:border-none print:m-0 page-break">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[12pt] text-stone-900">
                            {pageIdx === 0
                              ? 'Tabel 2. Dokumentasi Kegiatan'
                              : 'Tabel 2. Dokumentasi Kegiatan (Lanjutan)'}
                          </h4>
                          <span className="no-print text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            {customPhotos.length} Foto Tercantum
                          </span>
                          {customPhotos.length < defaultPhotos.length && (
                            <span className="no-print text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                              {defaultPhotos.length - customPhotos.length} Foto Dikecualikan
                            </span>
                          )}
                        </div>
                        <p className="text-[11pt] text-stone-500 italic mt-0.5">
                          Foto kegiatan operasional kebun KPS PVT I Manoko ({periodText})
                        </p>
                      </div>

                      {pageIdx === 0 && (
                        <div className="no-print flex items-center gap-1.5 flex-wrap">
                          {customPhotos.length < defaultPhotos.length && (
                            <button
                              type="button"
                              onClick={handleRestoreAllOriginalPhotos}
                              className="cursor-pointer px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 border border-amber-300 shadow-2xs transition-colors"
                              title="Kembalikan semua foto asli dari logbook kegiatan ke dalam laporan"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                              <span>Pulihkan Foto Asli ({defaultPhotos.length})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setIsPhotoCuratorOpen(true)}
                            className="cursor-pointer px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-stone-300 shadow-2xs transition-colors"
                            title="Pilih dan centang foto mana saja yang ingin disertakan ke laporan resmi"
                          >
                            <Filter className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Pilih / Kurasi Foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={triggerAddNewPhoto}
                            className="no-print cursor-pointer px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Baris Foto Baru</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Table 2 layout with 4 photos per sheet */}
                    <div style={{ border: '1px solid #000000', width: '100%', boxSizing: 'border-box' }}>
                      <table className="w-full text-left text-[11pt] border-collapse font-sans" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #000000' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }} className="font-bold text-[11pt]">
                            <th style={{ border: '1px solid #000000', padding: '8px 10px', textAlign: 'center', width: '45%', boxSizing: 'border-box' }}>
                              Foto Dokumentasi
                            </th>
                            <th style={{ border: '1px solid #000000', padding: '8px 10px', textAlign: 'center', width: '55%', boxSizing: 'border-box' }}>
                              Keterangan
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagePhotos.map((doc, docIdx) => {
                            const actualIdx = globalStartIndex + docIdx;
                            return (
                              <tr key={doc.id || actualIdx} style={{ borderBottom: '1px solid #000000' }} className="align-middle">
                                {/* Foto Cell with Clean Container */}
                                <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', width: '45%', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
                                  <div style={{ width: '205px', height: '135px', maxWidth: '100%', margin: '0 auto', border: '1px solid #555555', backgroundColor: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', position: 'relative' }} className="group">
                                    <img
                                      src={doc.foto}
                                      alt={`Dokumentasi ${actualIdx + 1}`}
                                      style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                    />

                                    {/* Direct image edit buttons on hover */}
                                    <div className="no-print absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                      <button
                                        type="button"
                                        onClick={() => triggerReplacePhoto(actualIdx)}
                                        className="cursor-pointer bg-white text-stone-900 px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-stone-100 transition-colors shadow-xs flex items-center gap-1"
                                      >
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>Ganti</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPhotoToDelete({ index: actualIdx, item: doc })}
                                        className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-xs flex items-center gap-1"
                                        title="Hapus foto ini dari laporan resmi"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Hapus</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Dedicated action buttons permanently visible under photo */}
                                  <div className="no-print mt-2 flex items-center justify-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => triggerReplacePhoto(actualIdx)}
                                      className="cursor-pointer text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors flex items-center gap-1"
                                      title="Ganti foto dokumentasi baris ini"
                                    >
                                      <ImageIcon className="w-3 h-3 text-emerald-700" />
                                      <span>Ganti Foto</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPhotoToDelete({ index: actualIdx, item: doc })}
                                      className="cursor-pointer text-[11px] font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-700 px-2.5 py-1 rounded-md border border-red-300 transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                                      title="Keluarkan foto ini dari tabel laporan resmi"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus Foto</span>
                                    </button>
                                  </div>
                                </td>

                                {/* Keterangan Cell */}
                                <td style={{ border: '1px solid #000000', padding: '8px 12px', verticalAlign: 'top', width: '55%', backgroundColor: '#ffffff', boxSizing: 'border-box' }} className="leading-relaxed">
                                  {isEditMode ? (
                                    <div className="space-y-2">
                                      <label className="block text-[11px] font-semibold text-stone-600 font-sans">
                                        Edit Keterangan Foto:
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={doc.keterangan}
                                        onChange={(e) => handleUpdatePhotoCaption(actualIdx, e.target.value)}
                                        className="w-full p-2 text-[12pt] border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                                      />
                                      <div className="pt-1">
                                        <label className="block text-[11px] font-semibold text-stone-600 font-sans">
                                          Lokasi:
                                        </label>
                                        <input
                                          type="text"
                                          value={doc.lokasi || ''}
                                          placeholder="Lokasi pekerjaan"
                                          onChange={(e) => {
                                            const copy = [...customPhotos];
                                            copy[actualIdx].lokasi = e.target.value;
                                            setCustomPhotos(copy);
                                            setHasCustomEdits(true);
                                          }}
                                          className="w-full p-1.5 text-[11pt] border border-stone-300 rounded text-stone-700 font-sans"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2 font-sans">
                                      <div className="flex items-start gap-1.5">
                                        <span className="font-bold text-stone-900">•</span>
                                        <p className="font-medium text-stone-900 text-[12pt] leading-relaxed">
                                          {doc.keterangan}
                                        </p>
                                      </div>
                                      {doc.lokasi && (
                                        <p className="text-[11pt] text-stone-600 pl-3">
                                          <strong>Lokasi:</strong> {doc.lokasi}
                                        </p>
                                      )}
                                      {doc.tanggal && (
                                        <p className="text-[11pt] text-stone-600 pl-3">
                                          <strong>Tanggal:</strong> {formatIndonesianDate(doc.tanggal)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ==================== FINAL PAGE: BAB III PENUTUP & TANDA TANGAN RESMI ==================== */}
        <div className="relative">
          <div className="no-print print:hidden text-center text-xs font-mono font-semibold text-stone-300 mb-2">
            — Halaman Terakhir: BAB III Penutup & Lembar Pengesahan —
          </div>
          <div className="report-page bg-white w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 flex flex-col justify-between text-justify leading-relaxed print:shadow-none print:border-none print:m-0 page-break">
            <div>
              <div className="text-center mb-8">
                <h2 className="text-lg font-bold uppercase tracking-wider">BAB III</h2>
                <h3 className="text-lg font-bold uppercase tracking-wider">PENUTUP</h3>
              </div>

              <div className="space-y-4 text-[12pt] text-stone-900 leading-relaxed font-sans">
                {isEditMode ? (
                  <textarea
                    rows={6}
                    value={customPenutup}
                    onChange={(e) => {
                      setCustomPenutup(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-[12pt] border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans leading-relaxed"
                  />
                ) : (
                  <div className="space-y-3 text-[12pt]">
                    {customPenutup.split('\n\n').map((para, idx) => (
                      <p key={idx} className="indent-8 leading-relaxed text-[12pt]">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Official Signature Block at Bottom Right */}
            <div className="mt-16 flex flex-col items-end text-[12pt] font-sans">
              <div className="text-center w-72 space-y-1">
                <p className="text-[12pt]">
                  {profile.tempatPenetapan || 'Bandung Barat'},{' '}
                  {formatIndonesianDate(reportConfig.tanggalCetak)}
                </p>
                <p className="font-medium text-stone-900 text-[12pt]">{profile.jabatan || 'Pengelola Pemeliharaan Kebun'}</p>

                {/* Digital Signature Graphic */}
                <div className="h-24 my-2 flex items-center justify-center">
                  {profile.tandaTanganUrl ? (
                    <img
                      src={profile.tandaTanganUrl}
                      alt="Tanda Tangan"
                      className="h-20 object-contain"
                    />
                  ) : (
                    <div className="h-20 w-36 border-b border-stone-400"></div>
                  )}
                </div>

                <p className="font-bold uppercase tracking-wide text-stone-900 border-b border-stone-900 pb-0.5 inline-block text-[12pt]">
                  {profile.nama || 'PEGAWAI KPS PVT I MANOKO'}
                </p>
                <p className="font-mono text-[11pt] text-stone-800">
                  {formatNipNumberOnly(profile.nip)}
                </p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* ==================== MODAL 1: RANGKUMAN KINERJA KEDINASAN OTOMATIS (AI) ==================== */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-sm animate-fade-in no-print overflow-y-auto">
          <div className="bg-stone-900 border border-purple-500/40 rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-amber-300 shadow-md">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Rangkuman Kinerja Kedinasan Otomatis (AI)
                  </h3>
                  <p className="text-xs text-purple-200/80">
                    Standardisasi 9 Kategori Kedinasan PVTPP Kementerian Pertanian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Period & Context Notice */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Target Laporan:</span>
                  <span className="px-2 py-0.5 rounded font-bold bg-purple-950 text-purple-300 border border-purple-700/50 uppercase">
                    {reportConfig.tipe} &bull; {reportConfig.tipe === 'triwulan' ? `Triwulan ${reportConfig.triwulan}` : reportConfig.tipe === 'tahunan' ? 'Tahunan' : MONTH_NAMES[reportConfig.bulan - 1]} {reportConfig.tahun}
                  </span>
                </div>
                <span className="text-stone-400">
                  Data Sumber: <strong className="text-white">{filteredEntries.length} kegiatan</strong>
                </span>
              </div>

              {reportConfig.tipe === 'bulanan' ? (
                <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-2.5 text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Rekomendasi Kategori Laporan:</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-200/90">
                    Fitur Rangkuman AI sangat direkomendasikan untuk laporan <strong>Triwulan</strong> dan <strong>Tahunan</strong> untuk menyatukan kegiatan sejenis per bulan agar tidak panjang berulang. Anda juga dapat beralih sekarang:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReportConfig((prev) => ({ ...prev, tipe: 'triwulan' }));
                        setAiSummaryResult(null);
                        setTimeout(() => handleRunAiSummarize(), 50);
                      }}
                      className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Beralih ke Triwulan {reportConfig.triwulan}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportConfig((prev) => ({ ...prev, tipe: 'tahunan' }));
                        setAiSummaryResult(null);
                        setTimeout(() => handleRunAiSummarize(), 50);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Beralih ke Tahunan
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  AI mengelompokkan kegiatan harian per bulan ke dalam 9 kategori kedinasan resmi, menyatukan uraian kerja yang sama (pengolahan lahan, persiapan tanam, pemeliharaan, sanitasi, dll.), dan memformat judul bertanda (•) tebal.
                </p>
              )}
            </div>

            {/* AI Generation State or Results Preview */}
            {isSummarizingAi ? (
              <div className="py-10 text-center space-y-3 bg-stone-950/50 rounded-xl border border-stone-800 p-6">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-900/50 text-amber-300 border border-purple-500/40 animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    Memproses Rangkuman Kegiatan dengan AI...
                  </p>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Menganalisis {filteredEntries.length} uraian kegiatan, menyatukan pekerjaan sejenis, dan memetakan ke dalam 9 kategori standar kedinasan.
                  </p>
                </div>
              </div>
            ) : aiSummaryResult && aiSummaryResult.months.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Hasil Rangkuman Siap Diterapkan ({aiSummaryResult.months.length} Bulan):
                  </span>
                  <button
                    type="button"
                    onClick={handleRunAiSummarize}
                    className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Rangkum Ulang</span>
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                  {aiSummaryResult.months.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800/80 pb-1.5">
                        <span className="font-bold text-white text-sm">
                          Bulan {m.monthName}
                        </span>
                        <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-mono">
                          {m.categories.length} Kategori Aktif
                        </span>
                      </div>

                      <div className="space-y-1.5 text-stone-200">
                        {m.categories.map((c, cIdx) => (
                          <div key={cIdx} className="leading-relaxed pl-2 border-l-2 border-purple-500/40">
                            <span className="font-bold text-white">• {c.categoryTitle}</span>
                            <span className="font-semibold text-stone-300"> : </span>
                            <span className="text-stone-300">{c.summary}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 bg-stone-950/50 rounded-xl border border-stone-800 p-4">
                <p className="text-xs text-stone-400">
                  Belum ada rangkuman yang dihasilkan untuk periode ini.
                </p>
                <button
                  type="button"
                  onClick={handleRunAiSummarize}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Mulai Rangkuman AI</span>
                </button>
              </div>
            )}

            {/* 9 Reference Categories Collapsible Info */}
            <div className="bg-stone-950/40 border border-stone-800/80 rounded-xl p-3 text-[11px] text-stone-400 space-y-1.5">
              <span className="font-bold text-stone-300 uppercase tracking-wider text-[10px] block">
                9 Kategori Resmi Kedinasan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-stone-300">
                <div>• <strong className="text-white">pengolahan lahan</strong> : olah lahan, bedengan, cangkul, traktor</div>
                <div>• <strong className="text-white">persiapan tanam</strong> : semai, lubang tanam, bibit, mulsa</div>
                <div>• <strong className="text-white">penanaman</strong> : penanaman bibit/benih sayuran</div>
                <div>• <strong className="text-white">pemeliharaan tanaman</strong> : siram, semprot, pupuk, wiwit</div>
                <div>• <strong className="text-white">sanitasi lahan</strong> : penyiangan gulma, babad rumput</div>
                <div>• <strong className="text-white">Panen</strong> : pemanenan sayuran, sortasi, timbang</div>
                <div>• <strong className="text-white">kegiatan kedinasan</strong> : upacara peringatan hari kenegaraan</div>
                <div>• <strong className="text-white">pemeliharaan sarpras</strong> : servis mesin babad, traktor, pompa</div>
                <div className="sm:col-span-2">• <strong className="text-white">kegiatan lainnya</strong> : pendukung operasional kantor atau kebun</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-800">
              {isUsingAiSummary && (
                <button
                  type="button"
                  onClick={handleRestoreDailyRows}
                  className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kembalikan ke Rincian Harian</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                {aiSummaryResult && aiSummaryResult.months.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleApplyAiSummary()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan ke Laporan Resmi (Tabel 1)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: NOTIFIKASI & AKSI PDF SIAP (Optimasi Mobile Safari & Android) ==================== */}
      {readyPdfInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-stone-900 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-md w-full p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">File PDF Selesai Dibuat</h3>
              </div>
              <button
                type="button"
                onClick={() => setReadyPdfInfo(null)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Dokumen PDF resmi telah berhasil diproses dengan standar layout PVTPP Kementan. Pilih tindakan di bawah ini untuk membuka atau menyimpan ke perangkat:
            </p>

            <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 text-xs space-y-1">
              <span className="text-stone-400 block text-[11px]">Nama Berkas:</span>
              <p className="font-mono text-emerald-300 font-semibold truncate">{readyPdfInfo.filename}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Direct Open in New Tab - 100% reliable on Safari & Chrome */}
              <a
                href={readyPdfInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka / Unduh PDF</span>
              </a>

              {/* Native Mobile Share Sheet (Files / WhatsApp / Drive) triggered by direct tap */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const file = new File([readyPdfInfo.blob], readyPdfInfo.filename, {
                      type: 'application/pdf',
                      lastModified: Date.now(),
                    });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        files: [file],
                        title: readyPdfInfo.filename,
                        text: `Laporan Kinerja - ${periodTitle}`,
                      });
                    } else {
                      // Fallback anchor click
                      const link = document.createElement('a');
                      link.href = readyPdfInfo.url;
                      link.download = readyPdfInfo.filename;
                      link.click();
                    }
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      const link = document.createElement('a');
                      link.href = readyPdfInfo.url;
                      link.download = readyPdfInfo.filename;
                      link.click();
                    }
                  }
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan / Simpan</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setReadyPdfInfo(null)}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                Tutup jendela ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FLOATING TOAST: AKSI FOTO DOKUMENTASI ==================== */}
      {photoActionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fade-in border border-emerald-500/40 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{photoActionToast}</span>
        </div>
      )}

      {/* ==================== MODAL 3: KONFIRMASI HAPUS FOTO DARI TABEL DOKUMENTASI ==================== */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden text-stone-900">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-600"></div>
            
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 text-red-600">
                  <div className="p-2 rounded-xl bg-red-100 shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 leading-tight">
                      Hapus Foto Dokumentasi?
                    </h3>
                    <p className="text-xs text-stone-500">
                      Tabel 2. Dokumentasi Kegiatan ({periodText})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPhotoToDelete(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Preview Thumbnail */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-stone-900 border border-stone-300 shrink-0 flex items-center justify-center">
                  <img
                    src={photoToDelete.item.foto}
                    alt="Preview hapus foto"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 text-xs space-y-0.5">
                  <p className="font-semibold text-stone-900 truncate">
                    {photoToDelete.item.keterangan || 'Dokumentasi kegiatan'}
                  </p>
                  {photoToDelete.item.tanggal && (
                    <p className="text-[11px] text-stone-500 font-mono">
                      Tanggal: {formatIndonesianDate(photoToDelete.item.tanggal)}
                    </p>
                  )}
                  {photoToDelete.item.lokasi && (
                    <p className="text-[11px] text-stone-500 truncate">
                      Lokasi: {photoToDelete.item.lokasi}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Pilih bagaimana Anda ingin menghapus foto dokumentasi ini:
              </p>

              <div className="space-y-2 pt-1">
                {/* Option 1: Hapus dari Laporan Resmi Saja (Recommended) */}
                <button
                  type="button"
                  onClick={handleConfirmDeletePhotoFromReport}
                  className="w-full p-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>✓ Hapus dari Laporan Resmi Saja</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">Rekomendasi</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 mt-1 leading-snug">
                    Foto tidak akan dicantumkan di cetakan PDF/Word resmi, namun tetap aman tersimpan di riwayat harian logbook Anda.
                  </p>
                </button>

                {/* Option 2: Hapus Permanen dari Logbook */}
                {onUpdateEntry && photoToDelete.item.id && (
                  <button
                    type="button"
                    onClick={handleConfirmDeletePhotoPermanent}
                    className="w-full p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-red-900 block">
                      🗑️ Hapus Permanen dari Laporan &amp; Logbook
                    </span>
                    <p className="text-[11px] text-red-700/90 mt-1 leading-snug">
                      Hapus foto dari laporan resmi sekaligus hapus berkas foto dari catatan logbook database.
                    </p>
                  </button>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: KURASI & PEMILIHAN FOTO DOKUMENTASI LAPORAN ==================== */}
      {isPhotoCuratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in no-print overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden text-stone-900 my-8">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700"></div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-base font-bold text-stone-900">
                      Pilih Foto Dokumentasi Laporan Resmi
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Centang foto-foto yang ingin disertakan ke dalam laporan resmi ({periodText}). Foto yang tidak dicentang otomatis dikeluarkan dari cetakan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPhotoCuratorOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Bar */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <span className="font-semibold text-stone-700">
                  {customPhotos.length} dari {defaultPhotos.length} foto terpilih untuk laporan resmi
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPhotos(defaultPhotos);
                      setHasCustomEdits(true);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Pilih Semua ({defaultPhotos.length})
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPhotos([]);
                      setHasCustomEdits(true);
                    }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                </div>
              </div>

              {/* Photo Checklist Grid */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {defaultPhotos.length === 0 ? (
                  <p className="text-center py-8 text-xs text-stone-500">
                    Tidak ada dokumentasi foto untuk periode ini.
                  </p>
                ) : (
                  defaultPhotos.map((item, idx) => {
                    const isSelected = customPhotos.some((p) => p.id === item.id || p.foto === item.foto);

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => handleTogglePhotoInReport(item)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                            : 'bg-stone-50 border-stone-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="text-emerald-700 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700" />
                          ) : (
                            <Square className="w-5 h-5 text-stone-400" />
                          )}
                        </div>

                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-stone-900 border border-stone-300 shrink-0 flex items-center justify-center">
                          <img
                            src={item.foto}
                            alt={`Preview foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold text-stone-900 truncate">
                            {idx + 1}. {item.keterangan || 'Dokumentasi kegiatan'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-0.5">
                            {item.tanggal && <span>Tgl: {formatIndonesianDate(item.tanggal)}</span>}
                            {item.lokasi && <span>Lokasi: {item.lokasi}</span>}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {isSelected ? 'Masuk Laporan' : 'Dikecualikan'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                <span className="text-[11px] text-stone-500">
                  Tabel 2 akan otomatis menyesuaikan (4 foto per halaman A4 untuk mengoptimalkan ruang).
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoCuratorOpen(false);
                    displayPhotoToast(`Tabel dokumentasi diperbarui (${customPhotos.length} foto).`);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Selesai Memilih
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
