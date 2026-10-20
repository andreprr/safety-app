export type AnswerOption = "Ya" | "Tidak" | "Tidak Relevan" | "";

export interface QuestionItem {
  id: string;
  code: string;
  text: string;
  isReverse?: boolean;
  allowNA?: boolean; // Penanda pertanyaan yang memiliki opsi "Tidak Relevan"
}

export interface QuestionCategory {
  id: string;
  name: string;
  questions: QuestionItem[];
}

export interface InspectionDetailItem {
  id: string;
  code: string;
  kategori: string;
  pertanyaan: string;
  jawaban: AnswerOption;
  skor: number;
  is_reverse: boolean;
  is_negative: boolean;
  is_na?: boolean;
  temuan: string;
}

export interface CategoryScoreSummary {
  name: string;
  score: number;
  total: number; // Total pertanyaan relevan (setelah dikurangi Tidak Relevan)
  raw_total?: number; // Total pertanyaan awal di kategori ini
  na_count?: number; // Jumlah pertanyaan yang dijawab Tidak Relevan
  percentage: number;
}

export interface PerformanceK3Detail {
  total_pertanyaan: number; // Total pertanyaan relevan yang menjadi pembagi
  total_pertanyaan_awal?: number; // 48 pertanyaan
  total_tidak_relevan?: number; // Jumlah N/A
  total_skor: number;
  score_percentage: number;
  category_scores: Record<string, CategoryScoreSummary>;
  items: InspectionDetailItem[];
}

export interface PerformanceK3Record {
  id: string;
  nama_proyek: string;
  area: string;
  tanggal_inspection: string;
  detail_penilaian: PerformanceK3Detail;
  score_percentage: number;
  created_at?: string;
}

