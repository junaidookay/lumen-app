import type { ReactNode } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";

export function AppShell({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}