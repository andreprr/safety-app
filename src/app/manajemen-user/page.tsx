"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Shield, Loader2, UserCog, Trash2 } from "lucide-react";

export default function ManageUsersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from("profiles").select("*").order("nama");
        setUsers(data || []);
        setLoading(false);
    };

    const handleToggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "admin" ? "user" : "admin";
        if (!window.confirm(`Ubah role pengguna ini menjadi ${newRole.toUpperCase()}?`)) return;

        setUpdatingId(userId);
        try {
            const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
            if (error) throw error;
            alert("Role berhasil diperbarui!");
            fetchUsers();
        } catch (error: any) {
            alert("Gagal mengubah role. Hanya Admin yang diizinkan melakukan ini.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!window.confirm(`PERINGATAN TINGGI:\nApakah Anda yakin ingin menghapus akun "${userName}" dari sistem?`)) return;

        setDeletingId(userId);
        try {
            const { error } = await supabase.from("profiles").delete().eq("id", userId);
            if (error) throw error;
            alert("Pengguna berhasil dihapus!");
            fetchUsers();
        } catch (error: any) {
            alert("Gagal menghapus pengguna: " + error.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (profile?.role !== "admin") {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Shield size={64} className="text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Akses Ditolak</h2>
                <p className="text-slate-500 mt-2">Halaman ini hanya dapat diakses oleh Administrator Utama.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><UserCog size={24} /></div>
                    <div>
                        <h1 className="text-xl font-bold text-[#1E3A8A]">Manajemen Pengguna</h1>
                        <p className="text-sm text-slate-500">Atur hak akses (role) dan kelola pengguna sistem.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Memuat data...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold">Nama Lengkap</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold text-center">Role Saat Ini</th>
                                    <th className="p-4 font-semibold text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="p-4 font-medium text-slate-800">{u.nama || "Tanpa Nama"}</td>
                                        <td className="p-4 text-slate-600">{u.email}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleToggleRole(u.id, u.role)}
                                                    disabled={updatingId === u.id || u.id === profile.id}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${u.id === profile.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                                                            u.role === 'admin' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        }`}
                                                >
                                                    {updatingId === u.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : (
                                                        u.id === profile.id ? "Anda Sendiri" :
                                                            u.role === 'admin' ? "Turunkan ke User" : "Jadikan Admin"
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteUser(u.id, u.nama)}
                                                    disabled={deletingId === u.id || u.id === profile.id}
                                                    title="Hapus Pengguna"
                                                    className={`p-2 rounded-lg transition-all ${u.id === profile.id
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                                                        }`}
                                                >
                                                    {deletingId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}