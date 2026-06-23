#!/usr/bin/env python3
"""Generate 50 PICO-8 pixel art sprites via Pollinations.ai"""
import os, sys, urllib.request, urllib.parse, time, json

# Add pixel-art skill
skill_dir = os.path.expanduser("~/AppData/Local/hermes/skills/creative/pixel-art/scripts")
sys.path.insert(0, skill_dir)
from pixel_art import pixel_art

tmp = os.environ.get('TEMP', '/tmp')
sprites_dir = os.path.expanduser('~/Desktop/Pipz/apps/web/public/pixel-gen/sprites')
os.makedirs(sprites_dir, exist_ok=True)

species = [
    'orange cat', 'brown puppy dog', 'white bunny rabbit', 'brown bear cub', 'red fox',
    'blue bird', 'penguin', 'blue dragon', 'green alien', 'grey robot',
    'white ghost', 'green slime', 'green dinosaur', 'brown owl', 'green sea turtle',
    'blue whale', 'black bat', 'green snake', 'brown monkey', 'brown deer',
    'panda', 'brown sloth', 'yellow lion', 'orange tiger', 'white unicorn',
    'pink octopus', 'blue jellyfish', 'colorful butterfly', 'yellow bee', 'green frog',
    'orange phoenix', 'pink fairy', 'green cactus', 'pink flower', 'brown tree ent',
    'blue crystal', 'white cloud', 'red crab', 'orange starfish', 'red ladybug',
    'white yeti', 'green goblin', 'orange pumpkin', 'red devil', 'white angel',
    'brown hedgehog', 'blue shark', 'grey mouse', 'white egg', 'golden cat',
]

log_file = os.path.join(tmp, 'gen_log.txt')

def log(msg):
    with open(log_file, 'a') as f:
        f.write(f'{time.strftime("%H:%M:%S")} {msg}\n')
    print(msg)

success = 0
failed = 0

for idx in range(50):
    out_path = os.path.join(sprites_dir, f'{idx}.png')
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        success += 1
        continue
    
    name = species[idx]
    prompt = f"pixel art sprite of a cute {name}, game character, front view, pico-8 retro game style, 16 colors, pixel art, white background, 32x32"
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}"
    raw_path = os.path.join(tmp, f'sp_{idx}.png')
    
    try:
        log(f'[{idx}] {name}...')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as resp:
            with open(raw_path, 'wb') as f:
                f.write(resp.read())
        
        raw_sz = os.path.getsize(raw_path)
        if raw_sz < 100:
            log(f'  TOO SMALL ({raw_sz}B), retry')
            time.sleep(2)
            continue
        
        pixel_art(raw_path, out_path, preset='pico8')
        pico_sz = os.path.getsize(out_path)
        success += 1
        log(f'  ✓ {raw_sz}→{pico_sz}B ({success}/50)')
        time.sleep(2)
    except Exception as e:
        failed += 1
        log(f'  ✗ {e}')
        time.sleep(3)

log(f'\nDONE: {success} success, {failed} failed')
