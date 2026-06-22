import Logo from '../components/Logo'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const COUNTRY_CODES = [
  { code: '+39', label: '🇮🇹 +39' },
  { code: '+86', label: '🇨🇳 +86' },
  { code: '+1',  label: '🇺🇸 +1'  },
]

function phoneToCredentials(fullPhone) {
  const clean = fullPhone.replace(/[^0-9]/g, '')
  return {
    email: `${clean}@internal.zaiyiapp.com`,
    password: `zaiyi_${clean}_test`,
  }
}

// 设置密码弹窗（首次邮箱OTP登录后）
function SetPasswordModal({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSet() {
    if (pw.length < 6) { setError('密码至少6位'); return }
    if (pw !== pw2) { setError('两次密码不一致'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { setError(error.message); setLoading(false); return }
    // 标记已设密码
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ password_set: true }).eq('id', user.id)
    setLoading(false)
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '24px 24px 40px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>设置登录密码</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          设置后下次可直接用<b style={{ color: 'var(--ink)' }}>邮箱 + 密码</b>登录，无需验证码
        </div>

        <div className="field">
          <label>密码（至少6位）</label>
          <input type="password" placeholder="设置密码" value={pw}
            onChange={e => setPw(e.target.value)} />
        </div>
        <div className="field">
          <label>确认密码</label>
          <input type="password" placeholder="再输一次" value={pw2}
            onChange={e => setPw2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSet()} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={handleSet} disabled={loading}>
          {loading ? '设置中…' : '设置密码'}
        </button>
        <button onClick={onDone}
          style={{ background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 13, cursor: 'pointer' }}>
          跳过，继续用验证码登录
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [tab, setTab] = useState('google')
  const [countryCode, setCountryCode] = useState('+39')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  // email steps: 'input' | 'otp' | 'password'（已设密码直接输密码）
  const [emailStep, setEmailStep] = useState('input')
  const [otp, setOtp] = useState('')
  const [emailPw, setEmailPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showSetPw, setShowSetPw] = useState(false)
  const [blockNav, setBlockNav] = useState(false)  // 阻止自动跳转，等密码检查完

  useEffect(() => {
    if (session && !showSetPw && !blockNav) navigate('/app', { replace: true })
  }, [session, showSetPw, blockNav, navigate])

  function checkAgreed() {
    if (!agreed) { setError('请先勾选同意用户协议'); return false }
    setError(''); return true
  }

  // ── Google ──────────────────────────────────────────────
  async function handleGoogle() {
    if (!checkAgreed()) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  // ── 邮箱：检查是否已设密码 ────────────────────────────────
  async function handleEmailNext() {
    if (!checkAgreed()) return
    if (!email.includes('@')) { setError('请输入正确的邮箱'); return }
    setLoading(true)
    // 尝试用密码登录（随机密码），如果返回 "Invalid login credentials" 说明有账号但要查密码状态
    // 更直接：查 users 表 phone 字段匹配 email，看 password_set
    // 简化：直接提供两个按钮让用户选
    setLoading(false)
    // 查是否已有账号且设了密码
    const { data } = await supabase
      .from('users')
      .select('password_set')
      .eq('phone', email)  // email登录时phone字段存的是email（触发器逻辑）
      .maybeSingle()
    if (data?.password_set) {
      setEmailStep('password')
    } else {
      await sendOtp()
    }
  }

  async function sendOtp() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) { setError(error.message); return }
    setEmailStep('otp')
  }

  async function verifyEmailOtp() {
    if (otp.length < 6) { setError('请输入验证码'); return }
    setBlockNav(true)   // 先锁住自动跳转
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) { setError('验证码错误或已过期，请重试'); setBlockNav(false); return }
    // 检查是否已设密码
    if (data?.user) {
      const { data: u } = await supabase.from('users').select('password_set').eq('id', data.user.id).single()
      if (!u?.password_set) {
        setShowSetPw(true)   // 弹设密码
        setBlockNav(false)
        return
      }
    }
    setBlockNav(false)  // 没需要设密码，放行跳首页
  }

  async function signInWithPassword() {
    if (emailPw.length < 1) { setError('请输入密码'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: emailPw })
    setLoading(false)
    if (error) { setError('密码错误，或改用验证码登录'); return }
  }

  // ── 手机号（内测）──────────────────────────────────────
  async function handlePhone() {
    if (!checkAgreed()) return
    if (phone.replace(/\s/g, '').length < 6) { setError('请输入正确的手机号'); return }
    setLoading(true)
    const fullPhone = `${countryCode}${phone.replace(/\s/g, '')}`
    const { email: e, password: p } = phoneToCredentials(fullPhone)
    let { data, error: signInErr } = await supabase.auth.signInWithPassword({ email: e, password: p })
    if (signInErr) {
      const { data: d2, error: signUpErr } = await supabase.auth.signUp({ email: e, password: p })
      if (signUpErr) { setError(signUpErr.message || '登录失败'); setLoading(false); return }
      data = d2
    }
    if (data?.user) {
      await supabase.from('users').upsert({ id: data.user.id, phone: fullPhone }, { onConflict: 'id' })
    }
    setLoading(false)
  }

  const tabStyle = (t) => ({
    flex: 1, padding: '10px 0', border: 'none', background: 'none',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    color: tab === t ? 'var(--ink)' : 'var(--muted)',
    borderBottom: `2px solid ${tab === t ? 'var(--red)' : 'transparent'}`,
    transition: 'all .15s',
  })

  return (
    <div className="login-page">
      {showSetPw && <SetPasswordModal onDone={() => { setShowSetPw(false) }} />}

      <Logo variant="vertical" size={0.9} />
      <div className="login-subtitle">意大利华人招聘 · 二手信息平台</div>

      <div className="login-form">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
          <button style={tabStyle('google')} onClick={() => { setTab('google'); setError('') }}>Google</button>
          <button style={tabStyle('email')} onClick={() => { setTab('email'); setError(''); setEmailStep('input') }}>邮箱</button>
          <button style={tabStyle('phone')} onClick={() => { setTab('phone'); setError('') }}>手机号</button>
        </div>

        {/* ── Google ── */}
        {tab === 'google' && (
          <button onClick={handleGoogle} style={{
            width: '100%', padding: '13px 16px', borderRadius: 13,
            border: '1.5px solid var(--line)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.5l-6.6-5.6C29.8 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 35.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C37.9 39.4 44 35 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            使用 Google 账号登录
          </button>
        )}

        {/* ── 邮箱 ── */}
        {tab === 'email' && (
          <>
            {emailStep === 'input' && (
              <>
                <div className="field">
                  <input type="email" placeholder="输入邮箱地址" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailNext()} />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button className="btn-primary" onClick={handleEmailNext} disabled={loading}>
                  {loading ? '检查中…' : '下一步'}
                </button>
              </>
            )}

            {/* 已设密码 → 直接输密码 */}
            {emailStep === 'password' && (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  登录 <b style={{ color: 'var(--ink)' }}>{email}</b>
                </p>
                <div className="field">
                  <input type="password" placeholder="输入密码" value={emailPw}
                    onChange={e => setEmailPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && signInWithPassword()} />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button className="btn-primary" onClick={signInWithPassword} disabled={loading}>
                  {loading ? '登录中…' : '登录'}
                </button>
                <button onClick={() => { setEmailStep('input'); setEmailPw(''); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
                  ← 换个邮箱
                </button>
                <button onClick={sendOtp}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                  忘记密码？用验证码登录
                </button>
              </>
            )}

            {/* 输入OTP */}
            {emailStep === 'otp' && (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  验证码已发至 <b style={{ color: 'var(--ink)' }}>{email}</b>
                </p>
                <div className="field">
                  <input type="number" placeholder="输入验证码" value={otp}
                    onChange={e => setOtp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verifyEmailOtp()}
                    maxLength={8} style={{ letterSpacing: 6, fontSize: 20, textAlign: 'center' }} />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button className="btn-primary" onClick={verifyEmailOtp} disabled={loading}>
                  {loading ? '验证中…' : '登录 / 注册'}
                </button>
                <button onClick={() => { setEmailStep('input'); setOtp(''); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
                  ← 重新输入邮箱
                </button>
              </>
            )}
          </>
        )}

        {/* ── 手机号（内测）── */}
        {tab === 'phone' && (
          <>
            <div className="phone-row">
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <input type="tel" placeholder="手机号码" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePhone()} />
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn-primary" onClick={handlePhone} disabled={loading}>
              {loading ? '登录中…' : '登录 / 注册'}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
              📱 内测版 · 正式上线后改为短信验证码
            </p>
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--red)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
            我已阅读并同意
            <a href="/terms" target="_blank" style={{ color: 'var(--red)', margin: '0 2px' }}>《用户协议》</a>
            及
            <a href="/privacy" target="_blank" style={{ color: 'var(--red)', margin: '0 2px' }}>《隐私政策》</a>
          </span>
        </label>
      </div>
    </div>
  )
}
