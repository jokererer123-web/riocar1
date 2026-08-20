"use client";

import Header from "@/components/Header";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { hasSupabase, supabaseBrowser } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Service = {
  id: string;
  slug: string;
  title_ky: string;
  title_ru: string;
  title_en: string;
  price: number;
  points_reward: number;
};
type Customer = { id: string; full_name: string; phone: string; points_balance: number };
type CartItem = Service & { quantity: number; unitPrice: number };
type OrderResult = {
  order_id: string;
  receipt_number: number;
  customer_name: string;
  points_balance: number;
  points_added: number;
  points_redeemed: number;
  subtotal: number;
  total_amount: number;
  payment_method: string;
  duplicate: boolean;
};

const newRequestId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
      (Number(char) ^ (Math.random() * 16 >> Number(char) / 4)).toString(16)
    );

export default function WorkerPage() {
  const params = useParams();
  const lang: Locale = isLocale(String(params.lang)) ? (params.lang as Locale) : "ky";
  const copy = t(lang);
  const labels = getLabels(lang);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"home" | "scan" | "manual" | "cart" | "success">("home");
  const [customerRef, setCustomerRef] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("cash");
  const [rewardServiceId, setRewardServiceId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(newRequestId);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLDivElement>(null);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const total = useMemo(() => payment === "points" ? 0 : cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart, payment]);
  const points = useMemo(() => payment === "points" ? 0 : cart.reduce((sum, item) => sum + item.points_reward * item.quantity, 0), [cart, payment]);

  useEffect(() => {
    const verify = async () => {
      const sb = supabaseBrowser();
      if (!sb) { setCheckingSession(false); setMsg(labels.notConfigured); return; }
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) { setCheckingSession(false); return; }
      const { data: profile } = await sb.from("profiles").select("role").eq("id", auth.user.id).single();
      const allowed = profile?.role === "worker" || profile?.role === "admin";
      setAuthed(allowed);
      if (!allowed) { await sb.auth.signOut(); setMsg(labels.denied); }
      setCheckingSession(false);
    };
    verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authed) return;
    const sb = supabaseBrowser();
    if (!sb) return;
    Promise.all([
      sb.from("services").select("id, slug, title_ky, title_ru, title_en, price, points_reward").eq("is_active", true).order("sort_order"),
      sb.from("loyalty_settings").select("reward_service_id").eq("id", 1).single(),
    ]).then(([serviceResult, loyaltyResult]) => {
      if (serviceResult.error) setMsg(serviceResult.error.message);
      else setServices((serviceResult.data || []).map((service) => ({ ...service, price: Number(service.price) })) as Service[]);
      setRewardServiceId(loyaltyResult.data?.reward_service_id || null);
    });
  }, [authed]);

  const login = async () => {
    const sb = supabaseBrowser();
    if (!sb) { setMsg(labels.notConfigured); return; }
    setBusy(true); setMsg("");
    const value = loginName.trim().toLowerCase();
    const email = value.includes("@") ? value : `${value}@rio-workers.local`;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setMsg(error?.message || labels.denied); setBusy(false); return; }
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    if (!profile || !["worker", "admin"].includes(profile.role)) {
      await sb.auth.signOut(); setMsg(labels.denied); setBusy(false); return;
    }
    setAuthed(true); setPassword(""); setBusy(false);
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
          setCustomerRef(decoded);
          scanner?.stop().catch(() => undefined);
          findCustomer(decoded);
        }, () => undefined);
      } catch { if (active) setMsg(labels.camera); }
    })();
    return () => { active = false; scanner?.stop().catch(() => undefined).finally(() => scanner?.clear()); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const findCustomer = async (reference = customerRef) => {
    if (!reference.trim()) { setMsg(labels.referenceRequired); return; }
    const sb = supabaseBrowser();
    if (!sb) { setMsg(labels.notConfigured); return; }
    setBusy(true); setMsg("");
    const { data, error } = await sb.rpc("resolve_customer", { customer_reference: reference.trim() });
    if (error) { setMsg(formatError(error.message, labels)); setBusy(false); return; }
    setCustomer(data as Customer); setCustomerRef(reference.trim()); setCart([]); setPayment("cash"); setRequestId(newRequestId()); setMode("cart"); setBusy(false);
  };

  const addService = (service: Service) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === service.id);
      return existing
        ? current.map((item) => item.id === service.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item)
        : [...current, { ...service, quantity: 1, unitPrice: Number(service.price) }];
    });
    setPayment("cash");
  };

  const changeQuantity = (id: string, amount: number) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
    .filter((item) => item.quantity > 0));
  const changePrice = (id: string, value: number) => setCart((current) => current.map((item) => item.id === id ? { ...item, unitPrice: Math.max(0, value || 0) } : item));

  const choosePoints = () => {
    const reward = services.find((service) => service.id === rewardServiceId);
    if (!reward) { setMsg(labels.rewardMissing); return; }
    setCart([{ ...reward, quantity: 1, unitPrice: 0 }]); setPayment("points"); setMsg("");
  };

  const checkout = async () => {
    if (!customer || !cart.length) { setMsg(labels.cartEmpty); return; }
    const sb = supabaseBrowser();
    if (!sb) { setMsg(labels.notConfigured); return; }
    setBusy(true); setMsg("");
    const orderItems = cart.map((item) => ({ service_slug: item.slug, quantity: item.quantity, unit_price: item.unitPrice }));
    const { data, error } = await sb.rpc("create_order", {
      customer_reference: customer.id,
      items: orderItems,
      payment,
      request_id: requestId,
    });
    if (error) { setMsg(formatError(error.message, labels)); setBusy(false); return; }
    setResult(data as OrderResult); setMode("success"); setBusy(false);
  };

  const reset = () => {
    setMode("home"); setCustomerRef(""); setCustomer(null); setCart([]); setPayment("cash");
    setRequestId(newRequestId()); setResult(null); setMsg(""); setBusy(false);
  };
  const logout = async () => { await supabaseBrowser()?.auth.signOut(); reset(); setAuthed(false); };
  const title = (service: Service) => service[`title_${lang}`];

  return (
    <><Header lang={lang} /><main className="container section ui worker-shell">
      <div className="portal-heading"><div><p className="section-kicker">RIO · POS</p><h1>{copy.nav.worker}</h1></div>{authed && <button className="btn ghost" onClick={logout}>{labels.secureLogout}</button>}</div>
      {checkingSession ? <p className="muted">{labels.checking}</p> : !authed ? (
        <div className="card portal-card">
          {!hasSupabase() && <div className="config-alert">{labels.notConfigured}</div>}
          <label>{copy.workerId} / Email</label><input autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} />
          <label>{copy.password}</label><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} />
          <button className="btn" disabled={busy || !hasSupabase()} onClick={login}>{busy ? labels.processing : copy.login}</button><p className="form-message" role="alert">{msg}</p>
        </div>
      ) : mode === "home" ? (
        <div className="worker-actions"><button className="worker-action" onClick={() => { setMsg(""); setMode("scan"); }}><span>⌗</span><strong>{copy.scan}</strong><small>QR CAMERA</small></button><button className="worker-action" onClick={() => { setMsg(""); setMode("manual"); }}><span>⌨</span><strong>{copy.manual}</strong><small>PHONE / UUID</small></button></div>
      ) : mode === "scan" ? (
        <div className="card scanner-card"><div id="qr-reader" ref={scanRef} /><p className="form-message" role="alert">{msg}</p><button className="btn ghost" onClick={reset}>{labels.cancelRestart}</button></div>
      ) : mode === "manual" ? (
        <div className="card portal-card"><label>{labels.customerReference}</label><input autoFocus value={customerRef} onChange={(event) => setCustomerRef(event.target.value)} onKeyDown={(event) => event.key === "Enter" && findCustomer()} /><button className="btn" disabled={busy} onClick={() => findCustomer()}>{busy ? labels.processing : labels.findCustomer}</button><p className="form-message" role="alert">{msg}</p><button className="text-button" onClick={reset}>{labels.cancelRestart}</button></div>
      ) : mode === "cart" && customer ? (
        <div className="checkout-layout">
          <section className="checkout-main">
            <div className="customer-strip"><div className="customer-avatar">{customer.full_name?.charAt(0) || "R"}</div><div><small>{labels.customer}</small><strong>{customer.full_name || labels.unnamed}</strong><span>{customer.phone}</span></div><div className="customer-points"><small>{copy.points}</small><strong>{customer.points_balance}</strong></div></div>
            <div className="service-picker"><div className="checkout-title"><h2>{labels.addService}</h2><span>{services.length}</span></div><div className="service-picker-grid">{services.map((service) => <button key={service.id} onClick={() => addService(service)}><span>+</span><strong>{title(service)}</strong><small>{Number(service.price).toLocaleString()} KGS · +{service.points_reward} P</small></button>)}</div></div>
          </section>
          <aside className="cart-panel">
            <div className="checkout-title"><h2>{labels.order}</h2><span>{cart.length}</span></div>
            <div className="cart-lines">{cart.length === 0 ? <p className="empty-cart">{labels.cartEmpty}</p> : cart.map((item) => <div className="cart-line" key={item.id}><div className="cart-line-name"><strong>{title(item)}</strong><button onClick={() => changeQuantity(item.id, -item.quantity)}>×</button></div><div className="cart-controls"><div><button onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)}>+</button></div><label><input type="number" min="0" value={item.unitPrice} disabled={payment === "points"} onChange={(event) => changePrice(item.id, Number(event.target.value))} /><small>KGS</small></label></div>{item.unitPrice !== Number(item.price) && <p className="price-change">{labels.normalPrice}: {Number(item.price).toLocaleString()} KGS</p>}</div>)}</div>
            <div className="payment-tabs">{(["cash", "card", "transfer"] as const).map((method) => <button className={payment === method ? "active" : ""} key={method} onClick={() => setPayment(method)}>{method === "cash" ? copy.cash : method === "card" ? copy.card : copy.transfer}</button>)}<button className={payment === "points" ? "active" : ""} onClick={choosePoints}>{copy.points}</button></div>
            <div className="cart-totals"><p><span>{labels.normalTotal}</span><span>{subtotal.toLocaleString()} KGS</span></p><p><span>{labels.pointsEarned}</span><span>+{points}</span></p><strong><span>{labels.total}</span><span>{total.toLocaleString()} KGS</span></strong></div>
            <button className="btn checkout-button" disabled={busy || !cart.length} onClick={checkout}>{busy ? labels.processing : labels.completeOrder}</button>
            <button className="cancel-order-button" disabled={busy} onClick={reset}>{labels.cancelRestart}</button><p className="form-message" role="alert">{msg}</p>
          </aside>
        </div>
      ) : (
        <div className="card portal-card success-card"><span className="success-check">✓</span><p className="receipt-number">RIO #{result?.receipt_number}</p><h2>{labels.success}</h2><strong>{result?.customer_name}</strong>{result?.duplicate && <p className="duplicate-note">{labels.duplicate}</p>}<div className="result-grid"><p><small>{labels.total}</small>{Number(result?.total_amount || 0).toLocaleString()} KGS</p><p><small>{labels.pointsEarned}</small>{result?.points_redeemed ? `−${result.points_redeemed}` : `+${result?.points_added || 0}`}</p><p><small>{labels.balance}</small>{result?.points_balance}</p></div><button className="btn" onClick={reset}>{labels.newOrder}</button><p className="success-stays">{labels.staysOpen}</p></div>
      )}
    </main></>
  );
}

