import Logo from '../components/Logo'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

function formatEventTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d - now
  const days = Math.floor(diff / 86400000)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const dateLabel = days === 0 ? '今天' : days === 1 ? '明天' : `${month}月${day}日`
  return `${dateLabel} ${hour}:${min}`
}

export default function EventsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select(`
        id, title, city, location, event_at, max_participants, created_at, image_url,
        users(nickname),
        event_participants(count)
      `)
      .eq('status', 'active')
      .gte('event_at', new Date().toISOString())
      .order('event_at', { ascending: true })
      .limit(30)
      .then(({ data }) => { setEvents(data ?? []); setLoading(false) })
  }, [])

  return (
    <>
      <header className="topbar">
        <Logo variant="topbar" size={0.85} />
        <span className="brand" style={{ color: '#7B4F9E' }}>同城活动</span>
        <div style={{ flex: 1 }} />
      </header>

      <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800 }}>即将举行</h3>
        <button
          onClick={() => navigate(session ? '/create-event' : '/login')}
          style={{ background: '#7B4F9E', color: '#fff', border: 'none', borderRadius: 99,
            padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + 发起活动
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : events.length === 0 ? (
        <div className="empty">
          <div className="ic">🎉</div>
          暂无活动，来发起第一个吧
        </div>
      ) : (
        <div className="feed">
          {events.map(ev => {
            const count = ev.event_participants?.[0]?.count ?? 0
            const full = ev.max_participants && count >= ev.max_participants
            return (
              <div key={ev.id} className="card" onClick={() => navigate(`/event/${ev.id}`)}>
                {ev.image_url && (
                  <img src={ev.image_url} alt={ev.title}
                    style={{ width: '100%', height: 140, objectFit: 'cover',
                      borderRadius: 10, marginBottom: 10, display: 'block' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ flex: 1, marginBottom: 0 }}>{ev.title}</h4>
                  {full && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                      background: '#F3F0F5', color: '#7B4F9E', marginLeft: 8, flexShrink: 0 }}>已满</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: '#7B4F9E', fontWeight: 600 }}>
                    🕐 {formatEventTime(ev.event_at)}
                  </span>
                  {ev.location && (
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>📍 {ev.location}</span>
                  )}
                </div>
                <div className="sub">
                  <span>{ev.city}</span>
                  <span>👥 {count}{ev.max_participants ? `/${ev.max_participants}` : ''} 人参加</span>
                  <span>发起人：{ev.users?.nickname ?? '用户'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
