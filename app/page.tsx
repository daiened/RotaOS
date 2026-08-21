"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  clearFileImportOrders,
  currentUserEmail,
  isSupabaseConfigured,
  loadFileImportOrders,
  loadOrders,
  loadTeams,
  replaceFileImportOrders,
  saveFileImportGeocodes,
  saveOrders,
  saveTeams as saveTeamsToCloud,
  signIn,
  signOut,
  type FileImportOrder,
  type StoredOrder,
} from "../lib/supabase";

type Service = "Passeio" | "Muro" | "Caixa Padrão" | "Meio-fio" | "Calçamento";
type ServiceCode = "S201 X" | "S200 X" | "S025" | "S202 X" | "S199 X";
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
  processaTeam?: string;
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
  source?: "procesa" | "spreadsheet";
  accountCode?: string;
  complement?: string;
  sourceFile?: string;
  latitude?: number;
  longitude?: number;
};

type WorkspaceModule = "planning" | "spreadsheet";

type TeamConfig = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: Service[];
  capacity: number;
};

type CustomCriterion = {
  id: string;
  field: "neighborhood" | "region" | "service";
  value: string;
  points: number;
};

type SuggestionRules = { complaints: boolean; recent: boolean; customCriteria: CustomCriterion[] };

const initialTeams: TeamConfig[] = [
  { id: "team-1", name: "Construpav 01", color: "#7457d9", active: true, services: ["Passeio", "Muro", "Meio-fio", "Calçamento"], capacity: 6 },
  { id: "team-2", name: "Construpav 02", color: "#ee8d48", active: true, services: ["Passeio", "Muro", "Caixa Padrão", "Meio-fio", "Calçamento"], capacity: 6 },
  { id: "team-3", name: "Construpav 03", color: "#2f99ac", active: true, services: ["Passeio", "Muro", "Caixa Padrão", "Meio-fio", "Calçamento"], capacity: 5 },
];

const initialRules: SuggestionRules = { complaints: true, recent: true, customCriteria: [] };
const referenceNow = Date.now();

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

function fingerprint(order: Pick<WorkOrder, "address" | "neighborhood" | "region" | "processaTeam" | "requestedAt" | "serviceCode" | "detail" | "complaintCount">) {
  return normalize([order.address, order.neighborhood, order.region, order.processaTeam, order.requestedAt, order.serviceCode, order.detail, order.complaintCount].join("|"));
}

const initialOrders: WorkOrder[] = orderSeeds.map((order) => ({ ...order, sourceHash: fingerprint(order) }));

function serviceInfo(raw: string): { service: Service; serviceCode: ServiceCode } | null {
  const value = normalize(raw);
  if (value.includes("S025") || value.includes("CAIXA PADRAO")) return { service: "Caixa Padrão", serviceCode: "S025" };
  if (value.includes("S202") || value.includes("MEIO FIO") || value.includes("MEIO-FIO")) return { service: "Meio-fio", serviceCode: "S202 X" };
  if (value.includes("S199") || value.includes("CALCAMENTO")) return { service: "Calçamento", serviceCode: "S199 X" };
  if (value === "MURO" || value.includes("S200") || value.includes("RECOMPOR MURO")) return { service: "Muro", serviceCode: "S200 X" };
  if (value === "PASSEIO" || value.includes("S201") || value.includes("RECOMPOR PASSEIO")) return { service: "Passeio", serviceCode: "S201 X" };
  return null;
}

function teamCanHandle(team: TeamConfig, service: Service) {
  return team.services.some((configured) => configured === service || serviceInfo(configured)?.service === service);
}

