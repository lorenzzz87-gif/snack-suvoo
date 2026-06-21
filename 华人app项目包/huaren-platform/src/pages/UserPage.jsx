import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

export default function UserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notPublic, setNotPublic] = useState(false)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, nickname, phone, city, profile_public, created_at')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data || !data.profile_public) {
          setNotPublic(true)
          setLoading(false)
          return
        }
        setUser(data)
        return supabase
          .from('posts')
          .select('id, title, type, trade_direction, city, district, price, is_pinned, created_at, categories(name_zh, slug, type), users(nickname, is_verified), post_attributes(key, value)')
          .eq('user_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20)
      })
      .then(res => {
        if (res?.data) setPosts(res.data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="loading">加载中…</div>

  if (notPublic) return (
    <>
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>用户主页</h2>
      </header>
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="ic">🔒</div>
        该用户未开放主页
      </div>
    </>
  )

  const initial = user?.nickname?.slice(0, 1) ?? '用'
  const joinYear = user?.created_at ? new Date(user.created_at).getFullYear() : ''

  return (
    <>
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>用户主页</h2>
      </header>

      {/* 用户信息卡 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff',
          border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>{initial}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.nickname ?? '用户'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
              {user?.city && `${user.city} · `}注册于 {joinYear} 年
            </div>
          </div>
        </div>
      </div>

      {/* 发布的帖子 */}
      <div className="feed-head" style={{ marginTop: 16 }}>
        <h3>TA 的发布</h3>
        <span>{posts.length} 条</span>
      </div>

      {posts.length === 0 ? (
        <div className="empty"><div className="ic">📭</div>暂无发布</div>
      ) : (
        <div className="feed">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </>
  )
}
