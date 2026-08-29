"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertOctagon, CheckCircle2, Clock, Filter } from "lucide-react";

export default function ReviewTemuanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Semua"); // "Semua", "Open", "Closed"

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: inspeksiData, error } = await supabase
        .from("inspeksi")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setData(inspeksiData || []);
    } catch (error: any) {
      console.error("Gagal memuat data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mengubah status (Open -> Closed atau sebaliknya)
  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Open" ? "Closed" : "Open";
    
    // Konfirmasi sebelum mengubah
    if (!window.confirm(`Apakah Anda yakin ingin mengubah status temuan ini menjadi ${newStatus}?`)) return;

    try {
      const { error } = await supabase
        .from("inspeksi")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      // Update data di layar tanpa harus refresh halaman
      setData(data.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (error: any) {
      alert("Gagal mengubah status: " + error.message);
    }
  };

  // Filter data berdasarkan pilihan tombol
  const filteredData = data.filter(item => {
    if (filter === "Semua") return true;
    return item.status === filter;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-slate-50/50">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertOctagon className="text-orange-500" /> Review Temuan Safety
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau dan perbarui status tindakan penanggulangan (Close Out) dari hasil inspeksi lapangan.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border">
          <Filter size={16} className="text-slate-400 ml-2" />
          <Button 
            variant={filter === "Semua" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilter("Semua")}
            className={filter === "Semua" ? "bg-slate-800" : ""}
          >
            Semua
          </Button>
          <Button 
            variant={filter === "Open" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilter("Open")}
            className={filter === "Open" ? "bg-red-600 hover:bg-red-700" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
          >
            Open
          </Button>
          <Button 
            variant={filter === "Closed" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilter("Closed")}
            className={filter === "Closed" ? "bg-emerald-600 hover:bg-emerald-700" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
          >
            Closed
          </Button>
        </div>
      </div>

      {/* TABEL REVIEW */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table className="min-w-[1000px] text-sm">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px]">Tgl & Cut Off</TableHead>
              <TableHead className="w-[150px]">Foto Temuan</TableHead>
              <TableHead>Deskripsi & Lokasi</TableHead>
              <TableHead className="w-[200px]">Penanggulangan & PIC</TableHead>
              <TableHead className="w-[100px] text-center">Risk</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[150px] text-center">Aksi (Update)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500">Memuat data temuan...</TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500">Tidak ada data temuan pada kategori ini.</TableCell></TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="align-top">
                    <div className="font-medium text-slate-900">{row.tanggal_temuan}</div>
                    <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><Clock size={12}/> Limit: {row.cut_off_date}</div>
                  </TableCell>
                  <TableCell className="align-top text-center">
                    {row.foto_url ? (
                      <img src={row.foto_url} alt="Temuan" className="w-full h-24 object-cover rounded-md border shadow-sm" />
                    ) : (
                      <div className="w-full h-24 bg-slate-100 border rounded-md flex items-center justify-center text-xs text-slate-400">Tanpa Foto</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-semibold text-slate-800 mb-1">{row.temuan}</div>
                    <div className="text-xs text-slate-500 mb-2">Lokasi: {row.lokasi}</div>
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {row.kategori}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="text-slate-700 text-sm mb-2">{row.tindakan_penanggulangan}</div>
                    <div className="text-xs font-semibold text-blue-600">PIC: {row.pic}</div>
                  </TableCell>
                  <TableCell className="align-top text-center font-bold text-slate-700">
                    {row.risk_level}
                  </TableCell>
                  <TableCell className="align-top text-center">
                    {row.status === "Open" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <AlertOctagon size={14} /> OPEN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={14} /> CLOSED
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-center">
                    {row.status === "Open" ? (
                      <Button onClick={() => toggleStatus(row.id, row.status)} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs">
                        Tutup (Close)
                      </Button>
                    ) : (
                      <Button onClick={() => toggleStatus(row.id, row.status)} size="sm" variant="outline" className="w-full text-xs text-slate-500 hover:text-slate-700">
                        Buka Ulang
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}