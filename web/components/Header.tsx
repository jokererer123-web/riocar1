"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { locales, t, type Locale } from "@/lib/i18n";

const WA = "https://wa.me/996505696797";

export default function Header({ lang }: { lang: Locale }) {
  const copy = t(lang);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const localizedPath = (locale: Locale) => {
    const parts = pathname.split("/");
    parts[1] = locale;
    return parts.join("/") || `/${locale}`;
  };

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href={`/${lang}`} aria-label={copy.brand}>
            <span className="brand-mark">R</span>
            <span><strong>RIO</strong><small>CAR WASH</small></span>
          </Link>

          <button
            className="menu-toggle"
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span /><span /><span />
          </button>

          <nav className={`nav-links ui ${open ? "open" : ""}`} aria-label="Main navigation">
            <div className="nav-section-links">
              <Link href={`/${lang}#services`}>{copy.nav.services}</Link>
              <Link href={`/${lang}#gallery`}>{copy.nav.gallery}</Link>
              <Link href={`/${lang}#reviews`}>{copy.nav.reviews}</Link>
              <Link href={`/${lang}#contact`}>{copy.nav.contact}</Link>
            </div>
            <div className="langs" aria-label="Language">
              {locales.map((locale) => (
                <Link
                  key={locale}
                  href={localizedPath(locale)}
                  className={locale === lang ? "active" : ""}
                  aria-current={locale === lang ? "page" : undefined}
                >
                  {locale.toUpperCase()}
                </Link>
              ))}
            </div>
            <a className="btn ghost nav-whatsapp" href={WA} target="_blank" rel="noreferrer">
              {copy.wa}
            </a>
            <button className="btn nav-app" type="button" onClick={() => setAppOpen(true)}>
              {copy.download}
            </button>
          </nav>
        </div>
      </header>

      {appOpen && (
        <div className="modal-bg" role="presentation" onClick={() => setAppOpen(false)}>
          <div className="card modal ui" role="dialog" aria-modal="true" aria-labelledby="app-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAppOpen(false)} aria-label="Close">×</button>
            <div className="app-icon">R</div>
            <h3 id="app-modal-title">{copy.appModalTitle}</h3>
            <p className="muted">{copy.appModalBody}</p>
            <div className="apk-badge">
              <span className="android-mark">◆</span>
              <div><small>DIRECT DOWNLOAD</small><strong>Android APK</strong></div>
              <b>FREE</b>
            </div>
            <p className="apk-note">{lang === "ru" ? "APK-файл готовится к бесплатной загрузке." : lang === "en" ? "The APK is being prepared for free download." : "APK акысыз жүктөө үчүн даярдалууда."}</p>
            <button className="btn" onClick={() => setAppOpen(false)}>OK</button>
          </div>
        </div>
      )}
    </>
  );
}
