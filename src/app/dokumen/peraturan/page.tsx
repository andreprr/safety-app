"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink, ShieldCheck, Plus, Trash2, Download, Eye, Loader2, Scale } from "lucide-react";

export default function PeraturanPage() {
    const { profile } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [judul, setJudul] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // State untuk Modal Preview
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => { fetchPeraturan(); }, []);

    const fetchPeraturan = async () => {
        setLoading(true);
        const { data: fetchRes, error } = await supabase
            .from("dokumen")
            .select("*")
            .eq("kategori", "PERATURAN")
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
            const fileName = `peraturan-${cleanFileName}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('dokumen').upload(fileName, file);
            if (uploadError) throw new Error(uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('dokumen').getPublicUrl(fileName);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";

            const { error: insertError } = await supabase.from("dokumen").insert([{
                judul: judul,
                file_url: publicUrlData.publicUrl,
                kategori: "PERATURAN",
                ukuran_file: fileSizeMB
            }]);

            if (insertError) throw new Error(insertError.message);

            alert("Peraturan berhasil diupload!");
            setIsModalOpen(false);
            setJudul(""); setFile(null);
            fetchPeraturan();
        } catch (error: any) {
            alert("Gagal upload: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (profile?.role !== 'admin') {
            return alert("Akses ditolak! Hanya Admin yang berhak menghapus dokumen.");
        }

        if (!window.confirm("Hapus dokumen peraturan ini?")) return;
        try {
            const fileName = fileUrl.split('/').pop();
            if (fileName) await supabase.storage.from('dokumen').remove([fileName]);

            await supabase.from("dokumen").delete().eq("id", id);
            fetchPeraturan();
        } catch (error) {
            alert("Gagal menghapus data!");
        }
    };

    const getDownloadFilename = (title: string, url: string) => {
        const ext = url.split('.').pop() || 'pdf';
        const formattedTitle = title.replace(/[^a-zA-Z0-9ก-ฮ]/g, '_');
        return `${formattedTitle}.${ext}`;
    };

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-sans">

            {/* BAGIAN 1: BANNER KEMNAKER */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1E3A8A] to-[#F97316]"></div>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-[#1E3A8A]" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#1E3A8A] mb-3">Portal Peraturan Perundangan K3 Nasional</h1>
                <p className="text-slate-600 mb-6 max-w-2xl mx-auto text-sm">
                    Akses pangkalan data peraturan perundangan terkait Keselamatan dan Kesehatan Kerja (K3) yang bersumber langsung dari <b>Kementerian Ketenagakerjaan Republik Indonesia</b>.
                </p>
                <a
                    href="https://temank3.kemnaker.go.id/page/perundangan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white px-5 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow"
                >
                    <ExternalLink size={20} /> Buka Portal Teman K3
                </a>
            </div>

            {/* BAGIAN 2: HEADER TABEL PERATURAN INTERNAL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-[#1E3A8A] flex items-center gap-2">
                        <Scale size={22} className="text-[#F97316]" /> Dokumen Peraturan Internal
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Arsip SK, kebijakan, dan peraturan internal perusahaan.</p>
                </div>

                {/* HANYA ADMIN YANG BISA UPLOAD */}
                {profile?.role === 'admin' && (
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                            <Plus size={16} /> Tambah Peraturan
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-white">
                            <DialogHeader><DialogTitle>Upload Dokumen Peraturan</DialogTitle></DialogHeader>
                            <form onSubmit={handleUpload} className="space-y-4 mt-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600">Judul Dokumen / Nama Peraturan</label>
                                    <Input placeholder="Contoh: SK Direksi No 123..." value={judul} onChange={(e) => setJudul(e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600">File Dokumen (PDF / Word)</label>
                                    <Input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword" onChange={(e) => { if (e.target.files) setFile(e.target.files[0]) }} required />
                                </div>
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white mt-2">
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Simpan Peraturan"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
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

            {/* TABEL DATA PERATURAN */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-[#1E3A8A]">
                        <TableRow>
                            <TableHead className="w-[60px] text-white font-bold text-center">No</TableHead>
                            <TableHead className="text-white font-bold">Judul Peraturan</TableHead>
                            <TableHead className="text-white font-bold text-center w-[150px]">Ukuran File</TableHead>
                            <TableHead className="text-white font-bold text-center w-[200px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Memuat...</TableCell></TableRow> :
                            data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Belum ada dokumen peraturan internal.</TableCell></TableRow> :
                                data.map((row, idx) => (
                                    <TableRow key={row.id} className="hover:bg-slate-50 border-b border-slate-100">
                                        <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                        <TableCell className="font-semibold text-slate-700 flex items-center gap-2">
                                            <FileText size={16} className="text-[#1E3A8A]" /> {row.judul}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-500 text-xs">{row.ukuran_file || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => { setPreviewItem(row); setIsPreviewOpen(true); }}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold"
                                                    title="Lihat Dokumen"
                                                >
                                                    <Eye size={14} /> Lihat
                                                </button>

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

                                                {/* TOMBOL HAPUS HANYA UNTUK ADMIN */}
                                                {profile?.role === 'admin' && (
                                                    <button
                                                        onClick={() => handleDelete(row.id, row.file_url)}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
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