"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Bell, AlertCircle, CheckCircle2, LogOut, Menu } from "lucide-react";

export default function TopHeader({ setIsOpen }: { setIsOpen: (val: boolean) => void }) {
    const [notifCount, setNotifCount] = useState(0);
    const [notifList, setNotifList] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isUserOpen, setIsUserOpen] = useState(false);
    const [userInitial, setUserInitial] = useState("AD");

    const notifRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ambil inisial email untuk avatar
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.email) {
                setUserInitial(data.user.email.substring(0, 2).toUpperCase());
            }
        });

        fetchNotifData();
        const channel = supabase.channel('realtime-inspeksi-header')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspeksi' }, () => {
                fetchNotifData();
            })
            .subscribe();

        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
            if (userRef.current && !userRef.current.contains(event.target as Node)) setIsUserOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchNotifData = async () => {
        try {
            const { count } = await supabase.from('inspeksi').select('*', { count: 'exact', head: true }).eq('status', 'Open');
            setNotifCount(count || 0);

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

    // Format tanggal: "Monday, 14 September 2026"
    const dateString = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <header className="h-[70px] bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">

            {/* Bagian Kiri (Hanya muncul di Mobile untuk buka Sidebar) */}
            <div className="flex items-center gap-3">
                <button onClick={() => setIsOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Menu size={24} />
                </button>
                <div className="lg:hidden font-black italic tracking-wider text-blue-900 text-xl">
                    SRI
                </div>
            </div>

            {/* Bagian Kanan (Tanggal, Notifikasi, User) */}
            <div className="flex items-center gap-4 md:gap-6 ml-auto">
                <span className="hidden md:block text-sm font-medium text-slate-500">
                    {dateString}
                </span>

                {/* Tombol Notifikasi */}
                <div className="relative" ref={notifRef}>
                    <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors mt-1">
                        <Bell size={20} />
                        {notifCount > 0 && (
                            <span className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                                {notifCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown Notifikasi */}
                    {isNotifOpen && (
                        <div className="absolute top-full right-0 mt-3 w-[280px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-sm text-slate-800">Notifikasi</span>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{notifCount} Open</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifList.length > 0 ? (
                                    notifList.map((notif) => (
                                        <Link key={notif.id} href="/temuan" onClick={() => setIsNotifOpen(false)} className="flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                                        <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                                        <p className="text-sm font-medium">Semua temuan aman.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-white border-t border-slate-100 text-center">
                                <Link href="/temuan" onClick={() => setIsNotifOpen(false)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                    Lihat Semua &rarr;
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Avatar & Logout */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => setIsUserOpen(!isUserOpen)}
                        className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm hover:ring-4 hover:ring-blue-100 transition-all shadow-sm"
                    >
                        {userInitial}
                    </button>

                    {isUserOpen && (
                        <div className="absolute top-full right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Akun Pengguna</p>
                                <p className="text-sm font-bold text-slate-800 mt-1 truncate">Administrator</p>
                            </div>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold">
                                <LogOut size={16} /> Keluar Sistem
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}