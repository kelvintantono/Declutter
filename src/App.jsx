import { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────
const api = async (action, body = {}) => {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body })
  })
  return res.json()
}

const todayStr = () => new Date().toISOString().split('T')[0]

const formatRp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`

const daysSince = (dateStr) => {
  if (!dateStr) return 0
  const diff = new Date() - new Date(dateStr)
  return Math.max(1, Math.ceil(diff / 86400000))
}

const formatDateID = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target.result
      img.onload = () => {
        const MAX = 800
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
    }
    reader.readAsDataURL(file)
  })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribePush(artId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) return false
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    })
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artId, subscription: sub.toJSON() })
    })
    return true
  } catch { return false }
}

// ─────────────────────────────────────────
// Login
// ─────────────────────────────────────────
function Login({ onLogin }) {
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const roles = [
    { id: 'art1', icon: '🧹', name: 'Ika', sub: 'Asisten Rumah Tangga' },
    { id: 'art2', icon: '🧹', name: 'Lia', sub: 'Asisten Rumah Tangga' },
  ]

  const handleLogin = async () => {
    if (!selected || !pin) return
    setLoading(true)
    setError('')
    const role = selected === 'admin' ? 'admin' : selected
    const res = await api('verify-pin', { role, pin })
    setLoading(false)
    if (res.ok) {
      onLogin({ role: selected === 'admin' ? 'admin' : 'art', name: res.name, id: selected })
    } else {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand">Sistem Kontrol Rumah</div>
      <div className="login-title">Rumah<br/>Bersih</div>
      <div className="login-sub">Pilih peran kamu dan masukkan PIN</div>

      <div className="role-grid">
        {roles.map(r => (
          <div
            key={r.id}
            className={`role-card ${selected === r.id ? 'selected' : ''}`}
            onClick={() => { setSelected(r.id); setPin(''); setError('') }}
          >
            <div className="rc-icon">{r.icon}</div>
            <div className="rc-name">{r.name}</div>
            <div className="rc-sub">{r.sub}</div>
          </div>
        ))}
        <div
          className={`role-card full ${selected === 'admin' ? 'selected' : ''}`}
          onClick={() => { setSelected('admin'); setPin(''); setError('') }}
        >
          <div className="rc-icon">👑</div>
          <div>
            <div className="rc-name">Admin</div>
            <div className="rc-sub">Kelvin / Istri</div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="pin-section">
          <div className="pin-label">Masukkan PIN</div>
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading || !pin}
            style={{ opacity: loading || !pin ? 0.5 : 1 }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk →'}
          </button>
          {error && <div className="pin-error">{error}</div>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────
function TopBar({ user, onLogout }) {
  const greet = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="tl-label">{greet()}</div>
        <div className="tl-name">{user.name}</div>
      </div>
      <button className="btn-logout" onClick={onLogout}>Keluar</button>
    </div>
  )
}

// ─────────────────────────────────────────
// ZONE TAB (Admin)
// ─────────────────────────────────────────
function ZoneTab() {
  const [zone, setZone] = useState(null)
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await api('get-zone')
    if (res.ok) setZone(res.zone)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSet = async () => {
    if (!newName.trim()) return
    const res = await api('set-zone', { name: newName.trim() })
    if (res.ok) { setZone(res.zone); setNewName(''); setShowInput(false) }
  }

  const handleComplete = async () => {
    if (!confirm(`Tandai zona "${zone.name}" sebagai selesai?`)) return
    await api('complete-zone')
    setShowInput(true)
    load()
  }

  if (loading) return <div className="content"><div className="loading">Memuat...</div></div>

  const days = daysSince(zone?.startDate)
  const hasZone = zone?.name && zone.name !== 'Belum diatur'

  return (
    <div className="content">
      <div className="zone-hero">
        <div className="zone-hero-label">Zona Aktif Saat Ini</div>
        <div className="zone-hero-name">{zone?.name || '—'}</div>
        <div className="zone-hero-days">
          {hasZone ? `Hari ke-${days} · Dimulai ${formatDateID(zone.startDate)}` : 'Belum ada zona yang diatur'}
        </div>

        {hasZone && !showInput && (
          <div className="btn-row">
            <button className="btn-primary" onClick={handleComplete}>✓ Zona Selesai</button>
            <button className="btn-secondary" style={{padding:'13px 16px'}} onClick={() => setShowInput(true)}>Ganti</button>
          </div>
        )}

        {(!hasZone || showInput) && (
          <div className="zone-input-row">
            <input
              className="input-field"
              placeholder="Nama zona baru (cth: Kamar Anak)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSet()}
            />
            <button className="zone-input-row btn-set" onClick={handleSet}>Set</button>
          </div>
        )}
      </div>

      {zone?.history?.length > 0 && (
        <div className="card">
          <div className="card-title">Riwayat Zona</div>
          {zone.history.map((h, i) => (
            <div className="history-item" key={i}>
              <div>
                <div className="history-name">{h.name}</div>
                <div className="history-date">{formatDateID(h.startDate)} → {formatDateID(h.completedDate)}</div>
              </div>
              <div className="done-pill">✓ Selesai</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────
function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}
    >
      <img
        src={src}
        alt="foto barang"
        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: 'white', fontSize: '20px', width: '36px', height: '36px',
          borderRadius: '50%', cursor: 'pointer'
        }}
      >✕</button>
    </div>
  )
}

// ─────────────────────────────────────────
// PHOTO LIST (shared by Admin + ART)
// ─────────────────────────────────────────
function PhotoList({ isAdmin, artId }) {
  const [photos, setPhotos] = useState([])
  const [filter, setFilter] = useState(isAdmin ? 'pending' : 'approved')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(async () => {
    const res = await api('get-photos', { status: 'all' })
    if (res.ok) {
      const list = isAdmin ? res.photos : res.photos.filter(p => p.artId === artId)
      setPhotos(list)
    }
    setLoading(false)
  }, [isAdmin, artId])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id, category) => {
    await api('approve-photo', { id, category })
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'approved', category } : p))
  }

  const catColor = { simpan: 'blue', jual: 'yellow', buang: 'red', donasi: 'green' }
  const catLabel = { simpan: '🏠 Simpan', jual: '💰 Jual', buang: '🗑 Buang', donasi: '🤝 Donasi' }

  const filtered = photos.filter(p => filter === 'all' ? true : p.status === filter)
  const pendingCount = photos.filter(p => p.status === 'pending').length

  if (loading) return <div className="content"><div className="loading">Memuat...</div></div>

  return (
    <div className="content">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <div className="filter-row">
        {isAdmin && (
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            Menunggu {pendingCount > 0 && `(${pendingCount})`}
          </button>
        )}
        <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>
          Sudah disetujui
        </button>
        {isAdmin && (
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Semua
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">{filter === 'pending' ? '✨' : '📭'}</div>
          <div className="empty-text">{filter === 'pending' ? 'Semua foto sudah disetujui!' : 'Belum ada foto'}</div>
          <div className="empty-sub">{!isAdmin && filter === 'approved' ? 'Foto yang sudah dikategorikan admin muncul di sini' : ''}</div>
        </div>
      )}

      {filtered.map(photo => (
        <div className="photo-card" key={photo.id}>
          {photo.photoData && (
            <img
              src={photo.photoData}
              alt="foto barang"
              style={{ cursor: 'zoom-in' }}
              onClick={() => setLightbox(photo.photoData)}
            />
          )}
          <div className="photo-card-body">
            <div className="photo-meta">
              <strong>{photo.artName}</strong> · {new Date(photo.timestamp).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
            </div>
            {isAdmin && photo.status === 'pending' ? (
              <div className="bucket-row">
                {['simpan','jual','buang','donasi'].map(cat => (
                  <button key={cat} className={`bucket-btn ${cat}`} onClick={() => handleApprove(photo.id, cat)}>
                    {catLabel[cat]}
                  </button>
                ))}
              </div>
            ) : (
              photo.category && (
                <div className={`approved-pill bucket-btn ${catColor[photo.category]}`} style={{display:'inline-flex'}}>
                  {catLabel[photo.category]}
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// APPROVAL TAB (Admin)
// ─────────────────────────────────────────
function ApprovalTab() {
  return <PhotoList isAdmin={true} />
}

// ─────────────────────────────────────────
// SUMMARY TAB (Admin)
// ─────────────────────────────────────────
function SummaryTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [r1, r2] = await Promise.all([
      api('get-monthly-summary', { artId: 'art1', year, month }),
      api('get-monthly-summary', { artId: 'art2', year, month })
    ])
    if (r1.ok) setData1(r1)
    if (r2.ok) setData2(r2)
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y-1); setMonth(12) }
    else setMonth(m => m-1)
  }
  const nextMonth = () => {
    const n = new Date()
    if (year === n.getFullYear() && month === n.getMonth()+1) return
    if (month === 12) { setYear(y => y+1); setMonth(1) }
    else setMonth(m => m+1)
  }

  const ARTBlock = ({ name, data, artId }) => {
    if (!data) return null
    const [photoCount, setPhotoCount] = useState(null)

    useEffect(() => {
      api('get-monthly-photo-count', { artId, year, month }).then(res => {
        if (res.ok) setPhotoCount(res)
      })
    }, [artId])

    const photoEarned = photoCount ? photoCount.daysHit * 5000 : 0
    const grandTotal = data.total + photoEarned

    return (
      <div className="art-summary">
        <div className="art-sum-header">
          <div className="art-sum-name">{name}</div>
          <div className="art-sum-days">{data.completedDays}/{data.daysInMonth} hari</div>
        </div>
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-val">{data.completedDays}</div>
            <div className="stat-label">Hari Checklist</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">{photoCount ? photoCount.daysHit : '...'}</div>
            <div className="stat-label">Hari 10 Foto</div>
          </div>
          <div className="stat-box" style={{gridColumn:'1/-1'}}>
            <div className="stat-val">{formatRp(data.earned + photoEarned)}</div>
            <div className="stat-label">Total Insentif (checklist + foto)</div>
          </div>
        </div>
        <div className={`bonus-card ${data.bonus > 0 ? 'unlocked' : 'locked'}`} style={{marginTop:'8px'}}>
          <div className="bonus-text">
            {data.bonus > 0 ? '🎉 Bonus full bulan!' : `Bonus (perlu ${data.daysInMonth} hari penuh)`}
          </div>
          <div className="bonus-amount">{formatRp(data.bonus)}</div>
        </div>
        <div className="total-row">
          <div className="total-label">Grand Total Bulan Ini</div>
          <div className="total-val">{formatRp(grandTotal + data.bonus)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div className="month-nav">
        <button className="month-nav-btn" onClick={prevMonth}>‹</button>
        <div className="month-nav-label">{MONTHS_ID[month-1]} {year}</div>
        <button className="month-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {loading ? (
        <div className="loading">Memuat data...</div>
      ) : (
        <>
          <ARTBlock name="Ika" data={data1} artId="art1" />
          <ARTBlock name="Lia" data={data2} artId="art2" />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// TODAY TAB (ART)
// ─────────────────────────────────────────
function TodayTab({ user }) {
  const [checklist, setChecklist] = useState({ task1: false, task2: false })
  const [zone, setZone] = useState(null)
  const [notifDone, setNotifDone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [cRes, zRes] = await Promise.all([
        api('get-checklist', { artId: user.id, date: todayStr() }),
        api('get-zone')
      ])
      if (cRes.ok) setChecklist(cRes.checklist)
      if (zRes.ok) setZone(zRes.zone)
    }
    load()
    setNotifDone(localStorage.getItem(`notif_${user.id}`) === '1')
  }, [user.id])

  const toggle = async (key) => {
    const updated = { ...checklist, [key]: !checklist[key] }
    setChecklist(updated)
    setSaving(true)
    await api('save-checklist', { artId: user.id, date: todayStr(), ...updated })
    setSaving(false)
  }

  const handleNotif = async () => {
    const ok = await subscribePush(user.id)
    if (ok) {
      localStorage.setItem(`notif_${user.id}`, '1')
      setNotifDone(true)
    } else {
      alert('Tidak bisa mengaktifkan notifikasi. Pastikan browser mengizinkan notifikasi.')
    }
  }

  const bothDone = checklist.task1 && checklist.task2
  const dateLabel = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="content">
      {!notifDone && (
        <div className="notif-banner">
          <div className="notif-text">
            <strong>🔔 Aktifkan Pengingat Harian</strong>
            Terima notifikasi jam 07.30 setiap hari agar tidak lupa.
          </div>
          <button className="btn-notif" onClick={handleNotif}>Aktifkan</button>
        </div>
      )}

      <div className="today-header">
        <div className="today-date">{dateLabel}</div>
        <div className="today-zone">📍 {zone?.name || 'Zona belum diatur'}</div>
      </div>

      <div className="card">
        <div className="card-title">Tugas Hari Ini · {saving ? '⏳' : '✓'}</div>
        {[
          { key: 'task1', name: 'Sortir barang', desc: 'Pegang satu per satu → Simpan / Jual / Buang / Donasi. Tidak ada yang ditunda.' },
          { key: 'task2', name: 'Tidak ada tumpukan', desc: 'Pastikan tidak ada barang yang ditaruh di atas barang lain — tanpa kecuali.' }
        ].map(t => (
          <div className="task-item" key={t.key} onClick={() => toggle(t.key)}>
            <div className={`task-check ${checklist[t.key] ? 'done' : ''}`}>
              {checklist[t.key] ? '✓' : ''}
            </div>
            <div>
              <div className={`task-main ${checklist[t.key] ? 'done' : ''}`}>{t.name}</div>
              <div className="task-desc">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {bothDone && (
        <div className="earned-banner">
          <div>
            <div className="earned-label">🎉 Tugas selesai hari ini!</div>
            <div style={{fontSize:'12px',color:'var(--green)',marginTop:'2px'}}>Kamu telah menyelesaikan semua tugas.</div>
          </div>
          <div className="earned-val">+ {formatRp(5000)}</div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// UPLOAD TAB (ART)
// ─────────────────────────────────────────
const DAILY_PHOTO_TARGET = 10

function UploadTab({ user }) {
  const [preview, setPreview] = useState(null)
  const [compressed, setCompressed] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(true)

  useEffect(() => {
    const loadCount = async () => {
      const res = await api('get-photos', { status: 'all' })
      if (res.ok) {
        const today = todayStr()
        const count = res.photos.filter(p =>
          p.artId === user.id && p.timestamp.startsWith(today)
        ).length
        setTodayCount(count)
      }
      setLoadingCount(false)
    }
    loadCount()
  }, [user.id, done])

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const data = await compressImage(file)
    setPreview(data)
    setCompressed(data)
    setDone(false)
  }

  const handleSubmit = async () => {
    if (!compressed) return
    setUploading(true)
    await api('add-photo', { artId: user.id, artName: user.name, photoData: compressed })
    setUploading(false)
    setPreview(null)
    setCompressed(null)
    setDone(true)
  }

  const pct = Math.min(100, Math.round((todayCount / DAILY_PHOTO_TARGET) * 100))
  const hit = todayCount >= DAILY_PHOTO_TARGET

  return (
    <div className="content">

      {/* DAILY COUNTER */}
      <div className="card">
        <div className="card-title">Target Foto Harian</div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
          <div>
            <span style={{fontSize:'28px', fontWeight:'900', color: hit ? 'var(--green)' : 'var(--text)', letterSpacing:'-1px'}}>
              {loadingCount ? '...' : todayCount}
            </span>
            <span style={{fontSize:'16px', fontWeight:'600', color:'var(--text3)'}}>/{DAILY_PHOTO_TARGET} foto</span>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'13px', fontWeight:'700', color: hit ? 'var(--green)' : 'var(--accent)'}}>
              {hit ? '🎉 Target tercapai!' : `${DAILY_PHOTO_TARGET - todayCount} foto lagi`}
            </div>
            <div style={{fontSize:'11px', color:'var(--text3)', marginTop:'2px'}}>
              {hit ? '+Rp5.000 hari ini' : 'Rp5.000 jika 10 foto'}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{background:'var(--surface2)', borderRadius:'4px', height:'6px', overflow:'hidden'}}>
          <div style={{
            background: hit ? 'var(--green)' : 'var(--accent)',
            height:'100%', borderRadius:'4px',
            width: `${pct}%`,
            transition:'width 0.4s'
          }}/>
        </div>
      </div>

      {done && (
        <div className="earned-banner">
          <div>
            <div className="earned-label">✅ Foto berhasil dikirim!</div>
            <div style={{fontSize:'12px',color:'var(--green)',marginTop:'2px'}}>Admin akan segera meninjau dan mengkategorikan.</div>
          </div>
        </div>
      )}

      {hit && (
        <div className="earned-banner">
          <div>
            <div className="earned-label">🎉 Target 10 foto tercapai!</div>
            <div style={{fontSize:'12px',color:'var(--green)',marginTop:'2px'}}>Rp5.000 sudah masuk hitungan hari ini.</div>
          </div>
          <div className="earn-val">+{formatRp(5000)}</div>
        </div>
      )}

      <label style={{cursor:'pointer'}}>
        <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFile} />
        {preview ? (
          <img src={preview} alt="preview" className="upload-preview" />
        ) : (
          <div className={`upload-area ${hit ? '' : ''}`}>
            <div className="upload-icon">📷</div>
            <div className="upload-text">Ambil foto atau pilih dari galeri</div>
            <div className="upload-sub">Foto akan dikompresi otomatis</div>
          </div>
        )}
      </label>

      {preview && (
        <div className="btn-row" style={{gap:'8px'}}>
          <button className="btn-secondary" onClick={() => { setPreview(null); setCompressed(null) }}>Batal</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={uploading}
            style={{opacity: uploading ? 0.6 : 1}}
          >
            {uploading ? 'Mengirim...' : 'Kirim ke Admin →'}
          </button>
        </div>
      )}

      <div className="upload-note">
        📸 Foto barang yang ingin disortir. Admin akan menentukan: Simpan, Jual, Buang, atau Donasi.
        Target 10 foto per hari = Rp5.000.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// POINTS TAB (ART)
// ─────────────────────────────────────────
function PointsTab({ user }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api('get-monthly-summary', { artId: user.id, year, month })
    if (res.ok) setData(res)
    setLoading(false)
  }, [user.id, year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 1) { setYear(y=>y-1); setMonth(12) } else setMonth(m=>m-1)
  }
  const nextMonth = () => {
    const n = new Date()
    if (year === n.getFullYear() && month === n.getMonth()+1) return
    if (month === 12) { setYear(y=>y+1); setMonth(1) } else setMonth(m=>m+1)
  }

  const todayDate = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()+1

  return (
    <div className="content">
      <div className="month-nav">
        <button className="month-nav-btn" onClick={prevMonth}>‹</button>
        <div className="month-nav-label">{MONTHS_ID[month-1]} {year}</div>
        <button className="month-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {loading ? <div className="loading">Memuat...</div> : data && (
        <>
          <div className="points-hero">
            <div className="ph-left">
              <div className="ph-val">{data.completedDays}</div>
              <div className="ph-label">Hari Selesai / {data.daysInMonth}</div>
            </div>
            <div className="ph-right">
              <div className="ph-rp">{formatRp(data.earned)}</div>
              <div className="ph-rp-label">Insentif</div>
            </div>
          </div>

          <div className={`bonus-card ${data.bonus > 0 ? 'unlocked' : 'locked'}`}>
            <div>
              <div className="bonus-text">
                {data.bonus > 0 ? '🎉 Bonus full bulan!' : `Bonus full bulan (butuh ${data.daysInMonth - data.completedDays} hari lagi)`}
              </div>
            </div>
            <div className="bonus-amount">{formatRp(50000)}</div>
          </div>

          {data.total > 0 && (
            <div className="total-row">
              <div className="total-label">Total Bulan Ini</div>
              <div className="total-val">{formatRp(data.total)}</div>
            </div>
          )}

          <div className="card">
            <div className="card-title">Kalender Bulan Ini</div>
            <div className="calendar-grid">
              {Array.from({ length: data.daysInMonth }, (_, i) => {
                const day = data.days[i]
                const d = i + 1
                const isToday = isCurrentMonth && d === todayDate
                const isFuture = isCurrentMonth && d > todayDate
                let cls = 'cal-day'
                if (isFuture) cls += ' future'
                else if (day.bothDone) cls += ' done'
                else cls += ' missed'
                if (isToday) cls += ' today-cell'
                return (
                  <div key={d} className={cls} title={`${d} ${MONTHS_ID[month-1]}`}>
                    {day.bothDone ? '✓' : d}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Dashboards
// ─────────────────────────────────────────
function AdminDash({ user, onLogout }) {
  const [tab, setTab] = useState('zone')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const check = async () => {
      const res = await api('get-photos', { status: 'all' })
      if (res.ok) setPendingCount(res.photos.filter(p => p.status === 'pending').length)
    }
    check()
  }, [tab])

  return (
    <div className="app">
      <TopBar user={user} onLogout={onLogout} />
      {tab === 'zone' && <ZoneTab />}
      {tab === 'approve' && <ApprovalTab />}
      {tab === 'summary' && <SummaryTab />}
      <nav className="bottom-nav">
        {[
          { id: 'zone', icon: '🗺', label: 'Zona' },
          { id: 'approve', icon: '📸', label: 'Foto', badge: pendingCount },
          { id: 'summary', icon: '📊', label: 'Rekap' },
        ].map(n => (
          <button key={n.id} className={`nav-btn ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            {n.badge > 0 && <span className="nav-badge">{n.badge}</span>}
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function ARTDash({ user, onLogout }) {
  const [tab, setTab] = useState('today')
  return (
    <div className="app">
      <TopBar user={user} onLogout={onLogout} />
      {tab === 'today' && <TodayTab user={user} />}
      {tab === 'upload' && <UploadTab user={user} />}
      {tab === 'foto' && <PhotoList isAdmin={false} artId={user.id} />}
      {tab === 'points' && <PointsTab user={user} />}
      <nav className="bottom-nav">
        {[
          { id: 'today', icon: '✅', label: 'Tugas' },
          { id: 'upload', icon: '📷', label: 'Upload' },
          { id: 'foto', icon: '🗂', label: 'Foto' },
          { id: 'points', icon: '💰', label: 'Poin' },
        ].map(n => (
          <button key={n.id} className={`nav-btn ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─────────────────────────────────────────
// Root
// ─────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  if (!user) return <Login onLogin={setUser} />
  if (user.role === 'admin') return <AdminDash user={user} onLogout={() => setUser(null)} />
  return <ARTDash user={user} onLogout={() => setUser(null)} />
}
