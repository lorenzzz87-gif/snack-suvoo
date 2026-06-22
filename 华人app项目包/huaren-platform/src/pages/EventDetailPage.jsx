import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

function formatEventTime(dateStr) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
  const wd = weekdays[d.getDay()]
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${wd} ${hour}:${min}`
}

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    supabase
      .from('events')
      .select('*, users(id, nickname, city)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setEvent(data); setLoading(false) })

    supabase
      .from('event_participants')
      .select('user_id, created_at, users(nickname, phone)')
      .eq('event_id', id)
      .order('created_at')
      .then(({ data }) => setParticipants(data ?? []))
  }, [id])

  useEffect(() => {
    if (!session) return
    setJoined(participants.some(p => p.user_id === session.user.id))
  }, [participants, session])

  async function toggleJoin() {
    if (!session) { navigate('/login'); return }
    setJoining(true)
    if (joined) {
      await supabase.from('event_participants')
        .delete().eq('event_id', id).eq('user_id', session.user.id)
      setParticipants(ps => ps.filter(p => p.user_id !== session.user.id))
      setJoined(false)
      showToast('已取消报名')
    } else {
      const full = event?.max_participants && participants.length >= event.max_participants
      if (full) { showToast('活动人数已满'); setJoining(false); return }
      const { data } = await supabase.from('event_participants')
        .insert({ event_id: id, user_id: session.user.id })
        .select('user_id, created_at, users(nickname, phone)').single()
      if (data) { setParticipants(ps => [...ps, data]); setJoined(true) }
      showToast('报名成功！')
    }
    setJoining(false)
  }

  const isOwner = session?.user?.id === event?.user_id
  const isFull = event?.max_participants && participants.length >= event.max_participants
  const isPast = event?.event_at && new Date(event.event_at) < new Date()

  if (loading) return <div className="loading">加载中…</div>
  if (!event) return <div className="empty"><div className="ic">😕</div>活动不存在</div>

  return (
    <>
      <Toast msg={toast} />

      {/* Hero：有封面图则显示封面，否则用紫色渐变 + 🎉 */}
      <div style={{ height: event.image_url ? 200 : 140,
        background: 'linear-gradient(135deg,#EDE0F5,#D9C2EE)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, position: 'relative', overflow: 'hidden' }}>
        <button className="back-circle" onClick={() => navigate(-1)}
          style={{ zIndex: 2 }}>←</button>
        {event.image_url
          ? <img src={event.image_url} alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '🎉'}
      </div>

      <div className="det-body">
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.35 }}>{event.title}</div>

        {/* 时间地点 */}
        <div style={{ background: '#F5F0FA', border: '1px solid #E0D0F0', borderRadius: 13, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <span>🕐</span>
            <span>{formatEventTime(event.event_at)}</span>
            {isPast && <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>（已结束）</span>}
          </div>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span>📍</span><span>{event.location}</span>
            </div>
          )}
          {event.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span>🌍</span><span>{event.city}</span>
            </div>
          )}
        </div>

        {/* 描述 */}
        {event.description && (
          <div className="det-desc">{event.description}</div>
        )}

        {/* 发起人 */}
        <div className="seller-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${event.user_id}`)}>
          <div className="avatar" style={{ background: '#7B4F9E' }}>
            {(event.users?.nickname ?? '用').slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="s-name">{event.users?.nickname ?? '用户'} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>发起人</span></div>
            <div className="s-meta">{event.users?.city}</div>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
        </div>

        {/* 参与者列表 */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
            参与者
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13, marginLeft: 6 }}>
              {participants.length}{event.max_participants ? `/${event.max_participants}` : ''} 人
            </span>
          </div>

          {participants.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
              还没有人报名，来第一个吧
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {participants.map(p => (
                <div key={p.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#7B4F9E',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800 }}>
                    {(p.users?.nickname ?? p.users?.phone ?? '?').slice(0, 1)}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 44,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.users?.nickname ?? '用户'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 80 }} />
      </div>

      {/* 报名按钮 */}
      {!isPast && !isOwner && (
        <div style={{ position: 'sticky', bottom: 0, background: '#fff',
          borderTop: '1px solid var(--line)', padding: '11px 16px 14px' }}>
          <button
            onClick={toggleJoin}
            disabled={joining || (isFull && !joined)}
            style={{
              width: '100%', border: 'none', borderRadius: 13, padding: 14,
              fontSize: 16, fontWeight: 800, cursor: 'pointer',
              background: joined ? 'var(--paper)' : isFull ? '#ccc' : '#7B4F9E',
              color: joined ? 'var(--ink)' : '#fff',
              border: joined ? '1px solid var(--line)' : 'none',
            }}
          >
            {joining ? '处理中…' : joined ? '✓ 已报名（点击取消）' : isFull ? '人数已满' : '🙋 我要参加'}
          </button>
        </div>
      )}
      {isPast && (
        <div style={{ position: 'sticky', bottom: 0, background: '#fff',
          borderTop: '1px solid var(--line)', padding: '11px 16px 14px' }}>
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 10 }}>
            活动已结束
          </div>
        </div>
      )}
    </>
  )
}