function normalizeTeamServices(services: string[]): Service[] {
  const normalized = services.map((service) => serviceInfo(service)?.service).filter((service): service is Service => Boolean(service));
  return normalized.includes("Muro") ? Array.from(new Set([...normalized, "Meio-fio", "Calçamento"])) : normalized;
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
  if (order.source === "spreadsheet") {
    score += 30;
    reasons.push("prioridade enviada pela CESAMA");
  }
  const latestComplaint = order.latestComplaintAt ? parseRequestedAt(order.latestComplaintAt) : 0;
  const complaintAgeDays = latestComplaint ? Math.max(0, (referenceNow - latestComplaint) / 86_400_000) : Number.POSITIVE_INFINITY;
  if (rules.complaints && order.complaintCount > 0 && complaintAgeDays <= 30) {
    score += Math.min(order.complaintCount, 5) * 18;
    reasons.push(`${order.complaintCount} reclamação${order.complaintCount === 1 ? "" : "ões"}`);
  }
  if (rules.recent) {
    const ageDays = Math.max(0, (referenceNow - parseRequestedAt(order.requestedAt)) / 86_400_000);
    const recentScore = Math.max(0, 40 - Math.floor(ageDays * 4));
    score += recentScore;
    if (ageDays <= 3) reasons.push("solicitação recente");
  }
  rules.customCriteria.forEach((criterion) => {
    const value = criterion.value.trim();
    if (!value) return;
    const source = criterion.field === "neighborhood" ? order.neighborhood : criterion.field === "region" ? order.region : `${order.serviceCode} ${order.service}`;
    if (!normalize(source).includes(normalize(value))) return;
    const points = Math.max(0, Math.min(100, Number(criterion.points) || 0));
    score += points;
    const fieldLabel = criterion.field === "neighborhood" ? "bairro" : criterion.field === "region" ? "região" : "serviço";
    reasons.push(`${fieldLabel} prioritário: ${value}`);
  });
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

function spreadsheetToOrder(order: FileImportOrder): WorkOrder | null {
  const info = serviceInfo(order.serviceType);
  if (!info) return null;
  const base: WorkOrder = {
    internalId: order.accountCode,
    id: order.id,
    address: order.address || "Endereço não informado",
    neighborhood: order.neighborhood || "Bairro não informado",
    region: order.region || "Região a confirmar",
    requestedAt: formatRequestedAt(order.requestedAt),
    ...info,
    detail: order.observation || "Prioridade enviada sem observação.",
    syncState: "reviewed",
    complaintCount: 0,
    sourceHash: order.sourceHash,
    lastSeenAt: order.importedAt,
    source: "spreadsheet",
    accountCode: order.accountCode,
    complement: order.complement,
    sourceFile: order.fileName,
    latitude: order.latitude,
    longitude: order.longitude,
  };
  return { ...base, sourceHash: base.sourceHash || fingerprint(base) };
}

function SortHeader({ label, sortKey, currentKey, direction, onSort }: { label: string; sortKey: SortKey; currentKey: SortKey; direction: SortDirection; onSort: (key: SortKey) => void }) {
  const active = currentKey === sortKey;
  return <button className={active ? "sort-header active" : "sort-header"} onClick={() => onSort(sortKey)}>{label}<span>{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
}

export default function Home() {
  const [planningOrders, setPlanningOrders] = useState<WorkOrder[]>(initialOrders);
  const [spreadsheetOrders, setSpreadsheetOrders] = useState<WorkOrder[]>([]);
  const [activeModule, setActiveModule] = useState<WorkspaceModule>("planning");
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
  const [stateFilter, setStateFilter] = useState<SyncState[]>([]);
  const updateFilterRef = useRef<HTMLDetailsElement>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<"Todos" | "Sugeridas">("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [teamFilter, setTeamFilter] = useState("Todas");
  const [regionFilter, setRegionFilter] = useState("Todas");
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
  const [authResolved, setAuthResolved] = useState(false);
  const [gridFocus, setGridFocus] = useState(true);
  const importFileRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const leafletMarkersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState("");

  const cloudReady = isSupabaseConfigured();
  const orders = activeModule === "planning" ? planningOrders : spreadsheetOrders;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const localTeams = window.localStorage.getItem("rotaos-team-settings-v3");
      const localRules = window.localStorage.getItem("rotaos-suggestion-rules-v2");
      if (localTeams) try { setTeams((JSON.parse(localTeams) as TeamConfig[]).map((team) => ({ ...team, services: normalizeTeamServices(team.services) }))); } catch { /* configuração inválida */ }
      if (localRules) try {
        const savedRules = JSON.parse(localRules) as Partial<SuggestionRules>;
        setRules({ ...initialRules, ...savedRules, customCriteria: Array.isArray(savedRules.customCriteria) ? savedRules.customCriteria : [] });
      } catch { /* configuração inválida */ }
    }, 0);
    if (cloudReady) {
      void currentUserEmail().then(async (email) => {
        setUserEmail(email);
        if (!email) return;
        const [cloudOrders, cloudTeams] = await Promise.all([loadOrders(), loadTeams()]);
        const supported = cloudOrders.map(storedToOrder).filter((order): order is WorkOrder => Boolean(order));
        setPlanningOrders(supported);
        if (cloudTeams.length) setTeams(cloudTeams.map((team) => ({ ...team, services: normalizeTeamServices(team.services) })));
        try {
          const imported = await loadFileImportOrders();
          setSpreadsheetOrders(imported.map(spreadsheetToOrder).filter((order): order is WorkOrder => Boolean(order)));
        } catch { /* a migração da importação ainda pode não ter sido aplicada */ }
      }).catch(() => setToast("Não foi possível consultar a base online.")).finally(() => setAuthResolved(true));
    }
    return () => window.clearTimeout(timer);
  }, [cloudReady]);

  useEffect(() => {
    async function receiveImport(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "ROTAOS_IMPORT_FROM_PROCESA") return;
      const incoming = Array.isArray(event.data.payload?.orders) ? event.data.payload.orders : [];
      if (!incoming.length) return;
      if (cloudReady && !authResolved) {
        setToast("Aguardando a confirmação da sua sessão para gravar a coleta.");
        return;
      }
      if (cloudReady && !userEmail) {
        setToast("Entre no RotaOS antes de sincronizar. A coleta continua disponível na extensão.");
        return;
      }
      const capturedAt = String(event.data.payload?.capturedAt ?? new Date().toISOString());
      const existing = new Map(planningOrders.map((order) => [order.id, order]));
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
          processaTeam: String(raw.team ?? previous?.processaTeam ?? "").trim() || undefined,
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
      const merged = [...captured, ...planningOrders.filter((order) => !capturedIds.has(order.id))];
      try {
        if (cloudReady) {
          await saveOrders(captured, summary);
          const refreshed = (await loadOrders()).map(storedToOrder).filter((order): order is WorkOrder => Boolean(order));
          setPlanningOrders(refreshed);
        } else {
          setPlanningOrders(merged);
        }
        setSuggested(new Set());
        setPage(1);
        setModal(null);
        setToast(cloudReady ? `${captured.length} OS foram salvas na base online.` : `${captured.length} OS atendidas pela Camilla foram comparadas. Outros serviços foram ignorados.`);
        window.postMessage({ type: "ROTAOS_IMPORT_ACCEPTED" }, window.location.origin);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido.";
        setToast(`A sincronização não foi salva: ${message} A coleta continua disponível na extensão.`);
      }
    }
    window.addEventListener("message", receiveImport);
    return () => window.removeEventListener("message", receiveImport);
  }, [authResolved, cloudReady, planningOrders, userEmail]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const closeUpdateFilter = (event: PointerEvent) => {
      if (updateFilterRef.current && !updateFilterRef.current.contains(event.target as Node)) updateFilterRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeUpdateFilter);
    return () => document.removeEventListener("pointerdown", closeUpdateFilter);
  }, []);

  useEffect(() => {
    setSelected(new Set());
    setSuggested(new Set());
    setSuggestionReasons({});
    setSuggestionRank({});
    setAssignments({});
    setSuggestionFilter("Todos");
    setTeamFilter("Todas");
    setRegionFilter("Todas");
    setPage(1);
    setRouteCalculated(false);
  }, [activeModule]);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((leaflet) => {
      if (disposed || !mapContainerRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(mapContainerRef.current, { zoomControl: true }).setView([-21.7642, -43.3503], 12);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      leafletMapRef.current = map;
      leafletMarkersRef.current = leaflet.layerGroup().addTo(map);
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    }).catch(() => setToast("Não foi possível carregar o mapa de Juiz de Fora."));
    return () => { disposed = true; leafletMapRef.current?.remove(); leafletMapRef.current = null; leafletMarkersRef.current = null; };
  }, []);

  const activeTeams = teams.filter((team) => team.active);
  const scores = useMemo(() => Object.fromEntries(orders.map((order) => [order.id, scoreOrder(order, rules)])), [orders, rules]);

  const regionOptions = useMemo(() => Array.from(new Set(orders.map((order) => order.region).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [orders]);
  const scopedOrders = useMemo(() => regionFilter === "Todas" ? orders : orders.filter((order) => order.region === regionFilter), [orders, regionFilter]);
  const regionGroups = useMemo(() => regionOptions.map((region) => {
    const groupOrders = orders.filter((order) => order.region === region);
    return { region, total: groupOrders.length, neighborhoods: new Set(groupOrders.map((order) => order.neighborhood)).size, selected: groupOrders.filter((order) => selected.has(order.id)).length, suggested: groupOrders.filter((order) => suggested.has(order.id)).length };
  }), [orders, regionOptions, selected, suggested]);

  const filteredSorted = useMemo(() => {
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    const filtered = orders.filter((order) => {
      const requestedTime = parseRequestedAt(order.requestedAt);
      const text = normalize(`${order.id} ${order.address} ${order.neighborhood} ${order.detail} ${order.serviceCode}`);
      return (!query || text.includes(normalize(query)))
        && (serviceFilter === "Todos" || order.service === serviceFilter)
        && (!stateFilter.length || stateFilter.includes(order.syncState))
        && (suggestionFilter === "Todos" || suggested.has(order.id))
        && (teamFilter === "Todas" || assignments[order.id] === teamFilter)
        && (regionFilter === "Todas" || order.region === regionFilter)
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
  }, [assignments, dateFrom, dateTo, orders, query, regionFilter, selected, serviceFilter, sortDirection, sortKey, stateFilter, suggested, suggestionFilter, suggestionRank, teamFilter, teams]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = pageOrders.length > 0 && pageOrders.every((order) => selected.has(order.id));
  const selectedOrders = scopedOrders.filter((order) => selected.has(order.id));
  const suggestedOrders = scopedOrders.filter((order) => suggested.has(order.id));
  const mapOrders = suggestedOrders.length ? suggestedOrders : selectedOrders.length ? selectedOrders : activeModule === "spreadsheet" ? scopedOrders : [];
  const teamCounts = Object.fromEntries(teams.map((team) => [team.id, mapOrders.filter((order) => assignments[order.id] === team.id).length]));
  const explainedOrder = orders.find((order) => order.id === explainedOrderId);

  useEffect(() => {
    const map = leafletMapRef.current;
    const leaflet = leafletRef.current;
    const markers = leafletMarkersRef.current;
    if (!mapReady || !map || !leaflet || !markers) return;
    markers.clearLayers();
    const located = mapOrders.filter((order) => Number.isFinite(order.latitude) && Number.isFinite(order.longitude));
    located.forEach((order, index) => {
      const team = teams.find((item) => item.id === assignments[order.id]);
      const marker = leaflet.marker([order.latitude as number, order.longitude as number], {
        icon: leaflet.divIcon({ className: "rotaos-map-marker", html: `<span style="background:${team?.color ?? "#6e55d7"}">${index + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: `${order.id} · ${order.address}`,
      });
      marker.on("click", () => setToast(`${order.id} · ${order.address} · ${order.region}`));
      marker.addTo(markers);
    });
    if (located.length === 1) map.setView([located[0].latitude as number, located[0].longitude as number], 15);
    if (located.length > 1) map.fitBounds(leaflet.latLngBounds(located.map((order) => [order.latitude as number, order.longitude as number])), { padding: [30, 30], maxZoom: 15 });
  }, [assignments, mapOrders, mapReady, teams]);

  async function handleSpreadsheetFile(file: File) {
    if (!/\.xlsx$/i.test(file.name)) {
      setToast("Selecione um arquivo XLSX enviado pela CESAMA.");
      return;
    }
    if (cloudReady && !userEmail) {
      setToast("Entre no RotaOS antes de importar o arquivo.");
      return;
    }
    setBusy(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("A planilha não possui uma aba para leitura.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false, dateNF: "dd/mm/yyyy hh:mm:ss" });
      const importedAt = new Date().toISOString();
      const byId = new Map<string, FileImportOrder>();
      rows.forEach((raw) => {
        const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalize(key), String(value ?? "").trim()]));
        const id = values["CODIGO OCORRENCIA"] || values["OCORRENCIA"];
        const serviceType = values["TIPO OCORRENCIA"] || values["SERVICO SOLICITADO"];
        if (!id || !serviceInfo(serviceType)) return;
        const item: FileImportOrder = {
          id,
          accountCode: values["CODIGO"] || "",
          address: values["ENDERECO"] || "Endereço não informado",
          neighborhood: values["BAIRRO"] || "Bairro não informado",
          region: values["REGIAO"] || "",
          complement: values["COMPLEMENTO"] || "",
          requestedAt: values["DATA SOLICITACAO"] || "",
          serviceType,
          observation: values["OBSERVACAO"] || "",
          sourceHash: normalize([id, values["DATA SOLICITACAO"], values["ENDERECO"], values["BAIRRO"], values["REGIAO"], serviceType, values["OBSERVACAO"]].join("|")),
          fileName: file.name,
          importedAt,
        };
        byId.set(item.id, item);
      });
      const imported = Array.from(byId.values());
      if (!imported.length) throw new Error("Não encontrei OS atendidas nas colunas do arquivo.");
      if (cloudReady) await replaceFileImportOrders(imported);
      setSpreadsheetOrders(imported.map(spreadsheetToOrder).filter((order): order is WorkOrder => Boolean(order)));
      setActiveModule("spreadsheet");
      setToast(`${imported.length} OS de prioridade foram importadas${cloudReady ? " e salvas na base" : " neste navegador"}.`);
    } catch (error) {
      setToast(error instanceof Error ? `Não foi possível importar: ${error.message}` : "Não foi possível ler o arquivo XLSX.");
    } finally {
      setBusy(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function clearSpreadsheetImport() {
    if (!spreadsheetOrders.length || !window.confirm("Remover todas as OS deste arquivo de prioridade? A base do Procesa não será alterada.")) return;
    setBusy(true);
    try {
      if (cloudReady) await clearFileImportOrders();
      setSpreadsheetOrders([]);
      setSelected(new Set());
      setSuggested(new Set());
      setAssignments({});
      setToast("Importação removida. A base do Procesa foi mantida.");
    } catch (error) {
      setToast(error instanceof Error ? `Não foi possível limpar: ${error.message}` : "Não foi possível limpar a importação.");
    } finally {
      setBusy(false);
    }
  }

  async function locateSpreadsheetOrders() {
    const pending = scopedOrders.filter((order) => !Number.isFinite(order.latitude) || !Number.isFinite(order.longitude));
    if (!pending.length) { setToast("Os chamados desta região já estão localizados no mapa."); return; }
    setBusy(true);
    const storageKey = "rotaos-address-geocodes-v1";
    let cache: Record<string, { latitude: number; longitude: number }> = {};
    try { cache = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"); } catch { /* cache opcional */ }
    const found: Array<{ id: string; latitude: number; longitude: number }> = [];
    try {
      for (let index = 0; index < pending.length; index += 1) {
        const order = pending[index];
        const key = normalize(`${order.address}|${order.neighborhood}|juiz de fora|mg`);
        setGeocodeProgress(`Localizando ${index + 1} de ${pending.length} endereços…`);
        let location = cache[key];
        if (!location) {
          const search = `${order.address}, ${order.neighborhood}, Juiz de Fora, MG, Brasil`;
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(search)}`);
          if (response.ok) {
            const results = await response.json() as Array<{ lat: string; lon: string }>;
            if (results[0]) {
              location = { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
              if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) cache[key] = location;
            }
          }
          if (index < pending.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 1100));
        }
        if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) found.push({ id: order.id, ...location });
      }
      window.localStorage.setItem(storageKey, JSON.stringify(cache));
      if (found.length) {
        const byId = new Map(found.map((location) => [location.id, location]));
        setSpreadsheetOrders((current) => current.map((order) => byId.has(order.id) ? { ...order, ...byId.get(order.id) } : order));
        if (cloudReady) await saveFileImportGeocodes(found);
      }
      setToast(`${found.length} de ${pending.length} endereços foram localizados. Clique nos pontos para conferir a OS.`);
    } catch (error) {
      setToast(error instanceof Error ? `A localização parou: ${error.message}` : "Não foi possível localizar os endereços agora.");
    } finally { setBusy(false); setGeocodeProgress(""); }
  }

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
      const compatible = activeTeams.filter((team) => group.every((order) => teamCanHandle(team, order.service)) && load[team.id] + group.length <= team.capacity).sort((a, b) => load[a.id] - load[b.id]);
      if (compatible[0]) { group.forEach((order) => { next[order.id] = compatible[0].id; }); load[compatible[0].id] += group.length; return; }
      group.forEach((order) => { const team = activeTeams.filter((item) => teamCanHandle(item, order.service) && load[item.id] < item.capacity).sort((a, b) => load[a.id] - load[b.id])[0]; if (team) { next[order.id] = team.id; load[team.id] += 1; } });
    });
    if (!Object.keys(next).length) { setToast("Nenhuma equipe ativa e compatível tinha capacidade para essas OS."); return; }
    setAssignments((current) => ({ ...current, ...next }));
    setRouteCalculated(true);
    setToast(`${label} distribuída entre as equipes para revisão. Nada foi enviado ao Procesa.`);
  }

  function createSuggestion() {
    const totalCapacity = activeTeams.reduce((sum, team) => sum + team.capacity, 0);
    const eligible = scopedOrders.filter((order) => !["archived", "not_seen"].includes(order.syncState) && activeTeams.some((team) => teamCanHandle(team, order.service)));
    const ranked = [...eligible].sort((a, b) => scores[b.id].score - scores[a.id].score || parseRequestedAt(b.requestedAt) - parseRequestedAt(a.requestedAt)).slice(0, totalCapacity);
    const ids = new Set(ranked.map((order) => order.id));
    if (!ids.size) { setSuggested(new Set()); setSuggestionFilter("Todos"); setToast("Não foi possível sugerir OS: confira equipes ativas, serviços atendidos e capacidades."); return; }
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
      setPlanningOrders(refreshed);
      try {
        const imported = await loadFileImportOrders();
        setSpreadsheetOrders(imported.map(spreadsheetToOrder).filter((order): order is WorkOrder => Boolean(order)));
      } catch { /* a migração da importação ainda pode não ter sido aplicada */ }
      setModal(null); setToast("Base online conectada.");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  async function persistTeams() {
    setTeams(draftTeams); window.localStorage.setItem("rotaos-team-settings-v3", JSON.stringify(draftTeams));
    setModal(null); setRouteCalculated(false);
    if (cloudReady && userEmail) {
      try { await saveTeamsToCloud(draftTeams); setToast("Equipes e capacidades salvas na base online."); }
      catch { setToast("Equipes salvas apenas neste navegador."); }
      return;
    }
    setToast("Equipes e capacidades atualizadas neste navegador.");
  }

  function persistRules() {
    setRules(draftRules); window.localStorage.setItem("rotaos-suggestion-rules-v2", JSON.stringify(draftRules));
    setSuggested(new Set()); setSuggestionFilter("Todos"); setModal(null); setToast("Critérios atualizados. Gere uma nova sugestão.");
  }

  function addCustomCriterion() {
    setDraftRules((current) => ({
      ...current,
      customCriteria: [...current.customCriteria, { id: `criterion-${Date.now()}`, field: "neighborhood", value: "", points: 20 }],
    }));
  }

  return <main className={sidebarCollapsed ? "app-shell sidebar-is-collapsed" : "app-shell"}>
    <aside className="sidebar">
      <button className="brand" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"} title={sidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}><span className="brand-mark">R</span><span>RotaOS</span></button>
      <nav className="module-switcher" aria-label="Módulos">
        <button className={activeModule === "planning" ? "current-module active" : "current-module"} onClick={() => setActiveModule("planning")}><span>01</span><div><strong>Planejamento</strong><small>base e rotas</small></div></button>
        <button className={activeModule === "spreadsheet" ? "current-module active" : "current-module"} onClick={() => setActiveModule("spreadsheet")}><span>02</span><div><strong>Importação</strong><small>arquivo de prioridade</small></div></button>
      </nav>
      <div className="sidebar-note environment-note"><span>VERSÃO ÚNICA</span><strong>RotaOS oficial</strong><p>Atualizações são publicadas no endereço oficial do GitHub Pages.</p></div>
      <div className={`cloud-status ${userEmail ? "connected" : ""}`}><i /><div><strong>{userEmail ? "Banco conectado" : cloudReady ? "Banco pronto" : "Banco ainda não conectado"}</strong><small>{userEmail ?? (cloudReady ? "Clique em Entrar no topo" : "Modo demonstrativo local")}</small></div></div>
      <div className="sidebar-actions">{cloudReady && <button className="secondary" onClick={() => userEmail ? void signOut().then(() => setUserEmail(null)) : setModal("login")}>{userEmail ? "Sair" : "Entrar"}</button>}{activeModule === "planning" ? <button className="secondary" onClick={() => setModal("import")}>Sincronizar Procesa</button> : <button className="secondary" onClick={() => importFileRef.current?.click()}>Importar XLSX</button>}</div>
      <span className={`sidebar-collapsed-status ${userEmail ? "connected" : ""}`} title={userEmail ? `Banco conectado: ${userEmail}` : "Banco não conectado"} />
    </aside>

    <section className={`workspace prototype-workspace ${gridFocus ? "grid-focus" : ""}`}>
      <header className="topbar prototype-topbar"><div><p className="eyebrow">{activeModule === "planning" ? "PLANEJAMENTO DE ROTAS" : "IMPORTAÇÃO DE PRIORIDADES"}</p><h1>{activeModule === "planning" ? "Chamados da Camilla" : "Arquivo de prioridades"}</h1></div></header>

      {activeModule === "spreadsheet" && <section className="spreadsheet-import-panel">
        <input ref={importFileRef} className="visually-hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleSpreadsheetFile(file); }} />
        <div><span>ARQUIVO CESAMA</span><strong>{spreadsheetOrders[0]?.sourceFile ?? "Nenhum arquivo importado"}</strong><p>Leitura de ocorrência, data, endereço, bairro, região, complemento, tipo e observação. A região organiza a visualização e as sugestões.</p></div>
        <div className="spreadsheet-import-actions"><button className="primary" disabled={busy} onClick={() => importFileRef.current?.click()}>Importar arquivo XLSX</button><button className="secondary" disabled={busy || !spreadsheetOrders.length} onClick={() => void clearSpreadsheetImport()}>Limpar importação</button></div>
      </section>}

      <div className="architecture-banner"><strong>{activeModule === "planning" ? "Fluxo definitivo" : "Importação independente"}</strong><span>{activeModule === "planning" ? "Extensão → banco protegido → grid. O grid consultará sempre a base completa, não somente a última coleta." : "XLSX da CESAMA → base de prioridades → grid. A importação não altera a coleta do Procesa."}</span><em>{cloudReady && userEmail ? "Base online carregada" : cloudReady ? "Clique em Entrar, no topo da página" : "Conexão online pendente"}</em></div>

      <section className="prototype-metrics">
        <article><span className="prototype-metric-icon purple">▦</span><div><p>{activeModule === "planning" ? "Base disponível" : "Base importada"}</p><strong>{orders.length}</strong><small>{activeModule === "planning" ? "somente serviços atendidos" : "prioridades do arquivo"}</small></div></article>
        <article><span className="prototype-metric-icon orange">✦</span><div><p>Sugeridas</p><strong>{suggested.size}</strong><small>independente da seleção</small></div></article>
        <article><span className="prototype-metric-icon red">!</span><div><p>{activeModule === "planning" ? "Reclamações" : "Região pendente"}</p><strong>{activeModule === "planning" ? orders.reduce((sum, order) => sum + order.complaintCount, 0) : orders.filter((order) => order.region === "Região a confirmar").length}</strong><small>{activeModule === "planning" ? "ocorrências registradas" : "não informada no arquivo"}</small></div></article>
        <article><span className="prototype-metric-icon green">✓</span><div><p>Selecionadas</p><strong>{selected.size}</strong><small>escolha manual da Camilla</small></div></article>
      </section>

      <div className={routeCalculated ? "prototype-notice calculated" : "prototype-notice"}><span>{routeCalculated ? "✓" : "○"}</span><div><strong>{selected.size} chamados escolhidos manualmente</strong><p>A sugestão do RotaOS não marca nem desmarca estes chamados.</p></div><button className="overview-toggle" onClick={() => setGridFocus((current) => !current)}>{gridFocus ? "Mostrar visão completa" : "Focar base de chamados"}</button><button onClick={() => distribute(selected, "Seleção manual")}>Calcular rotas da seleção →</button></div>

      <section className="prototype-content-grid">
        <article className="prototype-card prototype-map-card"><div className="prototype-section-heading"><div><h2>{suggested.size ? "Rotas dos chamados sugeridos" : "Visão geral das rotas"}</h2><p>{mapOrders.length} OS em análise{regionFilter !== "Todas" ? ` · ${regionFilter}` : ""}</p></div><span className="prototype-map-state">MAPA JUIZ DE FORA</span></div><div ref={mapContainerRef} className="prototype-map live-map" aria-label="Mapa de Juiz de Fora" /><div className="map-warning"><strong>{geocodeProgress || (activeModule === "spreadsheet" ? "Localize os endereços para validar a rota" : "Selecione ou sugira OS para analisar no mapa")}</strong><span>{activeModule === "spreadsheet" ? "A localização usa o endereço informado pela CESAMA e fica salva para as próximas consultas." : "O mapa exibe os pontos das OS selecionadas ou sugeridas."}</span>{activeModule === "spreadsheet" && <button className="map-locate-button" disabled={busy || !mapOrders.length} onClick={() => void locateSpreadsheetOrders()}>{busy ? "Localizando…" : "Localizar endereços"}</button>}</div></article>
        <aside className="prototype-card prototype-team-panel"><div className="prototype-section-heading"><div><h2>Equipes</h2><p>Serviços e capacidade diária</p></div><button className="prototype-icon-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }}>⚙</button></div><div className="prototype-team-list">{activeTeams.map((team, index) => <button key={team.id} className={teamFilter === team.id ? "prototype-team-row active" : "prototype-team-row"} onClick={() => setTeamFilter(teamFilter === team.id ? "Todas" : team.id)}><span className="prototype-team-number" style={{ background: team.color }}>{index + 1}</span><div><strong>{team.name}</strong><span>{team.services.join(" + ")}</span></div><small>{teamCounts[team.id] ?? 0}/{team.capacity}</small><b>›</b></button>)}</div><div className="prototype-team-actions"><button className="prototype-outline-full" onClick={() => setTeamFilter("Todas")}>Todas as equipes</button><button className="prototype-settings-button" onClick={() => { setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] }))); setModal("teams"); }}>⚙</button></div></aside>
      </section>

      {activeModule === "spreadsheet" && <section className="region-route-panel" aria-label="Rotas por região">
        <div className="region-route-heading"><div><span>ORGANIZAÇÃO DA IMPORTAÇÃO</span><h2>Rotas por região</h2><p>Escolha uma região para ver a base, o mapa e as sugestões daquela rota.</p></div><button className={regionFilter === "Todas" ? "active" : ""} onClick={() => { setRegionFilter("Todas"); setPage(1); }}>Todas ({orders.length})</button></div>
        <div className="region-route-list">{regionGroups.map((group) => <button key={group.region} className={regionFilter === group.region ? "active" : ""} onClick={() => { setRegionFilter(group.region); setPage(1); }}><strong>{group.region}</strong><span>{group.total} OS · {group.neighborhoods} bairros</span><small>{group.suggested ? `${group.suggested} sugeridas` : group.selected ? `${group.selected} selecionadas` : "Ver rota"}</small></button>)}</div>
      </section>}

      <div className="grid-actions"><button className="icon-action grid-rules-action" onClick={() => { setDraftRules(rules); setModal("rules"); }} aria-label="Configurar critérios" title="Configurar critérios">⚙</button><button className="primary smart-button" onClick={createSuggestion}>✦ Sugerir melhores chamados</button><button className="secondary" onClick={() => distribute(selected, "Seleção manual")}>Calcular rotas da seleção →</button></div>
      {orders.some((order) => order.processaTeam) && <div className="processa-team-alert"><strong>Atenção para validação com a Camilla</strong><span>{orders.filter((order) => order.processaTeam).length} OS já exibem uma equipe no Procesa. Isso pode indicar uma distribuição anterior ainda não finalizada; o RotaOS não as atribui automaticamente.</span></div>}
      <section className="prototype-card prototype-orders-card">
        <div className="prototype-section-heading grid-heading"><div><h2>Base de chamados</h2><p>Ordene pelas setas do cabeçalho; a seleção permanece entre páginas e filtros.</p></div><div className="page-size"><span>Itens por página</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>25</option><option>50</option><option>100</option></select></div></div>
        <div className="database-filters">
          <input aria-label="Buscar" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar OS, bairro ou endereço" />
          <label><span>De</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
          <label><span>Até</span><input type="date" value={dateTo} min={dateFrom} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
          <select aria-label="Serviço" value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value as "Todos" | Service); setPage(1); }}><option>Todos</option><option>Passeio</option><option>Muro</option><option>Caixa Padrão</option><option>Meio-fio</option><option>Calçamento</option></select>
          <details ref={updateFilterRef} className="state-multifilter"><summary>{!stateFilter.length ? "Todas as atualizações" : stateFilter.map((state) => <span key={state}>{stateLabel(state)}</span>)}</summary><div>{(["new", "updated", "complaint", "reviewed", "not_seen"] as SyncState[]).map((state) => <button key={state} type="button" className={stateFilter.includes(state) ? "selected" : ""} onClick={() => { setStateFilter((current) => current.includes(state) ? current.filter((item) => item !== state) : [...current, state]); setPage(1); }}>{stateLabel(state)}</button>)}</div></details>
          <select aria-label="Sugestão" value={suggestionFilter} onChange={(event) => { setSuggestionFilter(event.target.value as "Todos" | "Sugeridas"); setPage(1); }}><option value="Todos">Toda a base</option><option value="Sugeridas">Somente sugeridas</option></select>
          <button className="prototype-clear-button" onClick={() => { setQuery(""); setDateFrom(""); setDateTo(""); setServiceFilter("Todos"); setStateFilter([]); setSuggestionFilter("Todos"); setTeamFilter("Todas"); setRegionFilter("Todas"); setPage(1); }}>Limpar filtros</button>
        </div>
        <div className="prototype-selection-bar"><strong>{selected.size} selecionadas</strong><span>{filteredSorted.length} resultados na base.</span><button onClick={togglePage}>{allPageSelected ? "Desmarcar página" : "Selecionar página"}</button></div>
        <div className="prototype-table-wrap"><table className="smart-grid"><thead><tr><th className="selection-header"><input aria-label="Selecionar página" type="checkbox" checked={allPageSelected} onChange={togglePage} /><button onClick={() => changeSort("selected")} title="Ordenar selecionadas primeiro">{sortKey === "selected" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</button></th><th><SortHeader label="ATUALIZAÇÃO" sortKey="state" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th>ORDEM DE SERVIÇO</th><th><SortHeader label="DATA" sortKey="date" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="LOCAL" sortKey="location" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="SERVIÇO" sortKey="service" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="RECLAMAÇÕES" sortKey="complaints" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th>DETALHES</th><th><SortHeader label="SUGESTÃO ROTAOS" sortKey="suggestion" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th><th><SortHeader label="EQUIPE" sortKey="team" currentKey={sortKey} direction={sortDirection} onSort={changeSort} /></th></tr></thead><tbody>{!pageOrders.length && <tr className="empty-grid-row"><td colSpan={10}>{userEmail ? "A base online está vazia. Sincronize os chamados pelo Procesa para começar." : "Entre no RotaOS para carregar a base online."}</td></tr>}{pageOrders.map((order) => { const team = teams.find((item) => item.id === assignments[order.id]); const isSuggested = suggested.has(order.id); const serviceClass = order.service === "Caixa Padrão" ? "caixa" : order.service === "Meio-fio" || order.service === "Calçamento" ? "recomposition" : order.service.toLowerCase(); return <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; })} /></td><td><span className={`sync-badge ${order.syncState}`}>{stateLabel(order.syncState)}</span></td><td><strong>{order.id}</strong></td><td><strong>{order.requestedAt}</strong></td><td><strong>{order.address}</strong><span>{order.neighborhood} · {order.region}</span></td><td><span className={`prototype-service-tag ${serviceClass}`}>{order.serviceCode} · {order.service}</span></td><td><span className={order.complaintCount ? "complaint-count active" : "complaint-count"}>{order.complaintCount}</span>{order.latestComplaintAt && <small>última: {order.latestComplaintAt}</small>}</td><td><span>{order.detail}</span></td><td>{isSuggested ? <div className="suggestion-cell"><span>#{suggestionRank[order.id]} Sugerida</span><button onClick={() => { setExplainedOrderId(order.id); setModal("suggestion"); }}>Ver motivo</button></div> : <span className="not-suggested">—</span>}</td><td><span className="prototype-team-dot" style={{ background: team?.color ?? "#9a9eaa" }} />{team?.name ?? "A definir"}</td></tr>; })}</tbody></table></div>
        <div className="grid-pagination"><span>Mostrando {filteredSorted.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredSorted.length)} de {filteredSorted.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Anterior</button><strong>Página {currentPage} de {totalPages}</strong><button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima →</button></div></div>
      </section>
    </section>

    {modal === "import" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">SINCRONIZAÇÃO</p><h2>A base será alimentada pelo Procesa</h2><p>A extensão coleta os registros, o banco compara e guarda o histórico, e o grid consulta sempre a base completa.</p><div className="import-steps"><div><span>1</span><div><strong>Extensão coleta</strong><small>Somente S025, S199 X, S200 X, S201 X e S202 X.</small></div></div><div><span>2</span><div><strong>Banco compara</strong><small>Insere novas, atualiza alteradas e preserva o histórico.</small></div></div><div><span>3</span><div><strong>Grid consulta</strong><small>Filtros, ordenação e paginação usam a base online.</small></div></div></div><div className="modal-warning">{!cloudReady ? "A conexão online ainda não foi configurada neste ambiente." : !userEmail ? "Clique em Entrar no topo da página e use o e-mail e a senha cadastrados no RotaOS antes de sincronizar." : "Banco conectado: os chamados importados serão comparados e salvos na sua base."}</div><a className="primary button-link full" href="downloads/rotaos-ponte-procesa.zip" download>Baixar extensão atualizada</a></section></div>}

    {modal === "teams" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal team-settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">EQUIPES E CAPACIDADE</p><h2>Quem pode executar cada serviço?</h2><div className="team-settings-list">{draftTeams.map((team) => <article key={team.id}><div className="team-settings-main"><input type="color" value={team.color} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, color: event.target.value } : item))} /><label><span>Nome da equipe</span><input value={team.name} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, name: event.target.value } : item))} /></label><label className="capacity-field"><span>Máximo de OS</span><input type="number" min="1" max="50" value={team.capacity} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, capacity: Math.max(1, Number(event.target.value)) } : item))} /></label><label className="team-active"><input type="checkbox" checked={team.active} onChange={(event) => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, active: event.target.checked } : item))} /><span>Ativa</span></label></div><div className="team-service-settings"><span>Tipos de trabalho</span>{(["Passeio", "Muro", "Caixa Padrão", "Meio-fio", "Calçamento"] as Service[]).map((service) => <label key={service}><input type="checkbox" checked={team.services.includes(service)} onChange={() => setDraftTeams((current) => current.map((item) => item.id === team.id ? { ...item, services: item.services.includes(service) ? item.services.filter((value) => value !== service) : [...item.services, service] } : item))} /><span>{service}</span></label>)}</div></article>)}</div><button className="add-team-button" onClick={() => setDraftTeams((current) => [...current, { id: `team-${Date.now()}`, name: `Equipe ${current.length + 1}`, color: "#35a56f", active: true, services: ["Passeio"], capacity: 5 }])}>＋ Adicionar equipe</button><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistTeams}>Salvar equipes</button></div></section></div>}

    {modal === "rules" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal rules-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">CRITÉRIOS DA SUGESTÃO</p><h2>O que torna um chamado interessante?</h2><p>A sugestão analisa toda a base filtrada e não altera a seleção manual.</p><div className="rules-list"><label><input type="checkbox" checked={draftRules.recent} onChange={(event) => setDraftRules((current) => ({ ...current, recent: event.target.checked }))} /><div><strong>Chamados mais recentes</strong><span>Quanto mais recente a solicitação, maior a pontuação.</span></div></label><label><input type="checkbox" checked={draftRules.complaints} onChange={(event) => setDraftRules((current) => ({ ...current, complaints: event.target.checked }))} /><div><strong>Quantidade de reclamações recentes</strong><span>Cada reclamação aumenta a prioridade, limitada para evitar distorções.</span></div></label></div><div className="custom-criteria"><div className="custom-criteria-heading"><div><strong>Prioridades adicionais</strong><span>Adicione bairros, regiões ou serviços que mereçam pontos extras.</span></div><button type="button" onClick={addCustomCriterion}>＋ Adicionar critério</button></div>{draftRules.customCriteria.map((criterion) => <div className="custom-criterion" key={criterion.id}><select aria-label="Campo do critério" value={criterion.field} onChange={(event) => setDraftRules((current) => ({ ...current, customCriteria: current.customCriteria.map((item) => item.id === criterion.id ? { ...item, field: event.target.value as CustomCriterion["field"] } : item) }))}><option value="neighborhood">Bairro</option><option value="region">Região</option><option value="service">Serviço</option></select><input aria-label="Valor do critério" placeholder={criterion.field === "neighborhood" ? "Ex.: Linhares" : criterion.field === "region" ? "Ex.: Regional Leste" : "Ex.: S201"} value={criterion.value} onChange={(event) => setDraftRules((current) => ({ ...current, customCriteria: current.customCriteria.map((item) => item.id === criterion.id ? { ...item, value: event.target.value } : item) }))} /><label><span>Pontos</span><input aria-label="Pontos do critério" type="number" min="0" max="100" value={criterion.points} onChange={(event) => setDraftRules((current) => ({ ...current, customCriteria: current.customCriteria.map((item) => item.id === criterion.id ? { ...item, points: Math.max(0, Math.min(100, Number(event.target.value))) } : item) }))} /></label><button type="button" className="remove-criterion" aria-label="Remover critério" onClick={() => setDraftRules((current) => ({ ...current, customCriteria: current.customCriteria.filter((item) => item.id !== criterion.id) }))}>×</button></div>)}</div><div className="criteria-note"><strong>Depois da escolha</strong><span>Compatibilidade da equipe, capacidade e mesmo endereço ajudam a formar as rotas, mas não decidem quais chamados são melhores.</span></div><div className="modal-actions"><button className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={persistRules}>Salvar critérios</button></div></section></div>}

    {modal === "suggestion" && explainedOrder && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal suggestion-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="modal-kicker">SUGESTÃO #{suggestionRank[explainedOrder.id]}</p><h2>{explainedOrder.id}</h2><p>{explainedOrder.address} · {explainedOrder.neighborhood}</p><div className="suggestion-explanation">{suggestionReasons[explainedOrder.id]?.map((reason) => <span key={reason}>✓ {reason}</span>)}</div><div className="score-line"><span>Pontuação da sugestão</span><strong>{scores[explainedOrder.id]?.score ?? 0}</strong></div><p className="explanation-footnote">Essa pontuação apenas organiza as sugestões. A decisão final continua sendo da Camilla.</p></section></div>}

    {modal === "login" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><form className="modal login-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleLogin}><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button><p className="modal-kicker">BASE ONLINE</p><h2>Entrar no RotaOS</h2><p>Use o e-mail e a senha cadastrados no banco RotaOS. A senha do Procesa nunca é usada aqui.</p><label><span>E-mail</span><input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label><span>Senha do RotaOS</span><input type="password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>{loginError && <div className="modal-warning">{loginError}</div>}<button className="primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button></form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
