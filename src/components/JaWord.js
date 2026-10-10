/** Teks Jepang dengan furigana (<ruby>) bila `word` memuat kanji. */
export default function JaWord({ word, kana }) {
  if (word && kana && word !== kana) {
    return (
      <ruby lang="ja">
        {word}
        <rp>(</rp>
        <rt>{kana}</rt>
        <rp>)</rp>
      </ruby>
    );
  }
  return <span lang="ja">{kana || word}</span>;
}
