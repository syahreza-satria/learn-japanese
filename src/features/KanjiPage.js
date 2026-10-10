"use client";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import StrokeAnimator from "@/components/StrokeAnimator";
import { loadKanji } from "@/lib/data";
import { addToSrs, getSrs, setLastLesson } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { speak } from "@/lib/tts";

export default function KanjiPage() {
  const [kanji, setKanji] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [inSrs, setInSrs] = useState(() => new Set());

  useEffect(() => {
    loadKanji()
      .then((list) => {
        setKanji(list);
        const wanted = new URLSearchParams(window.location.search).get("k");
        setSelectedId(list.find((k) => k.char === wanted)?.id ?? list[0].id);
        setInSrs(new Set(Object.keys(getSrs())));
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!kanji || !selectedId) return;
    const item = kanji.find((k) => k.id === selectedId);
    const search = `?k=${encodeURIComponent(item.char)}`;
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    setLastLesson({ page: "kanji", params: search, label: `Kanji — ${item.char} (${item.meaning})` });
  }, [kanji, selectedId]);

  const shown = useMemo(() => {
    if (!kanji) return [];
    const q = query.trim().toLowerCase();
    if (!q) return kanji;
    return kanji.filter((k) =>
      [k.char, k.meaning, ...k.onyomi, ...k.kunyomi, ...k.examples.map((e) => e.kana)].join(" ").toLowerCase().includes(q),
    );
  }, [kanji, query]);

  if (failed) return <LoadError />;
  const selected = kanji?.find((k) => k.id === selectedId);

  const addToFlashcard = (id) => {
    const added = addToSrs([id]);
    setInSrs((s) => new Set([...s, id]));
    showToast(added ? "Kanji ditambahkan ke flashcard." : "Kanji sudah ada di flashcard.", { type: added ? "success" : "info" });
  };

  return (
    <>
      <PageTitle ja="漢字" lead="±100 kanji dasar N5 dengan animasi urutan goresan.">
        Kanji N5
      </PageTitle>

      {!selected ? <div className="mb-card mb-kanji-detail mb-kanji-detail-placeholder mb-3" aria-hidden="true" /> : null}
      {selected ? (
        <div className="mb-card mb-kanji-detail mb-3" aria-live="polite">
          <StrokeAnimator key={selected.id} text={selected.char} size={150} />
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="h3 mb-0">{selected.meaning}</h2>
              <FavoriteButton id={selected.id} label={selected.char} />
            </div>
            <dl className="row mb-2 small">
              <dt className="col-4 col-sm-3 text-secondary fw-normal">Onyomi</dt>
              <dd className="col-8 col-sm-9 mb-1" lang="ja">
                {selected.onyomi.join("、") || "—"}
              </dd>
              <dt className="col-4 col-sm-3 text-secondary fw-normal">Kunyomi</dt>
              <dd className="col-8 col-sm-9 mb-1" lang="ja">
                {selected.kunyomi.join("、") || "—"}
              </dd>
              <dt className="col-4 col-sm-3 text-secondary fw-normal">Goresan</dt>
              <dd className="col-8 col-sm-9 mb-1">{selected.strokes}</dd>
            </dl>
            <div className="small text-secondary">Contoh kata</div>
            <ul className="list-unstyled mb-2">
              {selected.examples.map((e) => (
                <li key={e.word} className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => speak(e.kana)}
                    aria-label={`Dengarkan ${e.kana}`}
                  >
                    <i className="bi bi-volume-up" aria-hidden="true" />
                  </button>
                  <span lang="ja" className="fs-5">
                    {e.word}
                  </span>
                  <span lang="ja" className="text-secondary">
                    {e.kana}
                  </span>
                  <span>— {e.meaning}</span>
                </li>
              ))}
            </ul>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={inSrs.has(selected.id)} onClick={() => addToFlashcard(selected.id)}>
                <i className={`bi ${inSrs.has(selected.id) ? "bi-check-circle-fill" : "bi-plus-circle"}`} aria-hidden="true" />{" "}
                {inSrs.has(selected.id) ? "Sudah di flashcard" : "Tambahkan ke flashcard"}
              </button>
            </div>
            {selected.reviewed === false ? <p className="small text-secondary mt-2 mb-0">Materi ini belum ditinjau penutur asli.</p> : null}
          </div>
        </div>
      ) : null}

      <form className="mb-3" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="visually-hidden" htmlFor="kanjiSearch">
          Cari kanji
        </label>
        <input
          type="search"
          className="form-control"
          id="kanjiSearch"
          placeholder="Cari kanji, arti, atau bacaan…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="mb-kanji-grid" role="group" aria-label="Daftar kanji">
        {!kanji ? <p className="text-secondary">Memuat…</p> : null}
        {shown.map((k) => (
          <button
            type="button"
            key={k.id}
            className={`mb-kanji-cell${k.id === selectedId ? " is-selected" : ""}`}
            aria-pressed={k.id === selectedId}
            aria-label={`${k.char}, ${k.meaning}`}
            onClick={() => {
              setSelectedId(k.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="mb-kanji-char" lang="ja">
              {k.char}
            </span>
            <span className="mb-kanji-meaning">{k.meaning}</span>
          </button>
        ))}
        {kanji && !shown.length ? <p className="text-secondary">Tidak ada kanji yang cocok.</p> : null}
      </div>
    </>
  );
}
