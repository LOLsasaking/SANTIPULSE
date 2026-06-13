/* ============================================================
   Knowledge Vault data layer
   ------------------------------------------------------------
   Practical MVP: store client files/notes in Supabase, keep useful
   Spanish summaries, and provide compact context to AI prompts.
   ============================================================ */
import { admin } from './auth.js';
import { logApiCost } from './db.js';
import { randomUUID } from 'node:crypto';

const BUCKET = process.env.VAULT_BUCKET || 'knowledge-vault';
const MAX_BYTES = Number(process.env.VAULT_MAX_BYTES || 5 * 1024 * 1024);
const MAX_TEXT = 12000;
const CONTEXT_LIMIT = 4200;

export function vaultBucket() {
  return BUCKET;
}

export function vaultConfigured() {
  return !!admin();
}

export async function listVaultItems(userId, limit = 50) {
  const sb = admin();
  if (!sb) return [];
  const { data, error } = await sb.from('knowledge_vault_items')
    .select('id,title,kind,file_name,mime_type,summary,status,error_message,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (tableMissing(error)) return listManifestItems(sb, userId, limit);
    console.error('[vault] list:', error.message);
    return [];
  }
  return data || [];
}

export async function getVaultContext(userId, limit = 6) {
  const sb = admin();
  if (!sb) return '';
  const { data, error } = await sb.from('knowledge_vault_items')
    .select('title,kind,file_name,summary,content_text,updated_at')
    .eq('user_id', userId)
    .in('status', ['ready', 'metadata_only'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (tableMissing(error)) return manifestContext(sb, userId, limit);
    return '';
  }
  if (!data?.length) return '';

  const chunks = data.map((item) => {
    const body = cleanText(item.summary || item.content_text || '').slice(0, 650);
    const label = item.title || item.file_name || 'Documento';
    return `- ${label}: ${body}`;
  }).filter(Boolean);
  return chunks.join('\n').slice(0, CONTEXT_LIMIT);
}

export async function saveVaultItem(userId, input = {}) {
  const sb = admin();
  if (!sb) return { ok: false, error: 'db_not_configured' };

  const fileName = cleanFileName(input.fileName || input.file_name || '');
  const mimeType = clean(input.mimeType || input.mime_type || 'text/plain', 120);
  const title = clean(input.title || fileName || 'Nota del negocio', 180);
  const notes = cleanText(input.notes || input.text || input.content || '');
  const decoded = decodeFile(input.fileBase64 || input.file_base64 || '', mimeType);

  if (decoded?.error) return { ok: false, error: decoded.error };
  if (!notes && !decoded?.text && !decoded?.buffer) return { ok: false, error: 'empty_vault_item' };

  let storagePath = null;
  let status = 'ready';
  let errorMessage = null;
  const contentText = cleanText([notes, decoded?.text].filter(Boolean).join('\n\n')).slice(0, MAX_TEXT);

  if (decoded?.buffer && fileName) {
    storagePath = `${userId}/${Date.now()}-${fileName}`;
    const { error } = await sb.storage.from(BUCKET).upload(storagePath, decoded.buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true,
    });
    if (error) {
      status = 'metadata_only';
      errorMessage = `Archivo no subido: ${error.message}`;
      storagePath = null;
    }
  }

  const summary = await summarizeVaultItem({ title, fileName, mimeType, contentText, userId });
  const row = {
    user_id: userId,
    title,
    kind: decoded?.buffer ? 'file' : 'note',
    file_name: fileName || null,
    mime_type: decoded?.buffer ? mimeType : null,
    storage_path: storagePath,
    content_text: contentText || null,
    summary,
    status,
    error_message: errorMessage,
  };

  const { data, error } = await sb.from('knowledge_vault_items')
    .insert(row)
    .select('id,title,kind,file_name,mime_type,summary,status,error_message,created_at,updated_at')
    .single();
  if (error) {
    if (tableMissing(error)) return saveManifestItem(sb, userId, row);
    console.error('[vault] save:', error.message);
    return { ok: false, error: 'save_failed', detail: error.message };
  }
  return { ok: true, item: data };
}

export async function deleteVaultItem(userId, id) {
  const sb = admin();
  if (!sb || !id) return false;
  const { data: item, error: getError } = await sb.from('knowledge_vault_items')
    .select('storage_path')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (tableMissing(getError)) return deleteManifestItem(sb, userId, id);
  if (item?.storage_path) {
    await sb.storage.from(BUCKET).remove([item.storage_path]).catch(() => {});
  }
  const { error } = await sb.from('knowledge_vault_items')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (tableMissing(error)) return deleteManifestItem(sb, userId, id);
  return !error;
}

export async function vaultReadiness() {
  const sb = admin();
  if (!sb) return { status: 'missing', message: 'Falta Supabase service role' };

  const table = await sb.from('knowledge_vault_items')
    .select('id')
    .limit(1);
  try {
    const bucket = await sb.storage.getBucket(BUCKET);
    if (bucket.error) {
      return { status: 'error', message: `Bucket ${BUCKET} no encontrado` };
    }
  } catch {
    return { status: 'error', message: `Bucket ${BUCKET} no verificado` };
  }
  if (table.error) {
    if (tableMissing(table.error)) {
      return { status: 'connected', message: 'Boveda lista (Storage manifest)' };
    }
    return { status: 'error', message: table.error.message || 'Boveda no verificada' };
  }
  return { status: 'connected', message: 'Boveda lista' };
}

