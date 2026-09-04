"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, ShieldAlert, FileText, FileBadge, 
  Menu, ChevronLeft, ChevronRight, BookOpen, 
  Presentation, AlertOctagon, LogOut 
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && pathname !== '/login') {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (pathname === '/login') {
    return <main className="min-h-screen w-full bg-[#09090b]">{children}</main>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-slate-400 text-sm">Memverifikasi akses...</div>;
  }

  const NavLinks = ({ showText = true }: { showText?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <LayoutDashboard size={20} className="shrink-0" /> {showText && <span>Dashboard</span>}
        </Link>
        <Link href="/ibppr" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <ShieldAlert size={20} className="shrink-0" /> {showText && <span>IBPR</span>}
        </Link>
        <Link href="/inspeksi" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <FileText size={20} className="shrink-0" /> {showText && <span>Form Inspeksi</span>}
        </Link>
        <Link href="/temuan" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <AlertOctagon size={20} className="shrink-0" /> {showText && <span>Review Temuan</span>}
        </Link>
        <Link href="/sop" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <FileBadge size={20} className="shrink-0" /> {showText && <span>Dokumen SOP</span>}
        </Link>
        <Link href="/peraturan" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <BookOpen size={20} className="shrink-0" /> {showText && <span>Peraturan K3</span>}
        </Link>
        <Link href="/materi" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition">
          <Presentation size={20} className="shrink-0" /> {showText && <span>Materi Safety</span>}
        </Link>
      </div>
      
      <div className="mt-auto pt-4 mb-2">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
          <LogOut size={20} className="shrink-0" /> {showText && <span>Keluar (Logout)</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out relative ${isOpen ? "w-64" : "w-20"}`}>
        <div className={`flex items-center p-4 border-b border-slate-800 ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen && <span className="font-black text-xl tracking-wider text-white">SAFETY<span className="text-blue-500">PRO</span></span>}
          {!isOpen && <span className="font-black text-xl text-blue-500">S</span>}
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="absolute -right-3 top-6 bg-blue-600 text-white rounded-full p-1 shadow-md hover:bg-blue-700 transition">
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden flex flex-col">
          <NavLinks showText={isOpen} />
        </nav>
      </aside>

      {/* WRAPPER KONTEN UTAMA & HEADER MOBILE (Perbaikan Layout) */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        
        {/* HEADER MOBILE */}
        <div className="md:hidden flex items-center justify-between bg-slate-950 text-white p-4 border-b border-slate-800 w-full no-print">
          <span className="font-black text-lg tracking-wider">SAFETY<span className="text-blue-500">PRO</span></span>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger>
              <div className="p-2 bg-slate-800 rounded-md text-white cursor-pointer hover:bg-slate-700 transition">
                <Menu size={20} />
              </div>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-950 text-slate-300 w-64 border-r-slate-800 p-0 flex flex-col">
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <div className="p-4 border-b border-slate-800">
                <span className="font-black text-xl text-white">SAFETY<span className="text-blue-500">PRO</span></span>
              </div>
              <nav className="p-3 flex-1 flex flex-col">
                <NavLinks showText={true} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* AREA KONTEN */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>

    </div>
  );
}