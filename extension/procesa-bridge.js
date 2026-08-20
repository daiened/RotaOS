(() => {
  if (window.top !== window || document.getElementById("rotaos-procesa-bridge")) return;

  const ROTAOS_URL = "https://daiened.github.io/RotaOS/?source=extension";
  const SESSION_KEY = "rotaosSyncSession";
  const AUTO_KEY = "rotaosAutoSync";
  const DETAIL_CACHE_KEY = "rotaosDetailCacheV1";
  const DETAIL_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function storageSet(value) {
    return new Promise((resolve, reject) => chrome.storage.local.set(value, () => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()));
  }

  function dataRows() {
    return Array.from(document.querySelectorAll("table tbody tr"))
      .map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const values = cells.map((cell) => cell.innerText.trim().replace(/\s+/g, " "));
        const headers = Array.from(row.closest("table")?.querySelectorAll("thead th") || [])
          .map((cell) => cell.innerText.trim().replace(/\s+/g, " ").toUpperCase());
        const occurrenceIndex = values.findIndex((value) => /^\d+\/\d+\/\d+$/.test(value));
        if (occurrenceIndex < 0) return null;
        const valueByHeader = (...patterns) => {
          const index = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
          return index >= 0 ? values[index] : "";
        };
        const checkbox = row.querySelector('input[type="checkbox"]');
        const linkedId = Array.from(row.querySelectorAll("a"))
          .map((link) => link.getAttribute("href")?.match(/[?&]id=(\d+)/)?.[1])
          .find(Boolean);
        const internalId = linkedId || row.dataset.id || (/^\d{6,}$/.test(checkbox?.value || "") ? checkbox.value : "") || values.find((value) => /^\d{6,}$/.test(value)) || "";
        return {
          element: row,
          checkbox,
          internalId,
          occurrence: values[occurrenceIndex],
          address: valueByHeader(/ENDERE/) || values[occurrenceIndex + 1] || "",
          neighborhood: valueByHeader(/BAIRRO/) || values[occurrenceIndex + 2] || "",
          region: valueByHeader(/REGI/) || values[occurrenceIndex + 3] || "",
          recipient: valueByHeader(/DESTINAT/, /RECEBEDOR/) || values[occurrenceIndex + 4] || "",
          requestedService: valueByHeader(/SERVI.*SOLICIT/, /SOLICITA/) || values[occurrenceIndex + 5] || "",
          requestedAt: valueByHeader(/DATA.*SOLICIT/, /SOLICITADO EM/) || values[occurrenceIndex + 6] || "",
          team: valueByHeader(/EQUIPE/) || values[occurrenceIndex + 7] || "",
          serviceType: valueByHeader(/TIPO.*SERVI/) || values[occurrenceIndex + 8] || "",
        };
      })
      .filter(Boolean);
  }

  function selectedRows() {
    return supportedRows().filter((row) => row.checkbox?.checked);
  }

  function supportedRows() {
    return dataRows().filter((row) => /(^|\s)S0?25(?:\s|$)|(^|\s)S199(?:\s|$)|(^|\s)S200(?:\s|$)|(^|\s)S201(?:\s|$)|(^|\s)S202(?:\s|$)/i.test(`${row.requestedService} ${row.serviceType}`));
  }

  function isInRequestedPeriod(row, period) {
    const match = String(row.requestedAt || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return !period.from && !period.to;
    const day = `${match[3]}-${match[2]}-${match[1]}`;
    return (!period.from || day >= period.from) && (!period.to || day <= period.to);
  }

  function requestedPeriodFromControls() {
    return {
      from: document.getElementById("rotaos-period-from")?.value || "",
      to: document.getElementById("rotaos-period-to")?.value || "",
    };
  }

  function requestedPeriodLabel(period) {
    if (!period.from && !period.to) return "todas as datas";
    const format = (value) => value ? value.split("-").reverse().join("/") : "hoje";
    return `${format(period.from)} a ${format(period.to)}`;
  }

  function rowSignature() {
    return supportedRows().map((row) => row.occurrence).join("|");
  }

  function metadataFromSection(section) {
    const priority = section.match(/PRIORIDADE:\s*\n([\s\S]*?)\nDADOS DE BAIXA/)?.[1]
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^<=?\s*\d+\s*DIAS?$/i.test(line));
    const returnNote = section.match(/OBSERVAÇÃO DE DEVOLUÇÃO\s*\n([\s\S]*?)\nOBSERVAÇÃO DE CANCELAMENTO/)?.[1]?.trim();
    const complaintLines = section.split("\n").filter((line) => /RECLAMA(?:ÇÃO|COES|ÇÕES)|RETORNO DO CLIENTE/i.test(line));
    const complaintDates = complaintLines.flatMap((line) => line.match(/\d{2}\/\d{2}\/\d{4}/g) || []);
    return {
      detail: priority?.join(" · ") || returnNote || "Detalhe ainda não identificado",
      complaintCount: complaintLines.length,
      latestComplaintAt: complaintDates.at(-1) || "",
    };
  }

  function metadataFromSectionV2(section, occurrence) {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
    const complaintId = new RegExp(`^${occurrence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\d+$`);
    const entries = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!complaintId.test(lines[index])) continue;
      const content = lines[index + 1] || "";
      const date = lines.slice(index + 1, index + 5).find((line) => /\d{2}\/\d{2}\/\d{4}/.test(line)) || "";
      entries.push({ content, date });
    }
    const latest = entries.at(-1);
    const legacy = metadataFromSection(section);
    return { detail: latest?.content || legacy.detail, complaintCount: entries.length, latestComplaintAt: latest?.date || legacy.latestComplaintAt };
  }

  function detailCacheId(row) {
    return [row.internalId, row.occurrence, row.address, row.requestedAt, row.requestedService, row.team].join("|");
  }

  async function enrichDetails(rows) {
    const now = Date.now();
    const { [DETAIL_CACHE_KEY]: storedCache } = await storageGet([DETAIL_CACHE_KEY]);
    const cache = storedCache && typeof storedCache === "object" ? storedCache : {};
    const rowsWithoutFreshCache = rows.filter((row) => {
      const entry = cache[detailCacheId(row)];
      return !entry || now - Number(entry.cachedAt || 0) >= DETAIL_CACHE_TTL_MS;
    });
    const ids = rowsWithoutFreshCache.map((row) => row.internalId).filter((id) => /^\d+$/.test(id));
    if (!ids.length) return rows.map((row) => ({ ...row, ...cache[detailCacheId(row)] }));
    try {
      const response = await fetch(`/operacoes/impressao?id=${ids.join(",")}`, { credentials: "include" });
      if (!response.ok) return rows;
      const html = await response.text();
      const text = new DOMParser().parseFromString(html, "text/html").body.innerText;
      const sections = text.split(/(?=N°:\s*\d+\/\d+\/\d+)/).filter((section) => /^N°:\s*\d/m.test(section));
      const details = new Map(sections.map((section) => {
        const occurrence = section.match(/^N°:\s*([^\n]+)/m)?.[1]?.trim() || "";
        return [occurrence, metadataFromSectionV2(section, occurrence)];
      }));
      rows.forEach((row) => {
        const detail = details.get(row.occurrence);
        if (detail) cache[detailCacheId(row)] = { ...detail, cachedAt: now };
      });
      const retainedCache = Object.entries(cache)
        .sort(([, a], [, b]) => Number(b.cachedAt || 0) - Number(a.cachedAt || 0))
        .slice(0, 5000);
      await storageSet({ [DETAIL_CACHE_KEY]: Object.fromEntries(retainedCache) });
      return rows.map((row) => ({
        ...row,
        detail: details.get(row.occurrence)?.detail || "Detalhe ainda não identificado",
        complaintCount: details.get(row.occurrence)?.complaintCount || 0,
        latestComplaintAt: details.get(row.occurrence)?.latestComplaintAt || "",
      }));
    } catch {
      return rows;
    }
  }

  function cleanOrder(row) {
    return {
      internalId: row.internalId,
      id: row.occurrence,
      address: row.address,
      neighborhood: row.neighborhood,
      region: row.region,
      recipient: row.recipient,
      requestedService: row.requestedService,
      requestedAt: row.requestedAt,
      team: row.team,
      serviceType: row.serviceType,
      detail: row.detail,
      complaintCount: row.complaintCount || 0,
      latestComplaintAt: row.latestComplaintAt || "",
    };
  }

  async function addRowsToSession(rows) {
    const enriched = await enrichDetails(rows);
    const { [SESSION_KEY]: current } = await storageGet([SESSION_KEY]);
    const byId = new Map((current?.orders || []).map((order) => [order.id, order]));
    enriched.map(cleanOrder).forEach((order) => byId.set(order.id, order));
    const session = { version: 2, source: "Procesa", capturedAt: new Date().toISOString(), mode: "sync", orders: Array.from(byId.values()) };
    await storageSet({ [SESSION_KEY]: session });
    updateCounter(session.orders.length);
    return session;
  }

  async function openSessionInRotaOS() {
    const { [SESSION_KEY]: session } = await storageGet([SESSION_KEY]);
    if (!session?.orders?.length) {
      showMessage("A base acumulada ainda está vazia.", true);
      return;
    }
    const rotaTab = window.open("about:blank", "_blank");
    if (!rotaTab) {
      showMessage("Permita pop-ups para o Procesa e tente novamente.", true);
      return;
    }
    rotaTab.opener = null;
    rotaTab.location.href = ROTAOS_URL;
    await storageSet({ rotaosImportQueue: { ...session, capturedAt: new Date().toISOString() } });
    showMessage(`${session.orders.length} OS enviadas para conferência no RotaOS.`, false, true);
  }

  async function sendRows(mode) {
    const rows = mode === "selected" ? selectedRows() : supportedRows();
    if (!rows.length) {
      showMessage(mode === "selected" ? "Selecione ao menos uma OS." : "Nenhuma OS visível foi encontrada.", true);
      return;
    }
    setBusy(true, "Lendo detalhes…");
    try {
      const session = await addRowsToSession(rows);
      await storageSet({ rotaosImportQueue: { ...session, mode } });
      await openSessionInRotaOS();
    } catch {
      showMessage("Não foi possível preparar as OS. Recarregue a página e tente novamente.", true);
    } finally {
      setBusy(false);
    }
  }

  function findNextPageButtonLegacy() {
    const direct = document.querySelector(".paginate_button.next:not(.disabled), li.next:not(.disabled) a, a[rel='next'], button[aria-label*='Próx'], a[aria-label*='Próx']");
    if (direct && !direct.closest(".disabled") && direct.getAttribute("aria-disabled") !== "true") return direct;
    return Array.from(document.querySelectorAll("a, button")).find((element) => {
      const label = `${element.textContent || ""} ${element.getAttribute("title") || ""} ${element.getAttribute("aria-label") || ""}`.trim();
      const disabled = element.disabled || element.getAttribute("aria-disabled") === "true" || element.classList.contains("disabled") || element.closest(".disabled");
      return !disabled && /^(PRÓXIMO|PROXIMO|NEXT|›|»)|PRÓXIMA PÁGINA/i.test(label);
    });
  }

  function findNextPageButton() {
    const isDisabled = (element) => element.disabled || element.getAttribute("aria-disabled") === "true" || element.classList.contains("disabled") || element.closest(".disabled");
    // Procesa usa postback ASP.NET: a paginação real é o botão #btnProxima,
    // sem texto ou atributo ARIA. Mantemos os demais seletores para variações
    // de tela, mas este precisa vir primeiro para não interromper a varredura.
    const direct = Array.from(document.querySelectorAll("#btnProxima, [id$='_next'], [data-dt-idx='next'], .dataTables_paginate .paginate_button.next a, .dataTables_paginate .paginate_button.next, .pagination .next a, .pagination [class*='next'] a, [rel='next'], button[aria-label*='Próx'], a[aria-label*='Próx'], button[aria-label*='next' i], a[aria-label*='next' i]")).find((element) => !isDisabled(element));
    if (direct) return direct;
    const labelled = Array.from(document.querySelectorAll("a, button, [role='button']")).find((element) => {
      const label = `${element.textContent || ""} ${element.getAttribute("title") || ""} ${element.getAttribute("aria-label") || ""} ${element.getAttribute("data-original-title") || ""} ${element.className || ""}`.trim();
      return !isDisabled(element) && /PRÓXIMO|PROXIMO|NEXT|PRÓXIMA PÁGINA|CHEVRON-RIGHT|ANGLE-RIGHT|ARROW-RIGHT|NAVIGATE_NEXT|PAGE-NEXT|PAGINATION-NEXT/i.test(label);
    });
    if (labelled) return labelled;
    const current = document.querySelector(".dataTables_paginate .current, .pagination .active, [aria-current='page']");
    const numberedNext = current?.parentElement?.nextElementSibling?.querySelector?.("a, button") || current?.nextElementSibling?.querySelector?.("a, button");
    return numberedNext && !isDisabled(numberedNext) ? numberedNext : findNextPageButtonLegacy();
  }

  async function getNextPageButton() {
    let next = findNextPageButton();
    if (next) return next;
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    next = findNextPageButton();
    return next;
  }

  function currentPageMarker() {
    return document.getElementById("hddPaginaAtual")?.value || "";
  }

  function waitForPageChange(previousSignature, previousPage) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        // O Procesa atualiza a grade por postback. Em alguns filtros as OS
        // podem se repetir entre páginas; o campo oculto é a confirmação
        // oficial de que a paginação mudou.
        const currentPage = currentPageMarker();
        const changedByPage = Boolean(currentPage && previousPage && currentPage !== previousPage);
        const changedByRows = Boolean(rowSignature() && rowSignature() !== previousSignature);
        const changed = changedByPage || changedByRows;
        if (changed || Date.now() - startedAt > 12000) {
          window.clearInterval(timer);
          resolve(Boolean(changed));
        }
      }, 400);
    });
  }

  async function continueAutoSync() {
    const { [AUTO_KEY]: auto } = await storageGet([AUTO_KEY]);
    if (!auto?.active) return;
    const page = Number(auto.page || 1);
    if (page > 100) {
      await storageSet({ [AUTO_KEY]: { active: false, page } });
      showMessage("A coleta parou no limite de 100 páginas. Abra a base acumulada para revisar.", true);
      return;
    }
    const visibleRows = dataRows();
    if (!visibleRows.length) {
      showMessage("A tabela ainda não carregou. Tentando novamente…");
      window.setTimeout(continueAutoSync, 1500);
      return;
    }
    setBusy(true, `Coletando página ${page}…`);
    const period = { from: String(auto.from || ""), to: String(auto.to || "") };
    const rows = supportedRows().filter((row) => isInRequestedPeriod(row, period));
    const signature = rowSignature();
    const pageMarker = currentPageMarker();
    const session = await addRowsToSession(rows);
    showMessage(`Página ${page} coletada · ${session.orders.length} OS únicas.`);
    const next = await getNextPageButton();
    if (!next) {
      await storageSet({ [AUTO_KEY]: { active: false, page } });
      setBusy(false);
      if (!session.orders.length) {
        showMessage(`Nenhuma OS atendida foi encontrada no período ${requestedPeriodLabel(period)}.`, true, true);
        return;
      }
      showMessage(`Coleta encerrada na página ${page}: ${session.orders.length} OS acumuladas.`, false, true);
      await openSessionInRotaOS();
      return;
    }
    await storageSet({ [AUTO_KEY]: { active: true, page: page + 1 } });
    next.click();
    const changed = await waitForPageChange(signature, pageMarker);
    if (!changed) {
      await storageSet({ [AUTO_KEY]: { active: false, page } });
      setBusy(false);
      showMessage("A próxima página não respondeu. A base coletada foi preservada.", true, true);
      return;
    }
    await continueAutoSync();
  }

  async function startAutoSync() {
    const period = requestedPeriodFromControls();
    if (period.from && period.to && period.from > period.to) {
      showMessage("A data inicial precisa ser anterior à data final.", true, true);
      return;
    }
    await storageSet({ [SESSION_KEY]: { version: 2, source: "Procesa", capturedAt: new Date().toISOString(), mode: "sync", orders: [] }, [AUTO_KEY]: { active: true, page: 1, ...period } });
    await continueAutoSync();
  }

  async function clearSession() {
    await new Promise((resolve) => chrome.storage.local.remove([SESSION_KEY, AUTO_KEY], resolve));
    updateCounter(0);
    showMessage("Base acumulada limpa.");
  }

  function setBusy(busy, text = "") {
    panel.querySelectorAll("button[data-action]").forEach((button) => { button.disabled = busy; });
    const progress = document.getElementById("rotaos-bridge-progress");
    if (progress) progress.textContent = text;
  }

  function updateCounter(accumulated) {
    const selected = selectedRows().length;
    const visible = dataRows().length;
    const supported = supportedRows().length;
    const counter = document.getElementById("rotaos-bridge-counter");
    if (counter) counter.textContent = `${supported} atendidas de ${visible} visíveis · ${selected} marcadas · ${accumulated || 0} acumuladas`;
  }

  function showMessage(text, error = false, persistent = false) {
    const message = document.getElementById("rotaos-bridge-message");
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("error", error);
    if (!persistent) window.setTimeout(() => { if (message.textContent === text) message.textContent = ""; }, 6000);
  }

  const panel = document.createElement("section");
  panel.id = "rotaos-procesa-bridge";
  panel.innerHTML = `
    <header><span>R</span><div><strong>Sincronizar com RotaOS</strong><small id="rotaos-bridge-counter">Lendo OS…</small></div><button id="rotaos-bridge-collapse" aria-label="Recolher">−</button></header>
    <div class="rotaos-bridge-body">
      <p>Use na aba Solicitadas. Somente S025, S199, S200, S201 e S202; nada será distribuído no Procesa.</p>
      <div class="rotaos-period" aria-label="Período da solicitação">
        <label>De<input id="rotaos-period-from" type="date" /></label>
        <label>Até<input id="rotaos-period-to" type="date" /></label>
      </div>
      <small class="rotaos-period-hint">O período é filtrado pela ponte durante a coleta.</small>
      <button data-action id="rotaos-send-selected">Enviar selecionadas</button>
      <button data-action id="rotaos-sync-pages" class="secondary">Todas as páginas de Solicitadas</button>
      <button data-action id="rotaos-diagnose-pages" class="secondary">Diagnosticar paginação</button>
      <button data-action id="rotaos-open-session" class="secondary">Abrir base acumulada</button>
      <button data-action id="rotaos-clear-session" class="text">Limpar acumuladas</button>
      <small id="rotaos-bridge-progress"></small>
      <small id="rotaos-bridge-message"></small>
    </div>`;
  document.body.appendChild(panel);
  document.getElementById("rotaos-send-selected")?.addEventListener("click", () => sendRows("selected"));
  document.getElementById("rotaos-sync-pages")?.addEventListener("click", startAutoSync);
  document.getElementById("rotaos-diagnose-pages")?.addEventListener("click", () => {
    window.postMessage({ type: "ROTAOS_PROCESA_START_NETWORK_PROBE" }, window.location.origin);
    showMessage("Diagnóstico ligado. Clique uma vez em Próxima no Procesa; só a rota técnica será verificada.", false, true);
  });
  document.getElementById("rotaos-open-session")?.addEventListener("click", openSessionInRotaOS);
  document.getElementById("rotaos-clear-session")?.addEventListener("click", clearSession);
  document.getElementById("rotaos-bridge-collapse")?.addEventListener("click", () => panel.classList.toggle("collapsed"));
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") void storageGet([SESSION_KEY]).then(({ [SESSION_KEY]: session }) => updateCounter(session?.orders?.length || 0));
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "ROTAOS_PROCESA_NETWORK_READY") {
      showMessage("Diagnóstico pronto. Clique em Próxima no Procesa para identificar como ele troca de página.", false, true);
    }
    if (event.data?.type === "ROTAOS_PROCESA_NETWORK") {
      const { kind, method, url, status } = event.data;
      showMessage(`Processa usou ${String(kind).toUpperCase()} ${method} ${url} (status ${status}). A rota de paginação foi identificada.`, false, true);
    }
  });
  void storageGet([SESSION_KEY, AUTO_KEY]).then(({ [SESSION_KEY]: session, [AUTO_KEY]: auto }) => {
    updateCounter(session?.orders?.length || 0);
    const from = document.getElementById("rotaos-period-from");
    const to = document.getElementById("rotaos-period-to");
    if (from && auto?.from) from.value = auto.from;
    if (to && auto?.to) to.value = auto.to;
    if (auto?.active) window.setTimeout(continueAutoSync, 1000);
  });
})();
