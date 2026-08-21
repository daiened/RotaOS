import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("gera o grid oficial focado nos serviços da Camilla", async () => {
  const html = await readFile(new URL("out/index.html", root), "utf8");
  const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(html, /<html lang="pt-BR"/);
  assert.match(html, /Entrar no RotaOS/);
  assert.match(html, /Mostrar senha/);
  assert.match(pageSource, /Chamados da Camilla/);
  assert.match(pageSource, /Caixa Padrão/);
  assert.match(pageSource, /S200 X/);
  assert.match(pageSource, /S201 X/);
  assert.match(pageSource, /S199 X/);
  assert.match(pageSource, /S202 X/);
  assert.match(pageSource, /Sugerir melhores chamados/);
  assert.match(pageSource, /Base de chamados/);
  assert.match(pageSource, /Itens por página/);
  assert.doesNotMatch(html, /Vistoria/);
  assert.match(html, /og-grid\.png/);
  assert.match(pageSource, /CRITÉRIOS DA SUGESTÃO/);
  assert.match(pageSource, /SortHeader/);
  assert.match(pageSource, /complaintCount/);
  assert.match(pageSource, /setSuggested/);
});

test("mantém a ponte do Procesa somente leitura e limitada aos serviços atendidos", async () => {
  const manifest = JSON.parse(await readFile(new URL("extension/manifest.json", root), "utf8"));
  const bridge = await readFile(new URL("extension/procesa-bridge.js", root), "utf8");
  const landingBridge = await readFile(new URL("extension/rotaos-bridge.js", root), "utf8");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://procesama.linedata.com.br/*"]);
  assert.match(bridge, /Somente S025, S199, S200, S201 e S202/);
  assert.match(bridge, /supportedRows/);
  assert.match(bridge, /complaintCount/);
  assert.match(bridge, /rotaosSyncSession/);
  assert.match(landingBridge, /MAX_DELIVERY_ATTEMPTS = 40/);
  assert.match(landingBridge, /ROTAOS_IMPORT_ACCEPTED/);
  assert.doesNotMatch(bridge, /password|senha|submit\(\)/i);
  await access(new URL("public/downloads/rotaos-ponte-procesa.zip", root));
});

test("prepara o Supabase para histórico e consultas do grid", async () => {
  const schema = await readFile(new URL("supabase/schema.sql", root), "utf8");
  const client = await readFile(new URL("lib/supabase.ts", root), "utf8");
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /owner_id = auth\.uid\(\)/);
  assert.match(schema, /unique \(owner_id, external_id\)/);
  assert.match(schema, /service_code in \('S025', 'S199 X', 'S200 X', 'S201 X', 'S202 X'\)/);
  assert.match(schema, /complaint_count/);
  assert.match(schema, /order_events/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /service_role|sb_secret_/i);
});

test("documenta banco como fonte de verdade", async () => {
  const architecture = await readFile(new URL("docs/architecture.md", root), "utf8");
  assert.match(architecture, /grid do RotaOS consulta o PostgreSQL/);
  assert.match(architecture, /API autenticada/);
  assert.match(architecture, /não contém senha do Procesa/);
});
