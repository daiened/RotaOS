"use client";

import { useEffect, useMemo, useState } from "react";

type RouteService = "Passeio" | "Muro";
type Source = "example" | "extension";
type Modal = "import" | "review" | null;
type View = "planning" | "prototype";

type RouteOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  requestedAt: string;
  service: RouteService;
  detail: string;
  stop: number;
  warning?: string;
};

const exampleOrders: RouteOrder[] = [
  { internalId: "3031504", id: "36545/2026/5", address: "R. Luiz Basílio Castor, 250", neighborhood: "Santa Luzia", region: "Sul", requestedAt: "14/08/2026 14:30", service: "Passeio", detail: "Passeio cimentado", stop: 1 },
  { internalId: "3031386", id: "36568/2026/1", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", region: "Sul", requestedAt: "14/08/2026 10:31", service: "Muro", detail: "Parede simples · mesmo imóvel", stop: 2 },
  { internalId: "3031387", id: "36568/2026/2", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", region: "Sul", requestedAt: "14/08/2026 10:31", service: "Passeio", detail: "Passeio simples · mesmo imóvel", stop: 2 },
  { internalId: "3030734", id: "36130/2026/1", address: "R. Jandira Limp Pinheiro, 239", neighborhood: "Jardim Bela Aurora", region: "Sul", requestedAt: "11/08/2026 16:48", service: "Passeio", detail: "Acesso difícil · final de escadão", stop: 3, warning: "Confirmar acesso e transporte de material" },
  { internalId: "3030629", id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28", service: "Muro", detail: "Recompor parede · mesmo imóvel", stop: 4 },
  { internalId: "3030630", id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", requestedAt: "11/08/2026 13:28", service: "Passeio", detail: "Recompor passeio · mesmo imóvel", stop: 4 },
  { internalId: "3030141", id: "35830/2026/1", address: "Av. Darcy Vargas, 602", neighborhood: "Ipiranga", region: "Sul", requestedAt: "09/08/2026 12:52", service: "Muro", detail: "Recompor parede", stop: 5, warning: "Confirmar foto e acabamento" },
  { internalId: "3029110", id: "35310/2026/1", address: "R. Ercy Furtado de Souza, 87", neighborhood: "São Domingos", region: "Sul", requestedAt: "05/08/2026 09:17", service: "Muro", detail: "Parede simples", stop: 6 },
  { internalId: "3030550", id: "32325/2026/1", address: "R. Benício de Souza Rocha, 161", neighborhood: "Graminha", region: "Sul", requestedAt: "11/08/2026 10:24", service: "Passeio", detail: "Passeio cimentado · refazer degrau", stop: 7, warning: "Confirmar complexidade do degrau" },
  { internalId: "3028162", id: "34194/2026/6", address: "R. Jerônimo Rocha, 360", neighborhood: "Jardim América", region: "Sul", requestedAt: "01/08/2026 13:18", service: "Passeio", detail: "Acabamento não informado", stop: 8, warning: "Revisar foto antes do envio" },
];

type PrototypeService = "Passeio" | "Muro" | "Vistoria";

type PrototypeOrder = {
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  service: PrototypeService;
  detail: string;
  priority: 1 | 2;
  teamId: string;
};

type TeamConfig = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: PrototypeService[];
  contact: string;
};

const prototypeOrders: PrototypeOrder[] = [
  { id: "24936/2026/3", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", service: "Muro", detail: "Hidrantes azuis", priority: 2, teamId: "team-1" },
  { id: "24936/2026/4", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", service: "Passeio", detail: "Acabamento cimentado · junto à OS anterior", priority: 2, teamId: "team-1" },
  { id: "36171/2026/2", address: "R. Bartolomeu dos Santos, 2", neighborhood: "São Damião", region: "Norte", service: "Passeio", detail: "Repor meio-fio", priority: 2, teamId: "team-1" },
  { id: "36760/2026/2", address: "R. Bartolomeu dos Santos, 24", neighborhood: "São Damião", region: "Norte", service: "Passeio", detail: "Mesmo trecho da OS anterior", priority: 2, teamId: "team-1" },
  { id: "36057/2026/2", address: "R. Guimarães Rosa, 102", neighborhood: "Cidade do Sol", region: "Norte", service: "Muro", detail: "Assentar piso · ligar antes · área interna", priority: 2, teamId: "team-2" },
  { id: "34355/2026/2", address: "Estr. da Remonta, 45", neighborhood: "Barbosa Lage", region: "Norte", service: "Passeio", detail: "Acabamento não informado", priority: 2, teamId: "team-2" },
  { id: "36237/2026/1", address: "Estr. da Remonta, 204", neighborhood: "Jóquei Clube III", region: "Norte", service: "Passeio", detail: "Mesmo corredor da OS anterior", priority: 2, teamId: "team-2" },
  { id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", service: "Muro", detail: "Recompor parede", priority: 2, teamId: "team-3" },
  { id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", service: "Passeio", detail: "Executar junto à OS anterior", priority: 2, teamId: "team-3" },
  { id: "32325/2026/1", address: "R. Benício de Souza Rocha, 161", neighborhood: "Graminha", region: "Sul", service: "Passeio", detail: "Cimentado · refazer degrau", priority: 2, teamId: "team-3" },
  { id: "32771/2026/2", address: "R. Francisco Foini, 141", neighborhood: "Centenário", region: "Leste", service: "Muro", detail: "Endereço corrigido · cimentado", priority: 2, teamId: "team-3" },
  { id: "19191/2026/4", address: "R. Pinto de Moura, 180", neighborhood: "Poço Rico", region: "Sul", service: "Vistoria", detail: "Pedra portuguesa · retirar medidas", priority: 1, teamId: "team-3" },
  { id: "28585/2026/4", address: "Av. Francisco Valadares, 2745", neighborhood: "Poço Rico", region: "Sul", service: "Vistoria", detail: "Passeio cimentado · retirar medidas", priority: 1, teamId: "team-3" },
  { id: "32892/2026/1", address: "R. Princesa Isabel, 121", neighborhood: "Centro", region: "Sul", service: "Vistoria", detail: "Verificar necessidade e medidas", priority: 1, teamId: "team-3" },
  { id: "31374/2026/5", address: "R. Baependi, 358", neighborhood: "Vitorino Braga", region: "Leste", service: "Vistoria", detail: "Cimentado · em frente ao portão", priority: 1, teamId: "team-3" },
];

const initialPrototypeTeams: TeamConfig[] = [
  { id: "team-1", name: "Construpav 01", color: "#7457d9", active: true, services: ["Passeio", "Muro"], contact: "" },
  { id: "team-2", name: "Construpav 02", color: "#ee8d48", active: true, services: ["Passeio", "Muro"], contact: "" },
  { id: "team-3", name: "Construpav 03", color: "#2f99ac", active: true, services: ["Passeio", "Muro", "Vistoria"], contact: "" },
];

function normalizeAddress(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function downloadFile(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function warningFor(detail: string) {
  const text = detail.toUpperCase();
  if (text.includes("ESCAD")) return "Confirmar acesso e transporte de material";
  if (text.includes("PEDRA") || text.includes("REVEST")) return "Confirmar material e equipe compatível";
  if (text.includes("DEGRAU")) return "Confirmar complexidade do degrau";
  if (text.includes("NÃO IDENTIFICADO") || text.includes("NÃO INFORMADO")) return "Abrir a OS antes de distribuir";
  return undefined;
}

export default function Home() {
  const [view, setView] = useState<View>("prototype");
  const [orders, setOrders] = useState<RouteOrder[]>(exampleOrders);
  const [selected, setSelected] = useState(() => new Set(exampleOrders.map((order) => order.id)));
  const [source, setSource] = useState<Source>("example");
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"Todos" | RouteService>("Todos");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [routeOrganized, setRouteOrganized] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    function receiveExtensionImport(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "ROTAOS_IMPORT_FROM_PROCESA") return;
      const incoming = Array.isArray(event.data.payload?.orders) ? event.data.payload.orders : [];
      if (!incoming.length) return;

      const stopByAddress = new Map<string, number>();
      const mapped: RouteOrder[] = incoming.map((order: Record<string, unknown>, index: number) => {
        const address = String(order.address ?? "Endereço não informado");
        const addressKey = normalizeAddress(address);
        if (!stopByAddress.has(addressKey)) stopByAddress.set(addressKey, stopByAddress.size + 1);
        const rawService = String(order.service ?? order.requestedService ?? "Passeio").toUpperCase();
        const service: RouteService = rawService.includes("MURO") ? "Muro" : "Passeio";
        const detail = String(order.detail ?? "Detalhe ainda não identificado");
        return {
          internalId: String(order.internalId ?? index),
          id: String(order.id ?? order.occurrence ?? `OS-${index + 1}`),
          address,
          neighborhood: String(order.neighborhood ?? "Bairro não informado"),
          region: String(order.region ?? "Região não informada"),
          requestedAt: String(order.requestedAt ?? "Data não informada"),
          service,
          detail,
          stop: stopByAddress.get(addressKey) ?? index + 1,
          warning: warningFor(detail),
        };
      });

      setOrders(mapped);
      setSelected(new Set(mapped.map((order) => order.id)));
      setSource("extension");
      setRouteOrganized(false);
      setModal(null);
      setToast(`${mapped.length} OS recebidas. Agora escolha quais entram na rota.`);
      window.postMessage({ type: "ROTAOS_IMPORT_ACCEPTED" }, window.location.origin);
    }

    window.addEventListener("message", receiveExtensionImport);
    return () => window.removeEventListener("message", receiveExtensionImport);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !term || `${order.id} ${order.address} ${order.neighborhood} ${order.detail}`.toLowerCase().includes(term);
      const matchesService = serviceFilter === "Todos" || order.service === serviceFilter;
      const matchesAttention = !attentionOnly || Boolean(order.warning);
      return matchesText && matchesService && matchesAttention;
    });
  }, [attentionOnly, orders, query, serviceFilter]);

  const selectedOrders = orders.filter((order) => selected.has(order.id));
  const selectedStops = new Set(selectedOrders.map((order) => order.stop)).size;
  const attentionCount = selectedOrders.filter((order) => order.warning).length;
  const sharedStops = Array.from(new Set(selectedOrders.map((order) => order.stop)))
    .filter((stop) => selectedOrders.filter((order) => order.stop === stop).length > 1).length;

  function toggleOrder(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRouteOrganized(false);
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filteredOrders.forEach((order) => next.add(order.id));
      return next;
    });
    setRouteOrganized(false);
  }

  function clearVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filteredOrders.forEach((order) => next.delete(order.id));
      return next;
    });
    setRouteOrganized(false);
  }

  function organizeRoute() {
    if (!selectedOrders.length) {
      setToast("Selecione ao menos uma OS para organizar a rota.");
      return;
    }

    const grouped = new Map<string, RouteOrder[]>();
    selectedOrders.forEach((order) => {
      const key = normalizeAddress(order.address);
      grouped.set(key, [...(grouped.get(key) ?? []), order]);
    });
    const groups = Array.from(grouped.values()).sort((a, b) =>
      a[0].neighborhood.localeCompare(b[0].neighborhood, "pt-BR"),
    );
    const organized = groups.flatMap((group, index) =>
      group
        .sort((a, b) => a.service.localeCompare(b.service, "pt-BR"))
        .map((order) => ({ ...order, stop: index + 1 })),
    );
    const unselected = orders.filter((order) => !selected.has(order.id));
    setOrders([...organized, ...unselected]);
    setRouteOrganized(true);
    setToast(`Rota organizada em ${groups.length} paradas. Confira a ordem antes de usar.`);
  }

  function resetExample() {
    setOrders(exampleOrders);
    setSelected(new Set(exampleOrders.map((order) => order.id)));
    setSource("example");
    setRouteOrganized(true);
    setModal(null);
    setToast("Exemplo restaurado.");
  }

  function downloadSummary() {
    const lines = selectedOrders.map((order, index) =>
      `${index + 1}. ${order.id} | ${order.neighborhood} | ${order.address} | ${order.service} | ${order.detail}`,
    );
    downloadFile(
      "RotaOS_resumo_da_rota.txt",
      `ROTAOS - RESUMO DA ROTA\r\n${selectedStops} paradas | ${selectedOrders.length} OS\r\n\r\n${lines.join("\r\n")}`,
    );
    setToast("Resumo baixado para conferência.");
  }

  function openWhatsApp() {
    const text = [
      `Rota - ${selectedStops} paradas / ${selectedOrders.length} OS`,
      ...selectedOrders.map((order, index) => `${index + 1}. ${order.id} · ${order.neighborhood} · ${order.detail}`),
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>RotaOS</span></div>
        <nav className="module-switcher" aria-label="Versões do planejamento">
          <button className={view === "planning" ? "current-module active" : "current-module"} onClick={() => { setView("planning"); setModal(null); }}>
            <span>01</span><div><strong>Planejamento</strong><small>Versão simples</small></div>
          </button>
          <button className={view === "prototype" ? "current-module active" : "current-module"} onClick={() => { setView("prototype"); setModal(null); }}>
            <span>02</span><div><strong>Protótipo</strong><small>Mapa e equipes</small></div>
          </button>
        </nav>
        <div className="sidebar-note"><span>FOCO ATUAL</span><strong>Rotas por equipe</strong><p>O Protótipo 02 agora é a tela principal. A versão simples continua disponível para comparação.</p></div>
      </aside>

      {view === "planning" ? <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">PLANEJAMENTO DE ROTAS</p><h1>Monte a próxima rota</h1><p className="subtitle">Importe as OS, escolha as melhores combinações e revise antes de distribuir.</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => setModal("import")}>Importar do Procesa</button><button className="primary" onClick={() => setModal("review")} disabled={!selectedOrders.length}>Revisar rota</button></div>
        </header>

        <section className="task-flow" aria-label="Etapas do planejamento">
          <div className="done"><span>1</span><div><strong>Importar OS</strong><small>{source === "extension" ? `${orders.length} recebidas do Procesa` : "usando uma rota de exemplo"}</small></div></div>
          <i>→</i>
          <div className="active"><span>2</span><div><strong>Escolher a rota</strong><small>{selectedOrders.length} OS selecionadas</small></div></div>
          <i>→</i>
          <div className={routeOrganized ? "done" : ""}><span>3</span><div><strong>Revisar</strong><small>{routeOrganized ? "pronta para conferência" : "organize antes de revisar"}</small></div></div>
        </section>

        <section className="summary-row">
          <Summary label="OS escolhidas" value={String(selectedOrders.length)} note={`${orders.length} disponíveis`} tone="purple" />
          <Summary label="Paradas" value={String(selectedStops)} note="endereços diferentes" tone="blue" />
          <Summary label="Mesmo local" value={String(sharedStops)} note="pontos com mais de uma OS" tone="green" />
          <Summary label="Pedem atenção" value={String(attentionCount)} note="revise antes de distribuir" tone="orange" />
        </section>

        <section className="route-layout">
          <article className="route-card card">
            <div className="section-heading"><div><p className="section-kicker">ROTA ATUAL</p><h2>{selectedStops} paradas · {selectedOrders.length} OS</h2></div><button className="primary compact" onClick={organizeRoute}>Organizar rota</button></div>
            <div className="route-line">
              {Array.from(new Set(selectedOrders.map((order) => order.stop))).sort((a, b) => a - b).map((stop) => {
                const stopOrders = selectedOrders.filter((order) => order.stop === stop);
                if (!stopOrders.length) return null;
                return <div className="route-stop" key={stop}><span>{stop}</span><div><strong>{stopOrders[0].neighborhood}</strong><small>{stopOrders.length} OS · {stopOrders.map((order) => order.service).join(" + ")}</small></div>{stopOrders.length > 1 && <b>MESMO ENDEREÇO</b>}</div>;
              })}
            </div>
          </article>

          <aside className="route-help card">
            <p className="section-kicker">COMO FUNCIONA AGORA</p>
            <h2>Agrupamento inicial</h2>
            <ul><li><span>✓</span>Junta OS no mesmo endereço</li><li><span>✓</span>Agrupa por bairro</li><li><span>✓</span>Destaca serviços especiais</li><li className="pending"><span>→</span>Mapa e distância entram depois</li></ul>
            <p>Use o conhecimento da cidade para confirmar a sequência.</p>
          </aside>
        </section>

        <section className="orders-card card">
          <div className="orders-header">
            <div><p className="section-kicker">ORDENS DE SERVIÇO</p><h2>Escolha o que entra na rota</h2></div>
            <div className="filter-actions"><button onClick={selectVisible}>Selecionar visíveis</button><button onClick={clearVisible}>Limpar visíveis</button></div>
          </div>
          <div className="filters">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, bairro, endereço ou detalhe" /></label>
            <label><span>Serviço</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as "Todos" | RouteService)}><option>Todos</option><option>Passeio</option><option>Muro</option></select></label>
            <label className="attention-filter"><input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} /><span>Somente com atenção</span></label>
          </div>
          <div className="table-wrap"><table><thead><tr><th></th><th>ORDEM DE SERVIÇO</th><th>LOCAL</th><th>SERVIÇO E DETALHE</th><th>DATA</th></tr></thead><tbody>
            {filteredOrders.map((order) => <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => toggleOrder(order.id)} /></td><td><strong>{order.id}</strong><span>{order.region}</span></td><td><strong>{order.neighborhood}</strong><span>{order.address}</span></td><td><div className={order.warning ? "detail warning" : "detail"}>{order.service} · {order.detail}</div>{order.warning && <small className="warning-text">⚠ {order.warning}</small>}</td><td><strong>{order.requestedAt.split(" ")[0]}</strong><span>{order.requestedAt.split(" ").slice(1).join(" ")}</span></td></tr>)}
            {!filteredOrders.length && <tr><td colSpan={5}><div className="empty-state">Nenhuma OS encontrada com estes filtros.</div></td></tr>}
          </tbody></table></div>
        </section>

        <footer><span>Etapa atual: Planejamento</span><p>Produção, custos e ganhos ficam para o próximo bloco, depois da validação das rotas.</p></footer>
      </section> : <PrototypeView importedOrders={source === "extension" ? orders : null} onImport={() => setModal("import")} />}

      {modal === "import" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">TRAZER OS DO PROCESA</p><h2>Importar é simples</h2><p>A extensão apenas copia as OS. Nada é alterado no sistema da CESAMA.</p><div className="import-steps"><div><span>1</span><p><strong>Instale a extensão</strong><small>Faça isso somente na primeira vez.</small></p></div><div><span>2</span><p><strong>Abra Solicitadas no Procesa</strong><small>Selecione algumas OS ou mostre até 100.</small></p></div><div><span>3</span><p><strong>Clique em Enviar ao RotaOS</strong><small>Esta página abrirá já preenchida.</small></p></div></div><a className="primary full button-link" href="downloads/rotaos-ponte-procesa.zip" download>Baixar extensão</a><button className="text-button" onClick={resetExample}>Voltar para a rota de exemplo</button></section></div>}

      {view === "planning" && modal === "review" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal review-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">CONFERÊNCIA FINAL</p><h2>{selectedStops} paradas · {selectedOrders.length} OS</h2><p>Confira a sequência e os alertas. O RotaOS não distribui nada no Procesa.</p>{!routeOrganized && <div className="modal-warning">A seleção mudou. Clique em “Organizar rota” antes de usar esta sequência.</div>}<div className="review-list">{selectedOrders.map((order) => <div key={order.id}><span>{order.stop}</span><div><strong>{order.id} · {order.neighborhood}</strong><small>{order.service} · {order.detail}</small>{order.warning && <em>{order.warning}</em>}</div></div>)}</div><div className="modal-actions"><button className="secondary" onClick={downloadSummary}>Baixar resumo</button><button className="primary" onClick={openWhatsApp}>Preparar WhatsApp</button></div></section></div>}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Summary({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article><span className={`summary-mark ${tone}`} /><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

function PrototypeView({ importedOrders, onImport }: { importedOrders: RouteOrder[] | null; onImport: () => void }) {
  const sourceOrders = useMemo<PrototypeOrder[]>(() => importedOrders?.map((order, index) => ({
    id: order.id,
    address: order.address,
    neighborhood: order.neighborhood,
    region: order.region,
    service: order.service,
    detail: order.detail,
    priority: order.warning ? 1 : 2,
    teamId: initialPrototypeTeams[index % initialPrototypeTeams.length].id,
  })) ?? prototypeOrders, [importedOrders]);

  const [teams, setTeams] = useState<TeamConfig[]>(initialPrototypeTeams);
  const [draftTeams, setDraftTeams] = useState<TeamConfig[]>(initialPrototypeTeams);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [activeTeam, setActiveTeam] = useState("Todas");
  const [service, setService] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(prototypeOrders.map((order) => order.id)));
  const [assignments, setAssignments] = useState<Record<string, string>>(() => Object.fromEntries(prototypeOrders.map((order) => [order.id, order.teamId])));
  const [calculated, setCalculated] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Selecione as OS que devem entrar no cálculo.");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("rotaos-team-settings");
        if (!saved) return;
        const parsed = JSON.parse(saved) as TeamConfig[];
        if (Array.isArray(parsed) && parsed.length) {
          setTeams(parsed);
          setDraftTeams(parsed);
        }
      } catch {
        window.localStorage.removeItem("rotaos-team-settings");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelected(new Set(sourceOrders.map((order) => order.id)));
      setAssignments(Object.fromEntries(sourceOrders.map((order) => [order.id, order.teamId])));
      setActiveTeam("Todas");
      setCalculated(false);
      setStatusMessage(importedOrders ? `${sourceOrders.length} OS importadas. Revise a seleção antes de calcular.` : "Selecione as OS que devem entrar no cálculo.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [importedOrders, sourceOrders]);

  const activeTeams = teams.filter((team) => team.active);
  const selectedOrders = sourceOrders.filter((order) => selected.has(order.id));
  const selectedStops = new Set(selectedOrders.map((order) => normalizeAddress(order.address))).size;
  const criticalCount = selectedOrders.filter((order) => order.priority === 1).length;
  const teamCounts = Object.fromEntries(teams.map((team) => [team.id, selectedOrders.filter((order) => (assignments[order.id] ?? order.teamId) === team.id).length]));

  const filtered = useMemo(() => sourceOrders.filter((order) => {
    const assignedTeam = assignments[order.id] ?? order.teamId;
    const teamMatch = activeTeam === "Todas" || assignedTeam === activeTeam;
    const serviceMatch = service === "Todos" || order.service === service;
    const haystack = `${order.id} ${order.address} ${order.neighborhood} ${order.detail}`.toLowerCase();
    return teamMatch && serviceMatch && haystack.includes(query.toLowerCase());
  }), [activeTeam, assignments, query, service, sourceOrders]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((order) => selected.has(order.id));
  const pinPositions = [[15, 22], [24, 33], [31, 20], [55, 18], [67, 28], [61, 40], [30, 62], [42, 72], [49, 58], [66, 65], [74, 55], [82, 72], [58, 78], [20, 48], [78, 35]];

  function toggleOrder(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCalculated(false);
    setStatusMessage("A seleção mudou. Clique em Calcular rotas quando terminar.");
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((order) => allVisibleSelected ? next.delete(order.id) : next.add(order.id));
      return next;
    });
    setCalculated(false);
    setStatusMessage("A seleção mudou. Clique em Calcular rotas quando terminar.");
  }

  function calculateRoutes() {
    if (!selectedOrders.length) {
      setStatusMessage("Selecione ao menos uma OS para calcular as rotas.");
      return;
    }
    if (!activeTeams.length) {
      setStatusMessage("Ative ao menos uma equipe na configuração.");
      return;
    }

    const nextAssignments = { ...assignments };
    selectedOrders.forEach((order) => { nextAssignments[order.id] = ""; });
    const load = Object.fromEntries(activeTeams.map((team) => [team.id, 0])) as Record<string, number>;
    const groups = new Map<string, PrototypeOrder[]>();
    selectedOrders.forEach((order) => {
      const key = normalizeAddress(order.address);
      groups.set(key, [...(groups.get(key) ?? []), order]);
    });

    Array.from(groups.values())
      .sort((a, b) => a[0].neighborhood.localeCompare(b[0].neighborhood, "pt-BR"))
      .forEach((group) => {
        const compatible = activeTeams.filter((team) => group.every((order) => team.services.includes(order.service)));
        const chosen = [...compatible].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
        if (chosen) {
          group.forEach((order) => { nextAssignments[order.id] = chosen.id; });
          load[chosen.id] = (load[chosen.id] ?? 0) + group.length;
          return;
        }
        group.forEach((order) => {
          const individual = activeTeams
            .filter((team) => team.services.includes(order.service))
            .sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
          if (!individual) return;
          nextAssignments[order.id] = individual.id;
          load[individual.id] = (load[individual.id] ?? 0) + 1;
        });
      });

    const distributed = selectedOrders.filter((order) => nextAssignments[order.id]).length;
    setAssignments(nextAssignments);
    setActiveTeam("Todas");
    setCalculated(true);
    const pending = selectedOrders.length - distributed;
    setStatusMessage(pending
      ? `${distributed} OS distribuídas e ${pending} sem equipe compatível. Revise a configuração.`
      : `${distributed} OS distribuídas entre ${activeTeams.length} equipes. Confira antes de enviar.`);
  }

  function openSettings() {
    setDraftTeams(teams.map((team) => ({ ...team, services: [...team.services] })));
    setSettingsError("");
    setSettingsOpen(true);
  }

  function updateDraft(id: string, update: Partial<TeamConfig>) {
    setDraftTeams((current) => current.map((team) => team.id === id ? { ...team, ...update } : team));
  }

  function toggleDraftService(id: string, selectedService: PrototypeService) {
    setDraftTeams((current) => current.map((team) => {
      if (team.id !== id) return team;
      const services = team.services.includes(selectedService)
        ? team.services.filter((item) => item !== selectedService)
        : [...team.services, selectedService];
      return { ...team, services };
    }));
  }

  function addTeam() {
    const colors = ["#35a56f", "#d36b8c", "#477dc4", "#9b6e38"];
    setDraftTeams((current) => [...current, {
      id: `team-${Date.now()}`,
      name: `Equipe ${String(current.length + 1).padStart(2, "0")}`,
      color: colors[current.length % colors.length],
      active: true,
      services: ["Passeio"],
      contact: "",
    }]);
  }

  function saveTeams() {
    const cleaned = draftTeams.map((team) => ({ ...team, name: team.name.trim() }));
    if (cleaned.some((team) => !team.name)) {
      setSettingsError("Todas as equipes precisam ter um nome.");
      return;
    }
    if (!cleaned.some((team) => team.active)) {
      setSettingsError("Deixe ao menos uma equipe ativa.");
      return;
    }
    if (cleaned.some((team) => team.active && !team.services.length)) {
      setSettingsError("Toda equipe ativa precisa executar ao menos um tipo de serviço.");
      return;
    }
    setTeams(cleaned);
    window.localStorage.setItem("rotaos-team-settings", JSON.stringify(cleaned));
    setActiveTeam("Todas");
    setCalculated(false);
    setSettingsOpen(false);
    setStatusMessage("Equipes atualizadas. Calcule novamente para aplicar as novas regras.");
  }

  return <>
    <section className="workspace prototype-workspace">
      <header className="topbar prototype-topbar">
        <div><p className="eyebrow">02 · PLANEJAMENTO POR EQUIPE</p><h1>Rotas de hoje</h1><p className="subtitle">Selecione as OS e distribua somente o que deve entrar nas rotas.</p></div>
        <div className="header-actions"><button className="secondary" onClick={onImport}>Importar do Procesa</button><button className="primary" onClick={calculateRoutes} disabled={!selectedOrders.length}>Calcular rotas</button></div>
      </header>

      <div className="prototype-disclaimer"><strong>Mapa em validação</strong><span>A divisão por tipo de serviço já considera as equipes configuradas. Quilômetros, tempos e posições no mapa ainda são ilustrativos.</span></div>

      <div className={calculated ? "prototype-notice calculated" : "prototype-notice"}><span>✦</span><div><strong>{calculated ? "Divisão inicial calculada" : `${selectedOrders.length} OS selecionadas`}</strong><p>{statusMessage}</p></div><button onClick={calculateRoutes}>{calculated ? "Calcular novamente" : "Calcular agora"} →</button></div>

      <section className="prototype-metrics">
        <article><span className="prototype-metric-icon purple">✓</span><div><p>OS selecionadas</p><strong>{selectedOrders.length}</strong><small>de {sourceOrders.length} disponíveis</small></div></article>
        <article><span className="prototype-metric-icon orange">♙</span><div><p>Equipes ativas</p><strong>{activeTeams.length}</strong><small>configuráveis</small></div></article>
        <article><span className="prototype-metric-icon green">⌖</span><div><p>Paradas</p><strong>{selectedStops}</strong><small>endereços selecionados</small></div></article>
        <article><span className="prototype-metric-icon blue">◷</span><div><p>Prazo crítico</p><strong>{criticalCount} OS</strong><small>dentro da seleção</small></div></article>
      </section>

      <section className="prototype-content-grid">
        <article className="prototype-card prototype-map-card">
          <div className="prototype-section-heading"><div><h2>Visão geral das rotas</h2><p>As cores mostram a equipe sugerida para cada OS selecionada</p></div><span className="prototype-map-state">{calculated ? "CALCULADO" : "AGUARDANDO CÁLCULO"}</span></div>
          <div className="prototype-map" aria-label="Mapa ilustrativo das equipes">
            <div className="prototype-river" />
            <span className="prototype-road road-1" /><span className="prototype-road road-2" /><span className="prototype-road road-3" /><span className="prototype-road road-4" /><span className="prototype-road road-5" />
            <span className="prototype-district d1">SANTA CRUZ</span><span className="prototype-district d2">BENFICA</span><span className="prototype-district d3">CENTRO</span><span className="prototype-district d4">TEIXEIRAS</span><span className="prototype-district d5">VITORINO BRAGA</span>
            {selectedOrders.slice(0, pinPositions.length).map((order, index) => {
              const team = teams.find((item) => item.id === (assignments[order.id] ?? order.teamId));
              const [left, top] = pinPositions[index];
              return <span key={order.id} className="prototype-pin" style={{ left: `${left}%`, top: `${top}%`, background: team?.color ?? "#9a9eaa" }}><i>{(teamCounts[team?.id ?? ""] ?? 0) ? index + 1 : "·"}</i></span>;
            })}
            <div className="prototype-map-legend">{activeTeams.map((team) => <span key={team.id}><i style={{ background: team.color }} />{team.name}</span>)}</div>
            <div className="prototype-map-controls"><button aria-label="Aumentar mapa">＋</button><button aria-label="Diminuir mapa">−</button><button aria-label="Centralizar mapa">◎</button></div>
          </div>
        </article>

        <aside className="prototype-card prototype-team-panel">
          <div className="prototype-section-heading"><div><h2>Equipes</h2><p>Rotas sugeridas para a seleção</p></div><button className="prototype-icon-button" onClick={openSettings} aria-label="Configurar equipes">⚙</button></div>
          <div className="prototype-team-list">
            {activeTeams.map((team, index) => <button key={team.id} className={activeTeam === team.id ? "prototype-team-row active" : "prototype-team-row"} onClick={() => setActiveTeam(activeTeam === team.id ? "Todas" : team.id)}>
              <span className="prototype-team-number" style={{ background: team.color }}>{index + 1}</span><div><strong>{team.name}</strong><span>{teamCounts[team.id] ?? 0} OS · {team.services.join(" + ")}</span></div><small>{calculated ? "Sugerida" : "Aguardando"}</small><b>›</b>
            </button>)}
          </div>
          <div className="prototype-team-actions"><button className="prototype-outline-full" onClick={() => setActiveTeam("Todas")}>{activeTeam === "Todas" ? "Todas as equipes" : "Mostrar todas"}</button><button className="prototype-settings-button" onClick={openSettings} aria-label="Configurar equipes">⚙</button></div>
        </aside>
      </section>

      <section className="prototype-card prototype-orders-card">
        <div className="prototype-section-heading prototype-orders-head"><div><h2>Escolha as ordens da rota</h2><p>Somente as OS marcadas participam do cálculo</p></div><div className="prototype-filters"><input aria-label="Buscar OS" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS ou endereço" /><select aria-label="Filtrar serviço" value={service} onChange={(event) => setService(event.target.value)}><option>Todos</option><option>Passeio</option><option>Muro</option><option>Vistoria</option></select><button className="prototype-clear-button" onClick={() => { setSelected(new Set()); setCalculated(false); }}>Limpar seleção</button></div></div>
        <div className="prototype-selection-bar"><strong>{selectedOrders.length} selecionadas</strong><span>Você pode filtrar sem perder o que já marcou.</span></div>
        <div className="prototype-table-wrap"><table><thead><tr><th><input aria-label="Selecionar todas as OS visíveis" type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} /></th><th>OS</th><th>LOCAL</th><th>SERVIÇO REAL</th><th>DETALHES IMPORTANTES</th><th>PRAZO</th><th>EQUIPE SUGERIDA</th></tr></thead><tbody>
          {filtered.map((order) => {
            const team = teams.find((item) => item.id === (assignments[order.id] ?? order.teamId));
            return <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => toggleOrder(order.id)} /></td><td><strong>{order.id}</strong></td><td><strong>{order.address}</strong><span>{order.neighborhood} · {order.region}</span></td><td><span className={`prototype-service-tag ${order.service.toLowerCase()}`}>{order.service}</span></td><td><span className={order.detail.includes("ligar") || order.detail.includes("corrigido") ? "prototype-alert-detail" : ""}>{order.detail}</span></td><td><span className={order.priority === 1 ? "prototype-deadline critical" : "prototype-deadline"}>{order.priority} dia{order.priority > 1 ? "s" : ""}</span></td><td><span className="prototype-team-dot" style={{ background: team?.color ?? "#9a9eaa" }} />{team?.name ?? "A definir"}</td></tr>;
          })}
        </tbody></table></div>
      </section>
    </section>

    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="modal team-settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Fechar">×</button><p className="modal-kicker">CONFIGURAÇÃO DAS EQUIPES</p><h2>Quem pode executar cada serviço?</h2><p>Estas regras serão usadas para fazer a distribuição inicial das OS. A configuração fica salva neste navegador.</p><div className="team-settings-list">{draftTeams.map((team) => <article key={team.id}><div className="team-settings-main"><input aria-label={`Cor de ${team.name}`} type="color" value={team.color} onChange={(event) => updateDraft(team.id, { color: event.target.value })} /><label><span>Nome da equipe</span><input value={team.name} onChange={(event) => updateDraft(team.id, { name: event.target.value })} /></label><label className="team-active"><input type="checkbox" checked={team.active} onChange={(event) => updateDraft(team.id, { active: event.target.checked })} /><span>Ativa</span></label></div><div className="team-service-settings"><span>Tipos de trabalho</span>{(["Passeio", "Muro", "Vistoria"] as PrototypeService[]).map((item) => <label key={item}><input type="checkbox" checked={team.services.includes(item)} onChange={() => toggleDraftService(team.id, item)} /><span>{item}</span></label>)}</div><label className="team-contact"><span>WhatsApp ou identificação do grupo (opcional)</span><input value={team.contact} onChange={(event) => updateDraft(team.id, { contact: event.target.value })} placeholder="Ex.: (32) 99999-9999" /></label></article>)}</div><button className="add-team-button" onClick={addTeam}>＋ Adicionar equipe</button>{settingsError && <div className="modal-warning">{settingsError}</div>}<div className="modal-actions"><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancelar</button><button className="primary" onClick={saveTeams}>Salvar equipes</button></div></section></div>}
  </>;
}
