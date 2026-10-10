// Kuis: setup → sesi (pilihan ganda / ketik jawaban) → modal hasil.
import { groupRows, loadKana, loadThemes, loadVocab } from "../core/data.js";
import {
  COUNTS,
  answerLabel,
  buildQuiz,
  checkAnswer,
  filterPool,
  modesFor,
  parseQuizParams,
} from "../core/quiz-engine.js";
import { addQuizResult, addToSrs, recordActivity, setLastLesson } from "../core/storage.js";
import { speak } from "../core/tts.js";
import { escapeHtml, hankoHtml, hideModal, japaneseHtml, showLoadError, showModal } from "../core/ui.js";

const TIMER_SECONDS = 10;
const SOURCE_LABELS = { hiragana: "Hiragana", katakana: "Katakana", vocab: "Kosakata" };

const setupEl = document.getElementById("quizSetup");
const sessionEl = document.getElementById("quizSession");
const resultModal = document.getElementById("resultModal");
const resultBody = document.getElementById("resultBody");
const resultFooter = document.getElementById("resultFooter");

let data = {}; // { hiragana, katakana, vocab }
let themes = [];
let session = null;
let timer = null;

const universeOf = (source) => data[source];

// ---- Setup -----------------------------------------------------------------------

function scopeOptions(source, selected) {
  if (source === "vocab") {
    return `<option value="">Semua tema</option>${themes
      .map((t) => `<option value="theme:${t.id}"${selected === `theme:${t.id}` ? " selected" : ""}>${escapeHtml(t.label)}</option>`)
      .join("")}`;
  }
  const rows = groupRows(universeOf(source));
  const option = (value, label) => `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`;
  return [
    option("", "Semua"),
    option("group:gojuon", "Semua Gojūon"),
    option("group:dakuten", "Semua Dakuten & Handakuten"),
    option("group:yoon", "Semua Yōon"),
    ...rows.map(({ row, items }) =>
      option(`row:${row}`, `Baris ${row === "nn" ? "n" : row} (${items.map((i) => i.char).join(" ")})`),
    ),
  ].join("");
}

function scopeFromParams(p) {
  if (p.theme) return `theme:${p.theme}`;
  if (p.row) return `row:${p.row}`;
  if (p.group) return `group:${p.group}`;
  return "";
}

