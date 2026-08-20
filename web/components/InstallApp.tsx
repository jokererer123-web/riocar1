"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallApp({ label, lang }: { label: string; lang: Locale }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  const copy = lang === "ru"
    ? { title: "Установить приложение RIO", body: "QR-код, баллы и акции всегда под рукой. Бесплатно, без App Store и Google Play.", install: "Установить бесплатно", ready: "Приложение установлено", ios: "В Safari нажмите «Поделиться», затем «На экран Домой».", fallback: "Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран»." }
    : lang === "en"
      ? { title: "Install the RIO app", body: "Keep your QR, points and offers one tap away. Free, with no app store required.", install: "Install for free", ready: "App installed", ios: "In Safari, tap Share, then Add to Home Screen.", fallback: "Open your browser menu and choose Install app or Add to Home screen." }
      : { title: "RIO колдонмосун орнотуу", body: "QR код, упайлар жана акциялар дайыма жаныңызда. App Store жана Google Play жок, толугу менен акысыз.", install: "Акысыз орнотуу", ready: "Колдонмо орнотулду", ios: "Safari'де Бөлүшүү баскычын, анан Башкы экранга кошууну басыңыз.", fallback: "Браузер менюсун ачып, Колдонмону орнотуу же Башкы экранга кошуу дегенди тандаңыз." };

  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if ("serviceWorker" in navigator && manifest) {
      const base = new URL(".", manifest.href).pathname;
      navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
    }
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => { setInstalled(true); setOpen(false); setPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) { setOpen(true); return; }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  return (
    <>
      <button className="btn nav-app" type="button" onClick={() => installed ? setOpen(true) : install()}>
        <span className="install-symbol">↓</span>{installed ? copy.ready : label}
      </button>
      {open && (
        <div className="modal-bg" role="presentation" onClick={() => setOpen(false)}>
          <div className="card modal install-modal ui" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <div className="app-icon">R</div>
            <p className="install-kicker">RIO · MOBILE</p>
            <h3 id="install-title">{copy.title}</h3>
            <p className="muted">{copy.body}</p>
            <div className="install-perks"><span>✓ QR</span><span>✓ LOYALTY</span><span>✓ OFFERS</span></div>
            {installed ? <p className="install-help">✓ {copy.ready}</p> : prompt ? <button className="btn install-primary" onClick={install}>{copy.install}</button> : <p className="install-help">{isIos ? copy.ios : copy.fallback}</p>}
          </div>
        </div>
      )}
    </>
  );
}
