"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileSpreadsheet, ClipboardCheck, AlertOctagon, MonitorPlay,
  PanelLeftClose, PanelLeft, Globe, Leaf, ChevronDown, ChevronRight, FileText, Image as ImageIcon
} from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const [isDokumenOpen, setIsDokumenOpen] = useState(false);

  useEffect(() => {
    if (pathname.includes('/dokumen')) {
      setIsDokumenOpen(true);
    }
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Hazard Reports", path: "/temuan", icon: <AlertOctagon size={20} /> },
    { name: "Form Inspeksi", path: "/inspeksi", icon: <ClipboardCheck size={20} /> },
    { name: "IBPR", path: "/ibppr", icon: <FileSpreadsheet size={20} /> },
    { name: "SOP & JSA", path: "/sop", icon: <FileText size={20} /> },
  ];

  const dokumenItems = [
    { name: "Materi K3", path: "/dokumen/materi", icon: <MonitorPlay size={16} /> },
    { name: "Peraturan Perundangan", path: "/dokumen/peraturan", icon: <FileText size={16} /> },
    { name: "Poster K3", path: "/dokumen/poster", icon: <ImageIcon size={16} /> },
  ];

  const bottomNavItems = [
    { name: "Lingkungan", path: "/lingkungan", icon: <Leaf size={20} /> },
    { name: "SRI", path: "", icon: <Globe size={20} /> },
  ];

  return (
    <>
      {/* TOMBOL TOGGLE DESKTOP (Muncul saat sidebar ditutup) */}
      <div className={`hidden lg:flex fixed top-4 left-4 z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white text-slate-600 p-2.5 rounded-md shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <PanelLeft size={20} />
        </button>
      </div>

      {/* Overlay Gelap saat Menu Terbuka (Hanya di Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[90] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Utama */}
      <aside className={`fixed top-0 left-0 h-screen w-[280px] bg-[#1E3A8A] text-white shadow-2xl z-[100] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* HEADER SIDEBAR */}
        <div className="h-[70px] shrink-0 p-6 flex items-center justify-between border-b border-blue-800/50">
          <div className="flex items-center gap-3">
            <img src="/KAI Properti.png" alt="Logo KAI Properti" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="font-black italic text-xl tracking-wider text-white leading-none">KONSISTEN</span>
              <span className="text-[9px] text-blue-200 mt-1.5 tracking-tight font-medium opacity-90">by KAI Properti</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-blue-300 hover:text-white p-2 cursor-pointer bg-blue-900/50 rounded-lg transition-colors"
          >
            <PanelLeftClose size={22} />
          </button>
        </div>

        {/* MENU UTAMA */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-transparent">
          <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3 px-3">Main Menu</div>

          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path} onClick={() => { if (window.innerWidth < 1024) setIsOpen(false) }}>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
                  ? "bg-blue-800/80 text-white shadow-md border-l-4 border-[#F97316]"
                  : "text-blue-100 hover:bg-blue-800/40 hover:text-white border-l-4 border-transparent"
                  }`}>
                  <div className={isActive ? "text-[#F97316]" : "text-blue-300"}>{item.icon}</div>
                  {item.name}
                </div>
              </Link>
            );
          })}

          <div className="mt-2">
            <button
              onClick={() => setIsDokumenOpen(!isDokumenOpen)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-l-4 ${pathname.includes('/dokumen') || isDokumenOpen
                ? "bg-blue-800/40 text-white border-transparent"
                : "text-blue-100 hover:bg-blue-800/40 hover:text-white border-transparent"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={pathname.includes('/dokumen') ? "text-blue-300" : "text-blue-300"}><FileText size={20} /></div>
                Dokumen
              </div>
              {isDokumenOpen ? <ChevronDown size={16} className="text-blue-300" /> : <ChevronRight size={16} className="text-blue-300" />}
            </button>

            {isDokumenOpen && (
              <div className="ml-10 mt-1 mb-2 space-y-1 border-l border-blue-700/50 pl-2">
                {dokumenItems.map((subItem) => {
                  const isSubActive = pathname === subItem.path;
                  return (
                    <Link key={subItem.name} href={subItem.path} onClick={() => { if (window.innerWidth < 1024) setIsOpen(false) }}>
                      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${isSubActive ? "bg-blue-800/80 text-white shadow-sm" : "text-blue-200 hover:bg-blue-800/40 hover:text-white"
                        }`}>
                        <div className={isSubActive ? "text-[#F97316]" : "text-blue-400"}>{subItem.icon}</div>
                        {subItem.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-8 mb-3 px-3">Lainnya</div>

          {bottomNavItems.map((item) => {
            const isActive = pathname === item.path;
            const isExternal = item.path.startsWith("http");
            return (
              <Link key={item.name} href={item.path} target={isExternal ? "_blank" : "_self"} onClick={() => { if (!isExternal && window.innerWidth < 1024) setIsOpen(false) }}>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-l-4 ${isActive
                  ? "bg-blue-800/80 text-white shadow-md border-[#F97316]"
                  : "text-blue-100 hover:bg-blue-800/40 hover:text-white border-transparent"
                  }`}>
                  <div className={isActive ? "text-[#F97316]" : "text-blue-300"}>{item.icon}</div>
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}