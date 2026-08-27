"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertTriangle, Activity, Users, Settings } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Warna untuk Pie Chart Overview K3
const OVERVIEW_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"]; 
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

export default function DashboardPage() {
  // State Data Dinamis
  const [totalPekerja, setTotalPekerja] = useState(0);
  const [jamKerja, setJamKerja] = useState(0);
  const [accident, setAccident] = useState(0);
  const [nearmiss, setNearmiss] = useState(0);
  
  // State Grafik
  const [trendData, setTrendData] = useState<any[]>([]);
  const [overviewData, setOverviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Form
  const [isKpiOpen, setIsKpiOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formPekerja, setFormPekerja] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Tarik Data Total Pekerja dari DB
      const { data: kpiData } = await supabase.from('dashboard_kpi').select('total_pekerja').eq('id', 1).single();
      const pekerja = kpiData?.total_pekerja || 0;
      setTotalPekerja(pekerja);
      setFormPekerja(pekerja);

      // Kalkulasi Dinamis Jam Kerja (Pekerja x 8 jam x 26 hari kerja sebulan)
      const kalkulasiJam = pekerja * 8 * 26;
      setJamKerja(kalkulasiJam);

      // 2. Tarik Data IBPPR untuk menghitung Accident & Nearmiss
      const { data: ibpprData } = await supabase.from('ibppr').select('c_dampak');
      let accCount = 0;
      let nmCount = 0;
      
      if (ibpprData) {
        ibpprData.forEach((item) => {
          // Asumsi: Jika Dampak >= 4 masuk ke Accident, jika <= 3 masuk ke Nearmiss
          if (item.c_dampak >= 4) accCount++;
          else nmCount++;
        });
      }
      setAccident(accCount);
      setNearmiss(nmCount);

      // Set Data Pie Chart Utama
      setOverviewData([
        { name: "Total Jam Kerja", value: kalkulasiJam },
        { name: "Accident (Insiden)", value: accCount },
        { name: "Nearmiss", value: nmCount },
        { name: "Total Pekerja", value: pekerja },
      ]);

      // 3. Tarik Data Inspeksi untuk Bar Chart Tren Bulanan
      const { data: inspeksiData } = await supabase.from('inspeksi').select('kategori, tanggal_temuan');
      if (inspeksiData) {
        const monthlyTrend: Record<string, any> = {};
        inspeksiData.forEach((item) => {
          if (item.tanggal_temuan) {
            const date = new Date(item.tanggal_temuan);
            const monthName = MONTHS[date.getMonth()];
            if (!monthlyTrend[monthName]) monthlyTrend[monthName] = { bulan: monthName, "Unsafe Action": 0, "Unsafe Condition": 0 };
            if (item.kategori === 'UNSAFE ACTION') monthlyTrend[monthName]["Unsafe Action"]++;
            if (item.kategori === 'UNSAFE CONDITION') monthlyTrend[monthName]["Unsafe Condition"]++;
          }
        });
        setTrendData(Object.values(monthlyTrend));
      }
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('dashboard_kpi').update({ total_pekerja: formPekerja }).eq('id', 1);
      if (error) throw error;
      
      alert("Total Pekerja berhasil di-update! Jam Kerja otomatis menyesuaikan.");
      setIsKpiOpen(false);
      fetchDashboardData(); 
    } catch (error: any) {
      alert("Gagal memperbarui KPI: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat statistik dinamis...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Dashboard Kinerja K3</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Statistik dinamis berdasarkan laporan IBPPR & Inspeksi.</p>
        </div>

        {/* TOMBOL EDIT PEKERJA */}
        <Dialog open={isKpiOpen} onOpenChange={setIsKpiOpen}>
          <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors">
            <Settings size={16} /> Atur Jumlah Pekerja
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[400px] p-6 rounded-xl bg-white">
            <DialogHeader><DialogTitle className="text-xl font-bold text-slate-800 border-b pb-4">Update Total Pekerja</DialogTitle></DialogHeader>
            <form onSubmit={handleKpiSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Total Pekerja Aktif Saat Ini</Label>
                <Input 
                  type="number" 
                  value={formPekerja} 
                  onChange={(e) => setFormPekerja(parseInt(e.target.value) || 0)} 
                  required 
                />
                <p className="text-xs text-slate-500">*Total Jam Kerja akan otomatis dikalkulasi berdasarkan (Pekerja x 8 jam x 26 hari).</p>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 hover:bg-slate-900 mt-4">
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 4 KARTU METRIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-600">Total Jam Kerja</CardTitle>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-black text-slate-800">{jamKerja.toLocaleString('id-ID')}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Bulan ini (Dinamis)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-600">Accident (Insiden)</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-black text-slate-800">{accident}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Dari IBPPR (Dampak ≥ 4)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-600">Nearmiss</CardTitle>
            <Activity className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-black text-slate-800">{nearmiss}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Dari IBPPR (Dampak ≤ 3)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-600">Total Pekerja</CardTitle>
            <Users className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-black text-slate-800">{totalPekerja.toLocaleString('id-ID')}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Personel aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* AREA GRAFIK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* PIE CHART BARU (Memuat 4 Metrik Utama Sesuai Permintaan) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Distribusi Data Keseluruhan</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overviewData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name }) => name} 
                  className="text-xs font-medium fill-slate-700"
                >
                  {overviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OVERVIEW_COLORS[index % OVERVIEW_COLORS.length]} />
                  ))}
                </Pie>
                {/* Tooltip sangat penting di sini karena persentase Jam Kerja sangat besar dibanding Accident */}
                <Tooltip formatter={(value: any) => value ? value.toLocaleString('id-ID') : '0'} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* GRAFIK BATANG (Tren Inspeksi) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Tren Laporan Inspeksi (Patrol)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Belum ada data inspeksi bulanan</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Unsafe Action" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar dataKey="Unsafe Condition" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}