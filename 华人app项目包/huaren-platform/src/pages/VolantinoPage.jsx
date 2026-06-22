import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

// ── AI 拍照识别商品（视频流 + 一键拍照，无确认步骤）──────────
function AIScanner({ onFound, onClose }) {
  const videoRef = useRef()
  const controlsRef = useRef()        // zxing 扫描控制器
  const handlingRef = useRef(false)   // 防止重复查库
  const lastEanRef = useRef('')       // 同一条码不重复查
  const [status, setStatus] = useState('starting')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      // 后置摄像头 + 实时扫条码；同一视频流也供"拍照识别"兜底使用
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (result) => { if (result) onBarcode(result.getText()) }
      )
      controlsRef.current = controls
      setStatus('ready')
    } catch { setStatus('error') }
  }

  function stopCamera() {
    try { controlsRef.current?.stop() } catch {}
  }

  // 扫到条码 → 查商品库（食品 / 美妆日化 / 百货）→ 拿到品名+官方图
  async function onBarcode(raw) {
    if (handlingRef.current) return
    const ean = String(raw || '').replace(/\D/g, '')
    if (ean.length < 8 || ean === lastEanRef.current) return
    lastEanRef.current = ean
    handlingRef.current = true
    setStatus('looking')
    try {
      const { data, error } = await supabase.functions.invoke('barcode-lookup', { body: { ean } })
      if (error) throw error
      if (data?.found) {
        stopCamera()
        onFound({ product_name: data.name || '', webImages: data.image ? [data.image] : [] })
        onClose()
        return
      }
      setStatus('notfound_code')   // 条码没查到，可改用拍照识别
      handlingRef.current = false
    } catch {
      setStatus('notfound_code')
      handlingRef.current = false
    }
  }

  async function handleCapture() {
    const v = videoRef.current
    if (!v || v.readyState < 2) return
    setStatus('analyzing')

    // 从视频流截帧（视频帧不是 HEIC，canvas 可以正常截取）
    const MAX = 800
    const scale = Math.min(1, MAX / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    const b64 = c.toDataURL('image/jpeg', 0.85).split(',')[1]

    try {
      const { data, error } = await supabase.functions.invoke('vision-product', {
        body: { imageBase64: b64 }
      })
      if (error) throw error
      const name = data?.productName || data?.entities?.[0] || data?.textLines?.[0] || ''
      const imgs = data?.webImages || []
      if (name || imgs.length > 0) {
        stopCamera()
        onFound({ product_name: name, webImages: imgs })
        onClose()
      } else {
        setStatus('notfound')
      }
    } catch { setStatus('notfound') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>📷 对准条码自动识别 · 或拍照</div>
        <button onClick={() => { stopCamera(); onClose() }}
          style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
            width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} muted playsInline autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* 取景框 */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 300, height: 180, borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
            border: '2px solid rgba(255,255,255,.8)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 13, opacity: .85 }}>
          {status === 'starting' && '摄像头启动中…'}
          {status === 'ready' && '把商品条码对准框内（自动识别），或点下方📸拍照'}
          {status === 'looking' && '🔎 查询商品库…'}
          {status === 'analyzing' && '🤖 AI识别中…'}
          {status === 'notfound_code' && '该条码未收录，点下方📸拍照识别试试'}
          {status === 'notfound' && '未识别到，请调整角度或光线再试'}
          {status === 'error' && '❌ 无法访问摄像头，请检查权限'}
        </div>
      </div>

      {/* 拍照按钮 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        <button onClick={handleCapture}
          disabled={status === 'analyzing' || status === 'looking' || status === 'starting'}
          style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff',
            background: (status === 'analyzing' || status === 'looking') ? '#555' : '#C53A2E',
            cursor: 'pointer', fontSize: 28, transition: 'background .2s' }}>
          {(status === 'analyzing' || status === 'looking') ? '⏳' : '📸'}
        </button>
      </div>
    </div>
  )
}

// ── A4 横版布局 ──────────────────────────────────────────────
async function drawCardLandscape(ctx, W, H, data, merchant, isIt, brandName) {
  ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, W, H)
  const LP = 30 // padding

  // 左侧：顶部品牌条 + 图片
  ctx.fillStyle = '#C53A2E'; ctx.fillRect(0, 0, W, 80)
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(46, 40, 26, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'
  ctx.fillText('ZY', 46, 46)
  ctx.font = 'bold 36px Arial'; ctx.textAlign = 'left'; ctx.fillText(brandName, 84, 52)
  ctx.font = 'bold 24px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.85)'
  ctx.fillText(isIt ? 'OFFERTA SPECIALE' : '特价优惠', W - LP, 52)
  ctx.textAlign = 'left'

  // 图片区（左半）
  const imgX = LP, imgY = 90, imgW = Math.round(W * 0.48), imgH = H - 80 - 70
  if (data.product_image_url) {
    try {
      const img = new Image(); img.crossOrigin = 'anonymous'
      await new Promise((r,j)=>{ img.onload=r; img.onerror=j; img.src=data.product_image_url })
      const s = Math.min(imgW/img.width, imgH/img.height)
      const iw=img.width*s, ih=img.height*s
      ctx.drawImage(img, imgX+(imgW-iw)/2, imgY+(imgH-ih)/2, iw, ih)
    } catch {}
  } else {
    ctx.fillStyle='#ECE7E0'; ctx.fillRect(imgX, imgY, imgW, imgH)
    ctx.fillStyle='#8C857C'; ctx.font='32px Arial'; ctx.textAlign='center'
    ctx.fillText(isIt?'📷 Foto':'📷 图片', imgX+imgW/2, imgY+imgH/2); ctx.textAlign='left'
  }

  // 垂直分隔线
  ctx.fillStyle='#ECE7E0'; ctx.fillRect(Math.round(W*0.5), 90, 2, H-160)

  // 右侧信息
  const RX = Math.round(W*0.5)+30, RW = W-Math.round(W*0.5)-50
  let ry = 130
  ctx.fillStyle='#1F1B18'; ctx.font='bold 48px Arial'
  const nl = wrapText(ctx, data.product_name||(isIt?'Nome prodotto':'商品名称'), RX, ry, RW, 58)
  ry += nl*58+16

  // 价格
  ctx.fillStyle='#F5F0E8'; roundRect(ctx, RX, ry, RW, 160, 14); ctx.fill()
  if (data.original_price) {
    ctx.fillStyle='#8C857C'; ctx.font='28px Arial'
    const ot=(isIt?'Prezzo: ':'原价：')+fmtPrice(data.original_price)
    ctx.fillText(ot, RX+14, ry+44)
    const tw=ctx.measureText(ot).width
    ctx.strokeStyle='#8C857C'; ctx.lineWidth=2
    ctx.beginPath(); ctx.moveTo(RX+14, ry+36); ctx.lineTo(RX+14+tw, ry+36); ctx.stroke()
  }
  if (data.discount_price) {
    ctx.fillStyle='#C53A2E'; ctx.font='bold 58px Arial'; ctx.fillText(fmtPrice(data.discount_price), RX+14, ry+140)
  } else if (data.discount_percent) {
    ctx.fillStyle='#C53A2E'; ctx.font='bold 64px Arial'; ctx.textAlign='center'
    ctx.fillText(`-${data.discount_percent}%`, RX+RW/2, ry+140); ctx.textAlign='left'
  }
  if (data.discount_percent && data.discount_price) {
    ctx.fillStyle='#2E6B4E'; ctx.beginPath(); ctx.arc(RX+RW-44, ry+80, 44, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle='#fff'; ctx.font='bold 26px Arial'; ctx.textAlign='center'
    ctx.fillText(`-${data.discount_percent}%`, RX+RW-44, ry+88); ctx.textAlign='left'
  }
  ry += 180

  // 有效期
  if (data.valid_until) {
    ctx.fillStyle='#1F1B18'; ctx.font='26px Arial'
    ctx.fillText((isIt?'⏰ Valido fino al: ':'⏰ 有效期至：')+new Date(data.valid_until).toLocaleDateString(isIt?'it-IT':'zh-CN'), RX, ry)
    ry += 44
  }
  // 描述
  if (data.description) {
    ctx.fillStyle='#5f594f'; ctx.font='24px Arial'
    wrapText(ctx, data.description, RX, ry, RW, 34); ry += 60
  }

  // 商家信息
  const shopName=merchant?.business_name, shopAddr=merchant?.address, shopPhone=merchant?.contact_phone, shopWechat=merchant?.contact_wechat
  if (shopName) {
    ctx.fillStyle='#ECE7E0'; ctx.fillRect(RX, ry, RW, 1); ry += 16
    ctx.fillStyle='#1F1B18'; ctx.font='bold 30px Arial'; ctx.fillText('🏪 '+shopName, RX, ry); ry+=40
    ctx.font='24px Arial'; ctx.fillStyle='#5f594f'
    if (shopAddr) { ctx.fillText('📍 '+shopAddr, RX, ry); ry+=34 }
    if (shopPhone) {
      ctx.fillStyle='#25D366'; ctx.beginPath(); ctx.arc(RX+14, ry-8, 14, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle='#fff'; ctx.font='bold 14px Arial'; ctx.textAlign='center'; ctx.fillText('W', RX+14, ry-3); ctx.textAlign='left'
      ctx.fillStyle='#5f594f'; ctx.font='24px Arial'; ctx.fillText(shopPhone, RX+34, ry); ry+=34
    }
    if (shopWechat) { ctx.fillText('💬 WeChat: '+shopWechat, RX, ry) }
  }

  // 底部品牌条
  ctx.fillStyle='#1F1B18'; ctx.fillRect(0, H-70, W, 70)
  ctx.fillStyle='#C53A2E'; ctx.fillRect(0, H-70, 8, 70)
  ctx.fillStyle='#2E6B4E'; ctx.fillRect(8, H-70, 8, 70)
  ctx.fillStyle='#fff'; ctx.font='bold 24px Arial'; ctx.textAlign='center'
  ctx.fillText(isIt?`${brandName} · zaiyi.eu  |  Piattaforma per cinesi in Italia`:`${brandName} · zaiyi.eu  |  意大利华人生活平台`, W/2, H-28)
  ctx.textAlign='left'
}

// ── Canvas 卡图渲染 ──────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split('')
  let line = '', lines = []
  for (const ch of words) {
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch } else line = test
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH))
  return lines.length
}

function fmtPrice(price, currency = 'EUR') {
  if (!price) return ''
  const n = parseFloat(price)
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency
}

async function drawCard(canvas, data, merchant, lang, format = 'a4p') {
  // 尺寸：A4竖 900×1273 | A4横 1273×900 | 手机 900×1600
  const dims = {
    'a4p':  { W: 900,  H: 1273 },
    'a4l':  { W: 1273, H: 900  },
    'phone':{ W: 900,  H: 1600 },
  }
  const { W, H } = dims[format] || dims['a4p']
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const isIt = lang === 'it'
  const brandName = isIt ? 'ZaiYi' : '在意'

  // A4 横版用不同布局
  if (format === 'a4l') {
    await drawCardLandscape(ctx, W, H, data, merchant, isIt, brandName)
    return
  }

  // ── 背景 ──
  ctx.fillStyle = '#FBFAF7'
  ctx.fillRect(0, 0, W, H)

  // ── 顶部品牌栏 ──
  ctx.fillStyle = '#C53A2E'
  ctx.fillRect(0, 0, W, 130)

  // ZY 圆圈
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath(); ctx.arc(70, 65, 38, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('ZY', 70, 74)

  // 在意
  ctx.font = 'bold 52px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(brandName, 125, 86)

  // 右侧标语
  const tagline = isIt ? 'OFFERTA SPECIALE' : '特价优惠'
  ctx.font = 'bold 36px Arial'
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(tagline, W - 40, 86)

  ctx.textAlign = 'left'

  // ── 商品图 ──
  const imgY = 150, imgH = 500
  if (data.product_image_url) {
    try {
      const img = new Image(); img.crossOrigin = 'anonymous'
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = data.product_image_url })
      const scale = Math.min(W / img.width, imgH / img.height)
      const iw = img.width * scale, ih = img.height * scale
      ctx.drawImage(img, (W - iw) / 2, imgY + (imgH - ih) / 2, iw, ih)
    } catch { /* 图片加载失败跳过 */ }
  } else {
    ctx.fillStyle = '#ECE7E0'
    ctx.fillRect(50, imgY, W - 100, imgH)
    ctx.fillStyle = '#8C857C'
    ctx.font = '40px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(isIt ? '📷 Aggiungi foto' : '📷 添加商品图', W / 2, imgY + imgH / 2)
    ctx.textAlign = 'left'
  }

  // ── 分隔线 ──
  ctx.fillStyle = '#ECE7E0'
  ctx.fillRect(50, 670, W - 100, 2)

  // ── 商品名 ──
  ctx.fillStyle = '#1F1B18'
  ctx.font = 'bold 56px Arial'
  const nameLines = wrapText(ctx, data.product_name || (isIt ? 'Nome prodotto' : '商品名称'), 50, 720, W - 100, 68)

  // ── 描述 ──
  if (data.description) {
    ctx.fillStyle = '#5f594f'
    ctx.font = '34px Arial'
    wrapText(ctx, data.description, 50, 720 + nameLines * 68 + 20, W - 100, 44)
  }

  // ── 价格区 ──
  const priceY = 920
  ctx.fillStyle = '#F5F0E8'
  roundRect(ctx, 50, priceY, W - 100, 220, 20)
  ctx.fill()

  if (data.original_price) {
    ctx.fillStyle = '#8C857C'
    ctx.font = '38px Arial'
    const origText = (isIt ? 'Prezzo: ' : '原价：') + fmtPrice(data.original_price)
    ctx.fillText(origText, 80, priceY + 64)
    // 划线
    const tw = ctx.measureText(origText).width
    ctx.strokeStyle = '#8C857C'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(80, priceY + 54); ctx.lineTo(80 + tw, priceY + 54); ctx.stroke()
  }

  if (data.discount_price) {
    ctx.fillStyle = '#C53A2E'
    ctx.font = 'bold 72px Arial'
    ctx.fillText(fmtPrice(data.discount_price), 80, priceY + 180)
  } else if (data.discount_percent) {
    ctx.fillStyle = '#C53A2E'
    ctx.font = 'bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`-${data.discount_percent}%`, W / 2, priceY + 170)
    ctx.textAlign = 'left'
  }

  // 折扣角标
  if (data.discount_percent && data.discount_price) {
    ctx.fillStyle = '#2E6B4E'
    ctx.beginPath(); ctx.arc(W - 110, priceY + 110, 68, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 38px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`-${data.discount_percent}%`, W - 110, priceY + 124)
    ctx.textAlign = 'left'
  }

  // ── 有效期 ──
  const validY = 1170
  ctx.fillStyle = '#1F1B18'
  ctx.font = '34px Arial'
  const validLabel = isIt ? '⏰ Valido fino al: ' : '⏰ 有效期至：'
  const validDate = data.valid_until ? new Date(data.valid_until).toLocaleDateString(isIt ? 'it-IT' : 'zh-CN') : '—'
  ctx.fillText(validLabel + validDate, 50, validY)

  // ── 分隔线 ──
  ctx.fillStyle = '#ECE7E0'
  ctx.fillRect(50, 1210, W - 100, 2)

  // ── 商家信息（垂直居中）──
  const shopName = merchant?.business_name || (isIt ? 'Nome negozio' : '店铺名称')
  const shopAddr = merchant?.address ? merchant.address : ''
  const shopPhone = merchant?.contact_phone || ''
  const shopWechat = merchant?.contact_wechat || ''

  // 计算内容总高度后垂直居中（区域 1212~1508 = 296px）
  const lineH = 56, nameH = 62
  let totalH = nameH
  if (shopAddr) totalH += lineH
  if (shopPhone) totalH += lineH
  if (shopWechat) totalH += lineH
  const areaTop = 1212, areaH = 296
  const shopY = areaTop + Math.max(0, (areaH - totalH) / 2) + nameH

  // 店名
  ctx.fillStyle = '#1F1B18'
  ctx.font = 'bold 42px Arial'
  ctx.fillText('🏪 ' + shopName, 50, shopY)
  ctx.font = '34px Arial'
  ctx.fillStyle = '#5f594f'
  let nextY = shopY + lineH

  // 地址
  if (shopAddr) { ctx.fillText('📍 ' + shopAddr, 50, nextY); nextY += lineH }

  // 电话 + WhatsApp logo
  if (shopPhone) {
    // WhatsApp 绿色圆圈
    ctx.fillStyle = '#25D366'
    ctx.beginPath(); ctx.arc(70, nextY - 14, 20, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('W', 70, nextY - 6)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#5f594f'
    ctx.font = '34px Arial'
    ctx.fillText(shopPhone, 100, nextY)
    nextY += lineH
  }

  // 微信
  if (shopWechat) { ctx.fillText('💬 WeChat: ' + shopWechat, 50, nextY); nextY += lineH }

  // ── 底部品牌条 ──
  ctx.fillStyle = '#1F1B18'
  ctx.fillRect(0, Math.round(H*0.944), W, Math.round(H*0.056))
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 34px Arial'
  ctx.textAlign = 'center'
  const footerText = isIt
    ? `${brandName} · zaiyi.eu  |  Piattaforma per cinesi in Italia`
    : `${brandName} · zaiyi.eu  |  意大利华人生活平台`
  ctx.fillText(footerText, W / 2, Math.round(H * 0.978))
  ctx.textAlign = 'left'

  // 底部装饰
  ctx.fillStyle = '#C53A2E'
  ctx.fillRect(0, Math.round(H*0.944), 8, Math.round(H*0.056))
  ctx.fillStyle = '#2E6B4E'
  ctx.fillRect(8, Math.round(H*0.944), 8, Math.round(H*0.056))
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ── 主页面 ───────────────────────────────────────────────────
function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null }

export default function VolantinoPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const canvasRef = useRef()
  const fileRef = useRef()
  const [tab, setTab] = useState('create')
  const [format, setFormat] = useState('a4p') // a4p=A4竖版 | a4l=A4横版 | phone=手机版
  const [lang, setLang] = useState('it') // 默认意大利语版
  const [merchant, setMerchant] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    title: '', product_name: '', product_image_url: '',
    original_price: '', discount_price: '', discount_percent: '',
    valid_until: '', description: '', language: 'zh',
    shop_name: '', shop_address: '', shop_phone: '', shop_wechat: '',
  })
  const [previewImg, setPreviewImg] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [visionLoading, setVisionLoading] = useState(false)
  const [visionImages, setVisionImages] = useState([]) // 供选择的网络图

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // 加载商家信息（active 或 pending 都加载）
  useEffect(() => {
    if (!session) return
    supabase.from('merchants').select('*').eq('user_id', session.user.id)
      .in('status', ['active', 'pending']).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const m = data[0]
          setMerchant(m)
          // 自动填入店铺信息字段
          setForm(f => ({
            ...f,
            shop_name: m.business_name || '',
            shop_address: [m.address, m.city].filter(Boolean).join(', '),
            shop_phone: m.contact_phone || '',
            shop_wechat: m.contact_wechat || '',
          }))
        }
      })
  }, [session])

  // 加载卡片列表
  useEffect(() => {
    if (!session || tab !== 'list') return
    setLoading(true)
    supabase.from('deal_cards').select('*').eq('user_id', session.user.id)
      .neq('status', 'archived').order('created_at', { ascending: false })
      .then(({ data }) => { setCards(data ?? []); setLoading(false) })
  }, [session, tab])

  // Google Vision AI 识别产品
  async function handleVisionRecognize() {
    if (!form.product_image_url) { showToast('请先上传商品图片'); return }
    setVisionLoading(true)
    setVisionImages([])
    try {
      const { data, error } = await supabase.functions.invoke('vision-product', {
        body: { imageUrl: form.product_image_url }
      })
      if (error) throw error
      if (data.productName && !form.product_name) {
        setField('product_name', data.productName)
      }
      if (data.webImages?.length > 0) {
        setVisionImages(data.webImages)
        showToast(`✅ 找到 ${data.webImages.length} 张产品图，选一张使用`)
      } else if (data.productName) {
        showToast(`✅ 识别到：${data.productName}`)
      } else {
        showToast('未识别到产品信息，请手动填写')
      }
    } catch (e) {
      showToast('AI识别失败：' + (e.message || '请重试'))
    }
    setVisionLoading(false)
  }

  // 从列表载入已保存的卡片数据到表单
  function loadCard(c) {
    setForm(f => ({
      ...f,
      title: c.title || '',
      product_name: c.product_name || '',
      product_image_url: c.product_image_url || '',
      original_price: c.original_price ?? '',
      discount_price: c.discount_price ?? '',
      discount_percent: c.discount_percent ?? '',
      valid_until: c.valid_until || '',
      description: c.description || '',
      language: c.language || 'zh',
      // 店铺信息保留当前已填的，不覆盖
    }))
    setLang(c.language || 'zh')
    setTab('create')
    showToast('已载入卡片，可直接「📥 导出」高清版')
  }

  // 实时渲染预览
  // 把 form 的店铺字段合并成 merchant-like 对象传给 drawCard
  const effectiveMerchant = {
    business_name: form.shop_name,
    address: form.shop_address,
    contact_phone: form.shop_phone,
    contact_wechat: form.shop_wechat,
  }

  // 价格计算：各字段单独处理，改哪个算剩余一个，不会锁死
  function onOriginalChange(val) {
    setField('original_price', val)
    const o = parseFloat(val), d = parseFloat(form.discount_price), p = parseFloat(form.discount_percent)
    if (!isNaN(o) && o > 0 && !isNaN(p) && p > 0 && p < 100)
      setField('discount_price', (o * (1 - p / 100)).toFixed(2))
    else if (!isNaN(o) && o > 0 && !isNaN(d) && d >= 0 && d < o)
      setField('discount_percent', String(Math.round((o - d) / o * 100)))
  }
  function onDiscountPriceChange(val) {
    setField('discount_price', val)
    const o = parseFloat(form.original_price), d = parseFloat(val)
    if (!isNaN(o) && o > 0 && !isNaN(d) && d >= 0 && d < o)
      setField('discount_percent', String(Math.round((o - d) / o * 100)))
  }
  function onDiscountPercentChange(val) {
    setField('discount_percent', val)
    const o = parseFloat(form.original_price), p = parseFloat(val)
    if (!isNaN(o) && o > 0 && !isNaN(p) && p > 0 && p < 100)
      setField('discount_price', (o * (1 - p / 100)).toFixed(2))
  }

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    await drawCard(canvas, { ...form, language: lang }, effectiveMerchant, lang, format)
    setPreviewImg(canvas.toDataURL('image/png'))
  }, [form, lang, format])

  useEffect(() => {
    const t = setTimeout(renderPreview, 300)
    return () => clearTimeout(t)
  }, [renderPreview])

  // 上传商品图
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]; if (!file) return
    const path = `volantino/${session.user.id}/${Date.now()}.jpg`
    const { data, error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true })
    if (error) { showToast('图片上传失败'); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
    setField('product_image_url', publicUrl)
    showToast('图片上传成功')
  }

  // 保存（压缩缩略图版本存服务器，约50KB）
  async function handleSave() {
    if (!form.product_name.trim()) { showToast('请填写商品名称'); return }
    if (!form.valid_until) { showToast('请选择有效期'); return }
    if (!form.discount_price && !form.discount_percent && !form.original_price) { showToast('请填写价格或折扣信息'); return }
    setSaving(true)
    try {
      await renderPreview()
      const canvas = canvasRef.current

      // 压缩版（450×800 JPEG，约30-60KB）用于服务器存储
      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = 450; thumbCanvas.height = 800
      thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, 450, 800)
      const thumbBlob = await new Promise(res => thumbCanvas.toBlob(res, 'image/jpeg', 0.82))

      const imgPath = `volantino/cards/${session.user.id}/${Date.now()}.jpg`
      const { data: upload, error: upErr } = await supabase.storage
        .from('post-images').upload(imgPath, thumbBlob, { upsert: true })
      if (upErr) { showToast('图片上传失败：' + upErr.message); setSaving(false); return }
      const { data: { publicUrl: cardUrl } } = supabase.storage.from('post-images').getPublicUrl(upload.path)

      const { error } = await supabase.from('deal_cards').insert({
      user_id: session.user.id,
      merchant_id: merchant?.id ?? null,
      title: form.title || form.product_name,
      product_name: form.product_name,
      product_image_url: form.product_image_url || null,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      valid_until: form.valid_until,
      description: form.description || null,
      language: lang,
      status: 'saved',
      card_image_url: cardUrl,
    })
      setSaving(false)
      if (error) { showToast('保存失败：' + error.message); return }
      showToast('✅ 已保存！')
      setTab('list')
    } catch (e) {
      setSaving(false)
      showToast('保存失败：' + e.message)
    }
  }

  // 导出PNG
  function handleExport() {
    const canvas = canvasRef.current; if (!canvas) return
    const a = document.createElement('a')
    a.download = `在意优惠卡_${form.product_name || 'card'}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
    showToast('📥 下载中…')
  }

  return (
    <>
      <Toast msg={toast} />
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>🗞️ 优惠卡生成器</h2>
        <button onClick={() => setTab(tab === 'list' ? 'create' : 'list')}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--line)',
            borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {tab === 'list' ? '+ 新建' : '我的卡片'}
        </button>
      </header>

      {/* 我的卡片列表 */}
      {tab === 'list' && (
        <div style={{ padding: '12px 16px 80px' }}>
          {loading ? <div className="loading">加载中…</div>
          : cards.length === 0 ? (
            <div className="empty"><div className="ic">🗞️</div>还没有优惠卡，新建一张吧</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cards.map(c => (
                <div key={c.id} style={{ background: '#fff', border: '1px solid var(--line)',
                  borderRadius: 14, overflow: 'hidden', display: 'flex', gap: 12, padding: 12 }}>
                  {c.card_image_url && (
                    <img src={c.card_image_url} alt="" style={{ width: 70, height: 124,
                      objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.product_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      有效期至 {new Date(c.valid_until).toLocaleDateString('zh')}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => loadCard(c)}
                        style={{ flex: 1, padding: '7px', background: 'var(--ink)',
                          color: '#fff', border: 'none', borderRadius: 8, fontSize: 12,
                          fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ 编辑/导出
                      </button>
                      <button onClick={() => window.open(c.card_image_url, '_blank')}
                        style={{ flex: 1, padding: '7px', background: 'var(--paper)',
                          color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        🖼️ 预览
                      </button>
                      <button onClick={async () => {
                        if (!confirm('确认删除？')) return
                        await supabase.from('deal_cards').update({ status: 'archived' }).eq('id', c.id)
                        setCards(cs => cs.filter(x => x.id !== c.id))
                      }} style={{ padding: '7px 10px', background: 'var(--red-soft)',
                        border: '1px solid #F0C8C3', borderRadius: 8, fontSize: 12,
                        fontWeight: 700, color: 'var(--red)', cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                      点「编辑/导出」重新打开卡片，可用「📥 导出」下载高清全尺寸
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI 拍照识别弹窗 */}
      {showScanner && (
        <AIScanner
          onClose={() => setShowScanner(false)}
          onFound={({ product_name, webImages }) => {
            if (product_name) setField('product_name', product_name)
            if (webImages?.length > 0) setVisionImages(webImages)
            showToast(product_name ? `✅ 识别到：${product_name}，选一张图使用` : '请选一张图并手动填写商品名')
          }}
        />
      )}

      {/* 创建表单 */}
      {tab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* 语言切换（意大利语在前/默认）*/}
          <div style={{ padding: '12px 16px 0' }}>
            <div className="seg-control">
              <button onClick={() => setLang('it')}
                style={lang === 'it' ? { background: '#1A7D8F', color: '#fff', borderRadius: 9 } : {}}>
                🇮🇹 意大利语版
              </button>
              <button className={lang === 'zh' ? 'active-job' : ''} onClick={() => setLang('zh')}>🇨🇳 中文版</button>
            </div>
          </div>

          {/* 格式选择 */}
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'a4p',  l: '📄 A4 竖版', sub: '打印传单' },
                { v: 'a4l',  l: '📐 A4 横版', sub: '展示海报' },
                { v: 'phone',l: '📱 手机版',  sub: 'WhatsApp' },
              ].map(f => (
                <button key={f.v} onClick={() => setFormat(f.v)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid',
                    borderColor: format === f.v ? 'var(--red)' : 'var(--line)',
                    background: format === f.v ? 'var(--red-soft)' : '#fff',
                    color: format === f.v ? 'var(--red)' : 'var(--muted)',
                    fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 13 }}>{f.l}</span>
                  <span style={{ fontSize: 9, opacity: .7 }}>{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 实时预览 */}
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {previewImg ? (
                <img src={previewImg} alt="预览" style={{ width: '100%', borderRadius: 12,
                  border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }} />
              ) : (
                <div style={{ aspectRatio: '9/16', background: '#F5F5F5', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  填写信息预览卡片
                </div>
              )}
            </div>
          </div>

          {/* 表单 */}
          <div className="form-body" style={{ paddingTop: 0 }}>
            {!merchant && (
              <div style={{ background: '#FFF8EE', border: '1px solid #C4961A', borderRadius: 12,
                padding: '11px 13px', fontSize: 12.5, color: '#7A5C1E', lineHeight: 1.6 }}>
                💡 先在「商圈」完成入驻，店铺信息可自动填入卡片
              </div>
            )}

            {/* ① AI拍照识别入口 */}
            <button onClick={() => setShowScanner(true)}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#4285F4,#1A73E8)',
                color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              拍产品包装 · AI自动识别商品+找图
            </button>

            {/* AI 找到的网络图供选择 */}
            {visionImages.length > 0 && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                  点选一张网络产品图（会自动填入传单）：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {visionImages.map((url, i) => (
                    <div key={i} style={{ cursor: 'pointer' }}
                      onClick={async () => {
                        showToast('处理图片中…')
                        try {
                          const { data } = await supabase.functions.invoke('vision-product', {
                            body: { proxyImageUrl: url, userId: session?.user?.id }
                          })
                          if (data?.proxyUrl) {
                            setField('product_image_url', data.proxyUrl)
                            setVisionImages([])
                            showToast('✅ 已填入传单')
                          } else showToast('处理失败，请重试')
                        } catch { showToast('处理失败，请重试') }
                      }}>
                      <img src={url} alt=""
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10,
                          border: '2px solid var(--line)', display: 'block' }}
                        onError={e => e.target.parentElement.style.display = 'none'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
              <span style={{ fontSize: 12 }}>或</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            </div>

            {/* ② 手动填写 + 上传自己的图 */}
            <div className="field"><label>商品名称 <span className="req">*</span></label>
              <input placeholder={lang === 'it' ? 'Nome prodotto' : '如：有机草莓 500g'} value={form.product_name} onChange={e => setField('product_name', e.target.value)} maxLength={60}/></div>

            <div className="field">
              <label>上传自己拍的商品图</label>
              <label htmlFor="vol-img" style={{ display: 'flex', alignItems: 'center', gap: 12,
                background: '#fff', border: '1.5px dashed var(--line)', borderRadius: 11,
                padding: '14px', cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}>
                {form.product_image_url
                  ? <><img src={form.product_image_url} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} alt=""/><span>已上传 · 点击更换</span></>
                  : <><span style={{ fontSize: 28 }}>📤</span><span>拍照或从相册选图（jpg/png，≤5MB）</span></>}
              </label>
              <input id="vol-img" ref={fileRef} type="file" accept="image/*"
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                onChange={handleImageUpload} />
            </div>

            <div className="two-col">
              <div className="field"><label>原价 (€)</label>
                <input type="number" placeholder="12.99" value={form.original_price} onChange={e => onOriginalChange(e.target.value)}/></div>
              <div className="field"><label>折扣价 (€)</label>
                <input type="number" placeholder="8.99" value={form.discount_price} onChange={e => onDiscountPriceChange(e.target.value)}/></div>
            </div>

            <div className="field"><label>折扣百分比（选填）</label>
              <input type="number" placeholder="如：30（代表打7折/30% off）" min="1" max="99"
                value={form.discount_percent} onChange={e => onDiscountPercentChange(e.target.value)}/></div>

            <div className="field"><label>有效期至 <span className="req">*</span></label>
              <input type="date" value={form.valid_until}
                min={new Date().toISOString().slice(0,10)}
                onChange={e => setField('valid_until', e.target.value)}/></div>

            <div className="field"><label>补充说明（选填）</label>
              <textarea placeholder={lang === 'it' ? 'Descrizione aggiuntiva...' : '如：仅限堂食·数量有限·不可叠加使用'}
                value={form.description} onChange={e => setField('description', e.target.value)} style={{ minHeight: 60 }}/></div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                {saving ? '生成中…' : '💾 保存卡片'}
              </button>
              <button onClick={handleExport}
                style={{ flex: 1, background: '#2E6B4E', color: '#fff', border: 'none',
                  borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                📥 导出
              </button>
            </div>

            {/* 店铺信息（可编辑） */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 13, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                🏪 传单底部店铺信息（可修改）
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>店铺名称</label>
                <input placeholder="如：米兰华人超市" value={form.shop_name}
                  onChange={e => setField('shop_name', e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>地址</label>
                <input placeholder="如：Via Sarpi 10, Milano" value={form.shop_address}
                  onChange={e => setField('shop_address', e.target.value)} />
              </div>
              <div className="two-col">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>电话</label>
                  <input placeholder="+39 333..." value={form.shop_phone}
                    onChange={e => setField('shop_phone', e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>微信</label>
                  <input placeholder="微信ID" value={form.shop_wechat}
                    onChange={e => setField('shop_wechat', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
              导出的卡图（900×1600px）可直接打印或发送到微信/WhatsApp
            </div>
          </div>
        </div>
      )}
    </>
  )
}
