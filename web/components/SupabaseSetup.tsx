"use client";

import { configureSupabase } from "@/lib/supabase";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function SupabaseSetup({ lang }: { lang: Locale }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const text = lang === "ru"
    ? { title: "Подключить базу Rio", body: "Один раз введите Project URL и публичный Publishable/anon key из Supabase → Project Settings → API. Секретный service_role key здесь использовать нельзя.", url: "Project URL", key: "Publishable / anon key", save: "Сохранить безопасное подключение", error: "Проверьте URL и публичный ключ." }
    : lang === "en"
      ? { title: "Connect the Rio database", body: "Once per device, enter the Project URL and public Publishable/anon key from Supabase → Project Settings → API. Never use the secret service_role key here.", url: "Project URL", key: "Publishable / anon key", save: "Save secure connection", error: "Check the URL and public key." }
      : { title: "Rio базасын туташтыруу", body: "Бул түзмөктө бир жолу Supabase → Project Settings → API бөлүмүндөгү Project URL жана ачык Publishable/anon key киргизиңиз. Жашыруун service_role ачкычын колдонбоңуз.", url: "Project URL", key: "Publishable / anon key", save: "Коопсуз туташууну сактоо", error: "URL жана ачык ачкычты текшериңиз." };

  const save = () => {
    if (!configureSupabase(url, key)) { setError(text.error); return; }
    window.location.reload();
  };

  return (
    <div className="card portal-card setup-card">
      <span className="setup-icon">⌁</span><h2>{text.title}</h2><p className="muted">{text.body}</p>
      <label>{text.url}</label><input value={url} placeholder="https://xxxx.supabase.co" onChange={(event) => setUrl(event.target.value)} />
      <label>{text.key}</label><textarea value={key} rows={4} placeholder="sb_publishable_... / eyJ..." onChange={(event) => setKey(event.target.value)} />
      <button className="btn" onClick={save}>{text.save}</button>{error && <p className="form-message">{error}</p>}
    </div>
  );
}
