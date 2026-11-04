import { LogbookEntry, ReportConfig } from '../types/logbook';
import { parseDateDetails } from './storage';

export const OFFICIAL_CATEGORIES = [
  'pengolahan lahan',
  'persiapan tanam',
  'penanaman',
  'pemeliharaan tanaman',
  'sanitasi lahan',
  'Panen',
  'kegiatan kedinasan',
  'pemeliharaan sarana dan prasarana',
  'kegiatan lainnya',
] as const;

export type OfficialCategoryTitle = typeof OFFICIAL_CATEGORIES[number];

export interface AiCategoryItem {
  categoryTitle: string;
  summary: string;
}

export interface AiMonthSummary {
  monthName: string;
  categories: AiCategoryItem[];
  keterangan: string;
}

export interface AiSummarizeResult {
  months: AiMonthSummary[];
  isAiGenerated: boolean;
  generatedAt: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Intelligent keyword-based classifier for offline and fallback support.
 * Guarantees 100% adherence to the user's 9 official ministerial categories.
 */
export function classifyActivity(text: string): OfficialCategoryTitle {
  const lower = text.toLowerCase();

  // 1. Kegiatan Kedinasan (Upacara kenegaraan, apel, rapat dinas)
  if (/upacara|apel|kenegaraan|kemerdekaan|hari pahlawan|rapat dinas|koordinasi kantor|bimtek|pelatihan dinas|seminar|dinas luar|pameran|kedinasan/i.test(lower)) {
    return 'kegiatan kedinasan';
  }

  // 2. Pemeliharaan Sarana dan Prasarana (Mesin babad rumput, traktor, pompa, irigasi)
  if (/mesin babad|mesin babat|traktor|pompa air|irigasi|instalasi selang|perbaikan alat|perbaikan mesin|servis|sarana dan prasarana|sarpras|genset|pagar kebun|parit/i.test(lower)) {
    return 'pemeliharaan sarana dan prasarana';
  }

  // 3. Panen (Proses pemanenan sayuran & pasca panen)
  if (/panen|pemanenan|petik|sortasi|timbang|hasil panen|grading|kemas sayur|pasca panen/i.test(lower)) {
    return 'Panen';
  }

  // 4. Sanitasi Lahan (Pembersihan tanaman dari gulma, penyiangan)
  if (/gulma|penyiangan|weeding|babad rumput liar|cabut rumput|kebersihan gulma|sanitasi lahan|sanitasi/i.test(lower)) {
    return 'sanitasi lahan';
  }

  // 5. Pemeliharaan Tanaman (Penyiraman, penyemprotan, pemupukan, pruning)
  if (/siram|penyiraman|semprot|pestisida|fungisida|insektisida|pupuk|pemupukan|wiwit|pruning|pangkas|tali ajir|kocorkan pupuk|pemeliharaan/i.test(lower)) {
    return 'pemeliharaan tanaman';
  }

  // 6. Penanaman (Proses penanaman bibit/benih)
  if (/penanaman|tanam bibit|tanam benih|tancap|transplanting|sebar benih|tanam kembali/i.test(lower)) {
    return 'penanaman';
  }

  // 7. Persiapan Tanam (Penyemaian, pembuatan lubang tanam, pembibitan, mulsa)
  if (/semai|penyemaian|pembibitan|lubang tanam|pasang mulsa|mulsa|media semai|tray semai|persiapan tanam/i.test(lower)) {
    return 'persiapan tanam';
  }

  // 8. Pengolahan Lahan (Pembajakan, bedengan, cangkul)
  if (/olah lahan|pengolahan lahan|bedengan|guludan|cangkul|bajak|gembur|garpu tanah|meratakan tanah/i.test(lower)) {
    return 'pengolahan lahan';
  }

  // 9. Kegiatan Lainnya (Pendukung operasional kantor atau kebun)
  return 'kegiatan lainnya';
}

/**
 * Fallback summarizer that consolidates similar entries per category for a given month.
 */
export function generateLocalReportSummary(
  entries: LogbookEntry[],
  reportConfig: ReportConfig
): AiSummarizeResult {
  // Determine relevant months based on report type
  let targetMonths: number[] = [];
  if (reportConfig.tipe === 'triwulan') {
    const quarterMap: Record<number, number[]> = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };
    targetMonths = quarterMap[reportConfig.triwulan] || [1, 2, 3];
  } else if (reportConfig.tipe === 'tahunan') {
    targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else {
    targetMonths = [reportConfig.bulan];
  }

  const resultMonths: AiMonthSummary[] = [];

  targetMonths.forEach((monthNum) => {
    const monthName = MONTH_NAMES[monthNum - 1];
    
    // Filter entries for this month & year
    const monthEntries = entries.filter((e) => {
      if (!e.tanggal) return false;
      const pd = parseDateDetails(e.tanggal);
      return pd.year === reportConfig.tahun && pd.month === monthNum;
    });

    if (monthEntries.length === 0) {
      if (reportConfig.tipe === 'triwulan' || reportConfig.tipe === 'tahunan') {
        resultMonths.push({
          monthName,
          categories: [],
          keterangan: '-',
        });
      }
      return;
    }

    // Bucket by official categories
    const categoryBuckets = new Map<OfficialCategoryTitle, {
      items: string[];
      locations: Set<string>;
      areas: Set<string>;
    }>();

    // Initialize in official order
    OFFICIAL_CATEGORIES.forEach((cat) => {
      categoryBuckets.set(cat, {
        items: [],
        locations: new Set(),
        areas: new Set(),
      });
    });

    monthEntries.forEach((entry) => {
      const cat = classifyActivity(entry.uraianPekerjaan || '');
      const bucket = categoryBuckets.get(cat);
      if (bucket) {
        if (entry.uraianPekerjaan && !bucket.items.includes(entry.uraianPekerjaan.trim())) {
          bucket.items.push(entry.uraianPekerjaan.trim());
        }
        if (entry.lokasiPekerjaan && entry.lokasiPekerjaan !== '-') {
          bucket.locations.add(entry.lokasiPekerjaan.trim());
        }
        if (entry.luasLahan && entry.luasLahan !== '-') {
          bucket.areas.add(entry.luasLahan.trim());
        }
      }
    });

    // Build consolidated summaries for active categories
    const activeCategories: AiCategoryItem[] = [];

    OFFICIAL_CATEGORIES.forEach((cat) => {
      const bucket = categoryBuckets.get(cat);
      if (bucket && bucket.items.length > 0) {
        let consolidatedText = bucket.items.join(', ');
        
        // Append location & area context if available
        const details: string[] = [];
        if (bucket.locations.size > 0) {
          details.push(`Lokasi: ${Array.from(bucket.locations).join(', ')}`);
        }
        if (bucket.areas.size > 0) {
          details.push(`Luas: ${Array.from(bucket.areas).join(', ')}`);
        }
        if (details.length > 0) {
          consolidatedText += ` (${details.join('; ')})`;
        }

        activeCategories.push({
          categoryTitle: cat,
          summary: consolidatedText,
        });
      }
    });

    // Check for Sakit / Cuti records to include in attendance accountability
    const sakitCount = monthEntries.filter((e) => e.kehadiran === 'Sakit').length;
    const cutiCount = monthEntries.filter((e) => e.kehadiran === 'Cuti').length;
    if (sakitCount > 0 || cutiCount > 0) {
      const absensiList: string[] = [];
      if (sakitCount > 0) absensiList.push(`Izin Sakit (${sakitCount} hari)`);
      if (cutiCount > 0) absensiList.push(`Cuti Resmi (${cutiCount} hari)`);
      
      const kedinasanCategory = activeCategories.find((c) => c.categoryTitle === 'kegiatan kedinasan');
      if (kedinasanCategory) {
        kedinasanCategory.summary += `; Status kehadiran: ${absensiList.join(', ')}`;
      } else {
        activeCategories.push({
          categoryTitle: 'kegiatan kedinasan',
          summary: `Status kehadiran pegawai: ${absensiList.join(', ')}`,
        });
      }
    }

    if (activeCategories.length > 0) {
      resultMonths.push({
        monthName,
        categories: activeCategories,
        keterangan: 'WFO / Kedinasan',
      });
    } else if (reportConfig.tipe === 'triwulan' || reportConfig.tipe === 'tahunan') {
      resultMonths.push({
        monthName,
        categories: [],
        keterangan: '-',
      });
    }
  });

  return {
    months: resultMonths,
    isAiGenerated: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Main API caller: requests server-side Gemini 3.8 Flash summarization,
 * falling back gracefully to local rule-based consolidation if offline or error occurs.
 */
export async function summarizeReport(
  entries: LogbookEntry[],
  reportConfig: ReportConfig
): Promise<AiSummarizeResult> {
  // If no entries, return empty
  if (!entries || entries.length === 0) {
    return {
      months: [],
      isAiGenerated: false,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const payload = {
      periodType: reportConfig.tipe,
      year: reportConfig.tahun,
      quarter: reportConfig.triwulan,
      month: reportConfig.bulan,
      entries: entries.map((e) => ({
        tanggal: e.tanggal,
        uraianPekerjaan: e.uraianPekerjaan,
        lokasiPekerjaan: e.lokasiPekerjaan,
        luasLahan: e.luasLahan,
        kehadiran: e.kehadiran,
        keterangan: e.keterangan,
      })),
    };

    const res = await fetch('/api/ai/summarize-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.months && Array.isArray(data.months) && data.months.length > 0) {
        return {
          months: data.months,
          isAiGenerated: true,
          generatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[AI Summarizer] Server-side call failed, activating local rule-based classifier:', err);
  }

  // Graceful local fallback (offline or network error)
  return generateLocalReportSummary(entries, reportConfig);
}
