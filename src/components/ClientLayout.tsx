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
        // PERBAIKAN 1: Tambahkan print:block print:h-auto print:overflow-visible print:bg-white
        <div className="min-h-screen bg-slate-50 flex overflow-x-hidden print:block print:h-auto print:overflow-visible print:bg-white">

            {/* Sidebar Navigasi */}
            <div className="print:hidden">
                <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            </div>

            {/* Konten Utama & Header */}
            <div
                className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${isOpen ? "lg:pl-[280px]" : "lg:pl-0"
                    } print:block print:min-h-0 print:h-auto print:pl-0 print:overflow-visible print:bg-white`}
            // PERBAIKAN 2: Tambahkan print:block print:pl-0 print:h-auto (menghapus jarak sidebar saat print)
            >
                <div className="print:hidden">
                    <TopHeader setIsOpen={setIsOpen} />
                </div>

                <main className="flex-1 w-full p-4 md:p-6 lg:p-8 print:block print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible">
                    {/* PERBAIKAN 3: print:max-w-full agar tabel bisa selebar kertas */}
                    <div className="max-w-[1600px] mx-auto w-full print:max-w-full print:m-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}