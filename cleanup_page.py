#!/usr/bin/env python3
"""Step 1: Remove imports, state vars, and refs from page.tsx"""
import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove WalkingCanvas import line
c = re.sub(r"^import WalkingCanvas from .*\n", "", c, flags=re.MULTILINE)
print("1. Removed WalkingCanvas import")

# 2. Clean encounter imports
c = c.replace("ENCOUNTER_INTERVAL, rollEncounter, ", "")
print("2. Removed encounter imports")

# 3. Remove walking-related state vars
lines_to_remove = [
    '  const [walking, setWalking] = useState(false)',
    "  const [camState, setCamState] = useState<'idle'|'walk'|'encounter'>('idle')",
    '  const [walkSpeed, setWalkSpeed] = useState(0)',
    '  const [showEncounterEgg, setShowEncounterEgg] = useState(false)',
    '  const [encounterEggRarity, setEncounterEggRarity] = useState<Rarity | null>(null)',
]
for line in lines_to_remove:
    c = c.replace(line + '\n', '')
print("3. Removed walking state vars")

# 4. Remove walking-related refs
refs_to_remove = [
    '  const wid = useRef<number|null>(null)',
    '  const last = useRef<{lat:number;lng:number}|null>(null)',
    '  const encCnt = useRef(0)',
    '  const pity = useRef<Record<string,number>>({legendary:0,epic:0})',
    '  const pendingBuffer = useRef(0) // steps queued during encounter',
    '  const camStateRef = useRef(camState)',
    '  camStateRef.current = camState',
]
for line in refs_to_remove:
    c = c.replace(line + '\n', '')
print("4. Removed walking refs")

# 5. Remove stale comment about GPS refs
c = c.replace('  // Refs for current values used in GPS callback (avoids stale closures)\n', '')
print("5. Removed stale GPS comment")

# 6. Remove walkStart/walkStop functions
# Find the start and end markers
start = c.find('  const walkStart = () => {')
end = c.find('\n  // ── Pet spawn ──')
if start >= 0 and end >= 0:
    c = c[:start] + c[end:]
    print("6. Removed walkStart/walkStop")
else:
    print(f"6. SKIP walkStart: start={start}, end={end}")

# 7. Remove renamePet function
start = c.find('  // ── Rename pet ──')
end = c.find('\n  const playAction = () => {')
if start >= 0 and end >= 0:
    c = c[:start] + c[end:]
    print("7. Removed renamePet")
else:
    print(f"7. SKIP renamePet: start={start}, end={end}")

# 8. Remove encounter step queuing
old = '''    // Don't count steps during encounter animation — queue them instead
    if (camStateRef.current === 'encounter') {
      pendingBuffer.current += n
      return
    }

'''
if old in c:
    c = c.replace(old, '')
    print("8. Removed encounter step queuing")
else:
    print("8. SKIP encounter step queuing")

# 9. Remove encounter counter/roll
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
    print("9. Removed encounter counter/roll")
else:
    print("9. SKIP encounter counter/roll")

# 10. Remove GPS cleanup effect
c = c.replace("  useEffect(() => { return () => { if (wid.current !== null) navigator.geolocation.clearWatch(wid.current) } }, [])\n", '')
print("10. Removed GPS cleanup")

# 11. Clean up skipEncounter param in addSt
c = c.replace('const addSt = (n: number, skipEncounter = false)', 'const addSt = (n: number)')
print("11. Cleaned skipEncounter param")

# 12. Remove walk button from header
start_marker = '              onClick={walking ? walkStop : walkStart}'
start_idx = c.find(start_marker)
end_marker = '            {user ? ('
end_idx = c.find(end_marker, start_idx)

if start_idx >= 0 and end_idx >= 0:
    # Find the line start (the <button line)
    line_start = c.rfind('\n', 0, start_idx)
    block = c[line_start:end_idx]
    c = c.replace(block, '\n')
    print("12. Removed walk button + GPS")
else:
    print("12. SKIP walk button")

# 13. Simplify map tab
start_marker = '              {/* ── When walking: show WalkingCanvas ── */}'
end_marker = '\n              {/* 📊 Stats Card'
start_idx = c.find(start_marker)
end_idx = c.find(end_marker, start_idx)

if start_idx >= 0 and end_idx >= 0:
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
    c = c[:start_idx] + new_section + c[end_idx:]
    print("13. Simplified map tab")
else:
    print(f"13. SKIP map tab: start={start_idx}, end={end_idx}")

# 14. Remove encounter egg modal
start_marker = '      {/* ════ Encounter Egg Popup ════ */}'
end_marker = '      {/* ════ New Pet Popup'
start_idx = c.find(start_marker)
end_idx = c.find(end_marker, start_idx)
if start_idx >= 0 and end_idx >= 0:
    c = c[:start_idx] + c[end_idx:]
    print("14. Removed encounter egg modal")
else:
    print(f"14. SKIP encounter egg modal: start={start_idx}, end={end_idx}")

# 15. Remove haversine function
start_marker = '\nfunction haversine('
start_idx = c.find(start_marker)
if start_idx >= 0:
    func_end = c.find('\n}\n', start_idx) + 3
    if func_end >= 3:
        c = c[:start_idx] + c[func_end:]
        print("15. Removed haversine")
    else:
        print("15. SKIP haversine end")
else:
    print("15. SKIP haversine")

# 16. Remove lastEggRarityRef
c = c.replace('  const lastEggRarityRef = useRef<Rarity | null>(null)\n', '')
print("16. Removed lastEggRarityRef")

# Write
with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("\n✅ All changes applied")