async function listManifestItems(sb, userId, limit = 50) {
  const items = await readManifest(sb, userId);
  return items
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, limit)
    .map(publicVaultItem);
}

async function manifestContext(sb, userId, limit = 6) {
  const items = await readManifest(sb, userId);
  const chunks = items
    .filter((item) => ['ready', 'metadata_only'].includes(item.status || 'ready'))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, limit)
    .map((item) => {
      const body = cleanText(item.summary || item.content_text || '').slice(0, 650);
      const label = item.title || item.file_name || 'Documento';
      return body ? `- ${label}: ${body}` : '';
    })
    .filter(Boolean);
  return chunks.join('\n').slice(0, CONTEXT_LIMIT);
}

async function saveManifestItem(sb, userId, row) {
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    title: row.title,
    kind: row.kind || 'note',
    file_name: row.file_name || null,
    mime_type: row.mime_type || null,
    storage_path: row.storage_path || null,
    content_text: row.content_text || null,
    summary: row.summary || null,
    status: row.status || 'ready',
    error_message: row.error_message || null,
    created_at: now,
    updated_at: now,
  };
  const items = await readManifest(sb, userId);
  items.unshift(item);
  const ok = await writeManifest(sb, userId, items);
  if (!ok) return { ok: false, error: 'save_failed', detail: 'manifest_write_failed' };
  return { ok: true, item: publicVaultItem(item) };
}

async function deleteManifestItem(sb, userId, id) {
  const items = await readManifest(sb, userId);
  const item = items.find((x) => x.id === id);
  if (!item) return false;
  if (item.storage_path) await sb.storage.from(BUCKET).remove([item.storage_path]).catch(() => {});
  return writeManifest(sb, userId, items.filter((x) => x.id !== id));
}

async function readManifest(sb, userId) {
  const path = manifestPath(userId);
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) {
    if (/not found|does not exist|404/i.test(error.message || '')) return [];
    console.error('[vault] manifest read:', error.message);
    return [];
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (err) {
    console.error('[vault] manifest parse:', err.message);
    return [];
  }
}

async function writeManifest(sb, userId, items) {
  const path = manifestPath(userId);
  const payload = Buffer.from(JSON.stringify({ version: 1, items }, null, 2));
  const { error } = await sb.storage.from(BUCKET).upload(path, payload, {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) console.error('[vault] manifest write:', error.message);
  return !error;
}

function manifestPath(userId) {
  return `_manifests/${String(userId).replace(/[^a-z0-9-]/gi, '')}.json`;
}

function publicVaultItem(item) {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    file_name: item.file_name,
    mime_type: item.mime_type,
    summary: item.summary,
    status: item.status,
    error_message: item.error_message,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function tableMissing(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return /PGRST205|schema cache|knowledge_vault_items|relation .* does not exist|could not find the table/i.test(text);
}

async function summarizeVaultItem({ title, fileName, mimeType, contentText, userId = null }) {
  const fallback = localSummary({ title, fileName, mimeType, contentText });
  if (!process.env.OPENAI_API_KEY || !contentText) return fallback;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: 'Resume documentos de negocio en espanol para entrenar una recepcionista IA. Devuelve solo un resumen practico.' },
          { role: 'user', content: `Titulo: ${title}\nArchivo: ${fileName || 'nota'}\nTipo: ${mimeType || 'texto'}\n\n${contentText.slice(0, MAX_TEXT)}` },
        ],
      }),
    });
    const json = await resp.json().catch(() => ({}));
    if (json && json.usage) logApiCost({ userId, provider: 'openai', model, usage: json.usage });
    const text = json?.choices?.[0]?.message?.content;
    return cleanText(text || fallback).slice(0, 1600);
  } catch (err) {
    console.error('[vault] summarize:', err.message);
    return fallback;
  }
}

function localSummary({ title, fileName, mimeType, contentText }) {
  const source = fileName || title || 'documento';
  const body = cleanText(contentText || '').split(/\n+/).slice(0, 4).join(' ');
  if (body) return `${source}: ${body}`.slice(0, 1000);
  return `${source}: archivo guardado en la Boveda para contexto del negocio (${mimeType || 'sin tipo'}).`;
}

function decodeFile(value, mimeType) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
  let buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return { error: 'invalid_file' };
  }
  if (!buffer.length) return { error: 'invalid_file' };
  if (buffer.length > MAX_BYTES) return { error: 'file_too_large' };
  const text = isTextMime(mimeType) ? buffer.toString('utf8').slice(0, MAX_TEXT) : '';
  return { buffer, text };
}

function isTextMime(mimeType) {
  return /text|json|csv|markdown|xml|yaml|javascript/i.test(String(mimeType || ''));
}

function clean(value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function cleanText(value) {
  return String(value == null ? '' : value).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function cleanFileName(value) {
  return clean(value, 180).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
}