function renderSetup(p) {
  const scope = scopeFromParams(p);
  setupEl.innerHTML = `
    <form class="mb-card p-3 p-md-4" id="setupForm" novalidate>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="quizSource">Sumber</label>
          <select class="form-select" id="quizSource">
            ${Object.entries(SOURCE_LABELS).map(([v, l]) => `<option value="${v}"${v === p.source ? " selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="quizScope">Cakupan</label>
          <select class="form-select" id="quizScope">${scopeOptions(p.source, scope)}</select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="quizMode">Mode</label>
          <select class="form-select" id="quizMode">
            ${modesFor(p.source).map((m) => `<option value="${m.id}"${m.id === p.mode ? " selected" : ""}>${m.label}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-6">
          <span class="form-label d-block" id="countLabel">Jumlah soal</span>
          <div class="btn-group" role="group" aria-labelledby="countLabel">
            ${COUNTS.map((c) => `<input type="radio" class="btn-check" name="count" id="count${c}" value="${c}"${c === p.count ? " checked" : ""}>
              <label class="btn btn-outline-secondary" for="count${c}">${c}</label>`).join("")}
          </div>
        </div>
        <div class="col-12">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" id="quizTimer"${p.timer ? " checked" : ""}>
            <label class="form-check-label" for="quizTimer">Batasi waktu ${TIMER_SECONDS} detik per soal</label>
          </div>
        </div>
        <div class="col-12"><button type="submit" class="btn btn-primary">Mulai kuis</button></div>
      </div>
    </form>`;

  const form = document.getElementById("setupForm");
  const sourceEl = document.getElementById("quizSource");
  sourceEl.addEventListener("change", () => {
    document.getElementById("quizScope").innerHTML = scopeOptions(sourceEl.value, "");
    document.getElementById("quizMode").innerHTML = modesFor(sourceEl.value)
      .map((m) => `<option value="${m.id}">${m.label}</option>`)
      .join("");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    startFromForm();
  });
}

function readSetup() {
  const source = document.getElementById("quizSource").value;
  const [kind, value] = document.getElementById("quizScope").value.split(":");
  return {
    source,
    mode: document.getElementById("quizMode").value,
    count: Number(document.querySelector('input[name="count"]:checked').value),
    timer: document.getElementById("quizTimer").checked ? TIMER_SECONDS : 0,
    filter: { row: kind === "row" ? value : "", group: kind === "group" ? value : "", theme: kind === "theme" ? value : "" },
  };
}

function startFromForm() {
  startQuiz(readSetup());
}

// ---- Sesi ------------------------------------------------------------------------

function scopeLabel({ source, filter }) {
  if (filter.theme) return themes.find((t) => t.id === filter.theme)?.label ?? filter.theme;
  if (filter.row) return `Baris ${filter.row === "nn" ? "n" : filter.row}`;
  if (filter.group) return filter.group === "yoon" ? "Yōon" : filter.group === "dakuten" ? "Dakuten" : "Gojūon";
  return source === "vocab" ? "Semua tema" : "Semua";
}

function startQuiz(config, questions) {
  const universe = universeOf(config.source);
  const qs =
    questions ??
    buildQuiz({ pool: filterPool(universe, config.filter), universe, mode: config.mode, count: config.count });
  if (!qs.length) {
    setupEl.insertAdjacentHTML("afterbegin", `<div class="alert alert-warning" role="alert">Tidak ada soal untuk pilihan ini.</div>`);
    return;
  }

  session = { config, questions: qs, index: 0, results: [], answered: false };
  const params = new URLSearchParams({ source: config.source, mode: config.mode, count: config.count });
  for (const [k, v] of Object.entries(config.filter)) if (v) params.set(k, v);
  setLastLesson({
    page: "kuis.html",
    params: `?${params}`,
    label: `Kuis ${SOURCE_LABELS[config.source]} — ${scopeLabel(config)}`,
  });

  setupEl.hidden = true;
  sessionEl.hidden = false;
  renderQuestion();
}

function promptHtml(q) {
  const { item } = q;
  switch (q.direction) {
    case "kana-romaji":
    case "kana-type":
      return `<div class="mb-quiz-prompt" lang="ja">${escapeHtml(item.char)}</div>`;
    case "romaji-kana":
      return `<div class="mb-quiz-prompt is-text">${escapeHtml(item.romaji)}</div>`;
    case "word-meaning":
      return `<div class="mb-quiz-prompt is-text mb-word">${japaneseHtml(item.word, item.kana)}</div>`;
    default:
      return `<div class="mb-quiz-prompt is-text">${escapeHtml(item.meaning)}</div>`;
  }
}

function renderQuestion() {
  const { questions, index, config, results } = session;
  const q = questions[index];
  const correctSoFar = results.filter((r) => r.correct).length;
  const long = q.choices.some((c) => c.length > 14);

  const answerUi =
    q.kind === "mc"
      ? `<div class="mb-choices${long ? " is-long" : ""}" id="choices">${q.choices
          .map(
            (c) => `<button type="button" class="mb-choice" data-choice="${escapeHtml(c)}"${q.direction === "romaji-kana" ? ' lang="ja"' : ""}>${escapeHtml(c)}</button>`,
          )
          .join("")}</div>`
      : `<form class="d-flex gap-2" id="typeForm" autocomplete="off">
          <label class="visually-hidden" for="typeInput">Jawaban romaji</label>
          <input class="form-control form-control-lg text-center" id="typeInput" type="text" inputmode="latin"
            autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Ketik romaji…" />
          <button type="submit" class="btn btn-primary">Jawab</button></form>`;

  sessionEl.innerHTML = `
    <div class="mb-fade-in mx-auto" style="max-width: 36rem">
      <div class="d-flex justify-content-between small text-secondary mb-1">
        <span>Soal ${index + 1} / ${questions.length}</span><span>Benar: ${correctSoFar}</span>
      </div>
      <div class="progress mb-3" role="progressbar" aria-label="Kemajuan kuis" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${index}">
        <div class="progress-bar" style="width:${(index / questions.length) * 100}%"></div></div>
      ${config.timer ? `<div class="mb-timer mb-3" aria-hidden="true"><span id="timerBar"></span></div>` : ""}
      <div class="mb-card p-3 p-md-4 mb-3">
        <div class="d-flex justify-content-end"><button type="button" class="btn btn-sm btn-outline-secondary" id="quizSpeak" aria-label="Dengarkan soal"><i class="bi bi-volume-up" aria-hidden="true"></i></button></div>
        ${promptHtml(q)}
      </div>
      ${answerUi}
      <div class="mb-feedback mt-3 d-none" id="feedback" role="status" aria-live="polite"></div>
      <div class="d-flex justify-content-end mt-3"><button type="button" class="btn btn-primary d-none" id="nextBtn">
        ${index + 1 === questions.length ? "Lihat hasil" : "Lanjut"} <i class="bi bi-arrow-right" aria-hidden="true"></i></button></div>
    </div>`;
  session.answered = false;
  startTimer();
  sessionEl.querySelector("#typeInput")?.focus();
}

function startTimer() {
  stopTimer();
  if (!session.config.timer) return;
  const total = session.config.timer * 1000;
  const bar = document.getElementById("timerBar");
  const startedAt = performance.now();
  timer = setInterval(() => {
    const left = Math.max(0, total - (performance.now() - startedAt));
    bar.style.width = `${(left / total) * 100}%`;
    if (left === 0) answer(null, true);
  }, 100);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function answer(given, timedOut = false) {
  if (!session || session.answered) return;
  session.answered = true;
  stopTimer();

  const q = session.questions[session.index];
  const correct = !timedOut && checkAnswer(q, given);
  session.results.push({ question: q, given: timedOut ? "" : given, correct, timedOut });

  recordActivity();
  if (!correct) addToSrs([q.item.id], { forceDue: true });

  if (q.kind === "mc") {
    for (const btn of sessionEl.querySelectorAll(".mb-choice")) {
      btn.disabled = true;
      if (btn.dataset.choice === q.correct) btn.classList.add("is-correct");
      else if (btn.dataset.choice === given) btn.classList.add("is-wrong");
    }
  } else {
    const input = document.getElementById("typeInput");
    input.disabled = true;
    document.querySelector("#typeForm button").disabled = true;
  }

  const feedback = document.getElementById("feedback");
  feedback.classList.remove("d-none", "is-correct", "is-wrong");
  feedback.classList.add(correct ? "is-correct" : "is-wrong");
  feedback.innerHTML = correct
    ? `<strong>Benar!</strong>`
    : `<strong>${timedOut ? "Waktu habis." : "Kurang tepat."}</strong> Jawaban: <strong${q.direction === "romaji-kana" ? ' lang="ja"' : ""}>${escapeHtml(answerLabel(q))}</strong>`;

  const next = document.getElementById("nextBtn");
  next.classList.remove("d-none");
  next.focus();
}

function next() {
  if (!session?.answered) return;
  session.index += 1;
  if (session.index >= session.questions.length) finish();
  else renderQuestion();
}

// ---- Hasil -----------------------------------------------------------------------

function finish() {
  const { config, results, questions } = session;
  const correct = results.filter((r) => r.correct).length;
  const total = questions.length;
  const percent = Math.round((correct / total) * 100);
  addQuizResult({ source: config.source, mode: config.mode, total, correct });

  const wrong = results.filter((r) => !r.correct);
  resultBody.innerHTML = `
    <div class="text-center mb-3">
      ${hankoHtml(percent >= 80 ? "済" : "完")}
      <div class="mb-stat-value mt-3">${correct} / ${total}</div>
      <div class="text-secondary">${percent}% benar</div>
    </div>
    ${
      wrong.length
        ? `<h3 class="h6">Jawaban yang salah</h3><ul class="list-group">${wrong
            .map(({ question: q, given, timedOut }) => {
              const prompt = q.direction === "meaning-type" ? q.item.meaning : q.item.type === "vocab" ? `${q.item.word} (${q.item.kana})` : q.item.char;
              return `<li class="list-group-item d-flex flex-wrap justify-content-between gap-2">
                <span lang="${q.direction === "meaning-type" ? "id" : "ja"}">${escapeHtml(prompt)}</span>
                <span class="text-secondary small">Anda: ${timedOut ? "—" : escapeHtml(given)} · Benar: <strong${q.direction === "romaji-kana" ? ' lang="ja"' : ""}>${escapeHtml(answerLabel(q))}</strong></span></li>`;
            })
            .join("")}</ul>
           <p class="small text-secondary mt-2 mb-0">Item yang salah sudah masuk antrean flashcard.</p>`
        : `<p class="text-center mb-0">Sempurna! Tidak ada jawaban yang salah.</p>`
    }`;
  resultFooter.innerHTML = `
    ${wrong.length ? `<button type="button" class="btn btn-primary" id="retryWrong">Ulangi yang salah (${wrong.length})</button>` : ""}
    <button type="button" class="btn btn-outline-secondary" id="newQuiz">Kuis baru</button>
    <a class="btn btn-outline-secondary" href="index.html">Beranda</a>`;
  showModal(resultModal);
}

resultFooter.addEventListener("click", (event) => {
  if (event.target.id === "newQuiz") {
    hideModal(resultModal);
    backToSetup();
  } else if (event.target.id === "retryWrong") {
    const { config, results } = session;
    const wrongItems = results.filter((r) => !r.correct).map((r) => r.question.item);
    const universe = universeOf(config.source);
    const questions = buildQuiz({ pool: wrongItems, universe, mode: config.mode, count: wrongItems.length });
    hideModal(resultModal);
    startQuiz(config, questions);
  }
});

function backToSetup() {
  stopTimer();
  session = null;
  sessionEl.hidden = true;
  setupEl.hidden = false;
  window.scrollTo({ top: 0 });
}

// ---- Event -----------------------------------------------------------------------

sessionEl.addEventListener("click", (event) => {
  const choice = event.target.closest(".mb-choice");
  if (choice) return answer(choice.dataset.choice);
  if (event.target.closest("#nextBtn")) return next();
  if (event.target.closest("#quizSpeak")) {
    const q = session.questions[session.index];
    speak(q.item.type === "vocab" ? q.item.kana : q.item.char);
  }
});

sessionEl.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "typeForm") {
    const value = document.getElementById("typeInput").value;
    if (value.trim()) answer(value);
  }
});

document.addEventListener("keydown", (event) => {
  if (!session || sessionEl.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
  const q = session.questions[session.index];
  if (event.key === "Enter" && session.answered && !event.target.closest("button")) {
    event.preventDefault();
    next();
  } else if (!session.answered && q?.kind === "mc" && /^[1-4]$/.test(event.key)) {
    const choice = sessionEl.querySelectorAll(".mb-choice")[Number(event.key) - 1];
    if (choice) answer(choice.dataset.choice);
  }
});

try {
  const [hiragana, katakana, vocab, themeList] = await Promise.all([
    loadKana("hiragana"),
    loadKana("katakana"),
    loadVocab(),
    loadThemes(),
  ]);
  data = { hiragana, katakana, vocab };
  themes = themeList;

  const params = parseQuizParams(location.search);
  renderSetup(params);
  if (params.autostart) {
    startQuiz({
      source: params.source,
      mode: params.mode,
      count: params.count,
      timer: params.timer,
      filter: { row: params.row, group: params.group, theme: params.theme },
    });
  }
} catch (error) {
  showLoadError(setupEl, error);
}
