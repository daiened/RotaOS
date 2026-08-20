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

type Service = "Passeio" | "Muro" | "Caixa Padrão";
type ServiceCode = "S201 X" | "S200 X" | "S025";
type SyncState = "new" | "updated" | "complaint" | "reviewed" | "not_seen" | "archived";
type SortKey = "selected" | "date" | "complaints" | "service" | "location" | "suggestion" | "state" | "team";
type SortDirection = "asc" | "desc";
type Modal = "import" | "teams" | "rules" | "login" | "suggestion" | null;

type WorkOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  requestedAt: string;
  service: Service;
  serviceCode: ServiceCode;
  detail: string;
  syncState: SyncState;
  complaintCount: number;
  latestComplaintAt?: string;
  sourceHash: string;
  lastSeenAt: string;
  changedAt?: string;
};

type TeamConfig = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: Service[];
  capacity: number;
};

type SuggestionRules = { complaints: boolean; recent: boolean };

const initialTeams: TeamConfig[] = [
  { id: "team-1", name: "Construpav 01", color: "#7457d9", active: true, services: ["Passeio", "Muro"], capacity: 6 },
  { id: "team-2", name: "Construpav 02", color: "#ee8d48", active: true, services: ["Passeio", "Muro", "Caixa Padrão"], capacity: 6 },
  { id: "team-3", name: "Construpav 03", color: "#2f99ac", active: true, services: ["Passeio", "Muro", "Caixa Padrão"], capacity: 5 },
];

const initialRules: SuggestionRules = { complaints: true, recent: true };
const referenceNow = new Date("2026-08-18T12:00:00-03:00").getTime();

