"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Printer, Settings, FileSpreadsheet, Edit, Trash2, 
  Search, FolderOpen, ArrowLeft, Calendar, MapPin, Building
} from "lucide-react";

export default function IbprPage() {
  // STATE VIEW: 'list' (Daftar Proyek) atau 'detail' (Tabel Isi IBPR)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  // STATE MASTER (PROYEK)
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmittingHeader, setIsSubmittingHeader] = useState(false);
  
  // STATE DETAIL (RISIKO)
  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

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

  // --- FUNGSI MASTER (PROYEK) ---
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
      // 1. TAMBAHKAN PENANGKAP ERROR DI SINI
      const { error } = await supabase.from('ibppr_header').insert([headerData]);
      
      if (error) {
        alert("GAGAL MEMBUAT PROYEK:\n" + error.message);
        console.log("Detail Error:", error);
        setIsSubmittingHeader(false);
        return; // Hentikan proses jika gagal
      }

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

  // --- FUNGSI DETAIL (RISIKO / HAZARD) ---
  const fetchHazards = async (headerId: number) => {
    try {
      // Mengambil data berdasarkan header_id proyek yang dipilih
      const { data } = await supabase.from('ibppr').select('*').eq('header_id', headerId).order('created_at', { ascending: false });
      setHazards(data || []);
    } catch (error) {}
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
      const payload = { ...formData, header_id: selectedProject.id }; // Mengikat data dengan ID Proyek

      if (editId) {
        // PENGECEKAN ERROR UNTUK EDIT
        const { error } = await supabase.from('ibppr').update(payload).eq('id', editId);
        if (error) {
          alert("GAGAL UPDATE IBPR:\n" + error.message);
          console.error("Detail Error:", error);
          setIsSubmitting(false);
          return; // Hentikan proses
        }
        alert("Data IBPR berhasil diperbarui!");
      } else {
        // PENGECEKAN ERROR UNTUK TAMBAH BARU
        const { error } = await supabase.from('ibppr').insert([payload]);
        if (error) {
          alert("GAGAL SIMPAN IBPR:\n" + error.message);
          console.error("Detail Error:", error);
          setIsSubmitting(false);
          return; // Hentikan proses
        }
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
    setFormData({
      kode_id: row.kode_id, bahaya: row.bahaya, penjelasan_kontrol: row.penjelasan_kontrol, 
      referensi_kontrol: row.referensi_kontrol, efektivitas: row.efektivitas, posisi_pj_kontrol: row.posisi_pj_kontrol,
      penjelasan_risiko: row.penjelasan_risiko, c_probabilitas: row.c_probabilitas, c_dampak: row.c_dampak, 
      penjelasan_tindak_lanjut: row.penjelasan_tindak_lanjut, referensi_tindak_lanjut: row.referensi_tindak_lanjut, 
      posisi_pj_tindak_lanjut: row.posisi_pj_tindak_lanjut, tanggal_selesai: row.tanggal_selesai, 
      e_probabilitas: row.e_probabilitas, e_dampak: row.e_dampak
    });
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

  const exportToExcel = () => {
    const exportData = hazards.map((row, index) => ({
      "No": index + 1, "ID Bahaya": row.kode_id, "Bahaya (UA/UC)": row.bahaya,
      "Penjelasan Kontrol": row.penjelasan_kontrol, "Referensi Kontrol": row.referensi_kontrol,
      "Efektivitas": row.efektivitas, "PIC Kontrol": row.posisi_pj_kontrol,
      "Penjelasan Risiko": row.penjelasan_risiko, "Probabilitas Awal": row.c_probabilitas,
      "Dampak Awal": row.c_dampak, "Nilai Risiko Awal": row.c_nilai_risiko,
      "Rencana Tindak Lanjut": row.penjelasan_tindak_lanjut, "Referensi TL": row.referensi_tindak_lanjut,
      "PIC TL": row.posisi_pj_tindak_lanjut, "Tgl Selesai": row.tanggal_selesai,
      "Probabilitas Akhir": row.e_probabilitas, "Dampak Akhir": row.e_dampak, "Nilai Risiko Akhir": row.e_nilai_risiko
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_IBPR");
    XLSX.writeFile(wb, `IBPR_${selectedProject.project}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filter Search
  const filteredProjects = projects.filter(p => 
    p.project?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.wilayah?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==========================================
  // VIEW 1: DAFTAR PROYEK (MENU SEARCH & KARTU)
  // ==========================================
  if (viewMode === 'list') {
    return (
      <div className="p-4 md:p-6 space-y-6 min-h-screen bg-[#f8f9fa]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dokumen IBPR</h1>
            <p className="text-sm text-slate-500 mt-1">Identifikasi Bahaya dan Penilaian Risiko per Proyek</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* FITUR SEARCH BAR */}
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
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> Wilayah: <span className="font-medium text-slate-700">{proj.wilayah || '-'}</span></div>
                  <div className="flex items-center gap-2"><Building size={14} className="text-slate-400"/> Unit: <span className="font-medium text-slate-700">{proj.unit || '-'}</span></div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> Tgl Berlaku: <span className="font-medium text-slate-700">{proj.tgl_berlaku || '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DETAIL IBPR (TABEL HAZARD)
  // ==========================================
  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-white print:p-0 print:m-0">
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
          <Button onClick={exportToExcel} variant="outline" className="w-9 h-9 p-0 flex items-center justify-center bg-green-50 text-green-700 hover:bg-green-100 border-green-200" title="Export ke Excel"><FileSpreadsheet size={16} /></Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Plus size={16} /> Tambah Data IBPR</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 md:p-8 rounded-xl bg-slate-50">
              <DialogHeader><DialogTitle>{editId ? "Edit Risiko IBPR" : "Tambah Risiko IBPR"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><Input placeholder="ID (Contoh: R-01)" name="kode_id" value={formData.kode_id} onChange={handleChange} required /><Input placeholder="Bahaya" name="bahaya" value={formData.bahaya} onChange={handleChange} required /></div>
                <Textarea placeholder="Penjelasan Kontrol" name="penjelasan_kontrol" value={formData.penjelasan_kontrol} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4"><Input placeholder="Referensi Kontrol" name="referensi_kontrol" value={formData.referensi_kontrol} onChange={handleChange} /><select name="efektivitas" value={formData.efektivitas} onChange={handleChange} className="border p-2 rounded bg-white"><option value="T">T (Tinggi)</option><option value="S">S (Sedang)</option><option value="R">R (Rendah)</option></select><Input placeholder="PIC Kontrol" name="posisi_pj_kontrol" value={formData.posisi_pj_kontrol} onChange={handleChange} /></div>
                <Textarea placeholder="Penjelasan Risiko" name="penjelasan_risiko" value={formData.penjelasan_risiko} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4"><Input type="number" placeholder="Probabilitas Awal (1-5)" name="c_probabilitas" value={formData.c_probabilitas} onChange={handleChange} required /><Input type="number" placeholder="Dampak Awal (1-5)" name="c_dampak" value={formData.c_dampak} onChange={handleChange} required /></div>
                <Textarea placeholder="Rencana Tindak Lanjut" name="penjelasan_tindak_lanjut" value={formData.penjelasan_tindak_lanjut} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4"><Input placeholder="Referensi TL" name="referensi_tindak_lanjut" value={formData.referensi_tindak_lanjut} onChange={handleChange} /><Input placeholder="PIC TL" name="posisi_pj_tindak_lanjut" value={formData.posisi_pj_tindak_lanjut} onChange={handleChange} /><Input type="date" name="tanggal_selesai" value={formData.tanggal_selesai} onChange={handleChange} /></div>
                <div className="grid grid-cols-2 gap-4"><Input type="number" placeholder="Probabilitas Akhir (1-5)" name="e_probabilitas" value={formData.e_probabilitas} onChange={handleChange} required /><Input type="number" placeholder="Dampak Akhir (1-5)" name="e_dampak" value={formData.e_dampak} onChange={handleChange} required /></div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{isSubmitting ? "Menyimpan..." : "Simpan Data"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KOP DOKUMEN CETAK (Mengambil data dari selectedProject) */}
      <div className="border-2 border-black p-0 text-xs md:text-sm font-semibold overflow-x-auto print:border-collapse mt-6">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-2 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="text-blue-800 font-bold text-xl italic tracking-tighter">KAI <span className="text-orange-500 text-sm not-italic block mt-[-5px]">Properti</span></div>
            </div>
            <div className="col-span-7 border-r-2 border-black p-4 flex items-center justify-center text-lg text-center uppercase">IDENTIFIKASI BAHAYA DAN PENILAIAN RISIKO (IBPR)</div>
            <div className="col-span-3 p-2 text-xs flex flex-col justify-center space-y-1">
              <div className="grid grid-cols-2"><span>NO. KODE DOKUMEN</span><span>: {selectedProject?.no_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>LEVEL DOKUMEN</span><span>: {selectedProject?.level_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>REVISI KE</span><span>: {selectedProject?.revisi}</span></div>
              <div className="grid grid-cols-2"><span>TGL MULAI BERLAKU</span><span>: {selectedProject?.tgl_berlaku}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-12 text-xs">
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

      {/* TABEL RISIKO */}
      <div className="w-full overflow-x-auto rounded-none border-2 border-black shadow-sm">
        <Table className="min-w-[1800px] border-collapse text-xs">
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead colSpan={2} className="border-2 border-black text-center font-bold text-black py-4">A. IDENTIFIKASI BAHAYA</TableHead>
              <TableHead colSpan={6} className="border-2 border-black text-center font-bold text-black py-4">B. KONTROL YANG ADA</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4">C. PENILAIAN RISIKO</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4">D. RENCANA TINDAK LANJUT</TableHead>
              <TableHead colSpan={3} className="border-2 border-black text-center font-bold text-black py-4">E. PENILAIAN RISIKO SETELAH TINDAK LANJUT</TableHead>
              <TableHead rowSpan={3} className="no-print border-2 border-black text-center font-bold text-black bg-slate-200 w-[80px]">AKSI</TableHead>
            </TableRow>
            <TableRow className="bg-orange-50 text-center font-bold text-black">
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[100px] align-top p-2">(1)<br/>ID</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[200px] align-top p-2">(2)<br/>BAHAYA</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[250px] align-top p-2">(1)<br/>PENJELASAN KONTROL</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[150px] align-top p-2">(2)<br/>REFERENSI</TableHead>
              <TableHead colSpan={3} className="border-2 border-black text-center p-1 bg-blue-100">(3)<br/>EFEKTIVITA</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[100px] align-top p-2 bg-blue-100">(4)<br/>PIC</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[200px] align-top p-2">(1)<br/>PENJELASAN RISIKO</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2">(2)<br/>PROB</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2">(3)<br/>DAMPAK</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2 bg-orange-200">(4)<br/>NILAI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[250px] align-top p-2">(1)<br/>RENCANA TINDAK LANJUT</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[150px] align-top p-2">(2)<br/>REFERENSI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[100px] align-top p-2">(3)<br/>PIC</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[100px] align-top p-2">(4)<br/>TGL SELESAI</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2">(1)<br/>PROB</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2">(2)<br/>DAMPAK</TableHead>
              <TableHead rowSpan={2} className="border-2 border-black text-center w-[50px] align-top p-2 bg-yellow-200">(3)<br/>NILAI</TableHead>
            </TableRow>
            <TableRow className="bg-blue-100 text-center font-bold text-black">
              <TableHead className="border-2 border-black text-center w-[30px] p-1">T</TableHead>
              <TableHead className="border-2 border-black text-center w-[30px] p-1">S</TableHead>
              <TableHead className="border-2 border-black text-center w-[30px] p-1">R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hazards.map((row) => (
              <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="border-2 border-black p-2 font-medium">{row.kode_id}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.bahaya}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.penjelasan_kontrol}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.referensi_kontrol}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold">{row.efektivitas === 'T' ? 'V' : ''}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold">{row.efektivitas === 'S' ? 'V' : ''}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold">{row.efektivitas === 'R' ? 'V' : ''}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.posisi_pj_kontrol}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.penjelasan_risiko}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.c_probabilitas}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.c_dampak}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold bg-orange-200/50">{row.c_nilai_risiko}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.penjelasan_tindak_lanjut}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.referensi_tindak_lanjut}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.posisi_pj_tindak_lanjut}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.tanggal_selesai}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.e_probabilitas}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.e_dampak}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold bg-yellow-200/50">{row.e_nilai_risiko}</TableCell>
                
                <TableCell className="no-print border-2 border-black p-2 text-center">
                  <div className="flex flex-col gap-1 items-center justify-center">
                    <Button onClick={() => handleEditClick(row)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 border-blue-200" title="Edit Data"><Edit size={14} className="text-blue-600" /></Button>
                    <Button onClick={() => handleDelete(row.id)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 border-red-200" title="Hapus Data"><Trash2 size={14} className="text-red-600" /></Button>
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