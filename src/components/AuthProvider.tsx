"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
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

  // 1. TAMPILAN LOADING SCREEN (Tema Minimalis)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
        <div className="relative flex flex-col items-center">
          <Loader2 className="animate-spin text-slate-900 mb-6 w-10 h-10 opacity-80" />
          <h2 className="text-4xl font-black italic tracking-[0.2em] text-slate-900 animate-pulse mb-2">
            SRI
          </h2>
          <p className="text-slate-400 text-xs tracking-widest uppercase font-medium">Memuat Sistem...</p>
        </div>
      </div>
    );
  }

  // 2. TAMPILAN LOGIN SCREEN (Tema Clean & Minimalist Tanpa Biru)
  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white text-slate-900 font-sans p-4 relative overflow-hidden z-[9999] fixed inset-0">
        
        {/* Dekorasi Latar Sangat Halus */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-slate-50 rounded-full blur-[100px] -z-10" />

        <div className="w-full max-w-[420px] bg-white border border-slate-100 p-8 md:p-10 rounded-2xl shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative z-10">
          
          {/* BRANDING SRI */}
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="font-black italic text-5xl tracking-[0.2em] text-slate-900 mb-2">
              SRI
            </div>
            <div className="h-[2px] w-12 bg-slate-200 rounded-full mb-4"></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 text-center">
              Sistem Keselamatan Terpadu
            </h1>
            <p className="text-sm text-slate-500 mt-2 text-center">
              Silakan masuk dengan kredensial Anda.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Email Karyawan</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <Input 
                  type="email" 
                  placeholder="admin@sri.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 rounded-xl font-medium transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Kata Sandi</Label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <Input 
                  type="password" 
                  placeholder="Masukkan sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 focus-visible:border-slate-900 rounded-xl font-medium transition-all"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loginLoading} 
              className="w-full h-12 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center group shadow-sm hover:shadow"
            >
              {loginLoading ? (
                <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memverifikasi... </>
              ) : (
                <> Masuk <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /> </>
              )}
            </Button>
          </form>

          <div className="mt-10 text-center pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DIREKTORAT KESELAMATAN</p>
            <p className="text-[10px] text-slate-400 mt-1.5">&copy; {new Date().getFullYear()} SRI. All rights reserved.</p>
          </div>

        </div>
      </div>
    );
  }

  // 3. APLIKASI UTAMA (Jika berhasil login)
  return <>{children}</>;
}