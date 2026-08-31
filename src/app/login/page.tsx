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

      // Jika berhasil, arahkan ke halaman utama (Dashboard)
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
    <div className="min-h-screen w-full flex bg-[#09090b] text-white overflow-hidden">
      
      {/* BAGIAN KIRI - GAMBAR / GRADIENT (Hanya muncul di Desktop) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#121214] items-center justify-center p-12 overflow-hidden border-r border-[#27272a]">
        {/* Dekorasi Cahaya Latar */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-blue-400 text-sm font-medium mb-6">
            <ShieldCheck size={16} /> Sistem Manajemen Terpadu
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Tingkatkan Standar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Keselamatan</span> Proyek Anda.
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Akses dashboard pemantauan IBPPR, laporan inspeksi lapangan, dan dokumen SOP KAI Properti dalam satu platform terpusat yang aman dan responsif.
          </p>
        </div>
      </div>

      {/* BAGIAN KANAN - FORM LOGIN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="w-full max-w-md bg-[#121214] border border-[#27272a] p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          
          {/* Garis aksen di atas kartu */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-emerald-500" />

          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Selamat Datang Kembali</h2>
            <p className="text-slate-400 text-sm">Silakan masukkan kredensial Anda untuk mengakses sistem SAFETYPRO.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300 ml-1">Email Perusahaan</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <Input 
                  type="email" 
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-[#09090b] border-[#27272a] text-white focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-slate-300">Password</Label>
                <a href="#" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">Lupa sandi?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <Input 
                  type="password" 
                  placeholder="admin123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-12 bg-[#09090b] border-[#27272a] text-white focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-md transition-all flex items-center justify-center group"
            >
              {loading ? (
                <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses... </>
              ) : (
                <> Masuk ke Dashboard <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /> </>
              )}
            </Button>
          </form>

        </div>
      </div>

    </div>
  );
}