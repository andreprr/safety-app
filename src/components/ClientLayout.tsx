"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
            {/* Sidebar Navigasi */}
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            {/* Konten Utama & Header 
          - Ditambahkan min-w-0 agar tabel/form tidak merusak layout saat sidebar ditutup/buka 
      */}
            <div
                className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${isOpen ? "lg:pl-[280px]" : "lg:pl-0"
                    }`}
            >
                <TopHeader setIsOpen={setIsOpen} />
                <main className="flex-1 w-full p-4 md:p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}