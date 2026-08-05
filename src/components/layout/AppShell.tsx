import type { ReactNode } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SmartInstallBanner } from "@/pwa/components/SmartInstallBanner";
import { OfflineIndicator } from "@/pwa/components/OfflineIndicator";
import { UpdateBanner } from "@/pwa/components/UpdateBanner";
import { BottomNav } from "@/pwa/components/BottomNav";
import { OfflineQueueInspector } from "@/pwa/components/OfflineQueueInspector";
import { PreloadProvider } from "@/pwa/components/PreloadProvider";
import { AdsterraSocialBar } from "@/components/ads/AdsterraSocialBar";
import { FloatingSocials } from "@/components/FloatingSocials";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePWA } from "@/pwa/hooks/use-pwa";

export function AppShell({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  const isMobile = useIsMobile();
  const { isStandalone } = usePWA();
  const showBottomNav = isMobile && isStandalone;

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <OfflineIndicator />
      <UpdateBanner />
      <main className={showBottomNav ? "pb-24" : undefined}>
        <PreloadProvider>{children}</PreloadProvider>
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
      <OfflineQueueInspector />
      <SmartInstallBanner />
      <AdsterraSocialBar />
      <FloatingSocials />
    </div>
  );
}
