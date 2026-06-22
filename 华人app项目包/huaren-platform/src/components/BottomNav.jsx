import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../App'

// 品牌风格 SVG 图标：细线条，圆角，与 logo mark 同气质
const Icons = {
  home: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--red)' : 'var(--muted)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"/>
      <path d="M9.5 21v-7h5v7"/>
    </svg>
  ),
  search: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--red)' : 'var(--muted)'}
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="16.5" y1="16.5" x2="21" y2="21"/>
    </svg>
  ),
  message: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--red)' : 'var(--muted)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 2H4a1 1 0 00-1 1v13a1 1 0 001 1h3l4 4 4-4h5a1 1 0 001-1V3a1 1 0 00-1-1z"/>
    </svg>
  ),
  profile: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--red)' : 'var(--muted)'}
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
    </svg>
  ),
  plus: () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none"
      stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      <line x1="13" y1="5" x2="13" y2="21"/>
      <line x1="5" y1="13" x2="21" y2="13"/>
    </svg>
  ),
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const path = location.pathname

  function handleCreate() {
    if (!session) { navigate('/login'); return }
    setShowMenu(m => !m)
  }

  function goCreate(route) {
    setShowMenu(false)
    if (route === '/create') {
      // 倒货页直接带 wholesale 类型，否则读上次浏览的类型
      const type = path === '/wholesale' ? 'wholesale'
        : path === '/rental' ? 'rental'
        : path === '/ride' ? 'ride'
        : (localStorage.getItem('lastPostType') || 'job')
      navigate(`/create?type=${type}`)
    } else {
      navigate(route)
    }
  }

  return (
    <>
      {/* 发布选择菜单 */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 29 }}
        />
      )}
      {showMenu && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          width: 200, background: '#fff', borderRadius: 16, zIndex: 31,
          boxShadow: '0 8px 30px rgba(0,0,0,.18)',
          overflow: 'hidden', border: '1px solid var(--line)',
        }}>
          {[
            { label: '📋 发帖', sub: '招聘 · 二手 · 倒货', route: '/create' },
            { label: '🎉 发起活动', sub: '同城聚会', route: '/create-event' },
          ].map(item => (
            <div key={item.route} onClick={() => goCreate(item.route)}
              style={{ padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      <nav className="bottom-nav">
        <a className={path === '/app' ? 'active' : ''} onClick={() => navigate('/app')}>
          {Icons.home(path === '/app')}
          <span>首页</span>
        </a>
        <a className={path === '/search' ? 'active' : ''} onClick={() => navigate('/search')}>
          {Icons.search(path === '/search')}
          <span>搜索</span>
        </a>
        <button onClick={handleCreate} style={{ paddingBottom: 10 }}>
          <span className="plus-btn" style={{ transform: showMenu ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>
            {Icons.plus()}
          </span>
        </button>
        <a className={path === '/messages' ? 'active' : ''} onClick={() => navigate('/messages')}>
          {Icons.message(path === '/messages')}
          <span>消息</span>
        </a>
        <a className={path === '/profile' ? 'active' : ''} onClick={() => navigate('/profile')}>
          {Icons.profile(path === '/profile')}
          <span>我的</span>
        </a>
      </nav>
    </>
  )
}
