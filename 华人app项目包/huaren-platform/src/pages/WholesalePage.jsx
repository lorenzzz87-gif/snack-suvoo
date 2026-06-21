import Logo from '../components/Logo'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

export default function WholesalePage() {
  const navigate = useNavigate()
  const [direction, setDirection] = useState('offer')   // 'offer' | 'want'
  const [categories, setCategories] = useState([])
  const [activeCatId, setActiveCatId] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name_zh, slug')
      .eq('is_active', true)
      .eq('type', 'wholesale')
      .not('parent_id', 'is', null)
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select(`
        id, title, type, city, district, price, is_pinned, created_at, trade_direction,
        categories(name_zh, slug, type),
        users(nickname, is_verified),
        post_attributes(key, value)
      `)
      .eq('status', 'active')
      .eq('type', 'wholesale')
      .eq('trade_direction', direction)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    if (activeCatId) query = query.eq('category_id', activeCatId)

    query.then(({ data }) => {
      setPosts(data ?? [])
      setLoading(false)
    })
  }, [direction, activeCatId])

  return (
    <>
      <header className="topbar">
        <button className="back-btn" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} onClick={() => navigate(-1)}>←</button>
        <Logo variant="topbar" size={0.8} />
        <span className="brand" style={{ color: '#2B6E8F' }}>倒货供求</span>
        <div style={{ flex: 1 }} />
        <a
          href="#"
          style={{ fontSize: 12, color: '#2B6E8F', textDecoration: 'underline' }}
          onClick={e => { e.preventDefault(); alert('发布须知文案即将上线') }}
        >
          发布须知
        </a>
      </header>

      {/* 供 / 求 segment */}
      <div style={{ padding: '14px 16px 0' }}>
        <div className="seg-control">
          <button
            className={direction === 'offer' ? 'active-job' : ''}
            style={direction === 'offer' ? { background: '#2B6E8F' } : {}}
            onClick={() => { setDirection('offer'); setActiveCatId(null) }}
          >
            🏭 供货（我有货）
          </button>
          <button
            className={direction === 'want' ? 'active-item' : ''}
            style={direction === 'want' ? { background: '#E07B39' } : {}}
            onClick={() => { setDirection('want'); setActiveCatId(null) }}
          >
            🔍 求货（我要货）
          </button>
        </div>
      </div>

      {/* Sub-category chips */}
      <div className="chips" style={{ padding: '12px 16px 10px' }}>
        <div
          className={`chip ${!activeCatId ? 'active' : ''}`}
          onClick={() => setActiveCatId(null)}
        >
          全部
        </div>
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`chip ${activeCatId === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
          >
            {cat.name_zh}
          </div>
        ))}
      </div>

      <div className="feed-head">
        <h3>{direction === 'offer' ? '供货信息' : '求货信息'}</h3>
        <span>实时更新</span>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="empty">
          <div className="ic">📭</div>
          暂无{direction === 'offer' ? '供货' : '求货'}信息，来发第一条吧
        </div>
      ) : (
        <div className="feed">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </>
  )
}
