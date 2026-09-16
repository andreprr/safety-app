"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import { FileText, AlertCircle, Clock, CheckCircle2, Flame, ShieldAlert, Activity, Users, Download, MapPin, CalendarDays, X } from "lucide-react";

// DAFTAR SELURUH LOKASI TETAP UNTUK GRAFIK & TABEL
const ALL_AREAS = [
  "Area 1 Jakarta", "Area 2 Bandung", "Area 3 Cirebon", "Area 4 Semarang",
  "Area 5 Purwokerto", "Area 6 Yogyakarta", "Area 7 Madiun", "Area 8 Surabaya",
  "Area 9 Jember", "Area 10 Medan", "Area 11 Padang", "Area 12 Palembang",
  "Area 13 Tanjung Karang", "Kantor Pusat"
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // RAW DATA STATES
  const [rawInspeksi, setRawInspeksi] = useState<any[]>([]);
  const [rawIbppr, setRawIbppr] = useState<any[]>([]);
  const [rawIbpprHeader, setRawIbpprHeader] = useState<any[]>([]);

  // ==========================================
  // FILTER STATES (Waktu & Wilayah)
  // ==========================================
  const [filterDate, setFilterDate] = useState<string>("");

  const [hazardWilayah, setHazardWilayah] = useState("Semua");
  const [ibprWilayah, setIbprWilayah] = useState("Semua");

  // ==========================================
  // MANUAL INPUT PEKERJA DENGAN LOCAL STORAGE
  // ==========================================
  const [manualPekerja, setManualPekerja] = useState<number>(114);

  useEffect(() => {
    const savedPekerja = localStorage.getItem("sri_total_pekerja");
    if (savedPekerja) {
      setManualPekerja(Number(savedPekerja));
    }
  }, []);

  const handlePekerjaChange = (val: number) => {
    setManualPekerja(val);
    localStorage.setItem("sri_total_pekerja", val.toString());
  };

  // COMPUTED STATES FOR UI
  const [stats, setStats] = useState({ open: 0, onProses: 0, closed: 0, total: 0 });
  const [hazardChartData, setHazardChartData] = useState<any[]>([]);
  const [ibprChartData, setIbprChartData] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState({
    jamKerjaAman: "0", accident: 0, incident: 0, nearmiss: 0
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
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      } catch {
        return null;
      }
    };

    // FILTER WAKTU BERDASARKAN INPUT KALENDER
    const filteredInspeksi = rawInspeksi.filter((item) => {
      if (!filterDate) return true;
      const itemDate = getSafeDateStr(item.tanggal_temuan || item.created_at);
      return itemDate === filterDate;
    });

    const filteredIbpprHeader = rawIbpprHeader.filter((h) => {
      if (!filterDate) return true;
      const itemDate = getSafeDateStr(h.tanggal || h.created_at);
      return itemDate === filterDate;
    });

    const validHeaderIds = filteredIbpprHeader.map(h => h.id);
    const filteredIbppr = rawIbppr.filter(item => validHeaderIds.includes(item.header_id));

    // 1. HITUNG GLOBAL KPI
    let open = 0, onProses = 0, closed = 0;
    let countAccident = 0, countIncident = 0, countNearmiss = 0;

    filteredInspeksi.forEach((item) => {
      if (item.status === "Open") open++;
      else if (item.status === "On Proses") onProses++;
      else if (item.status === "Closed") closed++;

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

    let totalJamKerja = manualPekerja * 8;
    if (countAccident > 0) totalJamKerja = 0;

    setStats({ open, onProses, closed, total: filteredInspeksi.length });
    setKpiData({
      jamKerjaAman: totalJamKerja.toLocaleString('id-ID'),
      accident: countAccident,
      incident: countIncident,
      nearmiss: countNearmiss
    });

    // 2. HITUNG DATA CHART HAZARD
    const hazardMap: Record<string, any> = {};
    ALL_AREAS.forEach(loc => {
      hazardMap[loc.toUpperCase()] = { lokasi: loc, open: 0, onProses: 0, closed: 0, total: 0 };
    });

    filteredInspeksi.forEach(item => {
      const loc = item.lokasi ? item.lokasi.toUpperCase() : "TIDAK DIKETAHUI";
      if (!hazardMap[loc]) {
        hazardMap[loc] = { lokasi: item.lokasi || "Lainnya", open: 0, onProses: 0, closed: 0, total: 0 };
      }
      hazardMap[loc].total++;
      if (item.status === "Open") hazardMap[loc].open++;
      else if (item.status === "On Proses") hazardMap[loc].onProses++;
      else if (item.status === "Closed") hazardMap[loc].closed++;
    });

    let hData = Object.keys(hazardMap).map(key => ({
      ...hazardMap[key],
      tlPercent: hazardMap[key].total > 0 ? Math.round((hazardMap[key].closed / hazardMap[key].total) * 100) : 0
    }));

    if (hazardWilayah !== "Semua") {
      hData = hData.filter(d => d.lokasi.toUpperCase() === hazardWilayah.toUpperCase());
    } else {
      hData.sort((a, b) => {
        const idxA = ALL_AREAS.findIndex(area => area.toUpperCase() === a.lokasi.toUpperCase());
        const idxB = ALL_AREAS.findIndex(area => area.toUpperCase() === b.lokasi.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.lokasi.localeCompare(b.lokasi);
      });
    }
    setHazardChartData(hData);

    // 3. HITUNG DATA CHART IBPR
    const ibprMap: Record<string, any> = {};
    ALL_AREAS.forEach(loc => {
      ibprMap[loc.toUpperCase()] = { wilayah: loc, total: 0 };
    });

    filteredIbppr.forEach(item => {
      const header = filteredIbpprHeader.find(h => h.id === item.header_id);
      const loc = header?.wilayah ? header.wilayah.toUpperCase() : "TIDAK DIKETAHUI";

      if (!ibprMap[loc]) {
        ibprMap[loc] = { wilayah: header?.wilayah || "Lainnya", total: 0 };
      }
      ibprMap[loc].total++;
    });

    let iData = Object.keys(ibprMap).map(key => ({
      ...ibprMap[key]
    }));

    if (ibprWilayah !== "Semua") {
      iData = iData.filter(d => d.wilayah.toUpperCase() === ibprWilayah.toUpperCase());
    } else {
      iData.sort((a, b) => {
        const idxA = ALL_AREAS.findIndex(area => area.toUpperCase() === a.wilayah.toUpperCase());
        const idxB = ALL_AREAS.findIndex(area => area.toUpperCase() === b.wilayah.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.wilayah.localeCompare(b.wilayah);
      });
    }
    setIbprChartData(iData);

  }, [rawInspeksi, rawIbppr, rawIbpprHeader, hazardWilayah, ibprWilayah, filterDate, manualPekerja, loading]);

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-[80vh] text-[#1E3A8A] font-semibold animate-pulse">Memuat Dashboard KAI Properti...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans print:bg-white print:p-0">

      {/* JUDUL & FILTER WAKTU GLOBAL */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A8A] tracking-tight flex items-center gap-2">
            Dashboard Kinerja K3
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pemantauan data keselamatan kerja terpusat KAI Properti.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <div className="flex items-center text-slate-400 pl-2 pr-1">
            <CalendarDays size={16} />
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 px-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg focus:border-[#F97316] outline-none cursor-pointer shadow-sm"
          />

          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              title="Hapus filter waktu (Tampilkan Semua Data)"
              className="px-3 h-9 rounded-lg text-xs font-bold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1 border border-rose-200"
            >
              <X size={14} /> Clear
            </button>
          )}

          <button onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 h-9 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 ml-auto md:ml-2">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* BARIS 1: KARTU SUMMARY & KPI (Proporsional & Tidak Terlalu Panjang) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* KIRI: 4 KARTU HAZARD (Lebar 6 Kolom - Grid 2x2) */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <Link href="/temuan" className="group">
            <div className="bg-[#1E3A8A] p-4 rounded-xl shadow-[0_4px_14px_rgba(30,58,138,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between min-h-[120px] border border-[#152C69]">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileText size={18} /></div>
              <div>
                <h3 className="text-2xl font-extrabold text-white leading-tight">{stats.total}</h3>
                <p className="text-[10px] font-semibold text-blue-100 mt-0.5 uppercase tracking-wider">Total Hazard</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-red-500 p-4 rounded-xl shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between min-h-[120px] border border-red-600">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><AlertCircle size={18} /></div>
              <div>
                <h3 className="text-2xl font-extrabold text-white leading-tight">{stats.open}</h3>
                <p className="text-[10px] font-semibold text-red-100 mt-0.5 uppercase tracking-wider">Open Hazard</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-[#F97316] p-4 rounded-xl shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between min-h-[120px] border border-[#EA580C]">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Clock size={18} /></div>
              <div>
                <h3 className="text-2xl font-extrabold text-white leading-tight">{stats.onProses}</h3>
                <p className="text-[10px] font-semibold text-orange-100 mt-0.5 uppercase tracking-wider">In Progress</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-emerald-500 p-4 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between min-h-[120px] border border-emerald-600">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><CheckCircle2 size={18} /></div>
              <div>
                <h3 className="text-2xl font-extrabold text-white leading-tight">{stats.closed}</h3>
                <p className="text-[10px] font-semibold text-emerald-100 mt-0.5 uppercase tracking-wider">Closed Hazard</p>
              </div>
            </div>
          </Link>
        </div>

        {/* KANAN: KARTU KPI (Lebar 6 Kolom) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#F97316]"><ShieldAlert size={18} /></div>
            <h2 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wide">Key Performance Indicator</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            <div className="flex justify-between items-end border-b border-slate-100 pb-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Flame size={13} className="text-red-500" /> Accident</span>
              <span className="text-base font-bold text-slate-800">{kpiData.accident}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><AlertCircle size={13} className="text-orange-500" /> Incident</span>
              <span className="text-base font-bold text-slate-800">{kpiData.incident}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Activity size={13} className="text-yellow-500" /> Nearmiss</span>
              <span className="text-base font-bold text-slate-800">{kpiData.nearmiss}</span>
            </div>

            <div className="flex justify-between items-end border-b border-slate-100 pb-1 relative group">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 pb-1">
                <Users size={13} className="text-[#1E3A8A]" /> Pekerja
              </span>
              <input
                type="number"
                value={manualPekerja}
                onChange={(e) => handlePekerjaChange(Number(e.target.value))}
                title="Edit jumlah pekerja manual untuk mengalkulasi Jam Kerja Aman"
                className="text-base font-bold text-slate-800 w-20 text-right bg-slate-50 border border-slate-200 focus:border-[#F97316] outline-none rounded px-2 py-0.5 transition-colors"
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 bg-[#1E3A8A] px-4 py-2.5 rounded-lg flex justify-between items-center shadow-md border border-[#152C69]">
            <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Total Jam Kerja Aman</span>
            <span className="text-xl font-black text-white">{kpiData.jamKerjaAman}</span>
          </div>
        </div>

      </div>

      {/* ================================================== */}
      {/* BARIS 2: HAZARD CHART                             */}
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
      {/* BARIS 3: TABEL HAZARD STATUS                       */}
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
      {/* BARIS 4: IBPR CHART                                */}
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