"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from 'xlsx';
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Printer, FileText, Settings, FileSpreadsheet } from "lucide-react";

export default function InspeksiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [headerData, setHeaderData] = useState({
    nama_perusahaan: "", nama_formulir: "", no_formulir: "", revisi: "",
    tmt: "", halaman: "", nama_project: "", tanggal_laporan: ""
  });

  const [formData, setFormData] = useState({
    temuan: "", lokasi: "", kategori: "UNSAFE ACTION", pic: "", 
    tindakan_penanggulangan: "", tanggal_temuan: "", cut_off_date: "", 
    risk_level: "L", status: "Open", kategori_temuan: "Standard Working"
  });

  useEffect(() => {
    fetchHeader();
    fetchData();
  }, []);

  const fetchHeader = async () => {
    try {
      const { data: hData } = await supabase.from('inspeksi_header').select('*').eq('id', 1).single();
      if (hData) setHeaderData(hData);
    } catch (error) {}
  };

  const fetchData = async () => {
    try {
      const { data: inspeksiData } = await supabase.from("inspeksi").select("*").order("created_at", { ascending: false });
      setData(inspeksiData || []);
    } catch (error) {} finally { setLoading(false); }
  };

  // FUNGSI EXPORT KE EXCEL
  const exportToExcel = () => {
    const exportData = data.map((row, index) => ({
      "No": index + 1,
      "Temuan": row.temuan,
      "Lokasi": row.lokasi,
      "Kategori": row.kategori,
      "PIC": row.pic,
      "Tindakan Penanggulangan": row.tindakan_penanggulangan,
      "Tanggal Temuan": row.tanggal_temuan,
      "Cut Off Date": row.cut_off_date,
      "Risk Level": row.risk_level,
      "Status": row.status,
      "Kategori Temuan": row.kategori_temuan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Inspeksi");
    XLSX.writeFile(wb, `Laporan_Inspeksi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFotoFile(e.target.files[0]); };

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
    if (fotoFile) {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFile = await imageCompression(fotoFile, options);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      await supabase.storage.from('inspeksi-photos').upload(fileName, compressedFile);
      const { data: publicUrlData } = supabase.storage.from('inspeksi-photos').getPublicUrl(fileName);
      uploadedFotoUrl = publicUrlData.publicUrl;
    }
    await supabase.from("inspeksi").insert([{ ...formData, foto_url: uploadedFotoUrl }]);
    alert("Laporan berhasil disimpan!");
    setIsDialogOpen(false);
    fetchData();
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-white print:p-0 print:m-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"><FileText className="text-blue-600" /> Form Inspeksi</h1>
        
        <div className="flex flex-wrap gap-2">
          {/* TOMBOL PDF & EXCEL */}
          <Button onClick={() => window.print()} variant="outline" className="flex gap-2 h-9 text-sm"><Printer size={16} /> PDF</Button>
          <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2 h-9 text-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
            <FileSpreadsheet size={16} /> Excel
          </Button>

          <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
            <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Settings size={16} /> Atur Kop</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] p-6 rounded-xl bg-white">
              <DialogHeader><DialogTitle>Pengaturan Kop Inspeksi</DialogTitle></DialogHeader>
              <form onSubmit={handleHeaderSubmit} className="space-y-4">
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
                <Button type="submit" className="w-full bg-slate-800 text-white">Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 h-9"><Plus size={16} /> Tambah Laporan</DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 rounded-xl">
              <DialogHeader><DialogTitle>Laporan Safety Patrol</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea placeholder="Temuan" name="temuan" onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Lokasi" name="lokasi" onChange={handleChange} required />
                  <select name="kategori" onChange={handleChange} className="border p-2 rounded"><option value="UNSAFE ACTION">Unsafe Action</option><option value="UNSAFE CONDITION">Unsafe Condition</option></select>
                </div>
                <Textarea placeholder="Tindakan" name="tindakan_penanggulangan" onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Kategori Temuan" name="kategori_temuan" onChange={handleChange} required />
                  <Input placeholder="PIC" name="pic" onChange={handleChange} required />
                  <Input type="date" name="tanggal_temuan" onChange={handleChange} required />
                  <Input type="date" name="cut_off_date" onChange={handleChange} required />
                  <select name="risk_level" onChange={handleChange} className="border p-2 rounded"><option value="L">L</option><option value="M">M</option><option value="H">H</option></select>
                  <select name="status" onChange={handleChange} className="border p-2 rounded"><option value="Open">Open</option><option value="Closed">Closed</option></select>
                </div>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white">Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border-2 border-black p-0 text-xs md:text-sm font-semibold overflow-x-auto print:border-collapse">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-3 border-r-2 border-black p-4 flex items-center justify-center">
              <div className="text-blue-800 font-bold text-2xl italic">KAI <span className="text-orange-500 text-sm not-italic block mt-[-5px]">Properti</span></div>
            </div>
            <div className="col-span-6 border-r-2 border-black">
              <div className="border-b-2 border-black p-2 text-center uppercase">{headerData.nama_perusahaan}</div>
              <div className="p-2 text-center text-lg font-bold uppercase">{headerData.nama_formulir}</div>
            </div>
            <div className="col-span-3 p-2 text-xs flex flex-col justify-center space-y-1">
              <div className="grid grid-cols-2"><span>NO. FORMULIR</span><span>: {headerData.no_formulir}</span></div>
              <div className="grid grid-cols-2"><span>REVISI</span><span>: {headerData.revisi}</span></div>
              <div className="grid grid-cols-2"><span>T.M.T</span><span>: {headerData.tmt}</span></div>
              <div className="grid grid-cols-2"><span>HALAMAN</span><span>: {headerData.halaman}</span></div>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="grid grid-cols-12"><span className="col-span-2">Nama Project</span><span className="col-span-10">: {headerData.nama_project}</span></div>
            <div className="grid grid-cols-12"><span className="col-span-2">Tanggal Laporan</span><span className="col-span-10">: {headerData.tanggal_laporan}</span></div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-none border-2 border-black shadow-sm">
        <Table className="min-w-[1500px] border-collapse text-xs">
          <TableHeader className="bg-blue-300">
            <TableRow className="text-center text-black font-bold">
              <TableHead className="border-2 border-black text-center text-black">NO.</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Temuan</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Lokasi</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Kategori</TableHead>
              <TableHead className="border-2 border-black text-center text-black w-[150px]">Photo</TableHead>
              <TableHead className="border-2 border-black text-center text-black">PIC</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Penanggulangan</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Tgl Temuan</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Cut Off Date</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Risk</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Status</TableHead>
              <TableHead className="border-2 border-black text-center text-black">Kategori Temuan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="border-2 border-black p-2 text-center">{index + 1}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.temuan}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.lokasi}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.kategori}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.foto_url ? <img src={row.foto_url} alt="Temuan" className="w-full max-h-[100px] object-cover" /> : "Tanpa Foto"}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.pic}</TableCell>
                <TableCell className="border-2 border-black p-2">{row.tindakan_penanggulangan}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.tanggal_temuan}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.cut_off_date}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center font-bold">{row.risk_level}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.status}</TableCell>
                <TableCell className="border-2 border-black p-2 text-center">{row.kategori_temuan}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}