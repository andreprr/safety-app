const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

// 1. Muat Environment Variables dari .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL atau KEY tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Fungsi Helper Konversi Tanggal (M/D/YYYY -> YYYY-MM-DD)
function parseDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const clean = rawDate.trim().split(' ')[0];
  const parts = clean.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year) && year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

// 3. Eksekusi Import
async function importCsv() {
  const csvFilePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(process.cwd(), 'Inspection Checklist.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File CSV tidak ditemukan di: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf8');

  const { data: rows, errors } = Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: 'greedy'
  });

  if (errors.length > 0) {
    console.warn('Peringatan parsing CSV:', errors);
  }

  if (!rows || rows.length < 2) {
    console.error('Error: CSV kosong atau tidak memiliki data.');
    process.exit(1);
  }

  const headerRow = rows[0];
  const recordsToInsert = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    const nama_proyek = (row[1] || '').trim();
    const area = (row[2] || '').trim();
    const rawDate = row[3];
    const tanggal_inspection = parseDate(rawDate);

    if (!nama_proyek || !tanggal_inspection) {
      continue;
    }

    const detail_penilaian = [];

    // Baca kolom mulai dari indeks ke-4 (berpasangan: pertanyaan & temuan)
    for (let col = 4; col < headerRow.length; col += 2) {
      const pertanyaan = (headerRow[col] || '').trim();
      if (!pertanyaan) continue;

      let jawaban = (row[col] || '').trim();
      const temuan = (col + 1 < row.length ? row[col + 1] || '' : '').trim();

      // Normalisasi teks jawaban jika mengandung Ya/Tidak ganda
      if (jawaban.toLowerCase().includes('ya') && !jawaban.toLowerCase().includes('tidak')) {
        jawaban = 'Ya';
      } else if (jawaban.toLowerCase().includes('tidak')) {
        jawaban = 'Tidak';
      } else if (!jawaban) {
        jawaban = '-';
      }

      detail_penilaian.push({
        pertanyaan,
        jawaban,
        temuan
      });
    }

    // Kalkulasi Skor
    let total_skor = 0;
    const total_pertanyaan = detail_penilaian.length;

    for (const item of detail_penilaian) {
      const pLower = item.pertanyaan.toLowerCase();
      const jLower = item.jawaban.toLowerCase();

      const isUnsafe = pLower.includes('unsafe action') || pLower.includes('unsafe condition');

      if (isUnsafe) {
        if (jLower === 'tidak' || jLower === '-') {
          total_skor += 1;
        }
      } else {
        if (jLower === 'ya') {
          total_skor += 1;
        }
      }
    }

    const score_percentage = total_pertanyaan > 0
      ? Number(((total_skor / total_pertanyaan) * 100).toFixed(2))
      : 0;

    recordsToInsert.push({
      nama_proyek,
      area,
      tanggal_inspection,
      detail_penilaian,
      score_percentage
    });
  }

  console.log(`Menemukan ${recordsToInsert.length} data valid untuk diimport.`);

  if (recordsToInsert.length === 0) {
    console.log('Tidak ada data valid yang perlu diinsert.');
    return;
  }

  // Bersihkan data lama di tabel sebelum import ulang agar bersih dari data corrupt
  console.log('Membersihkan data lama di tabel performance_k3...');
  const { error: deleteError } = await supabase
    .from('performance_k3')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Hapus semua baris

  if (deleteError) {
    console.warn('Catatan saat membersihkan tabel:', deleteError.message);
  }

  // Batch insert ke Supabase (chunk per 50 rows)
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('performance_k3')
      .insert(chunk);

    if (error) {
      console.error(`Gagal menginsert batch ${i / chunkSize + 1}:`, error.message);
      console.error('Pastikan RLS (Row Level Security) pada tabel performance_k3 di Supabase sudah di-Disable sementara!');
      process.exit(1);
    } else {
      successCount += chunk.length;
      console.log(`Berhasil menginsert baris ${i + 1} sampai ${Math.min(i + chunkSize, recordsToInsert.length)}`);
    }
  }

  console.log(`PROSES IMPORT SELESAI! Total ${successCount} data berhasil dimasukkan.`);
}

importCsv().catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});