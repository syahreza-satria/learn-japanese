"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { maybeNotify, reminderState } from "@/lib/reminder";
import { SETTINGS_EVENT, updateMeta } from "@/lib/storage";

/** Banner pengingat di dalam aplikasi + pemicu notifikasi saat aplikasi terbuka. */
export default function ReminderBanner() {
  const pathname = usePathname();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const refresh = () => {
      const state = reminderState();
      setInfo(state.due > 0 && state.meta.bannerDismissed !== state.today ? { due: state.due, today: state.today } : null);
      maybeNotify();
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener(SETTINGS_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(SETTINGS_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname]);

  if (!info || pathname.startsWith("/flashcard") || pathname.startsWith("/kuis")) return null;
  return (
    <div className="mb-banner" role="status">
      <div className="container py-2 d-flex flex-wrap align-items-center gap-2">
        <span className="me-auto">
          <i className="bi bi-bell" aria-hidden="true" /> Ada <strong>{info.due} kartu</strong> menunggu review hari ini.
        </span>
        <Link className="btn btn-sm btn-primary" href="/flashcard?deck=due" prefetch={false}>
          Mulai review
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            updateMeta({ bannerDismissed: info.today });
            setInfo(null);
          }}
        >
          Nanti saja
        </button>
      </div>
    </div>
  );
}
