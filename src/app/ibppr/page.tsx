"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ExcelJS from 'exceljs'; // Ubah library ke ExcelJS untuk dukungan styling warna
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Printer, Settings, FileSpreadsheet, Edit, Trash2,
  Search, FolderOpen, ArrowLeft, Calendar, MapPin, Building
} from "lucide-react";

// --- CSS KHUSUS UNTUK PRINT PDF AGAR PAS DI KERTAS ---
const printStyles = `
  @media print {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    html, body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print {
      display: none !important;
    }

    /* Memaksa tabel agar menyesuaikan dengan lebar kertas */
    .print-table-container {
      width: 100% !important;
      overflow: visible !important;
    }

    table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important; 
    }

    /* Mengurangi ukuran font dan padding saat print agar tabel yang panjang bisa muat */
    th, td {
      font-size: 6.5pt !important; 
      padding: 2px !important;
      word-wrap: break-word !important;
    }

    /* Mencegah baris terpotong di tengah halaman */
    tr {
      page-break-inside: avoid !important;
    }
  }
`;

// --- FUNGSI HELPER UNTUK WARNA (DIJAMIN 100% BERUBAH DENGAN INLINE STYLE) ---
const getRiskStyles = (probabilitas: any, dampak: any) => {
  const value = Number(probabilitas || 0) * Number(dampak || 0);

  if (value >= 17) return { className: "text-white font-extrabold", bgColor: "#DC2626" }; // Merah
  if (value >= 10) return { className: "text-black font-extrabold", bgColor: "#F4B183" }; // Oranye
  if (value >= 5) return { className: "text-black font-extrabold", bgColor: "#FACC15" };  // Kuning
  if (value >= 1) return { className: "text-white font-extrabold", bgColor: "#22C55E" };  // Hijau

  return { className: "text-slate-400 font-medium", bgColor: "#F8FAFC" }; // Kosong
};

// Fungsi warna khusus untuk ExcelJS (format ARGB)
const getExcelRiskColor = (probabilitas: any, dampak: any) => {
  const value = Number(probabilitas || 0) * Number(dampak || 0);
  if (value >= 17) return { bg: "FFDC2626", font: "FFFFFFFF" };
  if (value >= 10) return { bg: "FFF4B183", font: "FF000000" };
  if (value >= 5) return { bg: "FFFACC15", font: "FF000000" };
  if (value >= 1) return { bg: "FF22C55E", font: "FFFFFFFF" };
  return { bg: "FFFFFFFF", font: "FF000000" };
};

const getRiskValue = (probabilitas: any, dampak: any) => {
  const val = Number(probabilitas || 0) * Number(dampak || 0);
  return val > 0 ? val : '-';
};

