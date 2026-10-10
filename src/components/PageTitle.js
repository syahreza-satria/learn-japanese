export default function PageTitle({ ja, children, lead }) {
  return (
    <header className="mb-3">
      <h1 className="mb-page-title">
        <span lang="ja">{ja}</span> {children}
      </h1>
      {lead ? <p className="mb-lead mb-0">{lead}</p> : null}
    </header>
  );
}
