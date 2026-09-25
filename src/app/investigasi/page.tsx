"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchCheck, Plus, Trash2, Download, Eye, Loader2, FileText, Calendar as CalendarIcon } from "lucide-react";

export default function InvestigasiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Form Input
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // State untuk Modal Preview (Lihat)
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => { fetchInvestigasi(); }, []);

  const fetchInvestigasi = async () => {
    setLoading(true);
    const { data: fetchRes, error } = await supabase
      .from("investigasi")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setData(fetchRes || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Pilih file terlebih dahulu!");
    setIsSubmitting(true);

    try {
      const fileExt = file.name.split('.').pop();
      const cleanFileName = file.name.substring(0, file.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `investigasi-${cleanFileName}-${Date.now()}.${fileExt}`;

      // REVISI: Menggunakan bucket 'dokumen-pdf' sesuai yang ada di Supabase Anda
      const { error: uploadError } = await supabase.storage.from('dokumen-pdf').upload(fileName, file);
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('dokumen-pdf').getPublicUrl(fileName);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      const { error: insertError } = await supabase.from("investigasi").insert([{
        judul: judul,
        tanggal: tanggal,
        keterangan: keterangan,
        file_url: publicUrlData.publicUrl,
        ukuran_file: fileSizeMB
      }]);

      if (insertError) throw new Error(insertError.message);

      alert("Data Investigasi berhasil diupload!");
      setIsModalOpen(false);

      // Reset Form
      setJudul("");
      setTanggal("");
      setKeterangan("");
      setFile(null);

      fetchInvestigasi();
    } catch (error: any) {
      alert("Gagal upload: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!window.confirm("Hapus data investigasi ini?")) return;
    try {
      const fileName = fileUrl.split('/').pop();
      // REVISI: Menggunakan bucket 'dokumen-pdf'
      if (fileName) await supabase.storage.from('dokumen-pdf').remove([fileName]);

      await supabase.from("investigasi").delete().eq("id", id);
      fetchInvestigasi();
    } catch (error) {
      alert("Gagal menghapus data!");
    }
  };

  // Fungsi helper membuat nama file bersih saat diunduh
  const getDownloadFilename = (title: string, url: string) => {
    const ext = url.split('.').pop() || 'pdf';
    const formattedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    return `Investigasi_${formattedTitle}.${ext}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-2">
            <SearchCheck size={26} className="text-[#F97316]" />
            Data Investigasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pusat dokumentasi dan pelaporan file investigasi insiden.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm w-full sm:w-auto justify-center">
            <Plus size={16} /> Upload Investigasi
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[500px] bg-white p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#1E3A8A]">Upload File Investigasi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Judul Investigasi</label>
                <Input
                  placeholder="Contoh: Investigasi Insiden Area 1"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  required
                  className="focus-visible:ring-[#F97316]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tanggal Kejadian / Laporan</label>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="focus-visible:ring-[#F97316]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Keterangan Singkat</label>
                <textarea
                  placeholder="Tambahkan catatan atau deskripsi singkat..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F97316] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Upload Dokumen / Foto</label>
                <Input
                  type="file"
                  // Accept PDF, Word, PowerPoint, dan semua format Gambar
                  accept=".pdf, image/*, .doc, .docx, .ppt, .pptx, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(e) => { if (e.target.files) setFile(e.target.files[0]) }}
                  required
                  className="file:bg-[#1E3A8A] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-xs file:font-bold hover:file:bg-[#152C69] cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 font-medium">Format: PDF, JPG, PNG, DOCX, PPTX</p>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white mt-4 font-bold h-11">
                {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={18} /> Mengunggah...</> : "Simpan & Upload"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* MODAL POPUP PREVIEW (LIHAT) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[900px] h-[85vh] p-4 bg-white flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <DialogTitle className="text-base font-bold text-[#1E3A8A] truncate max-w-[700px]">
              {previewItem?.judul}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full bg-slate-100 rounded-lg overflow-hidden mt-2 relative flex items-center justify-center">
            {previewItem?.file_url ? (
              <iframe
                src={previewItem.file_url}
                className="w-full h-full border-none rounded-lg bg-white"
                title={previewItem.judul}
              />
            ) : (
              <p className="text-slate-400 text-sm">Gagal memuat dokumen.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-[#1E3A8A]">
              <TableRow>
                <TableHead className="w-[60px] text-white font-bold text-center">No</TableHead>
                <TableHead className="text-white font-bold min-w-[200px]">Informasi Investigasi</TableHead>
                <TableHead className="text-white font-bold w-[120px]">Tanggal</TableHead>
                <TableHead className="text-white font-bold text-center w-[120px]">Ukuran File</TableHead>
                <TableHead className="text-white font-bold text-center w-[180px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 font-medium text-[#1E3A8A] animate-pulse">Memuat Data Investigasi...</TableCell></TableRow> :
                data.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 font-medium bg-slate-50/50">Belum ada dokumen investigasi yang diunggah.</TableCell></TableRow> :
                  data.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1E3A8A]">{row.judul}</span>
                          <span className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{row.keterangan}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <CalendarIcon size={14} className="text-[#F97316]" />
                          {row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-500 text-xs font-medium bg-slate-50/50">
                        {row.ukuran_file || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          {/* Tombol Lihat (Memicu Modal Pop-up) */}
                          <button
                            onClick={() => { setPreviewItem(row); setIsPreviewOpen(true); }}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold border border-blue-100"
                            title="Lihat Dokumen"
                          >
                            <Eye size={14} /> Lihat
                          </button>

                          {/* Tombol Unduh */}
                          <a
                            href={row.file_url}
                            download={getDownloadFilename(row.judul, row.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1 text-xs font-bold border border-emerald-100"
                            title="Unduh Dokumen"
                          >
                            <Download size={14} /> Unduh
                          </a>

                          {/* Tombol Hapus */}
                          <button
                            onClick={() => handleDelete(row.id, row.file_url)}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors border border-rose-100"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}