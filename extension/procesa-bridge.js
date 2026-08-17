(() => {
  if (window.top !== window || document.getElementById("rotaos-procesa-bridge")) return;

  const ROTAOS_URL = "https://daiened.github.io/RotaOS/?source=extension";

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
        const internalId = linkedId
          || row.dataset.id
          || (/^\d{6,}$/.test(checkbox?.value || "") ? checkbox.value : "")
          || values.find((value) => /^\d{6,}$/.test(value))
          || "";
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
    return dataRows().filter((row) => row.checkbox?.checked);
  }

  function updateCounter() {
    const selected = selectedRows().length;
    const visible = dataRows().length;
    const counter = document.getElementById("rotaos-bridge-counter");
    if (counter) counter.textContent = selected ? `${selected} selecionada${selected === 1 ? "" : "s"}` : `${visible} visíveis`;
  }

  function detailFromSection(section) {
    const priority = section.match(/PRIORIDADE:\s*\n([\s\S]*?)\nDADOS DE BAIXA/)?.[1]
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^<=?\s*\d+\s*DIAS?$/i.test(line));
    const returnNote = section.match(/OBSERVAÇÃO DE DEVOLUÇÃO\s*\n([\s\S]*?)\nOBSERVAÇÃO DE CANCELAMENTO/)?.[1]
      ?.trim();
    return priority?.join(" · ") || returnNote || "Detalhe ainda não identificado";
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
      const details = new Map(
        sections.map((section) => [section.match(/^N°:\s*([^\n]+)/m)?.[1]?.trim(), detailFromSection(section)]),
      );
      return rows.map((row) => ({ ...row, detail: details.get(row.occurrence) || "Detalhe ainda não identificado" }));
    } catch {
      return rows;
    }
  }

  async function sendToRotaOS(mode) {
    const button = document.getElementById(`rotaos-send-${mode}`);
    const rows = mode === "selected" ? selectedRows() : dataRows();
    if (!rows.length) {
      showMessage(mode === "selected" ? "Selecione ao menos uma OS." : "Nenhuma OS visível foi encontrada.", true);
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = "Lendo detalhes…";
    }
    const enriched = await enrichDetails(rows);
    const payload = {
      version: 1,
      source: "Procesa",
      capturedAt: new Date().toISOString(),
      mode,
      orders: enriched.map((row) => ({
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
      })),
    };
    chrome.storage.local.set({ rotaosImportQueue: payload }, () => {
      window.open(ROTAOS_URL, "_blank", "noopener,noreferrer");
      showMessage(`${rows.length} OS preparadas. O RotaOS foi aberto em outra aba.`);
      if (button) {
        button.disabled = false;
        button.textContent = mode === "selected" ? "Enviar selecionadas" : "Enviar visíveis";
      }
    });
  }

  function showMessage(text, error = false) {
    const message = document.getElementById("rotaos-bridge-message");
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("error", error);
    window.setTimeout(() => { message.textContent = ""; }, 5000);
  }

  const panel = document.createElement("section");
  panel.id = "rotaos-procesa-bridge";
  panel.innerHTML = `
    <header><span>R</span><div><strong>Enviar ao RotaOS</strong><small id="rotaos-bridge-counter">Lendo OS…</small></div><button id="rotaos-bridge-collapse" aria-label="Recolher">−</button></header>
    <div class="rotaos-bridge-body">
      <p>Somente leitura. Nada será alterado no Procesa.</p>
      <button id="rotaos-send-selected">Enviar selecionadas</button>
      <button id="rotaos-send-visible" class="secondary">Enviar visíveis</button>
      <small id="rotaos-bridge-message"></small>
    </div>`;
  document.body.appendChild(panel);
  document.getElementById("rotaos-send-selected")?.addEventListener("click", () => sendToRotaOS("selected"));
  document.getElementById("rotaos-send-visible")?.addEventListener("click", () => sendToRotaOS("visible"));
  document.getElementById("rotaos-bridge-collapse")?.addEventListener("click", () => panel.classList.toggle("collapsed"));
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") updateCounter();
  });
  updateCounter();
})();
