// Template (bukan layout) dirender ulang di setiap navigasi, sehingga animasi masuk halaman terpicu.
export default function Template({ children }) {
  return <div className="mb-page-enter">{children}</div>;
}
