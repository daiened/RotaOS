import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  processaTeam?: string;
  requestedAt: string;
  service: string;
  serviceCode?: string;
  detail: string;
  syncState: string;
  complaintCount?: number;
  latestComplaintAt?: string;
  sourceHash: string;
  lastSeenAt: string;
  changedAt?: string;
};

export type FileImportOrder = {
  id: string;
  accountCode: string;
  address: string;
  neighborhood: string;
  region: string;
  latitude?: number;
  longitude?: number;
  complement: string;
  requestedAt: string;
  serviceType: string;
  observation: string;
  sourceHash: string;
  fileName: string;
  importedAt: string;
};

export type StoredTeam = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: string[];
  capacity: number;
};

type ServiceOrderRow = {
  internal_id?: string | null;
  external_id: string;
  address: string;
  neighborhood: string;
  region: string;
  source_team?: string | null;
  requested_at?: string | null;
  service: string;
  service_code?: string | null;
  detail: string;
  sync_state: string;
  complaint_count?: number | null;
  source_hash: string;
  last_seen_at: string;
  changed_at?: string | null;
  latest_complaint_at?: string | null;
};

type FileImportOrderRow = {
  external_id: string;
  account_code?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  complement?: string | null;
  requested_at?: string | null;
  service_type?: string | null;
  observation?: string | null;
  source_hash?: string | null;
  file_name?: string | null;
  imported_at?: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

function toIsoDateTime(value: string) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return value || null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] ?? 12), Number(match[5] ?? 0), Number(match[6] ?? 0)).toISOString();
}

export function isSupabaseConfigured() {
  return Boolean(url && publishableKey);
}

export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("O banco ainda não foi conectado.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}

export async function currentUserEmail() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function loadOrders(): Promise<StoredOrder[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const pageSize = 1000;
  const loadAll = async (columns: string) => {
    const records: ServiceOrderRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("service_orders")
        .select(columns)
        .order("requested_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = (data ?? []) as unknown as ServiceOrderRow[];
      records.push(...batch);
      if (batch.length < pageSize) return records;
    }
  };

  let data: ServiceOrderRow[];
  try {
    data = await loadAll("external_id,internal_id,address,neighborhood,region,source_team,requested_at,service,service_code,detail,sync_state,complaint_count,source_hash,last_seen_at,changed_at,latest_complaint_at");
  } catch (error) {
    if (!(error instanceof Error) || !/source_team/i.test(error.message)) throw error;
    data = await loadAll("external_id,internal_id,address,neighborhood,region,requested_at,service,service_code,detail,sync_state,complaint_count,source_hash,last_seen_at,changed_at,latest_complaint_at");
  }
  return data.map((row) => ({
    internalId: row.internal_id ?? "",
    id: row.external_id,
    address: row.address,
    neighborhood: row.neighborhood,
    region: row.region,
    processaTeam: row.source_team ?? undefined,
    requestedAt: row.requested_at ?? "",
    service: row.service,
    serviceCode: row.service_code ?? undefined,
    detail: row.detail,
    syncState: row.sync_state,
    complaintCount: row.complaint_count ?? 0,
    latestComplaintAt: row.latest_complaint_at ?? undefined,
    sourceHash: row.source_hash,
    lastSeenAt: row.last_seen_at,
    changedAt: row.changed_at ?? undefined,
  }));
}

export async function saveOrders(orders: StoredOrder[], summary: Record<string, number>) {
  const supabase = getSupabase();
  if (!supabase || !orders.length) return;
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Entre no RotaOS antes de sincronizar.");

  const rows = orders.map((order) => ({
    owner_id: ownerId,
    external_id: order.id,
    internal_id: order.internalId || null,
    address: order.address,
    neighborhood: order.neighborhood,
    region: order.region,
    source_team: order.processaTeam ?? null,
    requested_at: toIsoDateTime(order.requestedAt),
    service: order.service,
    service_code: order.serviceCode ?? null,
    detail: order.detail,
    sync_state: order.syncState,
    complaint_count: order.complaintCount ?? 0,
    source_hash: order.sourceHash,
    last_seen_at: order.lastSeenAt,
    changed_at: order.changedAt ?? null,
    latest_complaint_at: order.latestComplaintAt ? toIsoDateTime(order.latestComplaintAt) : null,
  }));

  const saveInBatches = async (payload: unknown[]) => {
    const batchSize = 250;
    for (let from = 0; from < payload.length; from += batchSize) {
      const { error } = await supabase
        .from("service_orders")
        .upsert(payload.slice(from, from + batchSize) as never, { onConflict: "owner_id,external_id" });
      if (error) return error;
    }
    return null;
  };

  let error = await saveInBatches(rows);
  if (error && /source_team/i.test(error.message)) {
    const legacyRows = rows.map(({ source_team, ...order }) => { void source_team; return order; });
    error = await saveInBatches(legacyRows);
  }
  if (error) throw error;

  const { error: syncError } = await supabase.from("sync_runs").insert({
    owner_id: ownerId,
    captured_count: orders.length,
    new_count: summary.new ?? 0,
    changed_count: summary.updated ?? 0,
    unchanged_count: summary.reviewed ?? 0,
    complaint_count: summary.complaint ?? 0,
  });
  if (syncError) throw syncError;
}

export async function loadFileImportOrders(): Promise<FileImportOrder[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("file_import_orders")
    .select("external_id,account_code,address,neighborhood,region,latitude,longitude,complement,requested_at,service_type,observation,source_hash,file_name,imported_at")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as FileImportOrderRow[]).map((row) => ({
    id: row.external_id,
    accountCode: row.account_code ?? "",
    address: row.address ?? "",
    neighborhood: row.neighborhood ?? "",
    region: row.region ?? "",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    complement: row.complement ?? "",
    requestedAt: row.requested_at ?? "",
    serviceType: row.service_type ?? "",
    observation: row.observation ?? "",
    sourceHash: row.source_hash ?? "",
    fileName: row.file_name ?? "",
    importedAt: row.imported_at ?? "",
  }));
}

