"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertOctagon, Clock, Search, PenLine, Camera, ArrowLeft, History, CheckCircle2, Loader2 } from "lucide-react";

export default function ReviewTemuanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // State untuk navigasi tampilan (List vs Detail)
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [detailData, setDetailData] = useState<any>(null);

  // State Loading Screen Transisi & Submit
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk form Tindak Lanjut
  const [isTindakLanjutOpen, setIsTindakLanjutOpen] = useState(false);
  const [tindakanText, setTindakanText] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("On Proses");
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState<File | null>(null);

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

      if (viewMode === "detail" && detailData) {
        const updatedDetail = inspeksiData?.find((item) => item.id === detailData.id);
        if (updatedDetail) setDetailData(updatedDetail);
      }
    } catch (error: any) {
      console.error("Gagal memuat data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTindakLanjutModal = (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    setDetailData(row);
    setTindakanText(row.tindakan_penanggulangan || "");
    setStatusUpdate(row.status === "Closed" ? "Closed" : row.status === "On Proses" ? "On Proses" : "Open");
    setFotoTindakLanjut(null);
    setIsTindakLanjutOpen(true);
  };

  // Fungsi Masuk ke Detail dengan Loading Transisi
  const handleOpenDetailView = (row: any) => {
    setIsTransitioning(true);
    setDetailData(row);
    setTindakanText(row.tindakan_penanggulangan || "");
    setStatusUpdate(row.status === "Closed" ? "Closed" : row.status === "On Proses" ? "On Proses" : "Open");
    setFotoTindakLanjut(null);

    setTimeout(() => {
      setViewMode("detail");
      setIsTransitioning(false);
    }, 600); // Simulasi waktu muat layar detail
  };

  // Fungsi Kembali ke List dengan Loading Transisi
  const handleBackToList = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode("list");
      setIsTransitioning(false);
    }, 500);
  };

  // Fungsi Simpan Pembaruan
  const handleSimpanTindakLanjut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailData) return;
    setIsSubmitting(true);

    try {
      let uploadedUrl = detailData.foto_tindak_lanjut || "";

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
        .eq("id", detailData.id);

      if (error) throw error;

      alert("Tindak lanjut & foto bukti berhasil diperbarui!");

      // Ambil data terbaru
      await fetchData();

      // Jika dari tampilan detail, otomatis kembali ke list menu Hazard Report
      if (viewMode === "detail") {
        setViewMode("list");
      } else {
        setIsTindakLanjutOpen(false);
      }

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
      item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.no_pelaporan?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchFilter && matchSearch;
  });


  return (
    <div className="relative p-4 md:p-6 min-h-screen bg-slate-50 font-sans">

      {/* ---------------- OVERLAY LOADING SCREEN ---------------- */}
      {(isTransitioning || isSubmitting) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-sm font-bold text-slate-700 tracking-wide">
              {isSubmitting ? "Menyimpan Pembaruan..." : "Memuat Halaman..."}
            </p>
          </div>
        </div>
      )}

      {/* Modal Gambar Universal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl p-2 bg-slate-900 border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Perbesar Foto</DialogTitle></DialogHeader>
          {selectedImage && <img src={selectedImage} alt="Diperbesar" className="w-full h-auto max-h-[85vh] object-contain rounded-md" />}
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* TAMPILAN DETAIL                            */}
      {/* ========================================== */}
      {viewMode === "detail" && detailData ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
            <Button variant="ghost" onClick={handleBackToList} className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Detail Temuan
                <span className="text-slate-400 font-normal text-sm">
                  ({detailData.no_pelaporan || `ID: ${detailData.id}`})
                </span>
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h2 className="font-bold text-slate-800">Ticket Hazard</h2>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${detailData.status === 'Open' ? 'bg-red-50 text-red-700 border-red-200' :
                  detailData.status === 'On Proses' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  {detailData.status}
                </span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">No. Pelaporan</span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">: {detailData.no_pelaporan || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Tgl Temuan</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2">: {detailData.tanggal_temuan || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Batas Waktu</span>
                  <span className="text-sm font-medium text-red-600 col-span-2">: {detailData.cut_off_date || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Wilayah / Proyek</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2 flex flex-col">
                    <span>: {detailData.lokasi || "-"}</span>
                    <span className="text-[11px] text-slate-500 ml-2">{detailData.nama_proyek}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">PIC</span>
                  <span className="text-sm font-bold text-blue-700 col-span-2">: {detailData.pic || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Risiko</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2 flex items-center gap-1">
                    : <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${detailData.risk_level === 'Tinggi' ? 'bg-red-50 text-red-700 border-red-200' :
                      detailData.risk_level === 'Sedang' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                      {detailData.risk_level || "-"}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Kategori</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2">: {detailData.kategori || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Uraian / Temuan</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2 leading-relaxed">: {detailData.temuan || "-"}</span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-500 block mb-2">Foto Hazard (Before)</span>
                  {detailData.foto_url ? (
                    <img
                      src={detailData.foto_url}
                      alt="Foto Temuan"
                      className="w-full max-h-48 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90"
                      onClick={() => { setSelectedImage(detailData.foto_url); setIsImageModalOpen(true); }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                      Tidak ada foto
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h2 className="font-bold text-slate-800">Tindak Lanjut / Klarifikasi PIC</h2>
              </div>
              <div className="p-5 flex-1">
                <form onSubmit={handleSimpanTindakLanjut} className="space-y-5 h-full flex flex-col">

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Tindakan Penanggulangan</label>
                    <Textarea
                      placeholder="Deskripsikan perbaikan yang dilakukan..."
                      value={tindakanText}
                      onChange={(e) => setTindakanText(e.target.value)}
                      className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 block">Bukti Foto Perbaikan (After)</label>
                    {detailData.foto_tindak_lanjut && !fotoTindakLanjut && (
                      <div className="mb-3 relative group w-fit">
                        <img
                          src={detailData.foto_tindak_lanjut}
                          alt="Foto Perbaikan"
                          className="h-24 w-auto object-cover rounded border border-emerald-200 cursor-pointer"
                          onClick={() => { setSelectedImage(detailData.foto_tindak_lanjut); setIsImageModalOpen(true); }}
                        />
                        <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">TERSIMPAN</div>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      capture="environment"
                      onChange={(e) => { if (e.target.files) setFotoTindakLanjut(e.target.files[0]) }}
                      className="cursor-pointer bg-slate-50 border-slate-200"
                    />
                    <p className="text-[10px] text-slate-400">Pilih file baru untuk mengganti foto bukti sebelumnya.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Update Status</label>
                    <select
                      value={statusUpdate}
                      onChange={(e) => setStatusUpdate(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-md bg-slate-50 focus:bg-white outline-none font-medium text-sm"
                    >
                      <option value="Open">Open (Masih Bahaya)</option>
                      <option value="On Proses">On Proses (Sedang Dikerjakan)</option>
                      <option value="Closed">Closed (Sudah Aman / Selesai)</option>
                    </select>
                  </div>

                  <div className="mt-auto pt-6">
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-bold">
                      {isSubmitting ? "Memproses..." : "Simpan Pembaruan"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h2 className="font-bold text-slate-800">Riwayat Klarifikasi</h2>
              </div>
              <div className="p-5 flex-1 bg-slate-50/30">
                <div className="relative border-l border-slate-200 ml-3 space-y-6 pb-4">

                  {detailData.tindakan_penanggulangan && (
                    <div className="relative pl-6">
                      <span className="absolute -left-2.5 top-1 bg-white border-2 border-emerald-500 rounded-full w-5 h-5 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-700 mb-0.5">Penetapan Tindak Lanjut</h3>
                      <p className="text-[11px] text-slate-500">Tindakan perbaikan telah diinput dan status diperbarui menjadi <span className="font-bold">{detailData.status}</span>.</p>
                    </div>
                  )}

                  <div className="relative pl-6">
                    <span className="absolute -left-2.5 top-1 bg-white border-2 border-blue-400 rounded-full w-5 h-5 flex items-center justify-center">
                      <History size={12} className="text-blue-400" />
                    </span>
                    <h3 className="text-xs font-bold text-slate-700 mb-0.5">{detailData.tanggal_temuan}</h3>
                    <p className="text-[11px] text-slate-500">Laporan bahaya (Hazard) dibuat dan ditugaskan kepada PIC <b>{detailData.pic}</b> dengan batas waktu <b>{detailData.cut_off_date}</b>.</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (

        /* ========================================== */
        /* TAMPILAN LIST (Tabel Utama)                */
        /* ========================================== */
        <div className="space-y-6">
          <Dialog open={isTindakLanjutOpen} onOpenChange={setIsTindakLanjutOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[550px] p-6 rounded-xl bg-white max-h-[95vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-xl">Form Tindak Lanjut PIC</DialogTitle></DialogHeader>

              {detailData && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 mt-2 text-sm flex gap-3">
                  {detailData.foto_url ? (
                    <img src={detailData.foto_url} alt="Temuan" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-md flex items-center justify-center text-slate-400"><Camera size={20} /></div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-800 mb-1 leading-tight">{detailData.temuan}</div>
                    <div className="text-xs text-slate-500">Lokasi: {detailData.lokasi}</div>
                    <div className="text-xs text-slate-500 mt-1">Target Selesai: <span className="text-red-500 font-medium">{detailData.cut_off_date}</span></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSimpanTindakLanjut} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Tindakan Penanggulangan</label>
                  <Textarea
                    placeholder="Deskripsikan perbaikan yang sudah dilakukan..."
                    value={tindakanText}
                    onChange={(e) => setTindakanText(e.target.value)}
                    className="min-h-[90px] focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-sm font-semibold text-slate-700 block">Bukti Foto Perbaikan (After)</label>
                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    capture="environment"
                    onChange={(e) => { if (e.target.files) setFotoTindakLanjut(e.target.files[0]) }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-sm font-semibold text-slate-700">Update Status</label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-md bg-white focus:border-blue-500 outline-none font-medium"
                  >
                    <option value="Open">Open</option>
                    <option value="On Proses">On Proses</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4 h-10">
                  {isSubmitting ? "Mengunggah..." : "Simpan Pembaruan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <AlertOctagon className="text-blue-600" /> Review Temuan
              </h1>
              <p className="text-sm text-slate-500 mt-1">Pantau, perbarui status, dan klik baris untuk melihat detail laporan.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
                <Input type="text" placeholder="Cari No. Laporan, PIC, dll..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-full bg-slate-50 border-slate-200" />
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
            <Table className="min-w-[1300px] text-sm">
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[150px] font-bold text-slate-700">No. Laporan & Waktu</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 text-center">Foto Temuan<br /><span className="text-[10px] font-normal text-slate-500">(Before)</span></TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 text-center">Foto Perbaikan<br /><span className="text-[10px] font-normal text-slate-500">(After)</span></TableHead>
                  <TableHead className="min-w-[200px] max-w-[300px] font-bold text-slate-700">Deskripsi & Lokasi</TableHead>
                  <TableHead className="min-w-[200px] max-w-[300px] font-bold text-slate-700">Tindakan Penanggulangan</TableHead>
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
                    <TableRow
                      key={row.id}
                      className="transition-all duration-200 border-b border-slate-100 cursor-pointer hover:bg-blue-50 hover:shadow-sm"
                      onClick={() => handleOpenDetailView(row)}
                      title="Klik baris untuk melihat Detail Laporan"
                    >
                      <TableCell className="align-top py-4">
                        <div className="font-bold text-slate-800 text-xs mb-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                          {row.no_pelaporan || "-"}
                        </div>
                        <div className="font-medium text-slate-600">{row.tanggal_temuan}</div>
                        <div className="text-[10px] text-red-500 mt-1 flex items-center gap-1 font-semibold"><Clock size={12} /> {row.cut_off_date}</div>
                      </TableCell>

                      <TableCell className="align-top text-center py-4">
                        {row.foto_url && row.foto_url.trim() !== "" ? (
                          <img
                            src={row.foto_url}
                            alt="Temuan"
                            className="w-full h-16 object-cover rounded-md border border-slate-200 shadow-sm hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(row.foto_url); setIsImageModalOpen(true); }}
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
                            className="w-full h-16 object-cover rounded-md border border-emerald-300 shadow-sm hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(row.foto_tindak_lanjut); setIsImageModalOpen(true); }}
                          />
                        ) : (
                          <div className="w-full h-16 bg-slate-50 border border-slate-200 border-dashed rounded-md flex items-center justify-center text-[10px] text-slate-400 italic">Belum Ada</div>
                        )}
                      </TableCell>

                      <TableCell className="align-top py-4">
                        <div className="font-semibold text-slate-800 mb-1 leading-tight min-w-[200px] max-w-[300px] whitespace-normal break-words line-clamp-3">
                          {row.temuan}
                        </div>
                        <div className="text-xs text-slate-500 mb-2 min-w-[200px] max-w-[300px] whitespace-normal break-words line-clamp-2">
                          Lokasi: <span className="font-medium text-slate-700">{row.lokasi}</span>
                          <span className="block mt-0.5 text-[10px] text-slate-400">{row.nama_proyek}</span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">
                          {row.kategori}
                        </span>
                      </TableCell>

                      <TableCell className="align-top py-4">
                        {row.tindakan_penanggulangan ? (
                          <div className="text-slate-700 text-sm bg-blue-50/50 p-2 rounded-md border border-blue-100 min-w-[200px] max-w-[300px] whitespace-normal break-words line-clamp-3">
                            {row.tindakan_penanggulangan}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-md border border-slate-100 min-w-[200px] max-w-[300px]">
                            Belum ada tindakan. PIC harus mengisi ini.
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top text-center py-4">
                        <div className="text-sm font-bold text-blue-700 mb-2">{row.pic}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.risk_level === 'Tinggi' ? 'bg-red-50 text-red-700 border-red-200' :
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
                          onClick={(e) => openTindakLanjutModal(e, row)}
                          size="sm"
                          className={`w-full text-xs shadow-sm flex items-center gap-1.5 ${row.status === "Closed"
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
      )}
    </div>
  );
}