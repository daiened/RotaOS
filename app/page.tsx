"use client";

import { useEffect, useMemo, useState } from "react";

type RouteService = "Passeio" | "Muro";
type Source = "example" | "extension";
type Modal = "import" | "review" | null;

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
        <div className="current-module"><span>01</span><div><strong>Planejamento</strong><small>Etapa em validação</small></div></div>
        <div className="sidebar-note"><span>FOCO DE AGORA</span><strong>Rotas simples e claras</strong><p>Os outros módulos entram somente depois que esta parte estiver funcionando bem.</p></div>
      </aside>

      <section className="workspace">
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
      </section>

      {modal === "import" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal import-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">TRAZER OS DO PROCESA</p><h2>Importar é simples</h2><p>A extensão apenas copia as OS. Nada é alterado no sistema da CESAMA.</p><div className="import-steps"><div><span>1</span><p><strong>Instale a extensão</strong><small>Faça isso somente na primeira vez.</small></p></div><div><span>2</span><p><strong>Abra Solicitadas no Procesa</strong><small>Selecione algumas OS ou mostre até 100.</small></p></div><div><span>3</span><p><strong>Clique em Enviar ao RotaOS</strong><small>Esta página abrirá já preenchida.</small></p></div></div><a className="primary full button-link" href="downloads/rotaos-ponte-procesa.zip" download>Baixar extensão</a><button className="text-button" onClick={resetExample}>Voltar para a rota de exemplo</button></section></div>}

      {modal === "review" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><section className="modal review-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button><p className="modal-kicker">CONFERÊNCIA FINAL</p><h2>{selectedStops} paradas · {selectedOrders.length} OS</h2><p>Confira a sequência e os alertas. O RotaOS não distribui nada no Procesa.</p>{!routeOrganized && <div className="modal-warning">A seleção mudou. Clique em “Organizar rota” antes de usar esta sequência.</div>}<div className="review-list">{selectedOrders.map((order) => <div key={order.id}><span>{order.stop}</span><div><strong>{order.id} · {order.neighborhood}</strong><small>{order.service} · {order.detail}</small>{order.warning && <em>{order.warning}</em>}</div></div>)}</div><div className="modal-actions"><button className="secondary" onClick={downloadSummary}>Baixar resumo</button><button className="primary" onClick={openWhatsApp}>Preparar WhatsApp</button></div></section></div>}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Summary({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article><span className={`summary-mark ${tone}`} /><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}
