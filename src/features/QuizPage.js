"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Hanko from "@/components/Hanko";
import JaWord from "@/components/JaWord";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import { groupRows, loadKana, loadKanji, loadThemes, loadVocab, speechText } from "@/lib/data";
import {
  COUNTS,
  answerLabel,
  buildQuiz,
  checkAnswer,
  filterPool,
  modesFor,
  parseQuizParams,
} from "@/lib/quiz-engine";
import { useSettings } from "@/lib/hooks";
import { playSfx } from "@/lib/sfx";
import {
  addQuizResult,
  addToSrs,
  getFavorites,
  getMistakes,
  recordActivity,
  recordMistake,
  setLastLesson,
  updateSettings,
} from "@/lib/storage";
import { speak } from "@/lib/tts";

const TIMER_SECONDS = 10;
const SOURCE_LABELS = { hiragana: "Hiragana", katakana: "Katakana", vocab: "Kosakata", kanji: "Kanji" };
const LISTEN = ["listen-romaji", "listen-meaning"];
const JA_CHOICES = ["romaji-kana", "meaning-word", "meaning-kanji"];

/** Daftar id untuk cakupan khusus (favorit / item lemah). */
const scopeIds = (scope) =>
  scope === "fav" ? getFavorites() : scope === "weak" ? Object.keys(getMistakes()) : null;

function scopeLabel({ source, filter }, themes) {
  if (filter.scope === "fav") return "Favorit";
  if (filter.scope === "weak") return "Item lemah";
  if (filter.theme) return themes.find((t) => t.id === filter.theme)?.label ?? filter.theme;
  if (filter.row) return `Baris ${filter.row === "nn" ? "n" : filter.row}`;
  if (filter.group) return filter.group === "yoon" ? "Yōon" : filter.group === "dakuten" ? "Dakuten" : "Gojūon";
  return source === "vocab" ? "Semua tema" : "Semua";
}

function scopeFromParams(p) {
  if (p.scope) return `scope:${p.scope}`;
  if (p.theme) return `theme:${p.theme}`;
  if (p.row) return `row:${p.row}`;
  if (p.group) return `group:${p.group}`;
  return "";
}

function Prompt({ q }) {
  const { item } = q;
  switch (q.direction) {
    case "kana-romaji":
    case "kana-type":
    case "kanji-meaning":
      return (
        <div className="mb-quiz-prompt" lang="ja">
          {item.char}
        </div>
      );
    case "romaji-kana":
      return <div className="mb-quiz-prompt is-text">{item.romaji}</div>;
    case "word-meaning":
      return (
        <div className="mb-quiz-prompt is-text mb-word">
          <JaWord word={item.word} kana={item.kana} />
        </div>
      );
    case "listen-romaji":
    case "listen-meaning":
      return (
        <div className="text-center py-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-lg rounded-circle"
            style={{ width: "5rem", height: "5rem" }}
            aria-label="Putar suara soal"
            onClick={() => speak(speechText(item))}
          >
            <i className="bi bi-volume-up-fill fs-1" aria-hidden="true" />
          </button>
          <div className="small text-secondary mt-2">Dengarkan, lalu pilih jawabannya</div>
        </div>
      );
    default:
      // meaning-type, meaning-word, meaning-kanji
      return <div className="mb-quiz-prompt is-text">{item.meaning}</div>;
  }
}

/** Teks ringkas soal untuk daftar jawaban salah. */
function promptText(q) {
  const { item } = q;
  if (LISTEN.includes(q.direction)) return `🔊 ${speechText(item)}`;
  if (["meaning-type", "meaning-word", "meaning-kanji"].includes(q.direction)) return item.meaning;
  if (item.type === "vocab") return `${item.word} (${item.kana})`;
  return item.char;
}

