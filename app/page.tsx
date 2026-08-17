"use client";

import { useMemo, useState } from "react";

type OS = {
  id: string;
  address: string;
  neighborhood: string;
  region: "Norte" | "Sul" | "Leste";
  service: "Passeio" | "Muro" | "Vistoria" | "Calçamento";
  detail: string;
  priority: 1 | 2;
  team: string;
  cluster: number;
  distance: number;
};

const orders: OS[] = [
  { id: "24936/2026/3", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", service: "Muro", detail: "Hidrantes azuis", priority: 2, team: "Construpav 01", cluster: 1, distance: 1.2 },
  { id: "24936/2026/4", address: "R. Maria do Carmo Costa, 262", neighborhood: "Santa Cruz", region: "Norte", service: "Passeio", detail: "Acabamento cimentado · junto à OS 24936/2026/3", priority: 2, team: "Construpav 01", cluster: 1, distance: 0 },
  { id: "36171/2026/2", address: "R. Bartolomeu dos Santos, 2", neighborhood: "São Damião", region: "Norte", service: "Passeio", detail: "Repor meio-fio", priority: 2, team: "Construpav 01", cluster: 1, distance: 2.4 },
  { id: "36760/2026/2", address: "R. Bartolomeu dos Santos, 24", neighborhood: "São Damião", region: "Norte", service: "Passeio", detail: "Mesmo trecho da OS 36171/2026/2", priority: 2, team: "Construpav 01", cluster: 1, distance: 0.1 },
  { id: "36057/2026/2", address: "R. Guimarães Rosa, 102", neighborhood: "Cidade do Sol", region: "Norte", service: "Muro", detail: "Assentar piso · ligar antes · área interna", priority: 2, team: "Construpav 02", cluster: 2, distance: 3.8 },
  { id: "34355/2026/2", address: "Estr. da Remonta, 45", neighborhood: "Barbosa Lage", region: "Norte", service: "Passeio", detail: "Acabamento não informado", priority: 2, team: "Construpav 02", cluster: 2, distance: 1.7 },
  { id: "36237/2026/1", address: "Estr. da Remonta, 204", neighborhood: "Jóquei Clube III", region: "Norte", service: "Passeio", detail: "Mesmo corredor da OS 34355/2026/2", priority: 2, team: "Construpav 02", cluster: 2, distance: 0.4 },
  { id: "36097/2026/1", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", service: "Muro", detail: "Recompor parede", priority: 2, team: "Construpav 03", cluster: 3, distance: 4.1 },
  { id: "36097/2026/2", address: "R. Jesus Raymundo, 435", neighborhood: "Teixeiras", region: "Sul", service: "Passeio", detail: "Executar junto à OS 36097/2026/1", priority: 2, team: "Construpav 03", cluster: 3, distance: 0 },
  { id: "32325/2026/1", address: "R. Benício de Souza Rocha, 161", neighborhood: "Graminha", region: "Sul", service: "Passeio", detail: "Cimentado · refazer degrau", priority: 2, team: "Construpav 03", cluster: 3, distance: 1.5 },
  { id: "32771/2026/2", address: "R. Francisco Foini, 141", neighborhood: "Centenário", region: "Leste", service: "Muro", detail: "Endereço corrigido · cimentado", priority: 2, team: "Construpav 03", cluster: 3, distance: 2.1 },
  { id: "19191/2026/4", address: "R. Pinto de Moura, 180", neighborhood: "Poço Rico", region: "Sul", service: "Vistoria", detail: "Pedra portuguesa · retirar medidas", priority: 1, team: "LesteMoto 03", cluster: 4, distance: 0.8 },
  { id: "28585/2026/4", address: "Av. Francisco Valadares, 2745", neighborhood: "Poço Rico", region: "Sul", service: "Vistoria", detail: "Passeio cimentado · retirar medidas", priority: 1, team: "LesteMoto 03", cluster: 4, distance: 1.1 },
  { id: "32892/2026/1", address: "R. Princesa Isabel, 121", neighborhood: "Centro", region: "Sul", service: "Vistoria", detail: "Verificar necessidade e medidas", priority: 1, team: "LesteMoto 03", cluster: 4, distance: 2.3 },
  { id: "31374/2026/5", address: "R. Baependi, 358", neighborhood: "Vitorino Braga", region: "Leste", service: "Vistoria", detail: "Cimentado · em frente ao portão", priority: 1, team: "LesteMoto 03", cluster: 4, distance: 1.6 },
];

const teams = [
  { name: "Construpav 01", color: "#7457d9", count: 4, km: "7,4 km", time: "5h 20min" },
  { name: "Construpav 02", color: "#ee8d48", count: 3, km: "9,8 km", time: "5h 05min" },
  { name: "Construpav 03", color: "#2f99ac", count: 4, km: "12,1 km", time: "6h 10min" },
  { name: "LesteMoto 03", color: "#35a56f", count: 4, km: "8,6 km", time: "2h 45min" },
];

export default function Home() {
  const [activeTeam, setActiveTeam] = useState("Todas");
  const [service, setService] = useState("Todos");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const filtered = useMemo(() => orders.filter((order) => {
    const teamMatch = activeTeam === "Todas" || order.team === activeTeam;
    const serviceMatch = service === "Todos" || order.service === service;
    const haystack = `${order.id} ${order.address} ${order.neighborhood} ${order.detail}`.toLowerCase();
    return teamMatch && serviceMatch && haystack.includes(query.toLowerCase());
  }), [activeTeam, service, query]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">R</span><span>RotaOS</span></div>
        <nav>
          <button className="nav-item active"><span>⌂</span>Painel</button>
          <button className="nav-item"><span>▦</span>Ordens de serviço</button>
          <button className="nav-item"><span>⌁</span>Rotas</button>
          <button className="nav-item"><span>♙</span>Equipes</button>
          <button className="nav-item"><span>▤</span>Histórico</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><span>⚙</span>Configurações</button>
          <div className="user"><div className="avatar">DS</div><div><strong>Daiene Silva</strong><span>Planejamento</span></div><b>⌄</b></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">PLANEJAMENTO DE CAMPO</p><h1>Rotas de hoje</h1><p className="subtitle">Domingo, 16 de agosto · 15 ordens analisadas</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => setImportOpen(true)}>↑ Importar OS</button><button className="primary" onClick={() => setOptimized(true)}>✦ Otimizar rotas</button></div>
        </header>

        <div className="notice"><span>✦</span><div><strong>{optimized ? "Rotas recalculadas com sucesso" : "Planejamento inteligente pronto"}</strong><p>{optimized ? "A nova distribuição economiza cerca de 18,7 km e mantém serviços do mesmo endereço juntos." : "Encontramos 4 grupos eficientes considerando distância, prazo e tipo de serviço."}</p></div><button onClick={() => setOptimized(true)}>{optimized ? "Ver resultado" : "Aplicar sugestão"} →</button></div>

        <section className="metrics">
          <article><span className="metric-icon purple">▦</span><div><p>Ordens disponíveis</p><strong>33</strong><small><b>+9</b> desde ontem</small></div></article>
          <article><span className="metric-icon orange">♙</span><div><p>Equipes em campo</p><strong>4</strong><small>de 7 cadastradas</small></div></article>
          <article><span className="metric-icon green">↗</span><div><p>Distância estimada</p><strong>{optimized ? "37,9" : "56,6"} km</strong><small><b>{optimized ? "−33%" : "−18%"}</b> com otimização</small></div></article>
          <article><span className="metric-icon blue">◷</span><div><p>Prazo crítico</p><strong>4 OS</strong><small>atendimento em 1 dia</small></div></article>
        </section>

        <section className="content-grid">
          <div className="map-card">
            <div className="section-heading"><div><h2>Visão geral das rotas</h2><p>Distribuição sugerida por proximidade real</p></div><div className="segmented"><button className="selected">Mapa</button><button>Lista</button></div></div>
            <div className="map">
              <div className="river" />
              <span className="road road-1" /><span className="road road-2" /><span className="road road-3" /><span className="road road-4" /><span className="road road-5" />
              <span className="district d1">SANTA CRUZ</span><span className="district d2">BENFICA</span><span className="district d3">CENTRO</span><span className="district d4">TEIXEIRAS</span><span className="district d5">VITORINO BRAGA</span>
              {[
                ["1","purple",15,22],["2","purple",24,33],["3","purple",31,20],["1","orange",55,18],["2","orange",67,28],["3","orange",61,40],
                ["1","teal",30,62],["2","teal",42,72],["3","teal",49,58],["1","green",66,65],["2","green",74,55],["3","green",82,72],["4","green",58,78]
              ].map(([n,c,x,y], i) => <span key={i} className={`pin ${c}`} style={{left:`${x}%`,top:`${y}%`}}>{n}</span>)}
              <div className="map-legend">{teams.map(t => <span key={t.name}><i style={{background:t.color}} />{t.name.replace("Construpav ", "Equipe ")}</span>)}</div>
              <div className="map-controls"><button>＋</button><button>−</button><button>◎</button></div>
            </div>
          </div>

          <div className="team-panel">
            <div className="section-heading"><div><h2>Equipes</h2><p>Rotas sugeridas para hoje</p></div><button className="icon-button">•••</button></div>
            <div className="team-list">
              {teams.map((team, index) => <button key={team.name} className={activeTeam === team.name ? "team-row active" : "team-row"} onClick={() => setActiveTeam(activeTeam === team.name ? "Todas" : team.name)}>
                <span className="team-number" style={{background: team.color}}>{index + 1}</span><div><strong>{team.name}</strong><span>{team.count} OS · {team.km}</span></div><small>{team.time}</small><b>›</b>
              </button>)}
            </div>
            <button className="outline-full">Gerenciar equipes</button>
          </div>
        </section>

        <section className="orders-card">
          <div className="section-heading orders-head"><div><h2>Ordens organizadas</h2><p>Detalhes extraídos das observações do Procesa</p></div><div className="filters"><input aria-label="Buscar OS" value={query} onChange={e => setQuery(e.target.value)} placeholder="⌕  Buscar OS ou endereço" /><select aria-label="Filtrar serviço" value={service} onChange={e => setService(e.target.value)}><option>Todos</option><option>Passeio</option><option>Muro</option><option>Vistoria</option><option>Calçamento</option></select></div></div>
          <div className="table-wrap"><table><thead><tr><th>OS</th><th>LOCAL</th><th>SERVIÇO REAL</th><th>EXECUÇÃO E AGRUPAMENTO</th><th>PRAZO</th><th>EQUIPE</th></tr></thead><tbody>
            {filtered.map(order => <tr key={order.id}><td><strong>{order.id}</strong></td><td><strong>{order.address}</strong><span>{order.neighborhood} · {order.region}</span></td><td><span className={`service-tag ${order.service.toLowerCase().replace("ç", "c").replace("ã", "a")}`}>{order.service}</span></td><td><span className={order.detail.includes("ligar") || order.detail.includes("corrigido") ? "alert-detail" : ""}>{order.detail.includes("ligar") || order.detail.includes("corrigido") ? "⚠ " : ""}{order.detail}</span></td><td><span className={order.priority === 1 ? "deadline critical" : "deadline"}>{order.priority} dia{order.priority > 1 ? "s" : ""}</span></td><td><span className="team-dot" style={{background: teams.find(t => t.name === order.team)?.color}} />{order.team}</td></tr>)}
          </tbody></table></div>
        </section>
      </section>

      {importOpen && <div className="modal-backdrop" onMouseDown={() => setImportOpen(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setImportOpen(false)}>×</button><span className="modal-icon">↑</span><h2>Importar ordens do Procesa</h2><p>Cole o link de impressão ou selecione o PDF gerado pelo sistema.</p><label>Link de impressão<input placeholder="https://procesama.../impressao?id=..." /></label><div className="or"><span />ou<span /></div><label className="dropzone"><strong>Arraste o PDF aqui</strong><span>ou clique para procurar no computador</span><input type="file" accept="application/pdf" /></label><button className="primary modal-action" onClick={() => setImportOpen(false)}>Analisar ordens</button><small>Nenhuma alteração será feita no Procesa.</small></div></div>}
    </main>
  );
}
