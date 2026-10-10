"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import StrokeAnimator from "@/components/StrokeAnimator";
import { groupRows, loadKana } from "@/lib/data";
import { useSettings } from "@/lib/hooks";
import { setLastLesson, updateSettings } from "@/lib/storage";
import { speak } from "@/lib/tts";

const SCRIPTS = { hiragana: "Hiragana", katakana: "Katakana" };
const TABS = {
  gojuon: { label: "Gojūon", groups: ["gojuon"], cols: ["a", "i", "u", "e", "o"] },
  dakuten: { label: "Dakuten", groups: ["dakuten", "handakuten"], cols: ["a", "i", "u", "e", "o"] },
  yoon: { label: "Yōon", groups: ["yoon"], cols: ["a", "u", "o"] },
};

const keyOf = (item) => item.id.slice(2); // id tanpa prefix aksara, mis. "ka"
const rowLabel = (row) => (row === "nn" ? "n" : row);

export default function KanaPage() {
  const [settings] = useSettings();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [script, setScript] = useState("hiragana");
  const [tab, setTab] = useState("gojuon");
  const [selectedKey, setSelectedKey] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("script") in SCRIPTS) setScript(params.get("script"));
    if (params.get("tab") in TABS) setTab(params.get("tab"));
    Promise.all([loadKana("hiragana"), loadKana("katakana")])
      .then(([hiragana, katakana]) => {
        setData({ hiragana, katakana });
        setReady(true);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const search = `?script=${script}&tab=${tab}`;
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    setLastLesson({ page: "kana", params: search, label: `${SCRIPTS[script]} — ${TABS[tab].label}` });
  }, [ready, script, tab]);

  if (failed) return <LoadError />;

  const items = data ? data[script].filter((item) => TABS[tab].groups.includes(item.group)) : [];
  const selected = items.find((item) => keyOf(item) === selectedKey) ?? items[0];
  const { cols } = TABS[tab];

  const select = (item) => {
    setSelectedKey(keyOf(item));
    speak(item.char);
  };

  return (
    <>
      <PageTitle ja="かな" lead="Ketuk kartu untuk mendengar bunyinya.">
        Hiragana &amp; Katakana
      </PageTitle>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="btn-group" role="group" aria-label="Pilih aksara">
          {[
            ["hiragana", "ひらがな", "Hiragana"],
            ["katakana", "カタカナ", "Katakana"],
          ].map(([id, ja, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-outline-secondary${script === id ? " active" : ""}`}
              aria-pressed={script === id}
              onClick={() => setScript(id)}
            >
              <span lang="ja">{ja}</span> {label}
            </button>
          ))}
        </div>
        <div className="btn-group" role="group" aria-label="Pilih kelompok">
          {Object.entries(TABS).map(([id, { label }]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-outline-secondary${tab === id ? " active" : ""}`}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setSelectedKey(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="form-check form-switch ms-md-auto mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="romajiToggle"
            checked={settings.showRomaji}
            onChange={(e) => updateSettings({ showRomaji: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="romajiToggle">
            Tampilkan romaji
          </label>
        </div>
      </div>

      <div className="mb-card mb-kana-preview mb-3" id="kanaPreview" aria-live="polite">
        {selected ? (
          <>
            <div className="mb-kana-big mb-pop" lang="ja" key={selected.id}>
              {selected.char}
            </div>
            <div>
              <div className="h3 mb-1">{selected.romaji}</div>
              <div className="small text-secondary">Contoh kata</div>
              <div>
                <span lang="ja" className="fs-5">
                  {selected.example.word}
                </span>{" "}
                <span className="text-secondary">{selected.example.romaji}</span> — {selected.example.meaning}
              </div>
              <div className="mt-2 d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => speak(selected.char)}>
                  <i className="bi bi-volume-up" aria-hidden="true" /> Bunyi
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => speak(selected.example.word)}
                >
                  <i className="bi bi-volume-up" aria-hidden="true" /> Contoh
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {selected ? (
        <div className="mb-card p-3 mb-3">
          <div className="small text-secondary text-center mb-2">Urutan goresan</div>
          <StrokeAnimator key={selected.id} text={selected.char} size={selected.char.length > 1 ? 100 : 120} />
        </div>
      ) : null}

      <div
        id="kanaGrid"
        key={`${script}-${tab}`}
        className={`mb-kana-grid mb-fade-in${tab === "yoon" ? " is-yoon" : ""}${settings.showRomaji ? "" : " mb-hide-romaji"}`}
        role="group"
        aria-label="Tabel kana"
      >
        {groupRows(items).map(({ row, items: rowItems }) => {
          const label = rowLabel(row);
          return [
            <div className="mb-kana-rowlabel" key={`${row}-label`}>
              <span>{label}</span>
              <Link prefetch={false}
                href={`/kuis?source=${script}&row=${row}&mode=mc&count=10`}
                aria-label={`Kuis baris ${label}`}
                title="Kuis baris ini"
              >
                <i className="bi bi-patch-question" aria-hidden="true" />
              </Link>
            </div>,
            ...cols.map((col, index) => {
              const item = rowItems.find((i) => i.col === col) ?? (row === "nn" && index === 0 ? rowItems[0] : null);
              if (!item) return <div className="mb-kana-cell is-empty" aria-hidden="true" key={`${row}-${col}`} />;
              const isSelected = item === selected;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`mb-kana-cell${isSelected ? " is-selected" : ""}`}
                  aria-label={`${item.char}, ${item.romaji}`}
                  aria-pressed={isSelected}
                  onClick={() => select(item)}
                >
                  <span className="mb-kana-char" lang="ja">
                    {item.char}
                  </span>
                  <span className="mb-kana-romaji">{item.romaji}</span>
                </button>
              );
            }),
          ];
        })}
      </div>
    </>
  );
}
