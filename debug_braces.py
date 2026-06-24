"""Check brace balance in page.tsx ignoring strings."""
import re

with open('apps/web/src/app/page.tsx','r') as f:
    text = f.read()

# Remove all string contents to avoid false positives
# Remove single-quoted strings
text = re.sub(r"'[^']*'", '""', text)
# Remove double-quoted strings
text = re.sub(r'"[^"]*"', '""', text)
# Remove template literals (backtick strings)
text = re.sub(r'`[^`]*`', '``', text)
# Remove comments (// and /* */)
text = re.sub(r'//.*', '', text)
text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)

lines = text.split('\n')
depth = 0
min_depth = 0
min_line = 0

for i, line in enumerate(lines):
    for c in line:
        if c == '{' or c == '(':
            depth += 1
        elif c == '}' or c == ')':
            depth -= 1
    if depth < min_depth:
        min_depth = depth
        min_line = i + 1

print(f'Final depth: {depth}')
print(f'Min depth: {min_depth} at line {min_line}')

# Show last 20 lines
for i in range(len(lines)-20, len(lines)):
    line_d = 0
    for c in lines[i]:
        if c == '{' or c == '(':
            line_d += 1
        elif c == '}' or c == ')':
            line_d -= 1
    if line_d != 0:
        print(f'Line {i+1}: {line_d:+d} | {lines[i][:80]}')
