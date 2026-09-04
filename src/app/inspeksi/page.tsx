"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from 'xlsx';
import imageCompression from "browser-image-compression";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Printer, FileText, Settings, FileSpreadsheet, Search } from "lucide-react";

export default function InspeksiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    } catch (error) {}
  };

  const fetchData = async () => {
    try {
      const { data: inspeksiData } = await supabase.from("inspeksi").select("*").order("created_at", { ascending: false });
      setData(inspeksiData || []);
    } catch (error) {} finally { setLoading(false); }
  };

  const exportToExcel = () => {
    const exportData = data.map((row, index) => ({
      "No": index + 1, 
      "Tanggal Temuan": row.tanggal_temuan,
      "Temuan": row.temuan, 
      "Lokasi": row.lokasi, 
      "Kategori": row.kategori,
      "Tindakan Penanggulangan": row.tindakan_penanggulangan, 
      "Cut Off Date": row.cut_off_date, 
      "Risk Level": row.risk_level, 
      "Status": row.status, 
      "Kategori Temuan": row.kategori_temuan,
      "PIC": row.pic
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Inspeksi");
    XLSX.writeFile(wb, `Laporan_Inspeksi_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      // 1. Proses Upload Foto (jika ada)
      if (fotoFile) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressedFile = await imageCompression(fotoFile, options);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        // Cek error saat upload foto
        const { error: uploadError } = await supabase.storage.from('inspeksi-photos').upload(fileName, compressedFile);
        if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);
        
        const { data: publicUrlData } = supabase.storage.from('inspeksi-photos').getPublicUrl(fileName);
        uploadedFotoUrl = publicUrlData.publicUrl;
      }
      
      // 2. Proses Simpan Data Laporan
      const { error: insertError } = await supabase.from("inspeksi").insert([{ ...formData, foto_url: uploadedFotoUrl }]);
      if (insertError) throw new Error("Gagal simpan laporan ke database: " + insertError.message);

      // 3. Jika semua aman, reset form
      alert("Laporan berhasil disimpan secara permanen!");
      setIsDialogOpen(false);
      
      setFormData({ temuan: "", lokasi: "", kategori: "UNSAFE ACTION", pic: "", tindakan_penanggulangan: "", tanggal_temuan: "", cut_off_date: "", risk_level: "Rendah", status: "Open", kategori_temuan: "Standard Working" });
      setKategoriOption("UNSAFE ACTION");
      setFotoFile(null);
      
      fetchData(); // Refresh tabel
    } catch (error: any) {
      // Menampilkan pesan error yang sesungguhnya!
      alert("TERJADI KESALAHAN:\n" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter(row => 
    row.temuan?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    row.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.pic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 print:p-0 print:m-0">
      
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
            <Button onClick={exportToExcel} variant="outline" className="h-9 w-9 p-0 bg-green-50 text-green-700 border-green-200 hover:bg-green-100" title="Export Excel"><FileSpreadsheet size={16} /></Button>

            <Dialog open={isHeaderOpen} onOpenChange={setIsHeaderOpen}>
              <DialogTrigger className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-md font-medium text-sm flex items-center gap-2 h-9"><Settings size={16} className="hidden sm:block"/> <span className="hidden sm:block">Kop</span></DialogTrigger>
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
                    {/* PERBAIKAN: Menambahkan capture="environment" untuk buka kamera hp otomatis */}
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

      {/* KOP DOKUMEN CETAK */}
      <div className="hidden print:block border-2 border-black p-0 text-xs md:text-sm font-semibold mb-4">
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
        <div className="p-2 space-y-1 bg-white">
          <div className="grid grid-cols-12"><span className="col-span-2">Nama Project</span><span className="col-span-10">: {headerData.nama_project}</span></div>
          <div className="grid grid-cols-12"><span className="col-span-2">Tanggal Laporan</span><span className="col-span-10">: {headerData.tanggal_laporan}</span></div>
        </div>
      </div>

      {/* TABEL DATA INSPEKSI */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-2 print:border-black print:shadow-none">
        <Table className="min-w-[1500px] text-sm print:text-xs">
          <TableHeader className="bg-slate-50 print:bg-blue-100">
            <TableRow className="text-slate-800 font-bold">
              <TableHead className="border-b print:border-2 print:border-black text-center w-[50px]">NO</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center w-[100px]">Tgl Temuan</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center w-[120px]">Bukti Foto</TableHead>
              <TableHead className="border-b print:border-2 print:border-black">Temuan / Pelanggaran</TableHead>
              <TableHead className="border-b print:border-2 print:border-black">Lokasi</TableHead>
              <TableHead className="border-b print:border-2 print:border-black">Kategori</TableHead>
              <TableHead className="border-b print:border-2 print:border-black">Tindakan Penanggulangan</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center">Cut Off Date</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center">Risiko</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center">Status</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center">Jenis Pekerjaan</TableHead>
              <TableHead className="border-b print:border-2 print:border-black text-center">PIC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-10 text-slate-500">
                  {searchQuery ? "Data tidak ditemukan." : "Belum ada laporan inspeksi."}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, index) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center">{index + 1}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center">{row.tanggal_temuan}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center">
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
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-slate-800 font-medium">{row.temuan}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3">{row.lokasi}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-slate-600 uppercase border border-slate-200">{row.kategori}</span>
                  </TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-slate-600">
                    {row.tindakan_penanggulangan ? row.tindakan_penanggulangan : <span className="text-xs text-slate-400 italic">Belum ditindaklanjuti</span>}
                  </TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center text-red-600 font-medium">{row.cut_off_date}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center font-bold">
                    <span className={`px-2.5 py-1 rounded-full text-xs border ${
                      row.risk_level === 'Tinggi' ? 'bg-red-50 text-red-700 border-red-200' : 
                      row.risk_level === 'Sedang' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      row.risk_level === 'Rendah' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {row.risk_level}
                    </span>
                  </TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center font-bold">{row.status}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center">{row.kategori_temuan}</TableCell>
                  <TableCell className="border-b print:border-2 print:border-black p-3 text-center font-semibold text-blue-700">{row.pic}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}