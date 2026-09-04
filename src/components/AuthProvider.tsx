"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Lock, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const INACTIVITY_LIMIT = 30 * 60 * 1000;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setTimeout(() => setLoading(false), 1500); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (session) {
        timeoutId = setTimeout(() => {
          handleLogoutIdle();
        }, INACTIVITY_LIMIT);
      }
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    
    if (session) {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer(); 
    }

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setErrorMsg("");
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message === "Invalid login credentials" ? "Email atau kata sandi salah." : error.message);
    }
    
    setLoginLoading(false);
  };

  const handleLogoutIdle = async () => {
    await supabase.auth.signOut();
    alert("Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 30 menit. Silakan login kembali.");
  };

  // 1. TAMPILAN LOADING SCREEN (Tema Terang)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[9999]">
        <div className="relative flex flex-col items-center">
          <ShieldCheck className="text-orange-500 mb-6 w-20 h-20 animate-pulse" />
          <Loader2 className="animate-spin text-blue-600 mb-4 w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-30 scale-150" />
          <h2 className="text-xl font-extrabold tracking-widest text-blue-800 animate-pulse">SAFETY<span className="text-orange-500">PRO</span></h2>
          <p className="text-slate-500 text-xs mt-2 tracking-widest uppercase font-medium">Memuat Sistem Keamanan...</p>
        </div>
      </div>
    );
  }

  // 2. TAMPILAN LOGIN SCREEN KORPORAT (Jika belum login)
  if (!session) {
    return (
      <div className="min-h-screen w-full flex bg-slate-50 text-slate-900 overflow-hidden font-sans z-[9999] fixed inset-0">
        
        {/* BAGIAN KIRI - BRANDING (Hanya Desktop) */}
        <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10 max-w-lg text-white">
            <div className="flex items-center gap-3 mb-10">
              <ShieldCheck size={48} className="text-orange-500" />
              <div className="font-extrabold text-3xl tracking-wide flex flex-col leading-tight">
                <span className="text-white">SAFETY PRO</span>
                <span className="text-sm text-slate-400 font-medium mt-1">by KAI Properti</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight mb-6 leading-tight">
              Sistem Manajemen Terpadu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">Keselamatan & Kesehatan Kerja</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Akses dashboard pemantauan IBPR, laporan inspeksi lapangan (Hazard Report), dan dokumen SOP dalam satu platform terpusat yang aman dan responsif.
            </p>
            
            <div className="mt-12 flex items-center gap-4 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Real-time</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Terintegrasi</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Terukur</span>
            </div>
          </div>
        </div>

        {/* BAGIAN KANAN - FORM LOGIN (White Theme) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 relative bg-[#F8FAFC]">
          <div className="w-full max-w-md bg-white border border-slate-200 p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-orange-500" />

            <div className="lg:hidden flex justify-center items-center gap-2 mb-8">
              <ShieldCheck size={36} className="text-orange-500" />
              <div className="font-extrabold text-xl tracking-wide flex flex-col leading-tight text-left">
                <span className="text-blue-800">SAFETY PRO</span>
                <span className="text-[10px] text-slate-500 font-medium">by KAI Properti</span>
              </div>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Portal Masuk</h2>
              <p className="text-slate-500 text-sm">Silakan masukkan kredensial Anda untuk mengakses sistem.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold ml-1">Email Karyawan</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-slate-700 font-bold">Kata Sandi</Label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <Input 
                    type="password" 
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 rounded-xl font-medium"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loginLoading} 
                className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-md transition-all flex items-center justify-center group shadow-md hover:shadow-lg"
              >
                {loginLoading ? (
                  <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memverifikasi... </>
                ) : (
                  <> Masuk ke Sistem <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">DIREKTORAT KESELAMATAN</p>
              <p className="text-[10px] text-slate-400 mt-1">&copy; {new Date().getFullYear()} KAI Properti. Seluruh hak cipta dilindungi.</p>
            </div>

          </div>
        </div>

      </div>
    );
  }

  // 3. APLIKASI UTAMA (Jika berhasil login)
  return <>{children}</>;
}