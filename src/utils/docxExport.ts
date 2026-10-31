import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  Packer,
  convertInchesToTwip,
} from 'docx';
import { downloadOrShareBlob } from './downloadUtils';
import { LogbookEntry, UserProfile, ReportConfig } from '../types/logbook';
import { base64ToUint8Array } from './imageUtils';
import { formatAreaUnit } from './storage';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ROMAN_QUARTERS = ['I', 'II', 'III', 'IV'];

export function getReportPeriodTitle(config: ReportConfig): string {
  if (config.tipe === 'semua') {
    return `SELURUH CATATAN LOGBOOK KINERJA TAHUN ${config.tahun}`;
  }
  if (config.tipe === 'bulanan') {
    return `BULAN ${MONTH_NAMES[config.bulan - 1]?.toUpperCase()} TAHUN ${config.tahun}`;
  }
  if (config.tipe === 'triwulan') {
    return `TRIWULAN ${ROMAN_QUARTERS[config.triwulan - 1]} TAHUN ${config.tahun}`;
  }
  return `TAHUN ${config.tahun}`;
}

export function getReportPeriodText(config: ReportConfig): string {
  if (config.tipe === 'semua') {
    return `seluruh catatan logbook kinerja Tahun ${config.tahun}`;
  }
  if (config.tipe === 'bulanan') {
    return `Bulan ${MONTH_NAMES[config.bulan - 1]} Tahun ${config.tahun}`;
  }
  if (config.tipe === 'triwulan') {
    return `periode Triwulan ${ROMAN_QUARTERS[config.triwulan - 1]} Tahun ${config.tahun}`;
  }
  return `Tahun ${config.tahun}`;
}

function formatDocxNip(nip?: string): string {
  if (!nip) return '-';
  const cleaned = nip.replace(/^NIP[:.\s]*/i, '').trim();
  return cleaned || '-';
}

/**
 * Strict sanitizer to remove invalid XML control characters and normalize whitespaces.
 * Mobile OpenXML parsers (WPS Office, Word Mobile) strictly throw fatal errors on control chars or literal newlines in <w:t>.
 */
function cleanDocxText(str?: string): string {
  if (!str) return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Split text into separate justified paragraphs without raw newlines in XML runs
 */
function createJustifiedParagraphs(text?: string, spacingAfter = 240): Paragraph[] {
  if (!text) return [];
  const lines = text.split(/\r?\n+/).map((l) => cleanDocxText(l)).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: line })],
        spacing: { after: spacingAfter },
      })
  );
}

/**
 * Strict Magic Bytes checker to ensure OpenXML ContentType matches binary media data 100%.
 * Prevents mobile Office apps (WPS Office / Word Mobile) from failing with "Dokumen rusak / Format tidak didukung".
 */
function detectImageFormat(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (!bytes || bytes.length < 8) return null;
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return 'png';
  }
  // JPEG magic bytes: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpg';
  }
  return null;
}

/**
 * Directly fetch official logo as pristine PNG array buffer without Canvas re-encoding
 */
