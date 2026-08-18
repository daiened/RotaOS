import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StoredOrder = {
  internalId: string;
  id: string;
  address: string;
  neighborhood: string;
  region: string;
  requestedAt: string;
  service: string;
  detail: string;
  deadlineDays: number;
  syncState: string;
  sourceHash: string;
  lastSeenAt: string;
  changedAt?: string;
  complaintAt?: string;
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
  if (!supabase) throw new Error("O banco DEV ainda não foi conectado.");
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
    .select("external_id,internal_id,address,neighborhood,region,requested_at,service,detail,deadline_days,sync_state,source_hash,last_seen_at,changed_at,complaint_at")
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
    detail: row.detail,
    deadlineDays: row.deadline_days ?? 2,
    syncState: row.sync_state,
    sourceHash: row.source_hash,
    lastSeenAt: row.last_seen_at,
    changedAt: row.changed_at ?? undefined,
    complaintAt: row.complaint_at ?? undefined,
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
    requested_at: order.requestedAt || null,
    service: order.service,
    detail: order.detail,
    deadline_days: order.deadlineDays,
    sync_state: order.syncState,
    source_hash: order.sourceHash,
    last_seen_at: order.lastSeenAt,
    changed_at: order.changedAt ?? null,
    complaint_at: order.complaintAt ?? null,
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
