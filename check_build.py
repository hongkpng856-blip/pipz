import sys
data = open(sys.argv[1], 'rb').read()
print(f'Size: {len(data)} bytes')
for term in ['map', 'eggs', 'social', 'backdrop', 'animate-fade-in', 'nearby', 'CP ', 'PixelPet', 'fillRect', 'canvas', 'hatchEgg', 'feedPet', '孵化', '餵食', '摸頭', 'stopWalking', 'startWalking', 'setPage', 'drawerOpen']:
    print(f'  {term}: {term.encode() in data}')
