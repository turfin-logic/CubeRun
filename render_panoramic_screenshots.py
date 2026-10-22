import os
import shutil
import base64
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(ROOT_DIR, "store_assets", "raw")
REPO_OUTPUT_DIR = os.path.join(ROOT_DIR, "store_assets", "PANORAMA_EDITION")
DESKTOP_OUTPUT_DIR = r"C:\Users\pc\OneDrive\Desktop\CubeRun_Screenshots\PANORAMA_EDITION"
APK_OUTPUT_DIR = r"D:\Projects\NeonDriftAPK\PlayStore_Assets\PANORAMA_EDITION"

# Fallback to local desktop if raw_dir in repo is missing
if not os.path.exists(RAW_DIR):
    RAW_DIR = r"C:\Users\pc\OneDrive\Desktop\CubeRun_Raw_Screenshots"

os.makedirs(REPO_OUTPUT_DIR, exist_ok=True)
if os.path.exists(os.path.dirname(DESKTOP_OUTPUT_DIR)):
    os.makedirs(DESKTOP_OUTPUT_DIR, exist_ok=True)
if os.path.exists(os.path.dirname(APK_OUTPUT_DIR)):
    os.makedirs(APK_OUTPUT_DIR, exist_ok=True)

def to_base64(path):
    with open(path, "rb") as f:
        return f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"

img_classic = to_base64(os.path.join(RAW_DIR, "real_action_classic.png"))
img_lasers = to_base64(os.path.join(RAW_DIR, "real_action_laser.png"))
img_topdown = to_base64(os.path.join(RAW_DIR, "real_action_topdown.png"))
img_events = to_base64(os.path.join(RAW_DIR, "raw_screenshot_4_events.png"))
img_menu = to_base64(os.path.join(RAW_DIR, "raw_screenshot_5_menu.png"))

# Create landscape crop of gameplay for the horizontal phone
img_landscape_raw = Image.open(os.path.join(RAW_DIR, "real_action_laser.png"))
img_landscape = img_landscape_raw.rotate(-90, expand=True)
landscape_tmp_path = os.path.join(REPO_OUTPUT_DIR, "temp_landscape.png")
img_landscape.save(landscape_tmp_path)
img_landscape_b64 = to_base64(landscape_tmp_path)

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Orbitron:wght@700;900&display=swap');

* {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}}

body {{
    width: 5400px;
    height: 1920px;
    background: #07090e;
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #f1f5f9;
    overflow: hidden;
    position: relative;
}}

.bg-svg {{
    position: absolute;
    top: 0;
    left: 0;
    width: 5400px;
    height: 1920px;
    z-index: 1;
    pointer-events: none;
}}

.glow-orb {{
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    z-index: 2;
    pointer-events: none;
}}

.orb-1 {{
    width: 900px; height: 900px; top: 500px; left: 450px;
    background: radial-gradient(circle, rgba(0, 243, 255, 0.18) 0%, transparent 70%);
}}

.orb-2 {{
    width: 1400px; height: 900px; top: 500px; left: 1700px;
    background: radial-gradient(circle, rgba(255, 0, 96, 0.16) 0%, rgba(112, 0, 255, 0.12) 50%, transparent 70%);
}}

.orb-3 {{
    width: 900px; height: 900px; top: 500px; left: 3450px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
}}

.orb-4 {{
    width: 900px; height: 900px; top: 500px; left: 4500px;
    background: radial-gradient(circle, rgba(250, 204, 21, 0.16) 0%, transparent 70%);
}}

.slide-divider {{
    position: absolute;
    top: 0; bottom: 0; width: 1px;
    background: rgba(255, 255, 255, 0.04);
    z-index: 50;
}}

.content-layer {{
    position: absolute;
    top: 0; left: 0; width: 5400px; height: 1920px;
    z-index: 10;
}}

.text-block {{
    position: absolute;
    z-index: 20;
}}

.pre-badge {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 19px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #00f3ff;
    margin-bottom: 20px;
    background: rgba(0, 243, 255, 0.08);
    padding: 8px 20px;
    border-radius: 40px;
    border: 1px solid rgba(0, 243, 255, 0.25);
}}

.pre-badge.pink {{
    color: #ff0060;
    background: rgba(255, 0, 96, 0.08);
    border-color: rgba(255, 0, 96, 0.25);
}}

.pre-badge.purple {{
    color: #c084fc;
    background: rgba(192, 132, 252, 0.08);
    border-color: rgba(192, 132, 252, 0.25);
}}

.pre-badge.gold {{
    color: #facc15;
    background: rgba(250, 204, 21, 0.08);
    border-color: rgba(250, 204, 21, 0.25);
}}

.headline {{
    font-size: 76px;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -2px;
    color: #f8fafc;
}}

.headline span {{
    color: #94a3b8;
    font-weight: 500;
}}

