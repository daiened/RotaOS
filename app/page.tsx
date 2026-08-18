"use client";

import { useEffect, useMemo, useState } from "react";
import {
  currentUserEmail,
  isSupabaseConfigured,
  loadOrders,
  loadTeams,
  saveOrders,
  saveTeams as saveTeamsToCloud,
  signIn,
  signOut,
  type StoredOrder,
} from "../lib/supabase";

type Service = "Passeio" | "Muro" | "Vistoria";
type SyncState = "new" | "updated" | "complaint" | "reviewed" | "not_seen" | "archived";
type Modal = "import" | "teams" | "rules" | "login" | null;

type WorkOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  requestedAt: string;
  service: Service;
  detail: string;
  deadlineDays: number;
  syncState: SyncState;
  sourceHash: string;
  lastSeenAt: string;
  changedAt?: string;
  complaintAt?: string;
};

type TeamConfig = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: Service[];
  capacity: number;
};

type SuggestionRules = {
  complaints: boolean;
  deadlines: boolean;
  changes: boolean;
  sameAddress: boolean;
  recent: boolean;
};

const nowIso = "2026-08-17T12:00:00.000Z";

const initialTeams: TeamConfig[] = [
  { id: "team-1", name: "Construpav 01", color: "#7457d9", active: true, services: ["Passeio", "Muro"], capacity: 6 },
  { id: "team-2", name: "Construpav 02", color: "#ee8d48", active: true, services: ["Passeio", "Muro"], capacity: 6 },
  { id: "team-3", name: "Construpav 03", color: "#2f99ac", active: true, services: ["Passeio", "Muro", "Vistoria"], capacity: 5 },
];

const initialRules: SuggestionRules = {
  complaints: true,
  deadlines: true,
  changes: true,
  sameAddress: true,
  recent: true,
};

