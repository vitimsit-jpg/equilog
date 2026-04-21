"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Register SW if needed
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return; }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });

      setSubscribed(true);
    } catch (err) {
      toast.error("Erreur lors de l'activation des notifications");
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      toast.error("Erreur lors de la désactivation des notifications");
    }
    setLoading(false);
  };

  if (!supported) {
    return (
      <p className="text-xs text-gray-400">Notifications push non disponibles sur ce navigateur.</p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-xs text-gray-400">Notifications bloquées par le navigateur. Modifiez les permissions dans les paramètres de votre navigateur.</p>
    );
  }

  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <div className="flex items-start gap-3">
        {subscribed ? <Bell className="h-4 w-4 text-black mt-0.5 flex-shrink-0" /> : <BellOff className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-black">Notifications push</p>
          <p className="text-xs text-gray-400">Rappels de soins directement sur votre écran</p>
        </div>
      </div>
      <div
        onClick={loading ? undefined : (subscribed ? handleDisable : handleEnable)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${subscribed ? "bg-black" : "bg-gray-200"} ${loading ? "opacity-50 cursor-default" : ""}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${subscribed ? "translate-x-5" : "translate-x-1"}`} />
      </div>
    </label>
  );
}