.phone-mockup {{
    position: absolute;
    background: #000;
    border-radius: 64px;
    padding: 16px;
    box-shadow: 
        0 40px 100px -20px rgba(0, 0, 0, 0.95),
        0 0 0 1px rgba(255, 255, 255, 0.12),
        0 0 40px rgba(255, 255, 255, 0.04);
    z-index: 15;
}}

.phone-screen {{
    width: 100%;
    height: 100%;
    border-radius: 50px;
    overflow: hidden;
    position: relative;
    background: #000;
}}

.phone-screen img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}}

.dynamic-island {{
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 32px;
    background: #000;
    border-radius: 20px;
    z-index: 30;
    border: 1px solid rgba(255, 255, 255, 0.08);
}}

.phone-shot-1 {{
    width: 660px; height: 1420px; top: 360px; left: 480px;
    transform: perspective(1800px) rotateY(-8deg) rotateX(4deg);
    box-shadow: 25px 45px 90px rgba(0,0,0,0.9), 0 0 50px rgba(0,243,255,0.18), 0 0 0 2px rgba(255,255,255,0.14);
}}

.phone-landscape-split {{
    width: 1680px; height: 820px; top: 540px; left: 1320px;
    border-radius: 54px; padding: 14px;
    transform: perspective(1600px) rotateY(-3deg) rotateX(3deg);
    box-shadow: 0 50px 120px rgba(0,0,0,0.95), 0 0 60px rgba(255,0,96,0.2), 0 0 0 2px rgba(255,255,255,0.15);
}}

.phone-landscape-split .phone-screen {{ border-radius: 42px; }}
.phone-landscape-split .dynamic-island {{
    top: 50%; left: 28px; transform: translateY(-50%);
    width: 32px; height: 120px;
}}

.phone-shot-4 {{
    width: 660px; height: 1420px; top: 360px; left: 3550px;
    transform: perspective(1800px) rotateY(-6deg) rotateX(4deg);
    box-shadow: 20px 45px 90px rgba(0,0,0,0.9), 0 0 60px rgba(168,85,247,0.25), 0 0 0 2px rgba(255,255,255,0.14);
}}

.phone-shot-5 {{
    width: 660px; height: 1420px; top: 360px; left: 4580px;
    transform: perspective(1800px) rotateY(-8deg) rotateX(4deg);
    box-shadow: 25px 45px 90px rgba(0,0,0,0.9), 0 0 60px rgba(250,204,21,0.2), 0 0 0 2px rgba(255,255,255,0.14);
}}

.floating-pill {{
    position: absolute;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 14px 26px;
    border-radius: 50px;
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 25;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
}}