export const ALL_AREAS = [
  "Area 1 Jakarta",
  "Area 2 Bandung",
  "Area 3 Cirebon",
  "Area 4 Semarang",
  "Area 5 Purwokerto",
  "Area 6 Yogyakarta",
  "Area 7 Madiun",
  "Area 8 Surabaya",
  "Area 9 Jember",
  "Area 10 Medan",
  "Area 11 Padang",
  "Area 12 Palembang",
  "Area 13 Tanjung Karang",
  "Kantor Pusat",
];

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    id: "A",
    name: "Personil K3",
    questions: [
      { id: "a1", code: "A.1", text: "Terdapat personil K3?" },
      {
        id: "a2",
        code: "A.2",
        text: "Personil K3 proyek berkompeten (memiliki sertifikat AK3U / Ahli Muda K3 Konstruksi)?",
      },
      { id: "a3", code: "A.3", text: "Personil K3 sesuai dengan persyaratan KAK?" },
    ],
  },
  {
    id: "B",
    name: "DIREKSI KEET",
    questions: [
      { id: "b1", code: "B.1", text: "Pemasangan Safety Commitment di direksi keet?" },
      { id: "b2", code: "B.2", text: "Proyek telah terdaftar BPJS TK Konstruksi?" },
      {
        id: "b3",
        code: "B.3",
        text: "Terdapat papan informasi K3 (man hours, Near Miss, Incident, Accident)?",
      },
      { id: "b4", code: "B.4", text: "Terdapat spanduk/banner (5 Budaya Keselamatan, 5R)?" },
      { id: "b5", code: "B.5", text: "Toilet kondisi bersih dan layak digunakan?" },
      { id: "b6", code: "B.6", text: "Terdapat tempat cuci tangan?" },
      {
        id: "b7",
        code: "B.7",
        text: "Terdapat tempat sampah 3 warna (Organik, Anorganik, B3)?",
      },
      { id: "b8", code: "B.8", text: "Penerapan 5R (Ringkas, Rapih, Resik, Rawat, Rajin)?" },
    ],
  },
  {
    id: "C",
    name: "AREA KERJA PROYEK",
    questions: [
      { id: "c1", code: "C.1", text: "Terdapat temuan Unsafe Action di lapangan?", isReverse: true },
      {
        id: "c2",
        code: "C.2",
        text: "Terdapat temuan Unsafe Condition di lapangan?",
        isReverse: true,
      },
      { id: "c3", code: "C.3", text: "Safety Briefing dilakukan sebelum mulai pekerjaan?" },
      { id: "c4", code: "C.4", text: "Safety Induction dilakukan untuk pekerja baru/tamu?" },
      { id: "c5", code: "C.5", text: "Pemakaian APD lengkap sesuai pekerjaan?" },
      {
        id: "c6",
        code: "C.6",
        text: "Terdapat Train Watcher (TW) pada pekerjaan dekat jalur aktif?",
        allowNA: true,
      },
      {
        id: "c7",
        code: "C.7",
        text: "Spanduk, banner, dan rambu keselamatan tersedia di area kerja?",
      },
      {
        id: "c8",
        code: "C.8",
        text: "Proteksi safety net terpasang (untuk gedung tinggi)?",
        allowNA: true,
      },
      { id: "c9", code: "C.9", text: "Proteksi safety line terpasang di area bahaya?" },
      { id: "c10", code: "C.10", text: "Tabung APAR terdapat di area kerja panas?" },
      { id: "c11", code: "C.11", text: "Terdapat lampu penerangan saat pekerjaan lembur?" },
    ],
  },
  {
    id: "D",
    name: "ADMINISTRASI & DOKUMENTASI K3",
    questions: [
      { id: "d1", code: "D.1", text: "Dokumen RKK lengkap dan terealisasi periodik?" },
      { id: "d2", code: "D.2", text: "Izin kerja tersedia, berlaku, lengkap ttd?" },
      { id: "d3", code: "D.3", text: "Dokumen Hiradc/IBPR per pekerjaan tersedia?" },
      { id: "d4", code: "D.4", text: "Dokumen JSA per pekerjaan tersedia?" },
      { id: "d5", code: "D.5", text: "Laporan inspeksi sebelumnya ditindaklanjuti (ada bukti)?" },
      { id: "d6", code: "D.6", text: "Terdapat laporan harian, mingguan, bulanan K3?" },
    ],
  },
  {
    id: "E",
    name: "PERALATAN KERJA",
    questions: [
      {
        id: "e1",
        code: "E.1",
        text: "Alat berat memiliki SILO dan operator memiliki SIO?",
        allowNA: true,
      },
      { id: "e2", code: "E.2", text: "Alat kerja tangan di-checklist dengan hasil layak?" },
      {
        id: "e3",
        code: "E.3",
        text: "Pemasangan scaffolding sesuai standard?",
        allowNA: true,
      },
      {
        id: "e4",
        code: "E.4",
        text: "Alat pelindung jatuh (harness, dll) kondisi baik?",
        allowNA: true,
      },
      {
        id: "e5",
        code: "E.5",
        text: "Peralatan kerja panas (regulator, flashback arrestor) kondisi baik?",
        allowNA: true,
      },
      {
        id: "e6",
        code: "E.6",
        text: "Alat ukur sudah terkalibrasi?",
        allowNA: true,
      },
    ],
  },
  {
    id: "F",
    name: "KONDISI LINGKUNGAN KERJA",
    questions: [
      { id: "f1", code: "F.1", text: "Area kerja sesuai 5R (material tertata, bersih)?" },
      { id: "f2", code: "F.2", text: "Housekeeping sebelum/sesudah pekerjaan?" },
      {
        id: "f3",
        code: "F.3",
        text: "Pengelolaan B3 & non-B3 (kerjasama DLH, ada SDS)?",
        allowNA: true,
      },
      {
        id: "f4",
        code: "F.4",
        text: "Volume limbah terkontrol (dibersihkan rutin)?",
        allowNA: true,
      },
      {
        id: "f5",
        code: "F.5",
        text: "Tidak ada tumpahan limbah (Area TPS bersih)?",
        allowNA: true,
      },
      {
        id: "f6",
        code: "F.6",
        text: "Drainase dan pengendalian debu baik?",
        allowNA: true,
      },
    ],
  },
  {
    id: "G",
    name: "TANGGAP DARURAT DAN PERTOLONGAN PERTAMA",
    questions: [
      { id: "g1", code: "G.1", text: "APAR di-checklist dan layak digunakan?" },
      { id: "g2", code: "G.2", text: "Memiliki obat-obatan di luar P3K?" },
      { id: "g3", code: "G.3", text: "Kotak P3K tersedia dan lengkap?" },
      {
        id: "g4",
        code: "G.4",
        text: "Pelatihan tanggap darurat/simulasi kebakaran pernah dilakukan?",
      },
      { id: "g5", code: "G.5", text: "Daftar nomor darurat terpasang di direksi keet?" },
    ],
  },
  {
    id: "H",
    name: "KESEHATAN KERJA",
    questions: [
      { id: "h1", code: "H.1", text: "Pengecekan kesehatan staff & pekerja dilakukan?" },
      { id: "h2", code: "H.2", text: "Pemberian vitamin untuk daya tahan tubuh?" },
      { id: "h3", code: "H.3", text: "Dilakukan senam kesehatan jasmani?" },
    ],
  },
];

