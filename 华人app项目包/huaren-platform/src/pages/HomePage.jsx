import Logo from '../components/Logo'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import CityPicker from '../components/CityPicker'
import AdBanner from '../components/AdBanner'

export default function HomePage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState(null)
  const [activeCatId, setActiveCatId] = useState(null)
  const [city, setCity] = useState(() => localStorage.getItem('selectedCity') || '全意大利')

  // Load sub-categories for chips
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name_zh, slug, type, parent_id')
      .eq('is_active', true)
      .not('parent_id', 'is', null)  // only level-2
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  // Load posts whenever filter changes
  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select(`
        id, title, type, trade_direction, city, district, price, is_pinned, created_at,
        categories(name_zh, slug, type),
        users(nickname, is_verified),
        post_attributes(key, value)
      `)
      .eq('status', 'active')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    if (activeCatId) query = query.eq('category_id', activeCatId)
    else if (activeType) query = query.eq('type', activeType)
    if (city && city !== '全意大利') query = query.eq('city', city)

    query.then(({ data }) => {
      setPosts(data ?? [])
      setLoading(false)
    })
  }, [activeType, activeCatId, city])

  function handleTile(type) {
    if (activeType === type && !activeCatId) {
      setActiveType(null)
      localStorage.removeItem('lastPostType')
    } else {
      setActiveType(type)
      setActiveCatId(null)
      localStorage.setItem('lastPostType', type)
    }
  }

  function handleChip(cat) {
    if (activeCatId === cat.id) {
      setActiveCatId(null)
      setActiveType(null)
      localStorage.removeItem('lastPostType')
    } else {
      setActiveCatId(cat.id)
      setActiveType(cat.type)
      localStorage.setItem('lastPostType', cat.type)
    }
  }

  function handleAllChip() {
    setActiveCatId(null)
    setActiveType(null)
  }

  const visibleChips = activeType
    ? categories.filter(c => c.type === activeType)
    : categories

  return (
    <>
      {/* Top bar */}
      <header className="topbar">
        <Logo variant="topbar" size={1} />
        <span className="brand"><span style={{color:'var(--ink)'}}>在</span>意</span>
        <CityPicker value={city} onChange={c => { setCity(c); localStorage.setItem('selectedCity', c) }} />
        <div className="search-box" onClick={() => navigate('/search')}>
          🔍 搜工作、搜二手…
        </div>
      </header>

      {/* Category tiles */}
      <div className="tiles">
        <button
          className={`tile jobs ${activeType === 'job' ? 'ring' : ''}`}
          onClick={() => handleTile('job')}
          style={activeType === 'job' ? { outline: '3px solid rgba(255,255,255,.6)' } : {}}
        >
          <div>
            <div className="t-name">招聘</div>
            <div className="t-sub">找工作 · 招人</div>
          </div>
          <span className="t-icon">💼</span>
        </button>
        <button
          className="tile goods"
          onClick={() => handleTile('item')}
          style={activeType === 'item' ? { outline: '3px solid rgba(255,255,255,.6)' } : {}}
        >
          <div>
            <div className="t-name">二手</div>
            <div className="t-sub">买卖闲置</div>
          </div>
          <span className="t-icon">📦</span>
        </button>
        <button
          className="tile wholesale"
          onClick={() => navigate('/wholesale')}
          style={{ background: '#2B6E8F' }}
        >
          <div>
            <div className="t-name">倒货</div>
            <div className="t-sub">供货 · 求货</div>
          </div>
          <span className="t-icon">🏭</span>
        </button>
        <button
          className="tile"
          onClick={() => navigate('/events')}
          style={{ background: '#7B4F9E' }}
        >
          <div>
            <div className="t-name">活动</div>
            <div className="t-sub">同城聚会</div>
          </div>
          <span className="t-icon">🎉</span>
        </button>
      </div>

      {/* 第二行：租房 + 拼车 */}
      <div className="tiles" style={{ paddingTop: 0 }}>
        <button className="tile" onClick={() => navigate('/rental')} style={{ background: '#C4761A' }}>
          <div><div className="t-name">租房</div><div className="t-sub">出租 · 找房 · 合租</div></div>
          <span className="t-icon">🏠</span>
        </button>
        <button className="tile" onClick={() => navigate('/ride')} style={{ background: '#1A7D8F' }}>
          <div><div className="t-name">拼车</div><div className="t-sub">顺风车 · 找搭乘</div></div>
          <span className="t-icon">🚗</span>
        </button>
      </div>

      {/* 工具 + 商圈入口 */}
      <div style={{ padding: '0 16px 4px', display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/tools')}
          style={{ flex: 1, background: 'linear-gradient(135deg,#F5EDD8,#EDE3C8)',
            border: '1px solid #D4C4A0', borderRadius: 18, padding: '13px 14px',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 24 }}>🛠️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7A5C1E' }}>华商小工具</div>
            <div style={{ fontSize: 11, color: '#9A7C3E', marginTop: 1 }}>汇率·税务·工资</div>
          </div>
        </button>
        <button onClick={() => navigate('/shangquan')}
          style={{ flex: 1, background: 'linear-gradient(135deg,#F5F0FA,#EDE0F5)',
            border: '1px solid #E0D0F0', borderRadius: 18, padding: '13px 14px',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 24 }}>🏪</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7B4F9E' }}>商圈</div>
            <div style={{ fontSize: 11, color: '#9B7FBE', marginTop: 1 }}>华人口碑首选</div>
          </div>
        </button>
      </div>


      {/* Sub-category chips */}
      <div className="chips">
        <div
          className={`chip ${!activeCatId && !activeType ? 'active' : ''}`}
          onClick={handleAllChip}
        >
          全部
        </div>
        {visibleChips.map(cat => (
          <div
            key={cat.id}
            className={`chip ${activeCatId === cat.id ? 'active' : ''}`}
            onClick={() => handleChip(cat)}
          >
            {cat.name_zh}
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="feed-head">
        <h3>最新发布</h3>
        <span>实时更新</span>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="empty">
          <div className="ic">📭</div>
          暂无帖子，来发第一条吧
        </div>
      ) : (
        <div className="feed">
          {posts.map((post, i) => (
            <>
              <PostCard key={post.id} post={post} />
              {/* 每5条帖子后插入一个广告位 */}
              {(i + 1) % 5 === 0 && i < posts.length - 1 && (
                <AdBanner key={`ad-${i}`} />
              )}
            </>
          ))}
        </div>
      )}
    </>
  )
}
