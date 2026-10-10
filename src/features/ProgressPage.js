"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Modal from "react-bootstrap/Modal";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import { loadItemIndex } from "@/lib/data";
import { useSettings } from "@/lib/hooks";
import { speak } from "@/lib/tts";
import { toDateStr } from "@/lib/srs";
import { computeStreak, countMastered, totalReviews } from "@/lib/stats";
import {
  exportData,
  getActivity,
  getQuizHistory,
  getSrs,
  importData,
  resetData,
  updateSettings,
} from "@/lib/storage";
import { showToast } from "@/lib/toast";

const SOURCE_LABELS = { hiragana: "Hiragana", katakana: "Katakana", vocab: "Kosakata" };
const MODE_LABELS = { mc: "Pilihan ganda", mcr: "Romaji → kana", type: "Ketik" };
const THEMES = [
  ["auto", "Otomatis"],
  ["light", "Terang"],
  ["dark", "Gelap"],
];

function StatCard({ value, label, children }) {
  return (
    <div className="col-6 col-md-4">
      <div className="mb-card mb-stat h-100">
        <div className="mb-stat-value">{value}</div>
        <div className="mb-stat-label">{label}</div>
        {children}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [settings] = useSettings();
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0); // naik setiap data berubah → hitung ulang statistik
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    loadItemIndex().then(setIndex).catch(() => setFailed(true));
  }, []);

  if (failed) return <LoadError />;

  const header = <PageTitle ja="進捗" lead="Semua data tersimpan di browser Anda, tidak dikirim ke server.">Progres</PageTitle>;
  if (!index) {
    return (
      <>
        {header}
        <div id="progressContent">
          <p className="text-secondary">Memuat…</p>
        </div>
      </>
    );
  }

  void version;
  const items = [...index.values()];
  const idsOf = (pred) => items.filter(pred).map((i) => i.id);
  const hiraIds = idsOf((i) => i.script === "hiragana");
  const kataIds = idsOf((i) => i.script === "katakana");
  const vocabIds = idsOf((i) => i.type === "vocab");
  const srs = getSrs();
  const activity = getActivity();
  const today = toDateStr();
  const streak = computeStreak(activity, today);
  const doneToday = activity[today] ?? 0;
  const goalPercent = Math.min(100, Math.round((doneToday / settings.dailyGoal) * 100));
  const history = getQuizHistory().slice(-10).reverse();
  const refresh = () => setVersion((v) => v + 1);
  const rateValue = settings.ttsRate;

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `manabii-backup-${toDateStr()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const importFromFile = async (file) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!window.confirm("Impor akan menimpa semua data saat ini. Lanjutkan?")) return;
      importData(payload);
      showToast("Data berhasil diimpor.", { type: "success" });
      refresh();
    } catch (error) {
      const message = error instanceof SyntaxError ? "Berkas bukan JSON yang valid." : error.message;
      showToast(`Impor gagal: ${message}`, { type: "danger", delay: 8000 });
    }
  };

  return (
    <>
      {header}
      <div id="progressContent">
        <section aria-labelledby="statsTitle" className="mb-4">
          <h2 className="h4 mb-3" id="statsTitle">
            Statistik
          </h2>
          <div className="row g-3 mb-stagger">
            <StatCard value={`${countMastered(srs, hiraIds)} / ${hiraIds.length}`} label="Hiragana dikuasai" />
            <StatCard value={`${countMastered(srs, kataIds)} / ${kataIds.length}`} label="Katakana dikuasai" />
            <StatCard value={`${countMastered(srs, vocabIds)} / ${vocabIds.length}`} label="Kata dikuasai" />
            <StatCard value={totalReviews(activity)} label="Total review" />
            <StatCard
              value={
                <>
                  {streak.current} <small className="fs-6">hari</small>
                </>
              }
              label={`Streak saat ini (terbaik ${streak.best})`}
            />
            <StatCard value={`${doneToday} / ${settings.dailyGoal}`} label="Target harian">
              <div
                className="progress mt-2"
                role="progressbar"
                aria-label="Target harian"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={goalPercent}
              >
                <div className="progress-bar" style={{ width: `${goalPercent}%` }} />
              </div>
            </StatCard>
          </div>
          <p className="small text-secondary mt-2 mb-0">
            Sebuah item dianggap dikuasai bila interval ulangannya sudah 21 hari atau lebih.
          </p>
        </section>

        <section aria-labelledby="historyTitle" className="mb-4">
          <h2 className="h4 mb-3" id="historyTitle">
            Riwayat kuis
          </h2>
          {history.length ? (
            <div className="table-responsive mb-card">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Sumber</th>
                    <th scope="col">Mode</th>
                    <th scope="col" className="text-end">
                      Skor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={`${h.date}-${i}`}>
                      <td>{h.date}</td>
                      <td>{SOURCE_LABELS[h.source] ?? h.source}</td>
                      <td>{MODE_LABELS[h.mode] ?? h.mode}</td>
                      <td className="text-end">
                        {h.correct} / {h.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-secondary">
              Belum ada kuis. <Link prefetch={false} href="/kuis">Coba kuis pertama</Link>.
            </p>
          )}
        </section>

        <section aria-labelledby="settingsTitle" className="mb-4">
          <h2 className="h4 mb-3" id="settingsTitle">
            Pengaturan
          </h2>
          <form className="mb-card p-3 p-md-4" onSubmit={(e) => e.preventDefault()}>
            <div className="row g-4">
              <div className="col-md-6">
                <span className="form-label d-block" id="themeLabel">
                  Mode tampilan
                </span>
                <div className="btn-group" role="group" aria-labelledby="themeLabel">
                  {THEMES.map(([value, label]) => (
                    <span key={value} className="d-contents">
                      <input
                        type="radio"
                        className="btn-check"
                        name="theme"
                        id={`theme-${value}`}
                        checked={settings.theme === value}
                        onChange={() => updateSettings({ theme: value })}
                      />
                      <label className="btn btn-outline-secondary" htmlFor={`theme-${value}`}>
                        {label}
                      </label>
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-check form-switch mt-md-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="setRomaji"
                    checked={settings.showRomaji}
                    onChange={(e) => updateSettings({ showRomaji: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="setRomaji">
                    Tampilkan romaji
                  </label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-check form-switch mt-md-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="setSfx"
                    checked={settings.sfx}
                    onChange={(e) => updateSettings({ sfx: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="setSfx">
                    Efek suara kuis
                  </label>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="setRate">
                  Kecepatan suara: <span id="rateValue">{rateValue.toFixed(1)}</span>×
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range"
                    id="setRate"
                    min="0.6"
                    max="1.2"
                    step="0.1"
                    value={rateValue}
                    onChange={(e) => updateSettings({ ttsRate: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary text-nowrap"
                    onClick={() => speak("こんにちは。よろしくおねがいします。", { rate: rateValue })}
                  >
                    <i className="bi bi-volume-up" aria-hidden="true" /> Coba
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="setGoal">
                  Target harian (review)
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="setGoal"
                  min="1"
                  max="200"
                  defaultValue={settings.dailyGoal}
                  key={settings.dailyGoal}
                  onBlur={(e) => {
                    const goal = Math.min(200, Math.max(1, Math.round(Number(e.target.value)) || 10));
                    e.target.value = goal;
                    updateSettings({ dailyGoal: goal });
                  }}
                />
              </div>
            </div>
          </form>
        </section>

        <section aria-labelledby="dataTitle">
          <h2 className="h4 mb-3" id="dataTitle">
            Data saya
          </h2>
          <div className="mb-card p-3 p-md-4">
            <p className="text-secondary">
              Progres hanya tersimpan di browser ini. Unduh cadangan untuk memindahkannya ke perangkat lain.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={downloadBackup}>
                <i className="bi bi-download" aria-hidden="true" /> Ekspor data
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => fileRef.current?.click()}>
                <i className="bi bi-upload" aria-hidden="true" /> Impor data
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  importFromFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <button type="button" className="btn btn-outline-primary ms-md-auto" onClick={() => setResetOpen(true)}>
                <i className="bi bi-trash" aria-hidden="true" /> Reset semua data
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal show={resetOpen} onHide={() => setResetOpen(false)} centered aria-labelledby="resetModalLabel">
        <Modal.Header closeButton closeLabel="Tutup">
          <Modal.Title as="h2" className="h5" id="resetModalLabel">
            Reset semua data?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Semua progres, streak, dan pengaturan akan dihapus permanen. Unduh cadangan dulu bila perlu.
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setResetOpen(false)}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetData();
              setResetOpen(false);
              showToast("Semua data telah dihapus.", { type: "success" });
              refresh();
            }}
          >
            Ya, hapus semua
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
