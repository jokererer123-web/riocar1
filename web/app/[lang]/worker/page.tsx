"use client";

import Header from "@/components/Header";
import { fallbackServices, isLocale, t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Service = (typeof fallbackServices)[number] & { id?: string; points_reward?: number };
type Result = { customer_name: string; points_balance: number; points_added: number; amount: number };

export default function WorkerPage() {
  const params = useParams();
  const lang: Locale = isLocale(String(params.lang)) ? (params.lang as Locale) : "ky";
  const copy = t(lang);
  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"home" | "scan" | "manual" | "pay" | "success">("home");
  const [customerRef, setCustomerRef] = useState("");
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [serviceId, setServiceId] = useState(fallbackServices[0].slug);
  const [pay, setPay] = useState("cash");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  const labels = lang === "ru"
    ? { checking: "Проверяем сессию…", denied: "Доступ разрешён только сотрудникам.", required: "Введите QR-код, UUID или телефон клиента.", processing: "Обработка…", success: "Операция завершена", balance: "Баланс клиента", added: "Начислено", another: "Новый клиент", logout: "Выйти", camera: "Не удалось запустить камеру. Проверьте разрешение.", notFound: "Клиент или услуга не найдены.", insufficient: "У клиента недостаточно баллов." }
    : lang === "en"
      ? { checking: "Checking session…", denied: "Access is limited to staff accounts.", required: "Enter the customer's QR, UUID, or phone.", processing: "Processing…", success: "Transaction complete", balance: "Customer balance", added: "Points added", another: "Next customer", logout: "Sign out", camera: "Could not start the camera. Check camera permission.", notFound: "Customer or service not found.", insufficient: "The customer does not have enough points." }
      : { checking: "Сессия текшерилүүдө…", denied: "Кирүү кызматкерлерге гана уруксат.", required: "Кардардын QR кодун, UUID же телефонун киргизиңиз.", processing: "Иштетилүүдө…", success: "Операция аяктады", balance: "Кардардын балансы", added: "Кошулган упай", another: "Кийинки кардар", logout: "Чыгуу", camera: "Камера ачылган жок. Уруксатты текшериңиз.", notFound: "Кардар же кызмат табылган жок.", insufficient: "Кардардын упайы жетишсиз." };

  const verifyStaff = async () => {
    const sb = supabaseBrowser();
    if (!sb) { setCheckingSession(false); return; }
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) { setCheckingSession(false); return; }
    const { data: profile } = await sb.from("profiles").select("role").eq("id", auth.user.id).single();
    setAuthed(profile?.role === "worker" || profile?.role === "admin");
    if (profile && profile.role !== "worker" && profile.role !== "admin") setMsg(labels.denied);
    setCheckingSession(false);
  };

  useEffect(() => { verifyStaff(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authed) return;
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.from("services").select("id, slug, title_ky, title_ru, title_en, price, points_reward").eq("is_active", true).order("sort_order")
      .then(({ data }) => { if (data?.length) { setServices(data as Service[]); setServiceId(data[0].slug); } });
  }, [authed]);

  const login = async () => {
    setBusy(true); setMsg("");
    const sb = supabaseBrowser();
    if (!sb) { setAuthed(true); setCheckingSession(false); setBusy(false); return; }
    const loginName = workerId.trim().toLowerCase();
    const email = loginName.includes("@") ? loginName : `${loginName}@rio-workers.local`;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setMsg(error?.message || labels.denied); setBusy(false); return; }
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    if (!profile || !["worker", "admin"].includes(profile.role)) {
      await sb.auth.signOut(); setMsg(labels.denied); setBusy(false); return;
    }
    setAuthed(true); setBusy(false);
  };

  useEffect(() => {
    if (mode !== "scan" || !scanRef.current) return;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    let active = true;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("qr-reader");
        await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 230, height: 230 } }, (decoded: string) => {
          if (!active) return;
          setCustomerRef(decoded); setMode("pay"); scanner?.stop().catch(() => {});
        }, () => {});
      } catch { if (active) setMsg(labels.camera); }
    })();
    return () => { active = false; scanner?.stop().catch(() => {}).finally(() => scanner?.clear()); };
  }, [mode, labels.camera]);

  const reset = () => { setCustomerRef(""); setResult(null); setMsg(""); setMode("home"); };

  const confirm = async () => {
    if (!customerRef.trim()) { setMsg(labels.required); return; }
    setBusy(true); setMsg("");
    const sb = supabaseBrowser();
    if (!sb) {
      const service = services.find((item) => item.slug === serviceId) || services[0];
      setResult({ customer_name: "Demo customer", points_balance: 45, points_added: service.points_reward || 10, amount: Number(service.price) });
      setMode("success"); setBusy(false); return;
    }
    const { data, error } = await sb.rpc("process_loyalty_transaction", { customer_reference: customerRef.trim(), service_slug: serviceId, payment: pay });
    if (error) {
      const value = `${error.message} ${error.details || ""}`;
      setMsg(value.includes("INSUFFICIENT_POINTS") ? labels.insufficient : value.includes("NOT_FOUND") ? labels.notFound : error.message);
      setBusy(false); return;
    }
    setResult(data as Result); setMode("success"); setBusy(false);
  };

  const logout = async () => { await supabaseBrowser()?.auth.signOut(); setAuthed(false); reset(); };

  return (
    <><Header lang={lang} /><div className="container section ui worker-shell">
      <div className="portal-heading"><div><p className="section-kicker">RIO STAFF</p><h1>{copy.nav.worker}</h1></div>{authed && <button className="btn ghost" onClick={logout}>{labels.logout}</button>}</div>
      {checkingSession ? <p className="muted">{labels.checking}</p> : !authed ? (
        <div className="card portal-card"><label>{copy.workerId}</label><input autoComplete="username" value={workerId} onChange={(e) => setWorkerId(e.target.value)} /><label>{copy.password}</label><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} /><button className="btn" disabled={busy} onClick={login}>{busy ? labels.processing : copy.login}</button><p className="form-message" role="alert">{msg}</p></div>
      ) : mode === "home" ? (
        <div className="worker-actions"><button className="worker-action" onClick={() => { setMsg(""); setMode("scan"); }}><span>⌗</span><strong>{copy.scan}</strong><small>CAMERA</small></button><button className="worker-action" onClick={() => { setMsg(""); setMode("manual"); }}><span>⌨</span><strong>{copy.manual}</strong><small>PHONE / UUID</small></button></div>
      ) : mode === "scan" ? (
        <div className="card scanner-card"><div id="qr-reader" ref={scanRef} /><p className="form-message" role="alert">{msg}</p><button className="btn ghost" onClick={reset}>←</button></div>
      ) : mode === "manual" ? (
        <div className="card portal-card"><label>Customer UUID / phone</label><input autoFocus value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} onKeyDown={(e) => e.key === "Enter" && customerRef.trim() && setMode("pay")} /><button className="btn" onClick={() => customerRef.trim() ? setMode("pay") : setMsg(labels.required)}>{copy.confirm}</button><p className="form-message" role="alert">{msg}</p><button className="text-button" onClick={reset}>←</button></div>
      ) : mode === "pay" ? (
        <div className="card portal-card"><p className="customer-reference">{customerRef}</p><label>Service</label><select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((service) => <option key={service.slug} value={service.slug}>{(service as any)[`title_${lang}`]} — {Number(service.price).toLocaleString()} KGS</option>)}</select><label>{copy.payment}</label><select value={pay} onChange={(e) => setPay(e.target.value)}><option value="cash">{copy.cash}</option><option value="card">{copy.card}</option><option value="transfer">{copy.transfer}</option><option value="points">{copy.points}</option></select><button className="btn" disabled={busy} onClick={confirm}>{busy ? labels.processing : copy.confirm}</button><p className="form-message" role="alert">{msg}</p><button className="text-button" onClick={reset}>←</button></div>
      ) : (
        <div className="card portal-card success-card"><span className="success-check">✓</span><h2>{labels.success}</h2><strong>{result?.customer_name || "Customer"}</strong><div className="result-grid"><p><small>{labels.balance}</small>{result?.points_balance}</p><p><small>{labels.added}</small>+{result?.points_added}</p><p><small>KGS</small>{result?.amount}</p></div><button className="btn" onClick={reset}>{labels.another}</button></div>
      )}
    </div></>
  );
}
