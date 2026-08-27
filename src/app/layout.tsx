import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SidebarLayout from "@/components/SidebarLayout";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}