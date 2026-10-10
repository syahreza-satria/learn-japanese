"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import Hanko from "@/components/Hanko";
import JaWord from "@/components/JaWord";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import { loadItemIndex, loadThemes, speechText } from "@/lib/data";
import { useSettings } from "@/lib/hooks";
import { shuffle } from "@/lib/random";
import { GRADE, newCard, review, toDateStr } from "@/lib/srs";
import { getFavorites, getMistakes, getSrs, gradeCard, setLastLesson, updateSettings } from "@/lib/storage";
import { speak } from "@/lib/tts";

const NEW_PER_SESSION = 20;
const PRACTICE_ALL_LIMIT = 30;
const DECKS = ["due", "hiragana", "katakana", "vocab", "kanji", "fav", "weak"];
const WEAK_LIMIT = 30;

const GRADES = [
  { grade: GRADE.FORGOT, label: "Lupa", btn: "btn-outline-primary" },
  { grade: GRADE.HARD, label: "Sulit", btn: "btn-outline-secondary" },
  { grade: GRADE.GOOD, label: "Bisa", btn: "btn-outline-secondary" },
  { grade: GRADE.EASY, label: "Mudah", btn: "btn-outline-secondary" },
];

function deckItems(index, { deck, theme }) {
  const items = [...index.values()];
  if (deck === "hiragana" || deck === "katakana") return items.filter((i) => i.script === deck);
  if (deck === "vocab") return items.filter((i) => i.type === "vocab" && (!theme || i.theme === theme));
  if (deck === "kanji") return items.filter((i) => i.type === "kanji");
  if (deck === "fav") {
    const favs = new Set(getFavorites());
    return items.filter((i) => favs.has(i.id));
  }
  return [];
}

/** Item yang paling sering salah/dilupakan, urut dari yang terbanyak. */
function weakIds(index) {
  return Object.entries(getMistakes())
    .filter(([id]) => index.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, WEAK_LIMIT)
    .map(([id]) => id);
}

/** Susun antrean kartu: yang jatuh tempo dulu, lalu kartu baru (dibatasi per sesi). */
function buildQueue(index, spec) {
  const today = toDateStr();
  const srs = getSrs();
  if (spec.all) {
    const items = spec.deck === "due" ? [...index.values()].filter((i) => srs[i.id]) : deckItems(index, spec);
    return shuffle(items.map((i) => i.id)).slice(0, PRACTICE_ALL_LIMIT);
  }
  if (spec.deck === "weak") return weakIds(index);
  if (spec.deck === "due") {
    return Object.keys(srs)
      .filter((id) => index.has(id) && srs[id].due <= today)
      .sort((a, b) => srs[a].due.localeCompare(srs[b].due));
  }
  const items = deckItems(index, spec);
  const due = items.filter((i) => srs[i.id] && srs[i.id].due <= today).map((i) => i.id);
  const fresh = items.filter((i) => !srs[i.id]).map((i) => i.id);
  return [...shuffle(due), ...fresh.slice(0, NEW_PER_SESSION)];
}

function CardFront({ item, showRomaji, reverse }) {
  if (reverse) {
    // Arah Indonesia → Jepang: depan menampilkan arti (kana: romaji)
    return item.type === "kana" ? (
      <div className="mb-flashcard-big">{item.romaji}</div>
    ) : (
      <div className="h2 mb-0">{item.meaning}</div>
    );
  }
  return (
    <>
      <div className={`mb-flashcard-big${item.type === "vocab" ? " is-word" : ""}`} lang="ja">
        {item.type === "vocab" ? item.word : item.char}
      </div>
      {showRomaji && item.romaji ? <div className="text-secondary">{item.romaji}</div> : null}
    </>
  );
}

