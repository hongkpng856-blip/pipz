#!/usr/bin/env python3
"""Fix: remove walk button line and the empty button tag left behind"""
import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# The issue: <button on its own line before onClick was not removed.
# Find the full walk button block and remove it
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
    print("✅ Removed full walk button block")
else:
    print("❌ Walk button block not found - checking alternatives")
    # Try without trailing space
    for variant in ['            <button\n              onClick={walking ? walkStop : walkStart}', 
                     '            <button\r\n              onClick={walking ? walkStop : walkStart}']:
        if variant in c:
            print(f"  Found variant: {variant[:50]}...")

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("Done")
