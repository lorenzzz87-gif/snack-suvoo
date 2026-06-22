import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const TABS = ['待处理举报', '所有帖子', '商圈入驻', '广告位']

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)   // null=checking
  const [tab, setTab] = useState(0)
  const [reports, setReports] = useState([])
  const [posts, setPosts] = useState([])
  const [merchants, setMerchants] = useState([])
  const [ads, setAds] = useState([])
  const [pendingCounts, setPendingCounts] = useState({ reports: 0, merchants: 0 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Verify admin role + load pending counts
  useEffect(() => {
    if (!session) return
    supabase.from('users').select('role').eq('id', session.user.id).single()
      .then(({ data }) => setIsAdmin(data?.role === 'admin'))

    // 角标数量
    Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([r, m]) => setPendingCounts({ reports: r.count ?? 0, merchants: m.count ?? 0 }))
  }, [session])

  // Load reports
  useEffect(() => {
    if (!isAdmin || tab !== 0) return
    setLoading(true)
    supabase
      .from('reports')
      .select(`
        id, target_type, target_id, reason, description, status, created_at,
        reporter:reporter_id(nickname, phone)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setReports(data ?? []); setLoading(false) })
  }, [isAdmin, tab])

  // Load all posts (for moderation)
  useEffect(() => {
    if (!isAdmin || tab !== 1) return
    setLoading(true)
    supabase
      .from('posts')
      .select(`
        id, title, type, status, is_pinned, created_at, city,
        users(nickname, phone)
      `)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setPosts(data ?? []); setLoading(false) })
  }, [isAdmin, tab])

  // 加载广告位管理（所有已上线商家）
  useEffect(() => {
    if (!isAdmin || tab !== 3) return
    setLoading(true)
    supabase
      .from('merchants')
      .select('id, business_name, business_type, city, membership_tier, is_verified, logo_url, ad_image_url')
      .eq('status', 'active')
      .order('membership_tier', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAds(data ?? []); setLoading(false) })
  }, [isAdmin, tab])

  // 加载商圈入驻申请
  useEffect(() => {
    if (!isAdmin || tab !== 2) return
    setLoading(true)
    supabase
      .from('merchants')
      .select('id, business_name, business_type, city, contact_phone, contact_wechat, description, status, created_at, users(nickname, phone)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setMerchants(data ?? []); setLoading(false) })
  }, [isAdmin, tab])

  async function deletePost(postId) {
    if (!confirm('确认删除此帖子？')) return
    const { error } = await supabase
      .from('posts')
      .update({ status: 'deleted' })
      .eq('id', postId)
    if (error) { showToast('删除失败：' + error.message); return }
    setPosts(ps => ps.filter(p => p.id !== postId))
    showToast('帖子已删除')
  }

  async function resolveReport(reportId, action, postId) {
    // action: 'resolved' (删帖) | 'dismissed' (驳回)
    if (action === 'resolved' && postId) {
      await supabase.from('posts').update({ status: 'deleted' }).eq('id', postId)
    }
    await supabase
      .from('reports')
      .update({ status: action, resolved_by: session.user.id, resolved_at: new Date().toISOString() })
      .eq('id', reportId)
    setReports(rs => rs.filter(r => r.id !== reportId))
    showToast(action === 'resolved' ? '已处理：帖子已删除' : '已驳回举报')
  }

  async function setAdTier(id, tier) {
    await supabase.from('merchants').update({ membership_tier: tier }).eq('id', id)
    setAds(prev => prev.map(m => m.id === id ? { ...m, membership_tier: tier } : m))
    showToast(tier === 'paid' ? '✅ 已设为广告位商家' : '已取消广告位')
  }

  async function uploadAdImage(merchantId, file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `ads/${merchantId}.${ext}`
    const { data, error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true })
    if (error) { showToast('上传失败：' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
    await supabase.from('merchants').update({ ad_image_url: publicUrl }).eq('id', merchantId)
    setAds(prev => prev.map(m => m.id === merchantId ? { ...m, ad_image_url: publicUrl } : m))
    showToast('✅ 广告图已上传')
  }

  async function removeAdImage(merchantId) {
    await supabase.from('merchants').update({ ad_image_url: null }).eq('id', merchantId)
    setAds(prev => prev.map(m => m.id === merchantId ? { ...m, ad_image_url: null } : m))
    showToast('已删除自定义广告图')
  }

  async function approveMerchant(id) {
    await supabase.from('merchants').update({ status: 'active' }).eq('id', id)
    setMerchants(ms => ms.map(m => m.id === id ? { ...m, status: 'active' } : m))
    showToast('✅ 商家已通过，立即展示')
  }

  async function rejectMerchant(id) {
    await supabase.from('merchants').update({ status: 'closed' }).eq('id', id)
    setMerchants(ms => ms.map(m => m.id === id ? { ...m, status: 'closed' } : m))
    showToast('已驳回')
  }

  async function banUser(userId) {
    if (!confirm('确认封禁此用户？')) return
    await supabase.from('users').update({ status: 'banned' }).eq('id', userId)
    showToast('用户已封禁')
  }

  if (!session) return <div className="loading">请先登录</div>
  if (isAdmin === null) return <div className="loading">权限验证中…</div>
  if (isAdmin === false) {
    return (
      <div className="empty" style={{ paddingTop: 100 }}>
        <div className="ic">🔒</div>
        无权限访问管理后台
      </div>
    )
  }

  return (
    <>
      <Toast msg={toast} />
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate('/app')}>←</button>
        <h2>管理后台</h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>仅管理员可见</span>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: '#fff' }}>
        {TABS.map((t, i) => {
          const count = i === 0 ? pendingCounts.reports : i === 2 ? pendingCounts.merchants : 0
          return (
          <button
            key={i}
            onClick={() => { setTab(i); setLoading(true) }}
            style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: tab === i ? 'var(--red)' : 'var(--muted)',
              borderBottom: tab === i ? '2px solid var(--red)' : '2px solid transparent',
              position: 'relative',
            }}
          >
            {t}
            {count > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                background: 'var(--red)', color: '#fff',
                fontSize: 10, fontWeight: 800, minWidth: 16, height: 16,
                borderRadius: 99, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', padding: '0 4px',
              }}>{count}</span>
            )}
          </button>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div className="loading">加载中…</div>}

        {/* ── 广告位管理 ── */}
        {!loading && tab === 3 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                当前广告商家：<b style={{ color: 'var(--red)' }}>{ads.filter(m => m.membership_tier === 'paid').length}</b> 家
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>共 {ads.length} 家商家</span>
            </div>

            {ads.length === 0
              ? <div className="empty"><div className="ic">📢</div>暂无已上线商家</div>
              : ads.map(m => (
                <div key={m.id} style={{
                  background: '#fff',
                  border: `1px solid ${m.membership_tier === 'paid' ? 'var(--red)' : 'var(--line)'}`,
                  borderRadius: 14, padding: 14, marginBottom: 10,
                }}>
                  {/* 顶部：logo + 名称 + 广告开关 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F5F0FA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                      {m.logo_url
                        ? <img src={m.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '🏪'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{m.business_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {m.business_type} · {m.city}
                        {m.is_verified && <span style={{ marginLeft: 6, color: '#2B6E8F', fontWeight: 700 }}>✓ 认证</span>}
                      </div>
                    </div>
                    {m.membership_tier === 'paid' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: 'var(--red-soft)', color: 'var(--red)' }}>📢 广告中</span>
                        <button onClick={() => setAdTier(m.id, 'free')}
                          style={{ fontSize: 11, padding: '4px 10px', background: 'var(--paper)',
                            border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}>
                          取消广告
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAdTier(m.id, 'paid')}
                        style={{ fontSize: 12, padding: '8px 14px', background: 'var(--red)',
                          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                        设为广告
                      </button>
                    )}
                  </div>

                  {/* 自定义广告图（仅付费商家显示） */}
                  {m.membership_tier === 'paid' && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                        自定义广告图（JPG / GIF）
                      </div>
                      {m.ad_image_url ? (
                        <>
                          <img src={m.ad_image_url} alt="" style={{ width: '100%', borderRadius: 8,
                            maxHeight: 100, objectFit: 'cover', display: 'block', marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <label htmlFor={`ad-img-${m.id}`}
                              style={{ flex: 1, textAlign: 'center', padding: '7px', background: 'var(--paper)',
                                border: '1px solid var(--line)', borderRadius: 8, fontSize: 12,
                                cursor: 'pointer', fontWeight: 600 }}>
                              换图
                            </label>
                            <button onClick={() => removeAdImage(m.id)}
                              style={{ flex: 1, padding: '7px', background: 'var(--red-soft)',
                                border: '1px solid #F0C8C3', borderRadius: 8, fontSize: 12,
                                cursor: 'pointer', color: 'var(--red)', fontWeight: 600 }}>
                              删除图片
                            </button>
                          </div>
                        </>
                      ) : (
                        <label htmlFor={`ad-img-${m.id}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 8, padding: '14px', background: 'var(--paper)',
                            border: '1.5px dashed var(--line)', borderRadius: 10,
                            fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
                          📷 上传广告图（建议 750×200px）
                        </label>
                      )}
                      <input
                        id={`ad-img-${m.id}`}
                        type="file"
                        accept="image/jpeg,image/jpg,image/gif,image/png"
                        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAdImage(m.id, f) }}
                      />
                    </div>
                  )}
                </div>
              ))
            }
          </>
        )}

        {/* ── 待处理举报 ── */}
        {!loading && tab === 0 && (
          reports.length === 0
            ? <div className="empty"><div className="ic">✅</div>没有待处理举报</div>
            : reports.map(r => (
              <div key={r.id} style={{
                background: '#fff', border: '1px solid var(--line)',
                borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: 'var(--red-soft)', color: 'var(--red)', marginRight: 6
                    }}>
                      {r.target_type === 'post' ? '帖子' : r.target_type}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      举报原因：{r.reason}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('zh')}
                  </span>
                </div>

                {r.description && (
                  <div style={{ fontSize: 13, color: '#3d382f', background: 'var(--paper)',
                    padding: '8px 10px', borderRadius: 9 }}>
                    {r.description}
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  举报人：{r.reporter?.nickname ?? r.reporter?.phone ?? '未知'}
                </div>

                {r.target_type === 'post' && (
                  <button
                    onClick={() => navigate(`/post/${r.target_id}`)}
                    style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 9,
                      padding: '7px 12px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                  >
                    查看被举报帖子 →
                  </button>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => resolveReport(r.id, 'resolved', r.target_type === 'post' ? r.target_id : null)}
                    style={{
                      flex: 1, background: 'var(--red)', color: '#fff', border: 'none',
                      borderRadius: 9, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    删帖并关闭
                  </button>
                  <button
                    onClick={() => resolveReport(r.id, 'dismissed', null)}
                    style={{
                      flex: 1, background: 'var(--paper)', color: 'var(--muted)',
                      border: '1px solid var(--line)', borderRadius: 9, padding: '9px 0',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    驳回举报
                  </button>
                </div>
              </div>
            ))
        )}

        {/* ── 商圈入驻 ── */}
        {!loading && tab === 2 && (
          merchants.length === 0
            ? <div className="empty"><div className="ic">🏪</div>没有入驻申请</div>
            : merchants.map(m => {
              const isPending = m.status === 'pending'
              const isActive = m.status === 'active'
              return (
                <div key={m.id} style={{
                  background: '#fff', border: '1px solid var(--line)',
                  borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{m.business_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 8 }}>
                        <span>{m.business_type}</span>
                        <span>📍 {m.city}</span>
                        <span>{m.users?.nickname ?? m.users?.phone}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: isPending ? 'var(--amber-soft)' : isActive ? 'var(--green-soft)' : 'var(--red-soft)',
                      color: isPending ? 'var(--amber)' : isActive ? 'var(--green)' : 'var(--red)',
                    }}>
                      {isPending ? '待审核' : isActive ? '已上线' : '已驳回'}
                    </span>
                  </div>
                  {m.description && (
                    <div style={{ fontSize: 13, color: '#3d382f', background: 'var(--paper)',
                      padding: '8px 10px', borderRadius: 9 }}>
                      {m.description}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10 }}>
                    {m.contact_wechat && <span>💬 {m.contact_wechat}</span>}
                    {m.contact_phone && <span>📱 {m.contact_phone}</span>}
                  </div>
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => approveMerchant(m.id)}
                        style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none',
                          borderRadius: 9, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        ✓ 通过上线
                      </button>
                      <button onClick={() => rejectMerchant(m.id)}
                        style={{ flex: 1, background: 'var(--paper)', color: 'var(--muted)',
                          border: '1px solid var(--line)', borderRadius: 9, padding: '9px 0',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        驳回
                      </button>
                    </div>
                  )}
                  {isActive && (
                    <button onClick={() => rejectMerchant(m.id)}
                      style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid #F0C8C3',
                        borderRadius: 9, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      下线
                    </button>
                  )}
                </div>
              )
            })
        )}

        {/* ── 所有帖子 ── */}
        {!loading && tab === 1 && (
          posts.length === 0
            ? <div className="empty"><div className="ic">📭</div>没有帖子</div>
            : posts.map(p => (
              <div key={p.id} style={{
                background: '#fff', border: '1px solid var(--line)',
                borderRadius: 14, padding: 13, display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8 }}>
                    <span className={`badge ${p.type === 'job' ? 'job' : p.type === 'item' ? 'item' : ''}`}
                      style={{ fontSize: 10 }}>
                      {p.type === 'job' ? '招聘' : p.type === 'item' ? '二手' : '倒货'}
                    </span>
                    <span>{p.users?.nickname ?? p.users?.phone}</span>
                    <span>{p.city}</span>
                    <span>{new Date(p.created_at).toLocaleDateString('zh')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => navigate(`/post/${p.id}`)}
                    style={{ fontSize: 11, padding: '4px 9px', background: 'var(--paper)',
                      border: '1px solid var(--line)', borderRadius: 7, cursor: 'pointer' }}
                  >
                    查看
                  </button>
                  <button
                    onClick={() => deletePost(p.id)}
                    style={{ fontSize: 11, padding: '4px 9px', background: 'var(--red-soft)',
                      color: 'var(--red)', border: '1px solid #F0C8C3', borderRadius: 7, cursor: 'pointer',
                      fontWeight: 700 }}
                  >
                    删帖
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </>
  )
}
