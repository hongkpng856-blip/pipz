"""Final cleanup of page.tsx: remove encounter egg modal, haversine, and stale references."""
with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# 1. Remove encounter egg modal section
start_marker = '      {/* ════ Encounter Egg Popup ════ */}'
end_marker = '      {/* ════ Evolution Modal ════ */}'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)
if start_idx >= 0 and end_idx >= 0:
    block = content[start_idx:end_idx]
    content = content.replace(block, '')
    changes.append('Removed encounter egg modal')
else:
    changes.append(f'SKIP: encounter egg modal - start={start_idx}, end={end_idx}')

# 2. Remove haversine function
start_marker = '\nfunction haversine('
end_marker = '  return Math.atan2'
end_idx_detected = content.find(end_marker, content.find(start_marker))
if start_idx >= 0:
    # Find the full function
    func_start = content.find(start_marker)
    func_end = content.find('\n}\n', func_start) + 3
    if func_start >= 0:
        content = content[:func_start] + content[func_end:]
        changes.append('Removed haversine function')
    else:
        changes.append('SKIP: haversine function end not found')

# 3. Remove stale comment about GPS refs
old = '  // Refs for current values used in GPS callback (avoids stale closures)\n'
if old in content:
    content = content.replace(old, '', 1)
    changes.append('Removed stale GPS comment')

for c in changes:
    print(c)

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