export async function replaceFileImportOrders(orders: FileImportOrder[]) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Entre no RotaOS antes de importar o arquivo.");

  const { error: deleteError } = await supabase.from("file_import_orders").delete().eq("owner_id", ownerId);
  if (deleteError) throw deleteError;
  if (!orders.length) return;

  const rows = orders.map((order) => ({
    owner_id: ownerId,
    external_id: order.id,
    account_code: order.accountCode || null,
    address: order.address,
    neighborhood: order.neighborhood,
    region: order.region || null,
    latitude: order.latitude ?? null,
    longitude: order.longitude ?? null,
    complement: order.complement || null,
    requested_at: toIsoDateTime(order.requestedAt),
    service_type: order.serviceType,
    observation: order.observation,
    source_hash: order.sourceHash,
    file_name: order.fileName,
    imported_at: order.importedAt,
  }));
  const batchSize = 250;
  for (let from = 0; from < rows.length; from += batchSize) {
    const { error } = await supabase.from("file_import_orders").upsert(rows.slice(from, from + batchSize), { onConflict: "owner_id,external_id" });
    if (error) throw error;
  }
}

export async function saveFileImportGeocodes(locations: Array<{ id: string; latitude: number; longitude: number }>) {
  const supabase = getSupabase();
  if (!supabase || !locations.length) return;
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Entre no RotaOS antes de salvar as localizacoes.");
  for (const location of locations) {
    const { error } = await supabase
      .from("file_import_orders")
      .update({ latitude: location.latitude, longitude: location.longitude })
      .eq("owner_id", ownerId)
      .eq("external_id", location.id);
    if (error) throw error;
  }
}

export async function clearFileImportOrders() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Entre no RotaOS antes de limpar a importação.");
  const { error } = await supabase.from("file_import_orders").delete().eq("owner_id", ownerId);
  if (error) throw error;
}

export async function loadTeams(): Promise<StoredTeam[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("teams")
    .select("team_key,name,color,active,services,capacity")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.team_key,
    name: row.name,
    color: row.color,
    active: row.active,
    services: row.services ?? [],
    capacity: row.capacity ?? 6,
  }));
}

export async function saveTeams(teams: StoredTeam[]) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Entre no RotaOS antes de salvar as equipes.");
  const { error } = await supabase.from("teams").upsert(
    teams.map((team) => ({
      owner_id: ownerId,
      team_key: team.id,
      name: team.name,
      color: team.color,
      active: team.active,
      services: team.services,
      capacity: team.capacity,
    })),
    { onConflict: "owner_id,team_key" },
  );
  if (error) throw error;
}
