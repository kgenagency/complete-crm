// COMPLETE CRM · dnevna kopija cele baze (HARIZMA + potkovice) u privatni GitHub repo.
// Svaki dan jedan commit: latest/<tabela>.json + _summary.json. Git istorija čuva svaki prethodni dan.
// Poziva je pg_cron (crm-backup-daily) sa tajnim zaglavljem x-crm-hook.
import { createClient } from 'npm:@supabase/supabase-js@2';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const HOOK = Deno.env.get('PUSH_HOOK_SECRET') || '';
const GH = Deno.env.get('GITHUB_BACKUP_TOKEN') || '';
const REPO = Deno.env.get('BACKUP_REPO') || 'kgenagency/complete-crm-backups';
const gh = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...init, headers: { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'complete-crm-backup', ...(init.headers || {}) } });
  const t = await r.text(); if (!r.ok) throw new Error(`GitHub ${r.status} ${path}: ${t.slice(0, 200)}`); return t ? JSON.parse(t) : {};
};
Deno.serve(async (req) => {
  if (!HOOK || req.headers.get('x-crm-hook') !== HOOK) return new Response('ne', { status: 401 });
  try {
    const { data: tables, error } = await db.rpc('h_backup_tables'); if (error) throw error;
    const now = new Date().toISOString(), day = now.slice(0, 10), counts: Record<string, number> = {}, entries: unknown[] = [];
    for (const row of tables as any[]) {
      const t = typeof row === 'string' ? row : row.h_backup_tables;
      const { data, error: e2 } = await db.rpc('h_backup_dump', { t }); if (e2) throw e2;
      const rows = (data as unknown[]) || []; counts[t] = rows.length;
      entries.push({ path: `latest/${t}.json`, mode: '100644', type: 'blob', content: JSON.stringify(rows, null, 1) });
    }
    entries.push({ path: 'latest/_summary.json', mode: '100644', type: 'blob', content: JSON.stringify({ exported_at: now, tables: counts }, null, 1) });
    const repo = await gh(''); const branch = repo.default_branch || 'main';
    const ref = await gh(`/git/ref/heads/${branch}`); const head = ref.object.sha;
    const commit = await gh(`/git/commits/${head}`);
    const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    if (tree.sha === commit.tree.sha) return new Response(JSON.stringify({ ok: true, unchanged: true, counts }), { headers: { 'Content-Type': 'application/json' } });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: `Kopija ${day} (${Object.keys(counts).length} tabela, ${total} redova)`, tree: tree.sha, parents: [head] }) });
    await gh(`/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return new Response(JSON.stringify({ ok: true, commit: c.sha, counts }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
});
