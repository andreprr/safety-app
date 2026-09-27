"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider"; // <-- Mengambil data profil user yang sedang login
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import {
    FileText, AlertCircle, Clock, CheckCircle2, Flame, ShieldAlert,
    Activity, Download, MapPin, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Calendar, CalendarDays, Save
} from "lucide-react";

const ALL_AREAS = [
    "Area 1 Jakarta", "Area 2 Bandung", "Area 3 Cirebon", "Area 4 Semarang",
    "Area 5 Purwokerto", "Area 6 Yogyakarta", "Area 7 Madiun", "Area 8 Surabaya",
    "Area 9 Jember", "Area 10 Medan", "Area 11 Padang", "Area 12 Palembang",
    "Area 13 Tanjung Karang", "Kantor Pusat"
];

// ==================================================
// 1. KOMPONEN CUSTOM KALENDER RANGE PICKER
// ==================================================
const CustomDateRangePicker = ({ startDate, endDate, onChange, label = "Rentang Waktu" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(startDate || new Date()));
    const [tempStart, setTempStart] = useState<string | null>(startDate);
    const [tempEnd, setTempEnd] = useState<string | null>(endDate);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleDayClick = (day: number) => {
        const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-CA');
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(dateStr); setTempEnd(null);
        } else {
            if (new Date(dateStr) < new Date(tempStart)) {
                setTempEnd(tempStart); setTempStart(dateStr);
            } else setTempEnd(dateStr);
        }
    };

    const handleApply = () => {
        if (tempStart && tempEnd) { onChange(tempStart, tempEnd); setIsOpen(false); }
        else if (tempStart) { onChange(tempStart, tempStart); setIsOpen(false); }
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month), firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toLocaleDateString('en-CA');
            const isStart = tempStart === dateStr, isEnd = tempEnd === dateStr;
            const isBetween = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
            if (isStart || isEnd) bgClass = "bg-[#1E3A8A] text-white font-bold shadow-md";
            else if (isBetween) bgClass = "bg-blue-100 text-[#1E3A8A] font-semibold";

            days.push(
                <button key={i} onClick={() => handleDayClick(i)} className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all ${bgClass}`}>
                    {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="h-9 px-3 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-50" title={label}>
                <Calendar size={14} className="text-slate-400" />
                <span>{startDate || 'Start'}</span> <span className="text-slate-400 font-normal">s/d</span> <span>{endDate || 'End'}</span>
            </button>
            {isOpen && (
                <div className="absolute top-11 right-0 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[300px]">
                    <div className="flex justify-between items-center mb-4 bg-slate-50 p-1.5 rounded-lg">
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsLeft size={16} /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} /></button>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] text-center flex-1">{currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (<div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">{renderCalendar()}</div>
                    <button onClick={handleApply} className="w-full mt-4 bg-[#1E3A8A] hover:bg-[#152C69] text-white text-xs font-bold py-2.5 rounded-xl shadow-md">Simpan Tanggal</button>
                </div>
            )}
        </div>
    );
};

// ==================================================
// 2. KOMPONEN CUSTOM SINGLE DATE PICKER
// ==================================================
const CustomSingleDatePicker = ({ date, onChange, label = "Pilih Tanggal Mulai Proyek" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(date || new Date()));
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleDayClick = (day: number) => {
        const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('en-CA');
        onChange(dateStr); setIsOpen(false);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month), firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toLocaleDateString('en-CA');
            const isSelected = date === dateStr;
            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
            if (isSelected) bgClass = "bg-[#1E3A8A] text-white font-bold shadow-md";

            days.push(
                <button key={i} onClick={() => handleDayClick(i)} className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all ${bgClass}`}>
                    {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="h-9 px-3 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-50 w-full" title={label}>
                <Calendar size={16} className="text-slate-400" />
                <span>{date || 'Pilih Tanggal Mulai'}</span>
            </button>
            {isOpen && (
                <div className="absolute top-11 left-0 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[280px]">
                    <div className="flex justify-between items-center mb-4 bg-slate-50 p-1.5 rounded-lg">
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsLeft size={16} /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} /></button>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] text-center flex-1">{currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (<div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">{renderCalendar()}</div>
                </div>
            )}
        </div>
    );
};

