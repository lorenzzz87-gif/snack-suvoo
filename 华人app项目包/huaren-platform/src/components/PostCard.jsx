import { useNavigate } from 'react-router-dom'

// 右侧图标：极简线条（跟随主题色）
function CarIcon({ stroke = '#0D5060', bg = '#EAF5F6', size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <rect x="6" y="18" width="32" height="14" rx="4" stroke={stroke} strokeWidth="2"/>
      <path d="M10 18L14 10H30L34 18" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="13" cy="32" r="4" fill={bg} stroke={stroke} strokeWidth="2"/>
      <circle cx="31" cy="32" r="4" fill={bg} stroke={stroke} strokeWidth="2"/>
      <rect x="14" y="12" width="7" height="6" rx="1" fill={stroke} opacity=".3"/>
      <rect x="23" y="12" width="7" height="6" rx="1" fill={stroke} opacity=".3"/>
    </svg>
  )
}

// 左侧缩略图：拼车图标（品牌针5人放射）
function CarpoolThumb() {
  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="10" fill="#C53A2E"/>
      <line x1="32" y1="42" x2="32" y2="52" stroke="#1F1B18" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="55" r="3" fill="#2E6B4E"/>
      <text x="32" y="36" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="Arial,sans-serif">拼</text>
      <circle cx="8" cy="8" r="6" fill="#1F1B18"/><circle cx="8" cy="6.5" r="2.2" fill="#FBEDEA"/><path d="M3 13C3 11 5 9.5 8 9.5S13 11 13 13" fill="#C53A2E"/>
      <circle cx="32" cy="4" r="6" fill="#1F1B18"/><circle cx="32" cy="2.5" r="2.2" fill="#FBEDEA"/><path d="M27 9C27 7 29 5.5 32 5.5S37 7 37 9" fill="#C53A2E"/>
      <circle cx="56" cy="8" r="6" fill="#1F1B18"/><circle cx="56" cy="6.5" r="2.2" fill="#FBEDEA"/><path d="M51 13C51 11 53 9.5 56 9.5S61 11 61 13" fill="#2E6B4E"/>
      <circle cx="56" cy="36" r="6" fill="#1F1B18"/><circle cx="56" cy="34.5" r="2.2" fill="#FBEDEA"/><path d="M51 41C51 39 53 37.5 56 37.5S61 39 61 41" fill="#2E6B4E"/>
      <circle cx="8" cy="36" r="6" fill="#1F1B18"/><circle cx="8" cy="34.5" r="2.2" fill="#FBEDEA"/><path d="M3 41C3 39 5 37.5 8 37.5S13 39 13 41" fill="#1A7D8F"/>
      <path d="M14 11 L24 26" stroke="#C53A2E" strokeWidth="1" strokeDasharray="2,1.5"/>
      <path d="M32 10 L32 22" stroke="#C53A2E" strokeWidth="1" strokeDasharray="2,1.5"/>
      <path d="M50 11 L40 26" stroke="#2E6B4E" strokeWidth="1" strokeDasharray="2,1.5"/>
      <path d="M50 36 L40 34" stroke="#2E6B4E" strokeWidth="1" strokeDasharray="2,1.5"/>
      <path d="M14 36 L24 34" stroke="#1A7D8F" strokeWidth="1" strokeDasharray="2,1.5"/>
    </svg>
  )
}

// 左侧缩略图：车辆买卖（品牌红实心车）
export function CarThumb({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <rect x="5" y="20" width="36" height="14" rx="5" fill="#C53A2E" opacity=".85"/>
      <path d="M9 20L14 12H32L37 20" fill="#A02828" stroke="#A02828" strokeWidth="1" strokeLinejoin="round"/>
      <circle cx="13" cy="35" r="5" fill="#FBEDEA" stroke="#A02828" strokeWidth="2"/>
      <circle cx="13" cy="35" r="2" fill="#C53A2E"/>
      <circle cx="33" cy="35" r="5" fill="#FBEDEA" stroke="#A02828" strokeWidth="2"/>
      <circle cx="33" cy="35" r="2" fill="#C53A2E"/>
      <rect x="15" y="13" width="8" height="7" rx="1.5" fill="#fff" opacity=".3"/>
      <rect x="25" y="13" width="7" height="7" rx="1.5" fill="#fff" opacity=".3"/>
    </svg>
  )
}

