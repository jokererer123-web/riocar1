"use client";

import { useEffect } from "react";

export default function Root() {
  useEffect(() => {
    const root = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : `${window.location.pathname}/`;
    window.location.replace(`${root}ky/`);
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <a href="ky/" className="gold ui">RIO CAR WASH →</a>
    </main>
  );
}
