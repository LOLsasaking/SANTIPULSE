import { admin } from './auth.js';

export function db() {
  return admin();
}

export async function listRows(table, userId, order = 'created_at', limit = 50) {
  const sb = db();
  if (!sb) return { rows: [], configured: false, error: null };
  let q = sb.from(table).select('*').eq('owner_id', userId).limit(limit);
  if (order) q = q.order(order, { ascending: false });
  const { data, error } = await q;
  return { rows: data || [], configured: true, error };
}

export async function insertRow(table, values) {
  const sb = db();
  if (!sb) return { row: { id: 'local-preview', ...values }, configured: false, error: null };
  const { data, error } = await sb.from(table).insert(values).select('*').single();
  return { row: data || null, configured: true, error };
}

export async function upsertRow(table, values, onConflict = 'id') {
  const sb = db();
  if (!sb) return { row: { id: values.id || 'local-preview', ...values }, configured: false, error: null };
  const { data, error } = await sb.from(table).upsert(values, { onConflict }).select('*').single();
  return { row: data || null, configured: true, error };
}
