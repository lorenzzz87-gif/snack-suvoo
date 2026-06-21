import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const STATUS_META = {
  pending:  { label: '审核中', color: '#9A6A00', bg: '#FFF7E6', border: '#F0D58A' },
  approved: { label: '展示中', color: '#1A4F2E', bg: '#F2F8F3', border: '#A8D8B8' },
  rejected: { label: '未通过', color: '#A02828', bg: '#FBEDEA', border: '#F0B8B0' },
}

export default function MyMerchantsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [list, setList] = useState(null)

  useEffect(() => {
    if (!session) return
    supabase.from('merchants')
      .select('id, business_name, business_type, city, status, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setList(data ?? []))
  }, [session])

  return (
    <>
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>我的商家</h2>
      </header>

      <div style={{ padding: '12px 16px 80px' }}>
        <button className="btn-primary" style={{ marginBottom: 14 }}
          onClick={() => navigate('/merchant/register')}>
          ➕ 新增商家入驻
        </button>

        {list === null ? (
          <div className="loading">加载中…</div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="ic">🏪</div>
            还没有入驻商家，点上方按钮申请入驻
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(m => {
              const sm = STATUS_META[m.status] || STATUS_META.pending
              return (
                <div key={m.id}
                  onClick={() => navigate(`/merchant/register?id=${m.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
                    border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>🏪</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.business_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {[m.business_type, m.city].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg,
                    border: `1px solid ${sm.border}`, borderRadius: 99, padding: '3px 9px', flexShrink: 0 }}>
                    {sm.label}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
