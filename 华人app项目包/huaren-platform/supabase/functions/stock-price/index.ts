import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const [spcxRes, btcRes, rateRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPCX?interval=1d&range=1d', { headers: YF_HEADERS }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1d', { headers: YF_HEADERS }),
      fetch('https://api.exchangerate-api.com/v4/latest/USD'),
    ])

    const [spcxData, btcData, rateData] = await Promise.all([
      spcxRes.json(), btcRes.json(), rateRes.json()
    ])

    const eurRate = rateData?.rates?.EUR  // 1 USD = X EUR
    const spcxUSD = spcxData?.chart?.result?.[0]?.meta?.regularMarketPrice
    const btcUSD  = btcData?.chart?.result?.[0]?.meta?.regularMarketPrice

    if (!eurRate) throw new Error('汇率获取失败')

    return new Response(JSON.stringify({
      spcx: spcxUSD ? {
        priceUSD: parseFloat(spcxUSD.toFixed(2)),
        priceEUR: parseFloat((spcxUSD * eurRate).toFixed(2)),
      } : null,
      btc: btcUSD ? {
        priceUSD: parseFloat(btcUSD.toFixed(2)),
        priceEUR: parseFloat((btcUSD * eurRate).toFixed(2)),
      } : null,
      eurUsdRate: parseFloat((1 / eurRate).toFixed(4)),
    }), { headers: CORS })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: CORS
    })
  }
})
