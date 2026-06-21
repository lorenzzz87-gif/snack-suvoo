import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import PostCard from '../components/PostCard'

export default function MyFavoritesPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    supabase
      .from('favorites')
      .select(`
        post_id,
        posts(
          id, title, type, trade_direction, city, district, price, is_pinned, created_at, status,
          categories(name_zh, slug, type),
          users(nickname, is_verified),
          post_attributes(key, value)
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const active = (data ?? [])
          .map(f => f.posts)
          .filter(p => p && p.status === 'active')
        setPosts(active)
        setLoading(false)
      })
  }, [session])

  return (
    <>
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>我的收藏</h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
          共 {posts.length} 条
        </span>
      </header>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="empty">
          <div className="ic">⭐</div>
          还没有收藏任何帖子<br />
          <span style={{ fontSize: 12 }}>在帖子详情页点「收藏」按钮</span>
        </div>
      ) : (
        <div className="feed" style={{ paddingTop: 12 }}>
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </>
  )
}