export const TYPE_EMOJI = {
  'job-restaurant': '🧑‍🍳', 'job-retail': '🛍️', 'job-factory': '🏭',
  'job-driver': '🚚', 'job-domestic': '🏠', 'job-office': '📋',
  'job-other': '💼', 'item-appliance': '📺', 'item-furniture': '🛋️',
  'item-electronics': '📱', 'item-vehicle': '🚗', 'item-restaurant': '🫕',
  'item-other': '📦',
  'rental-whole': '🏠', 'rental-shared': '🛏️', 'rental-office': '🏢',
  'rental-storage': '📦', 'ride': '🚗',
  // 倒货 / 批发
  'wholesale': '📦',
  'ws-clothing': '👕', 'ws-shoes-bags': '👜', 'ws-electronics': '📱',
  'ws-auto-parts': '🛞', 'ws-bike-parts': '🚲', 'ws-household': '🧺',
  'ws-beauty': '💄', 'ws-food': '🍫', 'ws-other': '📦',
}

// 左侧竖条颜色 + 右侧图标区背景色
const TYPE_THEME = {
  job:       { bar: '#2E6B4E', bg: '#F2F8F3', text: '#1A4F2E' },
  item:      { bar: '#E07B39', bg: '#FEF5EE', text: '#854F0B' },
  wholesale: { bar: '#2B6E8F', bg: '#EEF5F9', text: '#1A4F6A' },
  rental:    { bar: '#C4761A', bg: '#FEF5E8', text: '#7A4A0A' },
  ride:      { bar: '#1A7D8F', bg: '#EAF5F6', text: '#0D5060' },
}

// 分类短名（右侧图标区显示）
function shortName(post) {
  if (post.type === 'ride') return post.trade_direction === 'want' ? '找拼车' : '拼车'
  const name = post.categories?.name_zh
  if (!name) return ''
  // 含「/」的分类（如 汽配/摩配、鞋帽/箱包）取斜杠前半段，更整洁
  const base = name.includes('/') ? name.split('/')[0] : name
  // 倒货板块：所有品类后面加「清仓」
  if (post.type === 'wholesale') return `${base.slice(0, 5)}清仓`
  // 二手板块：所有品类前面加「二手」（车辆买卖简化为「二手车辆」）
  if (post.type === 'item') {
    if (post.categories?.slug === 'item-vehicle') return '二手车辆'
    return `二手${base.slice(0, 4)}`
  }
  return base.length > 4 ? base.slice(0, 4) : base
}

// 把 post_attributes 数组转成 {key: value} 方便取值
function attrMap(post) {
  const m = {}
  ;(post.post_attributes || []).forEach(a => { if (a?.key) m[a.key] = a.value })
  return m
}

