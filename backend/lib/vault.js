/* ============================================================
   Knowledge Vault data layer
   ------------------------------------------------------------
   Practical MVP: store client files/notes in Supabase, keep useful
   Spanish summaries, and provide compact context to AI prompts.
   ============================================================ */
import { admin } from './auth.js';

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
  if (error || !data?.length) return '';

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

  const summary = await summarizeVaultItem({ title, fileName, mimeType, contentText });
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
    console.error('[vault] save:', error.message);
    return { ok: false, error: 'save_failed', detail: error.message };
  }
  return { ok: true, item: data };
}

export async function deleteVaultItem(userId, id) {
  const sb = admin();
  if (!sb || !id) return false;
  const { data: item } = await sb.from('knowledge_vault_items')
    .select('storage_path')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (item?.storage_path) {
    await sb.storage.from(BUCKET).remove([item.storage_path]).catch(() => {});
  }
  const { error } = await sb.from('knowledge_vault_items')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  return !error;
}

export async function vaultReadiness() {
  const sb = admin();
  if (!sb) return { status: 'missing', message: 'Falta Supabase service role' };

  const table = await sb.from('knowledge_vault_items')
    .select('id', { head: true, count: 'exact' })
    .limit(1);
  if (table.error) {
    return { status: 'error', message: 'Tabla knowledge_vault_items no encontrada' };
  }

  try {
    const bucket = await sb.storage.getBucket(BUCKET);
    if (bucket.error) {
      return { status: 'error', message: `Bucket ${BUCKET} no encontrado` };
    }
  } catch {
    return { status: 'error', message: `Bucket ${BUCKET} no verificado` };
  }
  return { status: 'connected', message: 'Boveda lista' };
}

async function summarizeVaultItem({ title, fileName, mimeType, contentText }) {
  const fallback = localSummary({ title, fileName, mimeType, contentText });
  if (!process.env.OPENAI_API_KEY || !contentText) return fallback;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: 'Resume documentos de negocio en espanol para entrenar una recepcionista IA. Devuelve solo un resumen practico.' },
          { role: 'user', content: `Titulo: ${title}\nArchivo: ${fileName || 'nota'}\nTipo: ${mimeType || 'texto'}\n\n${contentText.slice(0, MAX_TEXT)}` },
        ],
      }),
    });
    const json = await resp.json().catch(() => ({}));
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
