"""Clean up page.tsx: remaining removals."""
import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove renamePet block
start_marker = '  // ── Rename pet ──'
start_idx = content.find(start_marker)
if start_idx >= 0:
    # Find the next "const" function after renamePet
    after = content.find('\n  const ', start_idx + 1)
    if after >= 0:
        block = content[start_idx:after]
        content = content.replace(block, '')
        print('1. Removed renamePet')
    else:
        print('1. SKIP - no next const found')
else:
    print('1. SKIP - renamePet not found')

# 2. Remove encounter counter/roll block
start_marker = "    encCnt.current += n"
end_marker = "    }\n  }\n\n  const addDebug"
start_idx = content.find(start_marker)
if start_idx >= 0:
    end_idx = content.find(end_marker, start_idx)
    if end_idx >= 0:
        block = content[start_idx:end_idx + len(end_marker)]
        # Replace with just the closing part
        replacement = "  }\n\n  const addDebug"
        content = content.replace(block, replacement)
        print('2. Removed encounter counter/roll')
    else:
        print('2. SKIP - end marker not found')
else:
    print('2. SKIP - encounter counter not found')

# 3. Remove walk button from header
start_marker = '              onClick={walking ? walkStop : walkStart}'
start_idx = content.find(start_marker)
if start_idx >= 0:
    # Find the line before it (the <button line with its context)
    line_start = content.rfind('\n', 0, start_idx) + 1
    # Find the end of the GPS span
    gps_end_marker = '              )}\n            {user ? ('
    end_idx = content.find(gps_end_marker, start_idx)
    if end_idx >= 0:
        block = content[line_start:end_idx]
        content = content.replace(block, '\n')
        print('3. Removed walk button + GPS')
    else:
        print('3. SKIP - GPS end not found')
else:
    print('3. SKIP - walk button not found')

# 4. Simplify map tab - remove walking conditional, keep PetCompanion only
start_marker = '              {/* ── When walking: show WalkingCanvas ── */}'
start_idx = content.find(start_marker)
if start_idx >= 0:
    # Find the section that follows map tab - could be <!-- 📊 Stats Card -->
    # Actually let's find where the walking conditional ends and stats card begins
    end_marker = '\n              {/* 📊 Stats Card — with weekly bar chart (health app style) */}'
    end_idx = content.find(end_marker, start_idx)
    if end_idx >= 0:
        # Replace the entire walking/walking conditional with just PetCompanion
        new_section = """                {/* ── PetCompanion card ── */}
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
                </div>"""
        content = content[:start_idx] + new_section + content[end_idx:]
        print('4. Simplified map tab to PetCompanion only')
    else:
        print('4. SKIP - stats card end not found')
else:
    print('4. SKIP - walking conditional not found')

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