async function loadOfficialLogo(): Promise<{ data: Uint8Array; width: number; height: number; type: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch('/logo_kementan.png');
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const detected = detectImageFormat(bytes) || 'png';
      if (bytes.length > 50) {
        return {
          data: bytes,
          width: 120,
          height: 120,
          type: detected,
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch /logo_kementan.png directly:', err);
  }
  return null;
}

/**
 * Robust image loader for photos & signatures.
 * Prioritizes direct base64 binary decoding to avoid mobile Canvas memory limits and tainted security errors.
 */
async function loadValidDocxImage(
  source: string,
  preferredType: 'png' | 'jpg' = 'jpg',
  displayDim: { width: number; height: number } = { width: 220, height: 165 }
): Promise<{ data: Uint8Array; width: number; height: number; type: 'png' | 'jpg' } | null> {
  if (!source || typeof source !== 'string' || source.trim() === '') return null;

  // 1. Direct Base64 binary decoding (Instant & 100% reliable on mobile devices)
  try {
    if (source.startsWith('data:image/')) {
      const bytes = base64ToUint8Array(source);
      const detected = detectImageFormat(bytes) || preferredType;
      if (bytes && bytes.length > 50) {
        return {
          data: bytes,
          width: displayDim.width,
          height: displayDim.height,
          type: detected,
        };
      }
    }
  } catch (decodeErr) {
    console.warn('Direct base64 decode fallback to canvas:', decodeErr);
  }

  // 2. Canvas fallback for SVGs or external URLs
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      if (source.startsWith('http://') || source.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      const timer = setTimeout(() => {
        resolve(null);
      }, 5000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const naturalW = img.naturalWidth || img.width || 400;
          const naturalH = img.naturalHeight || img.height || 300;

          const maxWidth = displayDim.width;
          const maxHeight = displayDim.height;

          let drawW = naturalW;
          let drawH = naturalH;
          if (drawW > maxWidth || drawH > maxHeight) {
            const ratio = Math.min(maxWidth / drawW, maxHeight / drawH);
            drawW = Math.max(Math.round(drawW * ratio), 1);
            drawH = Math.max(Math.round(drawH * ratio), 1);
          }

          const canvas = document.createElement('canvas');
          canvas.width = drawW;
          canvas.height = drawH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          if (preferredType === 'jpg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, drawW, drawH);
          } else {
            ctx.clearRect(0, 0, drawW, drawH);
          }

          ctx.drawImage(img, 0, 0, drawW, drawH);

          const outputUrl =
            preferredType === 'png'
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', 0.88);

          const bytes = base64ToUint8Array(outputUrl);
          const detected = detectImageFormat(bytes) || preferredType;

          resolve({
            data: bytes,
            width: drawW,
            height: drawH,
            type: detected,
          });
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = source;
    });
  } catch {
    return null;
  }
}

export interface CustomReportData {
  table1Groups?: { label: string; items: string[]; keterangan: string }[];
  documentationPhotos?: { foto: string; keterangan: string }[];
  latarBelakang?: string;
  tujuan?: string;
  waktuPelaksanaan?: string;
  penutup?: string;
}

// Table borders standard for official ministry documents
const OFFICIAL_TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