function CardBack({ item }) {
  if (item.type === "kana") {
    return (
      <>
        <div className="mb-flashcard-big" lang="ja">
          {item.char}
        </div>
        <div className="h3 mb-0">{item.romaji}</div>
        <div className="text-secondary small">Contoh</div>
        <div>
          <span lang="ja" className="fs-5">
            {item.example.word}
          </span>{" "}
          <span className="text-secondary">({item.example.romaji})</span>
          <br />
          {item.example.meaning}
        </div>
      </>
    );
  }
  if (item.type === "kanji") {
    return (
      <>
        <div className="mb-flashcard-big" lang="ja">
          {item.char}
        </div>
        <div className="h4 mb-0">{item.meaning}</div>
        <div className="small" lang="ja">
          音 {item.onyomi.join("、") || "—"} ・ 訓 {item.kunyomi.join("、") || "—"}
        </div>
        <div className="small text-secondary">Contoh</div>
        <div>
          <span lang="ja" className="fs-5">
            {item.examples[0].word}
          </span>{" "}
          <span lang="ja" className="text-secondary">
            ({item.examples[0].kana})
          </span>
          <br />
          {item.examples[0].meaning}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="mb-word fs-2">
        <JaWord word={item.word} kana={item.kana} />
      </div>
      <div className="text-secondary">{item.romaji}</div>
      <div className="h4 mb-1">{item.meaning}</div>
      <div className="small text-secondary">Contoh</div>
      <div>
        <span lang="ja">{item.example.jp}</span>
        <br />
        {item.example.id}
      </div>
    </>
  );
}

export default function FlashcardPage() {
  const [settings] = useSettings();
  const [index, setIndex] = useState(null);
  const [themes, setThemes] = useState([]);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState(null);
  const [practice, setPractice] = useState(null); // spec "Latih tetap" saat dek kosong
  const [themeChoice, setThemeChoice] = useState("");
  const [version, setVersion] = useState(0); // paksa hitung ulang jumlah kartu di picker

  const deckLabel = useCallback(
    ({ deck, theme }) => {
      if (deck === "due") return "Review hari ini";
      if (deck === "hiragana") return "Hiragana";
      if (deck === "katakana") return "Katakana";
      if (deck === "kanji") return "Kanji";
      if (deck === "fav") return "Favorit";
      if (deck === "weak") return "Item lemah";
      return theme ? `Kosakata — ${themes.find((t) => t.id === theme)?.label ?? theme}` : "Kosakata";
    },
    [themes],
  );

  const startSession = useCallback(
    (spec) => {
      const queue = buildQueue(index, spec);
      if (!queue.length) {
        setPractice({ deck: spec.deck, theme: spec.theme, all: true });
        return;
      }
      setPractice(null);
      setSession({ spec, queue, total: queue.length, done: [], counts: [0, 0, 0, 0], flipped: false });
      const params = new URLSearchParams({ deck: spec.deck });
      if (spec.theme) params.set("theme", spec.theme);
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
      setLastLesson({ page: "flashcard", params: `?${params}`, label: `Flashcard — ${deckLabel(spec)}` });
    },
    [index, deckLabel],
  );

  useEffect(() => {
    Promise.all([loadItemIndex(), loadThemes()])
      .then(([idx, themeList]) => {
        setIndex(idx);
        setThemes(themeList);
      })
      .catch(() => setFailed(true));
  }, []);

  // Deep link ?deck=... dijalankan sekali setelah data siap.
  useEffect(() => {
    if (!index) return;
    const params = new URLSearchParams(window.location.search);
    const deck = params.get("deck");
    if (DECKS.includes(deck)) startSession({ deck, theme: params.get("theme") ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const current = session?.queue.length ? index?.get(session.queue[0]) : null;

  const flip = useCallback(() => {
    setSession((s) => (s && s.queue.length ? { ...s, flipped: !s.flipped } : s));
  }, []);

  const grade = useCallback(
    (value) => {
      if (!session?.flipped || !session.queue.length) return;
      const [id, ...rest] = session.queue;
      gradeCard(id, value);
      const counts = [...session.counts];
      counts[value] += 1;
      let done = session.done;
      const queue = rest;
      if (value === GRADE.FORGOT) {
        // Muncul lagi beberapa kartu kemudian dalam sesi yang sama.
        queue.splice(Math.min(3, queue.length), 0, id);
      } else if (!done.includes(id)) {
        done = [...done, id];
      }
      setSession({ ...session, queue, done, counts, flipped: false });
    },
    [session],
  );

  useEffect(() => {
    if (!session?.queue.length) return undefined;
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, select, textarea, .modal, .offcanvas")) return;
      if (event.key === " " || event.key === "Enter") {
        if (event.target.closest?.("button, a")) return; // biarkan tombol bekerja normal
        event.preventDefault();
        flip();
      } else if (["1", "2", "3", "4"].includes(event.key) && session.flipped) {
        grade(Number(event.key) - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [session, flip, grade]);

  if (failed) return <LoadError />;

  const header = <PageTitle ja="復習" lead="Ulangi tepat waktu agar kata menetap di ingatan." >Flashcard</PageTitle>;

  // ---- Sesi selesai ----
  if (session && !session.queue.length) {
    const reviewed = session.counts.reduce((a, b) => a + b, 0);
    const remembered = session.counts[2] + session.counts[3];
    return (
      <>
        {header}
        <div className="text-center py-4 mb-fade-in">
          <div className="mb-3">
            <Hanko char="済" />
          </div>
          <h2 className="h4">Sesi selesai!</h2>
          <p className="text-secondary">
            {session.done.length} kartu ditinjau ({reviewed} penilaian), {remembered} dijawab “Bisa” atau “Mudah”.
          </p>
          <ul className="list-inline small text-secondary">
            {GRADES.map(({ label }, i) => (
              <li className="list-inline-item" key={label}>
                {label}: <strong>{session.counts[i]}</strong>
              </li>
            ))}
          </ul>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSession(null);
                setVersion((v) => v + 1);
                window.history.replaceState(null, "", window.location.pathname);
              }}
            >
              Pilih dek lain
            </button>
            <Link prefetch={false} className="btn btn-outline-secondary" href="/">
              Ke Beranda
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ---- Sesi berjalan ----
  if (session && current) {
    const percent = Math.round((session.done.length / session.total) * 100);
    const reviewedCount = session.counts.reduce((a, b) => a + b, 0);
    const srs = getSrs();
    return (
      <>
        {header}
        <div className="mb-flip-scene mb-fade-in">
          <div className="d-flex justify-content-between align-items-center small text-secondary mb-1">
            <span>{deckLabel(session.spec)}</span>
            <span>Sisa {session.queue.length} kartu</span>
          </div>
          <div
            className="progress mb-3"
            role="progressbar"
            aria-label="Kemajuan sesi"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          </div>

          <div
            key={`${current.id}-${reviewedCount}`}
            className={`mb-flashcard${session.flipped ? " is-flipped" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Kartu. Tekan untuk membalik."
            onClick={flip}
          >
            <div className="mb-card mb-flashcard-face mb-flashcard-front" aria-hidden={session.flipped}>
              <CardFront item={current} showRomaji={settings.showRomaji} reverse={settings.flashDirection === "id-jp"} />
            </div>
            <div className="mb-card mb-flashcard-face mb-flashcard-back" aria-hidden={!session.flipped}>
              <CardBack item={current} />
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3 mb-3">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => speak(speechText(current))}>
              <i className="bi bi-volume-up" aria-hidden="true" /> Dengarkan
            </button>
            <FavoriteButton id={current.id} label={current.char ?? current.word} />
            <select
              className="form-select form-select-sm w-auto"
              aria-label="Arah kartu"
              value={settings.flashDirection}
              onChange={(e) => updateSettings({ flashDirection: e.target.value })}
            >
              <option value="jp-id">Jepang → Indonesia</option>
              <option value="id-jp">Indonesia → Jepang</option>
            </select>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="flashRomaji"
                checked={settings.showRomaji}
                onChange={(e) => updateSettings({ showRomaji: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="flashRomaji">
                Romaji
              </label>
            </div>
          </div>

          {session.flipped ? (
            <div className="btn-group mb-grade-btns w-100" role="group" aria-label="Nilai ingatan Anda">
              {GRADES.map(({ grade: value, label, btn }, i) => (
                <button type="button" className={`btn ${btn}`} key={label} onClick={() => grade(value)}>
                  <span>
                    <span className="mb-kbd">{i + 1}</span>
                    {label}
                  </span>
                  <small>
                    {value === GRADE.FORGOT
                      ? "ulang sesi ini"
                      : `${review(srs[current.id] ?? newCard(), value).interval} hari`}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-primary w-100" onClick={flip}>
              Balik kartu <span className="mb-kbd ms-2">Space</span>
            </button>
          )}
        </div>
      </>
    );
  }

  // ---- Pemilihan dek ----
  const loading = !index;
  const srs = loading ? {} : getSrs();
  const today = toDateStr();
  void version;
  const dueCount = loading ? 0 : Object.keys(srs).filter((id) => index.has(id) && srs[id].due <= today).length;
  const available = (spec) => (loading ? 0 : buildQueue(index, spec).length);
  const favCount = loading ? 0 : getFavorites().filter((id) => index.has(id)).length;
  const weakCount = loading ? 0 : weakIds(index).length;

  const deckCard = ({ deck, icon, title, text, extra, disabled }) => (
    <div className="col-md-6" key={deck}>
      <div className="mb-card p-3 h-100 d-flex flex-column">
        <div className="d-flex align-items-start gap-3 mb-3">
          <i className={`bi ${icon} fs-2 text-primary`} aria-hidden="true" />
          <div>
            <h2 className="h5 mb-1">{title}</h2>
            <p className="small text-secondary mb-0">{text}</p>
          </div>
        </div>
        <div className="mt-auto">
          {extra}
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled || loading}
            onClick={() => startSession({ deck, theme: deck === "vocab" ? themeChoice : "" })}
          >
            Mulai
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {header}
      <div id="deckPicker">
        {practice ? (
          <div className="alert alert-info d-flex flex-wrap align-items-center gap-2" role="status">
            <span className="me-auto">Tidak ada kartu yang perlu ditinjau di dek ini hari ini.</span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startSession(practice)}>
              Latih tetap
            </button>
          </div>
        ) : null}
        <div className="row g-3 mb-stagger">
          {deckCard({
            deck: "due",
            icon: "bi-calendar-check",
            title: (
              <>
                Review hari ini <span className="badge text-bg-sakura">{dueCount} kartu</span>
              </>
            ),
            text: dueCount
              ? "Kartu yang sudah jatuh tempo."
              : "Belum ada kartu jatuh tempo. Tambahkan dari Kosakata atau mulai dek di bawah.",
            disabled: dueCount === 0,
          })}
          {deckCard({
            deck: "hiragana",
            icon: "bi-translate",
            title: (
              <>
                <span lang="ja">ひらがな</span> Hiragana
              </>
            ),
            text: `${available({ deck: "hiragana" })} kartu tersedia hari ini.`,
          })}
          {deckCard({
            deck: "katakana",
            icon: "bi-translate",
            title: (
              <>
                <span lang="ja">カタカナ</span> Katakana
              </>
            ),
            text: `${available({ deck: "katakana" })} kartu tersedia hari ini.`,
          })}
          {deckCard({
            deck: "kanji",
            icon: "bi-brush",
            title: (
              <>
                <span lang="ja">漢字</span> Kanji
              </>
            ),
            text: `${available({ deck: "kanji" })} kartu tersedia hari ini.`,
          })}
          {deckCard({
            deck: "fav",
            icon: "bi-star",
            title: "Favorit",
            text: favCount ? `${available({ deck: "fav" })} dari ${favCount} item favorit tersedia hari ini.` : "Tandai kata/kanji dengan bintang untuk mengumpulkannya di sini.",
            disabled: favCount === 0,
          })}
          {deckCard({
            deck: "weak",
            icon: "bi-exclamation-triangle",
            title: (
              <>
                Item lemah <span className="badge text-bg-sakura">{weakCount}</span>
              </>
            ),
            text: weakCount ? "Item yang paling sering salah atau dilupakan (maks. 30)." : "Belum ada item lemah. Jawaban salah dan “Lupa” akan tercatat di sini.",
            disabled: weakCount === 0,
          })}
          {deckCard({
            deck: "vocab",
            icon: "bi-card-text",
            title: "Kosakata",
            text: "Pilih tema, atau semua tema sekaligus.",
            extra: (
              <>
                <label className="form-label small" htmlFor="deckTheme">
                  Tema
                </label>
                <select
                  className="form-select form-select-sm mb-2"
                  id="deckTheme"
                  value={themeChoice}
                  onChange={(e) => setThemeChoice(e.target.value)}
                >
                  <option value="">Semua tema</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </>
            ),
          })}
        </div>
        <p className="small text-secondary mt-3 mb-0">
          Setiap sesi memuat kartu yang jatuh tempo ditambah maksimal {NEW_PER_SESSION} kartu baru.
        </p>
      </div>
    </>
  );
}
