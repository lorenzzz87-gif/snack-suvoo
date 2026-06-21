import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import ImageViewer from '../components/ImageViewer'
import { TYPE_EMOJI, CarThumb } from '../components/PostCard'

const ATTR_LABELS = {
  position: '职位', salary: '薪资', work_hours: '工时',
  need_permit: '居留要求', accommodation: '吃住',
  condition: '新旧', brand: '品牌',
}

const REPORT_REASONS = ['诈骗', '假货', '黑工', '色情违规', '重复刷屏', '其他']

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [post, setPost] = useState(null)
  const [attrs, setAttrs] = useState([])
  const [images, setImages] = useState([])
  const [isFav, setIsFav] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [toast, setToast] = useState('')
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null)  // null = 关闭

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Load post
  useEffect(() => {
    supabase
      .from('posts')
      .select(`
        *,
        categories(name_zh, slug, type),
        users(nickname, avatar_url, is_verified, wechat_id, city, created_at)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setPost(data)
        // Increment view count (fire-and-forget)
        if (data) {
          supabase.from('posts').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', id)
        }
      })

    supabase
      .from('post_attributes')
      .select('key, value')
      .eq('post_id', id)
      .then(({ data }) => setAttrs(data ?? []))

    supabase
      .from('post_images')
      .select('url, sort_order')
      .eq('post_id', id)
      .order('sort_order')
      .then(({ data }) => setImages(data ?? []))

    supabase
      .from('comments')
      .select('id, content, created_at, users(nickname, phone)')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []))
  }, [id])

  // Check favorite status
  useEffect(() => {
    if (!session) return
    supabase
      .from('favorites')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [id, session])

  async function toggleFav() {
    if (!session) { navigate('/login'); return }
    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('post_id', id).eq('user_id', session.user.id)
      setIsFav(false)
      showToast('已取消收藏')
    } else {
      await supabase.from('favorites').insert({ post_id: id, user_id: session.user.id })
      setIsFav(true)
      showToast('已收藏')
    }
  }

  async function submitReport() {
    if (!reportReason) { showToast('请选择举报原因'); return }
    if (!session) { navigate('/login'); return }
    setSubmittingReport(true)
    const { error } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      target_type: 'post',
      target_id: id,
      reason: reportReason,
      description: reportDesc.trim() || null,
    })
    setSubmittingReport(false)
    if (error) { showToast('举报失败，请稍后重试'); return }
    setShowReport(false)
    setReportReason('')
    setReportDesc('')
    showToast('举报已提交，感谢反馈')
  }

  async function startChat() {
    if (!session) { navigate('/login'); return }
    if (post.user_id === session.user.id) { showToast('不能给自己发私信'); return }
    // 找或建会话（保证 user_a < user_b 避免重复）
    const [a, b] = [session.user.id, post.user_id].sort()
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('post_id', id)
      .eq('user_a_id', a)
      .eq('user_b_id', b)
      .maybeSingle()
    if (existing) { navigate(`/chat/${existing.id}`); return }
    const { data: created } = await supabase
      .from('conversations')
      .insert({ post_id: id, user_a_id: a, user_b_id: b })
      .select('id').single()
    if (created) navigate(`/chat/${created.id}`)
  }

  async function submitComment() {
    if (!session) { navigate('/login'); return }
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const { data, error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: session.user.id,
      content: commentText.trim(),
    }).select('id, content, created_at, users(nickname, phone)').single()
    setSubmittingComment(false)
    if (!error && data) {
      setComments(c => [...c, data])
      setCommentText('')
    }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  if (!post) return <div className="loading">加载中…</div>

  const isItem = post.type === 'item'
  const slug = post.categories?.slug ?? ''
  const isVehicle = slug === 'item-vehicle'
  // 与列表卡片保持一致的分类图标（拼车有专属 hero，不走这里）
  const heroEmoji = TYPE_EMOJI[slug] ?? TYPE_EMOJI[post.type] ?? (post.type === 'job' ? '💼' : '📦')
  const heroImage = images[0]?.url

  // 拼车专属 hero SVG
  const fromCity = attrs.find(a => a.key === 'from_city')?.value || post.city || '出发'
  const toCity   = attrs.find(a => a.key === 'to_city')?.value  || post.district || '到达'
  const RideHero = () => (
    <svg width="100%" height="100%" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid meet">
      <rect width="340" height="200" fill="#E8F4F0"/>
      <circle cx="72" cy="100" r="36" fill="#C53A2E" opacity="0.15"/>
      <circle cx="72" cy="100" r="24" fill="#C53A2E"/>
      <text x="72" y="107" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="Arial,sans-serif">{fromCity.slice(0,4)}</text>
      <circle cx="268" cy="100" r="36" fill="#2E6B4E" opacity="0.15"/>
      <circle cx="268" cy="100" r="24" fill="#2E6B4E"/>
      <text x="268" y="107" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="Arial,sans-serif">{toCity.slice(0,4)}</text>
      <line x1="96" y1="100" x2="244" y2="100" stroke="#1A7D8F" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="134" cy="100" r="7" fill="#fff" stroke="#1A7D8F" strokeWidth="2"/>
      <circle cx="206" cy="100" r="7" fill="#fff" stroke="#1A7D8F" strokeWidth="2"/>
      <rect x="148" y="86" width="44" height="28" rx="14" fill="#1A7D8F"/>
      <text x="170" y="104" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="Arial,sans-serif">顺风车</text>
    </svg>
  )

  const posterInitial = post.users?.nickname?.slice(0, 1) ?? '用'
  const posterName = post.users?.nickname ?? '用户'

  return (
    <>
      <Toast msg={toast} />

      {/* 全屏图片查看器 */}
      {viewerIndex !== null && (
        <ImageViewer
          images={images.map(i => i.url)}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* Hero */}
      <div className="det-hero" onClick={() => heroImage && !post.type === 'ride' && setViewerIndex(0)}
        style={{ cursor: heroImage && post.type !== 'ride' ? 'zoom-in' : 'default' }}>
        <button className="back-circle" onClick={e => { e.stopPropagation(); navigate(-1) }}>←</button>
        {post.type === 'ride'
          ? <RideHero />
          : heroImage
          ? <img src={heroImage} alt={post.title} />
          : isVehicle
          ? <CarThumb size={120} />
          : <span>{heroEmoji}</span>
        }
        {images.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            background: 'rgba(0,0,0,.45)', color: '#fff',
            fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          }}>
            1 / {images.length}
          </div>
        )}
      </div>

      <div className="det-body">
        {post.price != null && (
          <div className="det-price">€{Number(post.price).toLocaleString()}</div>
        )}
        <div className="det-title">{post.title}</div>

        <div className="det-tags">
          <span className={`badge ${isItem ? 'item' : 'job'}`}>
            {post.categories?.name_zh ?? (isItem ? '二手' : '招聘')}
          </span>
          {post.users?.is_verified && (
            <span className="badge blue">✓ 认证</span>
          )}
          {post.is_pinned && (
            <span className="badge" style={{ color: 'var(--red)', background: 'var(--red-soft)' }}>
              ⭐ 置顶
            </span>
          )}
        </div>

        {/* Dynamic attributes */}
        {attrs.length > 0 && (
          <div className="attr-grid">
            {attrs.map(a => (
              <div className="attr-item" key={a.key}>
                <span className="ak">{ATTR_LABELS[a.key] ?? a.key}</span>
                <span className="av">{a.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {post.description && (
          <div className="det-desc">{post.description}</div>
        )}

        {/* Image gallery (remaining images) */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {images.slice(1).map((img, i) => (
              <img
                key={i} src={img.url} alt=""
                onClick={() => setViewerIndex(i + 1)}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10,
                  border: '1px solid var(--line)', cursor: 'zoom-in' }}
              />
            ))}
          </div>
        )}

        {/* Contact info */}
        {(post.contact_wechat || post.contact_phone) && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)',
                        borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>联系方式</div>
            {post.contact_wechat && (
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                💬 微信：{post.contact_wechat}
              </div>
            )}
            {post.contact_phone && (
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                📱 电话：<a href={`tel:${post.contact_phone}`} style={{ color: 'var(--ink)' }}>
                  {post.contact_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Seller card */}
        <div
          className="seller-card"
          onClick={() => navigate(`/user/${post.user_id}`)}
          style={{ cursor: 'pointer' }}
        >
          <div className="avatar">{posterInitial}</div>
          <div style={{ flex: 1 }}>
            <div className="s-name">
              {posterName}
              {post.users?.is_verified && <span className="badge blue" style={{ fontSize: 10 }}>✓ 实名</span>}
            </div>
            <div className="s-meta">
              {post.users?.city && `${post.users.city} · `}查看 TA 的主页
            </div>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
        </div>

        {/* Comments */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
            评论 {comments.length > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>({comments.length})</span>}
          </div>

          {comments.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              暂无评论，来说第一句吧
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {(c.users?.nickname ?? c.users?.phone ?? '?').slice(0, 1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {c.users?.nickname ?? '用户'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#3d382f', lineHeight: 1.6,
                    background: '#fff', border: '1px solid var(--line)', borderRadius: '0 10px 10px 10px',
                    padding: '8px 11px' }}>
                    {c.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder={session ? '写评论…' : '登录后发表评论'}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              onClick={() => { if (!session) navigate('/login') }}
              style={{ flex: 1, background: '#fff', border: '1px solid var(--line)',
                borderRadius: 99, padding: '9px 14px', fontSize: 13.5,
                fontFamily: 'inherit', outline: 'none' }}
            />
            <button
              onClick={submitComment}
              disabled={submittingComment || !commentText.trim()}
              style={{ background: 'var(--red)', color: '#fff', border: 'none',
                borderRadius: 99, padding: '9px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', opacity: !commentText.trim() ? 0.4 : 1 }}
            >
              发送
            </button>
          </div>
        </div>

        {/* Spacer for sticky footer */}
        <div style={{ height: 16 }} />
      </div>

      {/* Sticky actions */}
      <div className="det-actions">
        <button className={`btn-icon ${isFav ? 'active' : ''}`} onClick={toggleFav}>
          <span className="ic">{isFav ? '⭐' : '☆'}</span>
          收藏
        </button>
        <button className="btn-icon" onClick={() => {
          if (!session) { navigate('/login'); return }
          setShowReport(true)
        }}>
          <span className="ic">⚑</span>
          举报
        </button>
        <button className="btn-msg" onClick={startChat}>
          站内私信
        </button>
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowReport(false) }}>
          <div className="modal-sheet" style={{ position: 'relative' }}>
            <h3>举报此帖子</h3>
            <button className="modal-close" onClick={() => setShowReport(false)}>✕</button>
            <div className="reason-list">
              {REPORT_REASONS.map(r => (
                <div
                  key={r}
                  className={`reason-chip ${reportReason === r ? 'selected' : ''}`}
                  onClick={() => setReportReason(r)}
                >
                  {r}
                </div>
              ))}
            </div>
            <div className="field">
              <label>补充说明（选填）</label>
              <textarea
                placeholder="详细描述问题…"
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                style={{ minHeight: 60 }}
              />
            </div>
            <button className="btn-primary" onClick={submitReport} disabled={submittingReport}>
              {submittingReport ? '提交中…' : '提交举报'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
