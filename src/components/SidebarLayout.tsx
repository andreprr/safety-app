"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ShieldAlert, FileText, FileBadge, Menu, ChevronLeft, ChevronRight, BookOpen, Presentation, AlertOctagon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true); // State untuk buka/tutup sidebar PC

  const NavLinks = ({ showText = true }: { showText?: boolean }) => (
    <>
      <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Dashboard">
        <LayoutDashboard size={20} className="shrink-0" /> {showText && <span>Dashboard</span>}
      </Link>
      <Link href="/ibppr" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Data IBPPR">
        <ShieldAlert size={20} className="shrink-0" /> {showText && <span>Data IBPPR</span>}
      </Link>
      <Link href="/inspeksi" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Form Inspeksi">
        <FileText size={20} className="shrink-0" /> {showText && <span>Form Inspeksi</span>}
      </Link>
      <Link href="/temuan" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Review Temuan">
        <AlertOctagon size={20} className="shrink-0" /> {showText && <span>Review Temuan</span>}
      </Link>
      <Link href="/sop" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Dokumen SOP">
        <FileBadge size={20} className="shrink-0" /> {showText && <span>Dokumen SOP</span>}
      </Link>
      <Link href="/peraturan" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Peraturan K3">
        <BookOpen size={20} className="shrink-0" /> {showText && <span>Peraturan K3</span>}
      </Link>
      <Link href="/materi" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition" title="Materi Safety">
        <Presentation size={20} className="shrink-0" /> {showText && <span>Materi Safety</span>}
      </Link>
     
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-slate-50">
      
      {/* --- HEADER MOBILE --- */}
      <div className="md:hidden flex items-center justify-between bg-slate-950 p-4 text-white">
        <h1 className="text-xl font-bold tracking-wider">SAFETY<span className="text-blue-500">PRO</span></h1>
        <Sheet>
          <SheetTrigger className="p-2 bg-slate-800 rounded-md"><Menu size={24} /></SheetTrigger>
          <SheetContent side="left" className="bg-slate-950 text-slate-300 border-none w-64">
            <SheetTitle className="text-white text-left mb-6 font-bold tracking-wider">SAFETY<span className="text-blue-500">PRO</span></SheetTitle>
            <nav className="flex flex-col space-y-2"><NavLinks /></nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* --- SIDEBAR DESKTOP (Bisa di-Toggle) --- */}
      <aside className={`bg-slate-950 text-slate-300 hidden md:flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-center h-16">
          {isOpen ? (
            <h1 className="text-xl font-bold text-white tracking-wider w-full">SAFETY<span className="text-blue-500">PRO</span></h1>
          ) : (
            <h1 className="text-xl font-bold text-white tracking-wider">S<span className="text-blue-500">P</span></h1>
          )}
        </div>
        
        <nav className="flex-1 px-3 space-y-2 mt-6 overflow-hidden">
          <NavLinks showText={isOpen} />
        </nav>
        
        {/* Tombol Toggle di bawah Sidebar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-center">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors w-full flex justify-center"
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b hidden md:flex items-center px-6 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-slate-800">Sistem Manajemen K3</h2>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}