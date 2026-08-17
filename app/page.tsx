"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type View = "planejamento" | "producao" | "integracoes";
type RouteService = "Passeio" | "Muro";
type PriceKey =
  | "PASSEIO_MENOR"
  | "PASSEIO_MAIOR"
  | "MURO_MENOR"
  | "MURO_MAIOR"
  | "PEDRA_POLIEDRICA"
  | "OS_IMPRODUTIVA";

type RouteOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  requestedAt: string;
  service: RouteService;
  detail: string;
  stop: number;
  warning?: string;
  estimate: number;
};

type ProductionRow = {
  id: string;
  date: string;
  team: string;
  neighborhood: string;
  requestedService: string;
  executedTotal: number | null;
  observation: string;
  priceKey: PriceKey;
  reviewed: boolean;
};

const productionSheetUrl =
  "https://docs.google.com/spreadsheets/d/175cznswMw_DuDtwJZMF_BXrT9EkrgvV56NoVYILxn3o/edit";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const prices: Record<PriceKey, { label: string; unit: string; value: number; extra: number }> = {
  PASSEIO_MENOR: { label: "Passeio menor 1 m²", unit: "UN", value: 111.25, extra: 2.1971 },
  PASSEIO_MAIOR: { label: "Passeio maior 1 m²", unit: "M²", value: 87.99, extra: 2.1971 },
  MURO_MENOR: { label: "Muro menor 1 m²", unit: "UN", value: 94.62, extra: 1.2371 },
  MURO_MAIOR: { label: "Muro maior 1 m²", unit: "M²", value: 74.84, extra: 1.2371 },
  PEDRA_POLIEDRICA: { label: "Piso pedra poliédrica", unit: "M²", value: 114.45, extra: 4.8071 },
  OS_IMPRODUTIVA: { label: "OS improdutiva", unit: "UN", value: 44.31, extra: 0 },
};

