"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lessonHref } from "@/lib/lesson";
import { toDateStr } from "@/lib/srs";
import { computeStreak, countDue } from "@/lib/stats";
import { getActivity, getLastLesson, getSettings, getSrs } from "@/lib/storage";

const PATHS = [
  { href: "/kana", glyph: "あ", title: "Hiragana & Katakana", text: "208 karakter dengan suara dan kuis." },
  { href: "/kosakata", glyph: "語", title: "Kosakata", text: "±300 kata N5 per tema, lengkap dengan contoh kalimat." },
  { glyph: "漢", title: "Kanji", text: "±100 kanji dasar N5.", soon: true },
  { glyph: "文", title: "Tata bahasa", text: "±80 pola kalimat N5.", soon: true },
];

export default function HomePage() {
  const [summary, setSummary] = useState({ lesson: null, due: 0, streak: 0, done: 0, goal: 10 });

  useEffect(() => {
    const today = toDateStr();
    const activity = getActivity();
    setSummary({
      lesson: getLastLesson(),
      due: countDue(getSrs(), today),
      streak: computeStreak(activity, today).current,
      done: activity[today] ?? 0,
      goal: Math.max(1, getSettings().dailyGoal),
    });
  }, []);

  const { lesson, due, streak, done, goal } = summary;
  const href = lesson ? lessonHref(lesson) : "/kana";
  const percent = Math.min(100, Math.round((done / goal) * 100));

  return (
    <>
      <section className="mb-hero mb-fade-in" aria-labelledby="heroTitle">
        <p className="mb-2 text-secondary" lang="ja">
          日本語 · N5
        </p>
        <h1 className="mb-hero-title mb-3" id="heroTitle">
          <span lang="ja" className="mb-accent">
            まなび
          </span>
          <br />
          Belajar bahasa Jepang,
          <br />
          selangkah demi selangkah.
        </h1>
        <p className="mb-lead mb-4">Dari nol sampai JLPT N5. Gratis, tanpa akun, cukup 5–15 menit sehari.</p>
        <Link prefetch={false} className="btn btn-primary btn-lg" href={href}>
          {lesson ? "Lanjutkan belajar" : "Mulai belajar Hiragana"}
        </Link>
      </section>

      <section className="row g-3 mt-1" aria-label="Aktivitas hari ini">
        <div className="col-md-6">
          <div className="mb-card p-3 h-100">
            <h2 className="h6 text-secondary mb-2">Lanjutkan belajar</h2>
            <p className="mb-3 fs-5 mb-serif">{lesson?.label ?? "Hiragana — Gojūon"}</p>
            <Link prefetch={false} className="btn btn-primary" href={href}>
              {lesson ? "Lanjutkan" : "Mulai belajar"} <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-card p-3 h-100">
            <h2 className="h6 text-secondary mb-2">Review hari ini</h2>
            {due ? (
              <>
                <p className="mb-3 fs-5 mb-serif">{due} kartu menunggu</p>
                <Link prefetch={false} className="btn btn-primary" href="/flashcard?deck=due">
                  Mulai review <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <p className="mb-3 text-secondary">
                  Tidak ada kartu yang jatuh tempo (0 kartu). Pilih dek untuk mulai berlatih.
                </p>
                <Link prefetch={false} className="btn btn-outline-secondary" href="/flashcard">
                  Pilih dek
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mb-card mb-stat h-100">
            <div className="mb-stat-value">
              {streak} <small className="fs-6">hari</small>
            </div>
            <div className="mb-stat-label">
              <i className="bi bi-fire" aria-hidden="true" /> Streak belajar
            </div>
          </div>
        </div>
        <div className="col-6 col-md-9">
          <div className="mb-card mb-stat h-100">
            <div className="mb-stat-value">
              {done} / {goal} <small className="fs-6">review</small>
            </div>
            <div className="mb-stat-label">
              <i className="bi bi-bullseye" aria-hidden="true" /> Target harian
            </div>
            <div
              className="progress mt-2"
              role="progressbar"
              aria-label="Target harian"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <hr className="mb-divider" />

      <section aria-labelledby="pathsTitle">
        <h2 className="h4 mb-3" id="pathsTitle">
          Jalur belajar
        </h2>
        <div className="row g-3">
          {PATHS.map(({ href: to, glyph, title, text, soon }) => {
            const body = (
              <>
                <div className="mb-path-glyph" lang="ja" aria-hidden="true">
                  {glyph}
                </div>
                <h3 className="h6 mt-2 mb-1">
                  {title} {soon ? <span className="badge text-bg-sakura">Segera hadir</span> : null}
                </h3>
                <p className="small text-secondary mb-0">{text}</p>
              </>
            );
            return (
              <div className="col-6 col-lg-3" key={title}>
                {soon ? (
                  <div className="mb-card mb-path-card is-soon" aria-disabled="true">
                    {body}
                  </div>
                ) : (
                  <Link prefetch={false} className="mb-card mb-path-card" href={to}>
                    {body}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
