import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const CATEGORIES = [
  '餐馆/外卖', '会计/律师', '搬家/物流', '超市/食品',
  '美容美发', '手机/维修', '代购/快递', '医疗/诊所', '其他服务',
]

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function RegisterMerchantPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [form, setForm] = useState({
    business_name: '', business_type: '', city: '',
    description: '', contact_phone: '', contact_wechat: '', address: '',
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [merchantId, setMerchantId] = useState(null)   // 有值 = 编辑模式
  const [status, setStatus] = useState(null)
  const [ready, setReady] = useState(false)

  const isEdit = !!merchantId

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // 进页面查是否已有商家记录 → 预填进入编辑模式
  useEffect(() => {
    if (!session) return
    supabase.from('merchants')
      .select('id, business_name, business_type, city, description, contact_phone, contact_wechat, address, status')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMerchantId(data.id)
          setStatus(data.status)
          setForm({
            business_name: data.business_name || '',
            business_type: data.business_type || '',
            city: data.city || '',
            description: data.description || '',
            contact_phone: data.contact_phone || '',
            contact_wechat: data.contact_wechat || '',
            address: data.address || '',
          })
        }
        setReady(true)
      })
  }, [session])

  async function handleSubmit() {
    if (!form.business_name.trim()) { showToast('请填写商家名称'); return }
    if (!form.business_type) { showToast('请选择商家类型'); return }
    if (!form.city.trim()) { showToast('请填写所在城市'); return }
    if (!form.contact_phone && !form.contact_wechat) { showToast('请填写至少一种联系方式'); return }

    setLoading(true)
    const payload = {
      business_name: form.business_name.trim(),
      business_type: form.business_type,
      city: form.city.trim(),
      description: form.description.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_wechat: form.contact_wechat.trim() || null,
      address: form.address.trim() || null,
    }

    let error
    if (isEdit) {
      // 编辑：修改后重新进入待审核，避免审核通过的商家被随意改成违规内容
      ;({ error } = await supabase.from('merchants')
        .update({ ...payload, status: 'pending' })
        .eq('id', merchantId))
    } else {
      ;({ error } = await supabase.from('merchants')
        .insert({ ...payload, user_id: session.user.id, status: 'pending' }))
    }
    setLoading(false)

    if (error) { showToast('提交失败：' + (error.message || JSON.stringify(error))); return }

    // 发邮件通知管理员（不阻塞流程）
    supabase.functions.invoke('notify-merchant', {
      body: {
        business_name: payload.business_name,
        business_type: payload.business_type,
        city: payload.city,
        contact_wechat: payload.contact_wechat || '',
        contact_phone: payload.contact_phone || '',
        description: payload.description || '',
      }
    }).catch(() => {}) // 邮件失败不影响提交成功

    setSubmitted(true)
  }

  // 提交成功页面
  if (submitted) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 24px',
        background: 'var(--paper)', textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{isEdit ? '修改已提交！' : '提交成功！'}</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
          {isEdit ? '你的商家信息已更新' : '你的商家入驻申请已收到'}<br />
          管理员审核通过后即可在<b>商圈</b>展示<br />
          通常在 24 小时内完成审核
        </p>
        <div style={{ background: '#F5F0FA', border: '1px solid #E0D0F0', borderRadius: 14,
          padding: '14px 18px', fontSize: 13, color: '#7B4F9E', lineHeight: 1.6, maxWidth: 280 }}>
          📌 审核结果将通过站内通知告知<br />
          如有问题可联系平台客服
        </div>
        <button className="btn-primary" style={{ marginTop: 8, width: 'auto', padding: '12px 32px' }}
          onClick={() => navigate('/shangquan', { replace: true })}>
          返回商圈
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <>
        <header className="form-topbar">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h2>商家信息</h2>
        </header>
        <div className="loading">加载中…</div>
      </>
    )
  }

  const STATUS_META = {
    pending:  { label: '审核中', color: '#9A6A00', bg: '#FFF7E6', border: '#F0D58A' },
    approved: { label: '已通过 · 商圈展示中', color: '#1A4F2E', bg: '#F2F8F3', border: '#A8D8B8' },
    rejected: { label: '未通过，请修改后重新提交', color: '#A02828', bg: '#FBEDEA', border: '#F0B8B0' },
  }
  const sm = status && STATUS_META[status]

  return (
    <>
      <Toast msg={toast} />
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>{isEdit ? '修改商家信息' : '商圈入驻'}</h2>
      </header>

      {isEdit && sm && (
        <div style={{ padding: '10px 16px', background: sm.bg, margin: '0 16px 10px',
          borderRadius: 12, fontSize: 13, color: sm.color, lineHeight: 1.6,
          border: `1px solid ${sm.border}`, fontWeight: 600 }}>
          当前状态：{sm.label}
        </div>
      )}

      <div style={{ padding: '10px 16px', background: '#F5F0FA', margin: '0 16px',
        borderRadius: 12, fontSize: 12.5, color: '#7B4F9E', lineHeight: 1.6, marginBottom: 0 }}>
        {isEdit
          ? '🏪 修改后需管理员重新审核，审核通过后更新展示。'
          : '🏪 提交后由管理员审核，审核通过后在商圈展示。免费入驻，真实商家优先认证。'}
      </div>

      <div className="form-body">
        <div className="field">
          <label>商家名称 <span className="req">*</span></label>
          <input placeholder="如：米兰华人会计事务所" value={form.business_name}
            onChange={e => setField('business_name', e.target.value)} maxLength={40} />
        </div>

        <div className="field">
          <label>商家类型 <span className="req">*</span></label>
          <select value={form.business_type} onChange={e => setField('business_type', e.target.value)}>
            <option value="">请选择类型</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="two-col">
          <div className="field">
            <label>所在城市 <span className="req">*</span></label>
            <input placeholder="如：Milano" value={form.city}
              onChange={e => setField('city', e.target.value)} />
          </div>
          <div className="field">
            <label>详细地址</label>
            <input placeholder="街道门牌（选填）" value={form.address}
              onChange={e => setField('address', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>商家简介</label>
          <textarea placeholder="简单介绍你的商家、服务内容和特色…"
            value={form.description} onChange={e => setField('description', e.target.value)} />
        </div>

        <div className="field">
          <label>微信号 <span className="req">*</span></label>
          <input placeholder="微信 ID（必填其一）" value={form.contact_wechat}
            onChange={e => setField('contact_wechat', e.target.value)} />
        </div>
        <div className="field">
          <label>联系电话</label>
          <input type="tel" placeholder="意大利或中国手机号（选填）" value={form.contact_phone}
            onChange={e => setField('contact_phone', e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '提交中…' : isEdit ? '保存修改' : '提交入驻申请'}
        </button>
      </div>
    </>
  )
}
