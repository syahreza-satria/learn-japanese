export default function Hanko({ char = "済", round = false }) {
  return (
    <span className={`mb-hanko${round ? " mb-hanko-round" : ""}`} lang="ja" aria-hidden="true">
      {char}
    </span>
  );
}
