import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    location: '',
    event_at: '',
    max_participants: '',
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [cover, setCover] = useState(null)          // 封面图 File
  const [coverPreview, setCoverPreview] = useState(null)
  const fileRef = useRef()

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // 默认最小日期时间：现在起1小时后
  const minDateTime = new Date(Date.now() + 3600000).toISOString().slice(0, 16)

  // 把图片压缩转成 jpg（最长边 1280px），上传更快、省流量
  async function convertToJpeg(file) {
    const MAX_PX = 1280, QUALITY = 0.82
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_PX || height > MAX_PX) {
          if (width > height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
          else { width = Math.round(width * MAX_PX / height); height = MAX_PX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url)
          resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', QUALITY)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function handleCover(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const jpeg = await convertToJpeg(f)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCover(jpeg)
    setCoverPreview(URL.createObjectURL(jpeg))
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCover(null); setCoverPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!form.title.trim()) { showToast('请填写活动名称'); return }
    if (!form.event_at) { showToast('请选择活动时间'); return }
    if (!form.location.trim()) { showToast('请填写活动地点'); return }
    setLoading(true)

    // 1) 如选了封面，先上传到存储拿到公开URL（失败则不带图发布，不阻塞）
    let imageUrl = null
    if (cover) {
      try {
        const path = `events/${session.user.id}/${Date.now()}.jpg`
        const { data: up, error: upErr } = await supabase.storage
          .from('post-images').upload(path, cover)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('post-images').getPublicUrl(up.path).data.publicUrl
      } catch {
        showToast('封面上传失败，将不带图发布')
      }
    }

    // 2) 带 image_url 一起插入活动
    const { data, error } = await supabase.from('events').insert({
      user_id: session.user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      location: form.location.trim(),
      event_at: new Date(form.event_at).toISOString(),
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      image_url: imageUrl,
    }).select('id').single()
    setLoading(false)
    if (error) { showToast('发布失败：' + error.message); return }
    navigate(`/event/${data.id}`, { replace: true })
  }

  return (
    <>
      <Toast msg={toast} />
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>发起活动</h2>
      </header>

      <div className="form-body">
        <div style={{ background: '#F5F0FA', border: '1px solid #E0D0F0', borderRadius: 12,
          padding: '10px 13px', fontSize: 12.5, color: '#7B4F9E', lineHeight: 1.6 }}>
          🎉 发起免费同城活动——聚餐、爬山、打牌、学习小组……都可以
        </div>

        <div className="field">
          <label>活动名称 <span className="req">*</span></label>
          <input placeholder="如：普拉托华人周末爬山" value={form.title}
            onChange={e => setField('title', e.target.value)} maxLength={60} />
        </div>

        <div className="field">
          <label>活动时间 <span className="req">*</span></label>
          <input type="datetime-local" value={form.event_at} min={minDateTime}
            onChange={e => setField('event_at', e.target.value)} />
        </div>

        <div className="two-col">
          <div className="field">
            <label>城市</label>
            <input placeholder="如：Prato" value={form.city}
              onChange={e => setField('city', e.target.value)} />
          </div>
          <div className="field">
            <label>人数上限</label>
            <input type="number" placeholder="不填=不限" value={form.max_participants}
              onChange={e => setField('max_participants', e.target.value)} min={2} />
          </div>
        </div>

        <div className="field">
          <label>集合地点 <span className="req">*</span></label>
          <input placeholder="具体地址或地标" value={form.location}
            onChange={e => setField('location', e.target.value)} />
        </div>

        <div className="field">
          <label>活动详情</label>
          <textarea placeholder="活动内容、注意事项、费用说明等…"
            value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>

        {/* 封面图（选填，单张）*/}
        <div className="field">
          <label>活动封面（选填）</label>
          <input ref={fileRef} id="event-cover-input" type="file" accept="image/*"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            onChange={handleCover} />
          {coverPreview ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <img src={coverPreview} alt="封面预览"
                style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={removeCover}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                  borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)',
                  color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          ) : (
            <label htmlFor="event-cover-input" className="upload-box" style={{ cursor: 'pointer' }}>
              <span className="cam">📷</span>
              <span>添加封面图（让活动更吸引人）</span>
            </label>
          )}
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '发布中…' : '发布活动'}
        </button>
      </div>
    </>
  )
}