const routeOrders: RouteOrder[] = [
  { internalId: "3031504", id: "36545/2026/5", address: "R. Luiz Basílio Castor, 250", neighborhood: "Santa Luzia", requestedAt: "14/08/2026 14:30", service: "Passeio", detail: "Passeio cimentado", stop: 1, estimate: 113.4471 },
  { internalId: "3031386", id: "36568/2026/1", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", requestedAt: "14/08/2026 10:31", service: "Muro", detail: "Parede simples · mesmo imóvel", stop: 2, estimate: 95.8571 },
  { internalId: "3031387", id: "36568/2026/2", address: "R. Eduardo Viviani, 417", neighborhood: "Boa Vista", requestedAt: "14/08/2026 10:31", service: "Passeio", detail: "Passeio simples · mesmo imóvel", stop: 2, estimate: 113.4471 },
  { internalId: "3030734", id: "36130/2026/1", address: "R. Jandira Limp Pinheiro, 239", neighborhood: "Jardim Bela Aurora", requestedAt: "11/08/2026 16:48", service: "Passeio", detail: "Acesso difícil · final de escadão", stop: 3, warning: "Confirmar acesso e transporte de material", estimate: 113.4471 },
  { internalId: "3030629", id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", requestedAt: "11/08/2026 13:28", service: "Muro", detail: "Recompor parede · mesmo imóvel", stop: 4, estimate: 95.8571 },
  { internalId: "3030630", id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", requestedAt: "11/08/2026 13:28", service: "Passeio", detail: "Recompor passeio · mesmo imóvel", stop: 4, estimate: 113.4471 },
  { internalId: "3030141", id: "35830/2026/1", address: "Av. Darcy Vargas, 602", neighborhood: "Ipiranga", requestedAt: "09/08/2026 12:52", service: "Muro", detail: "Recompor parede", stop: 5, warning: "Confirmar foto e acabamento", estimate: 95.8571 },
  { internalId: "3029110", id: "35310/2026/1", address: "R. Ercy Furtado de Souza, 87", neighborhood: "São Domingos", requestedAt: "05/08/2026 09:17", service: "Muro", detail: "Parede simples", stop: 6, estimate: 95.8571 },
  { internalId: "3030550", id: "32325/2026/1", address: "R. Benício de Souza Rocha, 161", neighborhood: "Graminha", requestedAt: "11/08/2026 10:24", service: "Passeio", detail: "Passeio cimentado · refazer degrau", stop: 7, warning: "Confirmar complexidade do degrau", estimate: 113.4471 },
  { internalId: "3028162", id: "34194/2026/6", address: "R. Jerônimo Rocha, 360", neighborhood: "Jardim América", requestedAt: "01/08/2026 13:18", service: "Passeio", detail: "Acabamento não informado", stop: 8, warning: "Revisar foto antes do envio", estimate: 113.4471 },
];

const productionSeed: ProductionRow[] = [
  ["35031/2026/3", "14/08/2026", "CONSTRUPAV 02", "Vl. dos Bandeirantes", "PASSEIO", null, "Passeio cimentado no local certo"],
  ["36428/2026/1", "14/08/2026", "CONSTRUPAV 02", "Pq. Guarany", "PASSEIO", 0.85, ""],
  ["36420/2026/1", "14/08/2026", "CONSTRUPAV 03", "Monte Castelo", "MURO", 0.24, "Pegar o piso com o cliente"],
  ["36453/2026/1", "14/08/2026", "CONSTRUPAV 01", "São Geraldo", "MURO", null, "Recompor parede"],
  ["36231/2026/1", "14/08/2026", "CONSTRUPAV 01", "Santa Luzia", "PASSEIO", 1.053, "Recompor passeio"],
  ["36256/2026/2", "14/08/2026", "CONSTRUPAV 01", "São Geraldo", "PASSEIO", null, "Passeio e escada cimentada"],
  ["36336/2026/1", "14/08/2026", "CONSTRUPAV 02", "Progresso", "MURO", null, ""],
  ["36094/2026/1", "14/08/2026", "CONSTRUPAV 01", "Santa Luzia", "MURO", 0.21, "Recompor parede"],
  ["36318/2026/1", "14/08/2026", "CONSTRUPAV 02", "Nossa Sra. das Graças", "MURO", 0.16, "Massa comum"],
  ["35253/2026/3", "14/08/2026", "CONSTRUPAV 03", "Jóquei Clube", "PASSEIO", 6.75, ""],
  ["35945/2026/3", "14/08/2026", "CONSTRUPAV 02", "Pq. Independência II", "PASSEIO", 0.35, ""],
  ["35973/2026/1", "14/08/2026", "CONSTRUPAV 02", "Lot. Nova Suíça", "PASSEIO", 2.16, ""],
  ["35957/2026/1", "14/08/2026", "CONSTRUPAV 01", "Santa Luzia", "MURO", 0.328, "Recompor parede"],
  ["35815/2026/3", "14/08/2026", "CONSTRUPAV 01", "Santa Luzia", "PASSEIO", 0.5776, ""],
  ["34837/2026/4", "14/08/2026", "CONSTRUPAV 03", "Jardim São João", "MURO", null, ""],
  ["34837/2026/3", "14/08/2026", "CONSTRUPAV 03", "Jardim São João", "PASSEIO", 1, ""],
  ["33930/2026/3", "14/08/2026", "CONSTRUPAV 03", "Monte Castelo", "PASSEIO", null, ""],
  ["33191/2026/2", "14/08/2026", "CONSTRUPAV 01", "São Geraldo", "MURO", 0.1624, "Recompor parede"],
  ["32362/2026/2", "14/08/2026", "CONSTRUPAV 01", "Resid. Renascença", "PASSEIO", null, "Passeio cimentado"],
  ["32345/2026/1", "14/08/2026", "CONSTRUPAV 01", "Santa Luzia", "PASSEIO", 1.6, "Passeio cimentado"],
  ["30562/2026/1", "14/08/2026", "CONSTRUPAV 03", "V. São Geraldo", "PASSEIO", 0.88, "Pedra de calçamento"],
].map(([id, date, team, neighborhood, requestedService, executedTotal, observation]) => {
  const total = executedTotal as number | null;
  const service = String(requestedService);
  const note = String(observation);
  return {
    id: String(id),
    date: String(date),
    team: String(team),
    neighborhood: String(neighborhood),
    requestedService: service,
    executedTotal: total,
    observation: note,
    priceKey: suggestPrice(service, total, note),
    reviewed: total !== null && !note.toUpperCase().includes("PEDRA"),
  };
});

function suggestPrice(service: string, total: number | null, observation: string): PriceKey {
  const text = `${service} ${observation}`.toUpperCase();
  if (total === null || total <= 0) return "OS_IMPRODUTIVA";
  if (text.includes("PEDRA")) return "PEDRA_POLIEDRICA";
  if (text.includes("MURO")) return total <= 1 ? "MURO_MENOR" : "MURO_MAIOR";
  return total <= 1 ? "PASSEIO_MENOR" : "PASSEIO_MAIOR";
}

function productionValue(row: ProductionRow): number {
  const price = prices[row.priceKey];
  if (row.priceKey === "OS_IMPRODUTIVA") return price.value;
  if (price.unit === "UN") return price.value + price.extra;
  return (row.executedTotal ?? 0) * price.value + price.extra;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function downloadFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [view, setView] = useState<View>("planejamento");
  const [query, setQuery] = useState("");
  const [planningOrders, setPlanningOrders] = useState<RouteOrder[]>(routeOrders);
  const [planningSource, setPlanningSource] = useState<"validated" | "extension">("validated");
  const [selected, setSelected] = useState(() => new Set(routeOrders.map((order) => order.id)));
  const [productionRows, setProductionRows] = useState<ProductionRow[]>(productionSeed);
  const [modal, setModal] = useState<"review" | "connector" | null>(null);
  const [connectorUrl, setConnectorUrl] = useState("");
  const [toast, setToast] = useState("");
  const [importName, setImportName] = useState("Pavimento Equipe (14).xlsx");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const savedConnector = localStorage.getItem("rotaos-production-connector") ?? "";
    const timer = window.setTimeout(() => setConnectorUrl(savedConnector), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function receiveExtensionImport(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "ROTAOS_IMPORT_FROM_PROCESA") return;
      const incoming = Array.isArray(event.data.payload?.orders) ? event.data.payload.orders : [];
      if (!incoming.length) return;
      const stopByAddress = new Map<string, number>();
      const mapped: RouteOrder[] = incoming.map((order: Record<string, unknown>, index: number) => {
        const address = String(order.address ?? "Endereço não informado");
        const key = address.toUpperCase().replace(/\s+/g, " ").trim();
        if (!stopByAddress.has(key)) stopByAddress.set(key, stopByAddress.size + 1);
        const rawService = String(order.service ?? order.requestedService ?? "Passeio").toUpperCase();
        const service: RouteService = rawService.includes("MURO") ? "Muro" : "Passeio";
        const detail = String(order.detail ?? "Detalhe ainda não identificado");
        return {
          internalId: String(order.internalId ?? index),
          id: String(order.id ?? order.occurrence ?? `OS-${index + 1}`),
          address,
          neighborhood: String(order.neighborhood ?? "Bairro não informado"),
          requestedAt: String(order.requestedAt ?? "Data não informada"),
          service,
          detail,
          stop: stopByAddress.get(key) ?? index + 1,
          warning: detail.toUpperCase().includes("ESCAD") || detail.toUpperCase().includes("PEDRA") ? "Revisar detalhe antes de distribuir" : undefined,
          estimate: service === "Muro" ? 95.8571 : 113.4471,
        };
      });
      setPlanningOrders(mapped);
      setPlanningSource("extension");
      setSelected(new Set(mapped.map((order) => order.id)));
      setView("planejamento");
      setToast(`${mapped.length} OS recebidas do Procesa pela extensão.`);
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
    if (!term) return planningOrders;
    return planningOrders.filter((order) =>
      `${order.id} ${order.address} ${order.neighborhood} ${order.detail}`.toLowerCase().includes(term),
    );
  }, [planningOrders, query]);

  const selectedOrders = planningOrders.filter((order) => selected.has(order.id));
  const routeEstimate = selectedOrders.reduce((sum, order) => sum + order.estimate, 0);
  const uniqueStops = new Set(selectedOrders.map((order) => order.stop)).size;
  const measuredCount = productionRows.filter((row) => row.executedTotal !== null).length;
  const reviewCount = productionRows.filter((row) => !row.reviewed).length;
  const productionEstimate = productionRows.reduce((sum, row) => sum + productionValue(row), 0);

  function toggleOrder(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateClassification(id: string, priceKey: PriceKey) {
    setProductionRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, priceKey, reviewed: true } : row)),
    );
  }

  async function importProduction(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const imported = raw
        .filter((row) => String(row["Equipe"] ?? "").toUpperCase().startsWith("CONSTRUPAV"))
        .map((row) => {
          const requestedService = String(row["Serviço Solicitado"] ?? row["SERVIÇO"] ?? "");
          const executedTotal = normalizeNumber(row["Total"] ?? row["TOTAL"]);
          const observation = String(row["Observação"] ?? row["OBSERVAÇÃO"] ?? "");
          return {
            id: String(row["O.S"] ?? row["NUMERO OS"] ?? row["OS"] ?? ""),
            date: String(row["Data Finalização"] ?? row["DATA"] ?? ""),
            team: String(row["Equipe"] ?? row["EQUIPE"] ?? ""),
            neighborhood: String(row["Bairro"] ?? row["BAIRRO"] ?? ""),
            requestedService,
            executedTotal,
            observation,
            priceKey: suggestPrice(requestedService, executedTotal, observation),
            reviewed: executedTotal !== null && !observation.toUpperCase().includes("PEDRA"),
          } satisfies ProductionRow;
        })
        .filter((row) => row.id);
      if (!imported.length) throw new Error("Nenhuma OS das equipes Construpav foi encontrada.");
      setProductionRows(imported);
      setImportName(file.name);
      setToast(`${imported.length} OS importadas e organizadas para revisão.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Não foi possível ler o relatório.");
    } finally {
      event.target.value = "";
    }
  }

  function exportProductionCsv() {
    const header = ["NUMERO OS", "DATA", "SERVIÇO", "TOTAL EXECUTADO", "UN MEDIDA", "EQUIPE", "VALOR PRODUZIDO", "OBSERVAÇÃO", "REVISADO"];
    const lines = productionRows.map((row) => [
      row.id,
      row.date,
      prices[row.priceKey].label,
      row.executedTotal ?? "",
      prices[row.priceKey].unit,
      row.team,
      productionValue(row).toFixed(2).replace(".", ","),
      row.observation,
      row.reviewed ? "SIM" : "NÃO",
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\r\n");
    downloadFile("RotaOS_atualizacao_producao.csv", `\ufeff${csv}`, "text/csv;charset=utf-8");
    setToast("Atualização gerada. A planilha original não foi alterada.");
  }

  function downloadDispatchPackage() {
    const lines = selectedOrders.map((order, index) =>
      `${index + 1}. ${order.id} — ${order.neighborhood} — ${order.service} — ${order.detail}`,
    );
    downloadFile(
      "RotaOS_Construpav_02.txt",
      `ROTA CONSTRUPAV 02\r\n${uniqueStops} paradas · ${selectedOrders.length} OS\r\n\r\n${lines.join("\r\n")}`,
      "text/plain;charset=utf-8",
    );
    setModal(null);
    setToast("Pacote da rota gerado para conferência.");
  }

  function openWhatsApp() {
    const text = [
      `Rota Construpav 02 — ${uniqueStops} paradas / ${selectedOrders.length} OS`,
      ...selectedOrders.map((order, index) => `${index + 1}. ${order.id} · ${order.neighborhood} · ${order.detail}`),
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function saveConnector() {
    const value = connectorUrl.trim();
    if (!value.startsWith("https://script.google.com/")) {
      setToast("Informe o link do conector criado no Google Apps Script.");
      return;
    }
    localStorage.setItem("rotaos-production-connector", value);
    setModal(null);
    setToast("Cópia de teste conectada. A planilha original continua protegida.");
  }

  async function syncProduction() {
    if (!connectorUrl) {
      setModal("connector");
      return;
    }
    if (reviewCount > 0) {
      setToast(`Revise as ${reviewCount} OS pendentes antes de sincronizar.`);
      return;
    }
    setSyncing(true);
    try {
      const response = await fetch(connectorUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          source: "RotaOS",
          mode: "test-copy",
          importedFile: importName,
          rows: productionRows.map((row) => ({
            ...row,
            classification: prices[row.priceKey].label,
            value: Number(productionValue(row).toFixed(2)),
          })),
        }),
      });
      if (!response.ok) throw new Error("O conector não confirmou a atualização.");
      setToast("Cópia de teste atualizada com sucesso.");
    } catch {
      setToast("Não foi possível sincronizar. Você ainda pode baixar o CSV sem risco.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("planejamento")}>
          <span className="brand-mark">R</span><span>RotaOS</span>
        </button>
        <nav aria-label="Navegação principal">
          <NavButton active={view === "planejamento"} label="Planejamento" icon="01" onClick={() => setView("planejamento")} />
          <NavButton active={view === "producao"} label="Produção" icon="02" onClick={() => setView("producao")} />
          <NavButton active={view === "integracoes"} label="Integrações" icon="03" onClick={() => setView("integracoes")} />
        </nav>
        <div className="sidebar-summary">
          <span>AMBIENTE SEGURO</span>
          <strong>Originais protegidos</strong>
          <p>Alterações externas só acontecem depois de revisão e confirmação.</p>
        </div>
        <div className="user-card">
          <div className="avatar">CS</div>
          <div><strong>Camilla</strong><span>Planejamento operacional</span></div>
        </div>
      </aside>

      <section className="workspace">
        {view === "planejamento" && (
          <PlanningView
            orders={filteredOrders}
            query={query}
            setQuery={setQuery}
            selected={selected}
            toggleOrder={toggleOrder}
            selectedCount={selectedOrders.length}
            uniqueStops={uniqueStops}
            routeEstimate={routeEstimate}
            onReview={() => setModal("review")}
            onProduction={() => setView("producao")}
            allOrders={planningOrders}
            importedFromProcesa={planningSource === "extension"}
          />
        )}

        {view === "producao" && (
          <ProductionView
            rows={productionRows}
            importName={importName}
            measuredCount={measuredCount}
            reviewCount={reviewCount}
            estimate={productionEstimate}
            onImport={importProduction}
            onClassify={updateClassification}
            onExport={exportProductionCsv}
            onSync={syncProduction}
            syncing={syncing}
            connected={Boolean(connectorUrl)}
          />
        )}

        {view === "integracoes" && (
          <IntegrationsView
            connected={Boolean(connectorUrl)}
            onConnect={() => setModal("connector")}
            onWhatsApp={openWhatsApp}
          />
        )}
      </section>

      {modal === "review" && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <section className="modal review-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            <span className="modal-kicker">REVISÃO FINAL</span>
            <h2>Rota da Construpav 02</h2>
            <p>{selectedOrders.length} OS em {uniqueStops} paradas. Nenhuma alteração será feita no Procesa nesta etapa.</p>
            <div className="review-list">
              {selectedOrders.map((order) => (
                <div key={order.id}><span>{order.stop}</span><div><strong>{order.id} · {order.neighborhood}</strong><small>{order.detail}</small></div><b>{money.format(order.estimate)}</b></div>
              ))}
            </div>
            <div className="modal-summary"><span>Estimativa conservadora</span><strong>{money.format(routeEstimate)}</strong></div>
            <div className="modal-actions"><button className="secondary" onClick={openWhatsApp}>Preparar WhatsApp</button><button className="primary" onClick={downloadDispatchPackage}>Gerar pacote de envio</button></div>
          </section>
        </div>
      )}

      {modal === "connector" && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <section className="modal connector-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            <span className="modal-kicker">PLANILHA DE PRODUÇÃO</span>
            <h2>Conectar uma cópia de teste</h2>
            <p>O RotaOS só enviará dados para a cópia autorizada. A planilha original permanecerá sem alterações durante a validação.</p>
            <label>URL do conector Google Apps Script<input value={connectorUrl} onChange={(event) => setConnectorUrl(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></label>
            <a className="sheet-link" href={productionSheetUrl} target="_blank" rel="noreferrer">Abrir planilha original somente para consulta ↗</a>
            <button className="primary full" onClick={saveConnector}>Salvar conexão de teste</button>
            <small>Não cole login ou senha. O conector usa apenas a permissão da cópia escolhida.</small>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span>{label}</button>;
}

function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{description}</p></div><div className="header-actions">{children}</div></header>;
}

function PlanningView({ orders, allOrders, query, setQuery, selected, toggleOrder, selectedCount, uniqueStops, routeEstimate, onReview, onProduction, importedFromProcesa }: {
  orders: RouteOrder[]; allOrders: RouteOrder[]; query: string; setQuery: (value: string) => void; selected: Set<string>; toggleOrder: (id: string) => void; selectedCount: number; uniqueStops: number; routeEstimate: number; onReview: () => void; onProduction: () => void; importedFromProcesa: boolean;
}) {
  const sharedStops = Array.from(new Set(allOrders.filter((order) => selected.has(order.id)).map((order) => order.stop)))
    .filter((stop) => allOrders.filter((order) => selected.has(order.id) && order.stop === stop).length > 1).length;
  return <>
    <PageHeader eyebrow={importedFromProcesa ? "OS RECEBIDAS DO PROCESA" : "PLANEJAMENTO VALIDADO"} title={importedFromProcesa ? "Preparar nova rota" : "Rota da Construpav 02"} description={importedFromProcesa ? `${allOrders.length} OS importadas pela extensão · selecione e revise antes de distribuir` : "Distribuição real de 17 de agosto · região Sul · revisão antes do envio"}>
      <button className="secondary" onClick={onProduction}>Ver produção</button><button className="primary" onClick={onReview}>Revisar rota</button>
    </PageHeader>
    <section className="status-banner"><div className="status-symbol">{importedFromProcesa ? "↓" : "✓"}</div><div><strong>{importedFromProcesa ? "Importação concluída" : "Compatível com a Equipe 2"}</strong><p>{importedFromProcesa ? "Os dados foram apenas copiados. Confira detalhes, equipe e sequência antes de qualquer distribuição." : "Somente passeios e muros simples. Nenhuma caixa padrão ou serviço reservado a pedreiro."}</p></div><span>{importedFromProcesa ? "NADA ALTERADO NO PROCESA" : "VALIDADO COM A OPERAÇÃO REAL"}</span></section>
    <section className="metrics">
      <Metric label="OS selecionadas" value={String(selectedCount)} note={`${uniqueStops} paradas reais`} tone="purple" />
      <Metric label="Mesmo endereço" value={String(sharedStops)} note={sharedStops ? "pontos agrupados automaticamente" : "nenhum ponto repetido"} tone="blue" />
      <Metric label="Estimativa produtiva" value={money.format(routeEstimate)} note="faixa conservadora" tone="green" />
      <Metric label="Se improdutivas" value={money.format(selectedCount * 44.31)} note="sujeito à medição" tone="orange" />
    </section>
    <section className="planning-grid">
      <article className="route-card card">
        <div className="section-heading"><div><span className="section-kicker">SEQUÊNCIA SUGERIDA</span><h2>{uniqueStops} paradas · {selectedCount} OS</h2></div><span className="route-team">Equipe 02</span></div>
        <div className="route-line">
          {Array.from(new Set(allOrders.filter((order) => selected.has(order.id)).map((order) => order.stop))).sort((a, b) => a - b).map((stop) => {
            const rows = allOrders.filter((order) => selected.has(order.id) && order.stop === stop);
            if (!rows.length) return null;
            return <div className="route-stop" key={stop}><span>{stop}</span><div><strong>{rows[0].neighborhood}</strong><small>{rows.length} OS · {rows.map((row) => row.service).join(" + ")}</small></div>{rows.length > 1 && <b>MESMO PONTO</b>}</div>;
          })}
        </div>
      </article>
      <article className="decision-card card">
        <div className="section-heading"><div><span className="section-kicker">{importedFromProcesa ? "PRÓXIMA ETAPA" : "POR QUE ESSA ROTA?"}</span><h2>{importedFromProcesa ? "O que revisar" : "Critérios aplicados"}</h2></div></div>
        <ul className="criteria-list">
          {importedFromProcesa ? <>
            <li><span>1</span><div><strong>Detalhes do serviço</strong><p>Confirme acabamento, acesso e qualquer exigência especial.</p></div></li>
            <li><span>2</span><div><strong>Endereços repetidos</strong><p>OS no mesmo ponto já aparecem agrupadas na sequência.</p></div></li>
            <li><span>3</span><div><strong>Compatibilidade da equipe</strong><p>Escolha apenas serviços que a equipe consegue executar.</p></div></li>
            <li><span>4</span><div><strong>Proximidade real</strong><p>A otimização por mapa será aplicada depois da geocodificação dos endereços.</p></div></li>
          </> : <>
            <li><span>1</span><div><strong>Equipe compatível</strong><p>Sem caixa padrão ou acabamento complexo identificado.</p></div></li>
            <li><span>2</span><div><strong>OS recentes</strong><p>Abertas entre 1 e 14 de agosto, todas com prazo de até 2 dias.</p></div></li>
            <li><span>3</span><div><strong>Menos deslocamento</strong><p>Duas duplas de OS no mesmo imóvel.</p></div></li>
            <li><span>4</span><div><strong>Risco visível</strong><p>Escadão, degrau e acabamento incerto destacados para revisão.</p></div></li>
          </>}
        </ul>
      </article>
    </section>
    <section className="orders-card card">
      <div className="section-heading orders-heading"><div><span className="section-kicker">REVISÃO OPERACIONAL</span><h2>Ordens da rota</h2></div><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, bairro ou detalhe" /></div></div>
      <div className="table-wrap"><table><thead><tr><th></th><th>ORDEM DE SERVIÇO</th><th>LOCAL</th><th>DETALHE QUE MUDA A DECISÃO</th><th>PRAZO</th><th>VALOR BASE</th></tr></thead><tbody>
        {orders.map((order) => <tr key={order.id} className={!selected.has(order.id) ? "row-off" : ""}><td><input aria-label={`Selecionar ${order.id}`} type="checkbox" checked={selected.has(order.id)} onChange={() => toggleOrder(order.id)} /></td><td><strong>{order.id}</strong><span>{order.service}</span></td><td><strong>{order.neighborhood}</strong><span>{order.address}</span></td><td><div className={order.warning ? "detail warning" : "detail"}>{order.detail}</div>{order.warning && <small className="warning-text">⚠ {order.warning}</small>}</td><td><span className="deadline">≤ 2 dias</span><small>{order.requestedAt}</small></td><td><strong>{money.format(order.estimate)}</strong><span>estimado</span></td></tr>)}
      </tbody></table></div>
    </section>
  </>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article><span className={`metric-mark ${tone}`} /><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

function ProductionView({ rows, importName, measuredCount, reviewCount, estimate, onImport, onClassify, onExport, onSync, syncing, connected }: {
  rows: ProductionRow[]; importName: string; measuredCount: number; reviewCount: number; estimate: number; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onClassify: (id: string, key: PriceKey) => void; onExport: () => void; onSync: () => void; syncing: boolean; connected: boolean;
}) {
  return <>
    <PageHeader eyebrow="MEDIÇÃO E FATURAMENTO" title="Produção das equipes" description="Importe o relatório diário, revise as sugestões e atualize a cópia da planilha">
      <label className="secondary file-button">Importar relatório<input type="file" accept=".xlsx,.xls,.csv" onChange={onImport} /></label><button className="primary" onClick={onSync}>{syncing ? "Sincronizando…" : connected ? "Sincronizar cópia" : "Conectar planilha"}</button>
    </PageHeader>
    <section className="workflow-strip"><div className="done"><span>1</span><strong>Importar Excel</strong><small>{importName}</small></div><i /><div className="active"><span>2</span><strong>Revisar classificação</strong><small>{reviewCount} pendências</small></div><i /><div><span>3</span><strong>Atualizar cópia</strong><small>Somente após confirmação</small></div></section>
    <section className="metrics">
      <Metric label="OS das equipes" value={String(rows.length)} note="demais equipes removidas" tone="purple" />
      <Metric label="Com medição" value={String(measuredCount)} note="metragem executada encontrada" tone="green" />
      <Metric label="Precisam de revisão" value={String(reviewCount)} note="sem medida ou acabamento especial" tone="orange" />
      <Metric label="Produção estimada" value={money.format(estimate)} note="antes da conferência final" tone="blue" />
    </section>
    {reviewCount > 0 && <section className="review-alert"><span>!</span><div><strong>Não sincronize ainda</strong><p>Confirme as {reviewCount} sugestões destacadas. Ausência de metragem não significa automaticamente OS improdutiva.</p></div></section>}
    <section className="production-layout">
      <article className="production-table card">
        <div className="section-heading"><div><span className="section-kicker">CLASSIFICAÇÃO ASSISTIDA</span><h2>Serviços importados</h2></div><button className="secondary compact" onClick={onExport}>Baixar atualização CSV</button></div>
        <div className="table-wrap"><table><thead><tr><th>OS</th><th>EQUIPE / LOCAL</th><th>MEDIÇÃO</th><th>CLASSIFICAÇÃO SUGERIDA</th><th>VALOR</th><th>STATUS</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id} className={!row.reviewed ? "needs-review" : ""}><td><strong>{row.id}</strong><span>{row.date}</span></td><td><strong>{row.team.replace("CONSTRUPAV ", "Equipe ")}</strong><span>{row.neighborhood}</span></td><td><strong>{row.executedTotal === null ? "Sem medida" : `${row.executedTotal.toLocaleString("pt-BR")} m²`}</strong><span>{row.observation || row.requestedService}</span></td><td><select value={row.priceKey} onChange={(event) => onClassify(row.id, event.target.value as PriceKey)}>{Object.entries(prices).map(([key, price]) => <option value={key} key={key}>{price.label}</option>)}</select></td><td><strong>{money.format(productionValue(row))}</strong><span>{prices[row.priceKey].unit}</span></td><td><span className={`status-pill ${row.reviewed ? "ok" : "review"}`}>{row.reviewed ? "Revisado" : "Confirmar"}</span></td></tr>)}
        </tbody></table></div>
      </article>
      <aside className="price-card card"><div className="section-heading"><div><span className="section-kicker">BASE DE PREÇOS</span><h2>Valores usados</h2></div></div><div className="price-list">{Object.entries(prices).map(([key, price]) => <div key={key}><div><strong>{price.label}</strong><span>{price.unit}{price.extra ? ` · adicional ${money.format(price.extra)}` : ""}</span></div><b>{money.format(price.value)}</b></div>)}</div><div className="price-note"><strong>Estimativa ≠ medição final</strong><p>O valor final depende da classificação e da metragem aceitas pela fiscalização.</p></div></aside>
    </section>
  </>;
}

function IntegrationsView({ connected, onConnect, onWhatsApp }: { connected: boolean; onConnect: () => void; onWhatsApp: () => void }) {
  return <>
    <PageHeader eyebrow="AUTOMAÇÃO COM CONTROLE" title="Integrações" description="Conexões graduais, com revisão humana e registro de cada ação" />
    <section className="integration-hero"><div><span className="section-kicker">PRINCÍPIO DE SEGURANÇA</span><h2>Automatizar sem perder o controle</h2><p>O RotaOS prepara, confere e mostra exatamente o que fará. Camilla continua dando a confirmação final antes de qualquer envio.</p></div><div className="shield">R</div></section>
    <section className="integration-grid">
      <IntegrationCard status="Disponível para teste" tone="green" title="Procesa / CESAMA" description="Copiar OS selecionadas ou as 100 visíveis usando a sessão já autenticada, sem guardar login ou senha." steps={["Instalar a extensão", "Abrir Solicitadas", "Selecionar ou mostrar 100", "Enviar ao RotaOS"]} action="Baixar extensão" href="downloads/rotaos-ponte-procesa.zip" />
      <IntegrationCard status={connected ? "Cópia conectada" : "Aguardando cópia"} tone={connected ? "green" : "blue"} title="Planilha de Produção" description="Enviar as classificações e valores apenas para uma cópia de teste durante a validação." steps={["Importar relatório", "Filtrar Construpav", "Revisar valores", "Sincronizar cópia"]} action={connected ? "Reconfigurar" : "Conectar cópia de teste"} onAction={onConnect} />
      <IntegrationCard status="Assistido" tone="purple" title="Comunicação às equipes" description="Montar a mensagem com sequência, OS e detalhes; a pessoa escolhe o contato e confirma o envio." steps={["Resumo da rota", "Alertas de acesso", "Ordem das paradas", "Confirmação manual"]} action="Preparar WhatsApp" onAction={onWhatsApp} />
    </section>
    <section className="audit-card card"><div><span className="section-kicker">HISTÓRICO E AUDITORIA</span><h2>Cada automação deixará um rastro claro</h2><p>Data, responsável, OS, equipe, situação anterior, ação solicitada e resultado. Isso evita duplicidade e facilita corrigir qualquer divergência.</p></div><div className="audit-flow"><span>Planejado</span><i>→</i><span>Revisado</span><i>→</i><span>Enviado</span><i>→</i><span>Medido</span></div></section>
  </>;
}

function IntegrationCard({ status, tone, title, description, steps, action, onAction, href }: { status: string; tone: string; title: string; description: string; steps: string[]; action: string; onAction?: () => void; href?: string }) {
  return <article className="integration-card card"><div className="integration-top"><span className={`connection-dot ${tone}`} /><span className={`connection-status ${tone}`}>{status}</span></div><h2>{title}</h2><p>{description}</p><ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>{href ? <a className="secondary full button-link" href={href} download>{action}</a> : <button className="secondary full" onClick={onAction}>{action}</button>}</article>;
}
