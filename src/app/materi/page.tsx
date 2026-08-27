"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Plus, Presentation, BookOpenCheck } from "lucide-react";

export default function MateriPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [judul, setJudul] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMateri();
  }, []);

  const fetchMateri = async () => {
    try {
      const { data: dokData, error } = await supabase
        .from('dokumen')
        .select('*')
        .eq('kategori', 'MATERI') // Filter khusus kategori MATERI (Bukan SOP)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(dokData || []);
    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        alert("Hanya diperbolehkan mengunggah fail berformat PDF!");
        e.target.value = "";
        setPdfFile(null);
        return;
      }
      setPdfFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      alert("Pilih dokumen PDF terlebih dahulu!");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${Date.now()}-materi-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const fileSize = formatBytes(pdfFile.size);

      // Upload ke bucket dokumen-pdf yang sudah ada sebelumnya
      const { error: uploadError } = await supabase.storage
        .from('dokumen-pdf')
        .upload(fileName, pdfFile);

      if (uploadError) throw new Error("Gagal upload PDF: " + uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from('dokumen-pdf')
        .getPublicUrl(fileName);

      // Simpan dengan kategori 'MATERI'
      const { error: dbError } = await supabase.from('dokumen').insert([{
        judul: judul,
        kategori: 'MATERI',
        file_url: publicUrlData.publicUrl,
        ukuran_file: fileSize,
      }]);

      if (dbError) throw dbError;

      alert("Materi K3 berhasil diunggah!");
      setIsDialogOpen(false);
      setJudul("");
      setPdfFile(null);
      fetchMateri(); 
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Presentation className="text-blue-600" /> Materi Safety (Training)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola dan unduh materi pelatihan, Toolbox Meeting (TBM), dan induksi K3.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors">
            <Plus size={16} /> Upload Materi
          </DialogTrigger>
          
          <DialogContent className="w-[95vw] sm:max-w-[500px] p-6 rounded-xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 border-b pb-4">
                Unggah Materi Safety
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Judul Materi</Label>
                <Input 
                  placeholder="Contoh: Materi Induksi Pekerja Baru" 
                  value={judul} 
                  onChange={(e) => setJudul(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Pilih Fail PDF</Label>
                <Input 
                  type="file" 
                  accept=".pdf,application/pdf" 
                  onChange={handleFileChange} 
                  required 
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-1">*Hanya mendukung format .pdf</p>
              </div>

              <Button type="submit" disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                {isUploading ? "Mengunggah..." : "Upload Sekarang"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[50px] text-center">No</TableHead>
              <TableHead>Judul Materi</TableHead>
              <TableHead className="w-[150px]">Ukuran</TableHead>
              <TableHead className="w-[150px]">Tanggal Unggah</TableHead>
              <TableHead className="w-[150px] text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat materi...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Belum ada materi K3 yang diunggah.</TableCell></TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={row.id} className="hover:bg-slate-50">
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <BookOpenCheck size={16} className="text-emerald-600" /> {row.judul}
                  </TableCell>
                  <TableCell className="text-slate-500">{row.ukuran_file}</TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(row.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="text-center">
                    <a 
                      href={row.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    >
                      <Download size={14} /> Unduh
                    </a>
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