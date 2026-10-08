// COMPLETE CRM · pretraga GIF-ova za tim chat (Giphy). Radi kad postoji tajna GIPHY_API_KEY.
const KEY = Deno.env.get('GIPHY_API_KEY') || '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!KEY) return json({ configured: false, items: [] });
  let b: any = {}; try { b = await req.json(); } catch (_) { /* */ }
  const q = String(b.q || '').trim().slice(0, 60), off = Math.max(0, Number(b.offset) || 0);
  const u = q ? `https://api.giphy.com/v1/gifs/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=24&offset=${off}&rating=pg-13&lang=sr`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${KEY}&limit=24&offset=${off}&rating=pg-13`;
  try {
    const r = await fetch(u); const d = await r.json();
    const items = (d.data || []).map((g: any) => ({ id: g.id, title: g.title, preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url, url: g.images?.downsized?.url || g.images?.fixed_width?.url, w: Number(g.images?.fixed_width?.width) || 200, h: Number(g.images?.fixed_width?.height) || 150 }));
    return json({ configured: true, items });
  } catch (e) { return json({ configured: true, items: [], error: String(e) }, 502); }
});
