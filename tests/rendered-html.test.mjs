import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("gera o painel estático do RotaOS", async () => {
  const html = await readFile(new URL("out/index.html", root), "utf8");
  assert.match(html, /<html lang="pt-BR"/);
  assert.match(html, /RotaOS/);
  assert.match(html, /Monte a próxima rota/);
  assert.match(html, /Importar do Procesa/);
  assert.match(html, /Escolha o que entra na rota/);
  assert.doesNotMatch(html, /Produção das equipes/);
  assert.doesNotMatch(html, />Integrações</);
  assert.match(html, /og-planejamento\.png/);
});

test("mantém a ponte do Procesa somente leitura", async () => {
  const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
  const bridge = await readFile(new URL("extension/procesa-bridge.js", root), "utf8");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://procesama.linedata.com.br/*"]);
  assert.match(bridge, /Somente leitura/);
  assert.doesNotMatch(bridge, /password|senha|submit\(\)/i);
  await access(new URL("public/downloads/rotaos-ponte-procesa.zip", root));
});

test("inclui o conector protegido da cópia de produção", async () => {
  const connector = await readFile(new URL("integration/google-apps-script/Code.gs", root), "utf8");
  assert.match(connector, /mode !== "test-copy"/);
  assert.match(connector, /IMPORTACAO ROTAOS/);
  assert.doesNotMatch(connector, /deleteSheet|deleteFile|trash/i);
});