function formatError(message: string, labels: ReturnType<typeof getLabels>) {
  if (message.includes("CUSTOMER_NOT_FOUND")) return labels.notFound;
  if (message.includes("INSUFFICIENT_POINTS")) return labels.insufficient;
  if (message.includes("INVALID_REWARD_SERVICE")) return labels.invalidReward;
  if (message.includes("SERVICE_NOT_FOUND")) return labels.serviceMissing;
  if (message.includes("STAFF_ACCESS_REQUIRED")) return labels.denied;
  return message;
}

function getLabels(lang: Locale) {
  if (lang === "ru") return { checking: "Проверяем сессию…", denied: "Доступ разрешён только сотрудникам.", processing: "Обработка…", notConfigured: "Подключение Supabase не настроено. Вход отключён.", camera: "Не удалось запустить камеру.", referenceRequired: "Введите QR, UUID или телефон.", customerReference: "QR / UUID / телефон клиента", findCustomer: "Найти клиента", customer: "Клиент", unnamed: "Без имени", addService: "Добавить услугу", order: "Заказ", cartEmpty: "Добавьте хотя бы одну услугу.", normalPrice: "Обычная цена", normalTotal: "Обычная сумма", pointsEarned: "Баллы", total: "К оплате", completeOrder: "Завершить оплату", cancelRestart: "Отменить и начать заново", secureLogout: "Безопасный выход", rewardMissing: "Подарочная услуга не настроена администратором.", notFound: "Клиент не найден.", insufficient: "Недостаточно баллов.", invalidReward: "Для оплаты баллами выберите подарочную услугу.", serviceMissing: "Услуга не найдена или отключена.", success: "Оплата завершена", balance: "Новый баланс", newOrder: "Начать новую операцию", staysOpen: "Экран останется открытым до начала новой операции.", duplicate: "Повторная отправка распознана — второй платёж не создан." };
  if (lang === "en") return { checking: "Checking session…", denied: "Access is limited to staff accounts.", processing: "Processing…", notConfigured: "Supabase is not configured. Sign-in is disabled.", camera: "Could not start the camera.", referenceRequired: "Enter a QR, UUID or phone.", customerReference: "Customer QR / UUID / phone", findCustomer: "Find customer", customer: "Customer", unnamed: "Unnamed", addService: "Add a service", order: "Order", cartEmpty: "Add at least one service.", normalPrice: "Standard price", normalTotal: "Standard total", pointsEarned: "Points", total: "Total due", completeOrder: "Complete payment", cancelRestart: "Cancel and start over", secureLogout: "Secure sign out", rewardMissing: "The free reward service is not configured.", notFound: "Customer not found.", insufficient: "Not enough points.", invalidReward: "Choose the configured reward service for points payment.", serviceMissing: "Service not found or inactive.", success: "Payment complete", balance: "New balance", newOrder: "Start new transaction", staysOpen: "This screen stays open until you start a new transaction.", duplicate: "Duplicate submission detected — no second charge was created." };
  return { checking: "Сессия текшерилүүдө…", denied: "Кирүү кызматкерлерге гана уруксат.", processing: "Иштетилүүдө…", notConfigured: "Supabase туташуусу орнотулган эмес. Кирүү өчүрүлгөн.", camera: "Камера ачылган жок.", referenceRequired: "QR, UUID же телефон киргизиңиз.", customerReference: "Кардардын QR / UUID / телефону", findCustomer: "Кардарды табуу", customer: "Кардар", unnamed: "Аты жок", addService: "Кызмат кошуу", order: "Буйрутма", cartEmpty: "Кеминде бир кызмат кошуңуз.", normalPrice: "Кадимки баа", normalTotal: "Кадимки сумма", pointsEarned: "Упай", total: "Төлөнөт", completeOrder: "Төлөмдү бүтүрүү", cancelRestart: "Жокко чыгаруу жана кайра баштоо", secureLogout: "Коопсуз чыгуу", rewardMissing: "Белек кызматы админ тарабынан тандалган эмес.", notFound: "Кардар табылган жок.", insufficient: "Упай жетишсиз.", invalidReward: "Упай менен төлөө үчүн белек кызматын тандаңыз.", serviceMissing: "Кызмат табылган жок же өчүрүлгөн.", success: "Төлөм аяктады", balance: "Жаңы баланс", newOrder: "Жаңы операция баштоо", staysOpen: "Жаңы операция башталганга чейин бул экран ачык калат.", duplicate: "Кайталанган суроо аныкталды — экинчи төлөм түзүлгөн жок." };
}
