"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    ALL_AREAS,
    QUESTION_CATEGORIES,
    TOTAL_QUESTIONS,
    evaluateQuestionAnswer,
    AnswerOption,
    PerformanceK3Detail,
    InspectionDetailItem,
    CategoryScoreSummary,
} from "./k3Questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Building2,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    RefreshCw,
    FileCheck,
    Sparkles,
    MinusCircle,
    Pencil,
} from "lucide-react";
import { PerformanceRecord, parseDetailPenilaianToCategories } from "./page";

interface EditPerformanceK3ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: PerformanceRecord | null;
    onSuccess: () => void;
}

export default function EditPerformanceK3Modal({
    open,
    onOpenChange,
    record,
    onSuccess,
}: EditPerformanceK3ModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeCategoryTab, setActiveCategoryTab] = useState<string>("A");
    const [formErrors, setFormErrors] = useState<string[]>([]);

    // State Data Dasar Proyek
    const [formData, setFormData] = useState({
        nama_proyek: "",
        area: ALL_AREAS[0],
        tanggal_inspection: "",
    });

    // State Jawaban 48 Parameter
    const [answers, setAnswers] = useState<
        Record<string, { jawaban: AnswerOption; temuan: string }>
    >({});

    // Isi ulang state saat modal dibuka dengan record yang dipilih
    useEffect(() => {
        if (!record || !open) return;

        setFormData({
            nama_proyek: record.nama_proyek || "",
            area: record.area || ALL_AREAS[0],
            tanggal_inspection: record.tanggal_inspection
                ? record.tanggal_inspection.split("T")[0]
                : new Date().toISOString().split("T")[0],
        });

        const parsed = parseDetailPenilaianToCategories(record.detail_penilaian);
        const loadedAnswers: Record<
            string,
            { jawaban: AnswerOption; temuan: string }
        > = {};

        // Inisialisasi default kosong terlebih dahulu
        QUESTION_CATEGORIES.forEach((cat) => {
            cat.questions.forEach((q) => {
                loadedAnswers[q.id] = { jawaban: "", temuan: "" };
            });
        });

        // Masukkan data existing dari record
        parsed.categories.forEach((cat) => {
            cat.items.forEach((item) => {
                const rawAns = (item.jawaban || "").trim();
                let mappedAns: AnswerOption = "";
                if (rawAns.toLowerCase() === "ya") mappedAns = "Ya";
                else if (rawAns.toLowerCase() === "tidak") mappedAns = "Tidak";
                else if (
                    rawAns.toLowerCase() === "tidak relevan" ||
                    rawAns.toUpperCase() === "N/A" ||
                    rawAns.toUpperCase() === "NA"
                ) {
                    mappedAns = "Tidak Relevan";
                }

                const cleanTemuan =
                    item.temuan && item.temuan.trim() !== "-" ? item.temuan : "";

                loadedAnswers[item.id] = {
                    jawaban: mappedAns,
                    temuan: cleanTemuan,
                };
            });
        });

        setAnswers(loadedAnswers);
        setFormErrors([]);
        setActiveCategoryTab("A");
    }, [record, open]);

    // Kalkulasi Live Score selama proses edit
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

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!record) return;

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
            const modalEl = document.getElementById("k3-edit-modal-content");
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
                .update({
                    nama_proyek: formData.nama_proyek.trim(),
                    area: formData.area,
                    tanggal_inspection: formData.tanggal_inspection,
                    detail_penilaian: detailPenilaianPayload,
                    score_percentage: finalScorePercentage,
                })
                .eq("id", record.id);

            if (error) throw error;

            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error("Gagal memperbarui penilaian K3:", err.message);
            setFormErrors([`Gagal menyimpan perubahan ke database: ${err.message}`]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                id="k3-edit-modal-content"
                className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col"
            >
                {/* HEADER MODAL STICKY */}
                <div className="sticky top-0 z-30 bg-gradient-to-r from-amber-600 via-orange-600 to-blue-700 text-white p-5 rounded-t-2xl shadow-md">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold border border-white/20 mb-1">
                                <Pencil size={12} />
                                Mode Edit Evaluasi Proyek
                            </div>
                            <DialogTitle className="text-xl md:text-2xl font-black text-white">
                                Edit Penilaian Performance K3
                            </DialogTitle>
                            <p className="text-xs md:text-sm text-orange-50/90 mt-1">
                                Perbarui informasi proyek, status jawaban (Ya / Tidak / Tidak
                                Relevan), atau catatan temuan lapangan.
                            </p>
                        </div>

                        {/* LIVE SCORE INDICATOR */}
                        <div className="hidden sm:flex flex-col items-end bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0">
                            <span className="text-[10px] font-semibold text-orange-100 uppercase tracking-wider">
                                Skor Baru
                            </span>
                            <div className="text-2xl font-black text-white leading-none mt-0.5">
                                {liveScoreData.percentage}%
                            </div>
                            <div className="text-[11px] text-orange-100 mt-1 font-medium">
                                Skor: {liveScoreData.totalScore} /{" "}
                                {liveScoreData.effectiveTotalQuestions} Relevan (
                                {liveScoreData.naCount} N/A)
                            </div>
                        </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-orange-50">
                            <span>
                                Kelengkapan Parameter ({liveScoreData.answeredCount} /{" "}
                                {TOTAL_QUESTIONS} Terisi)
                            </span>
                            <span>
                                {Math.round(
                                    (liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100
                                )}
                                %
                            </span>
                        </div>
                        <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-300 to-emerald-400 rounded-full transition-all duration-300"
                                style={{
                                    width: `${(liveScoreData.answeredCount / TOTAL_QUESTIONS) * 100
                                        }%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* FORM BODY */}
                <form
                    onSubmit={handleUpdateSubmit}
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

                    {/* INFORMASI DASAR PROYEK */}
                    <div className="bg-slate-50/80 p-4 md:p-5 rounded-xl border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-200/60 pb-2">
                            <Building2 size={16} className="text-orange-600" />
                            Data Dasar Inspeksi Proyek
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

                    {/* NAVIGASI KATEGORI */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                            <div>
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-600" />
                                    Edit Rincian Kuesioner K3 (Kategori A s/d H)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Pertanyaan yang dijawab{" "}
                                    <strong>Tidak Relevan (N/A)</strong> otomatis mengurangi
                                    pembagi soal.
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
                                Set Semua Standar Baik
                            </Button>
                        </div>

                        {/* TABS KATEGORI (A s/d H) */}
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

                    {/* DAFTAR PERTANYAAN UNTUK KATEGORI AKTIF */}
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
                                                                            <strong>Parameter Bahaya:</strong> Menjawab{" "}
                                                                            <strong>&quot;Tidak&quot;</strong> = Kondisi Baik
                                                                            (Skor 1). Menjawab{" "}
                                                                            <strong>&quot;Ya&quot;</strong> = Ada Bahaya (Skor 0,
                                                                            Temuan Wajib).
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

                                                    {/* Pilihan Radio: Ya, Tidak, dan Tidak Relevan */}
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
                                                                name={`edit_q_${q.id}`}
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
                                                                name={`edit_q_${q.id}`}
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
                                                                    name={`edit_q_${q.id}`}
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

                                                    {/* Textarea Temuan */}
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

                    {/* NAVIGASI KATEGORI SEBELUMNYA / SELANJUTNYA */}
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

                    {/* FOOTER SUBMIT EDIT */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 -mx-5 -mb-5 md:-mx-6 md:-mb-6 p-4 rounded-b-2xl">
                        <div className="text-xs text-slate-600 font-medium">
                            Skor Hasil Edit:{" "}
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
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Batal
                            </Button>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-6 py-2 h-auto shadow-md cursor-pointer flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Menyimpan Perubahan...
                                    </>
                                ) : (
                                    <>
                                        <FileCheck size={16} />
                                        Simpan Perubahan
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}