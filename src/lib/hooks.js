import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SETTINGS_EVENT, getSettings } from "./storage.js";

/** Pengaturan pengguna; nilai awal = default agar hydration konsisten, lalu disinkronkan dari localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setSettings(getSettings());
    sync();
    setReady(true);
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);
  return [settings, ready];
}
