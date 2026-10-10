"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import JaWord from "@/components/JaWord";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import { loadThemes, loadVocab } from "@/lib/data";
import { normalizeRomaji } from "@/lib/romaji";
import { addToSrs, getSrs, setLastLesson } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { speak } from "@/lib/tts";

export default function VocabPage() {
  const [themes, setThemes] = useState([]);
  const [vocab, setVocab] = useState(null);
  const [failed, setFailed] = useState(false);
  const [theme, setThemeState] = useState("");
  const [query, setQuery] = useState("");
  const [inSrs, setInSrs] = useState(() => new Set());
  const [detailId, setDetailId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Promise.all([loadThemes(), loadVocab()])
      .then(([themeList, words]) => {
        setThemes(themeList);
        setVocab(
          words.map((v) => ({
            ...v,
            hay: `${v.word} ${v.kana} ${v.romaji} ${v.meaning}`.toLowerCase(),
            romajiKey: normalizeRomaji(v.romaji),
          })),
        );
        const initialTheme = params.get("theme") ?? "";
        setThemeState(themeList.some((t) => t.id === initialTheme) ? initialTheme : "");
        setQuery(params.get("q") ?? "");
        setInSrs(new Set(Object.keys(getSrs())));
        setReady(true);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const next = new URLSearchParams();
    if (theme) next.set("theme", theme);
    if (query) next.set("q", query);
    const search = next.toString() ? `?${next}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [ready, theme, query]);

  const themeLabel = useCallback((id) => themes.find((t) => t.id === id)?.label ?? id, [themes]);

  const words = useMemo(() => {
    if (!vocab) return [];
    const q = query.trim().toLowerCase();
    const qr = normalizeRomaji(q);
    return vocab.filter((v) => {
      if (theme && v.theme !== theme) return false;
      if (!q) return true;
      return v.hay.includes(q) || (qr && v.romajiKey.includes(qr));
    });
  }, [vocab, theme, query]);

  if (failed) return <LoadError />;

  const chooseTheme = (id) => {
    setThemeState(id);
    if (id) setLastLesson({ page: "kosakata", params: `?theme=${id}`, label: `Kosakata — ${themeLabel(id)}` });
  };

  const addWords = (ids) => {
    const added = addToSrs(ids);
    setInSrs((current) => new Set([...current, ...ids]));
    showToast(added ? `${added} kata ditambahkan ke flashcard.` : "Semua kata sudah ada di flashcard.", {
      type: added ? "success" : "info",
    });
  };

  const speakWord = (v) => speak(v.kana);
  const detail = vocab?.find((v) => v.id === detailId);
  const showThemes = !theme && !query.trim();
  const countIn = (id) => vocab.filter((v) => v.theme === id).length;

  const addButton = (v) => {
    const added = inSrs.has(v.id);
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={added}
        onClick={() => addWords([v.id])}
        aria-label={added ? "Sudah di flashcard" : `Tambahkan ${v.word} ke flashcard`}
        title={added ? "Sudah di flashcard" : "Tambahkan ke flashcard"}
      >
        <i className={`bi ${added ? "bi-check-circle-fill" : "bi-plus-circle"}`} aria-hidden="true" />
      </button>
    );
  };

  return (
    <>
      <PageTitle ja="語彙" lead="Telusuri kata per tema atau cari berdasarkan kana, romaji, atau arti.">
        Kosakata N5
      </PageTitle>

      <form className="row g-2 mb-3" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="col-12 col-md-7">
          <label className="visually-hidden" htmlFor="vocabSearch">
            Cari kata
          </label>
          <input
            type="search"
            className="form-control"
            id="vocabSearch"
            placeholder="Cari kana, romaji, atau arti…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-5">
          <label className="visually-hidden" htmlFor="vocabTheme">
            Filter tema
          </label>
          <select
            className="form-select"
            id="vocabTheme"
            value={theme}
            onChange={(e) => chooseTheme(e.target.value)}
          >
            <option value="">Semua tema</option>
            {vocab
              ? themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({countIn(t.id)})
                  </option>
                ))
              : null}
          </select>
        </div>
      </form>

      <div id="vocabContent" aria-live="polite">
        {!vocab ? (
          <p className="text-secondary">Memuat…</p>
        ) : showThemes ? (
          <div className="row g-3 mb-stagger">
            {themes.map((t) => (
              <div className="col-6 col-lg-4" key={t.id}>
                <button type="button" className="mb-card mb-theme-card" onClick={() => chooseTheme(t.id)}>
                  <i className={`bi ${t.icon} fs-3 text-primary`} aria-hidden="true" />
                  <div className="h6 mt-2 mb-1">{t.label}</div>
                  <div className="small text-secondary">{t.description}</div>
                  <span className="badge text-bg-sakura mt-2">{countIn(t.id)} kata</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h2 className="h5 mb-0 me-auto">
                {theme ? themeLabel(theme) : "Hasil pencarian"}{" "}
                <span className="badge text-bg-sakura">{words.length} kata</span>
              </h2>
              {theme ? (
                <Link prefetch={false}
                  className="btn btn-sm btn-outline-secondary"
                  href={`/kuis?source=vocab&theme=${theme}&mode=mc&count=10`}
                >
                  <i className="bi bi-patch-question" aria-hidden="true" /> Kuis tema ini
                </Link>
              ) : null}
              {words.length ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => addWords(words.map((v) => v.id))}
                >
                  <i className="bi bi-plus-circle" aria-hidden="true" /> Tambahkan {words.length} kata ke flashcard
                </button>
              ) : null}
            </div>
            {words.length ? (
              <div className="mb-card">
                {words.map((v) => (
                  <div className="mb-word-row" key={v.id}>
                    <button type="button" className="mb-word-main" onClick={() => setDetailId(v.id)}>
                      <span className="mb-word">
                        <JaWord word={v.word} kana={v.kana} />
                      </span>
                      <div className="mb-word-meaning">{v.meaning}</div>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => speakWord(v)}
                      aria-label={`Dengarkan ${v.kana}`}
                    >
                      <i className="bi bi-volume-up" aria-hidden="true" />
                    </button>
                    {addButton(v)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary">Tidak ada kata yang cocok.</p>
            )}
          </>
        )}
      </div>

      <Modal show={!!detail} onHide={() => setDetailId(null)} centered aria-labelledby="wordModalLabel">
        {detail ? (
          <>
            <Modal.Header closeButton closeLabel="Tutup">
              <Modal.Title as="h2" className="h5" id="wordModalLabel">
                {themeLabel(detail.theme)}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="text-center mb-3">
                <div className="mb-word display-5">
                  <JaWord word={detail.word} kana={detail.kana} />
                </div>
                <div className="text-secondary">{detail.romaji}</div>
                <div className="h5 mt-2">{detail.meaning}</div>
              </div>
              <div className="mb-card p-3 mb-3">
                <div className="small text-secondary mb-1">Contoh kalimat</div>
                <div className="fs-5" lang="ja">
                  {detail.example.jp}
                </div>
                <div>{detail.example.id}</div>
              </div>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <button type="button" className="btn btn-outline-secondary" onClick={() => speakWord(detail)}>
                  <i className="bi bi-volume-up" aria-hidden="true" /> Kata
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => speak(detail.example.jp)}>
                  <i className="bi bi-volume-up" aria-hidden="true" /> Kalimat
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={inSrs.has(detail.id)}
                  onClick={() => addWords([detail.id])}
                >
                  <i className={`bi ${inSrs.has(detail.id) ? "bi-check-circle-fill" : "bi-plus-circle"}`} aria-hidden="true" />{" "}
                  {inSrs.has(detail.id) ? "Sudah di flashcard" : "Tambahkan ke flashcard"}
                </button>
              </div>
            </Modal.Body>
          </>
        ) : null}
      </Modal>
    </>
  );
}
