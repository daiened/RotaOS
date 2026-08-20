import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
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

export type StoredTeam = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  services: string[];
  capacity: number;
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
  const { data, error } = await supabase
    .from("service_orders")
    .select("external_id,internal_id,address,neighborhood,region,requested_at,service,service_code,detail,sync_state,complaint_count,source_hash,last_seen_at,changed_at,latest_complaint_at")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    internalId: row.internal_id ?? "",
    id: row.external_id,
    address: row.address,
    neighborhood: row.neighborhood,
    region: row.region,
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

  const { error } = await supabase
    .from("service_orders")
    .upsert(rows, { onConflict: "owner_id,external_id" });
  if (error) throw error;

  await supabase.from("sync_runs").insert({
    owner_id: ownerId,
    captured_count: orders.length,
    new_count: summary.new ?? 0,
    changed_count: summary.updated ?? 0,
    unchanged_count: summary.reviewed ?? 0,
    complaint_count: summary.complaint ?? 0,
  });
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
