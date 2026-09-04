"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertOctagon, Clock, Search, PenLine, Camera } from "lucide-react";

export default function ReviewTemuanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filter, setFilter] = useState("Semua"); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [isTindakLanjutOpen, setIsTindakLanjutOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [tindakanText, setTindakanText] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("On Proses");
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openTindakLanjut = (row: any) => {
    setSelectedRow(row);
    setTindakanText(row.tindakan_penanggulangan || "");
    setStatusUpdate(row.status === "Closed" ? "Closed" : row.status === "On Proses" ? "On Proses" : "Open");
    setFotoTindakLanjut(null); 
    setIsTindakLanjutOpen(true);
  };

  const handleSimpanTindakLanjut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow) return;
    setIsSubmitting(true);

    try {
      let uploadedUrl = selectedRow.foto_tindak_lanjut || ""; 

      if (fotoTindakLanjut) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressedFile = await imageCompression(fotoTindakLanjut, options);
        const fileName = `tindaklanjut-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        await supabase.storage.from('inspeksi-photos').upload(fileName, compressedFile);
        const { data: publicUrlData } = supabase.storage.from('inspeksi-photos').getPublicUrl(fileName);
        uploadedUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("inspeksi")
        .update({ 
          tindakan_penanggulangan: tindakanText, 
          status: statusUpdate,
          foto_tindak_lanjut: uploadedUrl
        })
        .eq("id", selectedRow.id);
        
      if (error) throw error;
      
      alert("Tindak lanjut & foto bukti berhasil diperbarui!");
      setIsTindakLanjutOpen(false);
      fetchData(); 
    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter(item => {
    const matchFilter = filter === "Semua" ? true : item.status === filter;
    const matchSearch = 
      item.temuan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 font-sans">
      
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl p-2 bg-slate-900 border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Perbesar Foto</DialogTitle></DialogHeader>
          {selectedImage && <img src={selectedImage} alt="Diperbesar" className="w-full h-auto max-h-[85vh] object-contain rounded-md" />}
        </DialogContent>
      </Dialog>

      <Dialog open={isTindakLanjutOpen} onOpenChange={setIsTindakLanjutOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[550px] p-6 rounded-xl bg-white max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Form Tindak Lanjut PIC</DialogTitle></DialogHeader>
          
          {selectedRow && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 mt-2 text-sm flex gap-3">
              {selectedRow.foto_url ? (
                <img src={selectedRow.foto_url} alt="Temuan" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
              ) : (
                <div className="w-16 h-16 bg-slate-200 rounded-md flex items-center justify-center text-slate-400"><Camera size={20}/></div>
              )}
              <div>
                <div className="font-semibold text-slate-800 mb-1 leading-tight">{selectedRow.temuan}</div>
                <div className="text-xs text-slate-500">Lokasi: {selectedRow.lokasi}</div>
                <div className="text-xs text-slate-500 mt-1">Target Selesai: <span className="text-red-500 font-medium">{selectedRow.cut_off_date}</span></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSimpanTindakLanjut} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tindakan Penanggulangan yang Dilakukan</label>
              <Textarea 
                placeholder="Deskripsikan perbaikan yang sudah dilakukan oleh tim lapangan..." 
                value={tindakanText} 
                onChange={(e) => setTindakanText(e.target.value)} 
                className="min-h-[90px] focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-700 block">Bukti Foto Perbaikan (After)</label>
              {/* PERBAIKAN: Menambahkan capture="environment" untuk kamera hp */}
              <Input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                capture="environment"
                onChange={(e) => { if (e.target.files) setFotoTindakLanjut(e.target.files[0]) }} 
                className="cursor-pointer" 
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Bisa pilih file dari galeri atau langsung foto dari kamera HP (Maks 5MB).
              </p>
            </div>
            
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-700">Update Status Laporan</label>
              <select 
                value={statusUpdate} 
                onChange={(e) => setStatusUpdate(e.target.value)} 
                className="w-full border border-slate-200 p-2.5 rounded-md bg-white focus:border-blue-500 outline-none font-medium"
              >
                <option value="Open">Open (Belum ada perbaikan / Masih Bahaya)</option>
                <option value="On Proses">On Proses (Sedang Dikerjakan)</option>
                <option value="Closed">Closed (Sudah Aman / Selesai)</option>
              </select>
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4 h-10">
              {isSubmitting ? "Mengunggah Bukti..." : "Simpan Pembaruan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertOctagon className="text-blue-600" /> Review Temuan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pantau, perbarui status, dan upload bukti perbaikan lapangan.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
            <Input type="text" placeholder="Cari bahaya, lokasi, PIC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-full bg-slate-50 border-slate-200" />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto overflow-x-auto">
            <Button variant="ghost" size="sm" onClick={() => setFilter("Semua")} className={`px-4 ${filter === "Semua" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-500"}`}>Semua</Button>
            <Button variant="ghost" size="sm" onClick={() => setFilter("Open")} className={`px-4 ${filter === "Open" ? "bg-red-50 text-red-700 font-bold shadow-sm" : "text-slate-500"}`}>Open</Button>
            <Button variant="ghost" size="sm" onClick={() => setFilter("On Proses")} className={`px-4 ${filter === "On Proses" ? "bg-orange-50 text-orange-700 font-bold shadow-sm" : "text-slate-500"}`}>On Proses</Button>
            <Button variant="ghost" size="sm" onClick={() => setFilter("Closed")} className={`px-4 ${filter === "Closed" ? "bg-emerald-50 text-emerald-700 font-bold shadow-sm" : "text-slate-500"}`}>Closed</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table className="min-w-[1200px] text-sm">
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[110px] font-bold text-slate-700">Tgl & Limit</TableHead>
              <TableHead className="w-[120px] font-bold text-slate-700 text-center">Foto Temuan<br/><span className="text-[10px] font-normal text-slate-500">(Before)</span></TableHead>
              <TableHead className="w-[120px] font-bold text-slate-700 text-center">Foto Perbaikan<br/><span className="text-[10px] font-normal text-slate-500">(After)</span></TableHead>
              <TableHead className="font-bold text-slate-700">Deskripsi & Lokasi</TableHead>
              <TableHead className="w-[220px] font-bold text-slate-700">Tindakan Penanggulangan</TableHead>
              <TableHead className="w-[120px] font-bold text-slate-700 text-center">PIC & Risiko</TableHead>
              <TableHead className="w-[100px] font-bold text-slate-700 text-center">Status</TableHead>
              <TableHead className="w-[120px] font-bold text-slate-700 text-center">Aksi (PIC)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">Memuat data temuan...</TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">Tidak ada data yang cocok dengan pencarian/filter.</TableCell></TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="align-top py-4">
                    <div className="font-medium text-slate-800">{row.tanggal_temuan}</div>
                    <div className="text-[10px] text-red-500 mt-1 flex items-center gap-1 font-semibold"><Clock size={12}/> {row.cut_off_date}</div>
                  </TableCell>
                  
                  <TableCell className="align-top text-center py-4">
                    {row.foto_url && row.foto_url.trim() !== "" ? (
                      <img 
                        src={row.foto_url} 
                        alt="Temuan" 
                        className="w-full h-16 object-cover rounded-md border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => { setSelectedImage(row.foto_url); setIsImageModalOpen(true); }}
                      />
                    ) : (
                      <div className="w-full h-16 bg-slate-50 border border-slate-200 border-dashed rounded-md flex items-center justify-center text-[10px] text-slate-400">Tak Ada</div>
                    )}
                  </TableCell>

                  <TableCell className="align-top text-center py-4">
                    {row.foto_tindak_lanjut && row.foto_tindak_lanjut.trim() !== "" ? (
                      <img 
                        src={row.foto_tindak_lanjut} 
                        alt="Perbaikan" 
                        className="w-full h-16 object-cover rounded-md border border-emerald-300 shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => { setSelectedImage(row.foto_tindak_lanjut); setIsImageModalOpen(true); }}
                      />
                    ) : (
                      <div className="w-full h-16 bg-slate-50 border border-slate-200 border-dashed rounded-md flex items-center justify-center text-[10px] text-slate-400 italic">Belum Ada</div>
                    )}
                  </TableCell>

                  <TableCell className="align-top py-4">
                    <div className="font-semibold text-slate-800 mb-1 leading-tight">{row.temuan}</div>
                    <div className="text-xs text-slate-500 mb-2">Lokasi: <span className="font-medium text-slate-700">{row.lokasi}</span></div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">{row.kategori}</span>
                  </TableCell>
                  
                  <TableCell className="align-top py-4">
                    {row.tindakan_penanggulangan ? (
                      <div className="text-slate-700 text-sm bg-blue-50/50 p-2 rounded-md border border-blue-100">{row.tindakan_penanggulangan}</div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-md border border-slate-100">Belum ada tindakan. PIC harus mengisi ini.</div>
                    )}
                  </TableCell>

                  <TableCell className="align-top text-center py-4">
                    <div className="text-sm font-bold text-blue-700 mb-2">{row.pic}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      row.risk_level === 'Tinggi' ? 'bg-red-50 text-red-700 border-red-200' : 
                      row.risk_level === 'Sedang' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      row.risk_level === 'Rendah' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {row.risk_level}
                    </span>
                  </TableCell>

                  <TableCell className="align-top text-center py-4">
                    {row.status === "Open" ? (
                      <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">OPEN</span>
                    ) : row.status === "On Proses" ? (
                      <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">ON PROSES</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">CLOSED</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="align-top text-center py-4">
                    <Button 
                      onClick={() => openTindakLanjut(row)} 
                      size="sm" 
                      className={`w-full text-xs shadow-sm flex items-center gap-1.5 ${
                        row.status === "Closed" 
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200" 
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <PenLine size={13} /> 
                      {row.status === "Closed" ? "Edit Bukti" : "Tindak Lanjut"}
                    </Button>
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