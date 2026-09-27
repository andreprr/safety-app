"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
    const [formData, setFormData] = useState({ nama: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        nama: formData.nama, // Mengirim nama ke database
                    },
                },
            });

            if (error) throw new Error(error.message);

            setSuccess(true);
            setFormData({ nama: "", email: "", password: "" });
        } catch (error: any) {
            alert("Gagal mendaftar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
                <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Registrasi Berhasil!</h2>
                <p className="text-slate-500 mt-2 text-center max-w-md">
                    Akun dengan level "User" telah dibuat. Silakan logout dan login menggunakan akun baru tersebut.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-[#1E3A8A] mb-2">Tambah Pengguna Baru</h1>
                <p className="text-sm text-slate-500 mb-6">Akun yang dibuat di sini secara default akan memiliki akses sebagai "User".</p>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">Nama Lengkap</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><User size={16} /></div>
                            <Input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} required className="pl-10 h-11 bg-slate-50" placeholder="Ketik nama pengguna..." />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">Email Login</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Mail size={16} /></div>
                            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="pl-10 h-11 bg-slate-50" placeholder="Ketik email..." />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">Kata Sandi (Min 6 Karakter)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Lock size={16} /></div>
                            <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} className="pl-10 h-11 bg-slate-50" placeholder="Ketik kata sandi..." />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-[#1E3A8A] hover:bg-[#152C69] h-11 mt-4">
                        {loading ? <Loader2 className="animate-spin" /> : "Buat Akun User"}
                    </Button>
                </form>
            </div>
        </div>
    );
}