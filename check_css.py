import re, glob
css_files = glob.glob('apps/web/out/_next/static/css/*.css')
target = '.bg-[#0f172a]'
for f in css_files:
    with open(f, 'r', encoding='utf-8') as fh:
        css = fh.read()
    name = f.split("/")[-1]
    print(f'File: {name}')
    print(f'  Size: {len(css)}')
    bg_count = len(re.findall(r"\.bg-", css))
    print(f'  .bg classes: {bg_count}')
    flex_count = len(re.findall(r"\.flex\b", css))
    print(f'  .flex: {flex_count}')
    grid_count = len(re.findall(r"\.grid\b", css))
    print(f'  .grid: {grid_count}')
    has = target in css
    print(f'  {target}: {"FOUND" if has else "NOT FOUND"}')
    print(f'  Start: {css[:300]}')
