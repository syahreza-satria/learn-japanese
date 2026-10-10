"use client";
import { useEffect, useMemo, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import Hanko from "@/components/Hanko";
import LoadError from "@/components/LoadError";
import PageTitle from "@/components/PageTitle";
import { loadGrammar } from "@/lib/data";
import { shuffle } from "@/lib/random";
import { playSfx } from "@/lib/sfx";
import { recordActivity, setLastLesson } from "@/lib/storage";
import { speak } from "@/lib/tts";

const PRACTICE_COUNT = 10;

/** Soal isian: pilih kata/partikel yang tepat untuk mengisi bagian kosong. */
function Exercise({ exercise, onAnswer, resetKey }) {
  const [picked, setPicked] = useState(null);
  useEffect(() => setPicked(null), [resetKey]);
  const [before, after] = exercise.prompt.split("___");
  const done = picked !== null;

  const choose = (choice) => {
    if (done) return;
    setPicked(choice);
    onAnswer?.(choice === exercise.answer);
  };

  return (
    <div className="mt-3">
      <div className="small text-secondary mb-1">Latihan isian</div>
      <p className="fs-5 mb-2" lang="ja">
        {before}
        <span className="px-2 border-bottom border-2" style={{ minWidth: "2rem", display: "inline-block", textAlign: "center" }}>
          {done ? exercise.answer : "　"}
        </span>
        {after}
      </p>
      <div className="d-flex flex-wrap gap-2" role="group" aria-label="Pilihan jawaban">
        {exercise.choices.map((choice) => {
          const state = done ? (choice === exercise.answer ? " is-correct" : choice === picked ? " is-wrong" : "") : "";
          return (
            <button
              type="button"
              key={choice}
              lang="ja"
              disabled={done}
              className={`btn btn-outline-secondary mb-choice-btn${state}`}
              onClick={() => choose(choice)}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {done ? (
        <p className={`small mt-2 mb-0 ${picked === exercise.answer ? "" : "text-primary"}`} role="status">
          {picked === exercise.answer ? "Benar!" : `Kurang tepat. Jawaban: ${exercise.answer}`}
        </p>
      ) : null}
    </div>
  );
}

export default function GrammarPage() {
  const [grammar, setGrammar] = useState(null);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState("");
  const [practice, setPractice] = useState(null); // { queue, index, score, answered }

  useEffect(() => {
    loadGrammar()
      .then(setGrammar)
      .catch(() => setFailed(true));
    setLastLesson({ page: "tata-bahasa", params: "", label: "Tata bahasa N5" });
  }, []);

  const categories = useMemo(() => [...new Set((grammar ?? []).map((g) => g.category))], [grammar]);
  const shown = (grammar ?? []).filter((g) => !category || g.category === category);

  if (failed) return <LoadError />;

  const header = (
    <PageTitle ja="文法" lead="±80 pola kalimat N5 dengan contoh dan latihan isian.">
      Tata bahasa N5
    </PageTitle>
  );

  // ---- Mode latihan acak ----
  if (practice) {
    const done = practice.index >= practice.queue.length;
    const current = practice.queue[practice.index];
    if (done) {
      const percent = Math.round((practice.score / practice.queue.length) * 100);
      return (
        <>
          {header}
          <div className="text-center py-4 mb-fade-in">
            <Hanko char={percent >= 80 ? "済" : "完"} />
            <h2 className="h4 mt-3">
              {practice.score} / {practice.queue.length} benar
            </h2>
            <p className="text-secondary">{percent}%</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <button type="button" className="btn btn-primary" onClick={() => startPractice()}>
                Latihan lagi
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPractice(null)}>
                Kembali ke daftar pola
              </button>
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        {header}
        <div className="mx-auto mb-fade-in" key={practice.index} style={{ maxWidth: "36rem" }}>
          <div className="d-flex justify-content-between small text-secondary mb-1">
            <span>
              Soal {practice.index + 1} / {practice.queue.length}
            </span>
            <span>Benar: {practice.score}</span>
          </div>
          <div className="progress mb-3" role="progressbar" aria-label="Kemajuan latihan" aria-valuemin={0} aria-valuemax={practice.queue.length} aria-valuenow={practice.index}>
            <div className="progress-bar" style={{ width: `${(practice.index / practice.queue.length) * 100}%` }} />
          </div>
          <div className="mb-card p-3 p-md-4">
            <div className="small text-secondary">
              {current.category} · <span lang="ja">{current.pattern}</span>
            </div>
            {current.exercise.hint ? <div className="small">{current.exercise.hint}</div> : null}
            <Exercise
              exercise={current.exercise}
              resetKey={practice.index}
              onAnswer={(correct) => {
                playSfx(correct ? "correct" : "wrong");
                recordActivity();
                setPractice((p) => ({ ...p, score: p.score + (correct ? 1 : 0), answered: true }));
              }}
            />
          </div>
          {practice.answered ? (
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-primary"
                autoFocus
                onClick={() => setPractice((p) => ({ ...p, index: p.index + 1, answered: false }))}
              >
                {practice.index + 1 === practice.queue.length ? "Lihat hasil" : "Lanjut"} <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  function startPractice() {
    const pool = (grammar ?? []).filter((g) => !category || g.category === category);
    setPractice({ queue: shuffle(pool).slice(0, PRACTICE_COUNT), index: 0, score: 0, answered: false });
  }

  return (
    <>
      {header}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="d-flex flex-wrap gap-1" role="group" aria-label="Filter kategori">
          {["", ...categories].map((c) => (
            <button
              type="button"
              key={c || "semua"}
              className={`btn btn-sm btn-outline-secondary${category === c ? " active" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c || "Semua"}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm ms-auto" disabled={!grammar} onClick={startPractice}>
          <i className="bi bi-pencil-square" aria-hidden="true" /> Latihan acak ({PRACTICE_COUNT} soal)
        </button>
      </div>

      {!grammar ? <p className="text-secondary">Memuat…</p> : null}
      <div className="mb-min-tall">
      <Accordion alwaysOpen className="mb-card">
        {shown.map((g) => (
          <Accordion.Item eventKey={g.id} key={g.id}>
            <Accordion.Header>
              <span>
                <span lang="ja" className="mb-serif me-2">
                  {g.pattern}
                </span>
                <span className="text-secondary small">{g.title}</span>
              </span>
            </Accordion.Header>
            <Accordion.Body>
              <span className="badge text-bg-sakura mb-2">{g.category}</span>
              <p>{g.explanation}</p>
              <ul className="list-unstyled">
                {g.examples.map((e) => (
                  <li key={e.jp} className="d-flex align-items-start gap-2 mb-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => speak(e.jp)}
                      aria-label={`Dengarkan: ${e.jp}`}
                    >
                      <i className="bi bi-volume-up" aria-hidden="true" />
                    </button>
                    <span>
                      <span lang="ja" className="fs-5">
                        {e.jp}
                      </span>
                      <br />
                      <span className="text-secondary small">{e.id}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Exercise exercise={g.exercise} resetKey={g.id} />
              {g.exercise.hint ? <p className="small text-secondary mt-2 mb-0">{g.exercise.hint}</p> : null}
              {g.reviewed === false ? <p className="small text-secondary mt-2 mb-0">Belum ditinjau penutur asli.</p> : null}
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
      </div>
    </>
  );
}
