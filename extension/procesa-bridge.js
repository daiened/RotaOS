(() => {
  if (window.top !== window || document.getElementById("rotaos-procesa-bridge")) return;

  const ROTAOS_URL = "https://daiened.github.io/RotaOS/?source=extension";
  const SESSION_KEY = "rotaosSyncSession";
  const AUTO_KEY = "rotaosAutoSync";

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
    return dataRows().filter((row) => /(^|\s)S0?25(?:\s|$)|(^|\s)S200(?:\s|$)|(^|\s)S201(?:\s|$)/i.test(`${row.requestedService} ${row.serviceType}`));
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

  async function enrichDetails(rows) {
    const ids = rows.map((row) => row.internalId).filter((id) => /^\d+$/.test(id));
    if (!ids.length) return rows;
    try {
      const response = await fetch(`/operacoes/impressao?id=${ids.join(",")}`, { credentials: "include" });
      if (!response.ok) return rows;
      const html = await response.text();
      const text = new DOMParser().parseFromString(html, "text/html").body.innerText;
      const sections = text.split(/(?=N°:\s*\d+\/\d+\/\d+)/).filter((section) => /^N°:\s*\d/m.test(section));
      const details = new Map(sections.map((section) => [section.match(/^N°:\s*([^\n]+)/m)?.[1]?.trim(), metadataFromSection(section)]));
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
    showMessage(`${session.orders.length} OS enviadas para conferência no RotaOS.`);
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

  function findNextPageButton() {
    const direct = document.querySelector(".paginate_button.next:not(.disabled), li.next:not(.disabled) a, a[rel='next'], button[aria-label*='Próx'], a[aria-label*='Próx']");
    if (direct && !direct.closest(".disabled") && direct.getAttribute("aria-disabled") !== "true") return direct;
    return Array.from(document.querySelectorAll("a, button")).find((element) => {
      const label = `${element.textContent || ""} ${element.getAttribute("title") || ""} ${element.getAttribute("aria-label") || ""}`.trim();
      const disabled = element.disabled || element.getAttribute("aria-disabled") === "true" || element.classList.contains("disabled") || element.closest(".disabled");
      return !disabled && /^(PRÓXIMO|PROXIMO|NEXT|›|»)|PRÓXIMA PÁGINA/i.test(label);
    });
  }

  function waitForPageChange(previousSignature) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const changed = rowSignature() && rowSignature() !== previousSignature;
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
    const rows = supportedRows();
    if (!rows.length) {
      showMessage("A tabela ainda não carregou. Tentando novamente…");
      window.setTimeout(continueAutoSync, 1500);
      return;
    }
    setBusy(true, `Coletando página ${page}…`);
    const signature = rowSignature();
    const session = await addRowsToSession(rows);
    showMessage(`Página ${page} coletada · ${session.orders.length} OS únicas.`);
    const next = findNextPageButton();
    if (!next) {
      await storageSet({ [AUTO_KEY]: { active: false, page } });
      setBusy(false);
      await openSessionInRotaOS();
      return;
    }
    await storageSet({ [AUTO_KEY]: { active: true, page: page + 1 } });
    next.click();
    const changed = await waitForPageChange(signature);
    if (!changed) {
      await storageSet({ [AUTO_KEY]: { active: false, page } });
      setBusy(false);
      showMessage("A próxima página não respondeu. A base coletada foi preservada.", true);
      return;
    }
    await continueAutoSync();
  }

  async function startAutoSync() {
    await storageSet({ [SESSION_KEY]: { version: 2, source: "Procesa", capturedAt: new Date().toISOString(), mode: "sync", orders: [] }, [AUTO_KEY]: { active: true, page: 1 } });
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

  function showMessage(text, error = false) {
    const message = document.getElementById("rotaos-bridge-message");
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("error", error);
    window.setTimeout(() => { if (message.textContent === text) message.textContent = ""; }, 6000);
  }

  const panel = document.createElement("section");
  panel.id = "rotaos-procesa-bridge";
  panel.innerHTML = `
    <header><span>R</span><div><strong>Sincronizar com RotaOS</strong><small id="rotaos-bridge-counter">Lendo OS…</small></div><button id="rotaos-bridge-collapse" aria-label="Recolher">−</button></header>
    <div class="rotaos-bridge-body">
      <p>Use na aba Solicitadas. Somente S025, S200 e S201; nada será distribuído no Procesa.</p>
      <button data-action id="rotaos-send-selected">Enviar selecionadas</button>
      <button data-action id="rotaos-sync-pages" class="secondary">Todas as páginas de Solicitadas</button>
      <button data-action id="rotaos-open-session" class="secondary">Abrir base acumulada</button>
      <button data-action id="rotaos-clear-session" class="text">Limpar acumuladas</button>
      <small id="rotaos-bridge-progress"></small>
      <small id="rotaos-bridge-message"></small>
    </div>`;
  document.body.appendChild(panel);
  document.getElementById("rotaos-send-selected")?.addEventListener("click", () => sendRows("selected"));
  document.getElementById("rotaos-sync-pages")?.addEventListener("click", startAutoSync);
  document.getElementById("rotaos-open-session")?.addEventListener("click", openSessionInRotaOS);
  document.getElementById("rotaos-clear-session")?.addEventListener("click", clearSession);
  document.getElementById("rotaos-bridge-collapse")?.addEventListener("click", () => panel.classList.toggle("collapsed"));
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") void storageGet([SESSION_KEY]).then(({ [SESSION_KEY]: session }) => updateCounter(session?.orders?.length || 0));
  });
  void storageGet([SESSION_KEY, AUTO_KEY]).then(({ [SESSION_KEY]: session, [AUTO_KEY]: auto }) => {
    updateCounter(session?.orders?.length || 0);
    if (auto?.active) window.setTimeout(continueAutoSync, 1000);
  });
})();
