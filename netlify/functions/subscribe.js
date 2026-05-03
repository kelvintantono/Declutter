import { getStore } from "@netlify/blobs"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS }

  const { artId, subscription } = JSON.parse(event.body || '{}')
  if (!artId || !subscription) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Missing artId or subscription' }) }
  }

  const store = getStore("rumah-bersih")
  const subs = await store.get('subscriptions', { type: 'json' }) || []

  // Replace existing subscription for this ART
  const filtered = subs.filter(s => s.artId !== artId)
  filtered.push({ artId, subscription, updatedAt: new Date().toISOString() })
  await store.setJSON('subscriptions', filtered)

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
}