export async function exportReportToDocx(
  config: ReportConfig,
  profile: UserProfile,
  entries: LogbookEntry[],
  customData?: CustomReportData
) {
  const periodTitle = getReportPeriodTitle(config);
  const periodText = getReportPeriodText(config);

  // Filter entries according to config and sort chronologically from earliest to latest date (1 -> 31)
  const filtered = entries
    .filter((e) => {
      const d = new Date(e.tanggal);
      const entryYear = d.getFullYear();
      const entryMonth = d.getMonth() + 1;

      if (config.tipe === 'semua') {
        return true;
      }

      if (entryYear !== config.tahun) return false;

      if (config.tipe === 'bulanan') {
        return entryMonth === config.bulan;
      }
      if (config.tipe === 'triwulan') {
        const quarterMonths = {
          1: [1, 2, 3],
          2: [4, 5, 6],
          3: [7, 8, 9],
          4: [10, 11, 12],
        }[config.triwulan] || [];
        return quarterMonths.includes(entryMonth);
      }
      return true;
    })
    .sort((a, b) => {
      const dateDiff = a.tanggal.localeCompare(b.tanggal);
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.waktuMulai && a.waktuMulai !== '-' ? a.waktuMulai : '';
      const timeB = b.waktuMulai && b.waktuMulai !== '-' ? b.waktuMulai : '';
      const timeDiff = timeA.localeCompare(timeB);
      if (timeDiff !== 0) return timeDiff;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  // Grouping for Table 1
  type GroupedActivity = {
    label: string;
    items: string[];
    keterangan: string;
  };

  let table1Groups: GroupedActivity[] = [];

  if (customData?.table1Groups && customData.table1Groups.length > 0) {
    table1Groups = customData.table1Groups;
  } else if (config.tipe === 'triwulan') {
    const quarterMonths = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    }[config.triwulan] || [];

    quarterMonths.forEach((m) => {
      const monthEntries = filtered.filter((e) => new Date(e.tanggal).getMonth() + 1 === m);
      const items: string[] = [];

      monthEntries.forEach((e) => {
        if (e.kehadiran === 'Sakit') {
          items.push(`Izin Sakit: ${cleanDocxText(e.keterangan || 'Istirahat Sakit')}`);
        } else if (e.kehadiran === 'Cuti') {
          items.push(`Cuti: ${cleanDocxText(e.keterangan || 'Cuti Resmi')}`);
        } else {
          const locInfo = e.lokasiPekerjaan && e.lokasiPekerjaan !== '-' ? ` (${cleanDocxText(e.lokasiPekerjaan)})` : '';
          items.push(`${cleanDocxText(e.uraianPekerjaan)}${locInfo}`);
        }
      });

      if (items.length === 0) {
        items.push('Pelaksanaan tugas operasional kebun dan pemeliharaan rutin');
      }

      table1Groups.push({
        label: MONTH_NAMES[m - 1],
        items,
        keterangan: '-',
      });
    });
  } else if (config.tipe === 'bulanan' || config.tipe === 'semua') {
    filtered.forEach((e) => {
      const d = new Date(e.tanggal);
      const dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      let itemDesc = '';
      if (e.kehadiran === 'Sakit') {
        itemDesc = `Izin Sakit: ${cleanDocxText(e.keterangan || 'Istirahat Sakit')}${e.suratSakit ? ' (Surat Dokter Terlampir)' : ''}`;
      } else if (e.kehadiran === 'Cuti') {
        itemDesc = `Cuti: ${cleanDocxText(e.keterangan || 'Cuti Resmi')}`;
      } else {
        let desc = cleanDocxText(e.uraianPekerjaan);
        const locDetails: string[] = [];
        if (e.lokasiPekerjaan && e.lokasiPekerjaan !== '-') locDetails.push(`Lokasi: ${cleanDocxText(e.lokasiPekerjaan)}`);
        if (e.luasLahan && e.luasLahan !== '-') locDetails.push(`Luas: ${cleanDocxText(formatAreaUnit(e.luasLahan))}`);
        if (e.keterangan && e.keterangan !== '-') locDetails.push(`Ket: ${cleanDocxText(e.keterangan)}`);
        if (locDetails.length > 0) {
          desc += ` (${locDetails.join(', ')})`;
        }
        itemDesc = desc;
      }

      table1Groups.push({
        label: dateStr,
        items: [itemDesc],
        keterangan: cleanDocxText(e.kehadiran || 'WFO'),
      });
    });
  } else {
    // Tahunan
    [1, 2, 3, 4].forEach((q) => {
      const qMonths = ({ 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] } as Record<number, number[]>)[q] || [];
      const qEntries = filtered.filter((e) => qMonths.includes(new Date(e.tanggal).getMonth() + 1));
      const items = qEntries.map((e) => {
        if (e.kehadiran === 'Sakit') return `Izin Sakit: ${cleanDocxText(e.keterangan || '-')}`;
        if (e.kehadiran === 'Cuti') return `Cuti: ${cleanDocxText(e.keterangan || '-')}`;
        return cleanDocxText(e.uraianPekerjaan);
      });
      if (items.length === 0) {
        items.push('Pelaksanaan tugas operasional dan pemeliharaan kebun');
      }
      table1Groups.push({
        label: `Triwulan ${ROMAN_QUARTERS[q - 1]}`,
        items,
        keterangan: `${qEntries.length} Catatan`,
      });
    });
  }

  // Pre-load rasterized images for Table 2 (Dokumentasi Kegiatan)
  const documentationRows: {
    imageData: { data: Uint8Array; width: number; height: number; type: 'png' | 'jpg' };
    keterangan: string;
  }[] = [];

  if (customData?.documentationPhotos && customData.documentationPhotos.length > 0) {
    for (const doc of customData.documentationPhotos) {
      if (doc.foto) {
        const imgData = await loadValidDocxImage(doc.foto, 'jpg', { width: 220, height: 165 });
        if (imgData) {
          documentationRows.push({
            imageData: imgData,
            keterangan: cleanDocxText(doc.keterangan || 'Dokumentasi kegiatan operasional'),
          });
        }
      }
    }
  } else {
    for (const entry of filtered) {
      if (entry.kehadiran === 'WFO' && entry.fotoSebelum) {
        const imgData = await loadValidDocxImage(entry.fotoSebelum, 'jpg', { width: 220, height: 165 });
        if (imgData) {
          documentationRows.push({
            imageData: imgData,
            keterangan: cleanDocxText(entry.uraianPekerjaan || 'Dokumentasi pekerjaan'),
          });
        }
      }
    }
  }

  // Table 1 column widths in twips (Total = 8738 twips = A4 printable width)
  const T1_WIDTHS = [650, 1600, 5100, 1388];

  const table1DocRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: T1_WIDTHS[0], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No.', bold: true })] })],
        }),
        new TableCell({
          width: { size: T1_WIDTHS[1], type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: config.tipe === 'bulanan' ? 'Tanggal' : config.tipe === 'triwulan' ? 'Bulan' : 'Periode',
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: T1_WIDTHS[2], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Rincian Pekerjaan', bold: true })] })],
        }),
        new TableCell({
          width: { size: T1_WIDTHS[3], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Keterangan', bold: true })] })],
        }),
      ],
    }),
  ];

  table1Groups.forEach((group, index) => {
    const itemParagraphs = group.items.map(
      (item) =>
        new Paragraph({
          children: [
            new TextRun({ text: '• ', bold: true }),
            new TextRun({ text: cleanDocxText(item) }),
          ],
          spacing: { after: 100 },
        })
    );

    table1DocRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: T1_WIDTHS[0], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(index + 1) })] })],
          }),
          new TableCell({
            width: { size: T1_WIDTHS[1], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cleanDocxText(group.label) })] })],
          }),
          new TableCell({
            width: { size: T1_WIDTHS[2], type: WidthType.DXA },
            children: itemParagraphs.length > 0 ? itemParagraphs : [new Paragraph({ text: '-' })],
          }),
          new TableCell({
            width: { size: T1_WIDTHS[3], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cleanDocxText(group.keterangan) })] })],
          }),
        ],
      })
    );
  });

  // Table 2 column widths in twips (Total = 8738 twips)
  const T2_WIDTHS = [3900, 4838];

  const table2DocRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: T2_WIDTHS[0], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Foto', bold: true })] })],
        }),
        new TableCell({
          width: { size: T2_WIDTHS[1], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Keterangan', bold: true })] })],
        }),
      ],
    }),
  ];

  if (documentationRows.length === 0) {
    // Exactly 2 cells to match the 2 table grid columns (avoids WPS Office mobile gridSpan parse bug)
    table2DocRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: T2_WIDTHS[0], type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '-', italics: true })],
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
          new TableCell({
            width: { size: T2_WIDTHS[1], type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Tidak ada dokumentasi foto kegiatan untuk periode ini.', italics: true })],
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
        ],
      })
    );
  } else {
    documentationRows.forEach((doc) => {
      table2DocRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: T2_WIDTHS[0], type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      type: doc.imageData.type,
                      data: doc.imageData.data,
                      transformation: {
                        width: doc.imageData.width,
                        height: doc.imageData.height,
                      },
                    }),
                  ],
                  spacing: { before: 120, after: 120 },
                }),
              ],
            }),
            new TableCell({
              width: { size: T2_WIDTHS[1], type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: '• ', bold: true }),
                    new TextRun({ text: cleanDocxText(doc.keterangan) }),
                  ],
                  spacing: { before: 120, after: 120 },
                }),
              ],
            }),
          ],
        })
      );
    });
  }

  // Pre-load official Kementan logo (Pristine PNG fetched directly)
  let coverLogoRun: ImageRun | null = null;
  try {
    const logoData = await loadOfficialLogo();
    if (logoData) {
      coverLogoRun = new ImageRun({
        type: logoData.type,
        data: logoData.data,
        transformation: {
          width: logoData.width,
          height: logoData.height,
        },
      });
    }
  } catch (err) {
    console.warn('Could not load official logo for docx:', err);
  }

  // Pre-load signature if available (Direct Base64 PNG)
  let signatureRun: ImageRun | null = null;
  if (profile.tandaTanganUrl) {
    try {
      const sigData = await loadValidDocxImage(profile.tandaTanganUrl, 'png', { width: 130, height: 55 });
      if (sigData) {
        signatureRun = new ImageRun({
          type: sigData.type,
          data: sigData.data,
          transformation: {
            width: sigData.width,
            height: sigData.height,
          },
        });
      }
    } catch (sigErr) {
      console.warn('Could not load signature for docx:', sigErr);
    }
  }

  // Report text defaults with custom edit support
  const defaultLatarBelakang =
    'Dalam rangka mendukung kelancaran pelaksanaan tugas dan fungsi organisasi, diperlukan dukungan sumber daya manusia yang mampu melaksanakan kegiatan operasional dan pelayanan perkantoran secara efektif, tertib, dan berkesinambungan. Salah satu bentuk dukungan tersebut dilaksanakan melalui penempatan ' +
    cleanDocxText(profile.statusKepegawaian || 'pegawai') +
    ' pada jabatan ' +
    cleanDocxText(profile.jabatan || 'operasional') +
    '.\n\n' +
    cleanDocxText(profile.statusKepegawaian || 'Pegawai') +
    ' pada jabatan tersebut memiliki peran dalam membantu pelaksanaan kegiatan administrasi, layanan internal, pengelolaan kebutuhan umum, penataan dokumen, pengelolaan sarana dan prasarana, serta dukungan terhadap berbagai kegiatan kedinasan. Pelaksanaan tugas tersebut diperlukan untuk memastikan kegiatan operasional kantor dapat berjalan dengan baik dan memberikan pelayanan yang optimal kepada pegawai maupun unit kerja. Sejalan dengan kebutuhan organisasi, pelaksanaan tugas ' +
    cleanDocxText(profile.statusKepegawaian || 'pegawai') +
    ' perlu diarahkan secara jelas berdasarkan peran, tanggung jawab, dan hasil yang diharapkan. Oleh karena itu, diperlukan uraian mengenai ruang lingkup pekerjaan dan hasil pelaksanaan sebagai dasar dalam pengelolaan, pemantauan, dan evaluasi kinerja ' +
    cleanDocxText(profile.statusKepegawaian || 'pegawai') +
    '.';

  const defaultTujuan =
    'Tujuan penyusunan laporan pelaksanaan tugas dan fungsi jabatan ' +
    cleanDocxText(profile.jabatan || 'operasional') +
    ', adalah sebagai bentuk pertanggungjawaban kinerja pegawai di lingkungan ' +
    cleanDocxText(profile.instansiInduk || 'Pusat Perlindungan Varietas Tanaman dan Perizinan Pertanian') +
    ', sesuai dengan uraian tugas yang tercantum dalam Matriks Peran Hasil (MPH) yang ditetapkan.';

  const defaultWaktuPelaksanaan =
    'Kegiatan ' +
    cleanDocxText(profile.jabatan || 'operasional') +
    ' dilaksanakan di ' +
    cleanDocxText(profile.unitKerja || 'Kebun Pemeriksaan Substantif PVT I Manoko') +
    ' pada satuan Kerja Kantor Pusat ' +
    cleanDocxText(profile.instansiInduk || 'PVTPP') +
    ' pada ' +
    periodText +
    '.';

  const defaultPenutup =
    'Pada ' +
    periodText +
    ', pelaksanaan tugas ' +
    cleanDocxText(profile.statusKepegawaian || 'pegawai') +
    ' jabatan ' +
    cleanDocxText(profile.jabatan || 'operasional') +
    ' telah mendukung kelancaran operasional KPS PVT I Manoko. Kegiatan utama meliputi pengolahan lahan, pemeliharaan, penyiraman, penyiangan dan pengendalian gulma, panen dan penanganan hasil panen, serta pelaksanaan uji BUSS, pembersihan area kerja, pemeliharaan sarana pendukung, dan dukungan kegiatan lainnya yang berhubungan dengan kegiatan operasional kebun. Secara umum kegiatan terlaksana secara tertib, efektif, dan sesuai dengan tugas serta mendukung pencapaian tujuan dan kelancaran tugas organisasi.\n\nDemikian laporan ini disampaikan. Atas perhatian dan kerjasamanya, diucapkan terima kasih.';

  const latarBelakangParagraphs = createJustifiedParagraphs(customData?.latarBelakang || defaultLatarBelakang, 240);
  const tujuanParagraphs = createJustifiedParagraphs(customData?.tujuan || defaultTujuan, 240);
  const waktuParagraphs = createJustifiedParagraphs(customData?.waktuPelaksanaan || defaultWaktuPelaksanaan, 240);
  const penutupParagraphs = createJustifiedParagraphs(customData?.penutup || defaultPenutup, 240);

  // Date formatting for signature date
  const printDate = config.tanggalCetak ? new Date(config.tanggalCetak) : new Date();
  const printDay = isNaN(printDate.getDate()) ? new Date().getDate() : printDate.getDate();
  const printMonth = isNaN(printDate.getMonth()) ? MONTH_NAMES[new Date().getMonth()] : MONTH_NAMES[printDate.getMonth()];
  const printYear = isNaN(printDate.getFullYear()) ? new Date().getFullYear() : printDate.getFullYear();
  const printDateString = `${cleanDocxText(profile.tempatPenetapan || 'Manoko')}, ${printDay} ${printMonth} ${printYear}`;

  // Assemble OpenXML Document with full standards compliance
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24, // 12pt font standard
            color: '000000',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          // ==================== COVER PAGE ====================
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'LAPORAN KINERJA', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'PELAKSANAAN TUGAS OPERASIONAL KANTOR', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: periodTitle, bold: true, size: 28 }),
            ],
            spacing: { after: 1000 },
          }),

          // Official Ministry Logo on Cover Page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: coverLogoRun
              ? [coverLogoRun]
              : [new TextRun({ text: '❖ ❖ ❖', size: 36, color: 'D97706' })],
            spacing: { after: 1000 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Disusun oleh :', size: 24 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: cleanDocxText(profile.nama).toUpperCase(), bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatDocxNip(profile.nip), size: 24 })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: cleanDocxText(profile.jabatan), size: 24 })],
            spacing: { after: 1800 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: cleanDocxText(profile.instansiInduk).toUpperCase(),
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(config.tahun), bold: true, size: 24 })],
          }),

          // ==================== BAB I PENDAHULUAN ====================
          new Paragraph({
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BAB I', bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'PENDAHULUAN', bold: true, size: 26 })],
            spacing: { after: 480 },
          }),

          new Paragraph({
            children: [new TextRun({ text: '1.1   LATAR BELAKANG', bold: true, size: 24 })],
            spacing: { after: 200 },
          }),
          ...latarBelakangParagraphs,

          new Paragraph({
            children: [new TextRun({ text: '1.2   TUJUAN', bold: true, size: 24 })],
            spacing: { before: 200, after: 200 },
          }),
          ...tujuanParagraphs,

          new Paragraph({
            children: [new TextRun({ text: '1.3   WAKTU PELAKSANAAN', bold: true, size: 24 })],
            spacing: { before: 200, after: 200 },
          }),
          ...waktuParagraphs,

          // ==================== BAB II AKUNTABILITAS KINERJA ====================
          new Paragraph({
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BAB II', bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'AKUNTABILITAS KINERJA', bold: true, size: 26 })],
            spacing: { after: 480 },
          }),

          new Paragraph({
            children: [new TextRun({ text: '2.1   HASIL PELAKSANAAN', bold: true, size: 24 })],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Kegiatan ${cleanDocxText(profile.jabatan)}`, size: 24 })],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tabel 1. Rincian kegiatan operator layanan operasional ${periodText}`,
                size: 22,
                italics: true,
              }),
            ],
            spacing: { after: 240 },
          }),

          new Table({
            columnWidths: T1_WIDTHS,
            width: { size: 8738, type: WidthType.DXA },
            borders: OFFICIAL_TABLE_BORDERS,
            rows: table1DocRows,
          }),

          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tabel 2. Dokumentasi Kegiatan',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 240 },
          }),

          new Table({
            columnWidths: T2_WIDTHS,
            width: { size: 8738, type: WidthType.DXA },
            borders: OFFICIAL_TABLE_BORDERS,
            rows: table2DocRows,
          }),

          // ==================== BAB III PENUTUP ====================
          new Paragraph({
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BAB III', bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'PENUTUP', bold: true, size: 26 })],
            spacing: { after: 480 },
          }),

          ...penutupParagraphs,

          // Signature Block
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: printDateString,
              }),
            ],
            spacing: { before: 400 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: cleanDocxText(profile.jabatan) })],
            spacing: { after: 240 },
          }),

          ...(signatureRun
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [signatureRun],
                  spacing: { before: 120, after: 120 },
                }),
              ]
            : [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: '' })],
                  spacing: { before: 480, after: 480 },
                }),
              ]),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: cleanDocxText(profile.nama), bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatDocxNip(profile.nip) })],
          }),
        ],
      },
    ],
  });

  // Pack with strict OpenXML MIME type
  const rawBlob = await Packer.toBlob(doc);
  const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const blob = new Blob([rawBlob], { type: docxMime });

  const safeName = (profile.nama || 'Pegawai').replace(/\s+/g, '_');
  const safePeriod = periodTitle.replace(/\s+/g, '_');
  const fileName = `Laporan_Kinerja_${safeName}_${safePeriod}.docx`;

  await downloadOrShareBlob(blob, fileName, `Laporan Kinerja - ${periodTitle} (.docx)`);
}
