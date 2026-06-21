import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import Avatar from '../components/Avatar'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [merchant, setMerchant] = useState(null)
  const isAdmin = profile?.role === 'admin'

  async function toggleProfilePublic() {
    const next = !profile?.profile_public
    setProfile(p => ({ ...p, profile_public: next }))
    await supabase.from('users').update({ profile_public: next }).eq('id', session.user.id)
  }

  useEffect(() => {
    if (!session) return
    supabase
      .from('users')
      .select('nickname, phone, city, is_verified, role, profile_public, avatar_url, gender')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
    supabase
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setMerchant({ count: count ?? 0 }))
  }, [session])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const display = profile?.nickname ?? profile?.phone ?? '用户'
  const genderMeta = { male: { icon: '🙋‍♂️', color: '#2B6E8F', bg: '#EEF5F9' }, female: { icon: '🙋‍♀️', color: '#C2436E', bg: '#FAEEF3' }, private: { icon: '🤐', color: '#7B4F9E', bg: '#F5F0FA' } }
  const genderInfo = genderMeta[profile?.gender]

  return (
    <>
      <header className="form-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h2>我的</h2>
      </header>

      <div className="profile-page">
        <div className="profile-header">
          <Avatar url={profile?.avatar_url} nickname={display} size={64} />
          <div className="profile-info">
            <h2>{display}</h2>
            <p style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{profile?.phone ?? session?.user?.phone}</span>
              {genderInfo && <span style={{ fontSize: 13, background: genderInfo.bg,
                color: genderInfo.color, borderRadius: 99, padding: '1px 8px',
                fontWeight: 700 }}>
                {genderInfo.icon}
              </span>}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/setup')}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 11,
            padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--muted)',
            cursor: 'pointer', textAlign: 'left' }}>
          ✏️ 编辑资料 / 修改头像
        </button>

        <div className="menu-list">
          <button className="menu-item" onClick={() => navigate('/my-posts')}>
            <span>我的发布</span>
            <span className="arrow">›</span>
          </button>
          <button className="menu-item" onClick={() => navigate('/my-favorites')}>
            <span>我的收藏</span>
            <span className="arrow">›</span>
          </button>
          <button className="menu-item" onClick={() => navigate(merchant?.count ? '/my-merchants' : '/merchant/register')}>
            <span>🏪 我的商家{merchant?.count ? '（管理）' : '（入驻）'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {merchant?.count > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                  {merchant.count} 个
                </span>
              )}
              <span className="arrow">›</span>
            </span>
          </button>
          <div className="menu-item" style={{ cursor: 'default' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>公开我的主页</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                开启后他人可查看你发布的帖子
              </div>
            </div>
            <div
              className={`switch-track ${profile?.profile_public ? 'on' : 'off'}`}
              onClick={toggleProfilePublic}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            />
          </div>
          {isAdmin && (
            <button className="menu-item" onClick={() => navigate('/admin')}
              style={{ color: 'var(--red)' }}>
              <span>🛡️ 管理后台</span>
              <span className="arrow">›</span>
            </button>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid var(--line)', borderRadius: 13,
            padding: '14px', width: '100%', fontSize: 15, fontWeight: 700,
            color: 'var(--muted)', cursor: 'pointer'
          }}
        >
          退出登录
        </button>
      </div>
    </>
  )
}
