#!/usr/bin/env python3
"""Remove walking + rename functionality from page.tsx — fixed version."""
import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# 1. WalkingCanvas import
c = re.sub(r"^import WalkingCanvas from .*\n", "", c, flags=re.MULTILINE)
changes.append("WalkingCanvas import")

# 2. Encounter imports  
c = c.replace("ENCOUNTER_INTERVAL, rollEncounter, ", "")
changes.append("encounter imports")

# 3. Walking state vars
for line in [
    '  const [walking, setWalking] = useState(false)',
    "  const [camState, setCamState] = useState<'idle'|'walk'|'encounter'>('idle')",
    '  const [walkSpeed, setWalkSpeed] = useState(0)',
    '  const [showEncounterEgg, setShowEncounterEgg] = useState(false)',
    '  const [encounterEggRarity, setEncounterEggRarity] = useState<Rarity | null>(null)',
]:
    c = c.replace(line + '\n', '')
changes.append("walking states")

# 4. Walking refs
for line in [
    '  const wid = useRef<number|null>(null)',
    '  const last = useRef<{lat:number;lng:number}|null>(null)',
    '  const encCnt = useRef(0)',
    '  const pity = useRef<Record<string,number>>({legendary:0,epic:0})',
    '  const pendingBuffer = useRef(0) // steps queued during encounter',
    '  const camStateRef = useRef(camState)',
    '  camStateRef.current = camState',
    '  const lastEggRarityRef = useRef<Rarity | null>(null)',
]:
    c = c.replace(line + '\n', '')
changes.append("walking refs")

# 5. Stale GPS comment
c = c.replace('  // Refs for current values used in GPS callback (avoids stale closures)\n', '')
changes.append("GPS comment")

# 6. walkStart/walkStop
start = c.find('  const walkStart = () => {')
end = c.find('\n  // ── Pet spawn ──')
if start >= 0 and end >= 0:
    c = c[:start] + c[end:]
    changes.append("walkStart/walkStop")
else:
    changes.append("FAIL walkStart/walkStop")

# 7. Remove renamePet — search for the marker AFTER playAction
start = c.find('  // ── Rename pet ──')
# find the function right AFTER renamePet (hatch)
end = c.find('\n  const hatch = () => {', start)
if start >= 0 and end >= 0:
    c = c[:start] + c[end:]
    changes.append("renamePet")
else:
    changes.append("FAIL renamePet")

# 8. Encounter step queuing in addSt
old = '''    // Don't count steps during encounter animation — queue them instead
    if (camStateRef.current === 'encounter') {
      pendingBuffer.current += n
      return
    }

'''
if old in c:
    c = c.replace(old, '')
    changes.append("encounter step queuing")
else:
    changes.append("FAIL encounter step queuing")

# 9. Encounter counter/roll
old = '''    encCnt.current += n
    pity.current.legendary += n
    pity.current.epic += n
    if (encCnt.current >= ENCOUNTER_INTERVAL && !skipEncounter) {
      const r = rollEncounter(encCnt.current, pity.current)
      if (r) {
        encCnt.current = 0
        if (r === Rarity.Legendary) pity.current.legendary = 0
        if (r === Rarity.Epic) pity.current.epic = 0
        // Store rarity for the encounter — don't spawn pet yet
        setEncounterEggRarity(r)
        setCamState('encounter')
        logMsg(`🥚 發現 ${RARITY_LABELS[r]} 蛋！`)
        if (curUser) createNotification(curUser.id, 'egg_encounter', '🥚 發現新蛋！', `行路途中發現咗 ${RARITY_LABELS[r]}蛋！快啲去收咗佢`)
        if (curUser) setNotifUnread(n => n + 1)
      }
    }
'''
if old in c:
    c = c.replace(old, '')
    changes.append("encounter counter/roll")
else:
    changes.append("FAIL encounter counter/roll")

# 10. GPS cleanup effect
c = c.replace("  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])\n", '')
changes.append("GPS cleanup")

# 11. Clean skipEncounter param
c = c.replace('const addSt = (n: number, skipEncounter = false)', 'const addSt = (n: number)')
changes.append("skipEncounter param")

# 12. Remove walk button block — include the full <button tag
old = '''            <button
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
'''
if old in c:
    c = c.replace(old, '')
    changes.append("walk button block")
else:
    # Try to find it - maybe indentation differs
    changes.append("FAIL walk button — trying alt approach")
    # Find the onClick line first, then find the <button before it
    idx = c.find('onClick={walking ? walkStop : walkStart}')
    if idx >= 0:
        # Find the <button that starts this block
        btn_start = c.rfind('<button', 0, idx)
        if btn_start >= 0:
            # Find where the GPS section ends (before {user ? ()
            gps_end = c.find('{user ? (', btn_start)
            end_of_block = c.find('\n', gps_end) if gps_end >= 0 else -1
            if end_of_block >= 0:
                c = c[:btn_start-1] + c[end_of_block:]
                changes.append("walk button (alt)")

# 13. Simplify map tab
# Find the walking conditional start and the stats card start
start = c.find('{/* ── When walking: show WalkingCanvas ── */}')
end = c.find('{/* 📊 Stats Card')
if start >= 0 and end >= 0:
    new_section = '''                {/* ── PetCompanion card ── */}
                <div className="section card" style={{
                  padding:0, overflow:'hidden', position:'relative', width:'100%',
                }}>
                  <PetCompanion
                    pet={pet}
                    onFeed={feed}
                    onPet={petAction}
                    onPlay={playAction}
                    anim={petAnim}
                    steps={steps}
                    totalSteps={totalSteps}
                    evolutionStage={pet?.evolutionStage ?? 1}
                  />
                </div>'''
    c = c[:start] + new_section + c[end:]
    changes.append("map tab simplified")
else:
    changes.append(f"FAIL map tab: start={start}, end={end}")

# 14. Encounter egg modal
start = c.find('{/* ════ Encounter Egg Popup ════ */}')
end = c.find('{/* ════ New Pet Popup')
if start >= 0 and end >= 0:
    c = c[:start] + c[end:]
    changes.append("encounter egg modal")
else:
    changes.append(f"FAIL encounter egg: start={start}, end={end}")

# 15. haversine function
start = c.find('\nfunction haversine(')
if start >= 0:
    func_end = c.find('\n}\n', start) + 3
    if func_end >= 3:
        c = c[:start] + c[func_end:]
        changes.append("haversine")
    else:
        changes.append("FAIL haversine end")
else:
    changes.append("FAIL haversine")

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Changes applied:")
for ch in changes:
    print(f"  {'✅' if not ch.startswith('FAIL') else '❌'} {ch}")
