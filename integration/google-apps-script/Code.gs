const ROTAOS_SHEET_NAME = "IMPORTACAO ROTAOS";

/**
 * Execute uma vez pelo editor do Apps Script aberto dentro da CÓPIA de teste.
 * O conector grava o ID dessa cópia e nunca recebe login ou senha.
 */
function setupRotaOS() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Abra o Apps Script pela cópia da planilha de produção.");
  PropertiesService.getScriptProperties().setProperty("ROTAOS_SPREADSHEET_ID", spreadsheet.getId());
  getOrCreateRotaOSSheet_(spreadsheet);
  return `RotaOS conectado à cópia: ${spreadsheet.getName()}`;
}

function doGet() {
  return json_({ ok: true, connector: "RotaOS Produção", mode: "test-copy" });
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (payload.source !== "RotaOS" || payload.mode !== "test-copy") {
      throw new Error("Solicitação recusada: somente o modo test-copy é aceito.");
    }
    if (!Array.isArray(payload.rows) || !payload.rows.length) {
      throw new Error("Nenhuma linha recebida.");
    }

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ROTAOS_SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("Execute setupRotaOS() antes de publicar o conector.");
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = getOrCreateRotaOSSheet_(spreadsheet);
    const headers = [
      "Importado em", "Arquivo", "OS", "Equipe", "Bairro", "Serviço",
      "Medição", "Classificação", "Valor estimado", "Revisado no RotaOS",
    ];
    const importedAt = new Date();
    const values = payload.rows.map((row) => [
      importedAt,
      payload.importedFile || "",
      row.id || "",
      row.team || "",
      row.neighborhood || "",
      row.service || "",
      row.executedTotal === null || row.executedTotal === undefined ? "" : row.executedTotal,
      row.classification || "",
      row.value === null || row.value === undefined ? "" : row.value,
      row.reviewed ? "SIM" : "NÃO",
    ]);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      sheet.getRange(2, 1, values.length, 1).setNumberFormat("dd/MM/yyyy HH:mm");
      sheet.getRange(2, 9, values.length, 1).setNumberFormat('R$ #,##0.00');
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, rows: values.length, spreadsheet: spreadsheet.getName() });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function getOrCreateRotaOSSheet_(spreadsheet) {
  return spreadsheet.getSheetByName(ROTAOS_SHEET_NAME) || spreadsheet.insertSheet(ROTAOS_SHEET_NAME);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
