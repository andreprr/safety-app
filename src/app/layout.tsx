import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import komponen penjaga login dan Header atas
import AuthProvider from "@/components/AuthProvider";
import TopHeader from "@/components/TopHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Safety Pro - HSE Dashboard",
  description: "Sistem Manajemen Keselamatan dan Kesehatan Kerja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        
        {/* AuthProvider akan mengecek apakah user sudah login atau belum */}
        <AuthProvider>
          
          {/* Layout Baru: Header di atas, Konten di bawah (Tanpa Sidebar!) */}
          <div className="min-h-screen flex flex-col bg-slate-50">
            
            {/* Navigasi Header Atas */}
            <TopHeader />
            
            {/* Area Konten Utama (Dashboard, Form Inspeksi, dll) */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto">
              {children}
            </main>
            
          </div>
          
        </AuthProvider>
        
      </body>
    </html>
  );
}