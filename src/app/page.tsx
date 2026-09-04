"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { FileText, AlertCircle, Clock, CheckCircle2, Flame, ShieldAlert, Activity, Users, Download } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, onProses: 0, closed: 0, total: 0 });
  
  // State untuk data yang dikelompokkan berdasarkan Lokasi (Untuk Bar Chart & Tabel Pivot)
  const [locationStats, setLocationStats] = useState<any[]>([]);

  const [kpiData, setKpiData] = useState({
    totalPekerja: 0,
    jamKerjaAman: "0",
    accident: 0,
    incident: 0,
    nearmiss: 0
  });

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspeksi' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ibppr' }, fetchDashboardData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: inspeksiData, error: insError } = await supabase.from("inspeksi").select("*");
      const { data: ibpprData } = await supabase.from("ibppr").select("*");
      if (insError) throw insError;
      
      let open = 0; let onProses = 0; let closed = 0;
      let countAccident = 0; let countIncident = 0; let countNearmiss = 0;
      
      // Objek sementara untuk mengelompokkan data berdasarkan Lokasi
      const locMap: Record<string, { open: number; onProses: number; closed: number; total: number }> = {};

      inspeksiData?.forEach((item) => {
        // 1. Hitung Status Utama
        if (item.status === "Open") open++;
        else if (item.status === "On Proses") onProses++;
        else if (item.status === "Closed") closed++;

        // 2. Hitung KPI Accident/Incident
        const kategoriText = (item.kategori || "").toLowerCase();
        const risk = item.risk_level;

        if (kategoriText.includes("accident") || kategoriText.includes("kecelakaan")) countAccident++;
        else if (kategoriText.includes("incident") || kategoriText.includes("insiden")) countIncident++;
        else if (kategoriText.includes("nearmiss") || kategoriText.includes("hampir")) countNearmiss++;
        else {
          if (risk === "Tinggi") countIncident++;
          else if (risk === "Sedang") countNearmiss++;
        }

        // 3. Kelompokkan berdasarkan Lokasi (Untuk Chart & Table baru)
        const loc = item.lokasi ? item.lokasi.toUpperCase() : "TIDAK DIKETAHUI";
        if (!locMap[loc]) {
          locMap[loc] = { open: 0, onProses: 0, closed: 0, total: 0 };
        }
        locMap[loc].total++;
        if (item.status === "Open") locMap[loc].open++;
        else if (item.status === "On Proses") locMap[loc].onProses++;
        else if (item.status === "Closed") locMap[loc].closed++;
      });

      // Konversi objek lokasi menjadi array agar bisa dibaca oleh Recharts & Table
      const locArray = Object.keys(locMap).map(key => ({
        lokasi: key,
        ...locMap[key],
        tlPercent: locMap[key].total > 0 ? Math.round((locMap[key].closed / locMap[key].total) * 100) : 0
      })).sort((a, b) => a.lokasi.localeCompare(b.lokasi)); // Urutkan sesuai abjad

      setLocationStats(locArray);

      // Kalkulasi Pekerja & Jam Kerja
      const jumlahIbpr = ibpprData?.length || 0;
      const jumlahInspeksi = inspeksiData?.length || 0;
      const totalPekerjaDinamis = 25 + (jumlahIbpr * 15) + (jumlahInspeksi * 2);
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

    } catch (error) {
      console.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  const donutData = [
    { name: "Open", value: stats.open, color: "#f43f5e" },       // Merah/Rose
    { name: "In Progress", value: stats.onProses, color: "#f59e0b" }, // Kuning/Amber
    { name: "Closed", value: stats.closed, color: "#10b981" },     // Hijau/Emerald
  ];

  if (loading) {
    return <div className="p-8 flex justify-center items-center h-[80vh] text-blue-600 font-semibold animate-pulse">Memuat Dashboard...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans print:bg-white print:p-0">
      
      {/* JUDUL DAN FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors shadow-sm flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>
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

      {/* BARIS 2: BAR CHART (Hazard Report Grouped by Location) */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base font-bold text-slate-800">Hazard Report</h2>
          <select className="border border-slate-200 text-slate-500 text-sm px-3 py-1.5 rounded-md outline-none bg-white">
            <option>Wilayah</option>
          </select>
        </div>
        
        {locationStats.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">Tidak ada data hazard per lokasi.</div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationStats} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="lokasi" 
                  angle={-15} 
                  textAnchor="end" 
                  tick={{fontSize: 10, fill: '#64748b'}} 
                  interval={0} 
                  axisLine={{stroke: '#e2e8f0'}}
                  tickLine={false}
                />
                <YAxis 
                  tick={{fontSize: 11, fill: '#64748b'}} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} iconType="circle" />
                
                <Bar dataKey="open" name="Open" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="onProses" name="Work in Progress" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="closed" name="Close" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* BARIS 3: TABEL HAZARD STATUS (Pivoted Table) */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-slate-800 mb-4">Hazard Status</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-4 text-left font-semibold text-slate-600 min-w-[120px] bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"></th>
                {locationStats.map(loc => (
                  <th key={loc.lokasi} className="p-4 font-semibold text-slate-600 text-xs min-w-[100px] leading-tight">
                    {loc.lokasi}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row: Open Hazard */}
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Open Hazard</td>
                {locationStats.map(loc => (
                  <td key={loc.lokasi} className="p-4 text-slate-700">{loc.open}</td>
                ))}
              </tr>
              {/* Row: In Progress */}
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">In Progress</td>
                {locationStats.map(loc => (
                  <td key={loc.lokasi} className="p-4 text-slate-700">{loc.onProses}</td>
                ))}
              </tr>
              {/* Row: Closed */}
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Closed</td>
                {locationStats.map(loc => (
                  <td key={loc.lokasi} className="p-4 text-slate-700">{loc.closed}</td>
                ))}
              </tr>
              {/* Row: Total Hazard */}
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-left font-medium text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Total Hazard</td>
                {locationStats.map(loc => (
                  <td key={loc.lokasi} className="p-4 text-slate-700">{loc.total}</td>
                ))}
              </tr>
              {/* Row: TL % (Tindak Lanjut Percentage) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-left font-bold text-slate-800 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">TL %</td>
                {locationStats.map(loc => (
                  <td key={loc.lokasi} className="p-4 font-bold text-slate-800">{loc.tlPercent}%</td>
                ))}
              </tr>
            </tbody>
          </table>
          {locationStats.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm border-t border-slate-100">
              Data tabel belum tersedia.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}