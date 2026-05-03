import { getStore } from "@netlify/blobs"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

const json = (data, status = 200) => ({
  statusCode: status,
  headers: CORS,
  body: JSON.stringify(data)
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS }
  if (event.httpMethod !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const store = getStore("rumah-bersih")
  const body = JSON.parse(event.body || '{}')
  const { action } = body

  try {
    switch (action) {

      // ── AUTH
      case 'verify-pin': {
        const { role, pin } = body
        const pins = {
          admin: process.env.ADMIN_PIN || '1234',
          art1:  process.env.ART1_PIN  || '1111',
          art2:  process.env.ART2_PIN  || '2222',
        }
        if (pins[role] !== pin) return json({ ok: false, error: 'PIN salah' })
        const names = {
          admin: 'Admin',
          art1:  process.env.ART1_NAME || 'ART 1',
          art2:  process.env.ART2_NAME || 'ART 2',
        }
        return json({ ok: true, name: names[role] })
      }

      // ── ZONE
      case 'get-zone': {
        const zone = await store.get('zone', { type: 'json' })
          || { name: 'Belum diatur', startDate: null, history: [] }
        return json({ ok: true, zone })
      }

      case 'set-zone': {
        const { name } = body
        const existing = await store.get('zone', { type: 'json' }) || { history: [] }
        const zone = {
          name,
          startDate: new Date().toISOString().split('T')[0],
          history: existing.history || []
        }
        await store.setJSON('zone', zone)
        return json({ ok: true, zone })
      }

      case 'complete-zone': {
        const zone = await store.get('zone', { type: 'json' }) || { name: '', history: [] }
        const history = zone.history || []
        history.unshift({
          name: zone.name,
          startDate: zone.startDate,
          completedDate: new Date().toISOString().split('T')[0]
        })
        if (history.length > 12) history.pop()
        const updated = { name: 'Belum diatur', startDate: null, history }
        await store.setJSON('zone', updated)
        return json({ ok: true })
      }

      // ── CHECKLIST
      case 'get-checklist': {
        const { artId, date } = body
        const key = `checklist_${artId}_${date}`
        const data = await store.get(key, { type: 'json' }) || { task1: false, task2: false }
        return json({ ok: true, checklist: data })
      }

      case 'save-checklist': {
        const { artId, date, task1, task2 } = body
        const key = `checklist_${artId}_${date}`
        await store.setJSON(key, { task1, task2, date })
        return json({ ok: true })
      }

      // ── MONTHLY SUMMARY
      case 'get-monthly-summary': {
        const { artId, year, month } = body
        const daysInMonth = new Date(year, month, 0).getDate()
        let completedDays = 0
        const days = []

        // Fetch all days in parallel for speed
        const promises = Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          return store.get(`checklist_${artId}_${date}`, { type: 'json' })
        })
        const results = await Promise.all(promises)

        results.forEach((data, i) => {
          const d = i + 1
          const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const bothDone = !!(data?.task1 && data?.task2)
          if (bothDone) completedDays++
          days.push({ d, date, task1: data?.task1 || false, task2: data?.task2 || false, bothDone })
        })

        const earned = completedDays * 5000
        const bonus = completedDays === daysInMonth ? 50000 : 0
        return json({ ok: true, completedDays, daysInMonth, earned, bonus, total: earned + bonus, days })
      }

      // ── PHOTOS
      case 'get-photos': {
        const photos = await store.get('photos', { type: 'json' }) || []
        // Don't return full photoData in list to save bandwidth
        const list = photos.map(p => ({ ...p }))
        return json({ ok: true, photos: list })
      }

      case 'add-photo': {
        const { artId, artName, photoData } = body
        const photos = await store.get('photos', { type: 'json' }) || []
        const photo = {
          id: Date.now().toString(),
          artId,
          artName,
          photoData,
          timestamp: new Date().toISOString(),
          status: 'pending',
          category: null
        }
        photos.unshift(photo)
        if (photos.length > 80) photos.pop()
        await store.setJSON('photos', photos)
        return json({ ok: true, photo: { ...photo, photoData: undefined } })
      }

      case 'approve-photo': {
        const { id, category } = body
        const photos = await store.get('photos', { type: 'json' }) || []
        const idx = photos.findIndex(p => p.id === id)
        if (idx !== -1) {
          photos[idx].status = 'approved'
          photos[idx].category = category
          photos[idx].approvedAt = new Date().toISOString()
        }
        await store.setJSON('photos', photos)
        return json({ ok: true })
      }

      default:
        return json({ ok: false, error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    console.error('[data function error]', err)
    return json({ ok: false, error: err.message }, 500)
  }
}
