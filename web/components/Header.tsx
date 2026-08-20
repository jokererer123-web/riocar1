"use client";

import Link from "next/link";
import { useState } from "react";
import { locales, t, type Locale } from "@/lib/i18n";

const WA = "https://wa.me/505696797";

export default function Header({ lang }: { lang: Locale }) {
  const copy = t(lang);
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href={`/${lang}`}>
            <strong className="gold">{copy.brand}</strong>
          </Link>
          <nav className="ui" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <a href="#services">{copy.nav.services}</a>
            <a href="#gallery">{copy.nav.gallery}</a>
            <a href="#reviews">{copy.nav.reviews}</a>
            <a href="#contact">{copy.nav.contact}</a>
            <Link href={`/${lang}/admin`}>{copy.nav.admin}</Link>
            <Link href={`/${lang}/worker`}>{copy.nav.worker}</Link>
            <span className="langs">
              {locales.map((l) => (
                <Link key={l} href={`/${l}`}>
                  <button className={l === lang ? "active" : ""} type="button">
                    {l.toUpperCase()}
                  </button>
                </Link>
              ))}
            </span>
            <a className="btn ghost" href={WA} target="_blank" rel="noreferrer">
              {copy.wa}
            </a>
            <button className="btn" type="button" onClick={() => setOpen(true)}>
              {copy.download}
            </button>
          </nav>
        </div>
      </header>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="card modal ui" onClick={(e) => e.stopPropagation()}>
            <h3>{copy.appModalTitle}</h3>
            <p className="muted" style={{ margin: "12px 0 20px" }}>
              {copy.appModalBody}
            </p>
            <p className="muted">Expo: <code>cd mobile && npx expo start</code></p>
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
