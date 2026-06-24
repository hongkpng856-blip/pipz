"""Remove rename functionality from PetCompanion."""
with open('apps/web/src/components/PetCompanion.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove onRename from Props
content = content.replace(
    '  onRename?: (name: string) => void\n',
    ''
)

# 2. Remove onRename from destructured props
content = content.replace(
    '  pet, onFeed, onPet, onPlay, onRename, anim, steps, totalSteps, evolutionStage,\n',
    '  pet, onFeed, onPet, onPlay, anim, steps, totalSteps, evolutionStage,\n'
)

# 3. Remove renaming state
content = content.replace(
    '  const [renaming, setRenaming] = useState(false)\n',
    ''
)

# 4. Remove nameInput state
content = content.replace(
    "  const [nameInput, setNameInput] = useState('')\n",
    ''
)

# 5. Remove submitRename function block
old = (
    '  // ── Rename handler ──\n'
    '  const submitRename = () => {\n'
    '    if (nameInput.trim() && onRename) {\n'
    '      onRename(nameInput.trim())\n'
    '    }\n'
    '    setRenaming(false)\n'
    '  }\n'
    '\n'
)
content = content.replace(old, '')

# 6. Replace the name overlay section (from comment to closing of pet block)
old_overlay_start = '      {/* ── Top overlay: name + info toggle ── */}'
old_overlay_end = '      {/* ── Info overlay ── */}'
start = content.find(old_overlay_start)
end = content.find(old_overlay_end, start)
if start >= 0 and end >= 0:
    new_overlay = (
        '      {/* ── Top overlay: name + info toggle ── */}\n'
        '      {pet && (\n'
        '        <div style={{ position:\'absolute\', top:12, left:12, right:12, display:\'flex\', alignItems:\'center\', gap:8 }}>\n'
        '          <div style={{ background:\'rgba(0,0,0,0.5)\', border:\'1px solid rgba(255,255,255,0.1)\', borderRadius:10,\n'
        '            color:\'#f0f4f8\', fontSize:14, fontWeight:700, padding:\'4px 12px\',\n'
        '            fontFamily:\'inherit\', backdropFilter:\'blur(4px)\', display:\'flex\', alignItems:\'center\', gap:6 }}>\n'
        '            {pet.name || \'未命名\'}\n'
        '            <span style={{ fontSize:8, fontWeight:400, color:\'#5a6d85\', marginLeft:4 }}>#{speciesName}</span>\n'
        '          </div>\n'
        '\n'
        '          <div style={{ flex:1 }} />\n'
        '\n'
        '          <button onClick={() => setShowInfo(!showInfo)}\n'
        '            style={{ background:\'rgba(0,0,0,0.5)\', border:\'1px solid rgba(255,255,255,0.1)\', borderRadius:10,\n'
        '              color:\'#94a5b8\', fontSize:10, padding:\'4px 10px\', cursor:\'pointer\', fontFamily:\'inherit\',\n'
        '              backdropFilter:\'blur(4px)\', display:\'flex\', alignItems:\'center\', gap:4 }}>\n'
        '            📊 {showInfo ? \'隱藏\' : \'詳情\'}\n'
        '          </button>\n'
        '        </div>\n'
        '      )}'
    )
    content = content[:start] + new_overlay + content[end:]
    print('✅ Replaced name overlay')
else:
    print(f'❌ Overlay not found: start={start}, end={end}')

with open('apps/web/src/components/PetCompanion.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ PetCompanion updated')
