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
import { Plus, Printer, FileText, Settings, FileSpreadsheet, Search, Loader2, Trash2 } from "lucide-react";

const printStyles = `
  @media print {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    /* Reset zoom dan paksa lebar 100% dari kertas A4 */
    html, body {
      zoom: 100% !important;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    main {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .no-print {
      display: none !important;
    }

    /* Sembunyikan kolom aksi saat di-print */
    .col-aksi {
      display: none !important;
    }

    /* Pembungkus halaman agar pas di sisi kiri & kanan */
    .inspeksi-print-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }

    /* Kop Formulir Inspeksi */
    .inspeksi-kop {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      border: 2px solid #000 !important;
      margin-bottom: 8px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Wrapper tabel: hilangkan overflow & border ganda saat print */
    .inspeksi-table-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .inspeksi-table-wrapper > div {
      overflow: visible !important;
      width: 100% !important;
    }

    /* Tabel utama pas 100% kiri & kanan */
    .inspeksi-table {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: 2px solid #000 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }

    .inspeksi-table th,
    .inspeksi-table td {
      border: 1px solid #000 !important;
      padding: 3px 2px !important;
      vertical-align: top !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      font-size: 7.5pt !important;
      line-height: 1.2 !important;
      color: #000 !important;
    }

    .inspeksi-table th {
      background-color: #dbeafe !important;
      font-weight: 700 !important;
      text-align: center !important;
      border-bottom: 2px solid #000 !important;
      font-size: 8pt !important;
    }

    /* Proporsi lebar kolom pas 100% */
    .col-no        { width: 3% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-tgl       { width: 7% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-foto      { width: 7.5% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-temuan    { width: 18% !important; min-width: unset !important; max-width: unset !important; text-align: left !important; }
    .col-lokasi    { width: 7.5% !important; min-width: unset !important; max-width: unset !important; text-align: left !important; }
    .col-kategori  { width: 7.5% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-tindakan  { width: 18% !important; min-width: unset !important; max-width: unset !important; text-align: left !important; }
    .col-batas     { width: 7% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-risiko    { width: 5.5% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-status    { width: 5% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-jenis     { width: 8% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }
    .col-pic       { width: 6.5% !important; min-width: unset !important; max-width: unset !important; text-align: center !important; }

    /* Gambar bukti */
    .inspeksi-table img {
      width: 100% !important;
      height: 46px !important;
      object-fit: cover !important;
      border-radius: 2px !important;
      border: 1px solid #cbd5e1 !important;
      display: block !important;
    }

    /* Buka batasan teks di print */
    .inspeksi-desc-text {
      min-width: 0 !important;
      max-width: 100% !important;
      white-space: normal !important;
      word-break: break-word !important;
      display: block !important;
      -webkit-line-clamp: unset !important;
      line-clamp: unset !important;
      overflow: visible !important;
    }

    .badge-kategori {
      font-size: 6.5pt !important;
      padding: 1px 3px !important;
      border-radius: 2px !important;
      display: inline-block !important;
      word-break: break-word !important;
      line-height: 1.1 !important;
    }

    .badge-risiko {
      font-size: 6.5pt !important;
      padding: 1px 3px !important;
      border-radius: 4px !important;
      display: inline-block !important;
      white-space: nowrap !important;
      line-height: 1.1 !important;
    }

    .inspeksi-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
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
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [kategoriOption, setKategoriOption] = useState("UNSAFE ACTION");

  const [headerData, setHeaderData] = useState({
    nama_perusahaan: "", nama_formulir: "", no_formulir: "", revisi: "",
    tmt: "", halaman: "", nama_project: "", tanggal_laporan: ""
  });

  const [formData, setFormData] = useState({
    temuan: "", lokasi: "", kategori: "UNSAFE ACTION", pic: "",
    tindakan_penanggulangan: "", tanggal_temuan: "", cut_off_date: "",
    risk_level: "Rendah", status: "Open", kategori_temuan: "Standard Working"
  });

  useEffect(() => {
    fetchHeader();
    fetchData();
  }, []);

  const fetchHeader = async () => {
    try {
      const { data: hData } = await supabase.from('inspeksi_header').select('*').eq('id', 1).single();
      if (hData) setHeaderData(hData);
    } catch (error) { }
  };

  const fetchData = async () => {
    try {
      const { data: inspeksiData } = await supabase.from("inspeksi").select("*").order("created_at", { ascending: false });
      setData(inspeksiData || []);
    } catch (error) { } finally { setLoading(false); }
  };

  const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = blob.type.toLowerCase();
      const extension: 'jpeg' | 'png' = type.includes('png') ? 'png' : 'jpeg';

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            resolve(null);
            return;
          }
          const base64 = result.split(',')[1];
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
      workbook.creator = "Safety Pro";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Data_Inspeksi", {
        views: [{ showGridLines: true }]
      });

      // Definisi Kolom Excel
      worksheet.columns = [
        { header: "No", key: "no", width: 6 },
        { header: "Tanggal Temuan", key: "tanggal_temuan", width: 16 },
        { header: "Bukti Foto", key: "foto", width: 24 },
        { header: "Temuan / Pelanggaran", key: "temuan", width: 36 },
        { header: "Lokasi", key: "lokasi", width: 18 },
        { header: "Kategori", key: "kategori", width: 18 },
        { header: "Tindakan Penanggulangan", key: "tindakan", width: 36 },
        { header: "Batas Waktu", key: "batas_waktu", width: 16 },
        { header: "Risk Level", key: "risk_level", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Kategori Temuan", key: "kategori_temuan", width: 22 },
        { header: "PIC", key: "pic", width: 16 },
      ];

      // Format Header Row (Baris 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" } // Dark Blue / Navy
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "medium", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } }
        };
      });

      // Download semua foto bukti secara paralel
      const imagePromises = data.map((row) =>
        row.foto_url ? fetchImageAsBase64(row.foto_url) : Promise.resolve(null)
      );
      const images = await Promise.all(imagePromises);

      // Isi Data Baris per Baris
      for (let index = 0; index < data.length; index++) {
        const rowData = data[index];
        const imgData = images[index];
        const rowNumber = index + 2; // Baris data dimulai dari baris ke-2

        const row = worksheet.addRow({
          no: index + 1,
          tanggal_temuan: rowData.tanggal_temuan || "-",
          foto: imgData ? "" : (rowData.foto_url ? "Foto Gagal Dimuat" : "Tanpa Foto"),
          temuan: rowData.temuan || "-",
          lokasi: rowData.lokasi || "-",
          kategori: rowData.kategori || "-",
          tindakan: rowData.tindakan_penanggulangan || "-",
          batas_waktu: rowData.cut_off_date || "-",
          risk_level: rowData.risk_level || "-",
          status: rowData.status || "-",
          kategori_temuan: rowData.kategori_temuan || "-",
          pic: rowData.pic || "-",
        });

        // Set tinggi baris agar foto terlihat jelas
        row.height = imgData ? 75 : 35;

        // Styling tiap sel data
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: "Arial", size: 9 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } }
          };

          // Alignment berdasarkan kolom (1: No, 2: Tgl, 3: Foto, 8: Batas, 9: Risk, 10: Status, 12: PIC -> Center)
          if ([1, 2, 3, 8, 9, 10, 12].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }
        });

        // Styling warna sel Risk Level (Kolom 9)
        const riskCell = row.getCell(9);
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

        // Sisipkan Foto Asli ke dalam Sel Kolom C
        if (imgData) {
          const imageId = workbook.addImage({
            base64: imgData.base64,
            extension: imgData.extension,
          });

          worksheet.addImage(imageId, {
            tl: { col: 2.1, row: rowNumber - 1 + 0.08 },
            ext: { width: 135, height: 80 },
            editAs: "oneCell"
          });
        }
      }

      // Generate file buffer & trigger download di browser
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
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
      console.error("Export Excel Error:", error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFotoFile(e.target.files[0]); };

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
    await supabase.from('inspeksi_header').update(headerData).eq('id', 1);
    alert("Header diperbarui!");
    setIsHeaderOpen(false);
    fetchHeader();
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let uploadedFotoUrl = "";

    try {
      if (fotoFile) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressedFile = await imageCompression(fotoFile, options);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage.from('inspeksi-photos').upload(fileName, compressedFile);
        if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from('inspeksi-photos').getPublicUrl(fileName);
        uploadedFotoUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("inspeksi").insert([{ ...formData, foto_url: uploadedFotoUrl }]);
      if (insertError) throw new Error("Gagal simpan laporan ke database: " + insertError.message);

      alert("Laporan berhasil disimpan secara permanen!");
      setIsDialogOpen(false);

      setFormData({ temuan: "", lokasi: "", kategori: "UNSAFE ACTION", pic: "", tindakan_penanggulangan: "", tanggal_temuan: "", cut_off_date: "", risk_level: "Rendah", status: "Open", kategori_temuan: "Standard Working" });
      setKategoriOption("UNSAFE ACTION");
      setFotoFile(null);

      fetchData();
    } catch (error: any) {
      alert("TERJADI KESALAHAN:\n" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNGSI DELETE BARU ---
  const handleDelete = async (id: number, fotoUrl: string) => {
    const isConfirm = window.confirm("Apakah Anda yakin ingin menghapus data laporan ini?");
    if (!isConfirm) return;

    try {
      // 1. Hapus foto dari Supabase Storage jika ada
      if (fotoUrl) {
        const fileName = fotoUrl.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage.from('inspeksi-photos').remove([fileName]);
          if (storageError) console.warn("Gagal menghapus foto dari storage:", storageError.message);
        }
      }

      // 2. Hapus row dari database
      const { error: dbError } = await supabase.from("inspeksi").delete().eq("id", id);
      if (dbError) throw new Error(dbError.message);

      alert("Data berhasil dihapus!");
      fetchData(); // Refresh tabel setelah delete
    } catch (error: any) {
      alert("Gagal menghapus data:\n" + error.message);
    }
  };

  const filteredData = data.filter(row =>
    row.temuan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.pic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="inspeksi-print-container p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 print:p-0 print:m-0 print:space-y-2">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl p-2 bg-slate-900 border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Perbesar Foto Temuan</DialogTitle></DialogHeader>
          {selectedImage && (
            <img src={selectedImage} alt="Diperbesar" className="w-full h-auto max-h-[85vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm no-print">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"><FileText className="text-blue-600" /> Form Inspeksi</h1>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="relative w-full sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
            <Input
              type="text"
              placeholder="Cari temuan / PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => window.print()} variant="outline" className="h-9 w-9 p-0 text-slate-600" title="Cetak PDF"><Printer size={16} /></Button>
            <Button
              onClick={exportToExcel}
              disabled={isExportingExcel}
              variant="outline"
              className="h-9 w-9 p-0 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 disabled:opacity-50"
              title={isExportingExcel ? "Sedang mengunduh foto & membuat Excel..." : "Export Excel (dengan Gambar)"}
            >
              {isExportingExcel ? <Loader2 size={16} className="animate-spin text-green-700" /> : <FileSpreadsheet size={16} />}
            </Button>

            <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
              <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Settings size={16} className="hidden sm:block" /> <span className="hidden sm:block">Kop</span></DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[600px] p-6 rounded-xl bg-white">
                <DialogHeader><DialogTitle>Pengaturan Kop Inspeksi</DialogTitle></DialogHeader>
                <form onSubmit={handleHeaderSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Perusahaan" name="nama_perusahaan" value={headerData.nama_perusahaan} onChange={handleHeaderChange} className="col-span-2" />
                    <Input placeholder="Project" name="nama_project" value={headerData.nama_project} onChange={handleHeaderChange} className="col-span-2" />
                    <Input placeholder="Nama Formulir" name="nama_formulir" value={headerData.nama_formulir} onChange={handleHeaderChange} />
                    <Input placeholder="No Formulir" name="no_formulir" value={headerData.no_formulir} onChange={handleHeaderChange} />
                    <Input placeholder="Revisi" name="revisi" value={headerData.revisi} onChange={handleHeaderChange} />
                    <Input placeholder="T.M.T" name="tmt" value={headerData.tmt} onChange={handleHeaderChange} />
                    <Input placeholder="Halaman" name="halaman" value={headerData.halaman} onChange={handleHeaderChange} />
                    <Input placeholder="Tanggal Laporan" name="tanggal_laporan" value={headerData.tanggal_laporan} onChange={handleHeaderChange} />
                  </div>
                  <Button type="submit" className="w-full bg-slate-800 text-white">Simpan Kop</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 h-9 shadow-sm"><Plus size={16} /> Tambah</DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl">
                <DialogHeader><DialogTitle>Laporan Safety Patrol</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Temuan / Bukti Pelanggaran</label>
                    <Textarea placeholder="Deskripsikan temuan..." name="temuan" value={formData.temuan} onChange={handleChange} required />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Lokasi Temuan</label>
                      <Input placeholder="Area / Zona" name="lokasi" value={formData.lokasi} onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Kategori Bahaya</label>
                      <select value={kategoriOption} onChange={handleKategoriChange} className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white focus:border-blue-500 outline-none">
                        <option value="UNSAFE ACTION">Unsafe Action</option>
                        <option value="UNSAFE CONDITION">Unsafe Condition</option>
                        <option value="Lainnya">Lainnya (Ketik Manual)</option>
                      </select>
                      {kategoriOption === "Lainnya" && (
                        <Input placeholder="Ketik jenis temuan..." name="kategori" value={formData.kategori} onChange={handleChange} className="mt-2" required autoFocus />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">PIC (Penanggung Jawab)</label>
                      <Input placeholder="Nama / Vendor" name="pic" value={formData.pic} onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Tgl Temuan</label>
                      <Input type="date" name="tanggal_temuan" value={formData.tanggal_temuan} onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Batas Waktu (Cut Off)</label>
                      <Input type="date" name="cut_off_date" value={formData.cut_off_date} onChange={handleChange} required />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Tingkat Risiko</label>
                      <select name="risk_level" value={formData.risk_level} onChange={handleChange} className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white">
                        <option value="Rendah">Rendah (Low)</option>
                        <option value="Sedang">Sedang (Medium)</option>
                        <option value="Tinggi">Tinggi (High)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Status Saat Ini</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="border border-slate-200 p-2 rounded-md w-full text-sm bg-white">
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Kategori Pekerjaan</label>
                      <Input placeholder="Contoh: Bekerja di Ketinggian" name="kategori_temuan" value={formData.kategori_temuan} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-600 block">Bukti Foto / Dokumentasi Lapangan</label>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      capture="environment"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      <span className="font-semibold text-blue-600">Info:</span> Bisa pilih file dari galeri atau langsung foto dari kamera (di HP). Maksimal 5 MB.
                    </p>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4">
                    {isSubmitting ? "Mengunggah Laporan..." : "Simpan Laporan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="inspeksi-kop hidden print:block border-2 border-black p-0 text-xs md:text-sm font-semibold mb-3 w-full box-border">
        <div className="grid grid-cols-12 border-b-2 border-black">
          <div className="col-span-3 border-r-2 border-black p-3 flex items-center justify-center">
            <div className="text-blue-800 font-bold text-2xl italic">KAI <span className="text-orange-500 text-sm not-italic block mt-[-5px]">Properti</span></div>
          </div>
          <div className="col-span-6 border-r-2 border-black flex flex-col justify-center">
            <div className="border-b-2 border-black p-1.5 text-center uppercase font-bold text-sm tracking-wide">{headerData.nama_perusahaan || "PT KAI PROPERTI"}</div>
            <div className="p-1.5 text-center text-base font-extrabold uppercase tracking-wider">{headerData.nama_formulir || "FORM INSPEKSI K3"}</div>
          </div>
          <div className="col-span-3 p-2 text-[10px] flex flex-col justify-center space-y-0.5">
            <div className="grid grid-cols-2"><span>NO. FORMULIR</span><span>: {headerData.no_formulir}</span></div>
            <div className="grid grid-cols-2"><span>REVISI</span><span>: {headerData.revisi}</span></div>
            <div className="grid grid-cols-2"><span>T.M.T</span><span>: {headerData.tmt}</span></div>
            <div className="grid grid-cols-2"><span>HALAMAN</span><span>: {headerData.halaman}</span></div>
          </div>
        </div>
        <div className="p-2 space-y-0.5 bg-white text-[11px]">
          <div className="grid grid-cols-12"><span className="col-span-2 font-bold">Nama Project</span><span className="col-span-10">: {headerData.nama_project}</span></div>
          <div className="grid grid-cols-12"><span className="col-span-2 font-bold">Tanggal Laporan</span><span className="col-span-10">: {headerData.tanggal_laporan}</span></div>
        </div>
      </div>

      <div className="inspeksi-table-wrapper w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none print:p-0 print:m-0 print:overflow-visible">
        <Table className="inspeksi-table min-w-[1500px] text-sm print:text-xs">
          <TableHeader className="bg-slate-50 print:bg-blue-100">
            <TableRow className="text-slate-800 font-bold">
              <TableHead className="col-no border-b print:border print:border-black text-center w-[50px]">NO</TableHead>
              <TableHead className="col-tgl border-b print:border print:border-black text-center w-[100px]">Tgl Temuan</TableHead>
              <TableHead className="col-foto border-b print:border print:border-black text-center w-[120px]">Bukti Foto</TableHead>
              <TableHead className="col-temuan border-b print:border print:border-black min-w-[250px] max-w-[350px]">Temuan / Pelanggaran</TableHead>
              <TableHead className="col-lokasi border-b print:border print:border-black w-[150px]">Lokasi</TableHead>
              <TableHead className="col-kategori border-b print:border print:border-black">Kategori</TableHead>
              <TableHead className="col-tindakan border-b print:border print:border-black min-w-[250px] max-w-[350px]">Tindakan Penanggulangan</TableHead>
              <TableHead className="col-batas border-b print:border print:border-black text-center">Batas Waktu</TableHead>
              <TableHead className="col-risiko border-b print:border print:border-black text-center">Risiko</TableHead>
              <TableHead className="col-status border-b print:border print:border-black text-center">Status</TableHead>
              <TableHead className="col-jenis border-b print:border print:border-black text-center">Jenis Pekerjaan</TableHead>
              <TableHead className="col-pic border-b print:border print:border-black text-center">PIC</TableHead>
              {/* Tambahan Kolom Aksi */}
              <TableHead className="col-aksi border-b print:hidden text-center w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-slate-500">
                  {searchQuery ? "Data tidak ditemukan." : "Belum ada laporan inspeksi."}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, index) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  <TableCell className="col-no border-b print:border print:border-black p-3 text-center align-top">{index + 1}</TableCell>
                  <TableCell className="col-tgl border-b print:border print:border-black p-3 text-center align-top">{row.tanggal_temuan}</TableCell>
                  <TableCell className="col-foto border-b print:border print:border-black p-3 text-center align-top">
                    {row.foto_url ? (
                      <img
                        src={row.foto_url}
                        alt="Bukti Temuan"
                        className="w-full h-16 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setSelectedImage(row.foto_url); setIsImageModalOpen(true); }}
                        title="Klik untuk perbesar"
                      />
                    ) : <span className="text-xs text-slate-400 italic">Tanpa Foto</span>}
                  </TableCell>
                  <TableCell className="col-temuan border-b print:border print:border-black p-3 text-slate-800 font-medium align-top">
                    <div className="inspeksi-desc-text min-w-[200px] max-w-[300px] whitespace-normal break-words line-clamp-4" title={row.temuan}>
                      {row.temuan}
                    </div>
                  </TableCell>
                  <TableCell className="col-lokasi border-b print:border print:border-black p-3 align-top">{row.lokasi}</TableCell>
                  <TableCell className="col-kategori border-b print:border print:border-black p-3 align-top">
                    <span className="badge-kategori bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-slate-600 uppercase border border-slate-200">{row.kategori}</span>
                  </TableCell>
                  <TableCell className="col-tindakan border-b print:border print:border-black p-3 text-slate-600 align-top">
                    <div className="inspeksi-desc-text min-w-[200px] max-w-[300px] whitespace-normal break-words line-clamp-4" title={row.tindakan_penanggulangan}>
                      {row.tindakan_penanggulangan ? row.tindakan_penanggulangan : <span className="text-xs text-slate-400 italic">Belum ditindaklanjuti</span>}
                    </div>
                  </TableCell>
                  <TableCell className="col-batas border-b print:border print:border-black p-3 text-center text-red-600 font-medium align-top">{row.cut_off_date}</TableCell>
                  <TableCell className="col-risiko border-b print:border print:border-black p-3 text-center font-bold align-top">
                    <span className={`badge-risiko px-2.5 py-1 rounded-full text-xs border whitespace-nowrap ${row.risk_level === 'Tinggi' ? 'bg-red-50 text-red-700 border-red-200' :
                      row.risk_level === 'Sedang' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        row.risk_level === 'Rendah' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-700'
                      }`}>
                      {row.risk_level}
                    </span>
                  </TableCell>
                  <TableCell className="col-status border-b print:border print:border-black p-3 text-center font-bold align-top">{row.status}</TableCell>
                  <TableCell className="col-jenis border-b print:border print:border-black p-3 text-center align-top">{row.kategori_temuan}</TableCell>
                  <TableCell className="col-pic border-b print:border print:border-black p-3 text-center font-semibold text-blue-700 align-top">{row.pic}</TableCell>

                  {/* Tambahan Tombol Aksi Delete */}
                  <TableCell className="col-aksi border-b print:hidden p-3 text-center align-top">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDelete(row.id, row.foto_url)}
                      title="Hapus Data"
                    >
                      <Trash2 size={16} />
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