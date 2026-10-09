"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ExcelJS from "exceljs";
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus,
  Printer,
  FileText,
  Settings,
  FileSpreadsheet,
  Search,
  Loader2,
  Trash2,
  Pencil,
  X,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Images,
  Eye
} from "lucide-react";
import { parseFotoUrls, formatFotoUrlsForStorage } from "@/lib/fotoUtils";

// --- FUNGSI FORMAT TANGGAL ---
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

// --- CSS KHUSUS PRINT ---
const printStyles = `
  @media print {
    @page {
      size: A4 landscape !important;
      margin: 0mm !important; 
    }

    .inspeksi-print-container {
      width: 100% !important;
      margin: 0 !important;
      padding: 10mm 12mm !important; 
      background-color: #ffffff !important;
      zoom: 68% !important; 
      box-sizing: border-box !important;
    }

    .no-print, .col-aksi { display: none !important; }

    .inspeksi-table-wrapper {
      width: 100% !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .inspeksi-table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
    }

    .inspeksi-table th,
    .inspeksi-table td {
      border: 1px solid #000 !important;
      padding: 4px 4px !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      font-size: 8pt !important;
      color: #000 !important;
      min-width: 0 !important; 
    }

    th.inspeksi-kop-cell {
      padding: 0 !important;
      border-bottom: 1px solid #000 !important;
      vertical-align: middle !important;
    }

    .inspeksi-col-header th {
      background-color: #dbeafe !important;
      font-weight: bold !important;
      text-align: center !important;
      border-bottom: 1px solid #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    table.inspeksi-table {
      table-layout: fixed !important;
      width: 100% !important;
    }

    /* ALOKASI TOTAL 100% */
    th.col-no, td.col-no                   { width: 3% !important; padding: 2px !important; text-align: center !important; overflow: hidden !important; }
    th.col-no-laporan, td.col-no-laporan   { width: 8% !important; text-align: center !important; }
    th.col-tgl, td.col-tgl                 { width: 6% !important; text-align: center !important; }
    th.col-foto, td.col-foto               { width: 9% !important; text-align: center !important; }
    th.col-temuan, td.col-temuan           { width: 20% !important; }
    th.col-lokasi, td.col-lokasi           { width: 6% !important; }
    th.col-kategori, td.col-kategori       { width: 6% !important; text-align: center !important; }
    th.col-tindakan, td.col-tindakan       { width: 20% !important; } 
    th.col-batas, td.col-batas             { width: 6% !important; text-align: center !important; }
    th.col-risiko, td.col-risiko           { width: 5% !important; text-align: center !important; }
    th.col-status, td.col-status           { width: 4% !important; text-align: center !important; }
    th.col-jenis, td.col-jenis             { width: 5% !important; text-align: center !important; }
    th.col-pic, td.col-pic                 { width: 2% !important; text-align: center !important; }

    .reset-print-text {
      min-width: 0 !important;
      max-width: none !important;
      white-space: normal !important;
      word-wrap: break-word !important;
      -webkit-line-clamp: unset !important;
    }

    .col-foto img {
      width: 100% !important;
      height: 45px !important;
      object-fit: cover !important;
      display: block !important;
    }

    .col-foto .print-photos-grid {
      display: flex !important;
      flex-direction: row !important;
      gap: 2px !important;
      justify-content: center !important;
      align-items: center !important;
    }

    .col-foto .print-photos-grid img {
      width: 48% !important;
      height: 40px !important;
      object-fit: cover !important;
      display: block !important;
    }

    .badge-kategori, .badge-risiko {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      white-space: normal !important; 
      font-size: 6.5pt !important;
      line-height: 1.1 !important;
      padding: 3px 1px !important;
      text-align: center !important;
      border: 0.5px solid #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

export default function InspeksiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // --- STATE UPLOAD BANYAK GAMBAR (TAMBAH) ---
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);

  // --- STATE FITUR EDIT ---
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

  const [searchQuery, setSearchQuery] = useState("");

  // --- STATE GALLERY / LIGHTBOX MODAL ---
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [kategoriOption, setKategoriOption] = useState("UNSAFE ACTION");

  const [headerData, setHeaderData] = useState({
    nama_perusahaan: "",
    nama_formulir: "",
    no_formulir: "",
    revisi: "",
    tmt: "",
    halaman: "",
    tanggal_laporan: "",
  });

  const [formData, setFormData] = useState({
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
    fetchHeader();
    fetchData();
  }, []);

  // Keyboard navigation untuk lightbox
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

  const fetchHeader = async () => {
    try {
      const { data: hData } = await supabase.from("inspeksi_header").select("*").eq("id", 1).single();
      if (hData) setHeaderData(hData);
    } catch (error) {}
  };

  const fetchData = async () => {
    try {
      const { data: inspeksiData } = await supabase.from("inspeksi").select("*").order("created_at", { ascending: false });
      setData(inspeksiData || []);
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; extension: "jpeg" | "png" } | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = blob.type.toLowerCase();
      const extension: "jpeg" | "png" = type.includes("png") ? "png" : "jpeg";

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result || !result.includes(",")) {
            resolve(null);
            return;
          }
          const base64 = result.split(",")[1];
          resolve({ base64, extension });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Gagal download gambar untuk Excel:", err);
      return null;
    }
  };

  const exportToExcel = async () => {
    if (data.length === 0) {
      alert("Tidak ada data inspeksi untuk diekspor.");
      return;
    }

    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SRI";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Data_Inspeksi", {
        views: [{ showGridLines: true }],
      });

      worksheet.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "No. Pelaporan", key: "no_pelaporan", width: 16 },
        { header: "Tanggal Temuan", key: "tanggal_temuan", width: 16 },
        { header: "Bukti Foto", key: "foto", width: 24 },
        { header: "Temuan / Pelanggaran", key: "temuan", width: 36 },
        { header: "Area", key: "lokasi", width: 18 },
        { header: "Nama Proyek", key: "nama_proyek", width: 22 },
        { header: "Kategori", key: "kategori", width: 18 },
        { header: "Tindakan Penanggulangan", key: "tindakan", width: 36 },
        { header: "Batas Waktu", key: "batas_waktu", width: 16 },
        { header: "Risk Level", key: "risk_level", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Kategori Temuan", key: "kategori_temuan", width: 22 },
        { header: "PIC", key: "pic", width: 16 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "medium", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      // Fetch gambar untuk masing-masing baris (hingga 2 gambar agar muat di kolom)
      const allRowImages = await Promise.all(
        data.map(async (row) => {
          const urls = parseFotoUrls(row.foto_url);
          if (urls.length === 0) return [];
          const fetched = await Promise.all(urls.slice(0, 2).map((u) => fetchImageAsBase64(u)));
          return fetched.filter((img): img is { base64: string; extension: "jpeg" | "png" } => img !== null);
        })
      );

      for (let index = 0; index < data.length; index++) {
        const rowData = data[index];
        const imgList = allRowImages[index];
        const rowUrls = parseFotoUrls(rowData.foto_url);
        const rowNumber = index + 2;

        let fotoText = "Tanpa Foto";
        if (rowUrls.length > 0) {
          if (imgList.length > 0) {
            fotoText = rowUrls.length > 2 ? `+${rowUrls.length - 2} foto lain` : "";
          } else {
            fotoText = "Foto Gagal Dimuat";
          }
        }

        const row = worksheet.addRow({
          no: index + 1,
          no_pelaporan: rowData.no_pelaporan || "-",
          tanggal_temuan: formatDate(rowData.tanggal_temuan),
          foto: fotoText,
          temuan: rowData.temuan || "-",
          lokasi: rowData.lokasi || "-",
          nama_proyek: rowData.nama_proyek || "-",
          kategori: rowData.kategori || "-",
          tindakan: rowData.tindakan_penanggulangan || "-",
          batas_waktu: formatDate(rowData.cut_off_date),
          risk_level: rowData.risk_level || "-",
          status: rowData.status || "-",
          kategori_temuan: rowData.kategori_temuan || "-",
          pic: rowData.pic || "-",
        });

        row.height = imgList.length > 0 ? 75 : 35;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: "Arial", size: 9 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };

          if ([1, 2, 3, 4, 10, 11, 12, 14].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }
        });

        const riskCell = row.getCell(11);
        if (rowData.risk_level === "Tinggi") {
          riskCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFDC2626" } };
          riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        } else if (rowData.risk_level === "Sedang") {
          riskCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFEA580C" } };
          riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } };
        } else if (rowData.risk_level === "Rendah") {
          riskCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF16A34A" } };
          riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
        }

        if (imgList.length === 1) {
          const imageId = workbook.addImage({
            base64: imgList[0].base64,
            extension: imgList[0].extension,
          });

          worksheet.addImage(imageId, {
            tl: { col: 3.1, row: rowNumber - 1 + 0.08 },
            ext: { width: 135, height: 75 },
            editAs: "oneCell",
          });
        } else if (imgList.length >= 2) {
          const imageId1 = workbook.addImage({
            base64: imgList[0].base64,
            extension: imgList[0].extension,
          });
          worksheet.addImage(imageId1, {
            tl: { col: 3.05, row: rowNumber - 1 + 0.08 },
            ext: { width: 68, height: 75 },
            editAs: "oneCell",
          });

          const imageId2 = workbook.addImage({
            base64: imgList[1].base64,
            extension: imgList[1].extension,
          });
          worksheet.addImage(imageId2, {
            tl: { col: 3.52, row: rowNumber - 1 + 0.08 },
            ext: { width: 68, height: 75 },
            editAs: "oneCell",
          });
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Inspeksi_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert("Gagal mengekspor data ke Excel:\n" + error.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handler pemilihan file di Form Tambah
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFotoFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveFotoFile = (indexToRemove: number) => {
    setFotoFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKategoriChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setKategoriOption(value);
    if (value !== "Lainnya") {
      setFormData({ ...formData, kategori: value });
    } else {
      setFormData({ ...formData, kategori: "" });
    }
  };

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await supabase.from("inspeksi_header").update(headerData).eq("id", 1);
    alert("Header diperbarui!");
    setIsHeaderOpen(false);
    fetchHeader();
    setIsSubmitting(false);
  };

  // Submit Tambah Laporan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const uploadedFotoUrls: string[] = [];

    try {
      if (fotoFiles.length > 0) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
        for (const file of fotoFiles) {
          const compressedFile = await imageCompression(file, options);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

          const { error: uploadError } = await supabase.storage.from("inspeksi-photos").upload(fileName, compressedFile);
          if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);

          const { data: publicUrlData } = supabase.storage.from("inspeksi-photos").getPublicUrl(fileName);
          uploadedFotoUrls.push(publicUrlData.publicUrl);
        }
      }

      const finalFotoUrl = formatFotoUrlsForStorage(uploadedFotoUrls);

      const { error: insertError } = await supabase.from("inspeksi").insert([{ ...formData, foto_url: finalFotoUrl }]);
      if (insertError) throw new Error("Gagal simpan laporan ke database: " + insertError.message);

      alert("Laporan berhasil disimpan secara permanen!");
      setIsDialogOpen(false);

      setFormData({
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
      setKategoriOption("UNSAFE ACTION");
      setFotoFiles([]);
      fetchData();
    } catch (error: any) {
      alert("TERJADI KESALAHAN:\n" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIKA EDIT LAPORAN ---
  const handleOpenEdit = (row: any) => {
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
      const newlyUploadedUrls: string[] = [];
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };

      for (const file of newEditFotoFiles) {
        const compressedFile = await imageCompression(file, options);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage.from("inspeksi-photos").upload(fileName, compressedFile);
        if (uploadError) throw new Error("Gagal upload foto baru: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from("inspeksi-photos").getPublicUrl(fileName);
        newlyUploadedUrls.push(publicUrlData.publicUrl);
      }

      const finalPhotos = [...existingPhotos, ...newlyUploadedUrls];
      const finalFotoUrl = formatFotoUrlsForStorage(finalPhotos);

      const { error: updateError } = await supabase
        .from("inspeksi")
        .update({
          ...editFormData,
          foto_url: finalFotoUrl,
        })
        .eq("id", editingId);

      if (updateError) throw new Error("Gagal menyimpan perubahan: " + updateError.message);

      // Hapus foto yang dihapus dari Supabase Storage
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

      alert("Data laporan inspeksi berhasil diperbarui!");
      setIsEditDialogOpen(false);
      setEditingId(null);
      setNewEditFotoFiles([]);
      setDeletedPhotos([]);
      fetchData();
    } catch (error: any) {
      alert("TERJADI KESALAHAN SAAT UPDATE:\n" + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Hapus baris dan semua foto terkait di Supabase Storage
  const handleDelete = async (id: number, fotoUrl: string) => {
    const isConfirm = window.confirm("Apakah Anda yakin ingin menghapus data laporan ini?");
    if (!isConfirm) return;

    try {
      const urls = parseFotoUrls(fotoUrl);
      for (const url of urls) {
        const fileName = url.split("/").pop();
        if (fileName) {
          try {
            await supabase.storage.from("inspeksi-photos").remove([fileName]);
          } catch (storageErr) {
            console.warn("Gagal menghapus file dari storage:", storageErr);
          }
        }
      }

      const { error: dbError } = await supabase.from("inspeksi").delete().eq("id", id);
      if (dbError) throw new Error(dbError.message);

      alert("Data berhasil dihapus!");
      fetchData();
    } catch (error: any) {
      alert("Gagal menghapus data:\n" + error.message);
    }
  };

  const filteredData = data.filter(
    (row) =>
      row.temuan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.nama_proyek?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.no_pelaporan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.pic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="inspeksi-print-container p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 print:bg-white print:p-0 print:m-0 print:space-y-2">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* --- MODAL GALLERY / LIGHTBOX PERBESAR FOTO --- */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl p-4 bg-slate-950/95 text-white border-slate-800 shadow-2xl rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/80">
            <DialogTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Images size={16} className="text-blue-400" />
              <span>
                Perbesar Bukti Temuan{" "}
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

            {/* Tombol navigasi jika ada lebih dari 1 foto */}
            {modalImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalActiveIndex((prev) => (prev > 0 ? prev - 1 : modalImages.length - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all shadow-md backdrop-blur-sm hover:scale-110 cursor-pointer"
                  title="Foto Sebelumnya (Panah Kiri)"
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
                  title="Foto Selanjutnya (Panah Kanan)"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail preview carousel di bawah jika ada lebih dari 1 foto */}
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

      {/* --- TOP BAR / CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm no-print">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <FileText className="text-blue-600" /> Form Inspeksi
        </h1>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <Input
              type="text"
              placeholder="Cari No. Laporan / Proyek / PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => window.print()} variant="outline" className="h-9 w-9 p-0 text-slate-600" title="Cetak PDF">
              <Printer size={16} />
            </Button>
            <Button
              onClick={exportToExcel}
              disabled={isExportingExcel}
              variant="outline"
              className="h-9 w-9 p-0 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 disabled:opacity-50"
              title={isExportingExcel ? "Sedang mengunduh foto & membuat Excel..." : "Export Excel"}
            >
              {isExportingExcel ? <Loader2 size={16} className="animate-spin text-green-700" /> : <FileSpreadsheet size={16} />}
            </Button>

            {/* Dialog Pengaturan Kop */}
            <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
              <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9 cursor-pointer">
                <Settings size={16} className="hidden sm:block" /> <span className="hidden sm:block">Kop</span>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[600px] p-6 rounded-xl bg-white">
                <DialogHeader>
                  <DialogTitle>Pengaturan Kop Inspeksi</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleHeaderSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Perusahaan"
                      name="nama_perusahaan"
                      value={headerData.nama_perusahaan}
                      onChange={handleHeaderChange}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Nama Formulir"
                      name="nama_formulir"
                      value={headerData.nama_formulir}
                      onChange={handleHeaderChange}
                    />
                    <Input
                      placeholder="No Formulir"
                      name="no_formulir"
                      value={headerData.no_formulir}
                      onChange={handleHeaderChange}
                    />
                    <Input
                      placeholder="Revisi"
                      name="revisi"
                      value={headerData.revisi}
                      onChange={handleHeaderChange}
                    />
                    <Input
                      placeholder="T.M.T"
                      name="tmt"
                      value={headerData.tmt}
                      onChange={handleHeaderChange}
                    />
                    <Input
                      placeholder="Halaman"
                      name="halaman"
                      value={headerData.halaman}
                      onChange={handleHeaderChange}
                    />
                    <Input
                      placeholder="Tanggal Laporan"
                      name="tanggal_laporan"
                      value={headerData.tanggal_laporan}
                      onChange={handleHeaderChange}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-slate-800 text-white">
                    Simpan Kop
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* --- MODAL TAMBAH LAPORAN --- */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 h-9 shadow-sm cursor-pointer">
                <Plus size={16} /> Tambah
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl bg-white shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="text-blue-600" size={20} /> Laporan Safety Patrol Baru
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Temuan / Bukti Pelanggaran</label>
                    <Textarea
                      placeholder="Deskripsikan temuan..."
                      name="temuan"
                      value={formData.temuan}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">No. Pelaporan</label>
                      <Input
                        placeholder="Ketik No. Pelaporan..."
                        name="no_pelaporan"
                        value={formData.no_pelaporan}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Lokasi (Area)</label>
                      <select
                        name="lokasi"
                        value={formData.lokasi}
                        onChange={handleChange}
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
                        value={formData.nama_proyek}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Kategori Bahaya</label>
                      <select
                        value={kategoriOption}
                        onChange={handleKategoriChange}
                        className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="UNSAFE ACTION">Unsafe Action</option>
                        <option value="UNSAFE CONDITION">Unsafe Condition</option>
                        <option value="Lainnya">Lainnya (Ketik Manual)</option>
                      </select>
                      {kategoriOption === "Lainnya" && (
                        <Input
                          placeholder="Ketik jenis temuan..."
                          name="kategori"
                          value={formData.kategori}
                          onChange={handleChange}
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
                        value={formData.pic}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Tgl Temuan</label>
                      <Input
                        type="date"
                        name="tanggal_temuan"
                        value={formData.tanggal_temuan}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Batas Waktu (Cut Off)</label>
                      <Input
                        type="date"
                        name="cut_off_date"
                        value={formData.cut_off_date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Tingkat Risiko</label>
                      <select
                        name="risk_level"
                        value={formData.risk_level}
                        onChange={handleChange}
                        className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white"
                      >
                        <option value="Rendah">Rendah (Low)</option>
                        <option value="Sedang">Sedang (Medium)</option>
                        <option value="Tinggi">Tinggi (High)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Status Saat Ini</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white"
                      >
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600">Kategori Pekerjaan</label>
                      <Input
                        placeholder="Contoh: Bekerja di Ketinggian"
                        name="kategori_temuan"
                        value={formData.kategori_temuan}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600">Tindakan Penanggulangan</label>
                      <Textarea
                        placeholder="Tindakan penanggulangan atau arahan perbaikan..."
                        name="tindakan_penanggulangan"
                        value={formData.tindakan_penanggulangan}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* --- UPLOAD GAMBAR BANYAK (TAMBAH) --- */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Bukti Foto / Dokumentasi Lapangan (Bisa lebih dari 1 gambar)
                      </label>
                      {fotoFiles.length > 0 && (
                        <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {fotoFiles.length} foto dipilih
                        </span>
                      )}
                    </div>

                    {/* Preview file yang dipilih */}
                    {fotoFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
                        {fotoFiles.map((file, idx) => {
                          const objectUrl = URL.createObjectURL(file);
                          return (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-xs"
                            >
                              <img src={objectUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute top-1 right-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFotoFile(idx)}
                                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                                  title="Hapus foto ini"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                Foto {idx + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Area upload drag/click */}
                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 transition-all rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 relative group">
                      <UploadCloud className="text-slate-400 group-hover:text-blue-500 transition-colors" size={26} />
                      <span className="text-xs font-semibold text-slate-700">
                        {fotoFiles.length > 0 ? "Tambah Foto Lainnya" : "Pilih Foto Lapangan"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Klik untuk memilih foto (bisa pilih banyak sekaligus, maks. 1MB/foto akan otomatis dikompres)
                      </span>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm mt-4 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Mengunggah & Menyimpan Laporan...
                      </span>
                    ) : (
                      "Simpan Laporan"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* --- MODAL EDIT LAPORAN --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="text-blue-600" size={18} /> Edit Laporan Safety Patrol
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
                <label className="text-xs font-semibold text-slate-600">Status Saat Ini</label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white"
                >
                  <option value="Open">Open</option>
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

            {/* --- MANAJEMEN FOTO DI MODAL EDIT --- */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block">
                Bukti Foto / Dokumentasi Lapangan
              </label>

              {/* Foto yang sudah tersimpan sebelumnya */}
              {existingPhotos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-slate-500">Foto Tersimpan ({existingPhotos.length}):</p>
                    <span className="text-[10px] text-slate-400">Klik ikon silang untuk menghapus foto</span>
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
                          Tersimpan
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Foto baru yang ditambahkan di form edit */}
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

              {/* Upload foto baru */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 transition-all rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 relative group">
                <UploadCloud className="text-slate-400 group-hover:text-blue-500 transition-colors" size={24} />
                <span className="text-xs font-semibold text-slate-700">Tambah Foto Lainnya</span>
                <span className="text-[10px] text-slate-400">
                  Pilih 1 atau beberapa foto sekaligus (bisa foto langsung atau dari galeri HP/laptop)
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewEditFilesChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
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

      {/* --- LOGO KONSISTEN DI ATAS TABEL --- */}
      <div className="hidden print:flex w-full justify-center mb-4 mt-2">
        <img src="/konsisten.webp" alt="Logo KONSISTEN" className="h-10 object-contain" />
      </div>

      {/* --- TABEL UTAMA INSPEKSI --- */}
      <div className="inspeksi-table-wrapper w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none print:p-0 print:m-0 print:overflow-visible">
        <Table className="inspeksi-table min-w-[1600px] print:min-w-0 print:w-full text-sm print:text-xs bg-white">
          {/* STRUKTUR TULANG TABEL MUTLAK KHUSUS PRINT */}
          <colgroup className="hidden print:table-column-group">
            <col style={{ width: "3%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "2%" }} />
          </colgroup>
          <TableHeader className="bg-slate-50 print:bg-white">
            {/* --- KOP SURAT (DI DALAM TABEL) --- */}
            <TableRow className="hidden print:table-row bg-white">
              <TableHead colSpan={13} className="inspeksi-kop-cell font-normal text-black border-black">
                <div className="flex w-full border-b border-black box-border bg-white">
                  <div className="w-[20%] border-r border-black p-2 flex items-center justify-center">
                    <img src="/KAI Properti.png" alt="Logo KAI Properti" className="max-h-12 object-contain" />
                  </div>
                  <div className="w-[55%] border-r border-black flex flex-col justify-center">
                    <div className="border-b border-black p-1 text-center uppercase font-bold text-sm tracking-wide">
                      {headerData.nama_perusahaan || "PT. KA PROPERTI MANAJEMEN"}
                    </div>
                    <div className="p-1 text-center text-base font-extrabold uppercase tracking-wider">
                      {headerData.nama_formulir || "HSE PATROL"}
                    </div>
                  </div>
                  <div className="w-[25%] p-1.5 text-[8pt] flex flex-col justify-center space-y-0.5">
                    <div className="flex justify-between">
                      <span>NO. FORMULIR</span>
                      <span>: {headerData.no_formulir}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>REVISI</span>
                      <span>: {headerData.revisi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>T.M.T</span>
                      <span>: {headerData.tmt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HALAMAN</span>
                      <span>: {headerData.halaman}</span>
                    </div>
                  </div>
                </div>
                <div className="p-1.5 bg-white text-[8pt] flex justify-end">
                  <div className="flex">
                    <span className="font-bold mr-2">Tanggal Laporan :</span>
                    <span>{formatDate(headerData.tanggal_laporan)}</span>
                  </div>
                </div>
              </TableHead>
              <TableHead className="col-aksi print:hidden p-0 border-none"></TableHead>
            </TableRow>

            {/* --- HEADER KOLOM --- */}
            <TableRow className="text-slate-800 font-bold bg-white inspeksi-col-header">
              <TableHead className="col-no border-b print:border print:border-black text-center text-black print:px-0 print:mx-0">
                NO
              </TableHead>
              <TableHead className="col-no-laporan border-b print:border print:border-black text-center text-black">
                No. Pelaporan
              </TableHead>
              <TableHead className="col-tgl border-b print:border print:border-black text-center text-black">
                Tgl Temuan
              </TableHead>
              <TableHead className="col-foto border-b print:border print:border-black text-center text-black">
                Bukti Foto
              </TableHead>
              <TableHead className="col-temuan border-b print:border print:border-black text-black">
                Temuan / Pelanggaran
              </TableHead>
              <TableHead className="col-lokasi border-b print:border print:border-black text-black w-[120px] max-w-[130px]">
                Area / Proyek
              </TableHead>
              <TableHead className="col-kategori border-b print:border print:border-black text-black">
                Kategori
              </TableHead>
              <TableHead className="col-tindakan border-b print:border print:border-black text-black">
                Tindakan Penanggulangan
              </TableHead>
              <TableHead className="col-batas border-b print:border print:border-black text-center text-black">
                Batas Waktu
              </TableHead>
              <TableHead className="col-risiko border-b print:border print:border-black text-center text-black">
                Risiko
              </TableHead>
              <TableHead className="col-status border-b print:border print:border-black text-center text-black">
                Status
              </TableHead>
              <TableHead className="col-jenis border-b print:border print:border-black text-center text-black">
                Jenis Pekerjaan
              </TableHead>
              <TableHead className="col-pic border-b print:border print:border-black text-center text-black">
                PIC
              </TableHead>
              <TableHead className="col-aksi border-b print:hidden text-center w-[95px]">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="bg-white">
                <TableCell colSpan={14} className="text-center py-10 text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <span>Memuat data inspeksi...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={14} className="text-center py-10 text-slate-500">
                  {searchQuery ? "Data tidak ditemukan." : "Belum ada laporan inspeksi."}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, index) => {
                const urls = parseFotoUrls(row.foto_url);

                return (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 bg-white">
                    <TableCell className="col-no border-b print:border print:border-black text-center align-top text-black print:px-0 print:mx-0">
                      {index + 1}
                    </TableCell>
                    <TableCell className="col-no-laporan border-b print:border print:border-black p-2 text-center align-top font-medium text-black">
                      <div className="max-w-[100px] mx-auto whitespace-normal break-all">
                        {row.no_pelaporan || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="col-tgl border-b print:border print:border-black p-2 text-center align-top text-black">
                      {formatDate(row.tanggal_temuan)}
                    </TableCell>

                    {/* --- KOLOM BUKTI FOTO DENGAN TAMPILAN RESPONSIVE BANYAK GAMBAR --- */}
                    <TableCell className="col-foto border-b print:border print:border-black p-2 text-center align-top">
                      {urls.length === 0 ? (
                        <div className="min-w-[120px] print:min-w-0 print:w-full mx-auto flex items-center justify-center h-24 print:h-auto">
                          <span className="text-xs text-slate-400 italic">Tanpa Foto</span>
                        </div>
                      ) : (
                        <div className="min-w-[120px] print:min-w-0 print:w-full mx-auto">
                          {/* Tampilan cetak (print): rapi & tidak melebar */}
                          <div className="hidden print:flex print-photos-grid justify-center gap-1">
                            {urls.slice(0, 2).map((url, i) => (
                              <img key={i} src={url} alt={`Bukti ${i + 1}`} className="object-cover" />
                            ))}
                            {urls.length > 2 && (
                              <div className="text-[6.5pt] self-center font-bold text-slate-700">+{urls.length - 2}</div>
                            )}
                          </div>

                          {/* Tampilan web */}
                          <div className="print:hidden">
                            {urls.length === 1 ? (
                              <div
                                className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200"
                                onClick={() => openImageModal(urls, 0)}
                                title="Klik untuk perbesar"
                              >
                                <img
                                  src={urls[0]}
                                  alt="Bukti Temuan"
                                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200 bg-white"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={18} className="drop-shadow" />
                                </div>
                              </div>
                            ) : urls.length === 2 ? (
                              <div>
                                <div className="grid grid-cols-2 gap-1.5 w-full">
                                  {urls.map((url, i) => (
                                    <div
                                      key={i}
                                      className="relative group cursor-pointer overflow-hidden rounded-md border border-slate-200 shadow-xs hover:shadow-md aspect-square transition-all duration-200"
                                      onClick={() => openImageModal(urls, i)}
                                      title={`Klik untuk perbesar foto ${i + 1}`}
                                    >
                                      <img
                                        src={url}
                                        alt={`Foto ${i + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 bg-white"
                                      />
                                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Eye size={14} className="drop-shadow" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div
                                  className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => openImageModal(urls, 0)}
                                >
                                  <Images size={11} className="text-blue-500" />
                                  <span>2 Foto</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="grid grid-cols-2 gap-1 w-full">
                                  {urls.slice(0, 4).map((url, i) => {
                                    const isLastOver = i === 3 && urls.length > 4;
                                    return (
                                      <div
                                        key={i}
                                        className="relative group cursor-pointer overflow-hidden rounded border border-slate-200 shadow-xs aspect-square transition-all duration-200"
                                        onClick={() => openImageModal(urls, i)}
                                        title={`Klik untuk perbesar foto ${i + 1}`}
                                      >
                                        <img
                                          src={url}
                                          alt={`Foto ${i + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 bg-white"
                                        />
                                        {isLastOver ? (
                                          <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center text-white font-bold text-xs">
                                            +{urls.length - 3}
                                          </div>
                                        ) : (
                                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Eye size={13} className="drop-shadow" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div
                                  className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => openImageModal(urls, 0)}
                                >
                                  <Images size={11} className="text-blue-500" />
                                  <span>{urls.length} Foto</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="col-temuan border-b print:border print:border-black p-2 text-black font-medium align-top">
                      <div className="min-w-[200px] max-w-[300px] whitespace-normal break-words reset-print-text" title={row.temuan}>
                        {row.temuan}
                      </div>
                    </TableCell>

                    <TableCell className="col-lokasi border-b print:border print:border-black p-2 align-top text-black w-[120px] max-w-[130px]">
                      <div className="font-semibold text-xs leading-tight">{row.lokasi}</div>
                      <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider leading-snug">{row.nama_proyek}</div>
                    </TableCell>

                    <TableCell className="col-kategori border-b print:border print:border-black p-2 align-top text-black">
                      <span className="badge-kategori bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-slate-600 uppercase border border-slate-200">
                        {row.kategori}
                      </span>
                    </TableCell>

                    <TableCell className="col-tindakan border-b print:border print:border-black p-2 text-black align-top">
                      <div className="min-w-[200px] line-clamp-4 reset-print-text" title={row.tindakan_penanggulangan}>
                        {row.tindakan_penanggulangan ? (
                          row.tindakan_penanggulangan
                        ) : (
                          <span className="text-xs text-slate-400 italic">Belum ditindaklanjuti</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="col-batas border-b print:border print:border-black p-2 text-center text-red-600 font-medium align-top">
                      {formatDate(row.cut_off_date)}
                    </TableCell>

                    <TableCell className="col-risiko border-b print:border print:border-black p-2 text-center font-bold align-top">
                      <span
                        className={`badge-risiko px-2.5 py-1 rounded-full text-xs border whitespace-nowrap ${
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

                    <TableCell className="col-status border-b print:border print:border-black p-2 text-center font-bold align-top text-black">
                      {row.status}
                    </TableCell>
                    <TableCell className="col-jenis border-b print:border print:border-black p-2 text-center align-top text-black">
                      {row.kategori_temuan}
                    </TableCell>
                    <TableCell className="col-pic border-b print:border print:border-black p-2 text-center font-semibold text-black align-top">
                      {row.pic}
                    </TableCell>

                    {/* --- KOLOM AKSI: EDIT & HAPUS --- */}
                    <TableCell className="col-aksi border-b print:hidden p-2 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 cursor-pointer"
                          onClick={() => handleOpenEdit(row)}
                          title="Edit Laporan"
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                          onClick={() => handleDelete(row.id, row.foto_url)}
                          title="Hapus Data"
                        >
                          <Trash2 size={15} />
                        </Button>
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
  );
}