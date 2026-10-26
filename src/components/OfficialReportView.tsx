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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  CheckCircle2
} from 'lucide-react';

interface OfficialReportViewProps {
  entries: LogbookEntry[];
  profile: UserProfile;
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

export function formatNipNumberOnly(nip?: string): string {
  if (!nip) return '-';
  // Strip "NIP", "NIP.", "NIP:", and leading/trailing whitespace
  const cleaned = nip.replace(/^NIP[:.\s]*/i, '').trim();
  return cleaned || '-';
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${MONTH_NAMES[monthIdx] || ''} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const OfficialReportView: React.FC<OfficialReportViewProps> = ({ entries, profile }) => {
  // Dynamic initialization based on latest entry or current date
  const [reportConfig, setReportConfig] = useState<ReportConfig>(() => {
    let targetDate = new Date();
    if (entries && entries.length > 0) {
      const sorted = [...entries].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      if (sorted[0]?.tanggal) {
        const parsed = new Date(sorted[0].tanggal);
        if (!isNaN(parsed.getTime())) targetDate = parsed;
      }
    }
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      tipe: 'bulanan',
      tahun: year,
      bulan: month,
      triwulan: quarter,
      tanggalCetak: todayStr,
    };
  });

  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Editable custom overrides state
  const [customTable1, setCustomTable1] = useState<Table1RowItem[]>([]);
  const [customPhotos, setCustomPhotos] = useState<ReportPhotoItem[]>([]);
  const [customLatarBelakang, setCustomLatarBelakang] = useState<string>('');
  const [customTujuan, setCustomTujuan] = useState<string>('');
  const [customWaktuPelaksanaan, setCustomWaktuPelaksanaan] = useState<string>('');
  const [customPenutup, setCustomPenutup] = useState<string>('');
  const [hasCustomEdits, setHasCustomEdits] = useState(false);

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
      const sorted = [...entries].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      const latest = sorted[0];
      if (latest?.tanggal) {
        const d = new Date(latest.tanggal);
        const latestYear = d.getFullYear();
        const latestMonth = d.getMonth() + 1;

        setReportConfig((prev) => {
          // Check if current month in config has any entries
          const hasCurrentMonthEntries = entries.some((e) => {
            const ed = new Date(e.tanggal);
            return ed.getFullYear() === prev.tahun && ed.getMonth() + 1 === prev.bulan;
          });

          // If current month has zero entries but latest month has entries, automatically switch
          if (!hasCurrentMonthEntries) {
            return {
              ...prev,
              tahun: latestYear,
              bulan: latestMonth,
              triwulan: Math.ceil(latestMonth / 3),
            };
          }
          return prev;
        });
      }
    }
  }, [entries]);

  // Filter entries for this report period
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.tanggal);
      const entryYear = d.getFullYear();
      const entryMonth = d.getMonth() + 1;

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
    });
  }, [entries, reportConfig]);

  const periodTitle = getReportPeriodTitle(reportConfig);
  const periodText = getReportPeriodText(reportConfig);

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

  // Generate default Table 1 data - Kategori Removed, ordered clean
  const defaultTable1Data = useMemo(() => {
    const groups: Table1RowItem[] = [];

    if (reportConfig.tipe === 'bulanan') {
      filteredEntries.forEach((e) => {
        const d = new Date(e.tanggal);
        const dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
        let itemDesc = '';

        if (e.kehadiran === 'Sakit') {
          itemDesc = `Izin Sakit: ${e.keterangan || 'Istirahat Sakit'}${e.suratSakit ? ' (Surat Dokter Terlampir)' : ''}`;
        } else if (e.kehadiran === 'Cuti') {
          itemDesc = `Cuti: ${e.keterangan || 'Cuti Resmi'}`;
        } else {
          let desc = e.uraianPekerjaan;
          const locDetails: string[] = [];
          if (e.lokasiPekerjaan && e.lokasiPekerjaan !== '-') locDetails.push(`Lokasi: ${e.lokasiPekerjaan}`);
          if (e.luasLahan && e.luasLahan !== '-') locDetails.push(`Luas: ${e.luasLahan}`);
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
    } else if (reportConfig.tipe === 'triwulan') {
      const quarterMonths = ({
        1: [1, 2, 3],
        2: [4, 5, 6],
        3: [7, 8, 9],
        4: [10, 11, 12],
      } as Record<number, number[]>)[reportConfig.triwulan] || [];

      quarterMonths.forEach((m) => {
        const monthEntries = filteredEntries.filter(
          (e) => new Date(e.tanggal).getMonth() + 1 === m
        );
        const items: string[] = [];

        monthEntries.forEach((e) => {
          if (e.kehadiran === 'Sakit') {
            items.push(`Izin Sakit: ${e.keterangan || 'Istirahat Sakit'}`);
          } else if (e.kehadiran === 'Cuti') {
            items.push(`Cuti: ${e.keterangan || 'Cuti Resmi'}`);
          } else {
            const locInfo = e.lokasiPekerjaan && e.lokasiPekerjaan !== '-' ? ` (${e.lokasiPekerjaan})` : '';
            items.push(`${e.uraianPekerjaan}${locInfo}`);
          }
        });

        groups.push({
          label: MONTH_NAMES[m - 1],
          items: items.length > 0 ? items : ['Pelaksanaan tugas operasional kebun dan pemeliharaan rutin'],
          keterangan: monthEntries.length > 0 ? `${monthEntries.length} Catatan` : '-',
        });
      });
    } else {
      // Tahunan
      [1, 2, 3, 4].forEach((q) => {
        const qMonths = ({ 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] } as Record<number, number[]>)[q] || [];
        const qEntries = filteredEntries.filter((e) =>
          qMonths.includes(new Date(e.tanggal).getMonth() + 1)
        );
        const items = qEntries.map((e) => {
          if (e.kehadiran === 'Sakit') return `Izin Sakit: ${e.keterangan || '-'}`;
          if (e.kehadiran === 'Cuti') return `Cuti: ${e.keterangan || '-'}`;
          return e.uraianPekerjaan;
        });

        groups.push({
          label: `Triwulan ${ROMAN_QUARTERS[q - 1]}`,
          items: items.length > 0 ? items : ['Pelaksanaan tugas operasional dan pemeliharaan kebun'],
          keterangan: `${qEntries.length} Catatan`,
        });
      });
    }

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

  // Sync state whenever period or filtered entries change
  useEffect(() => {
    setCustomTable1(defaultTable1Data);
    setCustomPhotos(defaultPhotos);
    setCustomLatarBelakang(defaultLatarBelakang);
    setCustomTujuan(defaultTujuan);
    setCustomWaktuPelaksanaan(defaultWaktuPelaksanaan);
    setCustomPenutup(defaultPenutup);
    setHasCustomEdits(false);
  }, [defaultTable1Data, defaultPhotos, defaultLatarBelakang, defaultTujuan, defaultWaktuPelaksanaan, defaultPenutup]);

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
    } catch (err: any) {
      alert('Gagal mengunggah foto baru: ' + err.message);
    }
  };

  // Remove a photo row
  const handleDeletePhotoRow = (index: number) => {
    setCustomPhotos((prev) => prev.filter((_, idx) => idx !== index));
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

  // Paginate Table 1 so each A4 sheet holds at most 12 rows, preventing table cut-offs
  const table1Pages = useMemo(() => {
    if (customTable1.length === 0) return [[]];
    if (customTable1.length <= 12) return [customTable1];
    const pages: Table1RowItem[][] = [];
    const chunkSize = 12;
    for (let i = 0; i < customTable1.length; i += chunkSize) {
      pages.push(customTable1.slice(i, i + chunkSize));
    }
    return pages;
  }, [customTable1]);

  // Paginate Table 2 photos: exactly 2 photos per A4 sheet for maximum clarity & no cut-offs
  const photoPages = useMemo(() => {
    if (customPhotos.length === 0) return [];
    const pages: ReportPhotoItem[][] = [];
    const chunkSize = 2;
    for (let i = 0; i < customPhotos.length; i += chunkSize) {
      pages.push(customPhotos.slice(i, i + chunkSize));
    }
    return pages;
  }, [customPhotos]);

  // DIRECT HIGH-FIDELITY PDF GENERATOR (Authentic A4 proportions, no squishing, crisp vectors)
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

      for (let i = 0; i < totalPages; i++) {
        setPdfProgress(`Memproses halaman ${i + 1} dari ${totalPages}...`);
        const pageElem = pages[i];

        // Render page element to canvas at fixed 800px width with 2x resolution
        const canvas = await html2canvas(pageElem, {
          scale: 2, // 2x for sharp crisp text and images
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          onclone: (clonedDoc) => {
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
            });

            // Enforce Arial MT for all titles/headings and Arial for content
            const clonedHeadings = clonedDoc.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, th, .report-title');
            clonedHeadings.forEach((h) => {
              h.style.fontFamily = "'Arial MT', Arial, 'Helvetica Neue', Helvetica, sans-serif";
            });

            const clonedBodies = clonedDoc.querySelectorAll<HTMLElement>('p, td, input, textarea, span, div');
            clonedBodies.forEach((b) => {
              if (!b.matches('h1, h2, h3, h4, h5, th, .report-title')) {
                b.style.fontFamily = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
              }
            });

            // Hide all interactive UI / controls in cloned document
            const noPrintElements = clonedDoc.querySelectorAll<HTMLElement>('.no-print');
            noPrintElements.forEach((el) => {
              el.style.display = 'none';
            });

            // Sanitize Tailwind v4 OKLAB / OKLCH / color-mix
            const dummyCanvas = document.createElement('canvas');
            dummyCanvas.width = 1;
            dummyCanvas.height = 1;
            const dummyCtx = dummyCanvas.getContext('2d');

            const convertToSafeColor = (val: string): string => {
              if (!val || typeof val !== 'string') return val;
              if (
                !val.includes('oklch') &&
                !val.includes('oklab') &&
                !val.includes('color-mix') &&
                !val.includes('light-dark')
              ) {
                return val;
              }
              if (!dummyCtx) return '#111827';
              try {
                dummyCtx.fillStyle = '#000000';
                dummyCtx.fillStyle = val;
                const converted = dummyCtx.fillStyle;
                return converted || '#111827';
              } catch {
                return '#111827';
              }
            };

            const win = clonedDoc.defaultView;
            if (win && typeof win.getComputedStyle === 'function') {
              const origGetComputedStyle = win.getComputedStyle.bind(win);
              win.getComputedStyle = function (el: Element, pseudo?: string | null) {
                const style = origGetComputedStyle(el, pseudo);
                return new Proxy(style, {
                  get(target: any, prop: string | symbol) {
                    const val = target[prop];
                    if (typeof val === 'function') {
                      return function (...args: any[]) {
                        const res = val.apply(target, args);
                        if (typeof res === 'string') {
                          return convertToSafeColor(res);
                        }
                        return res;
                      };
                    }
                    if (typeof val === 'string') {
                      return convertToSafeColor(val);
                    }
                    return val;
                  },
                });
              };
            }

            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach((s) => {
              if (s.textContent) {
                const text = s.textContent;
                if (
                  text.includes('oklab') ||
                  text.includes('oklch') ||
                  text.includes('color-mix') ||
                  text.includes('light-dark')
                ) {
                  s.textContent = text
                    .replace(/oklab\([^)]*(?:\([^)]*\))*[^)]*\)/gi, '#1f2937')
                    .replace(/oklch\([^)]*(?:\([^)]*\))*[^)]*\)/gi, '#1f2937')
                    .replace(/color-mix\([^)]*(?:\([^)]*\))*[^)]*\)/gi, '#1f2937')
                    .replace(/light-dark\([^)]*(?:\([^)]*\))*[^)]*\)/gi, '#1f2937');
                }
              }
            });

            const allNodes = clonedDoc.querySelectorAll('*');
            allNodes.forEach((node) => {
              const el = node as HTMLElement;
              if (!el.style) return;
              try {
                if (el.style.color) el.style.color = convertToSafeColor(el.style.color);
                if (el.style.backgroundColor) el.style.backgroundColor = convertToSafeColor(el.style.backgroundColor);
                if (el.style.borderColor) el.style.borderColor = convertToSafeColor(el.style.borderColor);
                if (el.style.outlineColor) el.style.outlineColor = convertToSafeColor(el.style.outlineColor);
              } catch {}
            });
          },
        });

        // Exact A4 height in canvas pixels (A4 aspect ratio: 297 / 210 = ~1.41428)
        const a4HeightPx = Math.floor(canvas.width * (297 / 210));

        // If the canvas fits into a single A4 page (allow slight 5% tolerance)
        if (canvas.height <= a4HeightPx * 1.05) {
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (!isFirstPage) {
            pdf.addPage('a4', 'p');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          isFirstPage = false;
        } else {
          // If the page content slightly overflows, slice cleanly by exact A4 height so nothing is squashed!
          let sourceY = 0;
          while (sourceY < canvas.height) {
            const chunkHeight = Math.min(a4HeightPx, canvas.height - sourceY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = a4HeightPx;
            const sCtx = sliceCanvas.getContext('2d');
            if (sCtx) {
              sCtx.fillStyle = '#ffffff';
              sCtx.fillRect(0, 0, sliceCanvas.width, a4HeightPx);
              sCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, chunkHeight,
                0, 0, canvas.width, chunkHeight
              );
            }
            const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
            if (!isFirstPage) {
              pdf.addPage('a4', 'p');
            }
            pdf.addImage(sliceImgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            isFirstPage = false;
            sourceY += a4HeightPx;
          }
        }
      }

      setPdfProgress('Menyimpan file PDF...');
      const cleanName = (profile.nama || 'Pegawai').replace(/\s+/g, '_');
      const cleanTitle = periodTitle.replace(/\s+/g, '_');
      const filename = `Laporan_Kinerja_${cleanName}_${cleanTitle}.pdf`;

      pdf.save(filename);
      setPdfProgress('');
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Gagal membuat file PDF: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
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

  <button
    onClick={handleExportDocx}
    disabled={isExportingDocx || isGeneratingPdf}
    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
  >
    <FileDown className="w-3.5 h-3.5" />
    <span>{isExportingDocx ? 'Word...' : 'Word (.docx)'}</span>
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

        {/* Category & Period Selectors (ORDER: Bulanan first, then Triwulan, then Tahunan) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {/* Kategori Laporan */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Kategori Laporan
            </label>
            <div className="flex p-0.5 bg-stone-900 rounded-lg border border-stone-700">
              {(['bulanan', 'triwulan', 'tahunan'] as ReportType[]).map((tipe) => (
                <button
                  key={tipe}
                  type="button"
                  onClick={() => setReportConfig((prev) => ({ ...prev, tipe }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                    reportConfig.tipe === tipe
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-stone-400 hover:text-white'
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

          {/* Tanggal Cetak Penetapan */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Tanggal Penetapan Laporan
            </label>
            <input
              type="date"
              value={reportConfig.tanggalCetak}
              onChange={(e) =>
                setReportConfig((prev) => ({ ...prev, tanggalCetak: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-white font-medium"
            />
          </div>
        </div>

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

      {/* Compact Real-Time Sync Indicator (Slim single-line to avoid taking up vertical space) */}
      <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs text-emerald-200 flex items-center gap-2 shadow-sm no-print">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Sinkronisasi Otomatis:</strong> {filteredEntries.length} data kegiatan &amp; {defaultPhotos.length} foto dokumentasi periode {periodText} termuat rapi.
        </span>
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTIC OFFICIAL A4 REPORT SHEETS CONTAINER */}
      {/* ========================================================================= */}
      <div ref={reportContainerRef} className="space-y-10 print:space-y-0 text-stone-900 font-sans">
        
        {/* ==================== PAGE 1: COVER (SAMPUL LAPORAN) ==================== */}
        <div className="relative">
          <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
            — Halaman 1: Sampul Laporan Resmi —
          </div>
          <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 flex flex-col justify-between text-center print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm]">
            <div className="space-y-3 mt-4">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-snug">
                LAPORAN KINERJA
              </h1>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-snug">
                PELAKSANAAN TUGAS OPERASIONAL KANTOR
              </h2>
              <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-wide leading-snug">
                {periodTitle}
              </h3>
            </div>

            {/* Official Wikipedia Kementan Logo */}
            <div className="my-10 flex items-center justify-center">
              <MinistryLogo size={145} />
            </div>

            {/* Author Block */}
            <div className="space-y-1">
              <p className="text-sm text-stone-700">Disusun oleh :</p>
              <p className="text-lg font-bold tracking-wider uppercase text-stone-900 mt-2">
                {profile.nama || 'PEGAWAI KPS PVT I MANOKO'}
              </p>
              <p className="text-base text-stone-800 font-mono tracking-wide">
                {formatNipNumberOnly(profile.nip)}
              </p>
              <p className="text-base text-stone-700 mt-3 font-medium">
                {profile.jabatan || 'Pengelola Pemeliharaan Kebun'}
              </p>
            </div>

            {/* Cover Footer */}
            <div className="mt-12 mb-4 space-y-1 text-stone-900">
              <p className="text-base font-bold tracking-wide uppercase">
                {profile.instansiInduk || 'PUSAT PERLINDUNGAN VARIETAS TANAMAN DAN PERIZINAN PERTANIAN'}
              </p>
              <p className="text-base font-bold tracking-wide uppercase">
                {profile.kementerian || 'KEMENTERIAN PERTANIAN'}
              </p>
              <p className="text-base font-bold tracking-wider mt-2">
                {reportConfig.tahun}
              </p>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 2: BAB I PENDAHULUAN ==================== */}
        <div className="relative">
          <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
            — Halaman 2: BAB I Pendahuluan —
          </div>
          <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm] page-break">
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold uppercase tracking-wider">BAB I</h2>
              <h3 className="text-lg font-bold uppercase tracking-wider">PENDAHULUAN</h3>
            </div>

            <div className="space-y-6 text-sm text-stone-900">
              <div>
                <h4 className="font-bold text-sm text-stone-900 mb-3">1.1 LATAR BELAKANG</h4>
                {isEditMode ? (
                  <textarea
                    rows={8}
                    value={customLatarBelakang}
                    onChange={(e) => {
                      setCustomLatarBelakang(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-sm border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <div className="space-y-3">
                    {customLatarBelakang.split('\n\n').map((para, idx) => (
                      <p key={idx} className="indent-8 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-sm text-stone-900 mb-3">1.2 TUJUAN</h4>
                {isEditMode ? (
                  <textarea
                    rows={3}
                    value={customTujuan}
                    onChange={(e) => {
                      setCustomTujuan(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-sm border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <p className="indent-8 leading-relaxed">
                    {customTujuan}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-sm text-stone-900 mb-3">1.3 WAKTU PELAKSANAAN</h4>
                {isEditMode ? (
                  <input
                    type="text"
                    value={customWaktuPelaksanaan}
                    onChange={(e) => {
                      setCustomWaktuPelaksanaan(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-sm border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <p className="indent-8 leading-relaxed">
                    {customWaktuPelaksanaan}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 3+: BAB II AKUNTABILITAS KINERJA (TABEL 1) ==================== */}
        {table1Pages.map((pageRows, pageIdx) => {
          const globalStartIndex = pageIdx * 12;

          return (
            <div key={`table1-page-${pageIdx}`} className="relative">
              <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
                — Halaman {3 + pageIdx}: BAB II Akuntabilitas Kinerja (Tabel 1{pageIdx > 0 ? ' Lanjutan' : ''}) —
              </div>
              <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm] page-break">
                {pageIdx === 0 && (
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wider">BAB II</h2>
                    <h3 className="text-lg font-bold uppercase tracking-wider">AKUNTABILITAS KINERJA</h3>
                  </div>
                )}

                <div className="space-y-4 text-sm text-stone-900">
                  {pageIdx === 0 ? (
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">2.1 HASIL PELAKSANAAN</h4>
                      <p className="mt-1 font-medium text-stone-900">Kegiatan {profile.jabatan}</p>
                      <p className="mt-2 text-xs italic text-stone-600">
                        Tabel 1. Rincian kegiatan {profile.jabatan.toLowerCase()} {periodText}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <p className="text-xs italic text-stone-600">
                        Tabel 1. Rincian kegiatan {profile.jabatan.toLowerCase()} {periodText} (Lanjutan)
                      </p>
                    </div>
                  )}

                  {/* Official Table 1 with strict black borders */}
                  <div className="border border-stone-900">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-stone-900 bg-stone-100 font-bold">
                          <th className="border-r border-stone-900 p-2 text-center w-12">No.</th>
                          <th className="border-r border-stone-900 p-2 text-center w-28">
                            {reportConfig.tipe === 'bulanan'
                              ? 'Tanggal'
                              : reportConfig.tipe === 'triwulan'
                              ? 'Bulan'
                              : 'Periode'}
                          </th>
                          <th className="border-r border-stone-900 p-2 text-center">
                            Rincian Pekerjaan
                          </th>
                          <th className="p-2 text-center w-24">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, rowIdx) => {
                          const actualIdx = globalStartIndex + rowIdx;
                          return (
                            <tr key={actualIdx} className="border-b border-stone-900 align-top">
                              <td className="border-r border-stone-900 p-2.5 text-center font-medium">
                                {actualIdx + 1}
                              </td>
                              <td className="border-r border-stone-900 p-2.5 font-semibold text-center">
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
                              <td className="border-r border-stone-900 p-2.5 space-y-1.5">
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
                                  row.items.map((it, itemIdx) => (
                                    <div key={itemIdx} className="leading-relaxed">
                                      <span className="font-semibold">• </span>
                                      <span>{it}</span>
                                    </div>
                                  ))
                                )}
                              </td>
                              <td className="p-2.5 text-center text-[11px] text-stone-700">
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
            <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
              — Halaman {3 + table1Pages.length}: Tabel 2 Dokumentasi Kegiatan —
            </div>
            <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 text-justify leading-relaxed print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm] page-break">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">
                      Tabel 2. Dokumentasi Kegiatan
                    </h4>
                    <p className="text-xs text-stone-500 italic mt-0.5">
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
                <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
                  — Halaman {3 + table1Pages.length + pageIdx}: Tabel 2 Dokumentasi Kegiatan{pageIdx > 0 ? ' (Lanjutan)' : ''} —
                </div>
                <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 leading-relaxed print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm] page-break">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">
                          {pageIdx === 0
                            ? 'Tabel 2. Dokumentasi Kegiatan'
                            : 'Tabel 2. Dokumentasi Kegiatan (Lanjutan)'}
                        </h4>
                        <p className="text-xs text-stone-500 italic mt-0.5">
                          Foto kegiatan operasional kebun KPS PVT I Manoko ({periodText})
                        </p>
                      </div>

                      {pageIdx === 0 && (
                        <button
                          type="button"
                          onClick={triggerAddNewPhoto}
                          className="no-print cursor-pointer px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Baris Foto Baru</span>
                        </button>
                      )}
                    </div>

                    {/* Table 2 layout with 2 photos per sheet */}
                    <div className="border border-stone-900">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-stone-900 bg-stone-100 font-bold">
                            <th className="border-r border-stone-900 p-2.5 text-center w-[46%]">
                              Foto
                            </th>
                            <th className="p-2.5 text-center">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagePhotos.map((doc, docIdx) => {
                            const actualIdx = globalStartIndex + docIdx;
                            return (
                              <tr key={doc.id || actualIdx} className="border-b border-stone-900 align-middle">
                                {/* Foto Cell with Clean Container */}
                                <td className="border-r border-stone-900 p-4 text-center bg-white w-[46%]">
                                  <div className="relative max-w-[270px] mx-auto overflow-hidden border border-stone-700 bg-stone-50 flex items-center justify-center min-h-[160px] max-h-[195px] group">
                                    <img
                                      src={doc.foto}
                                      alt={`Dokumentasi ${actualIdx + 1}`}
                                      className="w-full h-auto object-contain max-h-[190px] block mx-auto"
                                    />

                                    {/* Direct image edit buttons on hover */}
                                    <div className="no-print absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => triggerReplacePhoto(actualIdx)}
                                        className="cursor-pointer bg-white text-stone-900 px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-stone-100 transition-colors shadow-xs flex items-center gap-1"
                                      >
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>Ganti Foto</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Additional edit controls visible in edit mode or direct */}
                                  <div className="no-print mt-2 flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => triggerReplacePhoto(actualIdx)}
                                      className="cursor-pointer text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
                                    >
                                      Ganti Foto
                                    </button>
                                    {isEditMode && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePhotoRow(actualIdx)}
                                        className="text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 px-2 py-1 rounded border border-red-200 flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Hapus</span>
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Keterangan Cell */}
                                <td className="p-4 leading-relaxed align-top bg-white">
                                  {isEditMode ? (
                                    <div className="space-y-2">
                                      <label className="block text-[11px] font-semibold text-stone-600 font-sans">
                                        Edit Keterangan Foto:
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={doc.keterangan}
                                        onChange={(e) => handleUpdatePhotoCaption(actualIdx, e.target.value)}
                                        className="w-full p-2 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
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
                                          className="w-full p-1.5 text-xs border border-stone-300 rounded text-stone-700 font-sans"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-1.5">
                                        <span className="font-bold text-stone-900">•</span>
                                        <p className="font-medium text-stone-900 text-xs sm:text-sm">
                                          {doc.keterangan}
                                        </p>
                                      </div>
                                      {doc.lokasi && (
                                        <p className="text-[11px] text-stone-600 pl-3">
                                          <strong>Lokasi:</strong> {doc.lokasi}
                                        </p>
                                      )}
                                      {doc.tanggal && (
                                        <p className="text-[11px] text-stone-600 pl-3">
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
          <div className="no-print text-center text-xs font-mono font-semibold text-stone-300 mb-2">
            — Halaman Terakhir: BAB III Penutup & Lembar Pengesahan —
          </div>
          <div className="report-page bg-white w-full max-w-[794px] min-h-[1123px] mx-auto p-12 sm:p-16 shadow-2xl border border-stone-300/80 flex flex-col justify-between text-justify leading-relaxed print:shadow-none print:border-none print:m-0 print:p-[25mm_20mm_20mm_25mm] page-break">
            <div>
              <div className="text-center mb-8">
                <h2 className="text-lg font-bold uppercase tracking-wider">BAB III</h2>
                <h3 className="text-lg font-bold uppercase tracking-wider">PENUTUP</h3>
              </div>

              <div className="space-y-4 text-sm text-stone-900">
                {isEditMode ? (
                  <textarea
                    rows={6}
                    value={customPenutup}
                    onChange={(e) => {
                      setCustomPenutup(e.target.value);
                      setHasCustomEdits(true);
                    }}
                    className="w-full p-3 text-sm border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 font-sans"
                  />
                ) : (
                  <div className="space-y-3">
                    {customPenutup.split('\n\n').map((para, idx) => (
                      <p key={idx} className="indent-8 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Official Signature Block at Bottom Right */}
            <div className="mt-16 flex flex-col items-end text-sm">
              <div className="text-center w-72 space-y-1">
                <p>
                  {profile.tempatPenetapan || 'Bandung Barat'},{' '}
                  {formatIndonesianDate(reportConfig.tanggalCetak)}
                </p>
                <p className="font-medium text-stone-900">{profile.jabatan || 'Pengelola Pemeliharaan Kebun'}</p>

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

                <p className="font-bold uppercase tracking-wide text-stone-900 border-b border-stone-900 pb-0.5 inline-block">
                  {profile.nama || 'PEGAWAI KPS PVT I MANOKO'}
                </p>
                <p className="font-mono text-xs text-stone-800">
                  {formatNipNumberOnly(profile.nip)}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
