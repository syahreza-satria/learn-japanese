"use client";
import { useEffect } from "react";
import { showToast } from "@/lib/toast";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Mendaftarkan service worker (hanya produksi) dan memberi tahu status offline. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
    }
    const offline = () =>
      showToast("Anda sedang offline. Materi tetap bisa dipakai; suara cadangan online tidak tersedia.", { type: "info", delay: 6000 });
    const online = () => showToast("Kembali online.", { type: "success", delay: 2500 });
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}
