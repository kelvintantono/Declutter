import { schedule } from "@netlify/functions"
import webpush from "web-push"
import { getStore } from "@netlify/blobs"

// 07:30 WIB = 00:30 UTC
export const handler = schedule("30 0 * * *", async () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('[scheduled-push] VAPID keys not set, skipping')
    return { statusCode: 200 }
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@rumahbersih.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const store = getStore("rumah-bersih")
  const [subs, zone] = await Promise.all([
    store.get('subscriptions', { type: 'json' }),
    store.get('zone', { type: 'json' })
  ])

  if (!subs?.length) {
    console.log('[scheduled-push] No subscriptions found')
    return { statusCode: 200 }
  }

  const zoneName = zone?.name || 'zona aktif'
  const payload = JSON.stringify({
    title: '🏠 Tugas Kebersihan Hari Ini',
    body: `📍 ${zoneName} — Sortir barang & cek tumpukan. Cukup 5–10 menit!`
  })

  const results = await Promise.allSettled(
    subs.map(({ subscription }) =>
      webpush.sendNotification(subscription, payload)
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`[scheduled-push] Sent: ${sent}, Failed: ${failed}`)

  return { statusCode: 200 }
})
