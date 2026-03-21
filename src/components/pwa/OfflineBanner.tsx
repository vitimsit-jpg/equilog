"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Initialise from current state
    setOffline(!navigator.onLine);

    const handleOffline = () => setOffline(true);
    const handleOnline  = () => setOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold">
      <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
      Mode hors ligne — vos données sont sauvegardées localement
    </div>
  );
}
