"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ALL_AREAS,
  QUESTION_CATEGORIES,
  TOTAL_QUESTIONS,
  evaluateQuestionAnswer,
  getScoreGrade,
  AnswerOption,
  PerformanceK3Detail,
  InspectionDetailItem,
  CategoryScoreSummary,
} from "./k3Questions";
import EditPerformanceK3Modal from "./edit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Award,
  Layers,
  FileSpreadsheet,
  Printer,
  MinusCircle,
  FileText,
  FileCheck,
  Sparkles,
  BarChart3,
  ArrowUpDown,
  Briefcase,
  Pencil,
} from "lucide-react";

export interface PerformanceRecord {
  id: string;
  nama_proyek: string;
  area: string;
  tanggal_inspection: string;
  detail_penilaian: any;
  score_percentage: number;
  created_at?: string;
}

export interface ParsedQuestionItem {
  id: string;
  code: string;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  temuan: string;
  skor: number;
  is_reverse: boolean;
  is_negative: boolean;
  is_na: boolean;
}

export interface ParsedCategory {
  id: string;
  name: string;
  score: number;
  relevantTotal: number;
  naCount: number;
  percentage: number;
  items: ParsedQuestionItem[];
}

type SortOption =
  | "score_desc"
  | "score_asc"
  | "proyek_asc"
  | "proyek_desc"
  | "area_asc"
  | "area_desc"
  | "tanggal_desc"
  | "tanggal_asc";

