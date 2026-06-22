import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.0"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { business_name, business_type, city, contact_wechat, contact_phone, description } =
      await req.json()

    const transporter = nodemailer.createTransport({
      host: 'mail.spacemail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'info@zaiyi.eu',
        pass: Deno.env.get('SMTP_PASS'),
      },
    })

    const subject = `【在意商圈】新入驻申请：${business_name}`

    const text = `你好，

收到一条新的商圈入驻申请，请及时审核。

━━━━━━━━━━━━━━━━━
商家名称：${business_name}
商家类型：${business_type}
所在城市：${city}
微信号：${contact_wechat || '未填写'}
电话：${contact_phone || '未填写'}
简介：${description || '未填写'}
━━━━━━━━━━━━━━━━━

请登录管理后台审核：
https://zaiyi.eu

在意平台 · 自动通知`

    await transporter.sendMail({
      from: '"在意平台" <info@zaiyi.eu>',
      to: 'info@zaiyi.eu',
      subject,
      text,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: CORS })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: CORS
    })
  }
})