export default function IbprPage() {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmittingHeader, setIsSubmittingHeader] = useState(false);

  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [headerData, setHeaderData] = useState({
    no_dokumen: "", level_dokumen: "", revisi: "", tgl_berlaku: "",
    wilayah: "", unit: "", project: "", dibuat_oleh: "", diperiksa_oleh: "", tanggal: ""
  });

  const [formData, setFormData] = useState({
    kode_id: "", bahaya: "", penjelasan_kontrol: "", referensi_kontrol: "", efektivitas: "T", posisi_pj_kontrol: "",
    penjelasan_risiko: "", c_probabilitas: 0, c_dampak: 0, penjelasan_tindak_lanjut: "", referensi_tindak_lanjut: "",
    posisi_pj_tindak_lanjut: "", tanggal_selesai: "", e_probabilitas: 0, e_dampak: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('ibppr_header').select('*').order('created_at', { ascending: false });
      setProjects(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHeader(true);
    try {
      const { error } = await supabase.from('ibppr_header').insert([headerData]);
      if (error) throw new Error(error.message);
      alert("Proyek IBPR Baru Berhasil Dibuat!");
      setIsHeaderOpen(false);
      setHeaderData({ no_dokumen: "", level_dokumen: "", revisi: "", tgl_berlaku: "", wilayah: "", unit: "", project: "", dibuat_oleh: "", diperiksa_oleh: "", tanggal: "" });
      fetchProjects();
    } catch (error: any) {
      alert("Terjadi kesalahan sistem: " + error.message);
    } finally {
      setIsSubmittingHeader(false);
    }
  };

  const openProjectDetail = (project: any) => {
    setSelectedProject(project);
    fetchHazards(project.id);
    setViewMode('detail');
  };

  const fetchHazards = async (headerId: number) => {
    try {
      const { data } = await supabase.from('ibppr').select('*').eq('header_id', headerId).order('created_at', { ascending: false });
      setHazards(data || []);
    } catch (error) { }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData({
      kode_id: "", bahaya: "", penjelasan_kontrol: "", referensi_kontrol: "", efektivitas: "T", posisi_pj_kontrol: "",
      penjelasan_risiko: "", c_probabilitas: 0, c_dampak: 0, penjelasan_tindak_lanjut: "", referensi_tindak_lanjut: "",
      posisi_pj_tindak_lanjut: "", tanggal_selesai: "", e_probabilitas: 0, e_dampak: 0
    });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, header_id: selectedProject.id };
      if (editId) {
        const { error } = await supabase.from('ibppr').update(payload).eq('id', editId);
        if (error) throw new Error(error.message);
        alert("Data IBPR berhasil diperbarui!");
      } else {
        const { error } = await supabase.from('ibppr').insert([payload]);
        if (error) throw new Error(error.message);
        alert("Data IBPR ditambahkan!");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchHazards(selectedProject.id);
    } catch (error: any) {
      alert("Terjadi kesalahan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (row: any) => {
    setFormData({ ...row });
    setEditId(row.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    try {
      await supabase.from('ibppr').delete().eq('id', id);
      fetchHazards(selectedProject.id);
    } catch (error: any) {
      alert("Gagal menghapus data!");
    }
  };

  // --- FUNGSI EXPORT KE EXCEL DENGAN EXCELJS (MENYIMPAN WARNA & MERGER SEL) ---
  const exportToExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Data_IBPR", { views: [{ showGridLines: true }] });

      // Setup Lebar Kolom
      ws.columns = [
        { width: 8 }, { width: 25 }, { width: 35 }, { width: 20 }, // A-D
        { width: 5 }, { width: 5 }, { width: 5 }, { width: 20 }, // E-H
        { width: 25 }, { width: 8 }, { width: 8 }, { width: 10 }, // I-L
        { width: 35 }, { width: 20 }, { width: 20 }, { width: 15 }, // M-P
        { width: 8 }, { width: 8 }, { width: 10 }                 // Q-S
      ];

      // Baris Header 1
      const row1 = ws.addRow([
        'A. IDENTIFIKASI BAHAYA', '', 'B. KONTROL YANG ADA', '', '', '', '', '',
        'C. PENILAIAN RISIKO', '', '', '', 'D. RENCANA TINDAK LANJUT', '', '', '',
        'E. PENILAIAN RISIKO SETELAH TINDAK LANJUT', '', ''
      ]);
      ws.mergeCells('A1:B1'); ws.mergeCells('C1:H1'); ws.mergeCells('I1:L1'); ws.mergeCells('M1:P1'); ws.mergeCells('Q1:S1');

      // Baris Header 2
      const row2 = ws.addRow([
        '(1)\nID', '(2)\nBAHAYA', '(1)\nPENJELASAN KONTROL', '(2)\nREFERENSI', '(3)\nEFEKTIVITAS', '', '', '(4)\nPIC',
        '(1)\nPENJELASAN RISIKO', '(2)\nPROB', '(3)\nDAMPAK', '(4)\nNILAI', '(1)\nRENCANA TINDAK LANJUT', '(2)\nREFERENSI',
        '(3)\nPIC', '(4)\nTGL SELESAI', '(1)\nPROB', '(2)\nDAMPAK', '(3)\nNILAI'
      ]);
      ws.mergeCells('A2:A3'); ws.mergeCells('B2:B3'); ws.mergeCells('C2:C3'); ws.mergeCells('D2:D3');
      ws.mergeCells('E2:G2'); // Merge Efektivitas T,S,R
      ws.mergeCells('H2:H3'); ws.mergeCells('I2:I3'); ws.mergeCells('J2:J3'); ws.mergeCells('K2:K3'); ws.mergeCells('L2:L3');
      ws.mergeCells('M2:M3'); ws.mergeCells('N2:N3'); ws.mergeCells('O2:O3'); ws.mergeCells('P2:P3');
      ws.mergeCells('Q2:Q3'); ws.mergeCells('R2:R3'); ws.mergeCells('S2:S3');

      // Baris Header 3
      const row3 = ws.addRow(['', '', '', '', 'T', 'S', 'R', '', '', '', '', '', '', '', '', '', '', '', '']);

      // Styling Headers
      [row1, row2, row3].forEach((row, i) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { bold: true, name: 'Arial', size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      // Warna Header
      row1.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }; }); // Orange Muda
      row2.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Biru Muda
      ['E', 'F', 'G'].forEach(col => {
        row3.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      });
      ['L', 'S'].forEach(col => {
        row2.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Abu-abu
      });

      // Insert Data ke Excel
      hazards.forEach((row) => {
        const cRiskVal = getRiskValue(row.c_probabilitas, row.c_dampak);
        const eRiskVal = getRiskValue(row.e_probabilitas, row.e_dampak);

        const r = ws.addRow([
          row.kode_id, row.bahaya, row.penjelasan_kontrol, row.referensi_kontrol,
          row.efektivitas === 'T' ? 'V' : '', row.efektivitas === 'S' ? 'V' : '', row.efektivitas === 'R' ? 'V' : '',
          row.posisi_pj_kontrol, row.penjelasan_risiko, row.c_probabilitas, row.c_dampak, cRiskVal,
          row.penjelasan_tindak_lanjut, row.referensi_tindak_lanjut, row.posisi_pj_tindak_lanjut, row.tanggal_selesai,
          row.e_probabilitas, row.e_dampak, eRiskVal
        ]);

        r.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });

        // Center alignment untuk kolom angka/nilai
        ['A', 'E', 'F', 'G', 'J', 'K', 'L', 'Q', 'R', 'S'].forEach(col => {
          r.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Warnai Cell Risiko Awal (Kolom L)
        const cColor = getExcelRiskColor(row.c_probabilitas, row.c_dampak);
        const cellL = r.getCell('L');
        cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cColor.bg } };
        cellL.font = { bold: true, color: { argb: cColor.font }, name: 'Arial', size: 9 };

        // Warnai Cell Risiko Akhir (Kolom S)
        const eColor = getExcelRiskColor(row.e_probabilitas, row.e_dampak);
        const cellS = r.getCell('S');
        cellS.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: eColor.bg } };
        cellS.font = { bold: true, color: { argb: eColor.font }, name: 'Arial', size: 9 };
      });

      // Proses Download File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IBPR_${selectedProject?.project || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Gagal mengekspor file Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.project?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.wilayah?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewMode === 'list') {
    return (
      <div className="p-4 md:p-6 space-y-6 min-h-screen bg-[#f8f9fa]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dokumen IBPR</h1>
            <p className="text-sm text-slate-500 mt-1">Identifikasi Bahaya dan Penilaian Risiko per Proyek</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <Input
                type="text"
                placeholder="Cari nama proyek / wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 h-10 w-full rounded-lg"
              />
            </div>

            <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
              <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 h-10 min-w-[160px] shadow-sm transition-all">
                <Plus size={16} /> Buat Proyek Baru
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[700px] p-6 rounded-xl bg-white">
                <DialogHeader><DialogTitle>Buat Dokumen IBPR Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleHeaderSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Nama Project (Wajib)" name="project" value={headerData.project} onChange={handleHeaderChange} className="md:col-span-2" required />
                    <Input placeholder="Wilayah" name="wilayah" value={headerData.wilayah} onChange={handleHeaderChange} />
                    <Input placeholder="Unit" name="unit" value={headerData.unit} onChange={handleHeaderChange} />
                    <Input placeholder="No Kode Dokumen" name="no_dokumen" value={headerData.no_dokumen} onChange={handleHeaderChange} />
                    <Input placeholder="Level Dokumen" name="level_dokumen" value={headerData.level_dokumen} onChange={handleHeaderChange} />
                    <Input placeholder="Revisi Ke" name="revisi" value={headerData.revisi} onChange={handleHeaderChange} />
                    <Input placeholder="Tgl Berlaku" name="tgl_berlaku" value={headerData.tgl_berlaku} onChange={handleHeaderChange} />
                    <Input placeholder="Dibuat Oleh" name="dibuat_oleh" value={headerData.dibuat_oleh} onChange={handleHeaderChange} />
                    <Input placeholder="Diperiksa Oleh" name="diperiksa_oleh" value={headerData.diperiksa_oleh} onChange={handleHeaderChange} />
                    <Input placeholder="Tanggal" name="tanggal" value={headerData.tanggal} onChange={handleHeaderChange} className="md:col-span-2" />
                  </div>
                  <Button type="submit" disabled={isSubmittingHeader} className="w-full bg-blue-600 text-white">{isSubmittingHeader ? "Menyimpan..." : "Simpan Proyek"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Memuat data proyek...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 shadow-sm flex flex-col items-center">
            <FolderOpen size={48} className="text-slate-300 mb-3" />
            <p>Tidak ada proyek yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => openProjectDetail(proj)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <FolderOpen size={20} />
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-wider">{proj.no_dokumen || 'NO-DOC'}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                  {proj.project || 'Proyek Tanpa Nama'}
                </h3>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> Wilayah: <span className="font-medium text-slate-700">{proj.wilayah || '-'}</span></div>
                  <div className="flex items-center gap-2"><Building size={14} className="text-slate-400" /> Unit: <span className="font-medium text-slate-700">{proj.unit || '-'}</span></div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Tgl Berlaku: <span className="font-medium text-slate-700">{proj.tgl_berlaku || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-white print:p-0 print:m-0 print:space-y-2">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => setViewMode('list')} variant="outline" className="h-9 w-9 p-0 rounded-full bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm" title="Kembali">
            <ArrowLeft size={16} className="text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Detail IBPR</h1>
            <p className="text-sm font-medium text-blue-600">{selectedProject?.project}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()} variant="outline" className="w-9 h-9 p-0 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100" title="Cetak PDF"><Printer size={16} /></Button>
          <Button onClick={exportToExcel} disabled={isExportingExcel} variant="outline" className="w-9 h-9 p-0 flex items-center justify-center bg-green-50 text-green-700 hover:bg-green-100 border-green-200" title="Export ke Excel">
            <FileSpreadsheet size={16} />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Plus size={16} /> Tambah Data</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 md:p-8 rounded-xl bg-slate-50">
              <DialogHeader><DialogTitle>{editId ? "Edit Risiko IBPR" : "Tambah Risiko IBPR"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><Input placeholder="ID (Contoh: R-01)" name="kode_id" value={formData.kode_id} onChange={handleChange} required /><Input placeholder="Bahaya" name="bahaya" value={formData.bahaya} onChange={handleChange} required /></div>
                <Textarea placeholder="Penjelasan Kontrol" name="penjelasan_kontrol" value={formData.penjelasan_kontrol} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4"><Input placeholder="Referensi Kontrol" name="referensi_kontrol" value={formData.referensi_kontrol} onChange={handleChange} /><select name="efektivitas" value={formData.efektivitas} onChange={handleChange} className="border p-2 rounded bg-white"><option value="T">T (Tinggi)</option><option value="S">S (Sedang)</option><option value="R">R (Rendah)</option></select><Input placeholder="PIC Kontrol" name="posisi_pj_kontrol" value={formData.posisi_pj_kontrol} onChange={handleChange} /></div>
                <Textarea placeholder="Penjelasan Risiko" name="penjelasan_risiko" value={formData.penjelasan_risiko} onChange={handleChange} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Probabilitas Awal (1-5)</label><Input type="number" min="1" max="5" name="c_probabilitas" value={formData.c_probabilitas} onChange={handleChange} required /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Dampak Awal (1-5)</label><Input type="number" min="1" max="5" name="c_dampak" value={formData.c_dampak} onChange={handleChange} required /></div>
                </div>

                <Textarea placeholder="Rencana Tindak Lanjut" name="penjelasan_tindak_lanjut" value={formData.penjelasan_tindak_lanjut} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4"><Input placeholder="Referensi TL" name="referensi_tindak_lanjut" value={formData.referensi_tindak_lanjut} onChange={handleChange} /><Input placeholder="PIC TL" name="posisi_pj_tindak_lanjut" value={formData.posisi_pj_tindak_lanjut} onChange={handleChange} /><Input type="date" name="tanggal_selesai" value={formData.tanggal_selesai} onChange={handleChange} /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Probabilitas Akhir (1-5)</label><Input type="number" min="1" max="5" name="e_probabilitas" value={formData.e_probabilitas} onChange={handleChange} required /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Dampak Akhir (1-5)</label><Input type="number" min="1" max="5" name="e_dampak" value={formData.e_dampak} onChange={handleChange} required /></div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{isSubmitting ? "Menyimpan..." : "Simpan Data"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border-2 border-black p-0 text-xs md:text-sm font-semibold overflow-x-auto mt-6 print:mt-0 print:border-collapse print:w-full">
        <div className="min-w-[800px] print:min-w-full">
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-2 border-r-2 border-black p-4 flex items-center justify-center print:p-2">
              <div className="text-blue-800 font-bold text-xl italic tracking-tighter">KAI <span className="text-orange-500 text-sm not-italic block mt-[-5px]">Properti</span></div>
            </div>
            <div className="col-span-7 border-r-2 border-black p-4 flex items-center justify-center text-lg text-center uppercase print:text-sm print:p-2">IDENTIFIKASI BAHAYA DAN PENILAIAN RISIKO (IBPR)</div>
            <div className="col-span-3 p-2 text-[10px] flex flex-col justify-center space-y-1">
              <div className="grid grid-cols-2"><span>NO. KODE DOKUMEN</span><span>: {selectedProject?.no_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>LEVEL DOKUMEN</span><span>: {selectedProject?.level_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>REVISI KE</span><span>: {selectedProject?.revisi}</span></div>
              <div className="grid grid-cols-2"><span>TGL MULAI BERLAKU</span><span>: {selectedProject?.tgl_berlaku}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-12 text-[11px]">
            <div className="col-span-6 border-r-2 border-black p-2 space-y-1">
              <div className="grid grid-cols-4"><span className="col-span-1">WILAYAH</span><span className="col-span-3">: {selectedProject?.wilayah}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">UNIT</span><span className="col-span-3">: {selectedProject?.unit}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">PROJECT</span><span className="col-span-3">: {selectedProject?.project}</span></div>
            </div>
            <div className="col-span-6 p-2 space-y-1">
              <div className="grid grid-cols-4"><span className="col-span-1">Dibuat oleh</span><span className="col-span-3">: {selectedProject?.dibuat_oleh}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">Diperiksa oleh</span><span className="col-span-3">: {selectedProject?.diperiksa_oleh}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">Tanggal</span><span className="col-span-3">: {selectedProject?.tanggal}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-table-container w-full overflow-x-auto rounded-none border-2 border-black shadow-sm print:shadow-none print:border-none">
        <Table className="min-w-[1500px] border-collapse text-xs print:min-w-full">
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead colSpan={2} className="border-2 border-black text-center font-bold text-black py-4 print:py-1">A. IDENTIFIKASI BAHAYA</TableHead>
              <TableHead colSpan={6} className="border-2 border-black text-center font-bold text-black py-4 print:py-1">B. KONTROL YANG ADA</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4 print:py-1">C. PENILAIAN RISIKO</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4 print:py-1">D. RENCANA TINDAK LANJUT</TableHead>
              <TableHead colSpan={3} className="border-2 border-black text-center font-bold text-black py-4 print:py-1">E. PENILAIAN RISIKO SETELAH TINDAK LANJUT</TableHead>
              <TableHead rowSpan={3} className="no-print border-2 border-black text-center font-bold text-black bg-slate-200 w-[80px]">AKSI</TableHead>
            </TableRow>
            <TableRow className="bg-orange-50 text-center font-bold text-black">
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[60px] align-top p-1">(1)<br />ID</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[150px] align-top p-1">(2)<br />BAHAYA</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[200px] align-top p-1">(1)<br />PENJELASAN KONTROL</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[120px] align-top p-1">(2)<br />REFERENSI</TableHead>
              <TableHead colSpan={3} className="border-2 border-black text-center p-1 bg-blue-100">(3)<br />EFEKTIVITAS</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[80px] align-top p-1 bg-blue-100">(4)<br />PIC</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[150px] align-top p-1">(1)<br />PENJELASAN RISIKO</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[40px] align-top p-1">(2)<br />PROB</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[40px] align-top p-1">(3)<br />DAMPAK</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[45px] align-top p-1 bg-slate-200">(4)<br />NILAI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[200px] align-top p-1">(1)<br />RENCANA TINDAK LANJUT</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[120px] align-top p-1">(2)<br />REFERENSI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[80px] align-top p-1">(3)<br />PIC</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[80px] align-top p-1">(4)<br />TGL SELESAI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[40px] align-top p-1">(1)<br />PROB</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[40px] align-top p-1">(2)<br />DAMPAK</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[45px] align-top p-1 bg-slate-200">(3)<br />NILAI</TableHead>
            </TableRow>
            <TableRow className="bg-blue-100 text-center font-bold text-black">
              <TableHead className="border-2 border-black text-center w-[25px] p-1">T</TableHead>
              <TableHead className="border-2 border-black text-center w-[25px] p-1">S</TableHead>
              <TableHead className="border-2 border-black text-center w-[25px] p-1">R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hazards.map((row) => {
              const cRisk = getRiskStyles(row.c_probabilitas, row.c_dampak);
              const eRisk = getRiskStyles(row.e_probabilitas, row.e_dampak);

              return (
                <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="border-2 border-black p-1 text-center font-medium">{row.kode_id}</TableCell>
                  <TableCell className="border-2 border-black p-1">{row.bahaya}</TableCell>
                  <TableCell className="border-2 border-black p-1">{row.penjelasan_kontrol}</TableCell>
                  <TableCell className="border-2 border-black p-1">{row.referensi_kontrol}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center font-bold text-blue-600">{row.efektivitas === 'T' ? 'V' : ''}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center font-bold text-blue-600">{row.efektivitas === 'S' ? 'V' : ''}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center font-bold text-blue-600">{row.efektivitas === 'R' ? 'V' : ''}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.posisi_pj_kontrol}</TableCell>
                  <TableCell className="border-2 border-black p-1">{row.penjelasan_risiko}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.c_probabilitas}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.c_dampak}</TableCell>
                  <TableCell
                    className={`border-2 border-black p-1 text-center transition-colors ${cRisk.className}`}
                    style={{ backgroundColor: cRisk.bgColor }}
                  >
                    {getRiskValue(row.c_probabilitas, row.c_dampak)}
                  </TableCell>

                  <TableCell className="border-2 border-black p-1">{row.penjelasan_tindak_lanjut}</TableCell>
                  <TableCell className="border-2 border-black p-1">{row.referensi_tindak_lanjut}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.posisi_pj_tindak_lanjut}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.tanggal_selesai}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.e_probabilitas}</TableCell>
                  <TableCell className="border-2 border-black p-1 text-center">{row.e_dampak}</TableCell>
                  <TableCell
                    className={`border-2 border-black p-1 text-center transition-colors ${eRisk.className}`}
                    style={{ backgroundColor: eRisk.bgColor }}
                  >
                    {getRiskValue(row.e_probabilitas, row.e_dampak)}
                  </TableCell>

                  <TableCell className="no-print border-2 border-black p-1 text-center">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <Button onClick={() => handleEditClick(row)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 border-blue-200" title="Edit Data"><Edit size={14} className="text-blue-600" /></Button>
                      <Button onClick={() => handleDelete(row.id)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 border-red-200" title="Hapus Data"><Trash2 size={14} className="text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}