export const TOTAL_QUESTIONS = QUESTION_CATEGORIES.reduce(
  (sum, cat) => sum + cat.questions.length,
  0
);

/**
 * Mengevaluasi apakah jawaban bernilai Positif (Skor 1), Negatif (Skor 0), atau Tidak Relevan (N/A).
 * - Jika "Tidak Relevan" (atau "N/A"): Tidak dihitung sebagai pengurang maupun pembagi (isNA = true).
 * - Untuk C.1 dan C.2 (isReverse): "Tidak" = Positif (Skor 1), "Ya" = Negatif (Skor 0).
 * - Untuk pertanyaan lainnya: "Ya" = Positif (Skor 1), "Tidak" = Negatif (Skor 0).
 */
export function evaluateQuestionAnswer(q: QuestionItem, answer: string) {
  const normalized = (answer || "").trim();

  if (!normalized) {
    return {
      score: 0,
      isGood: false,
      isNegative: false,
      isNA: false,
      isAnswered: false,
    };
  }

  if (
    normalized === "Tidak Relevan" ||
    normalized.toUpperCase() === "N/A" ||
    normalized.toUpperCase() === "NA"
  ) {
    return {
      score: 0,
      isGood: false,
      isNegative: false,
      isNA: true,
      isAnswered: true,
    };
  }

  if (q.isReverse) {
    const isGood = normalized === "Tidak";
    return {
      score: isGood ? 1 : 0,
      isGood,
      isNegative: !isGood,
      isNA: false,
      isAnswered: true,
    };
  } else {
    const isGood = normalized === "Ya";
    return {
      score: isGood ? 1 : 0,
      isGood,
      isNegative: !isGood,
      isNA: false,
      isAnswered: true,
    };
  }
}

export function getScoreGrade(percentage: number) {
  if (percentage >= 85) {
    return {
      grade: "Sangat Baik",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      badgeColor: "bg-emerald-600 text-white",
      barColor: "bg-emerald-500",
      hexBg: "#dcfce7",
      hexText: "#15803d",
      description: "Memenuhi seluruh standar K3 dengan kepatuhan tinggi",
    };
  }
  if (percentage >= 70) {
    return {
      grade: "Baik",
      color: "text-blue-700 bg-blue-50 border-blue-200",
      badgeColor: "bg-blue-600 text-white",
      barColor: "bg-blue-500",
      hexBg: "#dbeafe",
      hexText: "#1d4ed8",
      description: "Tingkat kepatuhan baik, lakukan perbaikan pada temuan minor",
    };
  }
  if (percentage >= 55) {
    return {
      grade: "Cukup",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      badgeColor: "bg-amber-600 text-white",
      barColor: "bg-amber-500",
      hexBg: "#fef3c7",
      hexText: "#b45309",
      description: "Perlu perhatian dan perbaikan pada beberapa aspek krusial",
    };
  }
  return {
    grade: "Perlu Perbaikan",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-600 text-white",
    barColor: "bg-rose-500",
    hexBg: "#ffe4e6",
    hexText: "#be123c",
    description: "Kepatuhan K3 rendah, tindakan korektif segera diperlukan!",
  };
}