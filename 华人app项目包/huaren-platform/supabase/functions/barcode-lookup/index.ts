import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
const UA = { 'User-Agent': 'ZaiYi/1.0 (community app; info@zaiyi.eu)' }

// Open Food/Beauty/Products Facts 同一套接口，换域名即可
async function offLike(host: string, ean: string) {
  try {
    const r = await fetch(
      `https://${host}/api/v2/product/${ean}.json?fields=product_name,product_name_zh,brands,image_front_url,image_url`,
      { headers: UA },
    )
    const d = await r.json()
    if (d?.status === 1 && d.product) {
      const p = d.product
      const brand = (p.brands || '').split(',')[0]?.trim()
      const name = [brand, p.product_name_zh || p.product_name].filter(Boolean).join(' ').trim()
      const image = p.image_front_url || p.image_url || null
      if (name || image) return { name, image, source: host }
    }
  } catch (_) {}
  return null
}

// UPCitemdb 免费试用：电子/百货/护肤等全品类兜底
async function upcitemdb(ean: string) {
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`, { headers: UA })
    const d = await r.json()
    const it = d?.items?.[0]
    if (it) return { name: it.title || '', image: (it.images || [])[0] || null, source: 'upcitemdb' }
  } catch (_) {}
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { ean } = await req.json()
    const code = String(ean || '').replace(/\D/g, '')
    if (code.length < 8) {
      return new Response(JSON.stringify({ found: false, error: '条码无效' }), { headers: CORS })
    }
    // 依次查：食品 → 美妆日化 → 通用百货 → 全品类兜底
    const hit =
      (await offLike('world.openfoodfacts.org', code)) ||
      (await offLike('world.openbeautyfacts.org', code)) ||
      (await offLike('world.openproductsfacts.org', code)) ||
      (await upcitemdb(code))

    if (!hit) return new Response(JSON.stringify({ found: false, ean: code }), { headers: CORS })
    return new Response(JSON.stringify({ found: true, ean: code, ...hit }), { headers: CORS })
  } catch (e) {
    return new Response(JSON.stringify({ found: false, error: e.message }), { status: 500, headers: CORS })
  }
})
