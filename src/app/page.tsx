"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from "recharts";
import { FileText, AlertCircle, Clock, CheckCircle2, Flame, ShieldAlert, Activity, Users, Download, MapPin } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // RAW DATA STATES
  const [rawInspeksi, setRawInspeksi] = useState<any[]>([]);
  const [rawIbppr, setRawIbppr] = useState<any[]>([]);
  const [rawIbpprHeader, setRawIbpprHeader] = useState<any[]>([]);

  // FILTER STATES (Terpisah untuk masing-masing chart)
  const [hazardWilayah, setHazardWilayah] = useState("Semua");
  const [ibprWilayah, setIbprWilayah] = useState("Semua");

  const [hazardWilayahList, setHazardWilayahList] = useState<string[]>([]);
  const [ibprWilayahList, setIbprWilayahList] = useState<string[]>([]);

  // COMPUTED STATES FOR UI
  const [stats, setStats] = useState({ open: 0, onProses: 0, closed: 0, total: 0 });
  const [hazardChartData, setHazardChartData] = useState<any[]>([]);
  const [ibprChartData, setIbprChartData] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState({
    totalPekerja: 0, jamKerjaAman: "0", accident: 0, incident: 0, nearmiss: 0
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

    // ==========================================
    // 1. HITUNG GLOBAL KPI (Tidak terpengaruh filter)
    // ==========================================
    let open = 0, onProses = 0, closed = 0;
    let countAccident = 0, countIncident = 0, countNearmiss = 0;

    rawInspeksi.forEach((item) => {
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

    const jumlahIbpr = rawIbppr.length;
    const jumlahInspeksi = rawInspeksi.length;
    const totalPekerjaDinamis = (jumlahIbpr === 0 && jumlahInspeksi === 0) ? 0 : 25 + (jumlahIbpr * 15) + (jumlahInspeksi * 2);
    
    let totalJamKerja = totalPekerjaDinamis * 8 * 150;
    if (countAccident > 0) totalJamKerja = totalPekerjaDinamis * 8 * 5; 

    setStats({ open, onProses, closed, total: jumlahInspeksi });
    setKpiData({
      totalPekerja: totalPekerjaDinamis,
      jamKerjaAman: totalJamKerja.toLocaleString('id-ID'),
      accident: countAccident,
      incident: countIncident,
      nearmiss: countNearmiss
    });


    // ==========================================
    // 2. HITUNG DATA CHART HAZARD (Terpengaruh hazardWilayah)
    // ==========================================
    const hList = rawInspeksi.map(i => i.lokasi?.toUpperCase() || "TIDAK DIKETAHUI").filter((v,i,a) => a.indexOf(v)===i).sort();
    setHazardWilayahList(hList);

    const hazardMap: Record<string, any> = {};
    rawInspeksi.forEach(item => {
      const loc = item.lokasi ? item.lokasi.toUpperCase() : "TIDAK DIKETAHUI";
      
      // Lewati jika filter aktif dan tidak cocok
      if (hazardWilayah !== "Semua" && loc !== hazardWilayah) return;

      if (!hazardMap[loc]) hazardMap[loc] = { lokasi: loc, open: 0, onProses: 0, closed: 0, total: 0 };
      hazardMap[loc].total++;
      if (item.status === "Open") hazardMap[loc].open++;
      else if (item.status === "On Proses") hazardMap[loc].onProses++;
      else if (item.status === "Closed") hazardMap[loc].closed++;
    });

    const hData = Object.keys(hazardMap).map(key => ({
      ...hazardMap[key],
      tlPercent: hazardMap[key].total > 0 ? Math.round((hazardMap[key].closed / hazardMap[key].total) * 100) : 0
    })).sort((a, b) => a.lokasi.localeCompare(b.lokasi));
    
    setHazardChartData(hData);


    // ==========================================
    // 3. HITUNG DATA CHART IBPR (Terpengaruh ibprWilayah)
    // ==========================================
    const iList = rawIbpprHeader.map(h => h.wilayah?.toUpperCase() || "TIDAK DIKETAHUI").filter((v,i,a) => a.indexOf(v)===i).sort();
    setIbprWilayahList(iList);

    const ibprMap: Record<string, any> = {};
    rawIbppr.forEach(item => {
      const header = rawIbpprHeader.find(h => h.id === item.header_id);
      const loc = header?.wilayah ? header.wilayah.toUpperCase() : "TIDAK DIKETAHUI";
      
      // Lewati jika filter aktif dan tidak cocok
      if (ibprWilayah !== "Semua" && loc !== ibprWilayah) return;

      if (!ibprMap[loc]) ibprMap[loc] = { wilayah: loc, total: 0 };
      ibprMap[loc].total++; // Hitung total item risiko IBPR di wilayah ini
    });

    const iData = Object.keys(ibprMap).map(key => ({
      ...ibprMap[key]
    })).sort((a, b) => a.wilayah.localeCompare(b.wilayah));
    
    setIbprChartData(iData);

  }, [rawInspeksi, rawIbppr, rawIbpprHeader, hazardWilayah, ibprWilayah, loading]);


  if (loading) {
    return <div className="p-8 flex justify-center items-center h-[80vh] text-blue-600 font-semibold animate-pulse">Memuat Dashboard...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans print:bg-white print:p-0">
      
      {/* JUDUL GLOBAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
        <button onClick={() => window.print()} className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 rounded-lg text-sm font-semibold transition-colors shadow-sm items-center gap-2 shrink-0">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {/* BARIS 1: KARTU SUMMARY & KPI */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* KIRI: 4 KARTU HAZARD */}
        <div className="w-full xl:w-7/12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/temuan" className="group">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-md transition-all h-full flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><FileText size={20} /></div>
              <div>
                <h3 className="text-3xl font-extrabold text-slate-800 leading-tight">{stats.total}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Total Hazard</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-md transition-all h-full flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><AlertCircle size={20} /></div>
              <div>
                <h3 className="text-3xl font-extrabold text-slate-800 leading-tight">{stats.open}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Open Hazard</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-md transition-all h-full flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Clock size={20} /></div>
              <div>
                <h3 className="text-3xl font-extrabold text-slate-800 leading-tight">{stats.onProses}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">In Progress Hazard</p>
              </div>
            </div>
          </Link>

          <Link href="/temuan" className="group">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-md transition-all h-full flex flex-col justify-between min-h-[140px]">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><CheckCircle2 size={20} /></div>
              <div>
                <h3 className="text-3xl font-extrabold text-slate-800 leading-tight">{stats.closed}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Closed Hazard</p>
              </div>
            </div>
          </Link>
        </div>

        {/* KANAN: KARTU KPI */}
        <div className="w-full xl:w-5/12 bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><ShieldAlert size={20} /></div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Key Performance Indicator</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Flame size={14} className="text-red-500"/> Accident</span>
              <span className="text-lg font-bold text-slate-800">{kpiData.accident}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><AlertCircle size={14} className="text-orange-500"/> Incident</span>
              <span className="text-lg font-bold text-slate-800">{kpiData.incident}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Activity size={14} className="text-yellow-500"/> Nearmiss</span>
              <span className="text-lg font-bold text-slate-800">{kpiData.nearmiss}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Users size={14} className="text-blue-500"/> Pekerja</span>
              <span className="text-lg font-bold text-slate-800">{kpiData.totalPekerja}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 bg-slate-50 px-4 py-2 rounded-lg flex justify-between items-center border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Jam Kerja Aman</span>
            <span className="text-lg font-bold text-emerald-600">{kpiData.jamKerjaAman}</span>
          </div>
        </div>
      </div>

      {/* BARIS 2: KUMPULAN CHART (2 CHART SEJAJAR DI LAYAR LEBAR) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* ===================== CHART 1: HAZARD REPORT ===================== */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">Hazard Report Chart</h2>
            
            {/* Filter Khusus Hazard */}
            <div className="relative w-40 sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <MapPin size={14} />
              </div>
              <select 
                value={hazardWilayah}
                onChange={(e) => setHazardWilayah(e.target.value)}
                className="pl-8 h-9 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-sm outline-none focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="Semua">Semua Wilayah</option>
                {hazardWilayahList.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            {hazardChartData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm">
                <MapPin size={40} className="text-slate-200 mb-3" />
                <p>Tidak ada data Hazard.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hazardChartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="lokasi" angle={-25} textAnchor="end" tick={{fontSize: 10, fill: '#64748b'}} interval={0} axisLine={{stroke: '#e2e8f0'}} tickLine={false} />
                  <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '15px', fontSize: '11px' }} iconType="circle" />
                  <Bar dataKey="open" name="Open" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={35} />
                  <Bar dataKey="onProses" name="Work in Progress" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={35} />
                  <Bar dataKey="closed" name="Close" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>


        {/* ===================== CHART 2: IBPR REPORT ===================== */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)] flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-800">IBPR Chart</h2>
            
            {/* Filter Khusus IBPR */}
            <div className="relative w-40 sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <MapPin size={14} />
              </div>
              <select 
                value={ibprWilayah}
                onChange={(e) => setIbprWilayah(e.target.value)}
                className="pl-8 h-9 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-sm outline-none focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="Semua">Semua Wilayah</option>
                {ibprWilayahList.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            {ibprChartData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm">
                <FileText size={40} className="text-slate-200 mb-3" />
                <p>Tidak ada data IBPR.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ibprChartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="wilayah" angle={-25} textAnchor="end" tick={{fontSize: 10, fill: '#64748b'}} interval={0} axisLine={{stroke: '#e2e8f0'}} tickLine={false} />
                  <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '15px', fontSize: '11px' }} iconType="circle" />
                  
                  {/* Hanya menggunakan 1 warna Bar untuk menunjukkan Total Temuan/Identifikasi IBPR */}
                  <Bar dataKey="total" name="Total Identifikasi Risiko IBPR" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* BARIS 3: TABEL HAZARD STATUS (Memakai data yang sama dengan Hazard Chart) */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-slate-800 mb-4">Hazard Status Details</h2>
        
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-sm text-center border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="p-4 text-left font-semibold text-slate-600 min-w-[120px] sticky left-0 bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Wilayah / Area</th>
                {hazardChartData.map(loc => (
                  <th key={loc.lokasi} className="p-4 font-semibold text-slate-700 text-xs min-w-[100px] leading-tight">
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
                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Total Hazard</td>
                {hazardChartData.map(loc => (
                  <td key={loc.lokasi} className="p-4 font-bold text-slate-800">{loc.total}</td>
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
          {hazardChartData.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm bg-white">
              Data tabel belum tersedia untuk wilayah ini.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}