// ==================================================
// HALAMAN UTAMA DASHBOARD
// ==================================================
export default function DashboardContent() {
    const { profile } = useAuth(); // <--- MENGAMBIL ROLE DARI USER YANG LOGIN

    const [loading, setLoading] = useState(true);
    const [rawInspeksi, setRawInspeksi] = useState<any[]>([]);
    const [rawIbppr, setRawIbppr] = useState<any[]>([]);
    const [rawIbpprHeader, setRawIbpprHeader] = useState<any[]>([]);

    const [hazardWilayah, setHazardWilayah] = useState("Semua");
    const [ibprWilayah, setIbprWilayah] = useState("Semua");

    const [globalStartDate, setGlobalStartDate] = useState<string>("2025-01-01");
    const [globalEndDate, setGlobalEndDate] = useState<string>("2025-12-31");

    // State untuk Form KPI Proyek (Sinkronisasi dengan Database)
    const [activeProjectId, setActiveProjectId] = useState<string>("");
    const [kpiForm, setKpiForm] = useState({ start_date: "", workers: 0, lti: 0 });
    const [isSavingKpi, setIsSavingKpi] = useState(false);

    useEffect(() => {
        const savedGlobalStart = localStorage.getItem("sri_global_start_date");
        const savedGlobalEnd = localStorage.getItem("sri_global_end_date");
        if (savedGlobalStart) setGlobalStartDate(savedGlobalStart);
        if (savedGlobalEnd) setGlobalEndDate(savedGlobalEnd);
    }, []);

    const handleGlobalDateChange = (start: string, end: string) => {
        setGlobalStartDate(start); setGlobalEndDate(end);
        localStorage.setItem("sri_global_start_date", start);
        localStorage.setItem("sri_global_end_date", end);
    };

    const todayStr = new Date().toLocaleDateString('en-CA');

    useEffect(() => {
        fetchDashboardData();
        const channel = supabase.channel('realtime-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspeksi' }, fetchDashboardData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ibppr' }, fetchDashboardData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ibppr_header' }, fetchDashboardData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: insData } = await supabase.from("inspeksi").select("*");
            const { data: ibpData } = await supabase.from("ibppr").select("*");
            const { data: ibpHeadData } = await supabase.from("ibppr_header").select("*").order("created_at", { ascending: false });

            setRawInspeksi(insData || []);
            setRawIbppr(ibpData || []);
            setRawIbpprHeader(ibpHeadData || []);

            if (ibpHeadData && ibpHeadData.length > 0 && !activeProjectId) {
                const firstId = ibpHeadData[0].id.toString();
                setActiveProjectId(firstId);
            }
        } catch (error) {
            console.error("Gagal memuat data", error);
        } finally {
            setLoading(false);
        }
    };

    // Saat activeProject ganti, sinkronkan form KPI dengan data dari database
    useEffect(() => {
        const proj = rawIbpprHeader.find(p => p.id.toString() === activeProjectId);
        if (proj) {
            setKpiForm({
                start_date: proj.start_date || todayStr,
                workers: proj.workers || 0,
                lti: proj.lti || 0
            });
        }
    }, [activeProjectId, rawIbpprHeader]);

    // Fungsi Simpan KPI ke Database
    const saveKpiToDatabase = async () => {
        if (!activeProjectId) return;
        setIsSavingKpi(true);
        try {
            const { error } = await supabase.from("ibppr_header").update({
                start_date: kpiForm.start_date,
                workers: kpiForm.workers,
                lti: kpiForm.lti
            }).eq("id", activeProjectId);

            if (error) throw error;
            alert("Pengaturan Proyek Berhasil Disimpan!");
            fetchDashboardData();
        } catch (error: any) {
            alert("Gagal menyimpan: " + error.message);
        } finally {
            setIsSavingKpi(false);
        }
    };

    // COMPUTED STATES FOR UI
    const [stats, setStats] = useState({ open: 0, onProses: 0, closed: 0, total: 0 });
    const [hazardChartData, setHazardChartData] = useState<any[]>([]);
    const [ibprChartData, setIbprChartData] = useState<any[]>([]);

    const [kpiResult, setKpiResult] = useState({
        totalHariKerja: 0, jamKerjaAman: "0", accident: 0, incident: 0, nearmiss: 0, ltifr: "0"
    });

    useEffect(() => {
        if (loading) return;

        const getSafeDateStr = (dateStr: string) => {
            try {
                if (!dateStr) return null;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } catch { return null; }
        };

        const todayCurrentStr = new Date().toLocaleDateString('en-CA'); // MENCEGAH ERROR todayCurrentStr undefined

        // 1. DATA GLOBAL (UNTUK KOTAK HAZARD & GRAFIK)
        const globalFilteredInspeksi = rawInspeksi.filter((item) => {
            if (!globalStartDate || !globalEndDate) return true;
            const itemDate = getSafeDateStr(item.tanggal_temuan || item.created_at);
            if (!itemDate) return false;
            return itemDate >= globalStartDate && itemDate <= globalEndDate;
        });

        const globalFilteredIbpprHeader = rawIbpprHeader.filter((h) => {
            if (!globalStartDate || !globalEndDate) return true;
            const itemDate = getSafeDateStr(h.tanggal || h.created_at);
            if (!itemDate) return false;
            return itemDate >= globalStartDate && itemDate <= globalEndDate;
        });

        const validGlobalHeaderIds = globalFilteredIbpprHeader.map(h => h.id);
        const globalFilteredIbppr = rawIbppr.filter(item => validGlobalHeaderIds.includes(item.header_id));

        let open = 0, onProses = 0, closed = 0;
        globalFilteredInspeksi.forEach((item) => {
            if (item.status === "Open") open++;
            else if (item.status === "On Proses") onProses++;
            else if (item.status === "Closed") closed++;
        });
        setStats({ open, onProses, closed, total: globalFilteredInspeksi.length });

        const hazardMap: Record<string, any> = {};
        ALL_AREAS.forEach(loc => { hazardMap[loc.toUpperCase()] = { lokasi: loc, open: 0, onProses: 0, closed: 0, total: 0 }; });
        globalFilteredInspeksi.forEach(item => {
            const loc = item.lokasi ? item.lokasi.toUpperCase() : "TIDAK DIKETAHUI";
            if (!hazardMap[loc]) hazardMap[loc] = { lokasi: item.lokasi || "Lainnya", open: 0, onProses: 0, closed: 0, total: 0 };
            hazardMap[loc].total++;
            if (item.status === "Open") hazardMap[loc].open++;
            else if (item.status === "On Proses") hazardMap[loc].onProses++;
            else if (item.status === "Closed") hazardMap[loc].closed++;
        });

        let hData = Object.keys(hazardMap).map(key => ({
            ...hazardMap[key],
            tlPercent: hazardMap[key].total > 0 ? Math.round((hazardMap[key].closed / hazardMap[key].total) * 100) : 0
        }));

        if (hazardWilayah !== "Semua") hData = hData.filter(d => d.lokasi.toUpperCase() === hazardWilayah.toUpperCase());
        else {
            hData.sort((a, b) => {
                const idxA = ALL_AREAS.findIndex(area => area.toUpperCase() === a.lokasi.toUpperCase());
                const idxB = ALL_AREAS.findIndex(area => area.toUpperCase() === b.lokasi.toUpperCase());
                return (idxA !== -1 && idxB !== -1) ? idxA - idxB : (idxA !== -1 ? -1 : (idxB !== -1 ? 1 : a.lokasi.localeCompare(b.lokasi)));
            });
        }
        setHazardChartData(hData);

        const ibprMap: Record<string, any> = {};
        ALL_AREAS.forEach(loc => { ibprMap[loc.toUpperCase()] = { wilayah: loc, total: 0 }; });
        globalFilteredIbppr.forEach(item => {
            const header = globalFilteredIbpprHeader.find(h => h.id === item.header_id);
            const loc = header?.wilayah ? header.wilayah.toUpperCase() : "TIDAK DIKETAHUI";
            if (!ibprMap[loc]) ibprMap[loc] = { wilayah: header?.wilayah || "Lainnya", total: 0 };
            ibprMap[loc].total++;
        });

        let iData = Object.keys(ibprMap).map(key => ({ ...ibprMap[key] }));
        if (ibprWilayah !== "Semua") iData = iData.filter(d => d.wilayah.toUpperCase() === ibprWilayah.toUpperCase());
        else {
            iData.sort((a, b) => {
                const idxA = ALL_AREAS.findIndex(area => area.toUpperCase() === a.wilayah.toUpperCase());
                const idxB = ALL_AREAS.findIndex(area => area.toUpperCase() === b.wilayah.toUpperCase());
                return (idxA !== -1 && idxB !== -1) ? idxA - idxB : (idxA !== -1 ? -1 : (idxB !== -1 ? 1 : a.wilayah.localeCompare(b.wilayah)));
            });
        }
        setIbprChartData(iData);

        // 2. DATA KPI PROYEK (Berdasarkan Proyek yang Dipilih)
        const proj = rawIbpprHeader.find(p => p.id.toString() === activeProjectId);
        if (!proj) return;

        const projStartDate = proj.start_date || todayCurrentStr;
        const projectFilteredInspeksi = rawInspeksi.filter((item) => {
            const itemDate = getSafeDateStr(item.tanggal_temuan || item.created_at);
            if (!itemDate) return false;
            return itemDate >= projStartDate && itemDate <= todayCurrentStr;
        });

        let countAccident = 0, countIncident = 0, countNearmiss = 0;
        projectFilteredInspeksi.forEach((item) => {
            const kategoriText = (item.kategori || "").toLowerCase();
            const risk = item.risk_level;

            if (kategoriText.includes("accident") || kategoriText.includes("kecelakaan")) countAccident++;
            else if (kategoriText.includes("incident") || kategoriText.includes("insiden")) countIncident++;
            else if (kategoriText.includes("nearmiss") || kategoriText.includes("hampir")) countNearmiss++;
            else {
                if (risk === "Tinggi") countIncident++;
                else if (risk === "Sedang") countNearmiss++;
            }
        });

        const getWorkingDays = (start: string, end: string) => {
            if (!start || !end) return 0;
            let count = 0;
            let curDate = new Date(start);
            const endDateObj = new Date(end);
            if (curDate > endDateObj) return 0;
            while (curDate <= endDateObj) {
                const dayOfWeek = curDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                curDate.setDate(curDate.getDate() + 1);
            }
            return count;
        };

        const calculatedDays = getWorkingDays(projStartDate, todayCurrentStr);
        const workersCount = Number(proj.workers) || 0;
        const ltiCount = Number(proj.lti) || 0;

        const totalJamKerjaMurni = calculatedDays * 8 * workersCount;
        const ltifrValue = totalJamKerjaMurni > 0 ? (ltiCount * 1000000) / totalJamKerjaMurni : 0;

        let jamKerjaAmanTampil = totalJamKerjaMurni;
        if (countAccident > 0) jamKerjaAmanTampil = 0;

        setKpiResult({
            totalHariKerja: calculatedDays,
            jamKerjaAman: jamKerjaAmanTampil.toLocaleString('id-ID'),
            accident: countAccident,
            incident: countIncident,
            nearmiss: countNearmiss,
            ltifr: parseFloat(ltifrValue.toFixed(2)).toLocaleString('id-ID', { maximumFractionDigits: 2 })
        });

    }, [rawInspeksi, rawIbppr, rawIbpprHeader, hazardWilayah, ibprWilayah, globalStartDate, globalEndDate, activeProjectId, loading]);


    if (loading) {
        return <div className="p-8 flex justify-center items-center h-[80vh] text-[#1E3A8A] font-semibold animate-pulse">Memuat Dashboard KAI Properti...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans print:bg-white print:p-0">

            {/* ================================================== */}
            {/* HEADER DASHBOARD */}
            {/* ================================================== */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E3A8A] tracking-tight flex items-center gap-2">
                        Dashboard Kinerja K3
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Pemantauan data keselamatan kerja terpusat KAI Properti.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <div className="flex items-center text-[#1E3A8A] pl-2 pr-1 gap-2 font-bold text-xs uppercase tracking-wide">
                        <CalendarDays size={16} />
                    </div>

                    <CustomDateRangePicker
                        startDate={globalStartDate}
                        endDate={globalEndDate}
                        onChange={handleGlobalDateChange}
                        label="Filter Tanggal Seluruh Dashboard"
                    />

                    <button onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 h-9 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 ml-1">
                        <Download size={14} /> Export PDF
                    </button>
                </div>
            </div>

            {/* ================================================== */}
            {/* BARIS 1: 4 KARTU HAZARD UTAMA (KOTAK KECIL) */}
            {/* ================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/temuan" className="group block">
                    <div className="bg-[#1E3A8A] p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-[#152C69]">
                        <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={16} /></div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-white leading-none">{stats.total}</h3>
                            <p className="text-[9px] font-semibold text-blue-100 mt-1 uppercase tracking-wider">Total Hazard</p>
                        </div>
                    </div>
                </Link>
                <Link href="/temuan" className="group block">
                    <div className="bg-red-500 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-red-600">
                        <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><AlertCircle size={16} /></div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-white leading-none">{stats.open}</h3>
                            <p className="text-[9px] font-semibold text-red-100 mt-1 uppercase tracking-wider">Open Hazard</p>
                        </div>
                    </div>
                </Link>
                <Link href="/temuan" className="group block">
                    <div className="bg-[#F97316] p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-[#EA580C]">
                        <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={16} /></div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-white leading-none">{stats.onProses}</h3>
                            <p className="text-[9px] font-semibold text-orange-100 mt-1 uppercase tracking-wider">In Progress</p>
                        </div>
                    </div>
                </Link>
                <Link href="/temuan" className="group block">
                    <div className="bg-emerald-500 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-emerald-600">
                        <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 size={16} /></div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-white leading-none">{stats.closed}</h3>
                            <p className="text-[9px] font-semibold text-emerald-100 mt-1 uppercase tracking-wider">Closed Hazard</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* ================================================== */}
            {/* BARIS 2: KARTU ACCIDENT, INCIDENT, NEARMISS (KOTAK KECIL) */}
            {/* ================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-500 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-red-600">
                    <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center"><Flame size={16} /></div>
                    <div>
                        <h3 className="text-2xl font-extrabold text-white leading-none">{kpiResult.accident}</h3>
                        <p className="text-[9px] font-semibold text-red-100 mt-1 uppercase tracking-wider">Accident</p>
                    </div>
                </div>
                <div className="bg-[#F97316] p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-[#EA580C]">
                    <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center"><AlertCircle size={16} /></div>
                    <div>
                        <h3 className="text-2xl font-extrabold text-white leading-none">{kpiResult.incident}</h3>
                        <p className="text-[9px] font-semibold text-orange-100 mt-1 uppercase tracking-wider">Incident</p>
                    </div>
                </div>
                <div className="bg-[#EAB308] p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[100px] border border-[#CA8A04]">
                    <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center"><Activity size={16} /></div>
                    <div>
                        <h3 className="text-2xl font-extrabold text-white leading-none">{kpiResult.nearmiss}</h3>
                        <p className="text-[9px] font-semibold text-yellow-100 mt-1 uppercase tracking-wider">Nearmiss</p>
                    </div>
                </div>
            </div>

            {/* ================================================== */}
            {/* BARIS 3: DATA KPI PROYEK HANYA UNTUK ADMIN */}
            {/* ================================================== */}
            {profile?.role === 'admin' && (
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col relative">
                    <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                        <ShieldAlert size={20} className="text-[#F97316]" />
                        <h2 className="text-sm md:text-base font-bold text-[#1E3A8A] uppercase tracking-wide">KPI Proyek</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

                        {/* BAGIAN KIRI: Form Pengaturan Proyek */}
                        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Pilih Dokumen IBPR (Proyek)</label>
                                {rawIbpprHeader.length === 0 ? (
                                    <p className="text-sm text-rose-500 italic border border-rose-200 bg-rose-50 p-2 rounded-lg">Belum ada proyek. Silakan buat di menu IBPR.</p>
                                ) : (
                                    <select
                                        value={activeProjectId}
                                        onChange={(e) => setActiveProjectId(e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg shadow-sm outline-none focus:border-[#1E3A8A]"
                                    >
                                        {rawIbpprHeader.map(p => (
                                            <option key={p.id} value={p.id}>{p.project || "Tanpa Nama"}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tgl Mulai Proyek</label>
                                    <CustomSingleDatePicker
                                        date={kpiForm.start_date}
                                        onChange={(date: string) => setKpiForm({ ...kpiForm, start_date: date })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Jml Pekerja</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={kpiForm.workers === 0 ? "" : kpiForm.workers}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setKpiForm({ ...kpiForm, workers: val === "" ? 0 : Math.max(0, Number(val)) });
                                        }}
                                        className="w-full h-9 px-3 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg shadow-sm outline-none focus:border-[#1E3A8A]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase text-rose-600">LTI (Lost Time Injury) Kasus</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={kpiForm.lti === 0 ? "" : kpiForm.lti}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setKpiForm({ ...kpiForm, lti: val === "" ? 0 : Math.max(0, Number(val)) });
                                    }}
                                    className="w-full h-9 px-3 bg-white border border-slate-300 text-rose-600 text-sm font-bold rounded-lg shadow-sm outline-none focus:border-rose-500"
                                />
                            </div>

                            <button
                                onClick={saveKpiToDatabase}
                                disabled={!activeProjectId || isSavingKpi}
                                className="w-full bg-[#1E3A8A] hover:bg-[#152C69] text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                                <Save size={16} /> {isSavingKpi ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>

                        {/* BAGIAN KANAN: Hasil Perhitungan (List View) */}
                        <div className="flex flex-col justify-center gap-4 bg-white">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-500 text-sm font-medium">Total Hari Kerja Proyek</span>
                                <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md">{kpiResult.totalHariKerja} Hari</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-500 text-sm font-medium">Jam Kerja Harian</span>
                                <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md">8 Jam / Hari</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-500 text-sm font-medium">Total Jam Kerja Aman <span className="text-[10px] text-rose-400 block">(Akan nol jika ada Accident)</span></span>
                                <span className="font-black text-[#1E3A8A] text-2xl bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100">{kpiResult.jamKerjaAman}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-slate-500 text-sm font-medium">LTIFR (Frequency Rate)</span>
                                <span className="font-black text-rose-600 text-2xl bg-rose-50 px-4 py-1.5 rounded-lg border border-rose-100">{kpiResult.ltifr}</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ================================================== */}
            {/* BARIS 4: HAZARD REPORT CHART */}
            {/* ================================================== */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-base font-bold text-[#1E3A8A]">Hazard Report Chart</h2>
                    <div className="relative w-40 sm:w-48">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <MapPin size={14} />
                        </div>
                        <select
                            value={hazardWilayah}
                            onChange={(e) => setHazardWilayah(e.target.value)}
                            className="pl-8 h-9 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-sm outline-none focus:border-[#F97316] cursor-pointer appearance-none"
                        >
                            <option value="Semua">Semua Wilayah</option>
                            {ALL_AREAS.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hazardChartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="lokasi" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '15px', fontSize: '11px' }} iconType="circle" />
                            <Bar dataKey="open" name="Open" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={35} />
                            <Bar dataKey="onProses" name="Work in Progress" fill="#F97316" radius={[2, 2, 0, 0]} maxBarSize={35} />
                            <Bar dataKey="closed" name="Close" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={35} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ================================================== */}
            {/* BARIS 5: HAZARD STATUS DETAILS TABLE */}
            {/* ================================================== */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h2 className="text-base font-bold text-[#1E3A8A] mb-4">Hazard Status Details</h2>
                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-[#1E3A8A] text-white">
                            <tr>
                                <th className="p-4 text-left font-semibold min-w-[120px] sticky left-0 bg-[#152C69] z-10 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Wilayah / Area</th>
                                {hazardChartData.map(loc => (
                                    <th key={loc.lokasi} className="p-4 font-medium text-[11px] min-w-[100px] leading-tight border-r border-slate-600/30">
                                        {loc.lokasi}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Open Hazard</td>
                                {hazardChartData.map(loc => (
                                    <td key={loc.lokasi} className="p-4 text-slate-700">{loc.open}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">In Progress</td>
                                {hazardChartData.map(loc => (
                                    <td key={loc.lokasi} className="p-4 text-slate-700">{loc.onProses}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Closed</td>
                                {hazardChartData.map(loc => (
                                    <td key={loc.lokasi} className="p-4 text-slate-700">{loc.closed}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-left font-medium text-[#1E3A8A] bg-slate-50 sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Total Hazard</td>
                                {hazardChartData.map(loc => (
                                    <td key={loc.lokasi} className="p-4 font-bold text-slate-800 bg-slate-50/50">{loc.total}</td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-left font-bold text-slate-800 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">TL %</td>
                                {hazardChartData.map(loc => (
                                    <td key={loc.lokasi} className="p-4 font-bold text-emerald-600">{loc.tlPercent}%</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================================================== */}
            {/* BARIS 6: IBPR CHART */}
            {/* ================================================== */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-base font-bold text-[#1E3A8A]">IBPR Chart</h2>
                    <div className="relative w-40 sm:w-48">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <MapPin size={14} />
                        </div>
                        <select
                            value={ibprWilayah}
                            onChange={(e) => setIbprWilayah(e.target.value)}
                            className="pl-8 h-9 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-sm outline-none focus:border-[#F97316] cursor-pointer appearance-none"
                        >
                            <option value="Semua">Semua Wilayah</option>
                            {ALL_AREAS.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ibprChartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="wilayah" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '15px', fontSize: '11px' }} iconType="circle" />

                            <Bar dataKey="total" name="Total Identifikasi Risiko IBPR" fill="#1E3A8A" radius={[2, 2, 0, 0]} maxBarSize={45} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}