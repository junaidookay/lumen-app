import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { getBranding } from "@/lib/admin/settings.functions";

export function FloatingSocials() {
  const [urls, setUrls] = useState<{ telegram: string; whatsapp: string }>({ telegram: "", whatsapp: "" });

  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => getBranding(),
    staleTime: 5 * 60 * 1000,
  });

  // Sync after mount to avoid SSR hydration mismatch
  useEffect(() => {
    if (branding) {
      setUrls({ telegram: branding.telegramUrl || "", whatsapp: branding.whatsappUrl || "" });
    }
  }, [branding]);

  if (!urls.telegram && !urls.whatsapp) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {urls.whatsapp && (
        <a
          href={urls.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp channel"
          className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110 hover:shadow-xl"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
      {urls.telegram && (
        <a
          href={urls.telegram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram channel"
          className="grid h-12 w-12 place-items-center rounded-full bg-[#0088cc] text-white shadow-lg transition hover:scale-110 hover:shadow-xl"
        >
          <Send className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}
