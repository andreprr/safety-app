"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ALL_AREAS,
  QUESTION_CATEGORIES,
  TOTAL_QUESTIONS,
  evaluateQuestionAnswer,
  getScoreGrade,
  PerformanceK3Record,
  PerformanceK3Detail,
  InspectionDetailItem,
  CategoryScoreSummary,
} from "./k3Questions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  X,
  FileCheck,
  ChevronDown,
  Printer,
  Sparkles,
} from "lucide-react";

// Format tanggal standar Indonesia
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
  ];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export default function PerformanceK3Page() {
  // State data utama
  const [records, setRecords] = useState<PerformanceK3Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState("Semua Area");

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

  // Form State Kuesioner: { [questionId]: { jawaban: "Ya"|"Tidak"|"", temuan: "" } }
  const [answers, setAnswers] = useState<
    Record<string, { jawaban: "Ya" | "Tidak" | ""; temuan: string }>
  >({});

  // Modal Detail Penilaian
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PerformanceK3Record | null>(null);
  const [detailFilterOnlyNegative, setDetailFilterOnlyNegative] = useState(false);

  // Modal Hapus Konfirmasi
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<PerformanceK3Record | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inisialisasi awal kuesioner kosong
  const resetForm = () => {
    setFormData({
      nama_proyek: "",
      area: ALL_AREAS[0],
      tanggal_inspection: new Date().toISOString().split("T")[0],
    });
    const initialAnswers: Record<
      string,
      { jawaban: "Ya" | "Tidak" | ""; temuan: string }
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

  // Muat data dari Supabase
  const fetchRecords = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("performance_k3")
        .select("*")
        .order("tanggal_inspection", { ascending: false });

      if (error) throw error;
      setRecords((data as PerformanceK3Record[]) || []);
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
  }, []);

  // Hitung live score saat modal form sedang diisi
  const liveScoreData = useMemo(() => {
    let totalScore = 0;
    let answeredCount = 0;
    const categoryProgress: Record<
      string,
      { answered: number; total: number; score: number }
    > = {};

    QUESTION_CATEGORIES.forEach((cat) => {
      categoryProgress[cat.id] = { answered: 0, total: cat.questions.length, score: 0 };
      cat.questions.forEach((q) => {
        const itemAns = answers[q.id]?.jawaban;
        if (itemAns === "Ya" || itemAns === "Tidak") {
          answeredCount++;
          categoryProgress[cat.id].answered++;
          const evaluation = evaluateQuestionAnswer(q, itemAns);
          totalScore += evaluation.score;
          categoryProgress[cat.id].score += evaluation.score;
        }
      });
    });

    const percentage =
      TOTAL_QUESTIONS > 0 ? parseFloat(((totalScore / TOTAL_QUESTIONS) * 100).toFixed(2)) : 0;

    return {
      totalScore,
      totalQuestions: TOTAL_QUESTIONS,
      answeredCount,
      percentage,
      categoryProgress,
    };
  }, [answers]);

  // Handler ubah jawaban per pertanyaan
  const handleAnswerChange = (questionId: string, value: "Ya" | "Tidak") => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        jawaban: value,
      },
    }));
  };

  // Handler ubah teks temuan per pertanyaan
  const handleTemuanChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        temuan: text,
      },
    }));
  };

  // Helper: Isi cepat semua jawaban positif (Standar Kepatuhan K3)
  const handleFillStandardPositive = () => {
    const updatedAnswers: Record<
      string,
      { jawaban: "Ya" | "Tidak" | ""; temuan: string }
    > = {};
    QUESTION_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        // Untuk C.1 & C.2 ("Unsafe Action & Unsafe Condition"), jawaban positif adalah "Tidak"
        const positiveVal: "Ya" | "Tidak" = q.isReverse ? "Tidak" : "Ya";
        updatedAnswers[q.id] = {
          jawaban: positiveVal,
          temuan: answers[q.id]?.temuan || "",
        };
      });
    });
    setAnswers(updatedAnswers);
    setFormErrors([]);
  };

  // Validasi dan Submit Form
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

    // Cek kelengkapan setiap kuesioner dan temuan yang required
    const unansweredList: string[] = [];
    const missingTemuanList: string[] = [];

    const detailItems: InspectionDetailItem[] = [];
    const categoryScores: Record<string, CategoryScoreSummary> = {};
    let totalScoreCalculated = 0;

    QUESTION_CATEGORIES.forEach((cat) => {
      let catScore = 0;
      cat.questions.forEach((q) => {
        const itemState = answers[q.id];
        const val = itemState?.jawaban || "";
        const temuanText = (itemState?.temuan || "").trim();

        if (!val) {
          unansweredList.push(`${q.code} (${cat.name})`);
        } else {
          const evalRes = evaluateQuestionAnswer(q, val);
          catScore += evalRes.score;
          totalScoreCalculated += evalRes.score;

          // ATURAN REQUIRED: Jika bernilai negatif, kolom Temuan wajib diisi!
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
            temuan: temuanText,
          });
        }
      });

      categoryScores[cat.id] = {
        name: cat.name,
        score: catScore,
        total: cat.questions.length,
        percentage: parseFloat(((catScore / cat.questions.length) * 100).toFixed(1)),
      };
    });

    if (unansweredList.length > 0) {
      errors.push(
        `Terdapat ${unansweredList.length} pertanyaan yang belum dijawab: ${unansweredList.slice(0, 3).join(", ")}${unansweredList.length > 3 ? "..." : ""}`
      );
    }

    if (missingTemuanList.length > 0) {
      errors.push(
        `Temuan wajib diisi untuk setiap jawaban bernilai negatif! Kurang diisi pada: ${missingTemuanList.slice(0, 3).join(", ")}${missingTemuanList.length > 3 ? "..." : ""}`
      );
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      // Scroll ke bagian atas modal form untuk melihat alert error
      const modalEl = document.getElementById("k3-modal-content");
      if (modalEl) modalEl.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFormErrors([]);
    setIsSubmitting(true);

    try {
      // Kalkulasi rumus: (Total Skor Diperoleh / Total Seluruh Pertanyaan) * 100
      const finalScorePercentage = parseFloat(
        ((totalScoreCalculated / TOTAL_QUESTIONS) * 100).toFixed(2)
      );

      const detailPenilaianPayload: PerformanceK3Detail = {
        total_pertanyaan: TOTAL_QUESTIONS,
        total_skor: totalScoreCalculated,
        score_percentage: finalScorePercentage,
        category_scores: categoryScores,
        items: detailItems,
      };

      const { data: insertedData, error } = await supabase
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

      // Refresh tabel data
      await fetchRecords();

      // Tutup modal dan reset
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Gagal menyimpan penilaian K3:", err.message);
      setFormErrors([`Gagal menyimpan ke database: ${err.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Hapus Record
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

  // Filter data tabel
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.nama_proyek.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.area.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        selectedAreaFilter === "Semua Area" || r.area === selectedAreaFilter;
      return matchesSearch && matchesArea;
    });
  }, [records, searchQuery, selectedAreaFilter]);

  // Statistik ringkasan
  const summaryStats = useMemo(() => {
    if (records.length === 0) {
      return { total: 0, avgScore: 0, highestScore: 0, needsAttention: 0 };
    }
    const total = records.length;
    const sumScores = records.reduce((acc, curr) => acc + (Number(curr.score_percentage) || 0), 0);
    const avgScore = (sumScores / total).toFixed(1);
    const highestScore = Math.max(...records.map((r) => Number(r.score_percentage) || 0)).toFixed(1);
    const needsAttention = records.filter((r) => (Number(r.score_percentage) || 0) < 70).length;

    return { total, avgScore, highestScore, needsAttention };
  }, [records]);

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
            Evaluasi kepatuhan, scoring komprehensif, dan pemantauan standar keselamatan & kesehatan kerja di seluruh area proyek.
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
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl h-auto py-2.5 px-3 cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* STAT CARDS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-sm bg-white hover:border-blue-300 transition-colors">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Penilaian
              </span>
              <div className="text-2xl md:text-3xl font-black text-slate-800">
                {summaryStats.total}
              </div>
              <span className="text-[11px] text-slate-400">Inspeksi tercatat</span>
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
                Rata-rata Skor
              </span>
              <div className="text-2xl md:text-3xl font-black text-emerald-600">
                {summaryStats.avgScore}%
              </div>
              <span className="text-[11px] text-slate-400">
                {Number(summaryStats.avgScore) >= 85 ? "Kategori Sangat Baik" : "Indeks Kepatuhan"}
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
                Skor Tertinggi
              </span>
              <div className="text-2xl md:text-3xl font-black text-indigo-600">
                {summaryStats.highestScore}%
              </div>
              <span className="text-[11px] text-slate-400">Best practice proyek</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={24} />
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
              <span className="text-[11px] text-slate-400">Skor di bawah 70%</span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & TOOLBAR PENCARIAN */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama proyek atau area..."
            className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus:bg-white rounded-lg text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500 cursor-pointer min-w-[180px]"
          >
            <option value="Semua Area">Semua Area ({records.length})</option>
            {ALL_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABEL DAFTAR PENILAIAN */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm md:text-base">
              Daftar Hasil Penilaian Performance K3
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {filteredRecords.length} data
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm font-medium">Memuat data penilaian K3...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileCheck size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-base">Belum Ada Penilaian</h3>
              <p className="text-slate-500 text-xs md:text-sm max-w-sm">
                {searchQuery || selectedAreaFilter !== "Semua Area"
                  ? "Tidak ada data yang sesuai dengan filter pencarian Anda."
                  : "Mulai buat evaluasi keselamatan kerja baru dengan mengklik tombol Tambah Penilaian."}
              </p>
            </div>
            {!searchQuery && selectedAreaFilter === "Semua Area" && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
              >
                <Plus size={16} className="mr-1.5" />
                Tambah Penilaian Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-12 text-center font-bold text-slate-700 text-xs">No</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Nama Proyek</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Area</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Tanggal</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center w-52">
                    Hasil Score (%)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 w-32">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((row, idx) => {
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

                      <TableCell className="font-bold text-slate-800 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{row.nama_proyek}</span>
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
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeInfo.color}`}
                            >
                              {gradeInfo.grade}
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full ${gradeInfo.barColor} transition-all duration-500 rounded-full`}
                              style={{ width: `${Math.min(100, Math.max(0, scoreNum))}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(row);
                              setDetailFilterOnlyNegative(false);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                            title="Lihat Detail Penilaian"
                          >
                            <Eye size={14} />
                            Detail
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
      {/* MODAL / DIALOG FORM PENILAIAN PERFORMANCE K3                              */}
      {/* ========================================================================= */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          id="k3-modal-content"
          className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col"
        >
          {/* HEADER MODAL STICKY */}
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
                  Lengkapi data proyek dan berikan penilaian untuk setiap parameter keselamatan kerja.
                </p>
              </div>

              {/* LIVE SCORE INDICATOR */}
              <div className="hidden sm:flex flex-col items-end bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0">
                <span className="text-[10px] font-semibold text-blue-100 uppercase tracking-wider">
                  Skor Sementara
                </span>
                <div className="text-2xl font-black text-white leading-none mt-0.5">
                  {liveScoreData.percentage}%
                </div>
                <div className="text-[11px] text-blue-200 mt-1 font-medium">
                  {liveScoreData.answeredCount} / {TOTAL_QUESTIONS} Terjawab
                </div>
              </div>
            </div>

            {/* LIVE SCORE PROGRESS BAR MOBILE/DESKTOP */}
            <div className="mt-3.5 space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-blue-100">
                <span>Kelengkapan Pengisian</span>
                <span>
                  {liveScoreData.answeredCount} dari {TOTAL_QUESTIONS} pertanyaan (
                  {Math.round((liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-blue-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${(liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmitForm} className="p-5 md:p-6 space-y-6 flex-1">
            {/* ALERT ERROR JIKA VALIDASI GAGAL */}
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

            {/* BAGIAN A: INFORMASI DASAR PROYEK */}
            <div className="bg-slate-50/80 p-4 md:p-5 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-200/60 pb-2">
                <Building2 size={16} className="text-blue-600" />
                Data Dasar Inspeksi
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nama Proyek */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">
                    Nama Proyek <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.nama_proyek}
                    onChange={(e) => setFormData({ ...formData, nama_proyek: e.target.value })}
                    placeholder="Contoh: Renovasi Stasiun Gambir"
                    className="bg-white border-slate-200 text-sm h-10"
                  />
                </div>

                {/* Area Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Area Proyek <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                  >
                    {ALL_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal Safety Inspection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tanggal Safety Inspection <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.tanggal_inspection}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_inspection: e.target.value })
                    }
                    className="bg-white border-slate-200 text-sm h-10"
                  />
                </div>
              </div>
            </div>

            {/* ACTION CEPAT & NAVIGASI KATEGORI */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Kuesioner Penilaian K3
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih Ya/Tidak. Catatan Temuan wajib diisi jika jawaban bernilai kondisi negatif/buruk.
                  </p>
                </div>

                {/* Tombol Isi Cepat Standar Baik */}
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

              {/* TABS KATEGORI (A s/d H) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {QUESTION_CATEGORIES.map((cat) => {
                  const progress = liveScoreData.categoryProgress[cat.id];
                  const isComplete = progress && progress.answered === progress.total;
                  const isActive = activeCategoryTab === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isActive
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
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
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

            {/* DAFTAR PERTANYAAN UNTUK KATEGORI AKTIF */}
            {QUESTION_CATEGORIES.filter((c) => c.id === activeCategoryTab).map((cat) => (
              <div key={cat.id} className="space-y-4">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                      {cat.id}
                    </span>
                    <span>Kategori {cat.id}: {cat.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">
                    {cat.questions.length} Pertanyaan
                  </span>
                </div>

                <div className="space-y-4">
                  {cat.questions.map((q, qIndex) => {
                    const currentAnswer = answers[q.id]?.jawaban || "";
                    const currentTemuan = answers[q.id]?.temuan || "";
                    const evalRes = evaluateQuestionAnswer(q, currentAnswer);
                    const isRequiredTemuan = evalRes.isNegative;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 md:p-5 rounded-xl border transition-all ${
                          !currentAnswer
                            ? "bg-white border-slate-200"
                            : evalRes.isGood
                            ? "bg-emerald-50/20 border-emerald-200/80 shadow-xs"
                            : "bg-rose-50/25 border-rose-200 shadow-xs"
                        }`}
                      >
                        {/* Header Pertanyaan */}
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

                                {/* Peringatan khusus untuk Reverse Logic (C.1 & C.2) */}
                                {q.isReverse && (
                                  <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                                    <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                                    <span>
                                      <strong>Parameter Bahaya:</strong> Menjawab <strong>"Tidak"</strong> = Kondisi Baik (Skor 1). Menjawab <strong>"Ya"</strong> = Kondisi Negatif/Ada Bahaya (Skor 0, Temuan Wajib Diisi).
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Skor Badge */}
                            {currentAnswer && (
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                  evalRes.isGood
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}
                              >
                                {evalRes.isGood ? "+1 Poin (Baik)" : "0 Poin (Buruk)"}
                              </span>
                            )}
                          </div>

                          {/* Pilihan Ganda (Radio Button): Ya atau Tidak */}
                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            <label
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                                currentAnswer === "Ya"
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
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                                currentAnswer === "Tidak"
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
                                onChange={() => handleAnswerChange(q.id, "Tidak")}
                                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                              />
                              <span>Tidak</span>
                              {currentAnswer === "Tidak" && (
                                <span className="text-[10px] opacity-90 font-medium">
                                  {q.isReverse ? "(Baik)" : "(Negatif)"}
                                </span>
                              )}
                            </label>
                          </div>

                          {/* Textarea: "Temuan" */}
                          <div className="pt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <label
                                className={`text-xs font-bold flex items-center gap-1.5 ${
                                  isRequiredTemuan ? "text-rose-700" : "text-slate-600"
                                }`}
                              >
                                {isRequiredTemuan ? (
                                  <>
                                    <AlertCircle size={14} className="text-rose-600" />
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
                              onChange={(e) => handleTemuanChange(q.id, e.target.value)}
                              placeholder={
                                isRequiredTemuan
                                  ? "Wajib dijelaskan: Uraikan temuan kekurangan, ketidaksesuaian, atau kondisi di lapangan..."
                                  : "Tuliskan catatan observasi atau temuan jika ada..."
                              }
                              className={`text-xs min-h-[64px] bg-white transition-colors ${
                                isRequiredTemuan
                                  ? !currentTemuan.trim()
                                    ? "border-rose-400 focus:border-rose-600 ring-1 ring-rose-200"
                                    : "border-emerald-300 focus:border-emerald-500"
                                  : "border-slate-200"
                              }`}
                            />
                            {isRequiredTemuan && !currentTemuan.trim() && (
                              <p className="text-[11px] text-rose-600 font-medium">
                                Kolom temuan ini harus diisi sebelum mengirim penilaian.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* NAVIGASI KATEGORI BERIKUTNYA */}
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
                    setActiveCategoryTab(QUESTION_CATEGORIES[currentIndex - 1].id);
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
                    setActiveCategoryTab(QUESTION_CATEGORIES[currentIndex + 1].id);
                  }
                }}
                disabled={activeCategoryTab === "H"}
                className="text-xs rounded-lg cursor-pointer"
              >
                Kategori Selanjutnya →
              </Button>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 -mx-5 -mb-5 md:-mx-6 md:-mb-6 p-4 rounded-b-2xl">
              <div className="text-xs text-slate-600 font-medium">
                Skor Akumulasi:{" "}
                <span className="font-black text-slate-900 text-sm">
                  {liveScoreData.totalScore} / {TOTAL_QUESTIONS}
                </span>{" "}
                ({liveScoreData.percentage}%)
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
      {/* MODAL LIHAT DETAIL PENILAIAN                                              */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
          {selectedRecord && (
            <>
              {/* HEADER DETAIL */}
              <div className="sticky top-0 z-20 bg-slate-900 text-white p-5 rounded-t-2xl shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      Detail Hasil Evaluasi Performance K3
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-black text-white mt-0.5">
                      {selectedRecord.nama_proyek}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-blue-400" />
                        {selectedRecord.area}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-blue-400" />
                        {formatDate(selectedRecord.tanggal_inspection)}
                      </span>
                    </div>
                  </div>

                  {/* SCORE BADGE BESAR */}
                  {(() => {
                    const sNum = Number(selectedRecord.score_percentage) || 0;
                    const gInfo = getScoreGrade(sNum);
                    return (
                      <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 self-start md:self-center">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-300">Skor Akhir</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gInfo.badgeColor}`}>
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

              {/* DETAIL CONTENT */}
              <div className="p-5 md:p-6 space-y-6 flex-1">
                {/* RINGKASAN SKOR PER KATEGORI */}
                {selectedRecord.detail_penilaian?.category_scores && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Distribusi Skor per Kategori
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {Object.entries(selectedRecord.detail_penilaian.category_scores).map(
                        ([catId, catData]) => (
                          <div
                            key={catId}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                          >
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                              <span className="truncate">{catId}. {catData.name}</span>
                              <span className="text-slate-900">{catData.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  catData.percentage >= 85
                                    ? "bg-emerald-500"
                                    : catData.percentage >= 70
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                } rounded-full`}
                                style={{ width: `${catData.percentage}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Skor: {catData.score} dari {catData.total}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* FILTER PERTANYAAN */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Daftar Parameter Penilaian & Temuan Lapangan
                  </h3>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={detailFilterOnlyNegative}
                        onChange={(e) => setDetailFilterOnlyNegative(e.target.checked)}
                        className="rounded accent-rose-600 cursor-pointer"
                      />
                      <span>Tampilkan Hanya Temuan Negatif / Masalah</span>
                    </label>
                  </div>
                </div>

                {/* ITEM DETAIL LIST */}
                <div className="space-y-3">
                  {(() => {
                    const allItems = selectedRecord.detail_penilaian?.items || [];
                    const displayItems = detailFilterOnlyNegative
                      ? allItems.filter((i) => i.is_negative)
                      : allItems;

                    if (displayItems.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          {detailFilterOnlyNegative
                            ? "Bagus sekali! Tidak ditemukan parameter bernilai negatif / unsafe pada proyek ini."
                            : "Tidak ada detail kuesioner yang tersedia."}
                        </div>
                      );
                    }

                    return displayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border text-xs transition-colors ${
                          item.is_negative
                            ? "bg-rose-50/30 border-rose-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[11px] shrink-0 border border-slate-200 mt-0.5">
                              {item.code}
                            </span>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">
                                {item.kategori}
                              </span>
                              <p className="font-semibold text-slate-800 text-sm leading-snug">
                                {item.pertanyaan}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                item.jawaban === "Ya"
                                  ? item.is_reverse
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : item.is_reverse
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              Jawaban: {item.jawaban}
                            </span>

                            <span
                              className={`px-2 py-1 rounded-lg font-black text-xs ${
                                item.skor === 1
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {item.skor === 1 ? "1 Poin" : "0 Poin"}
                            </span>
                          </div>
                        </div>

                        {/* Temuan */}
                        {item.temuan && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-2 text-slate-700">
                            <span className="font-bold text-slate-900 shrink-0">
                              Catatan Temuan:
                            </span>
                            <p className="font-normal italic text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-200/80 w-full">
                              "{item.temuan}"
                            </p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* FOOTER DETAIL */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  Cetak Laporan
                </Button>

                <Button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI HAPUS                                                    */}
      {/* ========================================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[90vw] sm:max-w-md p-6 bg-white rounded-2xl shadow-xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <DialogTitle className="text-lg font-black text-slate-800">
                Hapus Hasil Penilaian?
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data penilaian K3 untuk proyek{" "}
                <span className="font-bold text-slate-700">
                  "{recordToDelete?.nama_proyek}"
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteRecord}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
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
