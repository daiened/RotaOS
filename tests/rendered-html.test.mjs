import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("gera o painel DEV de planejamento do RotaOS", async () => {
  const html = await readFile(new URL("out/index.html", root), "utf8");
  const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(html, /<html lang="pt-BR"/);
  assert.match(html, /RotaOS/);
  assert.match(html, /Rotas de hoje/);
  assert.match(html, /Importar do Procesa/);
  assert.match(html, /Sugestão RotaOS/);
  assert.match(html, /Ordens de serviço/);
  assert.match(html, /Reclamações/);
  assert.doesNotMatch(html, /Produção das equipes/);
  assert.doesNotMatch(html, />Integrações</);
  assert.doesNotMatch(html, /01 · Planejamento/);
  assert.match(html, /og-sync\.png/);
  assert.match(pageSource, /CRITÉRIOS DA SUGESTÃO/);
  assert.match(pageSource, /rotaos-team-settings-v2/);
  assert.match(pageSource, /sourceHash/);
});

test("mantém a ponte do Procesa somente leitura", async () => {
  const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
  const bridge = await readFile(new URL("extension/procesa-bridge.js", root), "utf8");
  const landingBridge = await readFile(new URL("extension/rotaos-bridge.js", root), "utf8");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://procesama.linedata.com.br/*"]);
  assert.match(bridge, /Somente leitura/);
  assert.match(bridge, /Todas as páginas do filtro/);
  assert.match(bridge, /rotaosSyncSession/);
  assert.match(landingBridge, /MAX_DELIVERY_ATTEMPTS = 40/);
  assert.match(landingBridge, /ROTAOS_IMPORT_ACCEPTED/);
  assert.doesNotMatch(bridge, /password|senha|submit\(\)/i);
  await access(new URL("public/downloads/rotaos-ponte-procesa.zip", root));
});

test("prepara o banco Supabase com isolamento por usuária", async () => {
  const schema = await readFile(new URL("supabase/schema.sql", root), "utf8");
  const client = await readFile(new URL("lib/supabase.ts", root), "utf8");
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /owner_id = auth\.uid\(\)/);
  assert.match(schema, /unique \(owner_id, external_id\)/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /service_role|sb_secret_/i);
});

test("inclui o conector protegido da cópia de produção", async () => {
  const connector = await readFile(new URL("integration/google-apps-script/Code.gs", root), "utf8");
  assert.match(connector, /mode !== "test-copy"/);
  assert.match(connector, /IMPORTACAO ROTAOS/);
  assert.doesNotMatch(connector, /deleteSheet|deleteFile|trash/i);
});
