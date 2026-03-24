export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { title, message, segment } = req.body
  const apiKey = process.env.ONESIGNAL_API_KEY
  const appId = process.env.ONESIGNAL_APP_ID

  if (!apiKey || !appId) return res.status(500).json({ error: 'OneSignal not configured' })

  try {
    const resp = await fetch('https://api.onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: title || 'Ronda' },
        contents: { en: message || 'Tienes algo pendiente' },
        included_segments: [segment || 'All'],
        chrome_web_icon: 'https://rondahub.com/icon-192.png',
      }),
    })
    const data = await resp.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
