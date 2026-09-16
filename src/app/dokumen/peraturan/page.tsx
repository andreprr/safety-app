"use client";

import React from "react";
import { FileText, ExternalLink, ShieldCheck } from "lucide-react";

export default function PeraturanPage() {
    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg max-w-2xl w-full text-center relative overflow-hidden">
                {/* Dekorasi Tema */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1E3A8A] to-[#F97316]"></div>

                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={40} className="text-[#1E3A8A]" />
                </div>

                <h1 className="text-3xl font-extrabold text-[#1E3A8A] mb-3">Peraturan Perundangan K3</h1>

                <p className="text-slate-600 mb-8 leading-relaxed">
                    Pusat informasi peraturan perundangan terkait Keselamatan dan Kesehatan Kerja (K3) yang bersumber langsung dari portal resmi <b>Kementerian Ketenagakerjaan Republik Indonesia</b>.
                </p>

                <a
                    href="https://temank3.kemnaker.go.id/page/perundangan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-1"
                >
                    <ExternalLink size={24} />
                    Buka Portal Teman K3 Kemnaker
                </a>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <FileText size={14} /> Tautan ini akan membuka halaman web baru di luar sistem KONSISTEN.
                </div>
            </div>

        </div>
    );
}