const orderSeeds: Omit<WorkOrder, "sourceHash">[] = [
  { internalId: "3032011", id: "37007/2026/2", address: "Av. Dr. Paulo Japiassu Coelho, 10", neighborhood: "Cascatinha", region: "Sul", requestedAt: "17/08/2026 17:21:27", service: "Passeio", serviceCode: "S201 X", detail: "Recompor passeio", syncState: "new", complaintCount: 1, latestComplaintAt: "17/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032012", id: "36890/2026/4", address: "R. José Vicente, 1009", neighborhood: "Vila Santa Rita de Cássia", region: "Leste", requestedAt: "17/08/2026 16:05:48", service: "Muro", serviceCode: "S200 X", detail: "Recompor muro com acabamento", syncState: "complaint", complaintCount: 4, latestComplaintAt: "17/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032013", id: "36985/2026/1", address: "R. Luiz Fellett, 14", neighborhood: "Santo Antônio do Paraibuna", region: "Leste", requestedAt: "17/08/2026 15:52:58", service: "Muro", serviceCode: "S200 X", detail: "Recompor muro", syncState: "updated", complaintCount: 2, latestComplaintAt: "16/08/2026", lastSeenAt: "2026-08-18T01:00:00Z", changedAt: "2026-08-17T20:00:00Z" },
  { internalId: "3032014", id: "37003/2026/0", address: "R. Onofre Oliveira Salles, 100", neighborhood: "Cidade do Sol", region: "Norte", requestedAt: "17/08/2026 14:48:00", service: "Caixa Padrão", serviceCode: "S025", detail: "Substituição de caixa padrão", syncState: "new", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032015", id: "36890/2026/2", address: "R. José Vicente, 1009", neighborhood: "Vila Santa Rita de Cássia", region: "Leste", requestedAt: "17/08/2026 13:04:52", service: "Passeio", serviceCode: "S201 X", detail: "Mesmo endereço da OS 36890/2026/4", syncState: "complaint", complaintCount: 3, latestComplaintAt: "17/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032016", id: "35187/2026/5", address: "R. Dante Bellei, 151", neighborhood: "Santa Cândida", region: "Leste", requestedAt: "17/08/2026 12:32:30", service: "Muro", serviceCode: "S200 X", detail: "Recompor muro", syncState: "reviewed", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032017", id: "36335/2026/3", address: "Av. Sr. dos Passos, 1125", neighborhood: "São Pedro", region: "Sul", requestedAt: "17/08/2026 11:01:55", service: "Passeio", serviceCode: "S201 X", detail: "Passeio cimentado", syncState: "new", complaintCount: 1, latestComplaintAt: "17/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032018", id: "28718/2026/3", address: "R. Tavares Bastos, 72", neighborhood: "São Mateus", region: "Sul", requestedAt: "17/08/2026 09:49:20", service: "Passeio", serviceCode: "S201 X", detail: "Recompor passeio", syncState: "reviewed", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032019", id: "36742/2026/1", address: "R. Halfeld, 650", neighborhood: "Centro", region: "Sul", requestedAt: "16/08/2026 18:20:14", service: "Caixa Padrão", serviceCode: "S025", detail: "Caixa danificada", syncState: "complaint", complaintCount: 5, latestComplaintAt: "17/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032020", id: "36545/2026/5", address: "R. Luiz Basílio Castor, 250", neighborhood: "Santa Luzia", region: "Sul", requestedAt: "14/08/2026 14:30:00", service: "Passeio", serviceCode: "S201 X", detail: "Passeio cimentado", syncState: "reviewed", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032021", id: "36568/2026/1", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", region: "Sul", requestedAt: "14/08/2026 10:31:00", service: "Muro", serviceCode: "S200 X", detail: "Parede simples", syncState: "updated", complaintCount: 2, latestComplaintAt: "15/08/2026", lastSeenAt: "2026-08-18T01:00:00Z", changedAt: "2026-08-16T12:00:00Z" },
  { internalId: "3032022", id: "36568/2026/2", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", region: "Sul", requestedAt: "14/08/2026 10:31:00", service: "Passeio", serviceCode: "S201 X", detail: "Executar no mesmo imóvel", syncState: "reviewed", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032023", id: "36130/2026/1", address: "R. Jandira Limp Pinheiro, 239", neighborhood: "Jardim Bela Aurora", region: "Sul", requestedAt: "11/08/2026 16:48:00", service: "Passeio", serviceCode: "S201 X", detail: "Acesso difícil · final de escadão", syncState: "complaint", complaintCount: 3, latestComplaintAt: "16/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032024", id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28:00", service: "Muro", serviceCode: "S200 X", detail: "Recompor parede", syncState: "reviewed", complaintCount: 1, latestComplaintAt: "12/08/2026", lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032025", id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28:00", service: "Passeio", serviceCode: "S201 X", detail: "Recompor passeio · mesmo imóvel", syncState: "reviewed", complaintCount: 0, lastSeenAt: "2026-08-18T01:00:00Z" },
  { internalId: "3032026", id: "35830/2026/1", address: "Av. Darcy Vargas, 602", neighborhood: "Ipiranga", region: "Sul", requestedAt: "09/08/2026 12:52:00", service: "Muro", serviceCode: "S200 X", detail: "Recompor parede", syncState: "not_seen", complaintCount: 2, latestComplaintAt: "10/08/2026", lastSeenAt: "2026-08-15T01:00:00Z" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

function fingerprint(order: Pick<WorkOrder, "address" | "neighborhood" | "region" | "requestedAt" | "serviceCode" | "detail" | "complaintCount">) {
  return normalize([order.address, order.neighborhood, order.region, order.requestedAt, order.serviceCode, order.detail, order.complaintCount].join("|"));
}

const initialOrders: WorkOrder[] = orderSeeds.map((order) => ({ ...order, sourceHash: fingerprint(order) }));

function serviceInfo(raw: string): { service: Service; serviceCode: ServiceCode } | null {
  const value = normalize(raw);
  if (value.includes("S025") || value.includes("CAIXA PADRAO")) return { service: "Caixa Padrão", serviceCode: "S025" };
  if (value.includes("S200") || value.includes("RECOMPOR MURO")) return { service: "Muro", serviceCode: "S200 X" };
  if (value.includes("S201") || value.includes("RECOMPOR PASSEIO")) return { service: "Passeio", serviceCode: "S201 X" };
  return null;
}

function stateLabel(state: SyncState) {
  return ({ new: "Nova", updated: "Alterada", complaint: "Reclamação", reviewed: "Conferida", not_seen: "Não encontrada", archived: "Arquivada" } as const)[state];
}

function parseRequestedAt(value: string) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return Date.parse(value) || 0;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] ?? 12), Number(match[5] ?? 0), Number(match[6] ?? 0)).getTime();
}

function formatRequestedAt(value: string) {
  const time = parseRequestedAt(value);
  return time ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(time)) : "Data não informada";
}

function scoreOrder(order: WorkOrder, rules: SuggestionRules) {
  let score = 0;
  const reasons: string[] = [];
  if (rules.complaints && order.complaintCount > 0) {
    score += Math.min(order.complaintCount, 5) * 18;
    reasons.push(`${order.complaintCount} reclamação${order.complaintCount === 1 ? "" : "ões"}`);
  }
  if (rules.recent) {
    const ageDays = Math.max(0, (referenceNow - parseRequestedAt(order.requestedAt)) / 86_400_000);
    const recentScore = Math.max(0, 40 - Math.floor(ageDays * 4));
    score += recentScore;
    if (ageDays <= 3) reasons.push("solicitação recente");
  }
  return { score, reasons: reasons.length ? reasons : ["sem prioridade automática"] };
}