.pill-1 {{ top: 960px; left: 260px; color: #00f3ff; border-color: rgba(0,243,255,0.4); }}
.pill-split-left {{ top: 1420px; left: 1480px; color: #ff0060; border-color: rgba(255,0,96,0.4); }}
.pill-split-right {{ top: 420px; left: 2720px; color: #00f3ff; border-color: rgba(0,243,255,0.4); }}
.pill-event {{ top: 1100px; left: 3340px; color: #c084fc; border-color: rgba(192,132,252,0.4); }}
.pill-rank {{ top: 1040px; left: 4360px; color: #facc15; border-color: rgba(250,204,21,0.4); }}
</style>
</head>
<body>

<div class="glow-orb orb-1"></div>
<div class="glow-orb orb-2"></div>
<div class="glow-orb orb-3"></div>
<div class="glow-orb orb-4"></div>

<svg class="bg-svg" viewBox="0 0 5400 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="2700" cy="1920" rx="2600" ry="1200" stroke="rgba(255, 255, 255, 0.04)" stroke-width="2"/>
    <ellipse cx="2700" cy="1920" rx="2200" ry="1000" stroke="rgba(255, 255, 255, 0.05)" stroke-width="2"/>
    <ellipse cx="2700" cy="1920" rx="1800" ry="800" stroke="rgba(0, 243, 255, 0.08)" stroke-width="2.5" stroke-dasharray="16 16"/>
    <ellipse cx="2700" cy="1920" rx="1400" ry="600" stroke="rgba(255, 255, 255, 0.04)" stroke-width="2"/>
    <ellipse cx="2700" cy="1920" rx="1000" ry="420" stroke="rgba(255, 0, 96, 0.06)" stroke-width="2"/>

    <ellipse cx="2160" cy="0" rx="2100" ry="900" stroke="rgba(255, 255, 255, 0.04)" stroke-width="2"/>
    <ellipse cx="2160" cy="0" rx="1600" ry="700" stroke="rgba(112, 0, 255, 0.07)" stroke-width="2.5" stroke-dasharray="12 12"/>
    <ellipse cx="2160" cy="0" rx="1100" ry="500" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1.5"/>
</svg>

<div class="slide-divider" style="left: 1080px;"></div>
<div class="slide-divider" style="left: 2160px;"></div>
<div class="slide-divider" style="left: 3240px;"></div>
<div class="slide-divider" style="left: 4320px;"></div>

<div class="content-layer">
    <!-- SLIDE 1: MODE 1 (CLASSIC) -->
    <div class="text-block" style="top: 150px; left: 100px; max-width: 880px;">
        <div class="pre-badge">⚡ MODE 1: CLASSIC FLIP</div>
        <h1 class="headline">Defy gravity.<br><span>Dodge the void.</span></h1>
    </div>
    <div class="phone-mockup phone-shot-1">
        <div class="dynamic-island"></div>
        <div class="phone-screen"><img src="{img_classic}"></div>
    </div>
    <div class="floating-pill pill-1"><span>🔄</span> ONE-TAP GRAVITY FLIP</div>

    <!-- SLIDE 2 & 3: MODE 2 (LASER GRID) -->
    <div class="text-block" style="top: 150px; left: 1180px; max-width: 880px;">
        <div class="pre-badge pink">🔥 MODE 2: LASER GRID</div>
        <h1 class="headline">Survive the<br><span>laser protocol.</span></h1>
    </div>

    <div class="phone-mockup phone-landscape-split">
        <div class="dynamic-island"></div>
        <div class="phone-screen"><img src="{img_landscape_b64}"></div>
    </div>

    <div class="floating-pill pill-split-left"><span>⚡</span> 16.0× HYPERSPEED</div>

    <div class="text-block" style="top: 1490px; left: 2260px; max-width: 880px;">
        <div class="pre-badge">🎯 PRECISION REFLEXES</div>
        <h1 class="headline">Milliseconds decide<br><span>your survival.</span></h1>
    </div>
    <div class="floating-pill pill-split-right"><span>💥</span> DEADLY LASER MAZE</div>

    <!-- SLIDE 4: MODE 3 (TOP-DOWN BULLET HELL) -->
    <div class="text-block" style="top: 150px; left: 3340px; max-width: 880px;">
        <div class="pre-badge purple">💥 MODE 3: BULLET HELL</div>
        <h1 class="headline">Weave through<br><span>hazard mazes.</span></h1>
    </div>
    <div class="phone-mockup phone-shot-4">
        <div class="dynamic-island"></div>
        <div class="phone-screen"><img src="{img_topdown}"></div>
    </div>
    <div class="floating-pill pill-event"><span>🎯</span> 360° VERTICAL WEAVE</div>

    <!-- SLIDE 5: GLOBAL ARENA (ALL 3 MODES) -->
    <div class="text-block" style="top: 150px; left: 4420px; max-width: 880px;">
        <div class="pre-badge gold">🏆 GLOBAL LEADERBOARD</div>
        <h1 class="headline">Master all 3 modes.<br><span>Claim rank #1.</span></h1>
    </div>
    <div class="phone-mockup phone-shot-5">
        <div class="dynamic-island"></div>
        <div class="phone-screen"><img src="{img_menu}"></div>
    </div>
    <div class="floating-pill pill-rank"><span>👑</span> 3 MODES • GLOBAL RANK</div>
</div>

</body>
</html>
"""

html_path = os.path.join(REPO_OUTPUT_DIR, "panorama.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Launching Playwright...")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 5400, "height": 1920}, device_scale_factor=1)
    page.goto(f"file:///{html_path.replace(os.sep, '/')}")
    page.wait_for_timeout(2000)
    
    full_panorama_path = os.path.join(REPO_OUTPUT_DIR, "panorama_full_5400x1920.png")
    page.screenshot(path=full_panorama_path)
    browser.close()

panorama_img = Image.open(full_panorama_path)
slice_names = [
    "01_defy_gravity_1080x1920.png",
    "02_laser_protocol_1080x1920.png",
    "03_precision_reflexes_1080x1920.png",
    "04_seasonal_events_1080x1920.png",
    "05_global_rank_1080x1920.png"
]

target_dirs = [REPO_OUTPUT_DIR]
if os.path.exists(DESKTOP_OUTPUT_DIR):
    target_dirs.append(DESKTOP_OUTPUT_DIR)
if os.path.exists(APK_OUTPUT_DIR):
    target_dirs.append(APK_OUTPUT_DIR)

for target in target_dirs:
    for i, name in enumerate(slice_names):
        left = i * 1080
        right = left + 1080
        cropped = panorama_img.crop((left, 0, right, 1920))
        cropped.save(os.path.join(target, name), quality=95)
    panorama_img.save(os.path.join(target, "panorama_full_5400x1920.png"))
    
    # Copy feature graphic
    fg_source = os.path.join(RAW_DIR, "feature_graphic_1024x500.png")
    if os.path.exists(fg_source):
        shutil.copy2(fg_source, os.path.join(target, "feature_graphic_1024x500.png"))

if os.path.exists(landscape_tmp_path):
    os.remove(landscape_tmp_path)

print("Finished rendering Store Assets!")
