import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      // Halaman ini diekspor statis: state yang berasal dari localStorage/URL baru boleh dibaca setelah mount
      // (agar HTML prerender dan hydration konsisten), jadi setState di dalam effect memang disengaja.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  { ignores: ["out/**", ".next/**", "node_modules/**", "e2e/**", "scripts/**", "tests/**", "public/sw.js"] },
];

export default config;