function storedToOrder(order: StoredOrder): WorkOrder | null {
  const info = serviceInfo(`${order.serviceCode ?? ""} ${order.service}`);
  if (!info) return null;
  return {
    ...order,
    ...info,
    requestedAt: formatRequestedAt(order.requestedAt),
    syncState: order.syncState as SyncState,
    complaintCount: order.complaintCount ?? 0,
    latestComplaintAt: order.latestComplaintAt,
  };
}

function SortHeader({ label, sortKey, currentKey, direction, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey; direction: SortDirection; onSort: (key: SortKey) => void }) {
  const active = currentKey === sortKey;
  return <button className={active ? "sort-header active" : "sort-header"} onClick={() => onSort(sortKey)}>{label}<span>{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
}

export default function Home() {
  const [orders, setOrders] = useState<WorkOrder[]>(initialOrders);
  const [teams, setTeams] = useState<TeamConfig[]>(initialTeams);
  const [draftTeams, setDraftTeams] = useState<TeamConfig[]>(initialTeams);
  const [rules, setRules] = useState<SuggestionRules>(initialRules);
  const [draftRules, setDraftRules] = useState<SuggestionRules>(initialRules);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [suggested, setSuggested] = useState<Set<string>>(() => new Set());
  const [suggestionReasons, setSuggestionReasons] = useState<Record<string, string[]>>({});
  const [suggestionRank, setSuggestionRank] = useState<Record<string, number>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"Todos" | Service>("Todos");
  const [stateFilter, setStateFilter] = useState<"Todos" | SyncState>("Todos");
  const [suggestionFilter, setSuggestionFilter] = useState<"Todos" | "Sugeridas">("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [teamFilter, setTeamFilter] = useState("Todas");
  const [modal, setModal] = useState<Modal>(null);
  const [explainedOrderId, setExplainedOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const cloudReady = isSupabaseConfigured();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localTeams = window.localStorage.getItem("rotaos-team-settings-v3");
      const localRules = window.localStorage.getItem("rotaos-suggestion-rules-v2");
      if (localTeams) try { setTeams(JSON.parse(localTeams)); } catch { /* configuração inválida */ }
      if (localRules) try { setRules(JSON.parse(localRules)); } catch { /* configuração inválida */ }
    }, 0);
    if (cloudReady) {
      void currentUserEmail().then(async (email) => {
        setUserEmail(email);
        if (!email) return;
        const [cloudOrders, cloudTeams] = await Promise.all([loadOrders(), loadTeams()]);
        const supported = cloudOrders.map(storedToOrder).filter((order): order is WorkOrder => Boolean(order));
        setOrders(supported);
        if (cloudTeams.length) setTeams(cloudTeams.map((team) => ({ ...team, services: team.services.map((service) => serviceInfo(service)?.service).filter((service): service is Service => Boolean(service)) })));
      }).catch(() => setToast("Não foi possível consultar a base online."));
    }
    return () => window.clearTimeout(timer);
  }, [cloudReady]);

  useEffect(() => {
    async function receiveImport(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "ROTAOS_IMPORT_FROM_PROCESA") return;
      const incoming = Array.isArray(event.data.payload?.orders) ? event.data.payload.orders : [];
      if (!incoming.length) return;
      const capturedAt = String(event.data.payload?.capturedAt ?? new Date().toISOString());
      const existing = new Map(orders.map((order) => [order.id, order]));
      const summary = { new: 0, updated: 0, reviewed: 0, complaint: 0 };
      const captured: WorkOrder[] = incoming.map((raw: Record<string, unknown>, index: number): WorkOrder | null => {
        const info = serviceInfo(`${String(raw.serviceType ?? "")} ${String(raw.requestedService ?? "")} ${String(raw.detail ?? "")}`);
        if (!info) return null;
        const id = String(raw.id ?? raw.occurrence ?? `OS-${index + 1}`);
        const previous = existing.get(id);
        const complaintCount = Number(raw.complaintCount ?? previous?.complaintCount ?? 0);
        const base: WorkOrder = {
          internalId: String(raw.internalId ?? ""), id,
          address: String(raw.address ?? "Endereço não informado"),
          neighborhood: String(raw.neighborhood ?? "Bairro não informado"),
          region: String(raw.region ?? "Região não informada"),
          requestedAt: String(raw.requestedAt ?? ""),
          ...info,
          detail: String(raw.detail ?? "Detalhe ainda não identificado"),
          syncState: "new",
          complaintCount,
          latestComplaintAt: String(raw.latestComplaintAt ?? previous?.latestComplaintAt ?? "") || undefined,
          sourceHash: "",
          lastSeenAt: capturedAt,
          changedAt: previous?.changedAt,
        };
        base.sourceHash = fingerprint(base);
        if (!previous) base.syncState = complaintCount ? "complaint" : "new";
        else if (previous.sourceHash !== base.sourceHash) { base.syncState = complaintCount > previous.complaintCount ? "complaint" : "updated"; base.changedAt = capturedAt; }
        else base.syncState = previous.syncState === "complaint" ? "complaint" : "reviewed";
        summary[base.syncState === "complaint" ? "complaint" : base.syncState as "new" | "updated" | "reviewed"] += 1;
        return base;
      }).filter((order: WorkOrder | null): order is WorkOrder => Boolean(order));

      const capturedIds = new Set(captured.map((order) => order.id));
      const merged = [...captured, ...orders.filter((order) => !capturedIds.has(order.id))];
      if (cloudReady && userEmail) {
        try {
          await saveOrders(captured, summary);
          const refreshed = (await loadOrders()).map(storedToOrder).filter((order): order is WorkOrder => Boolean(order));
          setOrders(refreshed);
        } catch { setToast("A sincronização não foi salva. A base anterior foi preservada."); }
      } else {
        setOrders(merged);
      }
      setSuggested(new Set());
      setPage(1);
      setModal(null);
      setToast(`${captured.length} OS atendidas pela Camilla foram comparadas. Outros serviços foram ignorados.`);
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
  const scores = useMemo(() => Object.fromEntries(orders.map((order) => [order.id, scoreOrder(order, rules)])), [orders, rules]);

  const filteredSorted = useMemo(() => {
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    const filtered = orders.filter((order) => {
      const requestedTime = parseRequestedAt(order.requestedAt);
      const text = normalize(`${order.id} ${order.address} ${order.neighborhood} ${order.detail} ${order.serviceCode}`);
      return (!query || text.includes(normalize(query)))
        && (serviceFilter === "Todos" || order.service === serviceFilter)
        && (stateFilter === "Todos" || order.syncState === stateFilter)
        && (suggestionFilter === "Todos" || suggested.has(order.id))
        && (teamFilter === "Todas" || assignments[order.id] === teamFilter)
        && requestedTime >= fromTime && requestedTime <= toTime;
    });
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "selected") comparison = Number(selected.has(a.id)) - Number(selected.has(b.id));
      if (sortKey === "date") comparison = parseRequestedAt(a.requestedAt) - parseRequestedAt(b.requestedAt);
      if (sortKey === "complaints") comparison = a.complaintCount - b.complaintCount;
      if (sortKey === "service") comparison = `${a.serviceCode} ${a.service}`.localeCompare(`${b.serviceCode} ${b.service}`, "pt-BR");
      if (sortKey === "location") comparison = `${a.neighborhood} ${a.address}`.localeCompare(`${b.neighborhood} ${b.address}`, "pt-BR");
      if (sortKey === "suggestion") comparison = (suggestionRank[a.id] ?? 9999) - (suggestionRank[b.id] ?? 9999);
      if (sortKey === "state") comparison = stateLabel(a.syncState).localeCompare(stateLabel(b.syncState), "pt-BR");
      if (sortKey === "team") comparison = (teams.find((team) => team.id === assignments[a.id])?.name ?? "ZZZ").localeCompare(teams.find((team) => team.id === assignments[b.id])?.name ?? "ZZZ", "pt-BR");
      return comparison * factor || parseRequestedAt(b.requestedAt) - parseRequestedAt(a.requestedAt);
    });
  }, [assignments, dateFrom, dateTo, orders, query, selected, serviceFilter, sortDirection, sortKey, stateFilter, suggested, suggestionFilter, suggestionRank, teamFilter, teams]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = pageOrders.length > 0 && pageOrders.every((order) => selected.has(order.id));
  const selectedOrders = orders.filter((order) => selected.has(order.id));
  const suggestedOrders = orders.filter((order) => suggested.has(order.id));
  const mapOrders = suggestedOrders.length ? suggestedOrders : selectedOrders;
  const teamCounts = Object.fromEntries(teams.map((team) => [team.id, mapOrders.filter((order) => assignments[order.id] === team.id).length]));
  const pinPositions = [[15, 22], [24, 33], [31, 20], [55, 18], [67, 28], [61, 40], [30, 62], [42, 72], [49, 58], [66, 65], [74, 55], [82, 72], [58, 78], [20, 48], [78, 35]];
  const explainedOrder = orders.find((order) => order.id === explainedOrderId);

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection(key === "service" || key === "location" || key === "state" || key === "team" ? "asc" : "desc"); }
    setPage(1);
  }

  function distribute(orderIds: Set<string>, label: string) {
    const chosen = orders.filter((order) => orderIds.has(order.id));
    if (!chosen.length) { setToast(`Não há OS na ${label.toLowerCase()}.`); return; }
    const load = Object.fromEntries(activeTeams.map((team) => [team.id, 0])) as Record<string, number>;
    const next: Record<string, string> = {};
    const groups = new Map<string, WorkOrder[]>();
    chosen.forEach((order) => { const key = normalize(order.address); groups.set(key, [...(groups.get(key) ?? []), order]); });
    [...groups.values()].sort((a, b) => (scores[b[0].id]?.score ?? 0) - (scores[a[0].id]?.score ?? 0)).forEach((group) => {
      const compatible = activeTeams.filter((team) => group.every((order) => team.services.includes(order.service)) && load[team.id] + group.length <= team.capacity).sort((a, b) => load[a.id] - load[b.id]);
      if (compatible[0]) { group.forEach((order) => { next[order.id] = compatible[0].id; }); load[compatible[0].id] += group.length; return; }
      group.forEach((order) => { const team = activeTeams.filter((item) => item.services.includes(order.service) && load[item.id] < item.capacity).sort((a, b) => load[a.id] - load[b.id])[0]; if (team) { next[order.id] = team.id; load[team.id] += 1; } });
    });
    setAssignments((current) => ({ ...current, ...next }));
    setRouteCalculated(true);
    setToast(`${label} distribuída entre as equipes para revisão. Nada foi enviado ao Procesa.`);
  }

  function createSuggestion() {
    const totalCapacity = activeTeams.reduce((sum, team) => sum + team.capacity, 0);
    const eligible = orders.filter((order) => !["archived", "not_seen"].includes(order.syncState) && activeTeams.some((team) => team.services.includes(order.service)));
    const ranked = [...eligible].sort((a, b) => scores[b.id].score - scores[a.id].score || parseRequestedAt(b.requestedAt) - parseRequestedAt(a.requestedAt)).slice(0, totalCapacity);
    const ids = new Set(ranked.map((order) => order.id));
    setSuggested(ids);
    setSuggestionRank(Object.fromEntries(ranked.map((order, index) => [order.id, index + 1])));
    setSuggestionReasons(Object.fromEntries(ranked.map((order) => [order.id, scores[order.id].reasons])));
    setSuggestionFilter("Sugeridas");
    setSortKey("suggestion");
    setSortDirection("asc");
    setPage(1);
    distribute(ids, "Sugestão RotaOS");
  }

  function togglePage() {
    setSelected((current) => { const next = new Set(current); pageOrders.forEach((order) => allPageSelected ? next.delete(order.id) : next.add(order.id)); return next; });
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setLoginError("");
    try {
      await signIn(loginEmail, loginPassword); setUserEmail(loginEmail);
      const refreshed = (await loadOrders()).map(storedToOrder).filter((order): order is WorkOrder => Boolean(order));
      setOrders(refreshed);
      setModal(null); setToast("Base online conectada.");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  function persistTeams() {
    setTeams(draftTeams); window.localStorage.setItem("rotaos-team-settings-v3", JSON.stringify(draftTeams));
    if (cloudReady && userEmail) void saveTeamsToCloud(draftTeams).catch(() => setToast("Equipes salvas apenas neste navegador."));
    setModal(null); setRouteCalculated(false); setToast("Equipes e capacidades atualizadas.");
  }

  function persistRules() {
    setRules(draftRules); window.localStorage.setItem("rotaos-suggestion-rules-v2", JSON.stringify(draftRules));
    setSuggested(new Set()); setSuggestionFilter("Todos"); setModal(null); setToast("Critérios atualizados. Gere uma nova sugestão.");
  }

  return <main className={sidebarCollapsed ? "app-shell sidebar-is-collapsed" : "app-shell"}>
    <aside className="sidebar">
      <button className="brand" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"} title={sidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}><span className="brand-mark">R</span><span>RotaOS</span></button>
      <nav className="module-switcher" aria-label="Módulos"><button className="current-module active"><span>01</span><div><strong>Planejamento</strong><small>base e rotas</small></div></button></nav>
      <div className="sidebar-note environment-note"><span>VERSÃO ÚNICA</span><strong>RotaOS oficial</strong><p>Atualizações são publicadas no endereço oficial do GitHub Pages.</p></div>
      <div className={`cloud-status ${userEmail ? "connected" : ""}`}><i /><div><strong>{userEmail ? "Banco conectado" : cloudReady ? "Banco pronto" : "Banco ainda não conectado"}</strong><small>{userEmail ?? (cloudReady ? "Clique em Entrar no topo" : "Modo demonstrativo local")}</small></div></div>
    </aside>

    <section className="workspace prototype-workspace">
      <header className="topbar prototype-topbar"><div><p className="eyebrow">PLANEJAMENTO DE ROTAS</p><h1>Chamados da Camilla</h1><p className="subtitle">S025 Caixa Padrão · S200 X Muro · S201 X Passeio</p></div><div className="header-actions">{cloudReady && <button className="secondary" onClick={() => userEmail ? void signOut().then(() => setUserEmail(null)) : setModal("login")}>{userEmail ? "Sair" : "Entrar"}</button>}<button className="secondary" onClick={() => setModal("import")}>Sincronizar Procesa</button><button className="primary smart-button" onClick={createSuggestion}>✦ Sugerir melhores chamados</button><button className="icon-action" onClick={() => { setDraftRules(rules); setModal("rules"); }} aria-label="Configurar critérios">⚙</button></div></header>

      <div className="architecture-banner"><strong>Fluxo definitivo</strong><span>Extensão → banco protegido → grid. O grid consultará sempre a base completa, não somente a última coleta.</span><em>{cloudReady && userEmail ? "Base online carregada" : cloudReady ? "Clique em Entrar, no topo da página" : "Conexão online pendente"}</em></div>

      <section className="prototype-metrics">
        <article><span className="prototype-metric-icon purple">▦</span><div><p>Base disponível</p><strong>{orders.length}</strong><small>somente serviços atendidos</small></div></article>
        <article><span className="prototype-metric-icon orange">✦</span><div><p>Sugeridas</p><strong>{suggested.size}</strong><small>independente da seleção</small></div></article>
        <article><span className="prototype-metric-icon red">!</span><div><p>Reclamações</p><strong>{orders.reduce((sum, order) => sum + order.complaintCount, 0)}</strong><small>ocorrências registradas</small></div></article>
        <article><span className="prototype-metric-icon green">✓</span><div><p>Selecionadas</p><strong>{selected.size}</strong><small>escolha manual da Camilla</small></div></article>
      </section>

      <div className={routeCalculated ? "prototype-notice calculated" : "prototype-notice"}><span>{routeCalculated ? "✓" : "○"}</span><div><strong>{selected.size} chamados escolhidos manualmente</strong><p>A sugestão do RotaOS não marca nem desmarca estes chamados.</p></div><button onClick={() => distribute(selected, "Seleção manual")}>Calcular rotas da seleção →</button></div>

      <section className="prototype-content-grid">
        <article className="prototype-card prototype-map-card"><div className="prototype-section-heading"><div><h2>{suggested.size ? "Rotas dos chamados sugeridos" : "Visão geral das rotas"}</h2><p>{mapOrders.length} OS em análise · cores por equipe</p></div><span className="prototype-map-state">MAPA ILUSTRATIVO</span></div><div className="prototype-map" aria-label="Mapa ilustrativo"><div className="prototype-river" /><span className="prototype-road road-1" /><span className="prototype-road road-2" /><span className="prototype-road road-3" /><span className="prototype-road road-4" /><span className="prototype-road road-5" /><span className="prototype-district d1">SANTA CRUZ</span><span className="prototype-district d2">BENFICA</span><span className="prototype-district d3">CENTRO</span><span className="prototype-district d4">TEIXEIRAS</span><span className="prototype-district d5">VITORINO BRAGA</span>{mapOrders.slice(0, pinPositions.length).map((order, index) => { const team = teams.find((item) => item.id === assignments[order.id]); const [left, top] = pinPositions[index]; return <span key={order.id} className="prototype-pin" style={{ left: `${left}%`, top: `${top}%`, background: team?.color ?? "#9a9eaa" }}><i>{index + 1}</i></span>; })}<div className="prototype-map-legend">{activeTeams.map((team) => <span key={team.id}><i style={{ background: team.color }} />{team.name}</span>)}</div></div><div className="map-warning"><strong>Distância ainda não calculada</strong><span>A escolha usa recência e reclamações; proximidade real entra na etapa do mapa geográfico.</span></div></article>
        <aside className="prototype-card prototype-team-panel"><div className="prototype-section-heading"><div><h2>Equipes</h2><p>Serviços e capacidade diária</p></div><button className="prototype-icon-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }}>⚙</button></div><div className="prototype-team-list">{activeTeams.map((team, index) => <button key={team.id} className={teamFilter === team.id ? "prototype-team-row active" : "prototype-team-row"} onClick={() => setTeamFilter(teamFilter === team.id ? "Todas" : team.id)}><span className="prototype-team-number" style={{ background: team.color }}>{index + 1}</span><div><strong>{team.name}</strong><span>{team.services.join(" + ")}</span></div><small>{teamCounts[team.id] ?? 0}/{team.capacity}</small><b>›</b></button>)}</div><div className="prototype-team-actions"><button className="prototype-outline-full" onClick={() => setTeamFilter("Todas")}>Todas as equipes</button><button className="prototype-settings-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }}>⚙</button></div></aside>
      </section>

      <section className="prototype-card prototype-orders-card">
        <div className="prototype-section-heading grid-heading"><div><h2>Base de chamados</h2><p>Ordene pelas setas do cabeçalho; a seleção permanece entre páginas e filtros.</p></div><div className="page-size"><span>Itens por página</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>25</option><option>50</option><option>100</option></select></div></div>
        <div className="database-filters">
          <input aria-label="Buscar" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar OS, bairro ou endereço" />
          <label><span>De</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
          <label><span>Até</span><input type="date" value={dateTo} min={dateFrom} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
          <select aria-label="Serviço" value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value as "Todos" | Service); setPage(1); }}><option>Todos</option><option>Passeio</option><option>Muro</option><option>Caixa Padrão</option></select>
          <select aria-label="Atualização" value={stateFilter} onChange={(event) => { setStateFilter(event.target.value as "Todos" | SyncState); setPage(1); }}><option value="Todos">Todas as atualizações</option><option value="new">Novas</option><option value="updated">Alteradas</option><option value="complaint">Com reclamação</option><option value="reviewed">Conferidas</option><option value="not_seen">Não encontradas</option></select>
          <select aria-label="Sugestão" value={suggestionFilter} onChange={(event) => { setSuggestionFilter(event.target.value as "Todos" | "Sugeridas"); setPage(1); }}><option value="Todos">Toda a base</option><option value="Sugeridas">Somente sugeridas</option></select>
          <button className="prototype-clear-button" onClick={() => { setQuery(""); setDateFrom(""); setDateTo(""); setServiceFilter("Todos"); setStateFilter("Todos"); setSuggestionFilter("Todos"); setTeamFilter("Todas"); setPage(1); }}>Limpar filtros</button>
        </div>
        <div className="prototype-selection-bar"><strong>{selected.size} selecionadas</strong><span>{filteredSorted.length} resultados na base.</span><button onClick={togglePage}>{allPageSelected ? "Desmarcar página" : "Selecionar página"}</button></div>
        <div className="prototype-table-wrap"><table className="smart-grid"><thead><tr><th className="selection-header"><input aria-label="Selecionar página" type="checkbox" checked={allPageSelected} onChange={togglePage} /><button onClick={() => changeSort("selected")} title="Ordenar selecionadas primeiro">{sortKey === "selected" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</button></th><th><SortHeader label="ATUALIZAÇÃO" sortKey="state" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th>ORDEM DE SERVIÇO</th><th><SortHeader label="DATA" sortKey="date" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="LOCAL" sortKey="location" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="SERVIÇO" sortKey="service" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="RECLAMAÇÕES" sortKey="complaints" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th>DETALHES</th><th><SortHeader label="SUGESTÃO ROTAOS" sortKey="suggestion" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="EQUIPE" sortKey="team" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th></tr></thead><tbody>{!pageOrders.length && <tr className="empty-grid-row"><td colSpan={10}>{userEmail ? "A base online está vazia. Sincronize os chamados pelo Procesa para começar." : "Entre no RotaOS para carregar a base online."}</td></tr>}{pageOrders.map((order) => { const team = teams.find((item) => item.id === assignments[order.id]); const isSuggested = suggested.has(order.id); return <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; })} /></td><td><span className={`sync-badge ${order.syncState}`}>{stateLabel(order.syncState)}</span></td><td><strong>{order.id}</strong></td><td><strong>{order.requestedAt}</strong></td><td><strong>{order.address}</strong><span>{order.neighborhood} · {order.region}</span></td><td><span className={`prototype-service-tag ${order.service === "Caixa Padrão" ? "caixa" : order.service.toLowerCase()}`}>{order.serviceCode} · {order.service}</span></td><td><span className={order.complaintCount ? "complaint-count active" : "complaint-count"}>{order.complaintCount}</span>{order.latestComplaintAt && <small>última: {order.latestComplaintAt}</small>}</td><td><span>{order.detail}</span></td><td>{isSuggested ? <div className="suggestion-cell"><span>#{suggestionRank[order.id]} Sugerida</span><button onClick={() => { setExplainedOrderId(order.id); setModal("suggestion"); }}>Ver motivo</button></div> : <span className="not-suggested">—</span>}</td><td><span className="prototype-team-dot" style={{ background: team?.color ?? "#9a9eaa" }} />{team?.name ?? "A definir"}</td></tr>; })}</tbody></table></div>
        <div className="grid-pagination"><span>Mostrando {filteredSorted.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredSorted.length)} de {filteredSorted.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Anterior</button><strong>Página {currentPage} de {totalPages}</strong><button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima →</button></div></div>
      </section>
    </section>

    {modal === "import" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">SINCRONIZAÇÃO</p><h2>A base será alimentada pelo Procesa</h2><p>A extensão coleta os registros, o banco compara e guarda o histórico, e o grid consulta sempre a base completa.</p><div className="import-steps"><div><span>1</span><div><strong>Extensão coleta</strong><small>Somente S025, S200 X e S201 X.</small></div></div><div><span>2</span><div><strong>Banco compara</strong><small>Insere novas, atualiza alteradas e preserva o histórico.</small></div></div><div><span>3</span><div><strong>Grid consulta</strong><small>Filtros, ordenação e paginação usam a base online.</small></div></div></div><div className="modal-warning">{!cloudReady ? "A conexão online ainda não foi configurada neste ambiente." : !userEmail ? "Clique em Entrar no topo da página e use o e-mail e a senha cadastrados no RotaOS antes de sincronizar." : "Banco conectado: os chamados importados serão comparados e salvos na sua base."}</div><a className="primary button-link full" href="downloads/rotaos-ponte-procesa.zip" download>Baixar extensão atualizada</a></section></div>}

    {modal === "teams" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal team-settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">EQUIPES E CAPACIDADE</p><h2>Quem pode executar cada serviço?</h2><div className="team-settings-list">{draftTeams.map((team) => <article key={team.id}><div className="team-settings-main"><input type="color" value={team.color} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, color: event.target.value } : item))} /><label><span>Nome da equipe</span><input value={team.name} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, name: event.target.value } : item))} /></label><label className="capacity-field"><span>Máximo de OS</span><input type="number" min="1" max="50" value={team.capacity} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, capacity: Math.max(1, Number(event.target.value)) } : item))} /></label><label className="team-active"><input type="checkbox" checked={team.active} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, active: event.target.checked } : item))} /><span>Ativa</span></label></div><div className="team-service-settings"><span>Tipos de trabalho</span>{(["Passeio", "Muro", "Caixa Padrão"] as Service[]).map((service) => <label key={service}><input type="checkbox" checked={team.services.includes(service)} onChange={() => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, services: item.services.includes(service) ? item.services.filter((value) => value !== service) : [...item.services, service] } : item))} /><span>{service}</span></label>)}</div></article>)}</div><button className="add-team-button" onClick={() => setDraftTeams((current) => [...current, { id: `team-${Date.now()}`, name: `Equipe ${current.length + 1}`, color: "#35a56f", active: true, services: ["Passeio"], capacity: 5 }])}>＋ Adicionar equipe</button><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistTeams}>Salvar equipes</button></div></section></div>}

    {modal === "rules" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal rules-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">CRITÉRIOS DA SUGESTÃO</p><h2>O que torna um chamado interessante?</h2><p>A sugestão analisa toda a base filtrada e não altera a seleção manual.</p><div className="rules-list"><label><input type="checkbox" checked={draftRules.recent} onChange={(event) => setDraftRules((current) => ({ ...current, recent: event.target.checked }))} /><div><strong>Chamados mais recentes</strong><span>Quanto mais recente a solicitação, maior a pontuação.</span></div></label><label><input type="checkbox" checked={draftRules.complaints} onChange={(event) => setDraftRules((current) => ({ ...current, complaints: event.target.checked }))} /><div><strong>Quantidade de reclamações recentes</strong><span>Cada reclamação aumenta a prioridade, limitada para evitar distorções.</span></div></label></div><div className="criteria-note"><strong>Depois da escolha</strong><span>Compatibilidade da equipe, capacidade e mesmo endereço ajudam a formar as rotas, mas não decidem quais chamados são melhores.</span></div><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistRules}>Salvar critérios</button></div></section></div>}

    {modal === "suggestion" && explainedOrder && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal suggestion-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">SUGESTÃO #{suggestionRank[explainedOrder.id]}</p><h2>{explainedOrder.id}</h2><p>{explainedOrder.address} · {explainedOrder.neighborhood}</p><div className="suggestion-explanation">{suggestionReasons[explainedOrder.id]?.map((reason) => <span key={reason}>✓ {reason}</span>)}</div><div className="score-line"><span>Pontuação da sugestão</span><strong>{scores[explainedOrder.id]?.score ?? 0}</strong></div><p className="explanation-footnote">Essa pontuação apenas organiza as sugestões. A decisão final continua sendo da Camilla.</p></section></div>}

    {modal === "login" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><form className="modal login-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleLogin}><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button><p className="modal-kicker">BASE ONLINE</p><h2>Entrar no RotaOS</h2><p>Use o e-mail e a senha cadastrados no banco RotaOS. A senha do Procesa nunca é usada aqui.</p><label><span>E-mail</span><input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label><span>Senha do RotaOS</span><input type="password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>{loginError && <div className="modal-warning">{loginError}</div>}<button className="primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button></form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
