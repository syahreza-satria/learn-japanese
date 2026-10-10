// Tautan "Lanjutkan belajar" dari data lastLesson (aman terhadap data lama/rusak).
const ROUTES = ["kana", "kosakata", "flashcard", "kuis", "progres"];

export function lessonHref(lesson) {
  if (!lesson?.page) return "/kana";
  const name = String(lesson.page).replace(/^\//, "").replace(/\.html$/, "");
  if (!ROUTES.includes(name)) return "/kana";
  const params = /^\?[\w=&.%-]*$/.test(lesson.params ?? "") ? lesson.params : "";
  return `/${name}${params}`;
}
