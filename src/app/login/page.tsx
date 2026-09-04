"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push("/");
    } catch (error: any) {
      setErrorMsg(error.message === "Invalid login credentials" 
        ? "Email atau password salah." 
        : error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* BAGIAN KIRI - BRANDING (Hanya muncul di Desktop) */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden shadow-2xl z-10">
        {/* Dekorasi Cahaya Latar */}
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 relative z-0 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          
          {/* Garis aksen korporat di atas kartu */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-orange-500" />

          {/* Logo Mobile (Hanya muncul jika di HP) */}
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
                <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Lupa sandi?</a>
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
              disabled={loading} 
              className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-md transition-all flex items-center justify-center group shadow-md hover:shadow-lg"
            >
              {loading ? (
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