export default function QuizPage() {
  const [settings] = useSettings();
  const [data, setData] = useState(null);
  const [themes, setThemes] = useState([]);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({ source: "hiragana", scope: "", mode: "mc", count: 10, timer: false });
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState(null);
  const [finished, setFinished] = useState(false);
  const [typed, setTyped] = useState("");
  const [timeLeft, setTimeLeft] = useState(1);
  const nextRef = useRef(null);
  const inputRef = useRef(null);

  // ---- Memulai kuis ----
  const startQuiz = useCallback(
    (config, questions) => {
      const universe = data[config.source];
      const qs =
        questions ??
        buildQuiz({
          pool: filterPool(universe, { ...config.filter, ids: scopeIds(config.filter.scope) }),
          universe,
          mode: config.mode,
          count: config.count,
        });
      if (!qs.length) {
        setNotice("Tidak ada soal untuk pilihan ini.");
        return;
      }
      setNotice("");
      setFinished(false);
      setTyped("");
      setSession({ config, questions: qs, index: 0, results: [], answered: null });
      const params = new URLSearchParams({ source: config.source, mode: config.mode, count: config.count });
      for (const [k, v] of Object.entries(config.filter)) if (v) params.set(k, v);
      setLastLesson({
        page: "kuis",
        params: `?${params}`,
        label: `Kuis ${SOURCE_LABELS[config.source]} — ${scopeLabel(config, themes)}`,
      });
    },
    [data, themes],
  );

  useEffect(() => {
    Promise.all([loadKana("hiragana"), loadKana("katakana"), loadVocab(), loadKanji(), loadThemes()])
      .then(([hiragana, katakana, vocab, kanji, themeList]) => {
        setData({ hiragana, katakana, vocab, kanji });
        setThemes(themeList);
      })
      .catch(() => setFailed(true));
  }, []);

  // Deep link: isi form dari URL dan langsung mulai bila ada baris/grup/tema.
  useEffect(() => {
    if (!data) return;
    const p = parseQuizParams(window.location.search);
    setForm({ source: p.source, scope: scopeFromParams(p), mode: p.mode, count: p.count, timer: !!p.timer });
    if (p.autostart) {
      startQuiz({
        source: p.source,
        mode: p.mode,
        count: p.count,
        timer: p.timer,
        filter: { row: p.row, group: p.group, theme: p.theme, scope: p.scope },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ---- Menjawab ----
  const answer = (given, timedOut = false) => {
    if (!session || session.answered) return;
    const q = session.questions[session.index];
    const correct = !timedOut && checkAnswer(q, given);
    playSfx(correct ? "correct" : timedOut ? "timeout" : "wrong");
    recordActivity();
    if (!correct) {
      addToSrs([q.item.id], { forceDue: true });
      recordMistake(q.item.id);
    }
    setSession({
      ...session,
      results: [...session.results, { question: q, given: timedOut ? "" : given, correct, timedOut }],
      answered: { given, correct, timedOut },
    });
  };
  const answerRef = useRef(answer);

  const next = () => {
    if (!session?.answered) return;
    const index = session.index + 1;
    if (index >= session.questions.length) {
      const correct = session.results.filter((r) => r.correct).length;
      addQuizResult({
        source: session.config.source,
        mode: session.config.mode,
        total: session.questions.length,
        correct,
      });
      const pct = (correct / session.questions.length) * 100;
      playSfx(pct >= 80 ? "win" : "done");
      setFinished(true);
      return;
    }
    setTyped("");
    setSession({ ...session, index, answered: null });
  };
  const nextHandler = useRef(next);

  // Simpan handler terbaru untuk timer & pintasan keyboard (tanpa menulis ref saat render).
  useEffect(() => {
    answerRef.current = answer;
    nextHandler.current = next;
  });

  // Timer per soal
  const timerSeconds = session?.config.timer ?? 0;
  const questionIndex = session?.index;
  const isAnswered = !!session?.answered;
  useEffect(() => {
    if (!timerSeconds || isAnswered || finished || questionIndex === undefined) return undefined;
    const total = timerSeconds * 1000;
    const startedAt = performance.now();
    setTimeLeft(1);
    const id = setInterval(() => {
      const left = Math.max(0, total - (performance.now() - startedAt));
      setTimeLeft(left / total);
      if (left === 0) {
        clearInterval(id);
        answerRef.current(null, true);
      }
    }, 100);
    return () => clearInterval(id);
  }, [timerSeconds, questionIndex, isAnswered, finished]);

  // Soal mendengar: putar otomatis saat soal baru muncul
  useEffect(() => {
    if (!session || finished) return;
    const q = session.questions[session.index];
    if (LISTEN.includes(q.direction)) speak(speechText(q.item));
  }, [session?.index, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fokus: input ketik saat soal baru, tombol Lanjut setelah menjawab
  useEffect(() => {
    if (!session) return;
    if (session.answered) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [session?.index, isAnswered]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pintasan keyboard: Enter = lanjut, 1–4 = pilih jawaban
  useEffect(() => {
    if (!session || finished) return undefined;
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.(".modal")) return;
      const q = session.questions[session.index];
      if (event.key === "Enter" && session.answered && !event.target.closest?.("button")) {
        event.preventDefault();
        nextHandler.current();
      } else if (!session.answered && q.kind === "mc" && /^[1-4]$/.test(event.key)) {
        const choice = q.choices[Number(event.key) - 1];
        if (choice !== undefined) answerRef.current(choice);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [session, finished]);

  if (failed) return <LoadError />;

  const header = <PageTitle ja="試験" lead="Uji hafalanmu. Jawaban salah otomatis masuk antrean review.">Kuis</PageTitle>;

  // ---- Setup ----
  if (!session) {
    const loading = !data;
    const setField = (patch) => setForm((f) => ({ ...f, ...patch }));
    const changeSource = (source) => setField({ source, scope: "", mode: "mc" });
    const [kind, value] = form.scope.split(":");
    const rows = !loading && form.source !== "vocab" ? groupRows(data[form.source]) : [];

    return (
      <div id="quizSetup">
        {header}
        {notice ? (
          <div className="alert alert-warning" role="alert">
            {notice}
          </div>
        ) : null}
        <form
          className="mb-card p-3 p-md-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (loading) return;
            startQuiz({
              source: form.source,
              mode: form.mode,
              count: form.count,
              timer: form.timer ? TIMER_SECONDS : 0,
              filter: {
                row: kind === "row" ? value : "",
                group: kind === "group" ? value : "",
                theme: kind === "theme" ? value : "",
                scope: kind === "scope" ? value : "",
              },
            });
          }}
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="quizSource">
                Sumber
              </label>
              <select
                className="form-select"
                id="quizSource"
                value={form.source}
                onChange={(e) => changeSource(e.target.value)}
              >
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="quizScope">
                Cakupan
              </label>
              <select
                className="form-select"
                id="quizScope"
                value={form.scope}
                onChange={(e) => setField({ scope: e.target.value })}
              >
                {form.source === "kanji" ? (
                  <option value="">Semua kanji</option>
                ) : form.source === "vocab" ? (
                  <>
                    <option value="">Semua tema</option>
                    {themes.map((t) => (
                      <option key={t.id} value={`theme:${t.id}`}>
                        {t.label}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="">Semua</option>
                    <option value="group:gojuon">Semua Gojūon</option>
                    <option value="group:dakuten">Semua Dakuten &amp; Handakuten</option>
                    <option value="group:yoon">Semua Yōon</option>
                    {rows.map(({ row, items }) => (
                      <option key={row} value={`row:${row}`}>
                        Baris {row === "nn" ? "n" : row} ({items.map((i) => i.char).join(" ")})
                      </option>
                    ))}
                  </>
                )}
                <option value="scope:fav">★ Favorit saya</option>
                <option value="scope:weak">⚠ Item lemah</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="quizMode">
                Mode
              </label>
              <select
                className="form-select"
                id="quizMode"
                value={form.mode}
                onChange={(e) => setField({ mode: e.target.value })}
              >
                {modesFor(form.source).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <span className="form-label d-block" id="countLabel">
                Jumlah soal
              </span>
              <div className="btn-group" role="group" aria-labelledby="countLabel">
                {COUNTS.map((c) => (
                  <span key={c} className="d-contents">
                    <input
                      type="radio"
                      className="btn-check"
                      name="count"
                      id={`count${c}`}
                      checked={form.count === c}
                      onChange={() => setField({ count: c })}
                    />
                    <label className="btn btn-outline-secondary" htmlFor={`count${c}`}>
                      {c}
                    </label>
                  </span>
                ))}
              </div>
            </div>
            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="quizTimer"
                  checked={form.timer}
                  onChange={(e) => setField({ timer: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="quizTimer">
                  Batasi waktu {TIMER_SECONDS} detik per soal
                </label>
              </div>
            </div>
            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="quizSfx"
                  checked={settings.sfx}
                  onChange={(e) => updateSettings({ sfx: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="quizSfx">
                  Efek suara
                </label>
              </div>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Mulai kuis
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ---- Sesi ----
  const { config, questions, index, results, answered } = session;
  const q = questions[index];
  const correctSoFar = results.filter((r) => r.correct).length;
  const long = q.choices.some((c) => c.length > 14);
  const wrong = results.filter((r) => !r.correct);
  const correctCount = results.length - wrong.length;
  const percent = results.length ? Math.round((correctCount / questions.length) * 100) : 0;

  const backToSetup = () => {
    setSession(null);
    setFinished(false);
    window.scrollTo({ top: 0 });
  };

  const retryWrong = () => {
    const wrongItems = wrong.map((r) => r.question.item);
    const retry = buildQuiz({
      pool: wrongItems,
      universe: data[config.source],
      mode: config.mode,
      count: wrongItems.length,
    });
    startQuiz(config, retry);
  };

  return (
    <>
      {header}
      <div className="mb-fade-in mx-auto" key={index} style={{ maxWidth: "36rem" }}>
        <div className="d-flex justify-content-between small text-secondary mb-1">
          <span>
            Soal {index + 1} / {questions.length}
          </span>
          <span className="d-flex align-items-center gap-2">
            Benar: {correctSoFar}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary border-0 py-0"
              aria-pressed={settings.sfx}
              aria-label={settings.sfx ? "Matikan efek suara" : "Nyalakan efek suara"}
              onClick={() => updateSettings({ sfx: !settings.sfx })}
            >
              <i className={`bi ${settings.sfx ? "bi-volume-up-fill" : "bi-volume-mute"}`} aria-hidden="true" />
            </button>
          </span>
        </div>
        <div
          className="progress mb-3"
          role="progressbar"
          aria-label="Kemajuan kuis"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index}
        >
          <div className="progress-bar" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        {config.timer ? (
          <div className="mb-timer mb-3" aria-hidden="true">
            <span style={{ width: `${answered ? 0 : timeLeft * 100}%` }} />
          </div>
        ) : null}

        <div className="mb-card p-3 p-md-4 mb-3">
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              aria-label="Dengarkan soal"
              onClick={() => speak(speechText(q.item))}
            >
              <i className="bi bi-volume-up" aria-hidden="true" />
            </button>
          </div>
          <Prompt q={q} />
        </div>

        {q.kind === "mc" ? (
          <div className={`mb-choices mb-stagger${long ? " is-long" : ""}`}>
            {q.choices.map((c) => {
              let state = "";
              if (answered) {
                if (c === q.correct) state = " is-correct";
                else if (c === answered.given) state = " is-wrong";
              }
              return (
                <button
                  type="button"
                  key={c}
                  className={`mb-choice${state}`}
                  disabled={!!answered}
                  lang={JA_CHOICES.includes(q.direction) ? "ja" : undefined}
                  onClick={() => answer(c)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="d-flex gap-2"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) answer(typed);
            }}
          >
            <label className="visually-hidden" htmlFor="typeInput">
              Jawaban romaji
            </label>
            <input
              ref={inputRef}
              className="form-control form-control-lg text-center"
              id="typeInput"
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Ketik romaji…"
              value={typed}
              disabled={!!answered}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={!!answered}>
              Jawab
            </button>
          </form>
        )}

        {answered ? (
          <div
            id="feedback"
            className={`mb-feedback mt-3 ${answered.correct ? "is-correct" : "is-wrong"}`}
            role="status"
            aria-live="polite"
          >
            {answered.correct ? (
              <strong>Benar!</strong>
            ) : (
              <>
                <strong>{answered.timedOut ? "Waktu habis." : "Kurang tepat."}</strong> Jawaban:{" "}
                <strong lang={JA_CHOICES.includes(q.direction) ? "ja" : undefined}>{answerLabel(q)}</strong>
              </>
            )}
          </div>
        ) : null}

        {answered ? (
          <div className="d-flex justify-content-end mt-3">
            <button type="button" className="btn btn-primary" ref={nextRef} onClick={next}>
              {index + 1 === questions.length ? "Lihat hasil" : "Lanjut"}{" "}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <Modal show={finished} centered scrollable backdrop="static" keyboard={false} aria-labelledby="resultModalLabel">
        <Modal.Header>
          <Modal.Title as="h2" className="h5" id="resultModalLabel">
            Hasil kuis
          </Modal.Title>
        </Modal.Header>
        <Modal.Body id="resultBody">
          <div className="text-center mb-3">
            <Hanko char={percent >= 80 ? "済" : "完"} />
            <div className="mb-stat-value mt-3">
              {correctCount} / {questions.length}
            </div>
            <div className="text-secondary">{percent}% benar</div>
          </div>
          {wrong.length ? (
            <>
              <h3 className="h6">Jawaban yang salah</h3>
              <ul className="list-group">
                {wrong.map(({ question: wq, given, timedOut }) => (
                  <li className="list-group-item d-flex flex-wrap justify-content-between gap-2" key={wq.item.id}>
                    <span lang={["meaning-type", "meaning-word", "meaning-kanji"].includes(wq.direction) ? "id" : "ja"}>
                      {promptText(wq)}
                    </span>
                    <span className="text-secondary small">
                      Anda: {timedOut ? "—" : given} · Benar:{" "}
                      <strong lang={JA_CHOICES.includes(wq.direction) ? "ja" : undefined}>{answerLabel(wq)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small text-secondary mt-2 mb-0">Item yang salah sudah masuk antrean flashcard.</p>
            </>
          ) : (
            <p className="text-center mb-0">Sempurna! Tidak ada jawaban yang salah.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="flex-wrap">
          {wrong.length ? (
            <button type="button" className="btn btn-primary" onClick={retryWrong}>
              Ulangi yang salah ({wrong.length})
            </button>
          ) : null}
          <button type="button" className="btn btn-outline-secondary" onClick={backToSetup}>
            Kuis baru
          </button>
          <Link prefetch={false} className="btn btn-outline-secondary" href="/">
            Beranda
          </Link>
        </Modal.Footer>
      </Modal>
    </>
  );
}
