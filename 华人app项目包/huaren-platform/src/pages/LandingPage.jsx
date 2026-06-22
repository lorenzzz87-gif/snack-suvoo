import { useNavigate } from 'react-router-dom'

// 功能板块（点击进入对应页面）
const FEATURES = [
  { icon: '💼', name: '招聘求职', desc: '餐馆·工厂·店员·司机', to: '/app' },
  { icon: '📦', name: '二手闲置', desc: '家电·家具·数码·车辆', to: '/app' },
  { icon: '🏭', name: '倒货批发', desc: '服装·鞋包·百货一手货源', to: '/wholesale' },
  { icon: '🏠', name: '租房找房', desc: '整租·合租·商铺仓库', to: '/rental' },
  { icon: '🚗', name: '同城拼车', desc: '顺风车·找搭乘', to: '/ride' },
  { icon: '🎉', name: '同城活动', desc: '聚会·爬山·景点一日游', to: '/events' },
  { icon: '🏪', name: '华人商圈', desc: '口碑商家·餐馆·服务', to: '/shangquan' },
  { icon: '🧰', name: '实用工具', desc: '汇率·机票·税号·条码', to: '/tools' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' +
    encodeURIComponent('https://zaiyi.eu/app') + '&color=1F1B18&bgcolor=ffffff&margin=8'

  return (
    <div className="lp-root">
      <style>{`
        .lp-root { min-height:100dvh; background:#0E1116; color:#fff; overflow-x:hidden;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        .lp-bg { position:fixed; inset:0; z-index:0; pointer-events:none;
          background:
            radial-gradient(circle at 20% 15%, rgba(197,58,46,.28), transparent 45%),
            radial-gradient(circle at 85% 25%, rgba(46,107,78,.25), transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(197,58,46,.15), transparent 50%);
          animation: lpGlow 9s ease-in-out infinite alternate; }
        .lp-grid { position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.5;
          background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
          background-size:44px 44px;
          mask-image:radial-gradient(circle at 50% 30%, #000 0%, transparent 75%);
          -webkit-mask-image:radial-gradient(circle at 50% 30%, #000 0%, transparent 75%); }
        @keyframes lpGlow { from{opacity:.7} to{opacity:1} }
        .lp-wrap { position:relative; z-index:1; max-width:920px; margin:0 auto; padding:0 20px; }

        /* 品牌 logo 动画 */
        .lp-hero { text-align:center; padding:72px 0 40px; }
        .lp-pin { width:64px; height:64px; margin:0 auto 22px; position:relative;
          animation:lpDrop .8s cubic-bezier(.2,.8,.2,1) both; }
        .lp-pin .ring { position:absolute; inset:0; border-radius:50%;
          background:#C53A2E; display:flex; align-items:center; justify-content:center;
          font:700 22px/1 Arial; color:#fff; letter-spacing:-1px;
          box-shadow:0 0 0 0 rgba(197,58,46,.6); animation:lpPulse 2.4s ease-out infinite; }
        .lp-pin .dot { position:absolute; bottom:-12px; right:6px; width:14px; height:14px;
          border-radius:50%; background:#2E6B4E; box-shadow:0 0 14px rgba(46,107,78,.8); }
        @keyframes lpPulse { 0%{box-shadow:0 0 0 0 rgba(197,58,46,.55)} 70%{box-shadow:0 0 0 22px rgba(197,58,46,0)} 100%{box-shadow:0 0 0 0 rgba(197,58,46,0)} }
        @keyframes lpDrop { from{opacity:0; transform:translateY(-24px) scale(.7)} to{opacity:1; transform:none} }

        .lp-name { font-family:'ZCOOL XiaoWei',serif; font-size:64px; line-height:1.1;
          margin:0; letter-spacing:4px;
          background:linear-gradient(90deg,#fff 0%,#fff 55%,#F0A89F 75%,#fff 100%);
          background-size:200% auto; -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent; animation:lpShine 4.5s linear infinite; }
        .lp-name b { color:#C53A2E; -webkit-text-fill-color:#C53A2E; }
        @keyframes lpShine { to{background-position:200% center} }
        .lp-en { font-size:13px; letter-spacing:6px; color:#7a8290; margin:8px 0 0; text-transform:uppercase; }
        .lp-tag { font-size:22px; font-weight:700; margin:26px 0 6px;
          animation:lpUp .8s .2s ease both; }
        .lp-sub { font-size:14.5px; color:#9aa3b2; line-height:1.8; margin:0 auto; max-width:520px;
          animation:lpUp .8s .35s ease both; }
        @keyframes lpUp { from{opacity:0; transform:translateY(16px)} to{opacity:1; transform:none} }

        .lp-cta { display:inline-flex; align-items:center; gap:8px; margin-top:30px;
          background:linear-gradient(135deg,#C53A2E,#9e2820); color:#fff; border:none;
          padding:16px 44px; border-radius:99px; font-size:17px; font-weight:800; cursor:pointer;
          box-shadow:0 10px 30px rgba(197,58,46,.4); animation:lpUp .8s .5s ease both;
          transition:transform .15s; }
        .lp-cta:active { transform:scale(.96); }

        .lp-sec-title { text-align:center; font-size:13px; letter-spacing:4px; color:#7a8290;
          margin:64px 0 22px; text-transform:uppercase; }
        .lp-feats { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:640px){ .lp-feats{ grid-template-columns:repeat(4,1fr); } }
        .lp-feat { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:16px; padding:18px 14px; cursor:pointer; transition:.15s;
          backdrop-filter:blur(4px); }
        .lp-feat:active { background:rgba(255,255,255,.09); transform:translateY(-2px); }
        .lp-feat .ic { font-size:30px; }
        .lp-feat .nm { font-size:15px; font-weight:800; margin:8px 0 3px; }
        .lp-feat .ds { font-size:11.5px; color:#8b93a3; line-height:1.5; }

        .lp-qr { margin:64px auto 0; max-width:520px; display:flex; gap:20px; align-items:center;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:20px; padding:22px; flex-wrap:wrap; justify-content:center; }
        .lp-qr img { width:120px; height:120px; border-radius:12px; background:#fff; padding:6px; }
        .lp-qr .txt h4 { margin:0 0 8px; font-size:17px; font-weight:800; }
        .lp-qr .txt p { margin:0; font-size:13px; color:#9aa3b2; line-height:1.8; }

        .lp-foot { text-align:center; color:#6b7280; font-size:12.5px; padding:54px 0 40px; line-height:2; }
        .lp-foot a { color:#9aa3b2; }
      `}</style>

      <div className="lp-bg" />
      <div className="lp-grid" />

      <div className="lp-wrap">
        {/* 品牌 hero */}
        <header className="lp-hero">
          <div className="lp-pin">
            <div className="ring">ZY</div>
            <div className="dot" />
          </div>
          <h1 className="lp-name">在<b>意</b></h1>
          <div className="lp-en">ZaiYi · zaiyi.eu</div>
          <div className="lp-tag">意大利华人生活服务平台</div>
          <p className="lp-sub">
            招聘求职、二手闲置、倒货批发、租房拼车、同城活动、华人商圈、实用工具——
            华人在意大利生活、工作、做生意，一个平台全搞定。
          </p>
          <br />
          <button className="lp-cta" onClick={() => navigate('/app')}>
            进入应用 →
          </button>
        </header>

        {/* 功能板块 */}
        <div className="lp-sec-title">平台功能</div>
        <div className="lp-feats">
          {FEATURES.map(f => (
            <div key={f.name} className="lp-feat" onClick={() => navigate(f.to)}>
              <div className="ic">{f.icon}</div>
              <div className="nm">{f.name}</div>
              <div className="ds">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* 手机访问引导 */}
        <div className="lp-qr">
          <img src={qr} alt="扫码访问在意" />
          <div className="txt">
            <h4>📱 手机扫码，秒变 App</h4>
            <p>
              手机扫描左侧二维码打开在意，<br />
              用浏览器「添加到主屏幕」，<br />
              下次像 App 一样一点即开。
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="lp-foot">
          在意 ZaiYi · 意大利华人生活服务平台<br />
          合作 / 商家入驻：<a href="mailto:info@zaiyi.eu">info@zaiyi.eu</a><br />
          © {new Date().getFullYear()} zaiyi.eu
        </footer>
      </div>
    </div>
  )
}
