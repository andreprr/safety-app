"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Printer, Settings, FileSpreadsheet, Edit, Trash2 } from "lucide-react";

export default function IbpprPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State khusus untuk menampung ID saat proses Edit
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
    fetchHeader();
    fetchData();
  }, []);

  const fetchHeader = async () => {
    try {
      const { data: hData } = await supabase.from('ibppr_header').select('*').eq('id', 1).single();
      if (hData) setHeaderData(hData);
    } catch (error) {}
  };

  const fetchData = async () => {
    try {
      const { data: ibpprData } = await supabase.from('ibppr').select('*').order('created_at', { ascending: false });
      setData(ibpprData || []);
    } catch (error) {} finally { setLoading(false); }
  };

  const exportToExcel = () => {
    const exportData = data.map((row, index) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, "Data_IBPPR");
    XLSX.writeFile(wb, `Data_IBPPR_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetForm = () => {
    setFormData({
      kode_id: "", bahaya: "", penjelasan_kontrol: "", referensi_kontrol: "", efektivitas: "T", posisi_pj_kontrol: "",
      penjelasan_risiko: "", c_probabilitas: 0, c_dampak: 0, penjelasan_tindak_lanjut: "", referensi_tindak_lanjut: "", 
      posisi_pj_tindak_lanjut: "", tanggal_selesai: "", e_probabilitas: 0, e_dampak: 0
    });
    setEditId(null);
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleHeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await supabase.from('ibppr_header').update(headerData).eq('id', 1);
    alert("Header diperbarui!");
    setIsHeaderOpen(false);
    fetchHeader();
    setIsSubmitting(false);
  };

  // Fungsi Tambah & Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        // Mode Edit
        await supabase.from('ibppr').update(formData).eq('id', editId);
        alert("Data IBPPR berhasil diperbarui!");
      } else {
        // Mode Tambah Baru
        await supabase.from('ibppr').insert([formData]);
        alert("Data IBPPR ditambahkan!");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData(); 
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
      fetchData();
    } catch (error: any) {
      alert("Gagal menghapus data!");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-white print:p-0 print:m-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data IBPPR</h1>
        
        <div className="flex flex-wrap gap-2">
          
          {/* TOMBOL PDF & EXCEL HANYA ICON */}
          <Button onClick={() => window.print()} variant="outline" className="w-9 h-9 p-0 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100" title="Cetak PDF">
            <Printer size={16} />
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="w-9 h-9 p-0 flex items-center justify-center bg-green-50 text-green-700 hover:bg-green-100 border-green-200" title="Export ke Excel">
            <FileSpreadsheet size={16} />
          </Button>
          
          <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
            <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Settings size={16} /> Atur Kop</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[700px] p-6 rounded-xl bg-white">
              <DialogHeader><DialogTitle>Pengaturan Kop Proyek</DialogTitle></DialogHeader>
              <form onSubmit={handleHeaderSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Wilayah" name="wilayah" value={headerData.wilayah} onChange={handleHeaderChange} />
                  <Input placeholder="Unit" name="unit" value={headerData.unit} onChange={handleHeaderChange} />
                  <Input placeholder="Nama Project" name="project" value={headerData.project} onChange={handleHeaderChange} className="md:col-span-2" />
                  <Input placeholder="No Kode Dokumen" name="no_dokumen" value={headerData.no_dokumen} onChange={handleHeaderChange} />
                  <Input placeholder="Level Dokumen" name="level_dokumen" value={headerData.level_dokumen} onChange={handleHeaderChange} />
                  <Input placeholder="Revisi Ke" name="revisi" value={headerData.revisi} onChange={handleHeaderChange} />
                  <Input placeholder="Tgl Berlaku" name="tgl_berlaku" value={headerData.tgl_berlaku} onChange={handleHeaderChange} />
                  <Input placeholder="Dibuat Oleh" name="dibuat_oleh" value={headerData.dibuat_oleh} onChange={handleHeaderChange} />
                  <Input placeholder="Diperiksa Oleh" name="diperiksa_oleh" value={headerData.diperiksa_oleh} onChange={handleHeaderChange} />
                  <Input placeholder="Tanggal Berlaku" name="tanggal" value={headerData.tanggal} onChange={handleHeaderChange} className="md:col-span-2" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 text-white">{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Plus size={16} /> Tambah Data</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 md:p-8 rounded-xl bg-slate-50">
              <DialogHeader><DialogTitle>{editId ? "Edit Risiko IBPPR" : "Tambah Risiko IBPPR"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><Input placeholder="ID (Contoh: R-01)" name="kode_id" value={formData.kode_id} onChange={handleChange} required /><Input placeholder="Bahaya" name="bahaya" value={formData.bahaya} onChange={handleChange} required /></div>
                <Textarea placeholder="Penjelasan Kontrol" name="penjelasan_kontrol" value={formData.penjelasan_kontrol} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4">
                  <Input placeholder="Referensi Kontrol" name="referensi_kontrol" value={formData.referensi_kontrol} onChange={handleChange} />
                  <select name="efektivitas" value={formData.efektivitas} onChange={handleChange} className="border p-2 rounded bg-white"><option value="T">T (Tinggi)</option><option value="S">S (Sedang)</option><option value="R">R (Rendah)</option></select>
                  <Input placeholder="PIC Kontrol" name="posisi_pj_kontrol" value={formData.posisi_pj_kontrol} onChange={handleChange} />
                </div>
                <Textarea placeholder="Penjelasan Risiko" name="penjelasan_risiko" value={formData.penjelasan_risiko} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4"><Input type="number" placeholder="Probabilitas Awal (1-5)" name="c_probabilitas" value={formData.c_probabilitas} onChange={handleChange} required /><Input type="number" placeholder="Dampak Awal (1-5)" name="c_dampak" value={formData.c_dampak} onChange={handleChange} required /></div>
                <Textarea placeholder="Rencana Tindak Lanjut" name="penjelasan_tindak_lanjut" value={formData.penjelasan_tindak_lanjut} onChange={handleChange} />
                <div className="grid grid-cols-3 gap-4"><Input placeholder="Referensi TL" name="referensi_tindak_lanjut" value={formData.referensi_tindak_lanjut} onChange={handleChange} /><Input placeholder="PIC TL" name="posisi_pj_tindak_lanjut" value={formData.posisi_pj_tindak_lanjut} onChange={handleChange} /><Input type="date" name="tanggal_selesai" value={formData.tanggal_selesai} onChange={handleChange} /></div>
                <div className="grid grid-cols-2 gap-4"><Input type="number" placeholder="Probabilitas Akhir (1-5)" name="e_probabilitas" value={formData.e_probabilitas} onChange={handleChange} required /><Input type="number" placeholder="Dampak Akhir (1-5)" name="e_dampak" value={formData.e_dampak} onChange={handleChange} required /></div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border-2 border-black p-0 text-xs md:text-sm font-semibold overflow-x-auto print:border-collapse">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-2 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="text-blue-800 font-bold text-xl italic tracking-tighter">KAI <span className="text-orange-500 text-sm not-italic block mt-[-5px]">Properti</span></div>
            </div>
            <div className="col-span-7 border-r-2 border-black p-4 flex items-center justify-center text-lg text-center uppercase">IDENTIFIKASI BAHAYA, PENILAIAN, DAN PENGENDALIAN RISIKO</div>
            <div className="col-span-3 p-2 text-xs flex flex-col justify-center space-y-1">
              <div className="grid grid-cols-2"><span>NO. KODE DOKUMEN</span><span>: {headerData.no_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>LEVEL DOKUMEN</span><span>: {headerData.level_dokumen}</span></div>
              <div className="grid grid-cols-2"><span>REVISI KE</span><span>: {headerData.revisi}</span></div>
              <div className="grid grid-cols-2"><span>TGL MULAI BERLAKU</span><span>: {headerData.tgl_berlaku}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-6 border-r-2 border-black p-2 space-y-1">
              <div className="grid grid-cols-4"><span className="col-span-1">WILAYAH</span><span className="col-span-3">: {headerData.wilayah}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">UNIT</span><span className="col-span-3">: {headerData.unit}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">PROJECT</span><span className="col-span-3">: {headerData.project}</span></div>
            </div>
            <div className="col-span-6 p-2 space-y-1">
              <div className="grid grid-cols-4"><span className="col-span-1">Dibuat oleh</span><span className="col-span-3">: {headerData.dibuat_oleh}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">Diperiksa oleh</span><span className="col-span-3">: {headerData.diperiksa_oleh}</span></div>
              <div className="grid grid-cols-4"><span className="col-span-1">Tanggal</span><span className="col-span-3">: {headerData.tanggal}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-none border-2 border-black shadow-sm">
        <Table className="min-w-[1800px] border-collapse text-xs">
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead colSpan={2} className="border-2 border-black text-center font-bold text-black py-4">A. IDENTIFIKASI BAHAYA</TableHead>
              <TableHead colSpan={6} className="border-2 border-black text-center font-bold text-black py-4">B. KONTROL YANG ADA</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4">C. PENILAIAN RISIKO</TableHead>
              <TableHead colSpan={4} className="border-2 border-black text-center font-bold text-black py-4">D. RENCANA TINDAK LANJUT</TableHead>
              <TableHead colSpan={3} className="border-2 border-black text-center font-bold text-black py-4">E. PENILAIAN RISIKO SETELAH TINDAK LANJUT</TableHead>
              {/* Kolom Aksi (No Print) */}
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
            {data.map((row) => (
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
                
                {/* KOLOM AKSI EDIT & HAPUS */}
                <TableCell className="no-print border-2 border-black p-2 text-center">
                  <div className="flex flex-col gap-1 items-center justify-center">
                    <Button onClick={() => handleEditClick(row)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 border-blue-200" title="Edit Data">
                      <Edit size={14} className="text-blue-600" />
                    </Button>
                    <Button onClick={() => handleDelete(row.id)} variant="outline" size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 border-red-200" title="Hapus Data">
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
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