"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink, ShieldCheck, Building2 } from "lucide-react";

export default function PeraturanPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-slate-50/50">
      
      {/* HEADER */}
      <div className="bg-white p-6 border rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BookOpen className="text-blue-600" /> Referensi Perundangan K3
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pusat informasi dan referensi hukum mengenai Keselamatan dan Kesehatan Kerja.
        </p>
      </div>

      {/* KARTU PILIHAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* KARTU 1: KEMNAKER */}
        <a 
          href="https://temank3.kemnaker.go.id/page/perundangan" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group"
        >
          <Card className="h-full hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-blue-600 w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-slate-800">Regulasi K3 Nasional</CardTitle>
              <CardDescription className="text-sm mt-2">
                Kementerian Ketenagakerjaan Republik Indonesia (Teman K3)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Kumpulan lengkap Undang-Undang, Peraturan Pemerintah, Permenaker, dan Kepmenaker yang berlaku secara nasional terkait standar keselamatan kerja.
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                Buka Portal Kemnaker <ExternalLink size={16} />
              </div>
            </CardContent>
          </Card>
        </a>

        {/* KARTU 2: KAI PROPERTI */}
        <a 
          href="#" /* GANTI TANDA # INI DENGAN LINK URL INTERNAL KAI PROPERTI NANTINYA */
          target="_blank" 
          rel="noopener noreferrer"
          className="group"
        >
          <Card className="h-full hover:border-orange-500 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="text-orange-600 w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-slate-800">Regulasi Internal Perusahaan</CardTitle>
              <CardDescription className="text-sm mt-2">
                Standar Keselamatan PT KA Properti Manajemen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Dokumen aturan internal, kebijakan direksi, dan panduan spesifik Keselamatan dan Kesehatan Kerja (K3) di lingkungan KAI Properti.
              </p>
              <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm">
                Buka Dokumen KAI Properti <ExternalLink size={16} />
              </div>
            </CardContent>
          </Card>
        </a>

      </div>
    </div>
  );
}