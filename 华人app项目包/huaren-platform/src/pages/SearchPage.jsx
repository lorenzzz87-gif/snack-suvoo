import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import { TOOL_SEARCH } from './ToolsPage'

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const inputRef = useRef()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [posts, setPosts] = useState([])
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
    const q = searchParams.get('q')
    if (q) { setQuery(q); doSearch(q) }
  }, [])

  async function doSearch(q = query) {
    const term = q.trim()
    if (!term) return
    setLoading(true)
    setSearched(true)
    setSearchParams({ q: term })

    // 匹配小工具（标题 / 关键词）
    const lower = term.toLowerCase()
    setTools(TOOL_SEARCH.filter(t =>
      t.title.toLowerCase().includes(lower) || t.kw.toLowerCase().includes(lower)
    ))

    const { data } = await supabase
      .from('posts')
      .select(`
        id, title, type, trade_direction, city, district, price, is_pinned, created_at,
        categories(name_zh, slug, type),
        users(nickname, is_verified),
        post_attributes(key, value)
      `)
      .eq('status', 'active')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    setPosts(data ?? [])
    setLoading(false)
  }

  return (
    <>
      {/* 顶部搜索栏 */}
      <header className="topbar" style={{ gap: 8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: 'var(--ink)', flexShrink: 0, lineHeight: 1 }}>
          ←
        </button>
        <div style={{ flex: 1, display: 'flex', background: '#fff',
          border: '1px solid var(--line)', borderRadius: 99,
          padding: '0 12px', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--muted)', fontSize: 15 }}>🔍</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="搜工作、搜二手、搜货源…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 14,
              background: 'transparent', color: 'var(--ink)', padding: '9px 0',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setPosts([]); setTools([]); setSearched(false); inputRef.current?.focus() }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: 16, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => doSearch()}
          style={{ background: 'var(--red)', color: '#fff', border: 'none',
            borderRadius: 99, padding: '8px 14px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0 }}>
          搜索
        </button>
      </header>

      {/* 搜索结果 */}
      {!searched ? (
        <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <div>搜招聘信息、二手商品、货源…</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
            支持关键词搜索标题和描述
          </div>
        </div>
      ) : loading ? (
        <div className="loading">搜索中…</div>
      ) : posts.length === 0 && tools.length === 0 ? (
        <div className="empty">
          <div className="ic">📭</div>
          没有找到「{searchParams.get('q')}」的相关结果
        </div>
      ) : (
        <>
          {/* 小工具结果 */}
          {tools.length > 0 && (
            <>
              <div className="feed-head">
                <h3>🛠️ 小工具</h3>
                <span>{tools.length} 个</span>
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tools.map(t => (
                  <div key={t.id}
                    onClick={() => navigate(`/tools?open=${t.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
                      border: '1px solid var(--line)', borderRadius: 14, padding: '13px 16px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>小工具 · 点击打开</div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 帖子结果 */}
          {posts.length > 0 && (
            <>
              <div className="feed-head">
                <h3>搜索结果</h3>
                <span>{posts.length} 条</span>
              </div>
              <div className="feed">
                {posts.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