export const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]
    } ${date.getFullYear()}`;
};

export const hasTemuanContent = (temuan?: string) => {
  if (!temuan) return false;
  const clean = temuan.trim().toLowerCase();
  return (
    clean !== "" &&
    clean !== "-" &&
    clean !== "--" &&
    clean !== "." &&
    clean !== "tidak ada" &&
    clean !== "nihil"
  );
};

// Fungsi pemersatu pembaca JSONB detail_penilaian (Diekspor agar bisa dipakai oleh edit.tsx)
export function parseDetailPenilaianToCategories(detail: any): {
  categories: ParsedCategory[];
  totalSkor: number;
  totalRelevan: number;
  totalNA: number;
} {
  if (!detail) {
    return {
      categories: [],
      totalSkor: 0,
      totalRelevan: TOTAL_QUESTIONS,
      totalNA: 0,
    };
  }

  let parsed = detail;
  if (typeof detail === "string") {
    try {
      parsed = JSON.parse(detail);
    } catch {
      return {
        categories: [],
        totalSkor: 0,
        totalRelevan: TOTAL_QUESTIONS,
        totalNA: 0,
      };
    }
  }

  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && Array.isArray(parsed.items)) {
    rawList = parsed.items;
  }

  if (rawList.length === 0) {
    return {
      categories: [],
      totalSkor: parsed?.total_skor ?? 0,
      totalRelevan: parsed?.total_pertanyaan ?? TOTAL_QUESTIONS,
      totalNA: parsed?.total_tidak_relevan ?? 0,
    };
  }

  const hasCategoryOrCode = rawList.some((it) => it.kategori || it.code);
  let currentIndex = 0;
  let globalScore = 0;
  let globalRelevan = 0;
  let globalNA = 0;

  const categories: ParsedCategory[] = QUESTION_CATEGORIES.map((catDef) => {
    let catRawItems: any[] = [];

    if (hasCategoryOrCode) {
      catRawItems = rawList.filter((it) => {
        const codeMatch =
          it.code &&
          it.code.toUpperCase().startsWith(catDef.id.toUpperCase() + ".");
        const katMatch =
          it.kategori &&
          it.kategori.toLowerCase().includes(catDef.name.toLowerCase());
        return codeMatch || katMatch;
      });
    } else {
      catRawItems = rawList.slice(
        currentIndex,
        currentIndex + catDef.questions.length
      );
      currentIndex += catDef.questions.length;
    }

    let catScore = 0;
    let catRelevan = 0;
    let catNA = 0;

    const items: ParsedQuestionItem[] = catDef.questions.map((qDef, idx) => {
      const rawItem =
        catRawItems.find(
          (r) =>
            r.id === qDef.id ||
            (r.code && r.code.toUpperCase() === qDef.code.toUpperCase())
        ) ||
        catRawItems[idx] ||
        {};

      const rawJawaban = (rawItem.jawaban || "-").trim();
      const evalRes = evaluateQuestionAnswer(
        qDef,
        rawJawaban === "-" ? "" : rawJawaban
      );

      if (evalRes.isNA) {
        catNA++;
        globalNA++;
      } else {
        catRelevan++;
        globalRelevan++;
        catScore += evalRes.score;
        globalScore += evalRes.score;
      }

      return {
        id: qDef.id,
        code: qDef.code,
        kategori: catDef.name,
        pertanyaan: rawItem.pertanyaan || rawItem.text || qDef.text,
        jawaban: evalRes.isNA ? "Tidak Relevan" : rawJawaban || "-",
        temuan: rawItem.temuan || "",
        skor: evalRes.score,
        is_reverse: !!qDef.isReverse,
        is_negative: evalRes.isNegative,
        is_na: evalRes.isNA,
      };
    });

    const percentage =
      catRelevan > 0
        ? parseFloat(((catScore / catRelevan) * 100).toFixed(1))
        : 100;

    return {
      id: catDef.id,
      name: catDef.name,
      score: catScore,
      relevantTotal: catRelevan,
      naCount: catNA,
      percentage,
      items,
    };
  });

  return {
    categories,
    totalSkor: parsed?.total_skor ?? globalScore,
    totalRelevan: parsed?.total_pertanyaan ?? (globalRelevan || TOTAL_QUESTIONS),
    totalNA: parsed?.total_tidak_relevan ?? globalNA,
  };
}

export default function PerformanceK3Page() {
  // State data utama
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter, Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState("Semua Area");
  const [sortBy, setSortBy] = useState<SortOption>("score_desc");

  // Mode Grafik Tren: "area" | "proyek"
  const [chartGroupMode, setChartGroupMode] = useState<"area" | "proyek">(
    "area"
  );

  // Modal Tambah Penilaian
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("A");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Form State Dasar
  const [formData, setFormData] = useState({
    nama_proyek: "",
    area: ALL_AREAS[0],
    tanggal_inspection: new Date().toISOString().split("T")[0],
  });

  // Form State Kuesioner
  const [answers, setAnswers] = useState<
    Record<string, { jawaban: AnswerOption; temuan: string }>
  >({});

  // Modal Detail Penilaian
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<PerformanceRecord | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>("ALL");
  const [filterOnlyWithTemuan, setFilterOnlyWithTemuan] = useState(false);

  // Modal Edit Penilaian (Terhubung ke edit.tsx)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<PerformanceRecord | null>(
    null
  );

  // Modal Hapus Konfirmasi
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] =
    useState<PerformanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setFormData({
      nama_proyek: "",
      area: ALL_AREAS[0],
      tanggal_inspection: new Date().toISOString().split("T")[0],
    });
    const initialAnswers: Record<
      string,
      { jawaban: AnswerOption; temuan: string }
    > = {};
    QUESTION_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        initialAnswers[q.id] = { jawaban: "", temuan: "" };
      });
    });
    setAnswers(initialAnswers);
    setFormErrors([]);
    setActiveCategoryTab("A");
  };

  const fetchRecords = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("performance_k3")
        .select(
          "id, nama_proyek, area, tanggal_inspection, score_percentage, detail_penilaian, created_at"
        )
        .order("tanggal_inspection", { ascending: false });

      if (error) throw error;
      const list = (data as PerformanceRecord[]) || [];
      setRecords(list);

      // Jika modal detail sedang terbuka, ikut perbarui datanya
      if (selectedRecord) {
        const updated = list.find((item) => item.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data performance_k3:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    resetForm();

    const channel = supabase
      .channel("performance_k3_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "performance_k3" },
        () => fetchRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Live score untuk modal Tambah Penilaian
  const liveScoreData = useMemo(() => {
    let totalScore = 0;
    let answeredCount = 0;
    let naCount = 0;
    const categoryProgress: Record<
      string,
      {
        answered: number;
        total: number;
        relevantTotal: number;
        na: number;
        score: number;
      }
    > = {};

    QUESTION_CATEGORIES.forEach((cat) => {
      categoryProgress[cat.id] = {
        answered: 0,
        total: cat.questions.length,
        relevantTotal: cat.questions.length,
        na: 0,
        score: 0,
      };
      cat.questions.forEach((q) => {
        const itemAns = answers[q.id]?.jawaban || "";
        if (
          itemAns === "Ya" ||
          itemAns === "Tidak" ||
          itemAns === "Tidak Relevan"
        ) {
          answeredCount++;
          categoryProgress[cat.id].answered++;
          const evaluation = evaluateQuestionAnswer(q, itemAns);
          if (evaluation.isNA) {
            naCount++;
            categoryProgress[cat.id].na++;
            categoryProgress[cat.id].relevantTotal--;
          } else {
            totalScore += evaluation.score;
            categoryProgress[cat.id].score += evaluation.score;
          }
        }
      });
    });

    const effectiveTotalQuestions = Math.max(0, TOTAL_QUESTIONS - naCount);
    const percentage =
      effectiveTotalQuestions > 0
        ? parseFloat(((totalScore / effectiveTotalQuestions) * 100).toFixed(2))
        : 0;

    return {
      totalScore,
      totalQuestions: TOTAL_QUESTIONS,
      effectiveTotalQuestions,
      naCount,
      answeredCount,
      percentage,
      categoryProgress,
    };
  }, [answers]);

  const handleAnswerChange = (questionId: string, value: AnswerOption) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        jawaban: value,
      },
    }));
  };

  const handleTemuanChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        temuan: text,
      },
    }));
  };

  const handleFillStandardPositive = () => {
    const updatedAnswers: Record<
      string,
      { jawaban: AnswerOption; temuan: string }
    > = {};
    QUESTION_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        const positiveVal: AnswerOption = q.isReverse ? "Tidak" : "Ya";
        updatedAnswers[q.id] = {
          jawaban: positiveVal,
          temuan: answers[q.id]?.temuan || "",
        };
      });
    });
    setAnswers(updatedAnswers);
    setFormErrors([]);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!formData.nama_proyek.trim()) {
      errors.push("Nama Proyek wajib diisi.");
    }
    if (!formData.area) {
      errors.push("Area proyek wajib dipilih.");
    }
    if (!formData.tanggal_inspection) {
      errors.push("Tanggal Safety Inspection wajib ditentukan.");
    }

    const unansweredList: string[] = [];
    const missingTemuanList: string[] = [];
    const detailItems: InspectionDetailItem[] = [];
    const categoryScores: Record<string, CategoryScoreSummary> = {};
    let totalScoreCalculated = 0;
    let totalNACalculated = 0;

    QUESTION_CATEGORIES.forEach((cat) => {
      let catScore = 0;
      let catNA = 0;
      cat.questions.forEach((q) => {
        const itemState = answers[q.id];
        const val = itemState?.jawaban || "";
        const temuanText = (itemState?.temuan || "").trim();

        if (!val) {
          unansweredList.push(`${q.code} (${cat.name})`);
        } else {
          const evalRes = evaluateQuestionAnswer(q, val);
          if (evalRes.isNA) {
            catNA++;
            totalNACalculated++;
          } else {
            catScore += evalRes.score;
            totalScoreCalculated += evalRes.score;
          }

          if (evalRes.isNegative && !temuanText) {
            missingTemuanList.push(`${q.code}: ${q.text}`);
          }

          detailItems.push({
            id: q.id,
            code: q.code,
            kategori: cat.name,
            pertanyaan: q.text,
            jawaban: val,
            skor: evalRes.score,
            is_reverse: !!q.isReverse,
            is_negative: evalRes.isNegative,
            is_na: evalRes.isNA,
            temuan: temuanText,
          });
        }
      });

      const catRelevantTotal = Math.max(0, cat.questions.length - catNA);
      categoryScores[cat.id] = {
        name: cat.name,
        score: catScore,
        total: catRelevantTotal,
        raw_total: cat.questions.length,
        na_count: catNA,
        percentage:
          catRelevantTotal > 0
            ? parseFloat(((catScore / catRelevantTotal) * 100).toFixed(1))
            : 100,
      };
    });

    const effectiveTotalQuestions = Math.max(
      0,
      TOTAL_QUESTIONS - totalNACalculated
    );

    if (effectiveTotalQuestions === 0) {
      errors.push("Seluruh pertanyaan tidak boleh dijawab Tidak Relevan semua.");
    }

    if (unansweredList.length > 0) {
      errors.push(
        `Terdapat ${unansweredList.length} pertanyaan yang belum dijawab: ${unansweredList
          .slice(0, 3)
          .join(", ")}${unansweredList.length > 3 ? "..." : ""}`
      );
    }

    if (missingTemuanList.length > 0) {
      errors.push(
        `Temuan wajib diisi untuk setiap jawaban bernilai negatif! Kurang diisi pada: ${missingTemuanList
          .slice(0, 3)
          .join(", ")}${missingTemuanList.length > 3 ? "..." : ""}`
      );
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      const modalEl = document.getElementById("k3-modal-content");
      if (modalEl) modalEl.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormErrors([]);
    setIsSubmitting(true);

    try {
      const finalScorePercentage = parseFloat(
        ((totalScoreCalculated / effectiveTotalQuestions) * 100).toFixed(2)
      );

      const detailPenilaianPayload: PerformanceK3Detail = {
        total_pertanyaan: effectiveTotalQuestions,
        total_pertanyaan_awal: TOTAL_QUESTIONS,
        total_tidak_relevan: totalNACalculated,
        total_skor: totalScoreCalculated,
        score_percentage: finalScorePercentage,
        category_scores: categoryScores,
        items: detailItems,
      };

      const { error } = await supabase
        .from("performance_k3")
        .insert([
          {
            nama_proyek: formData.nama_proyek.trim(),
            area: formData.area,
            tanggal_inspection: formData.tanggal_inspection,
            detail_penilaian: detailPenilaianPayload,
            score_percentage: finalScorePercentage,
          },
        ])
        .select();

      if (error) throw error;

      await fetchRecords();
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Gagal menyimpan penilaian K3:", err.message);
      setFormErrors([`Gagal menyimpan ke database: ${err.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Sortir data
  const filteredAndSortedRecords = useMemo(() => {
    const filtered = records.filter((r) => {
      const matchesSearch =
        (r.nama_proyek || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (r.area || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        selectedAreaFilter === "Semua Area" || r.area === selectedAreaFilter;
      return matchesSearch && matchesArea;
    });

    return [...filtered].sort((a, b) => {
      const scoreA = Number(a.score_percentage) || 0;
      const scoreB = Number(b.score_percentage) || 0;

      switch (sortBy) {
        case "score_desc":
          return scoreB - scoreA;
        case "score_asc":
          return scoreA - scoreB;
        case "proyek_asc":
          return (a.nama_proyek || "").localeCompare(b.nama_proyek || "", "id");
        case "proyek_desc":
          return (b.nama_proyek || "").localeCompare(a.nama_proyek || "", "id");
        case "area_asc":
          return (a.area || "").localeCompare(b.area || "", "id");
        case "area_desc":
          return (b.area || "").localeCompare(a.area || "", "id");
        case "tanggal_asc":
          return (
            new Date(a.tanggal_inspection).getTime() -
            new Date(b.tanggal_inspection).getTime()
          );
        case "tanggal_desc":
        default:
          return (
            new Date(b.tanggal_inspection).getTime() -
            new Date(a.tanggal_inspection).getTime()
          );
      }
    });
  }, [records, searchQuery, selectedAreaFilter, sortBy]);

  // Statistik Ringkasan
  const summaryStats = useMemo(() => {
    if (records.length === 0) {
      return {
        totalInspeksi: 0,
        avgScore: "0.0",
        activeProjectsCount: 0,
        needsAttention: 0,
      };
    }
    const totalInspeksi = records.length;
    const sumScores = records.reduce(
      (acc, curr) => acc + (Number(curr.score_percentage) || 0),
      0
    );
    const avgScore = (sumScores / totalInspeksi).toFixed(1);

    const uniqueProjects = new Set(
      records.map((r) => (r.nama_proyek || "").trim().toLowerCase())
    );
    const activeProjectsCount = uniqueProjects.size;

    const needsAttention = records.filter(
      (r) => (Number(r.score_percentage) || 0) < 70
    ).length;

    return {
      totalInspeksi,
      avgScore,
      activeProjectsCount,
      needsAttention,
    };
  }, [records]);

  // Data Grafik Tren Rata-Rata Skor Berdasarkan Area / Proyek
  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    const grouped: Record<
      string,
      { label: string; totalScore: number; count: number }
    > = {};

    records.forEach((r) => {
      const key =
        chartGroupMode === "area"
          ? r.area || "Tanpa Area"
          : (r.nama_proyek || "Proyek").trim();
      if (!grouped[key]) {
        grouped[key] = { label: key, totalScore: 0, count: 0 };
      }
      grouped[key].totalScore += Number(r.score_percentage) || 0;
      grouped[key].count += 1;
    });

    return Object.values(grouped)
      .map((item) => ({
        label: item.label,
        count: item.count,
        avgScore: parseFloat((item.totalScore / item.count).toFixed(1)),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [records, chartGroupMode]);

  const selectedRecordParsed = useMemo(() => {
    if (!selectedRecord) return null;
    return parseDetailPenilaianToCategories(selectedRecord.detail_penilaian);
  }, [selectedRecord]);

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("performance_k3")
        .delete()
        .eq("id", recordToDelete.id);

      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
    } catch (err: any) {
      console.error("Gagal menghapus data:", err.message);
      alert(`Gagal menghapus: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ===========================================================================
  // FUNGSI DOWNLOAD LAPORAN GLOBAL & PER PROYEK (DIAKSES DARI MODAL DETAIL)
  // ===========================================================================
  const handleDownloadGlobalExcel = () => {
    if (filteredAndSortedRecords.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const sortLabelMap: Record<SortOption, string> = {
      score_desc: "Peringkat Skor (Tertinggi ke Terendah)",
      score_asc: "Peringkat Skor (Terendah ke Tertinggi)",
      proyek_asc: "Abjad Nama Proyek (A - Z)",
      proyek_desc: "Abjad Nama Proyek (Z - A)",
      area_asc: "Abjad Area (A - Z)",
      area_desc: "Abjad Area (Z - A)",
      tanggal_desc: "Tanggal Inspeksi (Terbaru)",
      tanggal_asc: "Tanggal Inspeksi (Terlama)",
    };

    const rowsHtml = filteredAndSortedRecords
      .map((r, i) => {
        const score = Number(r.score_percentage) || 0;
        const grade = getScoreGrade(score);
        const parsedInfo = parseDetailPenilaianToCategories(r.detail_penilaian);

        return `
          <tr>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${i + 1}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-weight:bold;">${r.nama_proyek}</td>
            <td style="border:1px solid #cbd5e1; padding:8px;">${r.area}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${formatDate(r.tanggal_inspection)}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${parsedInfo.totalSkor} / ${parsedInfo.totalRelevan}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${parsedInfo.totalNA}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px; font-weight:bold;">${score.toFixed(2)}%</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:8px; background-color:${grade.hexBg}; color:${grade.hexText}; font-weight:bold;">${grade.grade}</td>
          </tr>
        `;
      })
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt;">
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td colspan="8" style="font-size:16pt; font-weight:bold; background-color:#1e3a8a; color:#ffffff; padding:12px; text-align:center;">
              LAPORAN REKAPITULASI GLOBAL PERFORMANCE K3 - KAI PROPERTI
            </td>
          </tr>
          <tr>
            <td colspan="8" style="background-color:#f1f5f9; padding:8px; font-size:10pt; border:1px solid #cbd5e1;">
              <b>Filter Area:</b> ${selectedAreaFilter} | <b>Urutan Sortir:</b> ${sortLabelMap[sortBy]} | <b>Total Data:</b> ${filteredAndSortedRecords.length} Inspeksi | <b>Rata-rata Skor Global:</b> ${summaryStats.avgScore}%
            </td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <thead>
            <tr style="background-color:#1e40af; color:#ffffff; font-weight:bold; text-align:center;">
              <th style="border:1px solid #cbd5e1; padding:10px; width:45px;">No</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:280px;">Nama Proyek</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:160px;">Area</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:130px;">Tanggal Inspeksi</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">Skor / Pembagi</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:100px;">Jml N/A</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:130px;">Persentase (%)</th>
              <th style="border:1px solid #cbd5e1; padding:10px; width:150px;">Predikat K3</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Global_Performance_K3_${new Date().toISOString().split("T")[0]
      }.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadGlobalPDF = () => {
    if (filteredAndSortedRecords.length === 0) {
      alert("Tidak ada data untuk dicetak.");
      return;
    }

    const rowsHtml = filteredAndSortedRecords
      .map((r, i) => {
        const score = Number(r.score_percentage) || 0;
        const grade = getScoreGrade(score);
        const parsedInfo = parseDetailPenilaianToCategories(r.detail_penilaian);

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="font-weight:700;">${r.nama_proyek}</td>
            <td>${r.area}</td>
            <td style="text-align:center;">${formatDate(r.tanggal_inspection)}</td>
            <td style="text-align:center;">${parsedInfo.totalSkor} / ${parsedInfo.totalRelevan} (${parsedInfo.totalNA} N/A)</td>
            <td style="text-align:center; font-weight:800;">${score.toFixed(2)}%</td>
            <td style="text-align:center;">
              <span style="background:${grade.hexBg}; color:${grade.hexText}; padding:3px 8px; border-radius:12px; font-weight:700; font-size:10px;">
                ${grade.grade}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekapitulasi Global Performance K3</title>
        <style>
          @page { size: A4 landscape; margin: 14mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 800; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 11px; color: #475569; margin-top: 4px; }
          .summary-bar { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
          .summary-item { font-size: 11px; }
          .summary-item b { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e3a8a; color: white; font-size: 11px; text-transform: uppercase; padding: 9px 8px; border: 1px solid #cbd5e1; }
          td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 24px; font-size: 10px; color: #64748b; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">REKAPITULASI GLOBAL PERFORMANCE K3</h1>
            <div class="subtitle">KAI Properti Safety Audit System — Ringkasan Kepatuhan Proyek</div>
          </div>
          <div style="text-align:right; font-size:11px;">
            <div><b>Tanggal Cetak:</b> ${formatDate(new Date().toISOString())}</div>
            <div><b>Filter Area:</b> ${selectedAreaFilter}</div>
          </div>
        </div>
        <div class="summary-bar">
          <div class="summary-item">Total Inspeksi Ditampilkan: <b>${filteredAndSortedRecords.length}</b></div>
          <div class="summary-item">Proyek Aktif Dinilai: <b>${summaryStats.activeProjectsCount} Proyek</b></div>
          <div class="summary-item">Rata-rata Skor Nasional: <b>${summaryStats.avgScore}%</b></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">No</th>
              <th>Nama Proyek</th>
              <th style="width:140px;">Area</th>
              <th style="width:110px;">Tanggal Inspeksi</th>
              <th style="width:130px;">Skor / Relevan</th>
              <th style="width:100px;">Nilai Akhir (%)</th>
              <th style="width:120px;">Predikat</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">Dicetak otomatis melalui Sistem Audit Performance K3 KAI Properti</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadProjectExcel = (record: PerformanceRecord) => {
    const score = Number(record.score_percentage) || 0;
    const grade = getScoreGrade(score);
    const parsedInfo = parseDetailPenilaianToCategories(
      record.detail_penilaian
    );

    let bodyRows = "";
    parsedInfo.categories.forEach((cat) => {
      bodyRows += `
        <tr style="background-color:#dbeafe; font-weight:bold;">
          <td colspan="6" style="border:1px solid #94a3b8; padding:8px; color:#1e3a8a;">
            KATEGORI ${cat.id}: ${cat.name} (Skor Kategori: ${cat.score}/${cat.relevantTotal} — ${cat.percentage}%)
          </td>
        </tr>
      `;

      cat.items.forEach((item) => {
        const isNA = item.is_na;
        const isNeg = item.is_negative;
        const skorText = isNA ? "N/A" : String(item.skor);
        const statusBg = isNA
          ? "#f1f5f9"
          : isNeg
            ? "#ffe4e6"
            : "#dcfce7";
        const statusColor = isNA
          ? "#475569"
          : isNeg
            ? "#be123c"
            : "#15803d";

        bodyRows += `
          <tr>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:7px; font-weight:bold;">${item.code}</td>
            <td style="border:1px solid #cbd5e1; padding:7px;">${item.pertanyaan}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:7px; font-weight:bold; background-color:${statusBg}; color:${statusColor};">${item.jawaban}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:7px; font-weight:bold;">${skorText}</td>
            <td style="text-align:center; border:1px solid #cbd5e1; padding:7px;">${isNA
            ? "Tidak Relevan"
            : isNeg
              ? "Temuan Negatif"
              : "Sesuai Standar"
          }</td>
            <td style="border:1px solid #cbd5e1; padding:7px;">${hasTemuanContent(item.temuan) ? item.temuan : "-"
          }</td>
          </tr>
        `;
      });
    });

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; font-size: 10.5pt;">
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td colspan="6" style="font-size:15pt; font-weight:bold; background-color:#0f172a; color:#ffffff; padding:12px; text-align:center;">
              LEMBAR AUDIT RESMI PENILAIAN PERFORMANCE K3 PROYEK
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc;"><b>Nama Proyek:</b> ${record.nama_proyek}</td>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc;"><b>Area Proyek:</b> ${record.area}</td>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc;"><b>Tanggal Inspeksi:</b> ${formatDate(record.tanggal_inspection)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc;"><b>Skor Diperoleh:</b> ${parsedInfo.totalSkor} dari ${parsedInfo.totalRelevan} Parameter Relevan</td>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:#f8fafc;"><b>Parameter Tidak Relevan (N/A):</b> ${parsedInfo.totalNA} Parameter</td>
            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; background-color:${grade.hexBg}; color:${grade.hexText}; font-weight:bold;">
              <b>Skor Akhir:</b> ${score.toFixed(2)}% (${grade.grade})
            </td>
          </tr>
          <tr><td colspan="6"></td></tr>
          <thead>
            <tr style="background-color:#1e3a8a; color:#ffffff; font-weight:bold; text-align:center;">
              <th style="border:1px solid #cbd5e1; padding:9px; width:65px;">Kode</th>
              <th style="border:1px solid #cbd5e1; padding:9px; width:360px;">Parameter Pemeriksaan K3</th>
              <th style="border:1px solid #cbd5e1; padding:9px; width:120px;">Jawaban</th>
              <th style="border:1px solid #cbd5e1; padding:9px; width:75px;">Skor</th>
              <th style="border:1px solid #cbd5e1; padding:9px; width:130px;">Status Evaluasi</th>
              <th style="border:1px solid #cbd5e1; padding:9px; width:280px;">Catatan Temuan Lapangan</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const safeName = (record.nama_proyek || "Proyek").replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );
    const blob = new Blob([excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Audit_K3_${safeName}_${record.tanggal_inspection}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadProjectPDF = (record: PerformanceRecord) => {
    const score = Number(record.score_percentage) || 0;
    const grade = getScoreGrade(score);
    const parsedInfo = parseDetailPenilaianToCategories(
      record.detail_penilaian
    );

    let sectionsHtml = "";
    parsedInfo.categories.forEach((cat) => {
      let rows = "";

      cat.items.forEach((item) => {
        const isNA = item.is_na;
        const isNeg = item.is_negative;
        const badgeStyle = isNA
          ? "background:#f1f5f9; color:#475569;"
          : isNeg
            ? "background:#ffe4e6; color:#be123c;"
            : "background:#dcfce7; color:#15803d;";

        rows += `
          <tr>
            <td style="text-align:center; font-weight:700;">${item.code}</td>
            <td>${item.pertanyaan}</td>
            <td style="text-align:center;"><span style="padding:2px 7px; border-radius:6px; font-weight:700; font-size:10px; ${badgeStyle}">${item.jawaban}</span></td>
            <td style="text-align:center; font-weight:700;">${isNA ? "N/A" : item.skor}</td>
            <td>${hasTemuanContent(item.temuan) ? `<i>"${item.temuan}"</i>` : "-"}</td>
          </tr>
        `;
      });

      sectionsHtml += `
        <tr style="background:#eff6ff;">
          <td colspan="5" style="font-weight:800; color:#1e3a8a; padding:7px 8px;">
            KATEGORI ${cat.id}: ${cat.name}
            <span style="float:right; font-size:10px;">Skor Kategori: ${cat.score}/${cat.relevantTotal} (${cat.percentage}%)</span>
          </td>
        </tr>
        ${rows}
      `;
    });

    const printWindow = window.open("", "_blank", "width=1024,height=850");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Performance K3 - ${record.nama_proyek}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 10.5px; }
          .audit-header { border: 2px solid #0f172a; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
          .audit-title { font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: 0.3px; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px; margin-bottom: 14px; }
          .meta-box { font-size: 10.5px; }
          .meta-label { color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; }
          .meta-val { font-weight: 800; color: #0f172a; margin-top: 2px; font-size: 11.5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0f172a; color: white; font-size: 10px; text-transform: uppercase; padding: 7px 6px; border: 1px solid #94a3b8; }
          td { padding: 6px; border: 1px solid #cbd5e1; vertical-align: top; }
          .sign-area { margin-top: 28px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sign-box { width: 200px; text-align: center; font-size: 10.5px; }
          .sign-line { margin-top: 55px; border-top: 1px solid #334155; padding-top: 4px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="audit-header">
          <div>
            <div style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase;">KAI Properti — Dokumen Audit Resmi K3</div>
            <h1 class="audit-title">LAPORAN RINCIAN SAFETY INSPECTION & PERFORMANCE K3</h1>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:900; color:${grade.hexText};">${score.toFixed(2)}%</div>
            <span style="background:${grade.hexBg}; color:${grade.hexText}; padding:2px 8px; border-radius:10px; font-weight:800; font-size:10px;">
              ${grade.grade}
            </span>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Nama Proyek</div>
            <div class="meta-val">${record.nama_proyek}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Area Kerja</div>
            <div class="meta-val">${record.area}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Tanggal Safety Inspection</div>
            <div class="meta-val">${formatDate(record.tanggal_inspection)}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Skor Diperoleh / Pembagi Relevan</div>
            <div class="meta-val">${parsedInfo.totalSkor} / ${parsedInfo.totalRelevan} Poin</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Parameter Tidak Relevan (N/A)</div>
            <div class="meta-val">${parsedInfo.totalNA} Parameter</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Total Parameter Standar</div>
            <div class="meta-val">${TOTAL_QUESTIONS} Parameter (Kategori A - H)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:42px;">Kode</th>
              <th>Parameter Pemeriksaan K3</th>
              <th style="width:95px;">Status Jawaban</th>
              <th style="width:45px;">Skor</th>
              <th style="width:190px;">Temuan Lapangan</th>
            </tr>
          </thead>
          <tbody>
            ${sectionsHtml}
          </tbody>
        </table>

        <div class="sign-area">
          <div class="sign-box">
            <div>Diperiksa Oleh,</div>
            <div><b>Inspector / Officer K3</b></div>
            <div class="sign-line">( ........................................ )</div>
          </div>
          <div class="sign-box">
            <div>Mengetahui,</div>
            <div><b>Kepala Proyek / Site Manager</b></div>
            <div class="sign-line">( ........................................ )</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER UTAMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-sm border border-blue-400/30">
            <TrendingUp size={14} className="text-orange-400" />
            <span>KAI Properti Safety Audit System</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Performance K3
          </h1>
          <p className="text-sm md:text-base text-blue-100/90 max-w-2xl font-normal leading-relaxed">
            Evaluasi kepatuhan, scoring komprehensif dengan pembagi dinamis, dan
            pemantauan standar keselamatan & kesehatan kerja seluruh proyek.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="bg-[#F97316] hover:bg-orange-600 text-white font-bold px-5 py-2.5 h-auto rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all flex items-center gap-2 cursor-pointer border border-orange-400/30"
          >
            <Plus size={18} className="stroke-[3]" />
            Tambah Penilaian
          </Button>

          <Button
            variant="outline"
            onClick={fetchRecords}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl h-auto py-2.5 px-3.5 cursor-pointer flex items-center gap-2"
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline text-xs font-semibold">
              Refresh
            </span>
          </Button>
        </div>
      </div>

      {/* STAT CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-blue-300 transition-colors">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Inspeksi Keseluruhan
              </span>
              <div className="text-2xl md:text-3xl font-black text-slate-800">
                {summaryStats.totalInspeksi}
              </div>
              <span className="text-[11px] text-slate-400">
                Data audit tercatat
              </span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-emerald-300 transition-colors">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rata-rata Skor Nasional
              </span>
              <div className="text-2xl md:text-3xl font-black text-emerald-600">
                {summaryStats.avgScore}%
              </div>
              <span className="text-[11px] text-slate-400">
                Indeks Kepatuhan K3 Global
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-indigo-300 transition-colors">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Jumlah Proyek Aktif
              </span>
              <div className="text-2xl md:text-3xl font-black text-indigo-600">
                {summaryStats.activeProjectsCount}
              </div>
              <span className="text-[11px] text-slate-400">
                Proyek unik yang dinilai
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-rose-300 transition-colors">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Perlu Perbaikan
              </span>
              <div className="text-2xl md:text-3xl font-black text-rose-600">
                {summaryStats.needsAttention}
              </div>
              <span className="text-[11px] text-slate-400">
                Skor di bawah 70%
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRAFIK TREN RATA-RATA SKOR K3 BERDASARKAN AREA / PROYEK */}
      <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BarChart3 size={19} className="text-blue-600" />
                <h2 className="font-bold text-slate-800 text-base">
                  Grafik Tren Rata-rata Skor Persentase K3
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Perbandingan tingkat kepatuhan K3 berdasarkan agregasi{" "}
                {chartGroupMode === "area" ? "Area Kerja" : "Proyek"}
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartGroupMode("area")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartGroupMode === "area"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Per Area
              </button>
              <button
                type="button"
                onClick={() => setChartGroupMode("proyek")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartGroupMode === "proyek"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Per Proyek
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada data untuk menampilkan grafik tren skor K3.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 max-h-[320px] overflow-y-auto pr-1">
              {chartData.map((item, index) => {
                const grade = getScoreGrade(item.avgScore);
                return (
                  <div
                    key={item.label}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {index + 1}
                        </span>
                        <span
                          className="font-bold text-slate-800 truncate"
                          title={item.label}
                        >
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({item.count} audit)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${grade.color}`}
                        >
                          {grade.grade}
                        </span>
                        <span className="font-black text-slate-900 text-xs">
                          {item.avgScore}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${grade.barColor} rounded-full transition-all duration-500`}
                        style={{
                          width: `${Math.min(100, Math.max(0, item.avgScore))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILTER & SORTIR (RAPI TANPA TOMBOL CETAK DI LUAR) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama proyek atau lokasi area..."
            className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus:bg-white rounded-lg text-sm w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Area */}
          <div className="flex items-center gap-1.5">
            <Filter
              size={15}
              className="text-slate-400 shrink-0 hidden sm:block"
            />
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua Area">Semua Area ({records.length})</option>
              {ALL_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Sortir */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown
              size={15}
              className="text-slate-400 shrink-0 hidden sm:block"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              title="Urutkan Data"
            >
              <option value="score_desc">
                Skor (%): Tertinggi ke Terendah
              </option>
              <option value="score_asc">
                Skor (%): Terendah ke Tertinggi
              </option>
              <option value="proyek_asc">Nama Proyek: Abjad A - Z</option>
              <option value="proyek_desc">Nama Proyek: Abjad Z - A</option>
              <option value="area_asc">Area: Abjad A - Z</option>
              <option value="area_desc">Area: Abjad Z - A</option>
              <option value="tanggal_desc">Tanggal: Terbaru</option>
              <option value="tanggal_asc">Tanggal: Terlama</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL DAFTAR DATA PERFORMANCE K3 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm md:text-base">
              Daftar Evaluasi Performance K3 Proyek
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {filteredAndSortedRecords.length} Data
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm font-medium">
              Memuat data dari Supabase...
            </p>
          </div>
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-base">
                Tidak Ada Data
              </h3>
              <p className="text-slate-500 text-xs md:text-sm max-w-sm">
                {searchQuery || selectedAreaFilter !== "Semua Area"
                  ? "Tidak ada hasil yang sesuai dengan kriteria filter Anda."
                  : "Belum ada rekaman inspeksi K3. Klik tombol Tambah Penilaian untuk mulai."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-12 text-center font-bold text-slate-700 text-xs">
                    No
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs max-w-[260px] w-[260px]">
                    Nama Proyek
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">
                    Area / Lokasi
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">
                    Tanggal Inspeksi
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center w-52">
                    Hasil Score (%)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 w-44">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRecords.map((row, idx) => {
                  const scoreNum = Number(row.score_percentage) || 0;
                  const gradeInfo = getScoreGrade(scoreNum);

                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="text-center font-semibold text-slate-500 text-xs">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-bold text-slate-800 text-sm max-w-[260px]">
                        <div
                          className="flex items-center gap-2 min-w-0"
                          title={row.nama_proyek}
                        >
                          <Building2
                            size={16}
                            className="text-slate-400 shrink-0"
                          />
                          <span className="truncate block">
                            {row.nama_proyek}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          <MapPin size={12} className="text-blue-600" />
                          {row.area}
                        </span>
                      </TableCell>

                      <TableCell className="text-slate-600 text-xs font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {formatDate(row.tanggal_inspection)}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">
                              {scoreNum.toFixed(1)}%
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${gradeInfo.color}`}
                            >
                              {gradeInfo.grade}
                            </span>
                          </div>
                          <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full ${gradeInfo.barColor} transition-all duration-500 rounded-full`}
                              style={{
                                width: `${Math.min(100, Math.max(0, scoreNum))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* KOLOM AKSI RAPI: DETAIL, EDIT, HAPUS */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(row);
                              setActiveCategoryFilter("ALL");
                              setFilterOnlyWithTemuan(false);
                              setDetailModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Buka Detail & Cetak Laporan"
                          >
                            <Eye size={14} />
                            Detail
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRecordToEdit(row);
                              setEditModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 rounded-lg flex items-center gap-1 cursor-pointer"
                            title="Edit Detail Proyek Ini"
                          >
                            <Pencil size={13} />
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRecordToDelete(row);
                              setDeleteConfirmOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus Penilaian"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULIR TAMBAH PENILAIAN BARU                                   */}
      {/* ========================================================================= */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          id="k3-modal-content"
          className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col"
        >
          <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 rounded-t-2xl shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 text-[11px] font-semibold border border-blue-400/20 mb-1">
                  <TrendingUp size={12} className="text-orange-400" />
                  Kuesioner 48 Parameter Standar K3
                </div>
                <DialogTitle className="text-xl md:text-2xl font-black text-white">
                  Formulir Penilaian Performance K3
                </DialogTitle>
                <p className="text-xs md:text-sm text-blue-100/90 mt-1">
                  Pilih Ya, Tidak, atau Tidak Relevan (N/A). Pertanyaan Tidak
                  Relevan otomatis mengurangi pembagi soal.
                </p>
              </div>

              <div className="hidden sm:flex flex-col items-end bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0">
                <span className="text-[10px] font-semibold text-blue-100 uppercase tracking-wider">
                  Skor Sementara
                </span>
                <div className="text-2xl font-black text-white leading-none mt-0.5">
                  {liveScoreData.percentage}%
                </div>
                <div className="text-[11px] text-blue-200 mt-1 font-medium">
                  Skor: {liveScoreData.totalScore} /{" "}
                  {liveScoreData.effectiveTotalQuestions} Relevan (
                  {liveScoreData.naCount} N/A)
                </div>
              </div>
            </div>

            <div className="mt-3.5 space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-blue-100">
                <span>
                  Kelengkapan Pengisian ({liveScoreData.answeredCount} /{" "}
                  {TOTAL_QUESTIONS} Parameter)
                </span>
                <span>
                  {Math.round(
                    (liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-blue-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${(liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100
                      }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmitForm}
            className="p-5 md:p-6 space-y-6 flex-1"
          >
            {formErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle size={18} className="text-rose-600" />
                  Harap periksa kembali pengisian formulir:
                </div>
                <ul className="list-disc list-inside text-xs space-y-1 pl-1">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-slate-50/80 p-4 md:p-5 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-200/60 pb-2">
                <Building2 size={16} className="text-blue-600" />
                Data Dasar Inspeksi
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nama Proyek <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.nama_proyek}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_proyek: e.target.value })
                    }
                    placeholder="Contoh: Renovasi Stasiun Gambir"
                    className="bg-white border-slate-200 text-sm h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Area Proyek <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                  >
                    {ALL_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tanggal Safety Inspection{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.tanggal_inspection}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_inspection: e.target.value,
                      })
                    }
                    className="bg-white border-slate-200 text-sm h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Kuesioner Penilaian K3
                  </h3>
                  <p className="text-xs text-slate-500">
                    Catatan Temuan wajib diisi jika jawaban bernilai negatif.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillStandardPositive}
                  className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  Isi Standar Kepatuhan Baik
                </Button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {QUESTION_CATEGORIES.map((cat) => {
                  const progress = liveScoreData.categoryProgress[cat.id];
                  const isComplete =
                    progress && progress.answered === progress.total;
                  const isActive = activeCategoryTab === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : isComplete
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                    >
                      <span>
                        {cat.id}. {cat.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive
                          ? "bg-white/20 text-white"
                          : isComplete
                            ? "bg-emerald-200/60 text-emerald-900"
                            : "bg-slate-200 text-slate-600"
                          }`}
                      >
                        {progress?.answered || 0}/{cat.questions.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {QUESTION_CATEGORIES.filter((c) => c.id === activeCategoryTab).map(
              (cat) => (
                <div key={cat.id} className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                    <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                        {cat.id}
                      </span>
                      <span>
                        Kategori {cat.id}: {cat.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-blue-700">
                      {cat.questions.length} Pertanyaan
                    </span>
                  </div>

                  <div className="space-y-4">
                    {cat.questions.map((q) => {
                      const currentAnswer = answers[q.id]?.jawaban || "";
                      const currentTemuan = answers[q.id]?.temuan || "";
                      const evalRes = evaluateQuestionAnswer(q, currentAnswer);
                      const isRequiredTemuan = evalRes.isNegative;

                      return (
                        <div
                          key={q.id}
                          className={`p-4 md:p-5 rounded-xl border transition-all ${!currentAnswer
                            ? "bg-white border-slate-200"
                            : evalRes.isNA
                              ? "bg-slate-50 border-slate-300"
                              : evalRes.isGood
                                ? "bg-emerald-50/20 border-emerald-200/80 shadow-xs"
                                : "bg-rose-50/25 border-rose-200 shadow-xs"
                            }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold shrink-0 border border-slate-200 mt-0.5">
                                  {q.code}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                                    {q.text}
                                  </p>

                                  {q.isReverse && (
                                    <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                                      <AlertTriangle
                                        size={12}
                                        className="text-amber-600 shrink-0"
                                      />
                                      <span>
                                        <strong>Parameter Bahaya:</strong>{" "}
                                        Menjawab <strong>&quot;Tidak&quot;</strong> =
                                        Kondisi Baik (Skor 1). Menjawab{" "}
                                        <strong>&quot;Ya&quot;</strong> = Ada Bahaya (Skor
                                        0, Temuan Wajib).
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {currentAnswer && (
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${evalRes.isNA
                                    ? "bg-slate-200 text-slate-700 border border-slate-300"
                                    : evalRes.isGood
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-rose-100 text-rose-800 border border-rose-300"
                                    }`}
                                >
                                  {evalRes.isNA
                                    ? "N/A (Pembagi -1)"
                                    : evalRes.isGood
                                      ? "+1 Poin (Baik)"
                                      : "0 Poin (Buruk)"}
                                </span>
                              )}
                            </div>

                            <div className="pt-2 flex flex-wrap items-center gap-3">
                              <label
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${currentAnswer === "Ya"
                                  ? q.isReverse
                                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                    : "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  value="Ya"
                                  checked={currentAnswer === "Ya"}
                                  onChange={() => handleAnswerChange(q.id, "Ya")}
                                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                />
                                <span>Ya</span>
                                {currentAnswer === "Ya" && (
                                  <span className="text-[10px] opacity-90 font-medium">
                                    {q.isReverse ? "(Negatif)" : "(Baik)"}
                                  </span>
                                )}
                              </label>

                              <label
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${currentAnswer === "Tidak"
                                  ? q.isReverse
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-rose-600 text-white border-rose-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  value="Tidak"
                                  checked={currentAnswer === "Tidak"}
                                  onChange={() =>
                                    handleAnswerChange(q.id, "Tidak")
                                  }
                                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                />
                                <span>Tidak</span>
                                {currentAnswer === "Tidak" && (
                                  <span className="text-[10px] opacity-90 font-medium">
                                    {q.isReverse ? "(Baik)" : "(Negatif)"}
                                  </span>
                                )}
                              </label>

                              {q.allowNA && (
                                <label
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${currentAnswer === "Tidak Relevan"
                                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                                    : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                                    }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${q.id}`}
                                    value="Tidak Relevan"
                                    checked={currentAnswer === "Tidak Relevan"}
                                    onChange={() =>
                                      handleAnswerChange(q.id, "Tidak Relevan")
                                    }
                                    className="w-3.5 h-3.5 accent-slate-700 cursor-pointer"
                                  />
                                  <MinusCircle size={13} />
                                  <span>Tidak Relevan (N/A)</span>
                                </label>
                              )}
                            </div>

                            <div className="pt-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <label
                                  className={`text-xs font-bold flex items-center gap-1.5 ${isRequiredTemuan
                                    ? "text-rose-700"
                                    : "text-slate-600"
                                    }`}
                                >
                                  {isRequiredTemuan ? (
                                    <>
                                      <AlertCircle
                                        size={14}
                                        className="text-rose-600"
                                      />
                                      <span>Temuan Lapangan (Wajib Diisi)*</span>
                                    </>
                                  ) : (
                                    <span>Catatan Temuan (Opsional)</span>
                                  )}
                                </label>

                                {isRequiredTemuan && (
                                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
                                    Kondisi negatif terdeteksi
                                  </span>
                                )}
                              </div>

                              <Textarea
                                value={currentTemuan}
                                onChange={(e) =>
                                  handleTemuanChange(q.id, e.target.value)
                                }
                                placeholder={
                                  isRequiredTemuan
                                    ? "Wajib dijelaskan: Uraikan temuan kekurangan, ketidaksesuaian, atau kondisi di lapangan..."
                                    : "Tuliskan catatan observasi atau keterangan tambahan..."
                                }
                                className={`text-xs min-h-[60px] bg-white transition-colors ${isRequiredTemuan
                                  ? !currentTemuan.trim()
                                    ? "border-rose-400 focus:border-rose-600 ring-1 ring-rose-200"
                                    : "border-emerald-300 focus:border-emerald-500"
                                  : "border-slate-200"
                                  }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentIndex = QUESTION_CATEGORIES.findIndex(
                    (c) => c.id === activeCategoryTab
                  );
                  if (currentIndex > 0) {
                    setActiveCategoryTab(
                      QUESTION_CATEGORIES[currentIndex - 1].id
                    );
                  }
                }}
                disabled={activeCategoryTab === "A"}
                className="text-xs rounded-lg cursor-pointer"
              >
                ← Kategori Sebelumnya
              </Button>

              <div className="text-xs font-semibold text-slate-500">
                Kategori {activeCategoryTab} dari {QUESTION_CATEGORIES.length}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentIndex = QUESTION_CATEGORIES.findIndex(
                    (c) => c.id === activeCategoryTab
                  );
                  if (currentIndex < QUESTION_CATEGORIES.length - 1) {
                    setActiveCategoryTab(
                      QUESTION_CATEGORIES[currentIndex + 1].id
                    );
                  }
                }}
                disabled={activeCategoryTab === "H"}
                className="text-xs rounded-lg cursor-pointer"
              >
                Kategori Selanjutnya →
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 -mx-5 -mb-5 md:-mx-6 md:-mb-6 p-4 rounded-b-2xl">
              <div className="text-xs text-slate-600 font-medium">
                Skor Akumulasi:{" "}
                <span className="font-black text-slate-900 text-sm">
                  {liveScoreData.totalScore} /{" "}
                  {liveScoreData.effectiveTotalQuestions}
                </span>{" "}
                ({liveScoreData.percentage}%)
                {liveScoreData.naCount > 0 && (
                  <span className="ml-1.5 text-slate-500">
                    • {liveScoreData.naCount} Tidak Relevan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs px-6 py-2 h-auto shadow-md hover:shadow-orange-500/20 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Menyimpan Data...
                    </>
                  ) : (
                    <>
                      <FileCheck size={16} />
                      Simpan Penilaian K3
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL PENILAIAN & PUSAT CETAK / UNDUH LAPORAN                   */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
          {selectedRecord && selectedRecordParsed && (
            <>
              {/* HEADER MODAL */}
              <div className="sticky top-0 z-30 bg-slate-900 text-white p-5 md:p-6 rounded-t-2xl shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck size={14} />
                      Lembar Evaluasi Rincian Performance K3
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-black text-white">
                      {selectedRecord.nama_proyek}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-300 flex flex-wrap items-center gap-3 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-blue-400" />
                        {selectedRecord.area}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-blue-400" />
                        {formatDate(selectedRecord.tanggal_inspection)}
                      </span>
                      <span>•</span>
                      <span>
                        Skor: {selectedRecordParsed.totalSkor} /{" "}
                        {selectedRecordParsed.totalRelevan} Relevan (
                        {selectedRecordParsed.totalNA} N/A)
                      </span>
                    </DialogDescription>
                  </div>

                  {(() => {
                    const sNum = Number(selectedRecord.score_percentage) || 0;
                    const gInfo = getScoreGrade(sNum);
                    return (
                      <div className="flex items-center gap-3.5 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 self-start md:self-center shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] font-semibold text-slate-300">
                            Skor Akhir
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gInfo.badgeColor}`}
                          >
                            {gInfo.grade}
                          </span>
                        </div>
                        <div className="text-3xl font-black text-white leading-none">
                          {sNum.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* BODY DETAIL MODAL */}
              <div className="p-5 md:p-6 space-y-6 flex-1">
                <div className="space-y-3 border-b border-slate-200 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Navigasi Kategori Penilaian:
                    </span>
                    <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer font-medium bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto">
                      <input
                        type="checkbox"
                        checked={filterOnlyWithTemuan}
                        onChange={(e) =>
                          setFilterOnlyWithTemuan(e.target.checked)
                        }
                        className="rounded accent-blue-600 cursor-pointer"
                      />
                      <span>Hanya Tampilkan Yang Ada Catatan Temuan</span>
                    </label>
                  </div>

                  {/* TAB BUTTONS */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${activeCategoryFilter === "ALL"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                    >
                      Semua Kategori (A - H)
                    </button>

                    {selectedRecordParsed.categories.map((cat) => {
                      const isActive = activeCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategoryFilter(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                        >
                          {cat.id}. {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LOOPING KATEGORI A SAMPAI H */}
                {selectedRecordParsed.categories.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Tidak ada rincian data kuesioner yang tersedia pada record
                    ini.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedRecordParsed.categories
                      .filter(
                        (cat) =>
                          activeCategoryFilter === "ALL" ||
                          activeCategoryFilter === cat.id
                      )
                      .map((cat) => {
                        const displayItems = filterOnlyWithTemuan
                          ? cat.items.filter((item) =>
                            hasTemuanContent(item.temuan)
                          )
                          : cat.items;

                        if (displayItems.length === 0 && filterOnlyWithTemuan) {
                          return null;
                        }

                        return (
                          <div
                            key={cat.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                          >
                            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                  {cat.id}
                                </span>
                                <h3 className="font-bold text-slate-800 text-sm">
                                  Kategori {cat.id}: {cat.name}
                                </h3>
                              </div>
                              <span className="text-xs font-semibold text-blue-700">
                                Skor: {cat.score}/{cat.relevantTotal} (
                                {cat.percentage}%)
                              </span>
                            </div>

                            <div className="divide-y divide-slate-100 p-2">
                              {displayItems.map((item, itemIdx) => {
                                const ansLower = (item.jawaban || "")
                                  .trim()
                                  .toLowerCase();
                                const isYa = ansLower === "ya";
                                const isTidak = ansLower === "tidak";
                                const isNA = item.is_na;

                                return (
                                  <div
                                    key={item.id || itemIdx}
                                    className="p-3 hover:bg-slate-50/70 transition-colors rounded-lg space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2.5">
                                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0 mt-0.5">
                                          {item.code}
                                        </span>
                                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                                          {item.pertanyaan}
                                        </p>
                                      </div>

                                      <div className="shrink-0 flex items-center gap-1.5">
                                        {isNA ? (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                            <MinusCircle
                                              size={13}
                                              className="text-slate-500"
                                            />
                                            Tidak Relevan
                                          </span>
                                        ) : isYa ? (
                                          <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${item.is_reverse
                                              ? "bg-rose-100 text-rose-800 border-rose-300"
                                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                              }`}
                                          >
                                            {item.is_reverse ? (
                                              <XCircle
                                                size={13}
                                                className="text-rose-600"
                                              />
                                            ) : (
                                              <CheckCircle2
                                                size={13}
                                                className="text-emerald-600"
                                              />
                                            )}
                                            Ya
                                          </span>
                                        ) : isTidak ? (
                                          <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${item.is_reverse
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                              : "bg-rose-100 text-rose-800 border-rose-300"
                                              }`}
                                          >
                                            {item.is_reverse ? (
                                              <CheckCircle2
                                                size={13}
                                                className="text-emerald-600"
                                              />
                                            ) : (
                                              <XCircle
                                                size={13}
                                                className="text-rose-600"
                                              />
                                            )}
                                            Tidak
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                            {item.jawaban || "-"}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {hasTemuanContent(item.temuan) && (
                                      <div className="mt-1.5 ml-7 text-xs bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-amber-900 flex items-start gap-2">
                                        <AlertTriangle
                                          size={14}
                                          className="text-amber-600 shrink-0 mt-0.5"
                                        />
                                        <div className="space-y-0.5">
                                          <span className="font-bold text-amber-950">
                                            Catatan Temuan:
                                          </span>
                                          <p className="italic text-amber-900 font-normal">
                                            &ldquo;{item.temuan}&rdquo;
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* FOOTER DETAIL MODAL (TEMPAT KHUSUS CETAK & EDIT PROYEK) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Cetak Rincian Proyek Ini */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadProjectExcel(selectedRecord)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      Unduh Excel Proyek Ini
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadProjectPDF(selectedRecord)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      Cetak PDF Proyek Ini
                    </Button>

                    {/* Cetak Rekap Global */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadGlobalExcel}
                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      Rekap Global (Excel)
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadGlobalPDF}
                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} className="text-rose-600" />
                      Rekap Global (PDF)
                    </Button>
                  </div>

                  {/* Tombol Edit & Tutup */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailModalOpen(false);
                        setRecordToEdit(selectedRecord);
                        setEditModalOpen(true);
                      }}
                      className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={14} />
                      Edit Data Proyek
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDetailModalOpen(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer px-5"
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PENILAIAN (DARI FILE app/performance/edit.tsx)              */}
      {/* ========================================================================= */}
      <EditPerformanceK3Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        record={recordToEdit}
        onSuccess={fetchRecords}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: KONFIRMASI HAPUS DATA                                            */}
      {/* ========================================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[90vw] sm:max-w-md p-6 bg-white rounded-2xl shadow-xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <DialogTitle className="text-lg font-black text-slate-800">
                Hapus Data Penilaian?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data penilaian K3 untuk proyek{" "}
                <span className="font-bold text-slate-700">
                  &ldquo;{recordToDelete?.nama_proyek}&rdquo;
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="text-xs rounded-xl cursor-pointer"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}