const orderSeeds: Omit<WorkOrder, "sourceHash">[] = [
  { internalId: "3025075", id: "24936/2026/3", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", requestedAt: "16/08/2026 09:10", service: "Muro", detail: "Muro com acabamento a confirmar", deadlineDays: 2, syncState: "new", lastSeenAt: nowIso },
  { internalId: "3025078", id: "24936/2026/4", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", requestedAt: "16/08/2026 09:10", service: "Passeio", detail: "Acabamento cimentado · mesmo local da OS 24936/2026/3", deadlineDays: 2, syncState: "new", lastSeenAt: nowIso },
  { internalId: "3030611", id: "36171/2026/2", address: "R. Bartolomeu dos Santos, 2", neighborhood: "São Damião", region: "Norte", requestedAt: "15/08/2026 14:20", service: "Passeio", detail: "Repor meio-fio", deadlineDays: 2, syncState: "reviewed", lastSeenAt: nowIso },
  { internalId: "3030920", id: "36760/2026/2", address: "R. Bartolomeu dos Santos, 24", neighborhood: "São Damião", region: "Norte", requestedAt: "16/08/2026 11:08", service: "Passeio", detail: "Mesmo trecho da OS 36171/2026/2", deadlineDays: 1, syncState: "updated", lastSeenAt: nowIso, changedAt: nowIso },
  { internalId: "3030823", id: "36057/2026/2", address: "R. Guimarães Rosa, 102", neighborhood: "Cidade do Sol", region: "Norte", requestedAt: "14/08/2026 08:45", service: "Muro", detail: "Assentar piso · ligar antes · área interna", deadlineDays: 1, syncState: "complaint", lastSeenAt: nowIso, changedAt: nowIso, complaintAt: nowIso },
  { internalId: "3031512", id: "34355/2026/2", address: "Estr. da Remonta, 45", neighborhood: "Barbosa Lage", region: "Norte", requestedAt: "12/08/2026 10:20", service: "Passeio", detail: "Acabamento não informado", deadlineDays: 3, syncState: "reviewed", lastSeenAt: nowIso },
  { internalId: "3031700", id: "36237/2026/1", address: "Estr. da Remonta, 204", neighborhood: "Jóquei Clube III", region: "Norte", requestedAt: "16/08/2026 15:31", service: "Passeio", detail: "Corredor próximo à Estrada da Remonta", deadlineDays: 2, syncState: "new", lastSeenAt: nowIso },
  { internalId: "3030681", id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28", service: "Muro", detail: "Recompor parede", deadlineDays: 2, syncState: "reviewed", lastSeenAt: nowIso },
  { internalId: "3030629", id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28", service: "Passeio", detail: "Executar no mesmo local da OS 36097/2026/1", deadlineDays: 2, syncState: "reviewed", lastSeenAt: nowIso },
  { internalId: "3030550", id: "32325/2026/1", address: "R. Benício de Souza Rocha, 161", neighborhood: "Graminha", region: "Sul", requestedAt: "11/08/2026 10:24", service: "Passeio", detail: "Cimentado · refazer degrau", deadlineDays: 2, syncState: "updated", lastSeenAt: nowIso, changedAt: nowIso },
  { internalId: "3029110", id: "32771/2026/2", address: "R. Francisco Foini, 141", neighborhood: "Centenário", region: "Leste", requestedAt: "05/08/2026 09:17", service: "Muro", detail: "Endereço corrigido · acabamento cimentado", deadlineDays: 2, syncState: "updated", lastSeenAt: nowIso, changedAt: nowIso },
  { internalId: "3031183", id: "19191/2026/4", address: "R. Pinto de Moura, 180", neighborhood: "Poço Rico", region: "Sul", requestedAt: "15/08/2026 16:12", service: "Vistoria", detail: "Pedra portuguesa · retirar medidas", deadlineDays: 1, syncState: "complaint", lastSeenAt: nowIso, complaintAt: nowIso },
  { internalId: "3031195", id: "28585/2026/4", address: "Av. Francisco Valadares, 2745", neighborhood: "Poço Rico", region: "Sul", requestedAt: "15/08/2026 17:03", service: "Vistoria", detail: "Passeio cimentado · retirar medidas", deadlineDays: 1, syncState: "new", lastSeenAt: nowIso },
  { internalId: "3031230", id: "32892/2026/1", address: "R. Princesa Isabel, 121", neighborhood: "Centro", region: "Sul", requestedAt: "16/08/2026 08:51", service: "Vistoria", detail: "Verificar necessidade e medidas", deadlineDays: 1, syncState: "new", lastSeenAt: nowIso },
  { internalId: "3031214", id: "31374/2026/5", address: "R. Baependi, 358", neighborhood: "Vitorino Braga", region: "Leste", requestedAt: "16/08/2026 07:48", service: "Vistoria", detail: "Cimentado · em frente ao portão", deadlineDays: 1, syncState: "reviewed", lastSeenAt: nowIso },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

function fingerprint(order: Pick<WorkOrder, "address" | "neighborhood" | "region" | "requestedAt" | "service" | "detail">) {
  return normalize([order.address, order.neighborhood, order.region, order.requestedAt, order.service, order.detail].join("|"));
}

const initialOrders: WorkOrder[] = orderSeeds.map((order) => ({ ...order, sourceHash: fingerprint(order) }));

function serviceFrom(raw: string): Service {
  const value = normalize(raw);
  if (value.includes("MURO") || value.includes("PAREDE")) return "Muro";
  if (value.includes("VISTOR")) return "Vistoria";
  return "Passeio";
}

function stateLabel(state: SyncState) {
  return ({ new: "Nova", updated: "Alterada", complaint: "Reclamação", reviewed: "Conferida", not_seen: "Não encontrada", archived: "Arquivada" } as const)[state];
}

function parseRequestedAt(value: string) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return 0;
  return new Date(`${match[3]}-${match[2]}-${match[1]}T12:00:00`).getTime();
}

function scoreOrder(order: WorkOrder, rules: SuggestionRules, sameAddressCount: number) {
  let score = 0;
  const reasons: string[] = [];
  if (rules.complaints && order.syncState === "complaint") { score += 55; reasons.push("reclamação recente"); }
  if (rules.deadlines && order.deadlineDays <= 1) { score += 35; reasons.push("prazo crítico"); }
  if (rules.changes && order.syncState === "updated") { score += 25; reasons.push("OS alterada"); }
  if (rules.changes && order.syncState === "new") { score += 18; reasons.push("OS nova"); }
  if (rules.sameAddress && sameAddressCount > 1) { score += 20; reasons.push("mesmo endereço"); }
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (rules.recent && Date.now() - parseRequestedAt(order.requestedAt) <= sevenDays) { score += 12; reasons.push("solicitação recente"); }
  return { score, reasons };
}

function storedToOrder(order: StoredOrder): WorkOrder {
  return {
    ...order,
    service: serviceFrom(order.service),
    syncState: order.syncState as SyncState,
  };
}

export default function Home() {
  const [orders, setOrders] = useState<WorkOrder[]>(initialOrders);
  const [teams, setTeams] = useState<TeamConfig[]>(initialTeams);
  const [draftTeams, setDraftTeams] = useState<TeamConfig[]>(initialTeams);
  const [rules, setRules] = useState<SuggestionRules>(initialRules);
  const [draftRules, setDraftRules] = useState<SuggestionRules>(initialRules);
  const [selected, setSelected] = useState(() => new Set(initialOrders.slice(0, 12).map((order) => order.id)));
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"Todos" | Service>("Todos");
  const [stateFilter, setStateFilter] = useState<"Todos" | SyncState>("Todos");
  const [teamFilter, setTeamFilter] = useState("Todas");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [calculated, setCalculated] = useState(false);
  const [environment, setEnvironment] = useState("DEV");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const cloudReady = isSupabaseConfigured();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const host = window.location.hostname;
      setEnvironment(host.includes("daiened.github.io") || host.includes("rotaos-dev") || host === "localhost" ? "DEV" : "PRODUÇÃO");
      const localTeams = window.localStorage.getItem("rotaos-team-settings-v2");
      const localOrders = window.localStorage.getItem("rotaos-dev-orders");
      const localRules = window.localStorage.getItem("rotaos-suggestion-rules");
      if (localTeams) try { setTeams(JSON.parse(localTeams)); } catch { /* configuração antiga inválida */ }
      if (localOrders && !cloudReady) try { setOrders(JSON.parse(localOrders)); } catch { /* base local inválida */ }
      if (localRules) try { setRules(JSON.parse(localRules)); } catch { /* regras antigas inválidas */ }
    }, 0);

    if (cloudReady) {
      void currentUserEmail().then(async (email) => {
        setUserEmail(email);
        if (!email) return;
        const [cloudOrders, cloudTeams] = await Promise.all([loadOrders(), loadTeams()]);
        if (cloudOrders.length) setOrders(cloudOrders.map(storedToOrder));
        if (cloudTeams.length) setTeams(cloudTeams.map((team) => ({ ...team, services: team.services.map(serviceFrom) })));
      }).catch(() => setToast("Não foi possível carregar a nuvem. O modo DEV continua disponível."));
    }
    return () => window.clearTimeout(timer);
  }, [cloudReady]);

  useEffect(() => {
    function receiveImport(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "ROTAOS_IMPORT_FROM_PROCESA") return;
      const incoming = Array.isArray(event.data.payload?.orders) ? event.data.payload.orders : [];
      if (!incoming.length) return;
      const capturedAt = String(event.data.payload?.capturedAt ?? new Date().toISOString());
      const existing = new Map(orders.map((order) => [order.id, order]));
      const summary = { new: 0, updated: 0, reviewed: 0, complaint: 0 };
      const captured: WorkOrder[] = incoming.map((raw: Record<string, unknown>, index: number) => {
        const id = String(raw.id ?? raw.occurrence ?? `OS-${index + 1}`);
        const previous = existing.get(id);
        const detail = String(raw.detail ?? raw.serviceType ?? "Detalhe ainda não identificado");
        const base: WorkOrder = {
          internalId: String(raw.internalId ?? ""),
          id,
          address: String(raw.address ?? "Endereço não informado"),
          neighborhood: String(raw.neighborhood ?? "Bairro não informado"),
          region: String(raw.region ?? "Região não informada"),
          requestedAt: String(raw.requestedAt ?? ""),
          service: serviceFrom(String(raw.serviceType ?? raw.requestedService ?? detail)),
          detail,
          deadlineDays: previous?.deadlineDays ?? 2,
          syncState: "new",
          sourceHash: "",
          lastSeenAt: capturedAt,
        };
        base.sourceHash = fingerprint(base);
        const hasComplaint = /RECLAMA|RETORNO|URGENTE|PRIORIDADE/i.test(normalize(detail));
        if (!previous) {
          base.syncState = hasComplaint ? "complaint" : "new";
          base.complaintAt = hasComplaint ? capturedAt : undefined;
        } else if (previous.sourceHash !== base.sourceHash) {
          base.syncState = hasComplaint ? "complaint" : "updated";
          base.changedAt = capturedAt;
          base.complaintAt = hasComplaint ? capturedAt : previous.complaintAt;
        } else {
          base.syncState = previous.syncState === "complaint" ? "complaint" : "reviewed";
          base.changedAt = previous.changedAt;
          base.complaintAt = previous.complaintAt;
        }
        summary[base.syncState === "complaint" ? "complaint" : base.syncState as "new" | "updated" | "reviewed"] += 1;
        return base;
      });
      const capturedIds = new Set(captured.map((order) => order.id));
      const merged = [...captured, ...orders.filter((order) => !capturedIds.has(order.id))];
      setOrders(merged);
      setSelected(new Set(captured.filter((order) => order.syncState !== "reviewed").map((order) => order.id)));
      setCalculated(false);
      window.localStorage.setItem("rotaos-dev-orders", JSON.stringify(merged));
      if (cloudReady && userEmail) {
        void saveOrders(captured, summary).catch(() => setToast("As OS chegaram, mas a nuvem não respondeu. Tente sincronizar novamente."));
      }
      setToast(`${captured.length} OS conferidas: ${summary.new} novas, ${summary.updated} alteradas e ${summary.complaint} com reclamação.`);
      setModal(null);
      window.postMessage({ type: "ROTAOS_IMPORT_ACCEPTED" }, window.location.origin);
    }
    window.addEventListener("message", receiveImport);
    return () => window.removeEventListener("message", receiveImport);
  }, [cloudReady, orders, userEmail]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeTeams = teams.filter((team) => team.active);
  const addressCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((order) => counts.set(normalize(order.address), (counts.get(normalize(order.address)) ?? 0) + 1));
    return counts;
  }, [orders]);

  const scored = useMemo(() => Object.fromEntries(orders.map((order) => [order.id, scoreOrder(order, rules, addressCounts.get(normalize(order.address)) ?? 1)])), [addressCounts, orders, rules]);
  const selectedOrders = orders.filter((order) => selected.has(order.id));
  const teamCounts = Object.fromEntries(teams.map((team) => [team.id, selectedOrders.filter((order) => assignments[order.id] === team.id).length]));
  const selectedStops = new Set(selectedOrders.map((order) => normalize(order.address))).size;
  const attentionCount = selectedOrders.filter((order) => ["new", "updated", "complaint"].includes(order.syncState)).length;

  const filtered = useMemo(() => orders.filter((order) => {
    const teamMatch = teamFilter === "Todas" || assignments[order.id] === teamFilter;
    const serviceMatch = serviceFilter === "Todos" || order.service === serviceFilter;
    const stateMatch = stateFilter === "Todos" || order.syncState === stateFilter;
    const text = normalize(`${order.id} ${order.address} ${order.neighborhood} ${order.detail}`);
    return teamMatch && serviceMatch && stateMatch && text.includes(normalize(query));
  }), [assignments, orders, query, serviceFilter, stateFilter, teamFilter]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((order) => selected.has(order.id));
  const pinPositions = [[15, 22], [24, 33], [31, 20], [55, 18], [67, 28], [61, 40], [30, 62], [42, 72], [49, 58], [66, 65], [74, 55], [82, 72], [58, 78], [20, 48], [78, 35]];

  function distribute(orderIds: Set<string>) {
    const chosenOrders = orders.filter((order) => orderIds.has(order.id));
    if (!chosenOrders.length) { setToast("Selecione ao menos uma OS para calcular."); return; }
    if (!activeTeams.length) { setToast("Ative ao menos uma equipe."); return; }
    const nextAssignments: Record<string, string> = {};
    const nextReasons: Record<string, string[]> = {};
    const load = Object.fromEntries(activeTeams.map((team) => [team.id, 0])) as Record<string, number>;
    const groups = new Map<string, WorkOrder[]>();
    chosenOrders.forEach((order) => {
      const key = normalize(order.address);
      groups.set(key, [...(groups.get(key) ?? []), order]);
    });
    [...groups.values()].sort((a, b) => (scored[b[0].id]?.score ?? 0) - (scored[a[0].id]?.score ?? 0)).forEach((group) => {
      const groupTeams = activeTeams
        .filter((team) => group.every((order) => team.services.includes(order.service)) && load[team.id] + group.length <= team.capacity)
        .sort((a, b) => load[a.id] - load[b.id]);
      if (groupTeams[0]) {
        group.forEach((order) => {
          nextAssignments[order.id] = groupTeams[0].id;
          nextReasons[order.id] = [...scored[order.id].reasons, `${groupTeams[0].name} compatível`];
        });
        load[groupTeams[0].id] += group.length;
        return;
      }
      group.forEach((order) => {
        const team = activeTeams.filter((item) => item.services.includes(order.service) && load[item.id] < item.capacity).sort((a, b) => load[a.id] - load[b.id])[0];
        if (!team) { nextReasons[order.id] = ["sem equipe compatível ou sem capacidade"]; return; }
        nextAssignments[order.id] = team.id;
        nextReasons[order.id] = [...scored[order.id].reasons, `${team.name} compatível`];
        load[team.id] += 1;
      });
    });
    setAssignments(nextAssignments);
    setReasons(nextReasons);
    setCalculated(true);
    setTeamFilter("Todas");
    const pending = chosenOrders.length - Object.keys(nextAssignments).length;
    setToast(pending ? `Sugestão pronta, com ${pending} OS para revisão manual.` : `Sugestão pronta para ${chosenOrders.length} OS. Revise antes de enviar.`);
  }

  function applySmartSuggestion() {
    const totalCapacity = activeTeams.reduce((sum, team) => sum + team.capacity, 0);
    const candidates = orders
      .filter((order) => !["archived", "not_seen"].includes(order.syncState) && activeTeams.some((team) => team.services.includes(order.service)))
      .sort((a, b) => (scored[b.id]?.score ?? 0) - (scored[a.id]?.score ?? 0))
      .slice(0, totalCapacity);
    const ids = new Set(candidates.map((order) => order.id));
    setSelected(ids);
    distribute(ids);
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((order) => allVisibleSelected ? next.delete(order.id) : next.add(order.id));
      return next;
    });
    setCalculated(false);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await signIn(loginEmail, loginPassword);
      setUserEmail(loginEmail);
      const [cloudOrders, cloudTeams] = await Promise.all([loadOrders(), loadTeams()]);
      if (cloudOrders.length) setOrders(cloudOrders.map(storedToOrder));
      if (cloudTeams.length) setTeams(cloudTeams.map((team) => ({ ...team, services: team.services.map(serviceFrom) })));
      setModal(null);
      setToast("Nuvem conectada. A base está disponível neste computador.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally { setBusy(false); }
  }

  function persistTeams() {
    if (!draftTeams.some((team) => team.active)) { setToast("Deixe ao menos uma equipe ativa."); return; }
    setTeams(draftTeams);
    window.localStorage.setItem("rotaos-team-settings-v2", JSON.stringify(draftTeams));
    if (cloudReady && userEmail) void saveTeamsToCloud(draftTeams).catch(() => setToast("Equipes salvas no navegador; a nuvem não respondeu."));
    setAssignments({});
    setCalculated(false);
    setModal(null);
    setToast("Equipes atualizadas. Calcule novamente para aplicar as capacidades.");
  }

  function persistRules() {
    setRules(draftRules);
    window.localStorage.setItem("rotaos-suggestion-rules", JSON.stringify(draftRules));
    setCalculated(false);
    setModal(null);
    setToast("Critérios atualizados. Gere uma nova sugestão.");
  }

  const syncCounts = {
    new: orders.filter((order) => order.syncState === "new").length,
    updated: orders.filter((order) => order.syncState === "updated").length,
    complaint: orders.filter((order) => order.syncState === "complaint").length,
  };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">R</span><span>RotaOS</span></div>
      <nav className="module-switcher" aria-label="Módulos do RotaOS">
        <button className="current-module active"><span>01</span><div><strong>Planejamento</strong><small>rotas por equipe</small></div></button>
      </nav>
      <div className="sidebar-note environment-note"><span>AMBIENTE {environment}</span><strong>{environment === "DEV" ? "Espaço de testes" : "Versão estável"}</strong><p>{environment === "DEV" ? "Use para validar novidades antes de liberar para a Camilla." : "Somente recursos já validados entram aqui."}</p></div>
      <div className={`cloud-status ${userEmail ? "connected" : ""}`}><i /> <div><strong>{userEmail ? "Nuvem conectada" : cloudReady ? "Aguardando login" : "Banco preparado"}</strong><small>{userEmail ?? (cloudReady ? "Entre para sincronizar" : "Conectar projeto Supabase")}</small></div></div>
    </aside>

    <section className="workspace prototype-workspace">
      <header className="topbar prototype-topbar">
        <div><p className="eyebrow">PLANEJAMENTO DE ROTAS · {environment}</p><h1>Rotas de hoje</h1><p className="subtitle">O RotaOS sugere. Você revisa e decide o que será distribuído.</p></div>
        <div className="header-actions">
          {cloudReady && <button className="secondary" onClick={() => userEmail ? void signOut().then(() => { setUserEmail(null); setToast("Você saiu da nuvem."); }) : setModal("login")}>{userEmail ? "Sair" : "Entrar"}</button>}
          <button className="secondary" onClick={() => setModal("import")}>Importar do Procesa</button>
          <button className="primary smart-button" onClick={applySmartSuggestion}>✦ Sugestão RotaOS</button>
          <button className="icon-action" onClick={() => { setDraftRules(rules); setModal("rules"); }} aria-label="Configurar critérios da sugestão">⚙</button>
        </div>
      </header>

      {!cloudReady && <div className="dev-banner"><strong>DEV sem banco conectado</strong><span>As funções podem ser validadas agora; ao conectar o Supabase, a mesma base ficará disponível de qualquer lugar.</span></div>}

      <div className={calculated ? "prototype-notice calculated" : "prototype-notice"}><span>{calculated ? "✓" : "✦"}</span><div><strong>{calculated ? "Sugestão pronta para revisão" : `${selected.size} OS marcadas para calcular`}</strong><p>{calculated ? "Confira equipe, detalhes e prioridades. Nada foi enviado ao Procesa." : "Marque manualmente ou peça uma sugestão baseada nos critérios configurados."}</p></div><button onClick={() => distribute(selected)}>{calculated ? "Calcular novamente" : "Calcular seleção"} →</button></div>

      <section className="prototype-metrics">
        <article><span className="prototype-metric-icon purple">✓</span><div><p>Base de OS</p><strong>{orders.length}</strong><small>{selected.size} na seleção atual</small></div></article>
        <article><span className="prototype-metric-icon orange">＋</span><div><p>Novas</p><strong>{syncCounts.new}</strong><small>desde a última conferência</small></div></article>
        <article><span className="prototype-metric-icon blue">↻</span><div><p>Alteradas</p><strong>{syncCounts.updated}</strong><small>merecem nova revisão</small></div></article>
        <article><span className="prototype-metric-icon red">!</span><div><p>Reclamações</p><strong>{syncCounts.complaint}</strong><small>prioridade na sugestão</small></div></article>
      </section>

      <section className="prototype-content-grid">
        <article className="prototype-card prototype-map-card">
          <div className="prototype-section-heading"><div><h2>Visão geral das rotas</h2><p>{selectedStops} paradas · {selectedOrders.length} OS · {attentionCount} pedem atenção</p></div><span className="prototype-map-state">MAPA ILUSTRATIVO</span></div>
          <div className="prototype-map" aria-label="Mapa ilustrativo das equipes">
            <div className="prototype-river" /><span className="prototype-road road-1" /><span className="prototype-road road-2" /><span className="prototype-road road-3" /><span className="prototype-road road-4" /><span className="prototype-road road-5" />
            <span className="prototype-district d1">SANTA CRUZ</span><span className="prototype-district d2">BENFICA</span><span className="prototype-district d3">CENTRO</span><span className="prototype-district d4">TEIXEIRAS</span><span className="prototype-district d5">VITORINO BRAGA</span>
            {selectedOrders.slice(0, pinPositions.length).map((order, index) => {
              const team = teams.find((item) => item.id === assignments[order.id]);
              const [left, top] = pinPositions[index];
              return <span key={order.id} className="prototype-pin" style={{ left: `${left}%`, top: `${top}%`, background: team?.color ?? "#9a9eaa" }}><i>{index + 1}</i></span>;
            })}
            <div className="prototype-map-legend">{activeTeams.map((team) => <span key={team.id}><i style={{ background: team.color }} />{team.name}</span>)}</div>
          </div>
          <div className="map-warning"><strong>Distância ainda não calculada</strong><span>Nesta etapa, a sugestão usa prioridade, serviço, capacidade e mesmo endereço. O mapa real entra depois.</span></div>
        </article>

        <aside className="prototype-card prototype-team-panel">
          <div className="prototype-section-heading"><div><h2>Equipes</h2><p>Capacidade configurada para hoje</p></div><button className="prototype-icon-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }} aria-label="Configurar equipes">⚙</button></div>
          <div className="prototype-team-list">{activeTeams.map((team, index) => <button key={team.id} className={teamFilter === team.id ? "prototype-team-row active" : "prototype-team-row"} onClick={() => setTeamFilter(teamFilter === team.id ? "Todas" : team.id)}><span className="prototype-team-number" style={{ background: team.color }}>{index + 1}</span><div><strong>{team.name}</strong><span>{team.services.join(" + ")}</span></div><small>{teamCounts[team.id] ?? 0}/{team.capacity} OS</small><b>›</b></button>)}</div>
          <div className="prototype-team-actions"><button className="prototype-outline-full" onClick={() => setTeamFilter("Todas")}>Todas as equipes</button><button className="prototype-settings-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }} aria-label="Configurar equipes">⚙</button></div>
        </aside>
      </section>

      <section className="prototype-card prototype-orders-card">
        <div className="prototype-section-heading prototype-orders-head"><div><h2>Ordens de serviço</h2><p>Filtre sem perder as OS que já marcou</p></div><div className="prototype-filters"><input aria-label="Buscar OS" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, bairro ou endereço" /><select aria-label="Filtrar serviço" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as "Todos" | Service)}><option>Todos</option><option>Passeio</option><option>Muro</option><option>Vistoria</option></select><select aria-label="Filtrar atualização" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "Todos" | SyncState)}><option value="Todos">Toda a base</option><option value="new">Novas</option><option value="updated">Alteradas</option><option value="complaint">Reclamações</option><option value="reviewed">Conferidas</option><option value="not_seen">Não encontradas</option></select><button className="prototype-clear-button" onClick={() => { setSelected(new Set()); setCalculated(false); }}>Limpar</button></div></div>
        <div className="prototype-selection-bar"><strong>{selected.size} selecionadas</strong><span>{filtered.length} visíveis com os filtros atuais.</span><button onClick={toggleVisible}>{allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}</button></div>
        <div className="prototype-table-wrap"><table><thead><tr><th><input aria-label="Selecionar todas as OS visíveis" type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} /></th><th>ATUALIZAÇÃO</th><th>ORDEM DE SERVIÇO</th><th>LOCAL</th><th>SERVIÇO</th><th>DETALHES IMPORTANTES</th><th>POR QUE ENTROU</th><th>EQUIPE SUGERIDA</th></tr></thead><tbody>{filtered.map((order) => {
          const team = teams.find((item) => item.id === assignments[order.id]);
          const orderReasons = reasons[order.id] ?? scored[order.id]?.reasons ?? [];
          return <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => { setSelected((current) => { const next = new Set(current); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; }); setCalculated(false); }} /></td><td><span className={`sync-badge ${order.syncState}`}>{stateLabel(order.syncState)}</span></td><td><strong>{order.id}</strong><span>{order.requestedAt || "Data não informada"}</span></td><td><strong>{order.address}</strong><span>{order.neighborhood} · {order.region}</span></td><td><span className={`prototype-service-tag ${order.service.toLowerCase()}`}>{order.service}</span></td><td><span>{order.detail}</span></td><td><span className="reason-text">{orderReasons.slice(0, 2).join(" · ") || "seleção manual"}</span></td><td><span className="prototype-team-dot" style={{ background: team?.color ?? "#9a9eaa" }} />{team?.name ?? "A definir"}</td></tr>;
        })}</tbody></table></div>
      </section>
    </section>

    {modal === "import" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">SINCRONIZAR COM O PROCESA</p><h2>Traga as OS sem alterar a CESAMA</h2><p>A extensão lê somente as páginas abertas. O RotaOS compara cada número e identifica novas, alteradas e conferidas.</p><div className="import-steps"><div><span>1</span><div><strong>Abra o Procesa</strong><small>Entre normalmente e aplique o período desejado.</small></div></div><div><span>2</span><div><strong>Escolha as OS</strong><small>Use “Enviar selecionadas” ou “Enviar visíveis”.</small></div></div><div><span>3</span><div><strong>Revise aqui</strong><small>Nada é distribuído automaticamente.</small></div></div></div><a className="primary button-link full" href="downloads/rotaos-ponte-procesa.zip" download>Baixar extensão RotaOS</a><button className="text-button" onClick={() => setModal(null)}>Já tenho a extensão</button></section></div>}

    {modal === "teams" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal team-settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">EQUIPES E CAPACIDADE</p><h2>Quem pode fazer cada serviço?</h2><p>O limite diário evita que a sugestão sobrecarregue uma equipe.</p><div className="team-settings-list">{draftTeams.map((team) => <article key={team.id}><div className="team-settings-main"><input aria-label={`Cor de ${team.name}`} type="color" value={team.color} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, color: event.target.value } : item))} /><label><span>Nome da equipe</span><input value={team.name} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, name: event.target.value } : item))} /></label><label className="capacity-field"><span>Máximo de OS</span><input type="number" min="1" max="50" value={team.capacity} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, capacity: Math.max(1, Number(event.target.value)) } : item))} /></label><label className="team-active"><input type="checkbox" checked={team.active} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, active: event.target.checked } : item))} /><span>Ativa</span></label></div><div className="team-service-settings"><span>Tipos de trabalho</span>{(["Passeio", "Muro", "Vistoria"] as Service[]).map((service) => <label key={service}><input type="checkbox" checked={team.services.includes(service)} onChange={() => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, services: item.services.includes(service) ? item.services.filter((value) => value !== service) : [...item.services, service] } : item))} /><span>{service}</span></label>)}</div></article>)}</div><button className="add-team-button" onClick={() => setDraftTeams((current) => [...current, { id: `team-${Date.now()}`, name: `Equipe ${current.length + 1}`, color: "#35a56f", active: true, services: ["Passeio"], capacity: 5 }])}>＋ Adicionar equipe</button><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistTeams}>Salvar equipes</button></div></section></div>}

    {modal === "rules" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal rules-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">CRITÉRIOS DA SUGESTÃO</p><h2>O que deve vir primeiro?</h2><p>Estes critérios são provisórios e serão ajustados com a Camilla.</p><div className="rules-list">{([
      ["complaints", "Reclamações recentes", "Coloca retornos e reclamações no topo."],
      ["deadlines", "Prazo crítico", "Prioriza OS com um dia ou menos."],
      ["changes", "OS novas ou alteradas", "Mostra o que ainda precisa ser revisto."],
      ["sameAddress", "Mesmo endereço", "Tenta manter serviços do mesmo imóvel juntos."],
      ["recent", "Solicitações recentes", "Dá preferência às solicitações dos últimos dias."],
    ] as [keyof SuggestionRules, string, string][]).map(([key, title, description]) => <label key={key}><input type="checkbox" checked={draftRules[key]} onChange={(event) => setDraftRules((current) => ({ ...current, [key]: event.target.checked }))} /><div><strong>{title}</strong><span>{description}</span></div></label>)}</div><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistRules}>Salvar critérios</button></div></section></div>}

    {modal === "login" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><form className="modal login-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleLogin}><button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">NUVEM ROTAOS</p><h2>Entrar no ambiente {environment}</h2><p>Use o acesso criado no Supabase. A senha do Procesa nunca é usada aqui.</p><label><span>E-mail</span><input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label><span>Senha do RotaOS</span><input type="password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>{loginError && <div className="modal-warning">{loginError}</div>}<button className="primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button></form></div>}

    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
