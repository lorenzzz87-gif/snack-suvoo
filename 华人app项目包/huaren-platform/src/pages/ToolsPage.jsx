import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../App'

// ── 汇率换算 ──────────────────────────────────────────────
function CurrencyTool() {
  const [rates, setRates] = useState({ CNY: 7.82, USD: 1.08 })
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('EUR')
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/EUR')
      .then(r => r.json())
      .then(d => {
        setRates({ CNY: d.rates.CNY, USD: d.rates.USD })
        setLastUpdate(new Date().toLocaleDateString('zh'))
      })
      .catch(() => setLastUpdate('离线估算'))
  }, [])

  function convert(val, fromCur) {
    const n = parseFloat(val) || 0
    if (fromCur === 'EUR') return { CNY: (n * rates.CNY).toFixed(2), USD: (n * rates.USD).toFixed(2), EUR: n.toFixed(2) }
    if (fromCur === 'CNY') return { EUR: (n / rates.CNY).toFixed(2), USD: (n / rates.CNY * rates.USD).toFixed(2), CNY: n.toFixed(2) }
    return { EUR: (n / rates.USD).toFixed(2), CNY: (n / rates.USD * rates.CNY).toFixed(2), USD: n.toFixed(2) }
  }

  const result = convert(amount, from)
  const CURRENCIES = [
    { code: 'EUR', flag: '🇪🇺', name: '欧元' },
    { code: 'CNY', flag: '🇨🇳', name: '人民币' },
    { code: 'USD', flag: '🇺🇸', name: '美元' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {CURRENCIES.map(c => (
          <button key={c.code} onClick={() => setFrom(c.code)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid',
              borderColor: from === c.code ? 'var(--red)' : 'var(--line)',
              background: from === c.code ? 'var(--red-soft)' : '#fff',
              color: from === c.code ? 'var(--red)' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {c.flag} {c.code}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <input type="number" placeholder={`输入${CURRENCIES.find(c=>c.code===from)?.name}金额`}
          value={amount} onChange={e => setAmount(e.target.value)}
          style={{ fontSize: 20, fontWeight: 700 }} />
      </div>
      {amount && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CURRENCIES.filter(c => c.code !== from).map(c => (
            <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between',
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{c.flag} {c.name}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                {result[c.code]} {c.code}
              </span>
            </div>
          ))}
        </div>
      )}
      {lastUpdate && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}>汇率更新：{lastUpdate}</div>}
    </div>
  )
}

// ── 增值税 IVA ─────────────────────────────────────────────
function IvaTool() {
  const [price, setPrice] = useState('')
  const [rate, setRate] = useState(22)
  const [mode, setMode] = useState('ex') // ex=不含税→含税, in=含税→不含税

  const n = parseFloat(price) || 0
  const tax = mode === 'ex' ? n * rate / 100 : n - n / (1 + rate / 100)
  const total = mode === 'ex' ? n + tax : n
  const base = mode === 'ex' ? n : n / (1 + rate / 100)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ v: 'ex', l: '不含税 → 含税' }, { v: 'in', l: '含税 → 不含税' }].map(m => (
          <button key={m.v} onClick={() => setMode(m.v)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid',
              borderColor: mode === m.v ? 'var(--red)' : 'var(--line)',
              background: mode === m.v ? 'var(--red-soft)' : '#fff',
              color: mode === m.v ? 'var(--red)' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {m.l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[22, 10, 4].map(r => (
          <button key={r} onClick={() => setRate(r)}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid',
              borderColor: rate === r ? '#2B6E8F' : 'var(--line)',
              background: rate === r ? '#EEF5F9' : '#fff',
              color: rate === r ? '#2B6E8F' : 'var(--muted)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            IVA {r}%
          </button>
        ))}
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <input type="number" placeholder={`输入${mode === 'ex' ? '不含税' : '含税'}价格 (€)`}
          value={price} onChange={e => setPrice(e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} />
      </div>
      {price && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { l: '不含税价（税基）', v: base.toFixed(2), c: 'var(--ink)' },
            { l: `IVA ${rate}%`, v: tax.toFixed(2), c: '#E07B39' },
            { l: '含税总价', v: total.toFixed(2), c: 'var(--red)', big: true },
          ].map(row => (
            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between',
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{row.l}</span>
              <span style={{ fontSize: row.big ? 20 : 16, fontWeight: 800, color: row.c }}>€ {row.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 工资换算 ──────────────────────────────────────────────
function SalaryTool() {
  const [salary, setSalary] = useState('')
  const [type, setType] = useState('month')
  const [hoursPerDay, setHoursPerDay] = useState(8)
  const [daysPerWeek, setDaysPerWeek] = useState(5)

  const n = parseFloat(salary) || 0
  const hoursPerMonth = hoursPerDay * daysPerWeek * 4.33
  const daysPerMonth = daysPerWeek * 4.33

  let monthly, daily, hourly
  if (type === 'month') { monthly = n; daily = n / daysPerMonth; hourly = n / hoursPerMonth }
  else if (type === 'day') { daily = n; monthly = n * daysPerMonth; hourly = n / hoursPerDay }
  else { hourly = n; daily = n * hoursPerDay; monthly = n * hoursPerMonth }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ v: 'month', l: '月薪' }, { v: 'day', l: '日薪' }, { v: 'hour', l: '时薪' }].map(t => (
          <button key={t.v} onClick={() => setType(t.v)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid',
              borderColor: type === t.v ? '#2E6B4E' : 'var(--line)',
              background: type === t.v ? 'var(--green-soft)' : '#fff',
              color: type === t.v ? 'var(--green)' : 'var(--muted)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <input type="number" placeholder={`输入${type === 'month' ? '月' : type === 'day' ? '日' : '小时'}薪 (€)`}
          value={salary} onChange={e => setSalary(e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>每天工时</label>
          <select value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))}>
            {[6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h}小时</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>每周工天</label>
          <select value={daysPerWeek} onChange={e => setDaysPerWeek(Number(e.target.value))}>
            {[5,6,7].map(d => <option key={d} value={d}>{d}天</option>)}
          </select>
        </div>
      </div>
      {salary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { l: '月薪', v: monthly.toFixed(0), big: type === 'month' },
            { l: '日薪', v: daily.toFixed(1), big: type === 'day' },
            { l: '时薪', v: hourly.toFixed(2), big: type === 'hour' },
          ].map(row => (
            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between',
              background: row.big ? 'var(--green-soft)' : 'var(--paper)',
              border: `1px solid ${row.big ? 'var(--green)' : 'var(--line)'}`,
              borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{row.l}</span>
              <span style={{ fontSize: row.big ? 20 : 16, fontWeight: 800, color: row.big ? 'var(--green)' : 'var(--ink)' }}>
                € {row.v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 利润率计算 ────────────────────────────────────────────
function ProfitTool() {
  const [cost, setCost] = useState('')
  const [sell, setSell] = useState('')

  const c = parseFloat(cost) || 0
  const s = parseFloat(sell) || 0
  const profit = s - c
  const margin = s > 0 ? (profit / s * 100) : 0
  const markup = c > 0 ? (profit / c * 100) : 0
  const roi = c > 0 ? (profit / c * 100) : 0

  const color = profit >= 0 ? 'var(--green)' : 'var(--red)'
  const bg = profit >= 0 ? 'var(--green-soft)' : 'var(--red-soft)'
  const border = profit >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div>
      <div className="two-col" style={{ marginBottom: 12 }}>
        <div className="field">
          <label>进价 / 成本 (€)</label>
          <input type="number" placeholder="0.00" value={cost}
            onChange={e => setCost(e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} />
        </div>
        <div className="field">
          <label>售价 (€)</label>
          <input type="number" placeholder="0.00" value={sell}
            onChange={e => setSell(e.target.value)} style={{ fontSize: 18, fontWeight: 700 }} />
        </div>
      </div>
      {cost && sell && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>每件利润</div>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>
              {profit >= 0 ? '+' : ''}€ {profit.toFixed(2)}
            </div>
          </div>
          {[
            { l: '毛利率（利润/售价）', v: `${margin.toFixed(1)}%` },
            { l: '加价率（利润/进价）', v: `${markup.toFixed(1)}%` },
            { l: '卖100件总利润', v: `€ ${(profit * 100).toFixed(0)}` },
          ].map(row => (
            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between',
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{row.l}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color }}>{row.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 居留证倒计时 ──────────────────────────────────────────
function PermitTool() {
  const [expiry, setExpiry] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = expiry ? new Date(expiry) : null
  const days = exp ? Math.floor((exp - today) / 86400000) : null

  const status = days === null ? null
    : days < 0 ? { color: '#C53A2E', bg: '#FBEDEA', label: '⚠️ 已过期', msg: `已过期 ${Math.abs(days)} 天，请尽快续签！` }
    : days <= 30 ? { color: '#E07B39', bg: '#FCEFE3', label: '⚡ 紧急', msg: `还剩 ${days} 天，立即预约续签！` }
    : days <= 90 ? { color: '#E07B39', bg: '#FCEFE3', label: '⏰ 注意', msg: `还剩 ${days} 天，建议尽快准备续签材料` }
    : { color: '#2E6B4E', bg: 'var(--green-soft)', label: '✓ 有效', msg: `还有 ${days} 天到期，暂时安全` }

  return (
    <div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>居留证到期日</label>
        <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
          min="2020-01-01" />
      </div>
      {status && (
        <>
          <div style={{ background: status.bg, border: `1px solid ${status.color}`,
            borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: status.color, fontWeight: 700, marginBottom: 8 }}>
              {status.label}
            </div>
            <div style={{ fontSize: days !== null && days >= 0 ? 48 : 36, fontWeight: 900, color: status.color, lineHeight: 1 }}>
              {days !== null && days >= 0 ? days : Math.abs(days ?? 0)}
            </div>
            <div style={{ fontSize: 14, color: status.color, marginTop: 4 }}>
              {days !== null && days >= 0 ? '天后到期' : '天前已过期'}
            </div>
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
            padding: '12px 14px', fontSize: 13, color: '#3d382f', lineHeight: 1.7 }}>
            {status.msg}
          </div>
          {days !== null && days <= 90 && (
            <div style={{ marginTop: 10, background: '#EEF5F9', border: '1px solid #B8D4E2',
              borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#2B6E8F', lineHeight: 1.7 }}>
              💡 意大利续签提醒：建议到期前 60-90 天预约 Questura，备好：护照、旧居留、照片、印花税票（Marca da Bollo）、居住证明
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── 折扣计算 ──────────────────────────────────────────────
function DiscountTool() {
  const [price, setPrice] = useState(''); const [disc, setDisc] = useState('')
  const p = parseFloat(price)||0, d = parseFloat(disc)||0
  const final = p*(1-d/100), saved = p-final
  return (
    <div>
      <div className="two-col" style={{marginBottom:12}}>
        <div className="field"><label>原价 (€)</label><input type="number" placeholder="100" value={price} onChange={e=>setPrice(e.target.value)}/></div>
        <div className="field"><label>折扣 (%)</label><input type="number" placeholder="20" value={disc} onChange={e=>setDisc(e.target.value)}/></div>
      </div>
      {price&&disc&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'优惠金额',v:`- €${saved.toFixed(2)}`,c:'var(--amber)'},{l:'折后价格',v:`€${final.toFixed(2)}`,c:'var(--red)',big:true},{l:'相当于打',v:`${(100-d).toFixed(0)}折 / ${d}% off`,c:'var(--muted)'}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:14}}>{r.l}</span>
            <span style={{fontSize:r.big?20:15,fontWeight:800,color:r.c}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── AA制分摊 ──────────────────────────────────────────────
function SplitTool() {
  const [total, setTotal] = useState(''); const [people, setPeople] = useState('2')
  const t=parseFloat(total)||0, n=parseInt(people)||1, each=t/n
  return (
    <div>
      <div className="two-col" style={{marginBottom:12}}>
        <div className="field"><label>总金额 (€)</label><input type="number" placeholder="120" value={total} onChange={e=>setTotal(e.target.value)}/></div>
        <div className="field"><label>人数</label><input type="number" placeholder="4" value={people} onChange={e=>setPeople(e.target.value)} min="1"/></div>
      </div>
      {total&&<div style={{background:'var(--green-soft)',border:'1px solid var(--green)',borderRadius:14,padding:'20px',textAlign:'center'}}>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:6}}>每人应付</div>
        <div style={{fontSize:36,fontWeight:900,color:'var(--green)'}}>€ {each.toFixed(2)}</div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:6}}>{n} 人 · 总计 €{t.toFixed(2)}</div>
      </div>}
    </div>
  )
}

// ── 进货成本 ──────────────────────────────────────────────
function BulkCostTool() {
  const [items, setItems] = useState([{name:'',qty:'',price:''}])
  const [freight, setFreight] = useState('')
  const addItem = () => setItems([...items,{name:'',qty:'',price:''}])
  const upd = (i,k,v) => { const a=[...items]; a[i]={...a[i],[k]:v}; setItems(a) }
  const subtotal = items.reduce((s,it)=>(parseFloat(it.qty)||0)*(parseFloat(it.price)||0)+s,0)
  const total = subtotal + (parseFloat(freight)||0)
  const totalQty = items.reduce((s,it)=>s+(parseFloat(it.qty)||0),0)
  return (
    <div>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',gap:6,marginBottom:8}}>
          <input placeholder="品名" value={it.name} onChange={e=>upd(i,'name',e.target.value)} style={{flex:2,border:'1px solid var(--line)',borderRadius:9,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
          <input type="number" placeholder="数量" value={it.qty} onChange={e=>upd(i,'qty',e.target.value)} style={{flex:1,border:'1px solid var(--line)',borderRadius:9,padding:'8px 8px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
          <input type="number" placeholder="单价€" value={it.price} onChange={e=>upd(i,'price',e.target.value)} style={{flex:1,border:'1px solid var(--line)',borderRadius:9,padding:'8px 8px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
        </div>
      ))}
      <button onClick={addItem} style={{width:'100%',padding:'8px',border:'1.5px dashed var(--line)',borderRadius:9,background:'none',cursor:'pointer',color:'var(--muted)',fontSize:13,marginBottom:10}}>+ 添加商品</button>
      <div className="field" style={{marginBottom:12}}><label>运费 (€)</label><input type="number" placeholder="0" value={freight} onChange={e=>setFreight(e.target.value)}/></div>
      {total>0&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'商品小计',v:`€${subtotal.toFixed(2)}`},{l:'运费',v:`€${(parseFloat(freight)||0).toFixed(2)}`},{l:'总成本',v:`€${total.toFixed(2)}`,big:true},{l:'件均成本',v:totalQty>0?`€${(total/totalQty).toFixed(2)}/件`:'—'}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{r.l}</span>
            <span style={{fontSize:r.big?18:14,fontWeight:800,color:r.big?'var(--red)':'var(--ink)'}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── 贷款计算 ──────────────────────────────────────────────
function LoanTool() {
  const [principal, setPrincipal] = useState(''); const [rate, setRate] = useState(''); const [years, setYears] = useState('')
  const P=parseFloat(principal)||0, r=(parseFloat(rate)||0)/100/12, n=(parseFloat(years)||0)*12
  const monthly = P&&r&&n ? P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1) : 0
  const totalPay = monthly*n, totalInterest = totalPay-P
  return (
    <div>
      <div className="field" style={{marginBottom:10}}><label>贷款金额 (€)</label><input type="number" placeholder="如：100000" value={principal} onChange={e=>setPrincipal(e.target.value)}/></div>
      <div className="two-col" style={{marginBottom:12}}>
        <div className="field"><label>年利率 (%)</label><input type="number" placeholder="如：3.5" value={rate} onChange={e=>setRate(e.target.value)}/></div>
        <div className="field"><label>还款年限</label><input type="number" placeholder="如：20" value={years} onChange={e=>setYears(e.target.value)}/></div>
      </div>
      {monthly>0&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'每月还款',v:`€${monthly.toFixed(0)}`,big:true},{l:'还款总额',v:`€${totalPay.toFixed(0)}`},{l:'利息总额',v:`€${totalInterest.toFixed(0)}`},{l:'利息占比',v:`${(totalInterest/P*100).toFixed(1)}%`}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:r.big?'var(--red-soft)':'var(--paper)',border:`1px solid ${r.big?'var(--red)':'var(--line)'}`,borderRadius:10,padding:'12px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{r.l}</span>
            <span style={{fontSize:r.big?20:14,fontWeight:800,color:r.big?'var(--red)':'var(--ink)'}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── 黄金换算（实时金价）────────────────────────────────────
function GoldTool() {
  const [eurGram, setEurGram] = useState('')
  const [cnyRate, setCnyRate] = useState('7.82')
  const [isLive, setIsLive] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const [fetchErr, setFetchErr] = useState(false)

  async function fetchGoldPrice() {
    setFetching(true); setFetchErr(false)
    try {
      // 通过 Supabase Edge Function 代理（绕过 CORS）
      const res = await fetch(
        'https://diaporthxebgtxljpwlw.supabase.co/functions/v1/gold-price',
        { headers: { 'Content-Type': 'application/json' } }
      )
      const data = await res.json()
      if (data.error || !data.eurPerGram) throw new Error(data.error || '无数据')
      setEurGram(data.eurPerGram.toString())
      setCnyRate(data.cnyEurRate.toString())
      setIsLive(true)
      setLastUpdate(new Date().toLocaleTimeString('zh'))
    } catch {
      setFetchErr(true)
      setIsLive(false)
    }
    setFetching(false)
  }

  useEffect(() => { fetchGoldPrice() }, [])

  const eg=parseFloat(eurGram)||0, cr=parseFloat(cnyRate)||7.82
  const cnyGram=eg*cr, eurJin=eg*500, cnyJin=cnyGram*500

  return (
    <div>
      {/* 实时价格区 */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,background:isLive?'#FFF8EE':'var(--paper)',border:`1px solid ${isLive?'#C4961A':'var(--line)'}`,borderRadius:12,padding:'12px 14px'}}>
        <span style={{fontSize:22}}>🥇</span>
        <div style={{flex:1}}>
          {fetching ? <div style={{fontSize:13,color:'var(--muted)'}}>获取实时金价中…</div>
          : isLive ? <>
            <div style={{fontSize:22,fontWeight:900,color:'#C4961A'}}>€ {eurGram} <span style={{fontSize:13,fontWeight:400}}>/克</span></div>
            <div style={{fontSize:11,color:'var(--muted)'}}>实时金价 · 更新于 {lastUpdate}</div>
          </> : <div style={{fontSize:13,color:'var(--muted)'}}>实时金价获取失败，请手动输入</div>}
        </div>
        <button onClick={fetchGoldPrice} disabled={fetching}
          style={{background:'none',border:'1px solid var(--line)',borderRadius:8,padding:'6px 10px',fontSize:12,cursor:'pointer',color:'var(--muted)'}}>
          {fetching?'…':'刷新'}
        </button>
      </div>

      {/* 手动修改 */}
      <div className="two-col" style={{marginBottom:12}}>
        <div className="field"><label>金价 (€/克)</label><input type="number" value={eurGram} onChange={e=>{setEurGram(e.target.value);setIsLive(false)}}/></div>
        <div className="field"><label>欧元/人民币</label><input type="number" value={cnyRate} onChange={e=>setCnyRate(e.target.value)}/></div>
      </div>

      {eurGram&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'€/克',v:`€ ${eg.toFixed(2)}`},{l:'¥/克',v:`¥ ${cnyGram.toFixed(2)}`},{l:'€/两 (50g)',v:`€ ${(eg*50).toFixed(0)}`},{l:'€/斤 (500g)',v:`€ ${eurJin.toFixed(0)}`},{l:'¥/斤 (500g)',v:`¥ ${cnyJin.toFixed(0)}`,big:true}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:r.big?'#FFF8EE':'var(--paper)',border:`1px solid ${r.big?'#C4961A':'var(--line)'}`,borderRadius:10,padding:'12px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{r.l}</span>
            <span style={{fontSize:r.big?18:14,fontWeight:800,color:r.big?'#C4961A':'var(--ink)'}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── Codice Fiscale ─────────────────────────────────────────
function CFTool() {
  const [last,setLast]=useState(''); const [first,setFirst]=useState('')
  const [dob,setDob]=useState(''); const [sex,setSex]=useState('M')
  const [cf,setCf]=useState(''); const [err,setErr]=useState('')
  const MONTHS='ABCDEHLMPRST'
  function nameCode(name,isFirst){
    const s=name.toUpperCase().replace(/[^A-Z]/g,'')
    const cons=s.split('').filter(c=>!'AEIOU'.includes(c))
    const vow=s.split('').filter(c=>'AEIOU'.includes(c))
    if(isFirst&&cons.length>=4) return cons[0]+cons[2]+cons[3]
    return ([...cons,...vow,'X','X','X']).slice(0,3).join('')
  }
  function checkChar(s){
    const odd={A:1,B:0,C:5,D:7,E:9,F:13,G:15,H:17,I:19,J:21,K:2,L:4,M:18,N:20,O:11,P:3,Q:6,R:8,S:12,T:14,U:16,V:10,W:22,X:25,Y:24,Z:23,'0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21}
    const even={A:0,B:1,C:2,D:3,E:4,F:5,G:6,H:7,I:8,J:9,K:10,L:11,M:12,N:13,O:14,P:15,Q:16,R:17,S:18,T:19,U:20,V:21,W:22,X:23,Y:24,Z:25,'0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9}
    let sum=0
    for(let i=0;i<15;i++) sum+=(i%2===0?odd:even)[s[i]]||0
    return String.fromCharCode(65+sum%26)
  }
  function generate(){
    if(!last||!first||!dob){setErr('请填写所有字段');return}
    try{
      const d=new Date(dob)
      const yr=String(d.getFullYear()).slice(-2)
      const mo=MONTHS[d.getMonth()]
      const dy=String(d.getDate()+(sex==='F'?40:0)).padStart(2,'0')
      const partial=nameCode(last,false)+nameCode(first,true)+yr+mo+dy+'Z210'
      setCf(partial+checkChar(partial)); setErr('')
    }catch{setErr('日期格式错误')}
  }
  return (
    <div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:10,lineHeight:1.6}}>根据姓名+出生日期生成意大利税号（适用于在中国出生的人，地区码使用 Z210）</div>
      <div className="two-col" style={{marginBottom:8}}>
        <div className="field"><label>姓（拼音）</label><input placeholder="如 ZHANG" value={last} onChange={e=>setLast(e.target.value)}/></div>
        <div className="field"><label>名（拼音）</label><input placeholder="如 WEI" value={first} onChange={e=>setFirst(e.target.value)}/></div>
      </div>
      <div className="two-col" style={{marginBottom:12}}>
        <div className="field"><label>出生日期</label><input type="date" value={dob} onChange={e=>setDob(e.target.value)}/></div>
        <div className="field"><label>性别</label>
          <select value={sex} onChange={e=>setSex(e.target.value)}>
            <option value="M">男 (M)</option><option value="F">女 (F)</option>
          </select>
        </div>
      </div>
      {err&&<div className="error-msg" style={{marginBottom:8}}>{err}</div>}
      <button className="btn-primary" onClick={generate}>生成 Codice Fiscale</button>
      {cf&&<div style={{marginTop:12,background:'var(--paper)',border:'1px solid var(--line)',borderRadius:12,padding:'16px',textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>你的 Codice Fiscale</div>
        <div style={{fontSize:24,fontWeight:900,letterSpacing:3,color:'var(--ink)',fontFamily:'monospace'}}>{cf}</div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>点击复制</div>
      </div>}
    </div>
  )
}

// ── 居留费用 ──────────────────────────────────────────────
function PermitFeeTool() {
  const [type,setType]=useState('rinnovo')
  const fees={rinnovo:[{n:'Marca da Bollo (印花税)',v:16},{n:'邮政办理费 (Poste Italiane)',v:30},{n:'居留证制作费',v:27.5},{n:'照片（4张）',v:8},{n:'复印材料',v:5}],primo:[{n:'Marca da Bollo (印花税)',v:16},{n:'邮政办理费',v:30},{n:'居留证制作费',v:27.5},{n:'照片（4张）',v:8},{n:'申请表邮寄费',v:0},{n:'复印材料',v:5}]}
  const list=fees[type]
  const total=list.reduce((s,i)=>s+i.v,0)
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[{v:'rinnovo',l:'续签'},{v:'primo',l:'首次申请'}].map(t=>(
          <button key={t.v} onClick={()=>setType(t.v)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid',borderColor:type===t.v?'#2B6E8F':'var(--line)',background:type===t.v?'#EEF5F9':'#fff',color:type===t.v?'#2B6E8F':'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {list.map(f=>(
          <div key={f.n} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:9,padding:'10px 14px'}}>
            <span style={{fontSize:13,color:'var(--ink)'}}>{f.n}</span>
            <span style={{fontSize:13,fontWeight:700}}>€ {f.v.toFixed(2)}</span>
          </div>))}
        <div style={{display:'flex',justifyContent:'space-between',background:'var(--red-soft)',border:'1px solid var(--red)',borderRadius:10,padding:'12px 14px'}}>
          <span style={{fontSize:14,fontWeight:800,color:'var(--red)'}}>预计总费用</span>
          <span style={{fontSize:18,fontWeight:900,color:'var(--red)'}}>≈ € {total.toFixed(2)}</span>
        </div>
      </div>
      <div style={{marginTop:10,fontSize:11,color:'var(--muted)',lineHeight:1.7}}>⚠️ 实际费用可能因地区和申请类型略有差异，建议到 Questura 或邮局确认</div>
    </div>
  )
}

// ── 意大利节假日 ──────────────────────────────────────────
function HolidayTool() {
  const [year,setYear]=useState(new Date().getFullYear())
  function easter(y){
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1
    return new Date(y,month-1,day)
  }
  const e=easter(year), em=new Date(e); em.setDate(e.getDate()+1)
  const holidays=[
    {d:new Date(year,0,1),n:'元旦 Capodanno'},{d:new Date(year,0,6),n:'主显节 Epifania'},
    {d:e,n:'复活节 Pasqua'},{d:em,n:'复活节次日 Lunedì dell\'Angelo'},
    {d:new Date(year,3,25),n:'解放日 Festa della Liberazione'},{d:new Date(year,4,1),n:'劳动节 Festa dei Lavoratori'},
    {d:new Date(year,5,2),n:'国庆日 Festa della Repubblica'},{d:new Date(year,7,15),n:'圣母升天节 Ferragosto'},
    {d:new Date(year,10,1),n:'诸圣节 Ognissanti'},{d:new Date(year,11,8),n:'圣母无染原罪 Immacolata'},
    {d:new Date(year,11,25),n:'圣诞节 Natale'},{d:new Date(year,11,26),n:'圣斯德望节 Santo Stefano'},
  ].sort((a,b)=>a.d-b.d)
  const today=new Date(); today.setHours(0,0,0,0)
  const fmt=d=>`${d.getMonth()+1}月${d.getDate()}日 ${['日','一','二','三','四','五','六'][d.getDay()]}`
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[year-1,year,year+1].map(y=>(
          <button key={y} onClick={()=>setYear(y)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid',borderColor:y===year?'#7B4F9E':'var(--line)',background:y===year?'#F5F0FA':'#fff',color:y===year?'#7B4F9E':'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{y}</button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {holidays.map(h=>{
          const isPast=h.d<today, isToday=h.d.getTime()===today.getTime()
          const days=Math.round((h.d-today)/86400000)
          return(
            <div key={h.n} style={{display:'flex',alignItems:'center',gap:10,background:isToday?'var(--red-soft)':isPast?'#F8F6F2':'var(--paper)',border:`1px solid ${isToday?'var(--red)':'var(--line)'}`,borderRadius:9,padding:'10px 12px',opacity:isPast?0.5:1}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700}}>{h.n}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{fmt(h.d)}</div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:isToday?'var(--red)':days>0?'#2B6E8F':'var(--muted)',whiteSpace:'nowrap'}}>
                {isToday?'今天':isPast?'已过':days===1?'明天':`${days}天后`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 快递费估算 ────────────────────────────────────────────
function ShippingTool() {
  const [weight,setWeight]=useState('')
  const w=parseFloat(weight)||0
  const carriers=[
    {name:'BRT',rates:[[1,8],[3,10],[5,13],[10,18],[20,28],[30,40]]},
    {name:'SDA/Poste',rates:[[1,7],[3,9],[5,12],[10,17],[20,26],[30,38]]},
    {name:'GLS',rates:[[1,7.5],[3,9.5],[5,12.5],[10,17.5],[20,27],[30,39]]},
    {name:'DHL',rates:[[1,12],[3,15],[5,18],[10,24],[20,35],[30,50]]},
  ]
  function getRate(rates,w){
    for(const [max,price] of rates) if(w<=max) return price
    return rates[rates.length-1][1]+(w-rates[rates.length-1][0])*1.2
  }
  return (
    <div>
      <div className="field" style={{marginBottom:12}}><label>包裹重量 (kg)</label><input type="number" placeholder="如：5" value={weight} onChange={e=>setWeight(e.target.value)}/></div>
      {weight&&w>0&&<>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {carriers.map(c=>{
            const price=getRate(c.rates,w)
            return(
              <div key={c.name} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 14px'}}>
                <span style={{fontSize:14,fontWeight:700}}>{c.name}</span>
                <span style={{fontSize:16,fontWeight:800,color:'var(--red)'}}>≈ € {price.toFixed(0)}</span>
              </div>
            )
          })}
        </div>
        <div style={{marginTop:8,fontSize:11,color:'var(--muted)',lineHeight:1.7}}>⚠️ 为估算价格，实际费用取决于地区、体积重及合同价格</div>
      </>}
    </div>
  )
}

// ── 重量换算 ──────────────────────────────────────────────
function WeightTool() {
  const [val,setVal]=useState(''); const [unit,setUnit]=useState('kg')
  const n=parseFloat(val)||0
  const kg=unit==='kg'?n:unit==='jin'?n/2:n*0.4536
  const jin=kg*2, lb=kg/0.4536, g=kg*1000
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[{v:'kg',l:'公斤'},{v:'jin',l:'斤'},{v:'lb',l:'磅'}].map(u=>(
          <button key={u.v} onClick={()=>setUnit(u.v)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid',borderColor:unit===u.v?'var(--red)':'var(--line)',background:unit===u.v?'var(--red-soft)':'#fff',color:unit===u.v?'var(--red)':'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{u.l}</button>
        ))}
      </div>
      <div className="field" style={{marginBottom:12}}><input type="number" placeholder="输入数值" value={val} onChange={e=>setVal(e.target.value)} style={{fontSize:18,fontWeight:700}}/></div>
      {val&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'公斤 (kg)',v:`${kg.toFixed(3)}`},{l:'斤',v:`${jin.toFixed(2)}`},{l:'磅 (lb)',v:`${lb.toFixed(2)}`},{l:'克 (g)',v:`${g.toFixed(0)}`}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{r.l}</span>
            <span style={{fontSize:15,fontWeight:800}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── 尺码换算 ──────────────────────────────────────────────
function SizeTool() {
  const [tab,setTab]=useState('shoe')
  const shoes=[{eu:35,cn:34,us:'4'},{eu:36,cn:35,us:'4.5'},{eu:37,cn:36,us:'5.5'},{eu:38,cn:37,us:'6.5'},{eu:39,cn:38,us:'7'},{eu:40,cn:39,us:'7.5'},{eu:41,cn:40,us:'8.5'},{eu:42,cn:41,us:'9'},{eu:43,cn:42,us:'9.5'},{eu:44,cn:43,us:'10.5'},{eu:45,cn:44,us:'11'}]
  const clothes=[{eu:'XS',cn:'155/80A',it:'36'},{eu:'S',cn:'160/84A',it:'38'},{eu:'M',cn:'165/88A',it:'40'},{eu:'L',cn:'170/92A',it:'42'},{eu:'XL',cn:'175/96A',it:'44'},{eu:'XXL',cn:'180/100A',it:'46'}]
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[{v:'shoe',l:'鞋码'},{v:'cloth',l:'衣码'}].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid',borderColor:tab===t.v?'#7B4F9E':'var(--line)',background:tab===t.v?'#F5F0FA':'#fff',color:tab===t.v?'#7B4F9E':'var(--muted)',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>{t.l}</button>
        ))}
      </div>
      {tab==='shoe'?(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--paper)'}}>
              {['欧码(EU)','中码(CN)','美码(US)'].map(h=><th key={h} style={{padding:'8px',textAlign:'center',border:'1px solid var(--line)',color:'var(--muted)',fontWeight:700}}>{h}</th>)}
            </tr></thead>
            <tbody>{shoes.map(r=><tr key={r.eu}><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)',fontWeight:700}}>{r.eu}</td><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)'}}>{r.cn}</td><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)'}}>{r.us}</td></tr>)}</tbody>
          </table>
        </div>
      ):(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'var(--paper)'}}>
              {['国际码','中国码','意大利'].map(h=><th key={h} style={{padding:'8px',textAlign:'center',border:'1px solid var(--line)',color:'var(--muted)',fontWeight:700}}>{h}</th>)}
            </tr></thead>
            <tbody>{clothes.map(r=><tr key={r.eu}><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)',fontWeight:700}}>{r.eu}</td><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)'}}>{r.cn}</td><td style={{padding:'7px',textAlign:'center',border:'1px solid var(--line)'}}>{r.it}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── 面积换算 ──────────────────────────────────────────────
function AreaTool() {
  const [val,setVal]=useState(''); const [unit,setUnit]=useState('m2')
  const n=parseFloat(val)||0
  const m2=unit==='m2'?n:unit==='ft2'?n*0.0929:n*3.3058
  const ft2=m2/0.0929, ping=m2/3.3058
  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[{v:'m2',l:'平方米'},{v:'ft2',l:'平方英尺'},{v:'ping',l:'坪(日式)'}].map(u=>(
          <button key={u.v} onClick={()=>setUnit(u.v)} style={{flex:1,padding:'7px',borderRadius:10,border:'1px solid',borderColor:unit===u.v?'#2B6E8F':'var(--line)',background:unit===u.v?'#EEF5F9':'#fff',color:unit===u.v?'#2B6E8F':'var(--muted)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{u.l}</button>
        ))}
      </div>
      <div className="field" style={{marginBottom:12}}><input type="number" placeholder="输入面积" value={val} onChange={e=>setVal(e.target.value)} style={{fontSize:18,fontWeight:700}}/></div>
      {val&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'平方米 (㎡)',v:m2.toFixed(2)},{l:'平方英尺 (ft²)',v:ft2.toFixed(1)},{l:'坪',v:ping.toFixed(2)}].map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'10px 14px'}}>
            <span style={{color:'var(--muted)',fontSize:13}}>{r.l}</span>
            <span style={{fontSize:15,fontWeight:800}}>{r.v}</span>
          </div>))}
      </div>}
    </div>
  )
}

// ── 打折季倒计时 ──────────────────────────────────────────
function SaldiTool() {
  const today=new Date(); today.setHours(0,0,0,0)
  const y=today.getFullYear()
  function nextSat(month,minDay,yr=y){
    const d=new Date(yr,month,minDay)
    while(d.getDay()!==6) d.setDate(d.getDate()+1)
    return d
  }
  const seasons=[
    {name:'冬季打折 Saldi Invernali',d:nextSat(0,2),emoji:'❄️',tip:'通常1月第一个周六开始，持续6-8周'},
    {name:'夏季打折 Saldi Estivi',d:nextSat(6,1),emoji:'☀️',tip:'通常7月第一个周六开始，持续6-8周'},
    {name:'冬季打折 Saldi Invernali',d:nextSat(0,2,y+1),emoji:'❄️',tip:'明年冬季打折'},
  ]
  const upcoming=seasons.filter(s=>s.d>=today).slice(0,2)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {upcoming.map((s,i)=>{
        const days=Math.round((s.d-today)/86400000)
        const fmt=d=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
        return(
          <div key={i} style={{background:i===0?'var(--amber-soft)':'var(--paper)',border:`1px solid ${i===0?'var(--amber)':'var(--line)'}`,borderRadius:14,padding:'16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:24}}>{s.emoji}</span>
              <span style={{fontSize:14,fontWeight:800}}>{s.name}</span>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:i===0?'var(--amber)':'var(--muted)',marginBottom:4}}>
              {days===0?'今天开始！':days===1?'明天开始！':`还有 ${days} 天`}
            </div>
            <div style={{fontSize:13,color:'var(--muted)'}}>{fmt(s.d)} 开始</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{s.tip}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── 支票金额转意大利语 ────────────────────────────────────
function ItalianNumbersTool() {
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)

  // 意大利语数字转换核心逻辑
  function toItalian(n) {
    n = Math.floor(n)
    if (n === 0) return 'zero'
    const ones = ['','uno','due','tre','quattro','cinque','sei','sette','otto','nove',
                  'dieci','undici','dodici','tredici','quattordici','quindici','sedici',
                  'diciassette','diciotto','diciannove']
    const tens = ['','','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta']
    if (n < 20) return ones[n]
    if (n < 100) {
      const t = tens[Math.floor(n/10)], u = n % 10
      if (u === 0) return t
      // Regola elisione: venti+uno→ventuno, trenta+otto→trentotto
      if (u === 1 || u === 8) return t.slice(0,-1) + ones[u]
      // Tré con accento per 3 finale
      if (u === 3) return t + 'tré'
      return t + ones[u]
    }
    if (n < 1000) {
      const h = Math.floor(n/100), r = n % 100
      const hs = h === 1 ? 'cento' : toItalian(h) + 'cento'
      return r === 0 ? hs : hs + toItalian(r)
    }
    if (n < 1000000) {
      const th = Math.floor(n/1000), r = n % 1000
      const ths = th === 1 ? 'mille' : toItalian(th) + 'mila'
      return r === 0 ? ths : ths + toItalian(r)
    }
    if (n < 1000000000) {
      const m = Math.floor(n/1000000), r = n % 1000000
      const ms = m === 1 ? 'un milione' : toItalian(m) + ' milioni'
      return r === 0 ? ms : ms + ' ' + toItalian(r)
    }
    const b = Math.floor(n/1000000000), r = n % 1000000000
    const bs = b === 1 ? 'un miliardo' : toItalian(b) + ' miliardi'
    return r === 0 ? bs : bs + ' ' + toItalian(r)
  }

  function toCheckFormat(val) {
    if (!val || isNaN(parseFloat(val))) return null
    const parts = parseFloat(val).toFixed(2).split('.')
    const euros = parseInt(parts[0])
    const cents = parts[1] // 保持字符串，如 "05" "56"
    let result = toItalian(euros) + '/' + cents
    return result.charAt(0).toUpperCase() + result.slice(1)
  }

  const checkText = amount ? toCheckFormat(amount) : null
  const numValue = parseFloat(amount) || 0

  function copyText() {
    if (!checkText) return
    navigator.clipboard.writeText(checkText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div>
      <div style={{fontSize:12.5, color:'var(--muted)', marginBottom:10, lineHeight:1.6, background:'#EEF5F9', border:'1px solid #B8D4E2', borderRadius:10, padding:'10px 12px'}}>
        💡 输入金额，自动生成意大利语写法，可直接填写在 <b>支票（assegno）</b> 上
      </div>

      <div className="field" style={{marginBottom:12}}>
        <label>金额 (€)</label>
        <input
          type="number"
          placeholder="如：1234.56"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{fontSize:22, fontWeight:700}}
        />
      </div>

      {checkText && (
        <>
          {/* 数字显示 */}
          <div style={{background:'var(--paper)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 14px', marginBottom:10, display:'flex', justifyContent:'space-between'}}>
            <span style={{color:'var(--muted)', fontSize:13}}>金额数字</span>
            <span style={{fontSize:16, fontWeight:800, color:'var(--red)'}}>€ {numValue.toLocaleString('it-IT', {minimumFractionDigits:2})}</span>
          </div>

          {/* 意大利语写法 */}
          <div style={{background:'#FFFEF5', border:'2px solid #C4961A', borderRadius:12, padding:'16px'}}>
            <div style={{fontSize:11, fontWeight:700, color:'#C4961A', marginBottom:8, textTransform:'uppercase', letterSpacing:1}}>
              ✍️ 支票填写（Importo in lettere）
            </div>
            <div style={{fontSize:16, fontWeight:700, color:'var(--ink)', lineHeight:1.6, fontStyle:'italic', letterSpacing:0.3}}>
              {checkText}
            </div>
          </div>

          {/* 复制按钮 */}
          <button
            onClick={copyText}
            style={{width:'100%', marginTop:10, padding:'11px', background:copied?'var(--green)':'var(--ink)',
              color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700,
              cursor:'pointer', transition:'background .2s'}}>
            {copied ? '✓ 已复制！' : '📋 复制意大利语文字'}
          </button>

          {/* 小提示 */}
          <div style={{marginTop:10, fontSize:11, color:'var(--muted)', lineHeight:1.7}}>
            ⚠️ 支票填写时建议在金额后加上 <b>«/00»</b>（如无零头）或确认小数部分，并与数字金额核对一致
          </div>
        </>
      )}
    </div>
  )
}

// ── 日期格式转换 ──────────────────────────────────────────
function DateFormatTool() {
  const [date,setDate]=useState('')
  const d=date?new Date(date):null
  const weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
  const formats=d?[
    {l:'中文格式',v:`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`},
    {l:'意大利格式',v:`${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`},
    {l:'意大利完整',v:`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`},
    {l:'国际格式',v:`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`},
  ]:[]
  return (
    <div>
      <div className="field" style={{marginBottom:12}}><label>选择日期</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      {d&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {formats.map(f=>(
          <div key={f.l} style={{background:'var(--paper)',border:'1px solid var(--line)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>{f.l}</div>
            <div style={{fontSize:16,fontWeight:700}}>{f.v}</div>
          </div>
        ))}
      </div>}
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath()
}

// ── 二维码生成器 ──────────────────────────────────────────
function QRCodeTool() {
  const canvasRef = useRef()
  const [text, setText] = useState('')
  const [label, setLabel] = useState('')
  const [tpl, setTpl] = useState(0)
  const [preview, setPreview] = useState(null)
  const [generating, setGenerating] = useState(false)

  const TEMPLATES = [
    { name: '品牌红', bg: '#C53A2E', qrBg: '#fff', textColor: '#fff', accent: '#A02828' },
    { name: '极简白', bg: '#fff',    qrBg: '#fff', textColor: '#1F1B18', accent: '#ECE7E0' },
    { name: '深色商务', bg: '#1F1B18', qrBg: '#fff', textColor: '#fff', accent: '#2E6B4E' },
  ]

  async function generate() {
    if (!text.trim()) return
    setGenerating(true)
    const t = TEMPLATES[tpl]
    const SIZE = 600, QR = 360, PAD = 30
    const totalH = SIZE + 80
    const canvas = canvasRef.current
    canvas.width = SIZE; canvas.height = totalH
    const ctx = canvas.getContext('2d')

    // 背景
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, SIZE, totalH)

    // Header per template
    if (tpl === 0) {
      ctx.fillStyle = t.accent; ctx.fillRect(0, 0, SIZE, 80)
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(50,40,28,0,Math.PI*2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('ZY',50,47)
      ctx.font = 'bold 38px Arial'; ctx.textAlign = 'left'; ctx.fillText('ZaiYi',90,52)
      ctx.font = '20px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('zaiyi.eu',SIZE-PAD,52)
    } else if (tpl === 1) {
      ctx.fillStyle = '#C53A2E'; ctx.fillRect(0,0,SIZE,6)
      ctx.fillStyle = '#C53A2E'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'
      ctx.fillText('ZaiYi · zaiyi.eu', SIZE/2, 50)
    } else {
      ctx.fillStyle = t.accent; ctx.fillRect(0,0,SIZE,8)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'
      ctx.fillText('ZaiYi · zaiyi.eu', SIZE/2, 58)
    }
    ctx.textAlign = 'left'

    // QR 图片（通过 qrserver.com API）
    const boxPad = 16
    const headerH = tpl === 0 ? 80 : tpl === 1 ? 56 : 68
    const footerH = 40
    // center (QR box + label area) vertically between header and footer
    const blockH = QR + boxPad * 2 + 80
    const qrTop = headerH + Math.round((totalH - footerH - headerH - blockH) / 2) + boxPad
    ctx.fillStyle = t.qrBg
    roundRect(ctx, (SIZE-QR)/2-boxPad, qrTop-boxPad, QR+boxPad*2, QR+boxPad*2, 20); ctx.fill()

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${QR}x${QR}&data=${encodeURIComponent(text.trim())}&color=1F1B18&bgcolor=ffffff&margin=10`
      const img = new Image(); img.crossOrigin = 'anonymous'
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = qrUrl })
      ctx.drawImage(img, (SIZE-QR)/2, qrTop, QR, QR)
    } catch { /* QR 加载失败跳过 */ }

    // 自定义标签文字
    if (label.trim()) {
      ctx.fillStyle = t.textColor
      ctx.font = 'bold 38px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(label.trim(), SIZE/2, qrTop + QR + boxPad*2 + 52)
    }

    // Footer
    const footerY = totalH - 30
    ctx.fillStyle = tpl===0 ? t.accent : tpl===2 ? '#2A2520' : '#F0EEEB'
    ctx.fillRect(0, footerY-8, SIZE, 40)
    ctx.fillStyle = tpl===1 ? '#999' : 'rgba(255,255,255,.45)'
    ctx.font = '18px Arial'; ctx.textAlign = 'left'
    ctx.fillText('Generato da ZaiYi · zaiyi.eu', PAD, footerY+14)

    setPreview(canvas.toDataURL('image/png'))
    setGenerating(false)
  }

  function download() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview; a.download = 'qrcode_zaiyi.png'; a.click()
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="field" style={{ marginBottom: 10 }}>
        <label>内容（网址 / 微信号 / 手机号 / 任意文字）</label>
        <input placeholder="如：https://zaiyi.eu 或微信ID" value={text} onChange={e => setText(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>二维码下方文字（选填）</label>
        <input placeholder="如：扫码添加微信 / 扫码访问网站" value={label} onChange={e => setLabel(e.target.value)} maxLength={30} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => setTpl(i)}
            style={{ flex: 1, padding: '10px 4px', borderRadius: 10,
              border: `1.5px solid ${tpl===i ? '#C53A2E' : 'var(--line)'}`,
              background: tpl===i ? 'var(--red-soft)' : '#fff',
              color: tpl===i ? 'var(--red)' : 'var(--muted)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, background: t.bg,
              border: '1px solid var(--line)', display: 'block' }} />
            {t.name}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={generate} disabled={!text.trim() || generating}
        style={{ marginBottom: 14 }}>
        {generating ? '生成中…' : '🔲 生成二维码'}
      </button>
      {preview && (
        <>
          <img src={preview} alt="二维码预览" style={{ width: '100%', maxWidth: 300, borderRadius: 12,
            border: '1px solid var(--line)', display: 'block', margin: '0 auto 12px' }} />
          <button onClick={download}
            style={{ width: '100%', padding: '12px', background: 'var(--green)', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📥 下载 PNG
          </button>
        </>
      )}
      {!text.trim() && !preview && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
          输入内容后点「生成二维码」
        </div>
      )}
    </div>
  )
}

// ── EAN-13 条码生成器 ──────────────────────────────────────
const EAN_L = [[0,0,0,1,1,0,1],[0,0,1,1,0,0,1],[0,0,1,0,0,1,1],[0,1,1,1,1,0,1],[0,1,0,0,0,1,1],[0,1,1,0,0,0,1],[0,1,0,1,1,1,1],[0,1,1,1,0,1,1],[0,1,1,0,1,1,1],[0,0,0,1,0,1,1]]
const EAN_G = [[0,1,0,0,1,1,1],[0,1,1,0,0,1,1],[0,0,1,1,0,1,1],[0,1,0,0,0,0,1],[0,0,1,1,1,0,1],[0,1,1,1,0,0,1],[0,0,0,0,1,0,1],[0,0,1,0,0,0,1],[0,0,0,1,0,0,1],[0,0,1,0,1,1,1]]
const EAN_R = [[1,1,1,0,0,1,0],[1,1,0,0,1,1,0],[1,1,0,1,1,0,0],[1,0,0,0,0,1,0],[1,0,1,1,1,0,0],[1,0,0,1,1,1,0],[1,0,1,0,0,0,0],[1,0,0,0,1,0,0],[1,0,0,1,0,0,0],[1,1,1,0,1,0,0]]
const EAN_PARITY = [[0,0,0,0,0,0],[0,0,1,0,1,1],[0,0,1,1,0,1],[0,0,1,1,1,0],[0,1,0,0,1,1],[0,1,1,0,0,1],[0,1,1,1,0,0],[0,1,0,1,0,1],[0,1,0,1,1,0],[0,1,1,0,1,0]]

function eanCheck(d12) {
  const d = d12.split('').map(Number)
  return String((10 - d.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0) % 10) % 10)
}
function eanModules(ean) {
  const d = ean.split('').map(Number)
  const par = EAN_PARITY[d[0]]
  const m = [1,0,1]
  for (let i = 0; i < 6; i++) m.push(...(par[i] === 0 ? EAN_L[d[i+1]] : EAN_G[d[i+1]]))
  m.push(0,1,0,1,0)
  for (let i = 0; i < 6; i++) m.push(...EAN_R[d[i+7]])
  m.push(1,0,1)
  return m // 95 modules
}

function EANTool() {
  const canvasRef = useRef()
  const [input, setInput] = useState('')
  const [tpl, setTpl] = useState(0)
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState('')

  const TEMPLATES = [
    { name: '黑条码白底', bg: '#ffffff', bar: '#000000', text: '#000000', border: '#e0e0e0' },
    { name: '白条码黑底', bg: '#111111', bar: '#ffffff', text: '#ffffff', border: '#444' },
  ]

  function generate() {
    setErr('')
    const raw = input.trim().replace(/\D/g, '')
    if (raw.length < 12 || raw.length > 13) { setErr('请输入 12 或 13 位数字'); return }
    const ean = raw.length === 12 ? raw + eanCheck(raw) : raw
    if (raw.length === 13 && raw[12] !== eanCheck(raw.slice(0, 12))) { setErr('第13位校验位错误，建议只输入前12位自动补全'); return }

    const t = TEMPLATES[tpl]
    const W = 520, H = 200
    const canvas = canvasRef.current
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = t.bg
    ctx.fillRect(0, 0, W, H)

    const modules = eanModules(ean)
    const barX = 56, barY = 16, barH = 140
    const modW = 360 / 95

    modules.forEach((on, i) => {
      if (on) {
        ctx.fillStyle = t.bar
        ctx.fillRect(barX + i * modW, barY, modW + 0.3, barH)
      }
    })

    // Digits below barcode
    const numY = barY + barH + 26
    const centerX = barX + (3 + 42) * modW
    ctx.fillStyle = t.text
    ctx.font = '20px monospace'
    ctx.textBaseline = 'alphabetic'
    // First digit: bottom-left, same row as other numbers
    ctx.textAlign = 'center'
    ctx.fillText(ean[0], 28, numY)
    // Left 6 digits (centered under left half)
    ctx.fillText(ean.slice(1, 7), barX + 3 * modW + 21 * modW, numY)
    // Right 6 digits (centered under right half)
    ctx.fillText(ean.slice(7, 13), centerX + 5 * modW + 21 * modW, numY)

    setPreview(canvas.toDataURL('image/png'))
  }

  function download() {
    const a = document.createElement('a')
    a.href = preview; a.download = `EAN13_${input.trim()}.png`; a.click()
  }

  const digits = input.replace(/\D/g, '')

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px' }}>
        输入 12 位数字自动补全校验位，或直接输入完整 13 位 EAN-13
      </p>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>条码数字（12 或 13 位）</label>
        <input type="text" inputMode="numeric" maxLength={13}
          placeholder="如：880123456789"
          value={input} onChange={e => { setInput(e.target.value.replace(/\D/g, '')); setErr('') }} />
      </div>
      {err && <p style={{ color: '#C53A2E', fontSize: 13, margin: '-8px 0 12px' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => setTpl(i)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10,
              border: `2px solid ${tpl===i ? '#C53A2E' : t.border}`,
              background: t.bg, color: t.text,
              fontWeight: tpl===i ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.name}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={generate} disabled={digits.length < 12}
        style={{ marginBottom: 14, opacity: digits.length < 12 ? 0.4 : 1 }}>
        📊 生成条码
      </button>
      {preview && (
        <>
          <img src={preview} alt="条码预览"
            style={{ width: '100%', maxWidth: 360, borderRadius: 10, border: '1px solid var(--line)',
              display: 'block', margin: '0 auto 12px' }} />
          <button onClick={download}
            style={{ width: '100%', padding: '12px', background: 'var(--green)', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📥 下载 PNG
          </button>
        </>
      )}
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────
const TOOLS = [
  { id: 'currency', icon: '💱', title: '汇率换算', sub: 'EUR · CNY · USD 实时换算', component: CurrencyTool },
  { id: 'qrcode', icon: '📱', title: '二维码生成器', sub: '网址/微信/手机号 · 3种模版 · 可加文字', component: QRCodeTool },
  { id: 'cf', icon: '🪪', title: 'Codice Fiscale 生成', sub: '意大利税号生成器（中国出生）', component: CFTool },
  { id: 'ean', icon: '📊', title: 'EAN 条码生成器', sub: 'EAN-13 · 黑白2种模版 · 可下载', component: EANTool },
  { id: 'iva', icon: '🧾', title: '增值税 IVA', sub: '含税/不含税价互转', component: IvaTool },
  { id: 'salary', icon: '💰', title: '工资换算', sub: '月薪 · 日薪 · 时薪', component: SalaryTool },
  { id: 'profit', icon: '📈', title: '利润率计算', sub: '进价+售价 → 利润/利润率', component: ProfitTool },
  { id: 'permit', icon: '🪪', title: '居留证倒计时', sub: '输入到期日，实时提醒', component: PermitTool },
  { id: 'discount', icon: '🏷️', title: '折扣计算', sub: '折后价格 · 节省金额', component: DiscountTool },
  { id: 'split', icon: '🍽️', title: 'AA制分摊', sub: '多人聚餐快速平摊', component: SplitTool },
  { id: 'bulk', icon: '📦', title: '进货成本计算', sub: '多品 × 单价 + 运费 = 总成本', component: BulkCostTool },
  { id: 'loan', icon: '🏦', title: '贷款还款计算', sub: '月供 · 总利息 · 还款年限', component: LoanTool },
  { id: 'gold', icon: '🥇', title: '黄金价格换算', sub: '欧元/克 ↔ 人民币/克/斤', component: GoldTool },
  { id: 'permitfee', icon: '📋', title: '居留办理费用清单', sub: '印花税+邮政费+制证费 汇总', component: PermitFeeTool },
  { id: 'holiday', icon: '📅', title: '意大利节假日', sub: '查看当年公共假日及倒计时', component: HolidayTool },
  { id: 'shipping', icon: '🚚', title: '快递费估算', sub: 'BRT · SDA · GLS · DHL 对比', component: ShippingTool },
  { id: 'weight', icon: '⚖️', title: '重量换算', sub: '斤 · 公斤 · 磅 · 克', component: WeightTool },
  { id: 'size', icon: '👟', title: '尺码换算', sub: '鞋码 · 衣码 欧/中/美对照', component: SizeTool },
  { id: 'area', icon: '📐', title: '面积换算', sub: '平方米 · 平方英尺 · 坪', component: AreaTool },
  { id: 'saldi', icon: '🛍️', title: '打折季倒计时', sub: 'Saldi 冬/夏季打折季距离', component: SaldiTool },
  { id: 'itnums', icon: '✍️', title: '支票金额转意大利语', sub: '输入金额 → 自动生成支票填写文字', component: ItalianNumbersTool },
  { id: 'datefmt', icon: '📆', title: '中意日期格式转换', sub: '中文 ↔ 意大利 ↔ 国际格式', component: DateFormatTool },
]

export default function ToolsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [open, setOpen] = useState('currency')

  return (
    <>
      <header className="topbar">
        <Logo variant="topbar" size={1} />
        <span className="brand"><span style={{ color: 'var(--ink)' }}>华商</span>小工具</span>
        <div style={{ flex: 1 }} />
      </header>

      <div style={{ padding: '10px 16px 4px', fontSize: 12.5, color: 'var(--muted)' }}>
        免费 · 纯本地计算 · 不上传任何数据
      </div>

      {/* 优惠卡生成器入口 */}
      <div style={{ padding: '8px 16px 0' }}>
        <button onClick={() => navigate(session ? '/volantino' : '/login')}
          style={{ width: '100%', background: 'linear-gradient(135deg,#C53A2E,#A02828)',
            border: 'none', borderRadius: 18, padding: '16px 18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit' }}>
          <span style={{ fontSize: 36 }}>🗞️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>优惠卡/促销传单生成器</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>
              填表单 → 自动出卡图 → 打印/发微信/WhatsApp
            </div>
          </div>
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 20, marginLeft: 'auto' }}>›</span>
        </button>
      </div>

      <div style={{ padding: '8px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TOOLS.map(tool => {
          const isOpen = open === tool.id
          const Component = tool.component
          return (
            <div key={tool.id} style={{ background: '#fff', border: `1px solid ${isOpen ? 'var(--ink)' : 'var(--line)'}`,
              borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s' }}>
              {/* 工具头部 */}
              <div onClick={() => setOpen(isOpen ? null : tool.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{tool.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{tool.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{tool.sub}</div>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 18, transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform .2s' }}>›</span>
              </div>
              {/* 工具内容 */}
              {isOpen && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--line)' }}>
                  <div style={{ height: 12 }} />
                  <Component />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