// 卡片第二行的属性信息（各板块取最有代表性的 1-2 个字段）
function infoLine(post) {
  const a = attrMap(post)
  const join = arr => arr.filter(Boolean).join(' · ')
  switch (post.type) {
    case 'ride':
      return a.from_city && a.to_city ? `${a.from_city} → ${a.to_city}` : join([a.from_city, a.to_city])
    case 'rental':
      return join([a.rooms, a.area, a.furnished === 'yes' ? '带家具' : null])
    case 'item':
      return join([a.condition, a.brand])
    case 'wholesale':
      return join([a.goods_condition, a.quantity && a.unit ? `${a.quantity}${a.unit}` : null])
    case 'job':
      return post.trade_direction === 'want'
        ? join([a.position_wanted, a.experience])
        : join([a.salary, a.work_hours])
    default:
      return ''
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  if (hours < 48) return '昨天'
  return `${Math.floor(hours / 24)}天前`
}

export default function PostCard({ post }) {
  const navigate = useNavigate()
  const isItem = ['item','rental','ride','wholesale'].includes(post.type)
  const slug = post.categories?.slug ?? ''
  const isVehicle = slug === 'item-vehicle'
  const isRide = post.type === 'ride'
  const emoji = TYPE_EMOJI[slug] ?? TYPE_EMOJI[post.type] ?? (isItem ? '📦' : '💼')
  const locationStr = [post.city, post.district].filter(Boolean).join(' · ')
  const theme = TYPE_THEME[post.type] ?? TYPE_THEME.job
  const catShort = shortName(post)

  const typeLabel = post.type === 'rental'
    ? (post.trade_direction === 'want' ? '找房' : '出租')
    : post.type === 'ride'
    ? (post.trade_direction === 'want' ? '找拼车' : '顺风车')
    : post.trade_direction === 'want' ? '找工作' : '招聘'

  const info = infoLine(post)
  const jobSalary = post.type === 'job' && post.trade_direction !== 'want' ? attrMap(post).salary : null
  const muted = { fontSize: 11.5, color: 'var(--muted)' }
  const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

  return (
    <div
      className="card"
      onClick={() => navigate(`/post/${post.id}`)}
      style={{ padding: 0, overflow: 'hidden', display: 'flex' }}
    >
      {/* 左侧彩色竖条 */}
      <div style={{ width: 4, background: theme.bar, flexShrink: 0 }} />

      {/* 中间内容 */}
      <div style={{ flex: 1, minWidth: 0, padding: '13px 10px 13px 13px' }}>
        {post.is_pinned && (
          <div className="pin-badge" style={{ marginBottom: 7 }}>⭐ 置顶</div>
        )}

        {isItem ? (
          <div className="card-row" style={{ gap: 12, alignItems: 'center' }}>
            <div className="thumb" style={{
              width: 72, height: 72,
              ...(isRide || isVehicle ? { background: '#FBEDEA', fontSize: 0 } : {}),
            }}>
              {isRide ? <CarpoolThumb />
                : isVehicle ? <CarThumb />
                : emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <h4 style={{ margin: 0, ...ellipsis }}>{post.title}</h4>
                {post.price != null && (
                  <span className="price" style={{ margin: 0, flexShrink: 0 }}>€{Number(post.price).toLocaleString()}</span>
                )}
              </div>
              {info && <div style={{ ...muted, marginTop: 7, ...ellipsis }}>{info}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <span style={{ ...muted, ...ellipsis }}>{locationStr}</span>
                <span style={{ ...muted, flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-row" style={{ gap: 12, alignItems: 'center' }}>
            <div className="thumb" style={{ width: 72, height: 72, background: post.trade_direction === 'want' ? '#EEF5F9' : '#E9F1EC', fontSize: 30 }}>
              {post.trade_direction === 'want' ? '📄' : emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <h4 style={{ margin: 0, ...ellipsis }}>{post.title}</h4>
                {jobSalary && <span className="price" style={{ margin: 0, fontSize: 14, flexShrink: 0 }}>{jobSalary}</span>}
              </div>
              <div className="meta" style={{ marginTop: 7 }}>
                <span className="badge job">{typeLabel}</span>
                {post.users?.is_verified && <span className="badge blue">✓ 认证</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <span style={{ ...muted, ...ellipsis }}>{locationStr}</span>
                <span style={{ ...muted, flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右侧分类区：竖排文字 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 13px', background: theme.bg, flexShrink: 0, minWidth: 46,
      }}>
        {catShort && (
          <span style={{ writingMode: 'vertical-rl', fontSize: 12, fontWeight: 700,
            color: theme.text, letterSpacing: 3 }}>
            {catShort}
          </span>
        )}
      </div>
    </div>
  )
}
