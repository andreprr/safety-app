"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  ShieldCheck, LogOut, LayoutDashboard, FileSpreadsheet, 
  ClipboardCheck, AlertOctagon, FolderOpen, MonitorPlay, 
  Menu, X, Bell, AlertCircle 
} from "lucide-react";

export default function TopHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // STATE NOTIFIKASI
  const [notifCount, setNotifCount] = useState(0);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null); // Untuk mendeteksi klik di luar kotak notifikasi

  useEffect(() => {
    fetchNotifData();

    // Listener Real-Time: Jika ada input data baru, refresh daftar notifikasi
    const channel = supabase.channel('realtime-inspeksi')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspeksi' }, () => {
        fetchNotifData();
      })
      .subscribe();

    // Event Listener untuk menutup notifikasi jika area di luar kotak diklik
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => { 
      supabase.removeChannel(channel); 
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotifData = async () => {
    try {
      // 1. Ambil jumlah total temuan yang masih "Open"
      const { count } = await supabase.from('inspeksi').select('*', { count: 'exact', head: true }).eq('status', 'Open');
      setNotifCount(count || 0);

      // 2. Ambil 5 data temuan "Open" paling baru untuk ditampilkan di list
      const { data } = await supabase.from('inspeksi')
        .select('*')
        .eq('status', 'Open')
        .order('created_at', { ascending: false })
        .limit(5);
      setNotifList(data || []);
    } catch (error) {
      console.error("Gagal memuat notifikasi", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; 
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Hazard Reports", path: "/temuan", icon: <AlertOctagon size={18} /> },
    { name: "Form Inspeksi", path: "/inspeksi", icon: <ClipboardCheck size={18} /> },
    { name: "IBPR", path: "/ibppr", icon: <FileSpreadsheet size={18} /> },
    { name: "SOP & JSA", path: "/sop", icon: <FolderOpen size={18} /> },
    { name: "Materi Safety", path: "/materi", icon: <MonitorPlay size={18} /> },
  ];

  return (
    <header className="bg-white text-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.04)] sticky top-0 z-50 print:hidden border-b border-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* LOGO KAI STYLE */}
        <div className="flex items-center gap-3">
          <div className="text-blue-600 flex items-center gap-2">
            <ShieldCheck size={28} className="text-orange-500" />
            <div className="font-extrabold text-lg tracking-wide flex flex-col leading-tight hidden sm:flex">
              <span className="text-blue-800">SAFETY PRO</span>
              <span className="text-[10px] text-slate-400 font-medium">by KAI Properti</span>
            </div>
          </div>
        </div>
        
        {/* MENU DESKTOP */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <div className={`flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 py-5 mt-[2px] ${
                  isActive ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"
                }`}>
                  {item.icon}
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        
        {/* AKSI KANAN */}
        <div className="flex items-center gap-5">
          
          {/* MENU NOTIFIKASI DROPDOWN */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)} 
              className={`relative p-2 rounded-full transition-colors ${isNotifOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
                  {notifCount}
                </span>
              )}
            </button>

            {/* KOTAK DROPDOWN NOTIFIKASI */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-800">Notifikasi Lapangan</span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{notifCount} Open</span>
                </div>
                
                <div className="max-h-[350px] overflow-y-auto">
                  {notifList.length > 0 ? (
                    notifList.map((notif) => (
                      <Link 
                        key={notif.id} 
                        href="/temuan" 
                        onClick={() => setIsNotifOpen(false)}
                        className="flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="bg-red-50 p-2 rounded-full text-red-500 shrink-0 mt-0.5">
                          <AlertCircle size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-700 line-clamp-1">{notif.kategori || "Temuan Bahaya"}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{notif.lokasi || "Lokasi tidak dirinci"}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            {new Date(notif.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                      <ShieldCheck size={32} className="text-slate-300 mb-2" />
                      <p className="text-sm">Bagus! Tidak ada temuan Open.</p>
                    </div>
                  )}
                </div>
                
                <div className="p-3 bg-white border-t border-slate-100 text-center">
                  <Link 
                    href="/temuan" 
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Lihat Semua Hazard Report →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="hidden lg:flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors">
            <LogOut size={18} /> <span>Logout</span>
          </button>

          <button className="lg:hidden text-slate-500 p-1" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>
      
      {/* MENU MOBILE */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg z-50">
          <nav className="flex flex-col px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link key={item.name} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold transition-colors ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:bg-slate-50"
                  }`}>
                    {item.icon} {item.name}
                  </div>
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-100">
              <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-md transition-colors">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}