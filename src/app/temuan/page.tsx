"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertOctagon,
  Clock,
  Search,
  PenLine,
  Camera,
  ArrowLeft,
  History,
  CheckCircle2,
  Loader2,
  Pencil,
  Trash2,
  X,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Images,
  Eye,
} from "lucide-react";
import { parseFotoUrls, formatFotoUrlsForStorage } from "@/lib/fotoUtils";

export default function ReviewTemuanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // State Lightbox Modal Gambar
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // State untuk navigasi tampilan (List vs Detail)
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [detailData, setDetailData] = useState<any>(null);

  // State Loading Screen Transisi & Submit
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk form Tindak Lanjut Cepat PIC
  const [isTindakLanjutOpen, setIsTindakLanjutOpen] = useState(false);
  const [tindakanText, setTindakanText] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("On Proses");
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState<File | null>(null);

  // --- STATE FITUR EDIT TEMUAN ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    no_pelaporan: "",
    temuan: "",
    lokasi: "",
    nama_proyek: "",
    kategori: "UNSAFE ACTION",
    pic: "",
    tindakan_penanggulangan: "",
    tanggal_temuan: "",
    cut_off_date: "",
    risk_level: "Rendah",
    status: "Open",
    kategori_temuan: "Standard Working",
  });
  const [editKategoriOption, setEditKategoriOption] = useState("UNSAFE ACTION");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<string[]>([]);
  const [newEditFotoFiles, setNewEditFotoFiles] = useState<File[]>([]);
  const [existingFotoTindakLanjut, setExistingFotoTindakLanjut] = useState<string>("");
  const [newFotoTindakLanjut, setNewFotoTindakLanjut] = useState<File | null>(null);

  const lokasiOptions = [
    "Area 1 Jakarta",
    "Area 2 Bandung",
    "Area 3 Cirebon",
    "Area 4 Semarang",
    "Area 5 Purwokerto",
    "Area 6 Yogyakarta",
    "Area 7 Madiun",
    "Area 8 Surabaya",
    "Area 9 Jember",
    "Area 10 Medan",
    "Area 11 Padang",
    "Area 12 Palembang",
    "Area 13 Tanjung Karang",
    "Kantor Pusat",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard navigation untuk lightbox modal
  useEffect(() => {
    if (!isImageModalOpen || modalImages.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setModalActiveIndex((prev) => (prev > 0 ? prev - 1 : modalImages.length - 1));
      } else if (e.key === "ArrowRight") {
        setModalActiveIndex((prev) => (prev < modalImages.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen, modalImages]);

  const openImageModal = (images: string[], index: number = 0) => {
    setModalImages(images);
    setModalActiveIndex(index);
    setIsImageModalOpen(true);
  };

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
    }, 600);
  };

  // Fungsi Kembali ke List dengan Loading Transisi
  const handleBackToList = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode("list");
      setIsTransitioning(false);
    }, 500);
  };

  // Fungsi Simpan Tindak Lanjut Singkat
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

        await supabase.storage.from("inspeksi-photos").upload(fileName, compressedFile);
        const { data: publicUrlData } = supabase.storage.from("inspeksi-photos").getPublicUrl(fileName);
        uploadedUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("inspeksi")
        .update({
          tindakan_penanggulangan: tindakanText,
          status: statusUpdate,
          foto_tindak_lanjut: uploadedUrl,
        })
        .eq("id", detailData.id);

      if (error) throw error;

      alert("Tindak lanjut & foto bukti berhasil diperbarui!");
      await fetchData();

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

  // --- LOGIKA EDIT TEMUAN ---
  const handleOpenEdit = (e: React.MouseEvent | null, row: any) => {
    if (e) e.stopPropagation();
    setEditingId(row.id);
    setEditFormData({
      no_pelaporan: row.no_pelaporan || "",
      temuan: row.temuan || "",
      lokasi: row.lokasi || "",
      nama_proyek: row.nama_proyek || "",
      kategori: row.kategori || "UNSAFE ACTION",
      pic: row.pic || "",
      tindakan_penanggulangan: row.tindakan_penanggulangan || "",
      tanggal_temuan: row.tanggal_temuan || "",
      cut_off_date: row.cut_off_date || "",
      risk_level: row.risk_level || "Rendah",
      status: row.status || "Open",
      kategori_temuan: row.kategori_temuan || "Standard Working",
    });

    if (row.kategori === "UNSAFE ACTION" || row.kategori === "UNSAFE CONDITION") {
      setEditKategoriOption(row.kategori);
    } else {
      setEditKategoriOption("Lainnya");
    }

    setExistingPhotos(parseFotoUrls(row.foto_url));
    setDeletedPhotos([]);
    setNewEditFotoFiles([]);
    setExistingFotoTindakLanjut(row.foto_tindak_lanjut || "");
    setNewFotoTindakLanjut(null);
    setIsEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditKategoriChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setEditKategoriOption(value);
    if (value !== "Lainnya") {
      setEditFormData({ ...editFormData, kategori: value });
    } else {
      setEditFormData({ ...editFormData, kategori: "" });
    }
  };

  const handleRemoveExistingPhoto = (urlToRemove: string) => {
    setExistingPhotos((prev) => prev.filter((u) => u !== urlToRemove));
    setDeletedPhotos((prev) => [...prev, urlToRemove]);
  };

  const handleNewEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setNewEditFotoFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveNewEditFile = (indexToRemove: number) => {
    setNewEditFotoFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSubmittingEdit(true);

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
      const newlyUploadedUrls: string[] = [];

      // 1. Upload foto temuan baru (Before)
      for (const file of newEditFotoFiles) {
        const compressedFile = await imageCompression(file, options);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage.from("inspeksi-photos").upload(fileName, compressedFile);
        if (uploadError) throw new Error("Gagal upload foto baru: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from("inspeksi-photos").getPublicUrl(fileName);
        newlyUploadedUrls.push(publicUrlData.publicUrl);
      }

      // 2. Upload foto tindak lanjut baru jika ada (After)
      let finalFotoTindakLanjut = existingFotoTindakLanjut;
      if (newFotoTindakLanjut) {
        const compressedFile = await imageCompression(newFotoTindakLanjut, options);
        const fileName = `tindaklanjut-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage.from("inspeksi-photos").upload(fileName, compressedFile);
        if (uploadError) throw new Error("Gagal upload foto perbaikan: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from("inspeksi-photos").getPublicUrl(fileName);
        finalFotoTindakLanjut = publicUrlData.publicUrl;
      }

      const finalPhotos = [...existingPhotos, ...newlyUploadedUrls];
      const finalFotoUrl = formatFotoUrlsForStorage(finalPhotos);

      // 3. Simpan perubahan ke database
      const { error: updateError } = await supabase
        .from("inspeksi")
        .update({
          ...editFormData,
          foto_url: finalFotoUrl,
          foto_tindak_lanjut: finalFotoTindakLanjut,
        })
        .eq("id", editingId);

      if (updateError) throw new Error("Gagal menyimpan perubahan: " + updateError.message);

      // 4. Hapus foto dari Supabase storage jika dihapus pengguna
      for (const delUrl of deletedPhotos) {
        const fileName = delUrl.split("/").pop();
        if (fileName) {
          try {
            await supabase.storage.from("inspeksi-photos").remove([fileName]);
          } catch (storageErr) {
            console.warn("Gagal menghapus file storage lama:", storageErr);
          }
        }
      }

      alert("Data temuan berhasil diperbarui!");
      setIsEditDialogOpen(false);
      setEditingId(null);
      setNewEditFotoFiles([]);
      setDeletedPhotos([]);
      setNewFotoTindakLanjut(null);
      await fetchData();
    } catch (error: any) {
      alert("TERJADI KESALAHAN SAAT UPDATE:\n" + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- LOGIKA HAPUS TEMUAN ---
  const handleDelete = async (e: React.MouseEvent | null, row: any) => {
    if (e) e.stopPropagation();
    const isConfirm = window.confirm(
      `Apakah Anda yakin ingin menghapus data temuan "${row.no_pelaporan || row.temuan}"?`
    );
    if (!isConfirm) return;

    try {
      setIsSubmitting(true);

      // Hapus foto temuan dari storage
      const urls = parseFotoUrls(row.foto_url);
      for (const url of urls) {
        const fileName = url.split("/").pop();
        if (fileName) {
          try {
            await supabase.storage.from("inspeksi-photos").remove([fileName]);
          } catch (storageErr) {
            console.warn("Gagal menghapus file foto temuan:", storageErr);
          }
        }
      }

      // Hapus foto tindak lanjut dari storage jika ada
      if (row.foto_tindak_lanjut) {
        const fileName = row.foto_tindak_lanjut.split("/").pop();
        if (fileName) {
          try {
            await supabase.storage.from("inspeksi-photos").remove([fileName]);
          } catch (storageErr) {
            console.warn("Gagal menghapus foto tindak lanjut:", storageErr);
          }
        }
      }

      const { error: dbError } = await supabase.from("inspeksi").delete().eq("id", row.id);
      if (dbError) throw new Error(dbError.message);

      alert("Data temuan berhasil dihapus!");

      if (viewMode === "detail") {
        setViewMode("list");
        setDetailData(null);
      }
      await fetchData();
    } catch (error: any) {
      alert("Gagal menghapus data temuan:\n" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter((item) => {
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
              {isSubmitting ? "Memproses Data..." : "Memuat Halaman..."}
            </p>
          </div>
        </div>
      )}

      {/* --- MODAL GALLERY / LIGHTBOX PERBESAR FOTO --- */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl p-4 bg-slate-950/95 text-white border-slate-800 shadow-2xl rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/80">
            <DialogTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Images size={16} className="text-blue-400" />
              <span>
                Perbesar Bukti Foto{" "}
                {modalImages.length > 1 && (
                  <span className="text-xs text-blue-300 font-normal">
                    (Foto {modalActiveIndex + 1} dari {modalImages.length})
                  </span>
                )}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative flex items-center justify-center my-3 min-h-[250px] max-h-[72vh]">
            {modalImages.length > 0 && modalImages[modalActiveIndex] && (
              <img
                src={modalImages[modalActiveIndex]}
                alt={`Bukti Foto ${modalActiveIndex + 1}`}
                className="w-auto h-auto max-w-full max-h-[72vh] object-contain rounded-lg shadow-lg select-none"
              />
            )}

            {/* Navigasi Kiri & Kanan */}
            {modalImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalActiveIndex((prev) => (prev > 0 ? prev - 1 : modalImages.length - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all shadow-md backdrop-blur-sm hover:scale-110 cursor-pointer"
                  title="Foto Sebelumnya"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalActiveIndex((prev) => (prev < modalImages.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all shadow-md backdrop-blur-sm hover:scale-110 cursor-pointer"
                  title="Foto Selanjutnya"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail carousel strip */}
          {modalImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto py-1">
              {modalImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setModalActiveIndex(idx)}
                  className={`relative rounded-md overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                    idx === modalActiveIndex
                      ? "border-blue-500 scale-105 shadow-md shadow-blue-500/30"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-slate-500"
                  }`}
                >
                  <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-14 h-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL EDIT TEMUAN --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="text-blue-600" size={18} /> Edit Data Temuan Safety
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Temuan / Bukti Pelanggaran</label>
              <Textarea
                placeholder="Deskripsikan temuan..."
                name="temuan"
                value={editFormData.temuan}
                onChange={handleEditChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">No. Pelaporan</label>
                <Input
                  placeholder="Ketik No. Pelaporan..."
                  name="no_pelaporan"
                  value={editFormData.no_pelaporan}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Lokasi (Area)</label>
                <select
                  name="lokasi"
                  value={editFormData.lokasi}
                  onChange={handleEditChange}
                  className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white focus:border-blue-500 outline-none"
                  required
                >
                  <option value="" disabled>
                    Pilih Area...
                  </option>
                  {lokasiOptions.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nama Proyek</label>
                <Input
                  placeholder="Detail Nama Proyek"
                  name="nama_proyek"
                  value={editFormData.nama_proyek}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Kategori Bahaya</label>
                <select
                  value={editKategoriOption}
                  onChange={handleEditKategoriChange}
                  className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white focus:border-blue-500 outline-none"
                >
                  <option value="UNSAFE ACTION">Unsafe Action</option>
                  <option value="UNSAFE CONDITION">Unsafe Condition</option>
                  <option value="Lainnya">Lainnya (Ketik Manual)</option>
                </select>
                {editKategoriOption === "Lainnya" && (
                  <Input
                    placeholder="Ketik jenis temuan..."
                    name="kategori"
                    value={editFormData.kategori}
                    onChange={handleEditChange}
                    className="mt-2"
                    required
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">PIC (Penanggung Jawab)</label>
                <Input
                  placeholder="Nama / Vendor"
                  name="pic"
                  value={editFormData.pic}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Tgl Temuan</label>
                <Input
                  type="date"
                  name="tanggal_temuan"
                  value={editFormData.tanggal_temuan}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Batas Waktu (Cut Off)</label>
                <Input
                  type="date"
                  name="cut_off_date"
                  value={editFormData.cut_off_date}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Tingkat Risiko</label>
                <select
                  name="risk_level"
                  value={editFormData.risk_level}
                  onChange={handleEditChange}
                  className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white"
                >
                  <option value="Rendah">Rendah (Low)</option>
                  <option value="Sedang">Sedang (Medium)</option>
                  <option value="Tinggi">Tinggi (High)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white font-medium"
                >
                  <option value="Open">Open</option>
                  <option value="On Proses">On Proses</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Kategori Pekerjaan</label>
                <Input
                  placeholder="Contoh: Bekerja di Ketinggian"
                  name="kategori_temuan"
                  value={editFormData.kategori_temuan}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Tindakan Penanggulangan</label>
                <Textarea
                  placeholder="Tindakan penanggulangan atau arahan perbaikan..."
                  name="tindakan_penanggulangan"
                  value={editFormData.tindakan_penanggulangan}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            {/* --- MANAJEMEN FOTO HAZARD (BEFORE) --- */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block">
                Foto Hazard / Bukti Temuan (Before)
              </label>

              {existingPhotos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-slate-500">Foto Tersimpan ({existingPhotos.length}):</p>
                    <span className="text-[10px] text-slate-400">Klik ikon silang untuk menghapus</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {existingPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-xs"
                      >
                        <img src={url} alt={`Existing ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingPhoto(url)}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                            title="Hapus foto ini"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                          Before
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newEditFotoFiles.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-blue-600 mb-2">
                    Foto Baru Ditambahkan ({newEditFotoFiles.length}):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {newEditFotoFiles.map((file, idx) => {
                      const objectUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden border border-blue-300 bg-blue-50/50 aspect-video shadow-xs"
                        >
                          <img src={objectUrl} alt={`New ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveNewEditFile(idx)}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                              title="Batalkan foto ini"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                            Baru
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 transition-all rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center gap-1 relative group">
                <UploadCloud className="text-slate-400 group-hover:text-blue-500 transition-colors" size={22} />
                <span className="text-xs font-semibold text-slate-700">Tambah Foto Hazard (Before)</span>
                <span className="text-[10px] text-slate-400">Pilih 1 atau beberapa foto sekaligus</span>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewEditFilesChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            {/* --- MANAJEMEN FOTO PERBAIKAN (AFTER) --- */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block">
                Foto Perbaikan / Tindak Lanjut (After)
              </label>

              {existingFotoTindakLanjut && !newFotoTindakLanjut && (
                <div className="relative group w-fit rounded-lg overflow-hidden border border-emerald-200 mb-2">
                  <img src={existingFotoTindakLanjut} alt="Foto Perbaikan" className="h-24 w-auto object-cover" />
                  <div className="absolute top-1 right-1">
                    <button
                      type="button"
                      onClick={() => setExistingFotoTindakLanjut("")}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                      title="Hapus foto perbaikan"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                    After
                  </div>
                </div>
              )}

              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewFotoTindakLanjut(e.target.files[0]);
                  }
                }}
                className="cursor-pointer bg-slate-50 border-slate-200"
              />
              <p className="text-[10px] text-slate-400">Pilih foto bukti perbaikan lapangan jika sudah ditindaklanjuti.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="w-1/3 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
              >
                {isSubmittingEdit ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan Perubahan...
                  </span>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* TAMPILAN DETAIL                            */}
      {/* ========================================== */}
      {viewMode === "detail" && detailData ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 cursor-pointer"
                title="Kembali ke Tabel"
              >
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

            {/* Tombol Aksi di Layar Detail: Edit & Hapus */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(null, detailData)}
                className="h-9 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil size={14} />
                <span>Edit Temuan</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(null, detailData)}
                className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 size={14} />
                <span>Hapus</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h2 className="font-bold text-slate-800">Ticket Hazard</h2>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${
                    detailData.status === "Open"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : detailData.status === "On Proses"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {detailData.status}
                </span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">No. Pelaporan</span>
                  <span className="text-sm font-bold text-slate-800 col-span-2">
                    : {detailData.no_pelaporan || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Tgl Temuan</span>
                  <span className="text-sm font-medium text-slate-800 col-span-2">
                    : {detailData.tanggal_temuan || "-"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500 col-span-1">Batas Waktu</span>
                  <span className="text-sm font-medium text-red-600 col-span-2">
                    : {detailData.cut_off_date || "-"}
                  </span>
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
                    :{" "}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        detailData.risk_level === "Tinggi"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : detailData.risk_level === "Sedang"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
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
                  <span className="text-sm font-medium text-slate-800 col-span-2 leading-relaxed">
                    : {detailData.temuan || "-"}
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-500 block mb-2">Foto Hazard (Before)</span>
                  {(() => {
                    const temuanUrls = parseFotoUrls(detailData.foto_url);
                    if (temuanUrls.length === 0) {
                      return (
                        <div className="w-full h-32 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                          Tidak ada foto
                        </div>
                      );
                    }
                    if (temuanUrls.length === 1) {
                      return (
                        <img
                          src={temuanUrls[0]}
                          alt="Foto Temuan"
                          className="w-full max-h-48 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90"
                          onClick={() => openImageModal(temuanUrls, 0)}
                        />
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {temuanUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Foto Temuan ${i + 1}`}
                            className="w-full h-28 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openImageModal(temuanUrls, i)}
                          />
                        ))}
                      </div>
                    );
                  })()}
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
                          onClick={() => openImageModal([detailData.foto_tindak_lanjut], 0)}
                        />
                        <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                          TERSIMPAN
                        </div>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) setFotoTindakLanjut(e.target.files[0]);
                      }}
                      className="cursor-pointer bg-slate-50 border-slate-200"
                    />
                    <p className="text-[10px] text-slate-400">Bisa foto langsung dengan kamera atau pilih dari galeri HP.</p>
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
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-bold cursor-pointer"
                    >
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
                      <p className="text-[11px] text-slate-500">
                        Tindakan perbaikan telah diinput dan status diperbarui menjadi{" "}
                        <span className="font-bold">{detailData.status}</span>.
                      </p>
                    </div>
                  )}

                  <div className="relative pl-6">
                    <span className="absolute -left-2.5 top-1 bg-white border-2 border-blue-400 rounded-full w-5 h-5 flex items-center justify-center">
                      <History size={12} className="text-blue-400" />
                    </span>
                    <h3 className="text-xs font-bold text-slate-700 mb-0.5">{detailData.tanggal_temuan}</h3>
                    <p className="text-[11px] text-slate-500">
                      Laporan bahaya (Hazard) dibuat dan ditugaskan kepada PIC <b>{detailData.pic}</b> dengan batas waktu{" "}
                      <b>{detailData.cut_off_date}</b>.
                    </p>
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
          {/* Modal Tindak Lanjut Singkat */}
          <Dialog open={isTindakLanjutOpen} onOpenChange={setIsTindakLanjutOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[550px] p-6 rounded-xl bg-white max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Form Tindak Lanjut PIC</DialogTitle>
              </DialogHeader>

              {detailData && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 mt-2 text-sm flex gap-3">
                  {(() => {
                    const firstUrl = parseFotoUrls(detailData.foto_url)[0];
                    return firstUrl ? (
                      <img src={firstUrl} alt="Temuan" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded-md flex items-center justify-center text-slate-400">
                        <Camera size={20} />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="font-semibold text-slate-800 mb-1 leading-tight">{detailData.temuan}</div>
                    <div className="text-xs text-slate-500">Lokasi: {detailData.lokasi}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Target Selesai: <span className="text-red-500 font-medium">{detailData.cut_off_date}</span>
                    </div>
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
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) setFotoTindakLanjut(e.target.files[0]);
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">Bisa foto langsung dengan kamera atau pilih dari galeri HP.</p>
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

                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4 h-10 cursor-pointer">
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <Input
                  type="text"
                  placeholder="Cari No. Laporan, PIC, dll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-full bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto overflow-x-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter("Semua")}
                  className={`px-4 cursor-pointer ${filter === "Semua" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-500"}`}
                >
                  Semua
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter("Open")}
                  className={`px-4 cursor-pointer ${filter === "Open" ? "bg-red-50 text-red-700 font-bold shadow-sm" : "text-slate-500"}`}
                >
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter("On Proses")}
                  className={`px-4 cursor-pointer ${filter === "On Proses" ? "bg-orange-50 text-orange-700 font-bold shadow-sm" : "text-slate-500"}`}
                >
                  On Proses
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter("Closed")}
                  className={`px-4 cursor-pointer ${filter === "Closed" ? "bg-emerald-50 text-emerald-700 font-bold shadow-sm" : "text-slate-500"}`}
                >
                  Closed
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <Table className="min-w-[1300px] text-sm">
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[150px] font-bold text-slate-700">No. Laporan & Waktu</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 text-center">
                    Foto Temuan<br />
                    <span className="text-[10px] font-normal text-slate-500">(Before)</span>
                  </TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 text-center">
                    Foto Perbaikan<br />
                    <span className="text-[10px] font-normal text-slate-500">(After)</span>
                  </TableHead>
                  <TableHead className="min-w-[200px] max-w-[300px] font-bold text-slate-700">Deskripsi & Lokasi</TableHead>
                  <TableHead className="min-w-[200px] max-w-[300px] font-bold text-slate-700">Tindakan Penanggulangan</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 text-center">PIC & Risiko</TableHead>
                  <TableHead className="w-[100px] font-bold text-slate-700 text-center">Status</TableHead>
                  <TableHead className="w-[160px] font-bold text-slate-700 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span>Memuat data temuan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                      Tidak ada data yang cocok dengan pencarian/filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => {
                    const beforeUrls = parseFotoUrls(row.foto_url);

                    return (
                      <TableRow
                        key={row.id}
                        className="transition-all duration-200 border-b border-slate-100 cursor-pointer hover:bg-blue-50/60"
                        onClick={() => handleOpenDetailView(row)}
                        title="Klik baris untuk melihat Detail Laporan"
                      >
                        <TableCell className="align-top py-4">
                          <div className="font-bold text-slate-800 text-xs mb-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                            {row.no_pelaporan || "-"}
                          </div>
                          <div className="font-medium text-slate-600">{row.tanggal_temuan}</div>
                          <div className="text-[10px] text-red-500 mt-1 flex items-center gap-1 font-semibold">
                            <Clock size={12} /> {row.cut_off_date}
                          </div>
                        </TableCell>

                        {/* Foto Temuan Before */}
                        <TableCell className="align-top text-center py-4">
                          {beforeUrls.length === 0 ? (
                            <div className="w-full h-16 bg-slate-50 border border-slate-200 border-dashed rounded-md flex items-center justify-center text-[10px] text-slate-400">
                              Tak Ada
                            </div>
                          ) : (
                            <div
                              className="relative group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal(beforeUrls, 0);
                              }}
                              title="Klik untuk perbesar"
                            >
                              <img
                                src={beforeUrls[0]}
                                alt="Temuan"
                                className="w-full h-16 object-cover rounded-md border border-slate-200 shadow-sm hover:opacity-80 transition-opacity"
                              />
                              {beforeUrls.length > 1 && (
                                <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded font-medium">
                                  +{beforeUrls.length - 1}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Foto Perbaikan After */}
                        <TableCell className="align-top text-center py-4">
                          {row.foto_tindak_lanjut && row.foto_tindak_lanjut.trim() !== "" ? (
                            <img
                              src={row.foto_tindak_lanjut}
                              alt="Perbaikan"
                              className="w-full h-16 object-cover rounded-md border border-emerald-300 shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal([row.foto_tindak_lanjut], 0);
                              }}
                              title="Klik untuk perbesar"
                            />
                          ) : (
                            <div className="w-full h-16 bg-slate-50 border border-slate-200 border-dashed rounded-md flex items-center justify-center text-[10px] text-slate-400 italic">
                              Belum Ada
                            </div>
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.risk_level === "Tinggi"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : row.risk_level === "Sedang"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : row.risk_level === "Rendah"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {row.risk_level}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-center py-4">
                          {row.status === "Open" ? (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                              OPEN
                            </span>
                          ) : row.status === "On Proses" ? (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              ON PROSES
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              CLOSED
                            </span>
                          )}
                        </TableCell>

                        {/* --- KOLOM AKSI: TINDAK LANJUT, EDIT & HAPUS --- */}
                        <TableCell className="align-top text-center py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5 items-center max-w-[150px] mx-auto">
                            <Button
                              onClick={(e) => openTindakLanjutModal(e, row)}
                              size="sm"
                              className={`w-full text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer h-7 ${
                                row.status === "Closed"
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              <PenLine size={12} />
                              <span>{row.status === "Closed" ? "Bukti" : "Tindak Lanjut"}</span>
                            </Button>

                            <div className="flex items-center justify-center gap-1.5 w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleOpenEdit(e, row)}
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 flex-1 flex items-center justify-center gap-1 cursor-pointer"
                                title="Edit Data Temuan"
                              >
                                <Pencil size={12} />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleDelete(e, row)}
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-1 flex items-center justify-center gap-1 cursor-pointer"
                                title="Hapus Temuan"
                              >
                                <Trash2 size={12} />
                                <span>Hapus</span>
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}