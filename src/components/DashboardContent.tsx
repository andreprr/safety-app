"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import {
    FileText, AlertCircle, Clock, CheckCircle2, Flame, ShieldAlert,
    Activity, Download, MapPin, Plus, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Calendar, CalendarDays, RotateCcw, FolderOpen
} from "lucide-react";

// ==================================================
// DAFTAR SELURUH LOKASI TETAP UNTUK GRAFIK & TABEL
// ==================================================
const ALL_AREAS = [
    "Area 1 Jakarta", "Area 2 Bandung", "Area 3 Cirebon", "Area 4 Semarang",
    "Area 5 Purwokerto", "Area 6 Yogyakarta", "Area 7 Madiun", "Area 8 Surabaya",
    "Area 9 Jember", "Area 10 Medan", "Area 11 Padang", "Area 12 Palembang",
    "Area 13 Tanjung Karang", "Kantor Pusat"
];

// ==================================================
// 1. KOMPONEN CUSTOM KALENDER RANGE PICKER
// ==================================================
const CustomDateRangePicker = ({
    startDate,
    endDate,
    onChange,
    label = "Rentang Waktu"
}: {
    startDate: string,
    endDate: string,
    onChange: (start: string, end: string) => void,
    label?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(startDate || new Date()));
    const [tempStart, setTempStart] = useState<string | null>(startDate);
    const [tempEnd, setTempEnd] = useState<string | null>(endDate);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = clickedDate.toLocaleDateString('en-CA');

        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(dateStr);
            setTempEnd(null);
        } else {
            if (new Date(dateStr) < new Date(tempStart)) {
                setTempEnd(tempStart);
                setTempStart(dateStr);
            } else {
                setTempEnd(dateStr);
            }
        }
    };

    const handleApply = () => {
        if (tempStart && tempEnd) {
            onChange(tempStart, tempEnd);
            setIsOpen(false);
        } else if (tempStart) {
            onChange(tempStart, tempStart);
            setIsOpen(false);
        }
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toLocaleDateString('en-CA');
            const isStart = tempStart === dateStr;
            const isEnd = tempEnd === dateStr;
            const isBetween = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
            if (isStart || isEnd) bgClass = "bg-[#1E3A8A] text-white font-bold shadow-md";
            else if (isBetween) bgClass = "bg-blue-100 text-[#1E3A8A] font-semibold";

            days.push(
                <button
                    key={i}
                    onClick={() => handleDayClick(i)}
                    className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all ${bgClass} ${isToday && !isStart && !isEnd && !isBetween ? 'border border-[#F97316] text-[#F97316]' : ''}`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 px-3 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg focus:border-[#1E3A8A] flex items-center gap-2 shadow-sm transition-colors hover:bg-slate-50"
                title={label}
            >
                <Calendar size={14} className="text-slate-400" />
                <span>{startDate || 'Start'}</span>
                <span className="text-slate-400 font-normal">s/d</span>
                <span>{endDate || 'End'}</span>
            </button>

            {isOpen && (
                <div className="absolute top-11 right-0 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[300px]">
                    <div className="flex justify-between items-center mb-4 bg-slate-50 p-1.5 rounded-lg">
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsLeft size={16} className="text-slate-600" /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} className="text-slate-600" /></button>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] text-center flex-1">
                            {currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} className="text-slate-600" /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsRight size={16} className="text-slate-600" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                            <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">
                        {renderCalendar()}
                    </div>

                    <button onClick={handleApply} className="w-full mt-4 bg-[#1E3A8A] hover:bg-[#152C69] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md">
                        Simpan Tanggal
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================================================
// 2. KOMPONEN CUSTOM SINGLE DATE PICKER
// ==================================================
const CustomSingleDatePicker = ({
    date,
    onChange,
    label = "Pilih Tanggal Mulai Proyek"
}: {
    date: string,
    onChange: (date: string) => void,
    label?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(date || new Date()));
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = clickedDate.toLocaleDateString('en-CA');
        onChange(dateStr);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toLocaleDateString('en-CA');
            const isSelected = date === dateStr;
            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

            let bgClass = "bg-white hover:bg-slate-100 text-slate-700";
            if (isSelected) bgClass = "bg-[#1E3A8A] text-white font-bold shadow-md";

            days.push(
                <button
                    key={i}
                    onClick={() => handleDayClick(i)}
                    className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all ${bgClass} ${isToday && !isSelected ? 'border border-[#F97316] text-[#F97316]' : ''}`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 px-3 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded focus:border-[#1E3A8A] flex items-center gap-2 shadow-sm transition-colors hover:bg-slate-50 w-full justify-between"
                title={label}
            >
                <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{date || 'Pilih Tanggal'}</span>
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-10 right-0 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[280px]">
                    <div className="flex justify-between items-center mb-4 bg-slate-50 p-1.5 rounded-lg">
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsLeft size={16} className="text-slate-600" /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} className="text-slate-600" /></button>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] text-center flex-1">
                            {currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} className="text-slate-600" /></button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronsRight size={16} className="text-slate-600" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                            <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================================================
// HALAMAN UTAMA DASHBOARD
// ==================================================
export default function DashboardContent() {
    const [loading, setLoading] = useState(true);
    const [rawInspeksi, setRawInspeksi] = useState<any[]>([]);
    const [rawIbppr, setRawIbppr] = useState<any[]>([]);
    const [rawIbpprHeader, setRawIbpprHeader] = useState<any[]>([]);

    // FILTER CHART WILAYAH
    const [hazardWilayah, setHazardWilayah] = useState("Semua");
    const [ibprWilayah, setIbprWilayah] = useState("Semua");

    // FILTER TANGGAL (GLOBAL DASHBOARD)
    const [globalStartDate, setGlobalStartDate] = useState<string>("2025-01-01");
    const [globalEndDate, setGlobalEndDate] = useState<string>("2025-12-31");

    useEffect(() => {
        const savedGlobalStart = localStorage.getItem("sri_global_start_date");
        const savedGlobalEnd = localStorage.getItem("sri_global_end_date");
        if (savedGlobalStart) setGlobalStartDate(savedGlobalStart);
        if (savedGlobalEnd) setGlobalEndDate(savedGlobalEnd);
    }, []);

    const handleGlobalDateChange = (start: string, end: string) => {
        setGlobalStartDate(start);
        setGlobalEndDate(end);
        localStorage.setItem("sri_global_start_date", start);
        localStorage.setItem("sri_global_end_date", end);
    };

    const todayStr = new Date().toLocaleDateString('en-CA');

    // STRUKTUR DATA PROYEK
    const [projects, setProjects] = useState<any[]>([
        { id: 'global_proj', name: 'Proyek Utama (Pusat)', workers: 114, startDate: todayStr, lti: 0 }
    ]);
    const [activeProjectId, setActiveProjectId] = useState<string>('global_proj');
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    useEffect(() => {
        const savedProjects = localStorage.getItem("sri_projects_data_v2");
        const savedActiveId = localStorage.getItem("sri_active_project_id_v2");

        if (savedProjects) {
            const parsedProjects = JSON.parse(savedProjects).map((p: any) => ({
                ...p,
                lti: p.lti || 0
            }));
            setProjects(parsedProjects);
        }
        if (savedActiveId) setActiveProjectId(savedActiveId);
    }, []);

    const saveProjectsToStorage = (newProjects: any[]) => {
        setProjects(newProjects);
        localStorage.setItem("sri_projects_data_v2", JSON.stringify(newProjects));
    };

    const handleAddProject = () => {
        if (!newProjectName.trim()) return;
        const newProject = {
            id: `proj_${Date.now()}`,
            name: newProjectName,
            workers: 0,
            startDate: todayStr,
            lti: 0
        };
        const updatedProjects = [...projects, newProject];
        saveProjectsToStorage(updatedProjects);
        setActiveProjectId(newProject.id);
        localStorage.setItem("sri_active_project_id_v2", newProject.id);
        setNewProjectName("");
        setIsAddingProject(false);
    };

    const updateActiveProject = (field: string, value: any) => {
        const updatedProjects = projects.map(p =>
            p.id === activeProjectId ? { ...p, [field]: value } : p
        );
        saveProjectsToStorage(updatedProjects);
    };

    const handleProjectDateChange = (date: string) => {
        const updatedProjects = projects.map(p =>
            p.id === activeProjectId ? { ...p, startDate: date } : p
        );
        saveProjectsToStorage(updatedProjects);
    };

    const handleResetProjectDate = () => {
        const updatedProjects = projects.map(p =>
            p.id === activeProjectId ? { ...p, startDate: todayStr } : p
        );
        saveProjectsToStorage(updatedProjects);
    };

    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

    // COMPUTED STATES FOR UI
    const [stats, setStats] = useState({ open: 0, onProses: 0, closed: 0, total: 0 });
    const [hazardChartData, setHazardChartData] = useState<any[]>([]);
    const [ibprChartData, setIbprChartData] = useState<any[]>([]);

    // STATE KPI
    const [kpiData, setKpiData] = useState({
        totalHariKerja: 0, jamKerjaAman: "0", accident: 0, incident: 0, nearmiss: 0,
        lti: 0, ltifr: "0"
    });

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
            const { data: ibpHeadData } = await supabase.from("ibppr_header").select("*");

            setRawInspeksi(insData || []);
            setRawIbppr(ibpData || []);
            setRawIbpprHeader(ibpHeadData || []);
        } catch (error) {
            console.error("Gagal memuat data dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loading) return;

        const getSafeDateStr = (dateStr: string) => {
            try {
                if (!dateStr) return null;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } catch {
                return null;
            }
        };

        // 1. DATA GLOBAL
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


        // 2. DATA PROYEK & RUMUS LTI + LTIFR
        const todayCurrentStr = new Date().toLocaleDateString('en-CA');
        const projectFilteredInspeksi = rawInspeksi.filter((item) => {
            if (!activeProject.startDate) return true;
            const itemDate = getSafeDateStr(item.tanggal_temuan || item.created_at);
            if (!itemDate) return false;
            return itemDate >= activeProject.startDate && itemDate <= todayCurrentStr;
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

        const calculatedDays = getWorkingDays(activeProject.startDate, todayCurrentStr);

        const activeWorkersNumber = Number(activeProject.workers) || 0;
        const activeLtiNumber = Number(activeProject.lti) || 0;

        const totalJamKerjaMurni = calculatedDays * 8 * activeWorkersNumber;
        const ltiCount = activeLtiNumber;

        // Rumus LTIFR = (LTI x 1.000.000) / Total jam kerja
        const ltifrValue = totalJamKerjaMurni > 0 ? (ltiCount * 1000000) / totalJamKerjaMurni : 0;

        // Jam Kerja Aman di-reset jadi 0 jika ada kecelakaan
        let jamKerjaAmanTampil = totalJamKerjaMurni;
        if (countAccident > 0) jamKerjaAmanTampil = 0;

        setKpiData({
            totalHariKerja: calculatedDays,
            jamKerjaAman: jamKerjaAmanTampil.toLocaleString('id-ID'),
            accident: countAccident,
            incident: countIncident,
            nearmiss: countNearmiss,
            lti: ltiCount,
            ltifr: parseFloat(ltifrValue.toFixed(2)).toLocaleString('id-ID', { maximumFractionDigits: 2 })
        });

    }, [rawInspeksi, rawIbppr, rawIbpprHeader, hazardWilayah, ibprWilayah, globalStartDate, globalEndDate, activeProject, projects, loading]);


    if (loading) {
        return <div className="p-8 flex justify-center items-center h-[80vh] text-[#1E3A8A] font-semibold animate-pulse">Memuat Dashboard KAI Properti...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans print:bg-white print:p-0">

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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 4 KARTU HAZARD DIPERKECIL (Tinggi Ditetapkan) */}
                <div className="lg:col-span-6 grid grid-cols-2 gap-4 content-start">
                    <Link href="/temuan" className="group block h-[130px]">
                        <div className="bg-[#1E3A8A] p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full border border-[#152C69]">
                            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><FileText size={18} /></div>
                            <div>
                                <h3 className="text-3xl font-extrabold text-white leading-none">{stats.total}</h3>
                                <p className="text-[10px] font-semibold text-blue-100 mt-1 uppercase tracking-wider">Total Hazard</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/temuan" className="group block h-[130px]">
                        <div className="bg-red-500 p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full border border-red-600">
                            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><AlertCircle size={18} /></div>
                            <div>
                                <h3 className="text-3xl font-extrabold text-white leading-none">{stats.open}</h3>
                                <p className="text-[10px] font-semibold text-red-100 mt-1 uppercase tracking-wider">Open Hazard</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/temuan" className="group block h-[130px]">
                        <div className="bg-[#F97316] p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full border border-[#EA580C]">
                            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><Clock size={18} /></div>
                            <div>
                                <h3 className="text-3xl font-extrabold text-white leading-none">{stats.onProses}</h3>
                                <p className="text-[10px] font-semibold text-orange-100 mt-1 uppercase tracking-wider">In Progress</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/temuan" className="group block h-[130px]">
                        <div className="bg-emerald-500 p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full border border-emerald-600">
                            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 size={18} /></div>
                            <div>
                                <h3 className="text-3xl font-extrabold text-white leading-none">{stats.closed}</h3>
                                <p className="text-[10px] font-semibold text-emerald-100 mt-1 uppercase tracking-wider">Closed Hazard</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* KARTU KPI PROYEK KHUSUS DENGAN LTI & LTIFR */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative">

                    <div className="flex items-start justify-between mb-4 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#F97316]"><ShieldAlert size={18} /></div>
                            <h2 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wide">Data KPI Proyek</h2>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <select
                                value={activeProjectId}
                                onChange={(e) => {
                                    setActiveProjectId(e.target.value);
                                    localStorage.setItem("sri_active_project_id_v2", e.target.value);
                                }}
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:border-[#1E3A8A] w-36 sm:w-48 shadow-sm cursor-pointer"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setIsAddingProject(!isAddingProject)}
                                title="Tambah Proyek Manual"
                                className="bg-[#1E3A8A] hover:bg-[#152C69] text-white p-1.5 rounded-lg border border-[#1E3A8A] transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {isAddingProject && (
                        <div className="absolute top-14 right-5 z-20 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs font-bold text-slate-700 mb-2">Nama Proyek Baru</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="Misal: Proyek A"
                                    className="flex-1 border border-slate-200 rounded px-2 text-sm outline-none focus:border-[#F97316]"
                                />
                                <button onClick={handleAddProject} className="bg-[#F97316] text-white px-3 py-1 rounded text-xs font-bold">Simpan</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4">
                        <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 mb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-500">Tanggal Mulai Proyek</span>
                                <button
                                    onClick={handleResetProjectDate}
                                    className="text-[10px] text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 border border-rose-100"
                                    title="Kembalikan tanggal mulai ke hari ini (Reset Hari Kerja)"
                                >
                                    <RotateCcw size={10} /> Reset ke Hari Ini
                                </button>
                            </div>
                            <CustomSingleDatePicker
                                date={activeProject.startDate}
                                onChange={handleProjectDateChange}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Hari Kerja</p>
                                <p className="text-sm font-black text-[#1E3A8A]">{kpiData.totalHariKerja} <span className="text-xs font-semibold text-slate-500">Hari</span></p>
                            </div>
                            <div className="border-l border-r border-slate-200">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Jam Kerja</p>
                                <p className="text-sm font-black text-[#1E3A8A]">8 <span className="text-xs font-semibold text-slate-500">Jam/Hari</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">Jml Pekerja</p>
                                <input
                                    type="number"
                                    value={activeProject.workers ?? ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateActiveProject('workers', val === "" ? "" : Number(val));
                                    }}
                                    title="Ubah jumlah pekerja untuk proyek ini"
                                    className="w-16 mx-auto text-sm font-black text-[#1E3A8A] text-center bg-white border border-slate-300 focus:border-[#F97316] outline-none rounded py-0.5 shadow-sm transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3 mb-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><Flame size={12} className="text-red-500" /> Accident</span>
                            <span className="text-base font-bold text-slate-800">{kpiData.accident}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><AlertCircle size={12} className="text-orange-500" /> Incident</span>
                            <span className="text-base font-bold text-slate-800">{kpiData.incident}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><Activity size={12} className="text-yellow-500" /> Nearmiss</span>
                            <span className="text-base font-bold text-slate-800">{kpiData.nearmiss}</span>
                        </div>
                    </div>

                    <div className="mt-auto flex flex-col z-10 shadow-md rounded-lg overflow-hidden border border-[#152C69]">
                        <div className="bg-[#1E3A8A] px-4 py-2.5 flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Total Jam Kerja Aman</span>
                            <span className="text-xl font-black text-white">{kpiData.jamKerjaAman}</span>
                        </div>

                        <div className="bg-[#152C69] px-4 py-2 flex justify-between items-center border-t border-blue-800/50">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-blue-200 font-semibold uppercase mb-0.5">LTI (Kasus)</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={activeProject.lti ?? ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateActiveProject('lti', val === "" ? "" : Number(val));
                                        }}
                                        title="Ubah angka LTI di sini"
                                        className="w-16 bg-blue-900/50 border border-blue-700 text-white text-sm font-bold rounded px-1.5 py-0.5 outline-none focus:border-[#F97316] transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] text-blue-200 font-semibold uppercase mb-0.5">LTIFR (Rate)</span>
                                <span className="text-sm font-bold text-white">{kpiData.ltifr}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

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