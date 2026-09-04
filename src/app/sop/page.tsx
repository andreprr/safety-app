"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, FileText, Download, Trash2, Folder, FolderOpen, Eye } from "lucide-react";

export default function DokumenSopPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState("Semua"); 

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ judul: "", kategori: "SOP" });
  const [file, setFile] = useState<File | null>(null);

  const [viewPdfUrl, setViewPdfUrl] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewPdfTitle, setViewPdfTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase.from("dokumen_sop").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setData(docs || []);
    } catch (error: any) {
      console.error("Gagal memuat dokumen:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Pilih file PDF terlebih dahulu!");
    setIsSubmitting(true);

    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      // NAMA BUCKET DISESUAIKAN MENJADI: dokumen-pdf
      const { error: uploadError } = await supabase.storage.from('dokumen-pdf').upload(fileName, file);
      if (uploadError) throw new Error("Gagal upload file: " + uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('dokumen-pdf').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from("dokumen_sop").insert([{ 
        judul: formData.judul, 
        kategori: formData.kategori, 
        file_url: publicUrlData.publicUrl 
      }]);
      
      if (dbError) throw new Error("Gagal simpan ke database: " + dbError.message);

      alert("Dokumen berhasil diunggah!");
      setIsUploadOpen(false);
      setFormData({ judul: "", kategori: "SOP" });
      setFile(null);
      fetchData();
    } catch (error: any) {
      alert("TERJADI KESALAHAN:\n" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, fileUrl: string) => {
    if (!window.confirm("Yakin ingin menghapus dokumen ini?")) return;
    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        // NAMA BUCKET DISESUAIKAN MENJADI: dokumen-pdf
        await supabase.storage.from('dokumen-pdf').remove([fileName]);
      }
      
      const { error } = await supabase.from("dokumen_sop").delete().eq("id", id);
      if (error) throw error;
      
      fetchData();
    } catch (error: any) {
      alert("Gagal menghapus dokumen: " + error.message);
    }
  };

  const openPreview = (url: string, title: string) => {
    setViewPdfUrl(url);
    setViewPdfTitle(title);
    setIsViewModalOpen(true);
  };

  const filteredData = data.filter(doc => {
    const matchFolder = activeFolder === "Semua" ? true : doc.kategori === activeFolder;
    const matchSearch = doc.judul?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFolder && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 font-sans">
      
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-white flex flex-col overflow-hidden rounded-xl border border-slate-200">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <FileText className="text-blue-600" size={20} /> {viewPdfTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-200 h-full">
            {viewPdfUrl ? (
              <iframe src={`${viewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Viewer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">Memuat Dokumen...</div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
            <a href={viewPdfUrl || "#"} target="_blank" rel="noopener noreferrer">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <Download size={16} /> Unduh File Ini
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FolderOpen className="text-blue-600" /> Dokumen SOP & JSA
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pusat penyimpanan Standar Operasional Prosedur dan Job Safety Analysis.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
            <Input type="text" placeholder="Cari judul dokumen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 w-full bg-slate-50 border-slate-200" />
          </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 h-10 shadow-sm w-full sm:w-auto justify-center">
              <Plus size={16} /> Upload Dokumen
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[500px] p-6 rounded-xl bg-white">
              <DialogHeader><DialogTitle className="text-xl">Upload Dokumen Baru</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Judul Dokumen</label>
                  <Input placeholder="Contoh: SOP Bekerja di Ketinggian" value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Folder / Kategori</label>
                  <select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-md bg-white focus:border-blue-500 outline-none">
                    <option value="SOP">SOP (Standar Operasional Prosedur)</option>
                    <option value="JSA">JSA (Job Safety Analysis)</option>
                  </select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-sm font-semibold text-slate-700 block">File PDF</label>
                  <Input type="file" accept=".pdf" onChange={handleFileChange} required className="cursor-pointer" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4 h-10">
                  {isSubmitting ? "Mengunggah..." : "Simpan Dokumen"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveFolder("Semua")} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeFolder === "Semua" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Folder size={18} /> Semua File</button>
        <button onClick={() => setActiveFolder("SOP")} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeFolder === "SOP" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Folder size={18} className={activeFolder === "SOP" ? "text-emerald-500" : ""} /> Folder SOP</button>
        <button onClick={() => setActiveFolder("JSA")} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeFolder === "JSA" ? "border-orange-500 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Folder size={18} className={activeFolder === "JSA" ? "text-orange-500" : ""} /> Folder JSA</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table className="min-w-[800px] text-sm">
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[60px] font-bold text-slate-700 text-center">No</TableHead>
              <TableHead className="w-[120px] font-bold text-slate-700 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-slate-700">Judul Dokumen</TableHead>
              <TableHead className="w-[180px] font-bold text-slate-700 text-center">Tanggal Upload</TableHead>
              <TableHead className="w-[200px] font-bold text-slate-700 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">Memuat dokumen...</TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">Tidak ada dokumen di folder ini.</TableCell></TableRow>
            ) : (
              filteredData.map((doc, index) => (
                <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                  <TableCell className="text-center p-4">{index + 1}</TableCell>
                  <TableCell className="text-center p-4">
                    <span className={`inline-flex items-center justify-center w-16 py-1 rounded text-xs font-bold border ${doc.kategori === 'SOP' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      {doc.kategori || 'SOP'}
                    </span>
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" /> {doc.judul}
                    </div>
                  </TableCell>
                  <TableCell className="text-center p-4 text-slate-500 text-xs">
                    {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-center p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPreview(doc.file_url, doc.judul)} className="h-8 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1" title="Lihat isi dokumen">
                        <Eye size={14} /> Lihat
                      </Button>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" title="Unduh">
                          <Download size={14} />
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id, doc.file_url)} className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-600 border-red-200" title="Hapus">
                        <Trash2 size={14} />
                      </Button>
                    </div>
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