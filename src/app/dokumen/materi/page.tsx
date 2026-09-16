"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Trash2, Download, Eye, Loader2, MonitorPlay, X } from "lucide-react";

export default function MateriPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [judul, setJudul] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // State untuk Modal Preview (Lihat)
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => { fetchMateri(); }, []);

    const fetchMateri = async () => {
        setLoading(true);
        const { data: fetchRes, error } = await supabase
            .from("dokumen")
            .select("*")
            .eq("kategori", "MATERI")
            .order("id", { ascending: false });

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
            const fileName = `materi-${cleanFileName}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('dokumen').upload(fileName, file);
            if (uploadError) throw new Error(uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('dokumen').getPublicUrl(fileName);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";

            const { error: insertError } = await supabase.from("dokumen").insert([{
                judul: judul,
                file_url: publicUrlData.publicUrl,
                kategori: "MATERI",
                ukuran_file: fileSizeMB
            }]);

            if (insertError) throw new Error(insertError.message);

            alert("Materi berhasil diupload!");
            setIsModalOpen(false);
            setJudul(""); setFile(null);
            fetchMateri();
        } catch (error: any) {
            alert("Gagal upload: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!window.confirm("Hapus materi ini?")) return;
        try {
            const fileName = fileUrl.split('/').pop();
            if (fileName) await supabase.storage.from('dokumen').remove([fileName]);

            await supabase.from("dokumen").delete().eq("id", id);
            fetchMateri();
        } catch (error) {
            alert("Gagal menghapus data!");
        }
    };

    // Fungsi helper membuat nama file bersih saat diunduh
    const getDownloadFilename = (title: string, url: string) => {
        const ext = url.split('.').pop() || 'pdf';
        const formattedTitle = title.replace(/[^a-zA-Z0-9ก-ฮ]/g, '_');
        return `${formattedTitle}.${ext}`;
    };

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-2"><MonitorPlay size={24} /> Materi K3</h1>
                    <p className="text-sm text-slate-500 mt-1">Pusat dokumen materi presentasi dan edukasi keselamatan kerja.</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                        <Plus size={16} /> Upload Materi
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white">
                        <DialogHeader><DialogTitle>Upload Materi K3 Baru</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600">Judul Materi</label>
                                <Input placeholder="Contoh: Pengenalan APD Dasar" value={judul} onChange={(e) => setJudul(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600">File (PDF / Word)</label>
                                <Input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword" onChange={(e) => { if (e.target.files) setFile(e.target.files[0]) }} required />
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white mt-2">
                                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Upload Sekarang"}
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
                                className="w-full h-full border-none rounded-lg"
                                title={previewItem.judul}
                            />
                        ) : (
                            <p className="text-slate-400 text-sm">Gagal memuat dokumen.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#1E3A8A]">
                        <TableRow>
                            <TableHead className="w-[60px] text-white font-bold text-center">No</TableHead>
                            <TableHead className="text-white font-bold">Judul Materi</TableHead>
                            <TableHead className="text-white font-bold text-center w-[150px]">Ukuran File</TableHead>
                            <TableHead className="text-white font-bold text-center w-[200px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Memuat...</TableCell></TableRow> :
                            data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Belum ada materi K3.</TableCell></TableRow> :
                                data.map((row, idx) => (
                                    <TableRow key={row.id} className="hover:bg-slate-50">
                                        <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                        <TableCell className="font-semibold text-[#1E3A8A] flex items-center gap-2">
                                            <FileText size={16} className="text-slate-400" /> {row.judul}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-500 text-sm">{row.ukuran_file || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                {/* Tombol Lihat (Memicu Modal Pop-up) */}
                                                <button
                                                    onClick={() => { setPreviewItem(row); setIsPreviewOpen(true); }}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                                    title="Lihat Dokumen"
                                                >
                                                    <Eye size={14} /> Lihat
                                                </button>

                                                {/* Tombol Unduh dengan Nama File Sesuai Judul */}
                                                <a
                                                    href={row.file_url}
                                                    download={getDownloadFilename(row.judul, row.file_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                                    title="Unduh Dokumen"
                                                >
                                                    <Download size={14} /> Unduh
                                                </a>

                                                <button onClick={() => handleDelete(row.id, row.file_url)} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors" title="Hapus">
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
    );
}