import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { imageUrl, imageBase64, mimeType, proxyImageUrl, userId } = await req.json()
    const key = Deno.env.get('GOOGLE_VISION_KEY')

    // ── 模式2：代理外部图片到 Supabase Storage ──────────────
    if (proxyImageUrl && userId) {
      const imgRes = await fetch(proxyImageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (!imgRes.ok) throw new Error('图片下载失败')
      const blob = await imgRes.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const path = `volantino/web/${userId}/${Date.now()}.${ext}`

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      const { data: upload, error: upErr } = await supabase.storage
        .from('post-images')
        .upload(path, blob, { contentType: blob.type, upsert: true })
      if (upErr) throw new Error('上传失败：' + upErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('post-images').getPublicUrl(upload.path)

      return new Response(JSON.stringify({ proxyUrl: publicUrl }), { headers: CORS })
    }

    // ── 模式1：Vision API 识别 ────────────────────────────────
    const imageSource = imageBase64
      ? { content: imageBase64 }
      : { source: { imageUri: imageUrl } }

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: imageSource,
            features: [
              { type: 'WEB_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'LABEL_DETECTION', maxResults: 5 },
            ]
          }]
        })
      }
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Vision API 错误')

    const result = data.responses?.[0]
    const web = result?.webDetection

    const productName = web?.bestGuessLabels?.[0]?.label || ''
    // 图片优先级：完全匹配 > 部分匹配 > 视觉相似（兜底，保证总有图可选）
    const pick = arr => (arr || []).map(i => i.url).filter(u => u?.startsWith('http'))
    const fullMatches = pick(web?.fullMatchingImages)
    const partialMatches = pick(web?.partialMatchingImages)
    const similarMatches = pick(web?.visuallySimilarImages)
    // 去重后按优先级补足到 6 张
    const webImages = [...new Set([...fullMatches, ...partialMatches, ...similarMatches])].slice(0, 6)

    const entities = (web?.webEntities || [])
      .filter(e => e.score > 0.3 && e.description)
      .map(e => e.description).slice(0, 5)

    const labels = (result?.labelAnnotations || [])
      .filter(l => l.score > 0.7)
      .map(l => l.description).slice(0, 3)

    // 从 TEXT_DETECTION 提取包装上的品牌/产品名（取前2-3行有意义的文字）
    const rawText = result?.textAnnotations?.[0]?.description || ''
    const textLines = rawText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && l.length < 40 && /[A-Za-z]/.test(l))
      .slice(0, 3)
    const textName = textLines.join(' ').trim()

    // 商品名优先级：bestGuessLabel > entity > OCR文字 > labels首个
    const bestEntity = entities[0] || ''
    const resolvedName = productName || bestEntity || textName || labels[0] || ''

    console.log('Vision result:', { resolvedName, textName, entities, webImagesCount: webImages.length })

    return new Response(JSON.stringify({
      productName: resolvedName,
      webImages,
      entities,
      labels,
      textLines, // 原始 OCR 文字行，供前端展示
    }), { headers: CORS })

  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: CORS
    })
  }
})
