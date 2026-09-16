"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image as ImageIcon, Plus, Trash2, Eye, Loader2, Download, X } from "lucide-react";

export default function PosterPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [judul, setJudul] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // State untuk Modal Preview Poster/Gambar
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => { fetchPoster(); }, []);

    const fetchPoster = async () => {
        setLoading(true);
        const { data: fetchRes, error } = await supabase
            .from("dokumen")
            .select("*")
            .eq("kategori", "POSTER")
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
            const fileName = `poster-${cleanFileName}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('dokumen').upload(fileName, file);
            if (uploadError) throw new Error(uploadError.message);

            const { data: publicUrlData } = supabase.storage.from('dokumen').getPublicUrl(fileName);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";

            const { error: insertError } = await supabase.from("dokumen").insert([{
                judul: judul,
                file_url: publicUrlData.publicUrl,
                kategori: "POSTER",
                ukuran_file: fileSizeMB
            }]);

            if (insertError) throw new Error(insertError.message);

            alert("Poster berhasil diupload!");
            setIsModalOpen(false);
            setJudul(""); setFile(null);
            fetchPoster();
        } catch (error: any) {
            alert("Gagal upload: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!window.confirm("Hapus poster ini?")) return;
        try {
            const fileName = fileUrl.split('/').pop();
            if (fileName) await supabase.storage.from('dokumen').remove([fileName]);

            await supabase.from("dokumen").delete().eq("id", id);
            fetchPoster();
        } catch (error) {
            alert("Gagal menghapus data!");
        }
    };

    const getDownloadFilename = (title: string, url: string) => {
        const ext = url.split('.').pop() || 'jpg';
        const formattedTitle = title.replace(/[^a-zA-Z0-9ก-ฮ]/g, '_');
        return `${formattedTitle}.${ext}`;
    };

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-2"><ImageIcon size={24} /> Poster K3</h1>
                    <p className="text-sm text-slate-500 mt-1">Galeri poster, rambu keselamatan, dan infografis K3.</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger className="bg-[#1E3A8A] hover:bg-[#152C69] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                        <Plus size={16} /> Upload Poster
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white">
                        <DialogHeader><DialogTitle>Upload Poster Baru</DialogTitle></DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600">Judul / Nama Poster</label>
                                <Input placeholder="Contoh: Poster Area Wajib Helm" value={judul} onChange={(e) => setJudul(e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600">File Gambar / PDF</label>
                                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.heic,image/*" onChange={(e) => { if (e.target.files) setFile(e.target.files[0]) }} required />
                                <p className="text-[10px] text-slate-400 mt-1">Format: JPG, PNG, JPEG, HEIC, PDF.</p>
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white mt-2">
                                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Upload Sekarang"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* MODAL POPUP PREVIEW GAMBAR / POSTER */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] p-4 bg-white flex flex-col items-center">
                    <DialogHeader className="w-full border-b pb-2 mb-2">
                        <DialogTitle className="text-base font-bold text-[#1E3A8A] truncate">
                            {previewItem?.judul}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="w-full max-h-[70vh] flex items-center justify-center overflow-auto bg-slate-100 rounded-lg p-2">
                        {previewItem?.file_url?.match(/\.(jpeg|jpg|gif|png|heic|webp)$/i) ? (
                            <img src={previewItem.file_url} alt={previewItem.judul} className="max-w-full max-h-[65vh] object-contain rounded" />
                        ) : (
                            <iframe src={previewItem?.file_url} className="w-full h-[60vh] border-none rounded" title="PDF Preview" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {loading ? (
                <div className="text-center py-12 text-[#1E3A8A] font-bold animate-pulse">Memuat Poster...</div>
            ) : data.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <ImageIcon size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">Belum ada poster yang diupload.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.map((item) => {
                        const isImage = item.file_url.match(/\.(jpeg|jpg|gif|png|heic|webp)$/i) != null;

                        return (
                            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                                <div>
                                    <div className="h-48 bg-slate-100 relative flex items-center justify-center border-b border-slate-100 overflow-hidden">
                                        {isImage ? (
                                            <img src={item.file_url} alt={item.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400">
                                                <Download size={40} className="mb-2" />
                                                <span className="text-xs font-bold uppercase text-slate-500">Document / PDF</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay Aksi Cepat */}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => { setPreviewItem(item); setIsPreviewOpen(true); }}
                                                className="p-3 bg-white text-blue-600 rounded-full hover:scale-110 transition-transform shadow-lg cursor-pointer"
                                                title="Lihat"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <a
                                                href={item.file_url}
                                                download={getDownloadFilename(item.judul, item.file_url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-emerald-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="Unduh"
                                            >
                                                <Download size={18} />
                                            </a>
                                            <button onClick={() => handleDelete(item.id, item.file_url)} className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg" title="Hapus">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-bold text-[#1E3A8A] line-clamp-1">{item.judul}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{item.ukuran_file || '-'}</p>
                                    </div>
                                </div>

                                {/* Tombol Aksi di Bawah Card */}
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={() => { setPreviewItem(item); setIsPreviewOpen(true); }}
                                        className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-bold text-center transition-colors cursor-pointer"
                                    >
                                        Lihat
                                    </button>
                                    <a
                                        href={item.file_url}
                                        download={getDownloadFilename(item.judul, item.file_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-xs font-bold text-center transition-colors"
                                    >
                                        Unduh
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}