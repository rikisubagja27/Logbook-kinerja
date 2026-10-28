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
import { saveAs } from 'file-saver';
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
  if (config.tipe === 'bulanan') {
    return `BULAN ${MONTH_NAMES[config.bulan - 1]?.toUpperCase()} TAHUN ${config.tahun}`;
  }
  if (config.tipe === 'triwulan') {
    return `TRIWULAN ${ROMAN_QUARTERS[config.triwulan - 1]} TAHUN ${config.tahun}`;
  }
  return `TAHUN ${config.tahun}`;
}

export function getReportPeriodText(config: ReportConfig): string {
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

// Convert dataURL (including SVG dataURL) to raster JPEG/PNG Uint8Array
async function rasterizeImageToUint8Array(dataUrl: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    if (!dataUrl) return null;
    
    // If it's an SVG or we need to ensure clean rasterization
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const targetWidth = Math.min(img.width || 400, 600);
        const scale = targetWidth / (img.width || 400);
        const targetHeight = Math.round((img.height || 300) * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.85);
        const uint8 = base64ToUint8Array(jpegUrl);
        resolve({ data: uint8, width: 220, height: Math.round((220 * targetHeight) / targetWidth) });
      };
      img.onerror = () => {
        // Fallback: try raw base64 if it's already jpeg/png
        try {
          if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/png')) {
            const uint8 = base64ToUint8Array(dataUrl);
            resolve({ data: uint8, width: 220, height: 165 });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.src = dataUrl;
    });
  } catch (e) {
    console.error('Error rasterizing image:', e);
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

export async function exportReportToDocx(
  config: ReportConfig,
  profile: UserProfile,
  entries: LogbookEntry[],
  customData?: CustomReportData
) {
  const periodTitle = getReportPeriodTitle(config);
  const periodText = getReportPeriodText(config);

  // Filter entries according to config
  const filtered = entries.filter((e) => {
    const d = new Date(e.tanggal);
    const entryYear = d.getFullYear();
    const entryMonth = d.getMonth() + 1;

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
    return true; // Tahunan includes whole year
  });

  // Grouping for Tabel 1
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
          items.push(`Izin Sakit: ${e.keterangan || 'Istirahat Sakit'}`);
        } else if (e.kehadiran === 'Cuti') {
          items.push(`Cuti: ${e.keterangan || 'Cuti Resmi'}`);
        } else {
          const locInfo = e.lokasiPekerjaan && e.lokasiPekerjaan !== '-' ? ` (${e.lokasiPekerjaan})` : '';
          items.push(`${e.uraianPekerjaan}${locInfo}`);
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
  } else if (config.tipe === 'bulanan') {
    // For bulanan, show entries in detail
    filtered.forEach((e) => {
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
        if (e.luasLahan && e.luasLahan !== '-') locDetails.push(`Luas: ${formatAreaUnit(e.luasLahan)}`);
        if (e.keterangan && e.keterangan !== '-') locDetails.push(`Ket: ${e.keterangan}`);
        if (locDetails.length > 0) {
          desc += ` (${locDetails.join(', ')})`;
        }
        itemDesc = desc;
      }

      table1Groups.push({
        label: dateStr,
        items: [itemDesc],
        keterangan: e.kehadiran || 'WFO',
      });
    });
  } else {
    // Tahunan: group by quarter
    [1, 2, 3, 4].forEach((q) => {
      const qMonths = ({ 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] } as Record<number, number[]>)[q] || [];
      const qEntries = filtered.filter((e) => qMonths.includes(new Date(e.tanggal).getMonth() + 1));
      const items = qEntries.map((e) => {
        if (e.kehadiran === 'Sakit') return `Izin Sakit: ${e.keterangan || '-'}`;
        if (e.kehadiran === 'Cuti') return `Cuti: ${e.keterangan || '-'}`;
        return e.uraianPekerjaan;
      });
      if (items.length === 0) {
        items.push('Pelaksanaan tugas operasional dan pemeliharaan kebun');
      }
      table1Groups.push({
        label: `Triwulan ${ROMAN_QUARTERS[q - 1]}`,
        items,
        keterangan: `${qEntries.length} Kegiatan`,
      });
    });
  }

  // Pre-load rasterized images for Tabel 2 (only "Foto Sebelum", as required for WFO entries)
  const documentationRows = [];
  if (customData?.documentationPhotos && customData.documentationPhotos.length > 0) {
    for (const doc of customData.documentationPhotos) {
      if (doc.foto) {
        const imgData = await rasterizeImageToUint8Array(doc.foto);
        if (imgData) {
          documentationRows.push({
            imageData: imgData,
            keterangan: doc.keterangan,
          });
        }
      }
    }
  } else {
    for (const entry of filtered) {
      if (entry.kehadiran === 'WFO' && entry.fotoSebelum) {
        const imgData = await rasterizeImageToUint8Array(entry.fotoSebelum);
        if (imgData) {
          documentationRows.push({
            imageData: imgData,
            keterangan: entry.uraianPekerjaan,
          });
        }
      }
    }
  }

  // Build Table 1 Rows
  const table1DocRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No.', bold: true })] })],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: config.tipe === 'bulanan' ? 'Tanggal' : config.tipe === 'triwulan' ? 'Bulan' : 'Periode', bold: true })] })],
        }),
        new TableCell({
          width: { size: 58, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Rincian Pekerjaan', bold: true })] })],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
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
            new TextRun({ text: item }),
          ],
          spacing: { after: 120 },
        })
    );

    table1DocRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(index + 1) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: group.label })] })],
          }),
          new TableCell({
            children: itemParagraphs.length > 0 ? itemParagraphs : [new Paragraph({ text: '-' })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: group.keterangan })] })],
          }),
        ],
      })
    );
  });

  // Build Table 2 Rows (Dokumentasi Kegiatan)
  const table2DocRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Foto', bold: true })] })],
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Keterangan', bold: true })] })],
        }),
      ],
    }),
  ];

  documentationRows.forEach((doc) => {
    table2DocRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    type: 'jpg',
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
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '• ', bold: true }),
                  new TextRun({ text: doc.keterangan }),
                ],
                spacing: { before: 120, after: 120 },
              }),
            ],
          }),
        ],
      })
    );
  });

  // Pre-load official Kementan logo
  let coverLogoRun: ImageRun | null = null;
  try {
    const logoData = await rasterizeImageToUint8Array('/logo_kementan.png');
    if (logoData) {
      coverLogoRun = new ImageRun({
        type: 'png',
        data: logoData.data,
        transformation: {
          width: 130,
          height: 130,
        },
      });
    }
  } catch (err) {
    console.warn('Could not load official logo for docx:', err);
  }

  // Pre-load signature if available
  let signatureRun: ImageRun | null = null;
  if (profile.tandaTanganUrl) {
    const sigData = await rasterizeImageToUint8Array(profile.tandaTanganUrl);
    if (sigData) {
      signatureRun = new ImageRun({
        type: 'png',
        data: sigData.data,
        transformation: {
          width: 140,
          height: 60,
        },
      });
    }
  }

  // Create Document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
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
          new Paragraph({ text: '', spacing: { before: 600 } }),
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
            spacing: { after: 1200 },
          }),

          // Official Ministry Logo on Cover Page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: coverLogoRun
              ? [coverLogoRun]
              : [new TextRun({ text: '❖ ❖ ❖', size: 36, color: 'D97706' })],
            spacing: { after: 1200 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Disusun oleh :', size: 24 })],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: profile.nama.toUpperCase(), bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: formatDocxNip(profile.nip), size: 24 })],
            spacing: { after: 360 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: profile.jabatan, size: 24 })],
            spacing: { after: 2400 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: profile.instansiInduk.toUpperCase(),
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(config.tahun), bold: true, size: 24 })],
            pageBreakBefore: false,
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
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text:
                  'Dalam rangka mendukung kelancaran pelaksanaan tugas dan fungsi organisasi, diperlukan dukungan sumber daya manusia yang mampu melaksanakan kegiatan operasional dan pelayanan perkantoran secara efektif, tertib, dan berkesinambungan. Salah satu bentuk dukungan tersebut dilaksanakan melalui penempatan ' +
                  profile.statusKepegawaian +
                  ' pada jabatan ' +
                  profile.jabatan +
                  '.',
              }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text:
                  profile.statusKepegawaian +
                  ' pada jabatan tersebut memiliki peran dalam membantu pelaksanaan kegiatan administrasi, layanan internal, pengelolaan kebutuhan umum, penataan dokumen, pengelolaan sarana dan prasarana, serta dukungan terhadap berbagai kegiatan kedinasan. Pelaksanaan tugas tersebut diperlukan untuk memastikan kegiatan operasional kantor dapat berjalan dengan baik dan memberikan pelayanan yang optimal kepada pegawai maupun unit kerja. Sejalan dengan kebutuhan organisasi, pelaksanaan tugas ' +
                  profile.statusKepegawaian +
                  ' perlu diarahkan secara jelas berdasarkan peran, tanggung jawab, dan hasil yang diharapkan. Oleh karena itu, diperlukan uraian mengenai ruang lingkup pekerjaan dan hasil pelaksanaan sebagai dasar dalam pengelolaan, pemantauan, dan evaluasi kinerja ' +
                  profile.statusKepegawaian +
                  '.',
              }),
            ],
            spacing: { after: 480 },
          }),

          new Paragraph({
            children: [new TextRun({ text: '1.2   TUJUAN', bold: true, size: 24 })],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text:
                  'Tujuan penyusunan laporan pelaksanaan tugas dan fungsi jabatan ' +
                  profile.jabatan +
                  ', adalah sebagai bentuk pertanggungjawaban kinerja pegawai di lingkungan ' +
                  profile.instansiInduk +
                  ', sesuai dengan uraian tugas yang tercantum dalam Matriks Peran Hasil (MPH) yang ditetapkan.',
              }),
            ],
            spacing: { after: 480 },
          }),

          new Paragraph({
            children: [new TextRun({ text: '1.3   WAKTU PELAKSANAAN', bold: true, size: 24 })],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text:
                  'Kegiatan ' +
                  profile.jabatan +
                  ' dilaksanakan di ' +
                  profile.unitKerja +
                  ' pada satuan Kerja Kantor Pusat ' +
                  profile.instansiInduk +
                  ' (PVTPP) pada ' +
                  periodText +
                  '.',
              }),
            ],
            spacing: { after: 600 },
          }),

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
            children: [new TextRun({ text: `Kegiatan ${profile.jabatan}`, size: 24 })],
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
            rows: table1DocRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          new Paragraph({ text: '', spacing: { before: 480 } }),
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
            rows: table2DocRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
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

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text:
                  'Pada ' +
                  periodText +
                  ', pelaksanaan tugas ' +
                  profile.statusKepegawaian +
                  ' jabatan ' +
                  profile.jabatan +
                  ' telah mendukung kelancaran operasional KPS PVT I Manoko. Kegiatan utama meliputi pengolahan lahan, pemeliharaan, penyiraman, penyiangan dan pengendalian gulma, panen dan penanganan hasil panen, serta pelaksanaan uji BUSS, pembersihan area kerja, pemeliharaan sarana pendukung, dan dukungan kegiatan lainnya yang berhubungan dengan kegiatan operasional kebun. Secara umum kegiatan terlaksana secara tertib, efektif, dan sesuai dengan tugas serta mendukung pencapaian tujuan dan kelancaran tugas organisasi.',
              }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: 'Demikian laporan ini disampaikan. Atas perhatian dan kerjasamanya, diucapkan terima kasih.',
              }),
            ],
            spacing: { after: 720 },
          }),

          // Signature Block
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${profile.tempatPenetapan}, ${new Date(config.tanggalCetak).getDate()} ${
                  MONTH_NAMES[new Date(config.tanggalCetak).getMonth()]
                } ${new Date(config.tanggalCetak).getFullYear()}`,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: profile.jabatan })],
            spacing: { after: 240 },
          }),

          ...(signatureRun
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [signatureRun],
                  spacing: { after: 120 },
                }),
              ]
            : [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: '\n\n\n' })],
                  spacing: { after: 600 },
                }),
              ]),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: profile.nama, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatDocxNip(profile.nip) })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Laporan_Kinerja_${profile.nama.replace(/\s+/g, '_')}_${periodTitle.replace(/\s+/g, '_')}.docx`;
  await downloadOrShareBlob(blob, fileName, `Laporan Kinerja - ${periodTitle} (.docx)`);
}
