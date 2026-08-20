"use client";

import Header from "@/components/Header";
import SupabaseSetup from "@/components/SupabaseSetup";
import { isLocale, type Locale } from "@/lib/i18n";
import { hasSupabase, supabaseBrowser } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Relation<T> = T | T[] | null;
type OrderItem = { id: string; quantity: number; unit_price: number; line_total: number; service: Relation<{ title_ky: string; title_ru: string; title_en: string }> };
type Order = {
  id: string; receipt_number: number; payment_method: string; subtotal: number; total_amount: number;
  points_added: number; points_redeemed: number; status: "completed" | "cancelled"; created_at: string;
  cancellation_reason: string | null; customer: Relation<{ full_name: string; phone: string }>;
  worker: Relation<{ full_name: string; worker_id: string | null }>; order_items: OrderItem[];
};

const one = <T,>(value: Relation<T>): T | null => Array.isArray(value) ? value[0] || null : value;
const karakolDate = (date: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));

export default function AdminPage() {
  const params = useParams();
  const lang: Locale = isLocale(String(params.lang)) ? (params.lang as Locale) : "ky";
  const text = getLabels(lang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"dashboard" | "orders">("dashboard");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const verify = async () => {
      const sb = supabaseBrowser();
      if (!sb) { setChecking(false); return; }
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) { setChecking(false); return; }
      const { data: profile } = await sb.from("profiles").select("role").eq("id", auth.user.id).single();
      if (profile?.role === "admin") setAuthed(true);
      else { await sb.auth.signOut(); setMsg(text.denied); }
      setChecking(false);
    };
    verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true); setMsg("");
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) { setMsg(error?.message || text.loginFailed); setBusy(false); return; }
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "admin") { await sb.auth.signOut(); setMsg(text.denied); setBusy(false); return; }
    setPassword(""); setAuthed(true); setBusy(false);
  };

  const load = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    setBusy(true); setMsg("");
    const { data, error } = await sb.from("orders").select(`
      id, receipt_number, payment_method, subtotal, total_amount, points_added, points_redeemed,
      status, created_at, cancellation_reason,
      customer:profiles!orders_customer_id_fkey(full_name, phone),
      worker:profiles!orders_worker_id_fkey(full_name, worker_id),
      order_items(id, quantity, unit_price, line_total, service:services(title_ky, title_ru, title_en))
    `).order("created_at", { ascending: false }).limit(500);
    if (error) setMsg(error.message);
    else setOrders((data || []) as unknown as Order[]);
    setBusy(false);
  };

  useEffect(() => { if (authed) load(); }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayKey = karakolDate(new Date());
  const completedToday = useMemo(() => orders.filter((order) => order.status === "completed" && karakolDate(order.created_at) === todayKey), [orders, todayKey]);
  const revenue = completedToday.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const paymentTotals = completedToday.reduce<Record<string, number>>((totals, order) => ({ ...totals, [order.payment_method]: (totals[order.payment_method] || 0) + Number(order.total_amount) }), {});
  const pointsToday = completedToday.reduce((sum, order) => sum + order.points_added - order.points_redeemed, 0);
  const average = completedToday.length ? Math.round(revenue / completedToday.length) : 0;

  const filtered = useMemo(() => orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (dateFilter && karakolDate(order.created_at) !== dateFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const customer = one(order.customer); const worker = one(order.worker);
    return [order.receipt_number, customer?.full_name, customer?.phone, worker?.full_name, worker?.worker_id]
      .some((value) => String(value || "").toLowerCase().includes(needle));
  }), [orders, statusFilter, dateFilter, search]);

  const cancelOrder = async () => {
    if (!cancelTarget || cancelReason.trim().length < 3) { setMsg(text.reasonRequired); return; }
    const sb = supabaseBrowser(); if (!sb) return;
    setBusy(true); setMsg("");
    const { error } = await sb.rpc("cancel_order", { order_id: cancelTarget.id, reason: cancelReason.trim() });
    if (error) setMsg(error.message);
    else { setMsg(text.cancelled); setCancelTarget(null); setCancelReason(""); await load(); }
    setBusy(false);
  };

  const logout = async () => { await supabaseBrowser()?.auth.signOut(); setAuthed(false); setOrders([]); };
  const serviceTitle = (item: OrderItem) => { const service = one(item.service); return service ? service[`title_${lang}`] : "—"; };

  return (
    <><Header lang={lang} /><main className="container section ui admin-shell">
      <div className="admin-topbar"><div><p className="section-kicker">RIO · CONTROL CENTER</p><h1>{text.title}</h1></div>{authed && <div className="admin-actions"><button className="btn ghost" disabled={busy} onClick={load}>↻ {text.refresh}</button><button className="btn ghost" onClick={logout}>{text.logout}</button></div>}</div>
      {checking ? <p className="muted">{text.checking}</p> : !hasSupabase() ? <SupabaseSetup lang={lang} /> : !authed ? (
        <div className="card portal-card"><label>Email</label><input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /><label>{text.password}</label><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} /><button className="btn" disabled={busy} onClick={login}>{busy ? text.processing : text.login}</button><p className="form-message">{msg}</p></div>
      ) : (
        <>
          <div className="admin-tabs"><button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>{text.dashboard}</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>{text.orders} <span>{orders.length}</span></button></div>
          {tab === "dashboard" ? <div className="admin-dashboard">
            <section className="metric-grid"><article><small>{text.todayRevenue}</small><strong>{revenue.toLocaleString()} <em>KGS</em></strong><span>{completedToday.length} {text.transactions}</span></article><article><small>{text.average}</small><strong>{average.toLocaleString()} <em>KGS</em></strong><span>{text.perOrder}</span></article><article><small>{text.pointsNet}</small><strong>{pointsToday > 0 ? "+" : ""}{pointsToday}</strong><span>{text.today}</span></article><article><small>{text.cancelledOrders}</small><strong>{orders.filter((order) => order.status === "cancelled" && karakolDate(order.created_at) === todayKey).length}</strong><span>{text.today}</span></article></section>
            <div className="admin-dashboard-grid"><section className="admin-panel"><div className="panel-title"><h2>{text.paymentBreakdown}</h2><span>{todayKey}</span></div>{["cash", "card", "transfer", "points"].map((method) => { const amount = paymentTotals[method] || 0; const percent = revenue ? Math.round(amount / revenue * 100) : 0; return <div className="payment-stat" key={method}><div><span>{text[method as keyof typeof text]}</span><strong>{amount.toLocaleString()} KGS</strong></div><div><i style={{ width: `${percent}%` }} /></div><small>{percent}%</small></div>; })}</section><section className="admin-panel"><div className="panel-title"><h2>{text.latest}</h2><button onClick={() => setTab("orders")}>{text.viewAll} →</button></div><div className="latest-orders">{orders.slice(0, 6).map((order) => <button key={order.id} onClick={() => { setSearch(String(order.receipt_number)); setTab("orders"); }}><span className={`order-dot ${order.status}`} /><div><strong>#{order.receipt_number} · {one(order.customer)?.full_name || text.unnamed}</strong><small>{new Date(order.created_at).toLocaleString()}</small></div><b>{Number(order.total_amount).toLocaleString()} KGS</b></button>)}</div></section></div>
          </div> : <section className="orders-panel">
            <div className="order-filters"><input placeholder={text.search} value={search} onChange={(event) => setSearch(event.target.value)} /><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{text.allStatuses}</option><option value="completed">{text.completed}</option><option value="cancelled">{text.cancelledStatus}</option></select><button className="btn ghost" onClick={() => { setSearch(""); setDateFilter(""); setStatusFilter("all"); }}>{text.clear}</button></div>
            <div className="order-list">{filtered.map((order) => { const customer = one(order.customer); const worker = one(order.worker); return <article className={`order-row ${order.status}`} key={order.id}><div className="order-summary"><div><span className={`status-pill ${order.status}`}>{order.status === "completed" ? text.completed : text.cancelledStatus}</span><strong>RIO #{order.receipt_number}</strong><small>{new Date(order.created_at).toLocaleString()}</small></div><div><small>{text.customer}</small><strong>{customer?.full_name || text.unnamed}</strong><span>{customer?.phone}</span></div><div><small>{text.cashier}</small><strong>{worker?.full_name || worker?.worker_id || "—"}</strong><span>{text[order.payment_method as keyof typeof text]}</span></div><div className="order-amount"><small>{text.total}</small><strong>{Number(order.total_amount).toLocaleString()} KGS</strong><span>{order.points_redeemed ? `−${order.points_redeemed} P` : `+${order.points_added} P`}</span></div></div><div className="order-detail"><div>{order.order_items.map((item) => <p key={item.id}><span>{item.quantity}× {serviceTitle(item)}</span><b>{Number(item.line_total).toLocaleString()} KGS</b></p>)}</div>{order.status === "completed" ? <button className="cancel-transaction" onClick={() => { setMsg(""); setCancelTarget(order); }}>{text.cancelOrder}</button> : <p className="cancel-reason"><small>{text.reason}</small>{order.cancellation_reason}</p>}</div></article>; })}{filtered.length === 0 && <p className="empty-orders">{text.noOrders}</p>}</div>
          </section>}
          {msg && <div className="admin-toast">{msg}</div>}
        </>
      )}
    </main>
    {cancelTarget && <div className="modal-bg"><div className="card modal cancel-modal ui"><button className="modal-close" onClick={() => setCancelTarget(null)}>×</button><span className="warning-icon">!</span><h3>{text.cancelTitle} #{cancelTarget.receipt_number}</h3><p className="muted">{text.cancelBody}</p><label>{text.reason}</label><textarea autoFocus rows={4} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /><button className="btn danger-button" disabled={busy} onClick={cancelOrder}>{busy ? text.processing : text.confirmCancel}</button></div></div>}
    </>
  );
}

function getLabels(lang: Locale) {
  const common = { cash: "Cash", card: "Card", transfer: "Transfer", points: "Points" };
  if (lang === "ru") return { ...common, cash: "Наличные", card: "Карта", transfer: "Перевод", points: "Баллы", title: "Панель управления", checking: "Проверяем сессию…", password: "Пароль", login: "Войти", loginFailed: "Ошибка входа.", denied: "Требуется доступ администратора.", processing: "Обработка…", logout: "Безопасный выход", refresh: "Обновить", dashboard: "Обзор", orders: "Операции", todayRevenue: "Выручка сегодня", transactions: "операций", average: "Средний чек", perOrder: "за операцию", pointsNet: "Баллы нетто", today: "сегодня", cancelledOrders: "Отменено", paymentBreakdown: "Способы оплаты", latest: "Последние операции", viewAll: "Все операции", unnamed: "Без имени", search: "Чек, клиент, телефон или кассир", allStatuses: "Все статусы", completed: "Завершено", cancelledStatus: "Отменено", clear: "Очистить", customer: "Клиент", cashier: "Кассир", total: "Сумма", cancelOrder: "Отменить операцию", reason: "Причина отмены", noOrders: "Операции не найдены.", cancelTitle: "Отмена операции", cancelBody: "Доход будет исключён из отчётов, а баллы клиента автоматически пересчитаются. Это действие фиксируется в журнале.", confirmCancel: "Подтвердить отмену", reasonRequired: "Укажите причину длиной не менее 3 символов.", cancelled: "Операция отменена, баллы пересчитаны." };
  if (lang === "en") return { ...common, title: "Control center", checking: "Checking session…", password: "Password", login: "Sign in", loginFailed: "Sign-in failed.", denied: "Administrator access required.", processing: "Processing…", logout: "Secure sign out", refresh: "Refresh", dashboard: "Overview", orders: "Transactions", todayRevenue: "Revenue today", transactions: "transactions", average: "Average ticket", perOrder: "per transaction", pointsNet: "Net points", today: "today", cancelledOrders: "Cancelled", paymentBreakdown: "Payment breakdown", latest: "Latest transactions", viewAll: "View all", unnamed: "Unnamed", search: "Receipt, customer, phone or cashier", allStatuses: "All statuses", completed: "Completed", cancelledStatus: "Cancelled", clear: "Clear", customer: "Customer", cashier: "Cashier", total: "Total", cancelOrder: "Cancel transaction", reason: "Cancellation reason", noOrders: "No transactions found.", cancelTitle: "Cancel transaction", cancelBody: "Revenue will be excluded from reports and customer points will be recalculated automatically. This action is audited.", confirmCancel: "Confirm cancellation", reasonRequired: "Enter a reason of at least 3 characters.", cancelled: "Transaction cancelled and points recalculated." };
  return { ...common, cash: "Накталай", card: "Карта", transfer: "Которуу", points: "Упай", title: "Башкаруу панели", checking: "Сессия текшерилүүдө…", password: "Сырсөз", login: "Кирүү", loginFailed: "Кирүү ишке ашкан жок.", denied: "Администратор укугу керек.", processing: "Иштетилүүдө…", logout: "Коопсуз чыгуу", refresh: "Жаңыртуу", dashboard: "Көрсөткүчтөр", orders: "Операциялар", todayRevenue: "Бүгүнкү киреше", transactions: "операция", average: "Орточо чек", perOrder: "ар операцияга", pointsNet: "Таза упай", today: "бүгүн", cancelledOrders: "Жокко чыгарылды", paymentBreakdown: "Төлөм түрлөрү", latest: "Акыркы операциялар", viewAll: "Баарын көрүү", unnamed: "Аты жок", search: "Чек, кардар, телефон же кассир", allStatuses: "Бардык статустар", completed: "Аякталды", cancelledStatus: "Жокко чыгарылды", clear: "Тазалоо", customer: "Кардар", cashier: "Кассир", total: "Сумма", cancelOrder: "Операцияны жокко чыгаруу", reason: "Жокко чыгаруу себеби", noOrders: "Операция табылган жок.", cancelTitle: "Операцияны жокко чыгаруу", cancelBody: "Киреше отчеттон чыгарылып, кардардын упайы автоматтык кайра эсептелет. Бул аракет журналга жазылат.", confirmCancel: "Жокко чыгарууну ырастоо", reasonRequired: "Кеминде 3 белгиден турган себеп жазыңыз.", cancelled: "Операция жокко чыгарылып, упайлар кайра эсептелди." };
}
