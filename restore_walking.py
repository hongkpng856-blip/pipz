#!/usr/bin/env python3
"""Restore GPS walking function but keep encounter/WalkingCanvas removed."""
with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# 1. Add walking state after activeIdx
old = "  const [activeIdx, setActiveIdx] = useState(0)\n  const [showEgg, setShowEgg] = useState(false)"
new = "  const [activeIdx, setActiveIdx] = useState(0)\n  const [walking, setWalking] = useState(false)\n  const [showEgg, setShowEgg] = useState(false)"
if old in c:
    c = c.replace(old, new, 1)
    changes.append("restored walking state")
else:
    changes.append("FAIL walking state")

# 2. Add wid/last refs before loadedUser
old = "  const loadedUser = useRef<string|null>(null)"
new = "  const wid = useRef<number|null>(null)\n  const last = useRef<{lat:number;lng:number}|null>(null)\n  const loadedUser = useRef<string|null>(null)"
if old in c:
    c = c.replace(old, new, 1)
    changes.append("restored GPS refs")
else:
    changes.append("FAIL GPS refs")

# 3. Add walkStart/walkStop (simplified, no encounter logic) before spawnPet
old = "  const spawnPet = async (r: Rarity) => {"
new = """  const walkStart = () => {
    if (!navigator.geolocation) return logMsg('❌ 唔支援 GPS')
    setWalking(true); setPetAnim('walk'); logMsg('🚶 開始行路！')
    wid.current = navigator.geolocation.watchPosition(
      pos => {
        if (pos.coords.accuracy > 100) return
        if (last.current) {
          const d = haversine(last.current.lat, last.current.lng, pos.coords.latitude, pos.coords.longitude)
          const ns = Math.floor(d * 1300)
          if (ns > 0) addSt(ns)
        }
        last.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => { setWalking(false); setPetAnim('idle') },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }
  const walkStop = () => {
    if (wid.current !== null) navigator.geolocation.clearWatch(wid.current)
    wid.current = null; setWalking(false); setPetAnim('idle'); logMsg('⏹ 停低咗')
  }

  const spawnPet = async (r: Rarity) => {"""
if old in c:
    c = c.replace(old, new, 1)
    changes.append("restored walkStart/walkStop")
else:
    changes.append("FAIL walkStart/walkStop")

# 4. Add GPS cleanup effect (before hatch, find a good anchor)
old = "  // ── Hatch an egg from inventory ──"
new = """  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])

  // ── Hatch an egg from inventory ──"""
if old in c:
    c = c.replace(old, new, 1)
    changes.append("restored GPS cleanup")
else:
    changes.append("FAIL GPS cleanup")

# 5. Add haversine function at end of file (before the final content)
# Find the last line
# Let's just append it before the last newline
old = "function haversine"
if old not in c:
    # Append haversine at the very end
    haversine = """
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}"""
    c = c + haversine
    changes.append("restored haversine")
else:
    changes.append("haverine already exists")

# 6. Add walk button in header (after syncing indicator, before {user ? ())
old = "            {syncing && <span style={{fontSize:10, color:'#5a6d85'}}>⏳</span>}\n            {user ? ("
new = """            {syncing && <span style={{fontSize:10, color:'#5a6d85'}}>⏳</span>}
            <button
              onClick={walking ? walkStop : walkStart}
              style={{
                background: walking ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                border: walking ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(34,197,94,0.3)',
                cursor:'pointer', color: walking ? '#ef4444' : '#22c55e',
                fontSize: 16, padding: '2px 6px', borderRadius: 10,
                fontFamily:'inherit', lineHeight:1,
              }}>
              {walking ? '⏹' : '🚶'}
            </button>
            {walking && (
              <span className="header-gps">
                <span className="gps-dot" />GPS
              </span>
            )}
            {user ? ("""
if old in c:
    c = c.replace(old, new, 1)
    changes.append("restored walk button")
else:
    changes.append("FAIL walk button")

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Changes:")
for ch in changes:
    print(f"  {'✅' if not ch.startswith('FAIL') else '❌'} {ch}")
