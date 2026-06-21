import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

const SUB_CATS = ['整租','合租','办公室/商铺','仓库/车库']

export default function RentalPage() {
  const navigate = useNavigate()
  const [direction, setDirection] = useState('offer')
  const [activeCat, setActiveCat] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    supabase.from('categories').select('id,name_zh,slug').eq('type','rental').not('parent_id','is',null).order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('posts')
      .select('id,title,type,trade_direction,city,district,price,is_pinned,created_at,categories(name_zh,slug,type),users(nickname,is_verified),post_attributes(key,value)')
      .eq('status','active').eq('type','rental').eq('trade_direction',direction)
      .order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(30)
    if (activeCat) q = q.eq('category_id', activeCat)
    q.then(({ data }) => { setPosts(data ?? []); setLoading(false) })
  }, [direction, activeCat])

  return (
    <>
      <header className="topbar">
        <button className="back-btn" style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}} onClick={() => navigate(-1)}>←</button>
        <span className="brand"><span style={{color:'var(--ink)'}}>租</span>房</span>
        <div style={{flex:1}}/>
      </header>

      <div style={{padding:'12px 16px 0'}}>
        <div className="seg-control">
          <button className={direction==='offer'?'active-item':''} style={direction==='offer'?{background:'#C4761A'}:{}} onClick={()=>{setDirection('offer');setActiveCat(null)}}>🏠 出租/出售</button>
          <button onClick={()=>{setDirection('want');setActiveCat(null)}} style={direction==='want'?{background:'#2B6E8F',color:'#fff',borderRadius:9}:{}}>🔍 找房/求租</button>
        </div>
      </div>

      <div className="chips" style={{padding:'10px 16px 8px'}}>
        <div className={`chip ${!activeCat?'active':''}`} onClick={()=>setActiveCat(null)}>全部</div>
        {categories.map(c=>(
          <div key={c.id} className={`chip ${activeCat===c.id?'active':''}`} onClick={()=>setActiveCat(activeCat===c.id?null:c.id)}>{c.name_zh}</div>
        ))}
      </div>

      <div className="feed-head"><h3>{direction==='offer'?'出租信息':'找房信息'}</h3><span>实时更新</span></div>

      {loading ? <div className="loading">加载中…</div>
        : posts.length===0 ? <div className="empty"><div className="ic">🏠</div>暂无{direction==='offer'?'出租':'找房'}信息</div>
        : <div className="feed">{posts.map(p=><PostCard key={p.id} post={p}/>)}</div>}
    </>
  )
}
