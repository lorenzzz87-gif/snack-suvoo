import { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import PostDetailPage from './pages/PostDetailPage'
import ProfilePage from './pages/ProfilePage'
import WholesalePage from './pages/WholesalePage'
import AdminPage from './pages/AdminPage'
import UserPage from './pages/UserPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import MessagesPage from './pages/MessagesPage'
import SearchPage from './pages/SearchPage'
import MyPostsPage from './pages/MyPostsPage'
import MyFavoritesPage from './pages/MyFavoritesPage'
import ShangquanPage from './pages/ShangquanPage'
import RentalPage from './pages/RentalPage'
import RidePage from './pages/RidePage'
import ToolsPage from './pages/ToolsPage'
import VolantinoPage from './pages/VolantinoPage'
import MerchantDetailPage from './pages/MerchantDetailPage'
import RegisterMerchantPage from './pages/RegisterMerchantPage'
import MyMerchantsPage from './pages/MyMerchantsPage'
import ChatPage from './pages/ChatPage'
import SetupPage from './pages/SetupPage'
import BottomNav from './components/BottomNav'

// ── Auth context ──────────────────────────────────────────────
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkSetup(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) checkSetup(session.user.id)
      else setNeedsSetup(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSetup(userId) {
    const { data } = await supabase.from('users').select('setup_done').eq('id', userId).single()
    setNeedsSetup(!data?.setup_done)
  }

  return (
    <AuthContext.Provider value={{ session, needsSetup, setNeedsSetup }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Protected route ───────────────────────────────────────────
function RequireAuth({ children }) {
  const { session } = useAuth()
  // undefined = 还在加载，等一下再判断
  if (session === undefined) return <div className="loading">加载中…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

// 给魔法链接回调用：处理 URL hash 里的 token
function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/' : '/login', { replace: true })
    })
  }, [navigate])
  return <div className="loading">登录中…</div>
}

// ── App shell with nav ────────────────────────────────────────
function Shell({ children }) {
  const location = useLocation()
  const { needsSetup, session } = useAuth()
  const noNav = ['/login', '/setup'].includes(location.pathname)

  // 登录后未完成设置 → 自动跳到 setup（跳过页除外）
  if (session && needsSetup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    <div className="app-shell">
      <div className="page-scroll">{children}</div>
      {!noNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/wholesale" element={<WholesalePage />} />
          <Route
            path="/user/:id" element={<UserPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
          <Route path="/create-event" element={<RequireAuth><CreateEventPage /></RequireAuth>} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/my-posts" element={<RequireAuth><MyPostsPage /></RequireAuth>} />
          <Route path="/my-favorites" element={<RequireAuth><MyFavoritesPage /></RequireAuth>} />
          <Route path="/shangquan" element={<ShangquanPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/volantino" element={<RequireAuth><VolantinoPage /></RequireAuth>} />
          <Route path="/rental" element={<RentalPage />} />
          <Route path="/ride" element={<RidePage />} />
          <Route path="/merchant/:id" element={<MerchantDetailPage />} />
          <Route path="/merchant/register" element={<RequireAuth><RegisterMerchantPage /></RequireAuth>} />
          <Route path="/my-merchants" element={<RequireAuth><MyMerchantsPage /></RequireAuth>} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/chat/:id" element={<RequireAuth><ChatPage /></RequireAuth>} />
          <Route path="/admin"
            element={<RequireAuth><AdminPage /></RequireAuth>}
          />
          <Route
            path="/create"
            element={<RequireAuth><CreatePostPage /></RequireAuth>}
          />
          <Route
            path="/profile"
            element={<RequireAuth><ProfilePage /></RequireAuth>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </AuthProvider>
  )
}
