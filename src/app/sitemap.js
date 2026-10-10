import { SITE } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap() {
  return ["", "kana", "kosakata", "flashcard", "kuis", "progres"].map((path) => ({ url: SITE.baseUrl + path }));
}
