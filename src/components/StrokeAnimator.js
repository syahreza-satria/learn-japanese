"use client";
import { useEffect, useState } from "react";
import { loadStrokes } from "@/lib/data";

/** Animasi urutan goresan (data KanjiVG). Karakter ganda (mis. きゃ) digambar bergantian. */
export default function StrokeAnimator({ text, size = 120 }) {
  const [strokes, setStrokes] = useState(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    loadStrokes().then(setStrokes).catch(() => setStrokes({}));
  }, []);

  const chars = [...text];
  let offset = 0;
  const glyphs = chars.map((ch) => {
    const paths = strokes?.[ch] ?? [];
    const start = offset;
    offset += paths.length;
    return { ch, paths, start };
  });
  const total = offset;

  return (
    <div className="mb-strokes text-center">
      <div className="d-flex justify-content-center gap-1" key={run}>
        {glyphs.map(({ ch, paths, start }, g) => (
          <svg
            key={`${ch}-${g}`}
            viewBox="0 0 109 109"
            width={size}
            height={size}
            role="img"
            aria-label={`Urutan goresan ${ch}`}
            className="mb-stroke-svg"
          >
            <g fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              {paths.map((d, i) => (
                <path key={`g${i}`} d={d} className="mb-stroke-ghost" />
              ))}
              {paths.map((d, i) => (
                <path
                  key={`d${i}`}
                  d={d}
                  pathLength="1"
                  className="mb-stroke-draw"
                  style={{ animationDelay: `${(start + i) * 0.6}s` }}
                />
              ))}
            </g>
          </svg>
        ))}
      </div>
      <div className="d-flex justify-content-center align-items-center gap-2 mt-1">
        <span className="small text-secondary">{total ? `${total} goresan` : "Memuat goresan…"}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRun((r) => r + 1)} disabled={!total}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Ulangi
        </button>
      </div>
    </div>
  );
}
