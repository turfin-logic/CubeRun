// game.js — Neon Drift: Boss Level (Production Build)
// Skill: html5-canvas-mobile-game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─── PERFORMANCE MODE ─────────────────────────────────────────────────────────
// Detect low-end device: few CPU cores OR very high DPR (render stress)
const _lowEnd = (navigator.hardwareConcurrency || 4) <= 2
    || (window.devicePixelRatio > 2.5 && (navigator.hardwareConcurrency || 4) <= 4);
const _MAX_DPR   = _lowEnd ? 1   : 2;   // cap resolution on weak phones
const _BG_COUNT  = _lowEnd ? 15  : 30;  // fewer bg particles on weak phones
const _MAX_OBST  = _lowEnd ? 8   : 15;  // fewer obstacles pooled

// ─── STATE ───────────────────────────────────────────────────────────────────
const STATE = { MENU:'MENU', PLAYING:'PLAYING', PAUSED:'PAUSED', GAMEOVER:'GAMEOVER' };
let GAME_STATE = STATE.MENU;
let score = 0, frameCount = 0, baseSpeed = 5, rafId = null, lastTime = 0;

// ─── GAME MODE ────────────────────────────────────────────────────────────────
const MODE = { CLASSIC: 'classic', TIMETRIAL: 'timetrial' };
let GAME_MODE = MODE.CLASSIC;
const TIME_TRIAL_DURATION = 60; // seconds
let timerSeconds = TIME_TRIAL_DURATION;

// ─── SPRITES & POOLS (Defined early to prevent ReferenceError) ───────────────
const SPRITES = {};

class ObjectPool {
    constructor(createFn, resetFn, size=20) {
        this.createFn=createFn; this.resetFn=resetFn;
        this.pool=[]; this.active=[];
        for(let i=0;i<size;i++) this.pool.push(createFn());
    }
    acquire(...args) {
        const obj=this.pool.length>0?this.pool.pop():this.createFn();
        this.resetFn(obj,...args); this.active.push(obj); return obj;
    }
    release(obj) {
        const i=this.active.indexOf(obj);
        if(i!==-1) this.active.splice(i,1);
        this.pool.push(obj);
    }
    releaseAll() { while(this.active.length) this.release(this.active[0]); }
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
let CEILING, FLOOR;
function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, _MAX_DPR); // cap for low-end
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    CEILING = window.innerHeight * 0.18;
    FLOOR   = window.innerHeight * 0.82;
    initSprites();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── SETTINGS ────────────────────────────────────────────────────────────────
const Settings = {
    sfx: true, music: true, vibration: true,
    load() {
        try { Object.assign(this, JSON.parse(localStorage.getItem('ndSettings') || '{}')); } catch(e){}
        this.syncUI();
    },
    save() { localStorage.setItem('ndSettings', JSON.stringify({sfx:this.sfx, music:this.music, vibration:this.vibration})); },
    toggle(key) { this[key] = !this[key]; this.save(); this.syncUI(); },
    syncUI() {
        ['sfx','music','vibration'].forEach(k => {
            const b = document.querySelector(`[data-key="${k}"]`);
            if (b) { b.textContent = this[k] ? 'ON' : 'OFF'; b.classList.toggle('active', this[k]); }
        });
    }
};
Settings.load();
document.querySelectorAll('.toggle-btn').forEach(b => b.addEventListener('click', () => Settings.toggle(b.dataset.key)));

// ─── SAVE ────────────────────────────────────────────────────────────────────
const SaveData = {
    _k: 'ndSave',
    load() { try { return {...{highScore:0}, ...JSON.parse(localStorage.getItem(this._k)||'{}')}; } catch(e){ return {highScore:0}; }},
    updateHighScore(s) { const d=this.load(); if(s>d.highScore){d.highScore=s;localStorage.setItem(this._k,JSON.stringify(d));return true;} return false; }
};

// ─── SCREEN HELPERS ──────────────────────────────────────────────────────────
function showScreen(id) { document.getElementById(id).classList.add('active'); }
function hideScreen(id) { document.getElementById(id).classList.remove('active'); }
function hideAllScreens() { document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); }
function showHUD() { document.getElementById('hud').classList.add('active'); }
function hideHUD() { document.getElementById('hud').classList.remove('active'); }

// ─── AUDIO ───────────────────────────────────────────────────────────────────
let audioCtx = null;
let droneOscs = [];

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playSfx(type) {
    if (!Settings.sfx) return;
    const ac = getAudio();
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    const c = { jump:{f:150,ef:40,d:0.3,w:'sine'}, death:{f:300,ef:60,d:0.5,w:'sawtooth'}, score:{f:880,ef:880,d:0.05,w:'sine'}, nearmiss:{f:800,ef:1200,d:0.3,w:'triangle'} }[type] || {f:440,ef:440,d:0.1,w:'sine'};
    osc.type = c.w;
    osc.frequency.setValueAtTime(c.f, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(c.ef, ac.currentTime + c.d);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + c.d);
    osc.start(); osc.stop(ac.currentTime + c.d);
}

function playCrash() {
    if (!Settings.sfx) return;
    const ac = getAudio();
    const buf = ac.createBuffer(1, ac.sampleRate*0.5, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const flt = ac.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=1000;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.5);
    src.connect(flt); flt.connect(gain); gain.connect(ac.destination); src.start();
}

function playCreepyMelody() {
    if (!Settings.sfx) return;
    const ac = getAudio(), now = ac.currentTime;
    [{f:783.99,t:0},{f:783.99,t:0.3},{f:622.25,t:0.6}].forEach(n => {
        const osc=ac.createOscillator(), gain=ac.createGain();
        osc.type='triangle'; osc.frequency.setValueAtTime(n.f,now+n.t);
        gain.gain.setValueAtTime(0,now+n.t); gain.gain.linearRampToValueAtTime(0.25,now+n.t+0.05); gain.gain.exponentialRampToValueAtTime(0.001,now+n.t+0.5);
        osc.connect(gain); gain.connect(ac.destination); osc.start(now+n.t); osc.stop(now+n.t+0.5);
    });
}

function startDrone() {
    if (!Settings.music || droneOscs.length > 0) return;
    const ac = getAudio();
    [40,43,60.5].forEach(f => {
        const osc=ac.createOscillator(), gain=ac.createGain();
        osc.type='sine'; osc.frequency.value=f; gain.gain.value=0.04;
        osc.connect(gain); gain.connect(ac.destination); osc.start();
        droneOscs.push({osc,gain});
    });
    // Ghostly wind
    const bufSize = ac.sampleRate*2, buf=ac.createBuffer(1,bufSize,ac.sampleRate), data=buf.getChannelData(0);
    for(let i=0;i<bufSize;i++) data[i]=Math.random()*2-1;
    const noise=ac.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const flt=ac.createBiquadFilter(); flt.type='bandpass'; flt.frequency.value=500; flt.Q.value=10;
    const wGain=ac.createGain(); wGain.gain.value=0.015;
    const lfo=ac.createOscillator(), lfoGain=ac.createGain();
    lfo.type='sine'; lfo.frequency.value=0.2; lfoGain.gain.value=250;
    lfo.connect(lfoGain); lfoGain.connect(flt.frequency);
    noise.connect(flt); flt.connect(wGain); wGain.connect(ac.destination);
    noise.start(); lfo.start();
    droneOscs.push({osc:noise,gain:wGain},{osc:lfo,gain:lfoGain});
}

function stopDrone() {
    droneOscs.forEach(d => { try { d.osc.stop(); } catch(e){} });
    droneOscs = [];
}

function vibrate(p=[50]) { if(Settings.vibration && navigator.vibrate) navigator.vibrate(p); }

// ─── OFF-SCREEN SPRITES (Glow, pre-rendered once) ────────────────────────────
function createGlowSprite(color, w, h, glow=15) {
    const pad = glow*2, oc=document.createElement('canvas');
    oc.width=w+pad; oc.height=h+pad;
    const octx=oc.getContext('2d');
    octx.shadowColor=color; octx.shadowBlur=glow; octx.fillStyle=color;
    octx.fillRect(glow,glow,w,h);
    octx.shadowBlur=0; octx.fillStyle='rgba(255,255,255,0.55)';
    octx.fillRect(glow+w*0.25, glow+h*0.25, w*0.5, h*0.5);
    return oc;
}
function createGlowCircle(color, r, glow=6) {
    const size=(r+glow)*2, oc=document.createElement('canvas');
    oc.width=size; oc.height=size;
    const octx=oc.getContext('2d');
    octx.shadowColor=color; octx.shadowBlur=glow; octx.fillStyle=color;
    octx.beginPath(); octx.arc(size/2,size/2,r,0,Math.PI*2); octx.fill();
    return oc;
}
function initSprites() {
    SPRITES.player   = createGlowSprite('#ff003c',30,30,20);
    SPRITES.obsRed   = createGlowSprite('#ff003c',60,80,15);
    SPRITES.obsMag   = createGlowSprite('#ff00ff',60,80,15);
    SPRITES.partRed  = createGlowCircle('#ff003c',2,6);
    SPRITES.partPurp = createGlowCircle('#7000ff',2,6);
    SPRITES.bgDot1   = createGlowCircle('#ff003c',1,3);
    SPRITES.bgDot2   = createGlowCircle('#7000ff',1,3);
}

// ─── OBJECT POOLS ────────────────────────────────────────────────────────────

// Obstacle pool
const obstaclePool = new ObjectPool(
    () => ({x:0,y:0,width:0,height:0,sprite:null,passed:false}),
    (o) => {
        o.width=40+Math.random()*40; o.height=40+Math.random()*80;
        o.x=window.innerWidth; o.passed=false;
        const top=Math.random()>0.5;
        o.y=top?CEILING:FLOOR-o.height;
        o.sprite=Math.random()>0.5?SPRITES.obsRed:SPRITES.obsMag;
    }, _MAX_OBST  // fewer on low-end devices
);

// Particle pool
const particlePool = new ObjectPool(
    () => ({x:0,y:0,vx:0,vy:0,life:0,maxLife:0,sprite:null}),
    (p,x,y) => {
        p.x=x; p.y=y;
        p.vx=(Math.random()-0.5)*8; p.vy=(Math.random()-0.5)*8;
        p.life=30+Math.random()*20; p.maxLife=p.life;
        p.sprite=Math.random()>0.5?SPRITES.partRed:SPRITES.partPurp;
    }, 60
);

// BG particle pool
const bgParticles = [];
function initBgParticles() {
    bgParticles.length=0;
    for(let i=0;i<_BG_COUNT;i++) bgParticles.push({
        x:Math.random()*window.innerWidth,
        y:Math.random()*window.innerHeight,
        baseVx:-(Math.random()*1.5+0.5),
        vx:0,
        sprite:Math.random()>0.5?SPRITES.bgDot1:SPRITES.bgDot2
    });
    bgParticles.forEach(p=>p.vx=p.baseVx);
}

// ─── PLAYER ──────────────────────────────────────────────────────────────────
const player = {
    x:100, y:0, width:30, height:30,
    gravityDir:1, isSwapping:false, invincible:false,
    trail:[]
};

// ─── FLUTTER BRIDGE ──────────────────────────────────────────────────────────
const FlutterBridge = {
    isFlutter() { return typeof window.AdChannel !== 'undefined'; },
    showInterstitial() {
        if (this.isFlutter()) window.AdChannel.postMessage('showInterstitial');
    },
    // Called by Flutter when reward earned — just SET FLAG, don't revive yet
    // (WebView is still hidden behind ad at this point — RAF won't fire!)
    onRewardGranted() {
        clearTimeout(window._reviveAdTimeout);
        window._pendingRevive = true; // onAdClose will do the actual revive
    },
    // Called by Flutter if ad fails
    onRewardFailed() {
        clearTimeout(window._reviveAdTimeout);
        window._pendingRevive = false;
        const b = document.getElementById('revive-btn');
        if (b) { b.textContent = '\u26a1 REVIVE (WATCH AD)'; b.disabled = false; }
    }
};
window.FlutterBridge = FlutterBridge;

// Browser fallback: 1 free revive per game session
window._browserReviveUsed = false;
window.requestBrowserRevive = function() {
    if (!window._browserReviveUsed) {
        window._browserReviveUsed = true;
        if (typeof revivePlayer === 'function') revivePlayer();
    } else {
        const b = document.getElementById('revive-btn');
        if (b) { b.textContent = '❌ No More Revives'; b.disabled = true; }
    }
};


// ─── GAME LOOP ────────────────────────────────────────────────────────────────
let _loopRunning = false;
let _warmupFrames = 0; // Absorb first few spiky frames

function startGameLoop() {
    if (_loopRunning) return;
    _loopRunning = true;
    _warmupFrames = 3; // Skip first 3 frames' dt to avoid startup spike
    function loop(ts) {
        if(GAME_STATE!==STATE.PLAYING) { _loopRunning = false; return; }
        // During warmup, use fixed dt=1 to avoid first-frame jank
        const rawDt = (ts - lastTime) / 16.67;
        const dt = _warmupFrames > 0 ? (_warmupFrames--, 1) : Math.min(rawDt, 2);
        lastTime = ts;
        update(dt); draw();
        rafId = requestAnimationFrame(loop);
    }
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
}

// ─── AD CLOSE HANDLERS (Multiple fallbacks for Android WebView) ───────────────

// Called by Flutter AFTER ad closes (WebView is visible again — safe to revive!)
window.onAdClose = function() {
    if (window._pendingRevive) {
        window._pendingRevive = false;
        // WebView is now visible — revive and start loop reliably
        if (typeof revivePlayer === 'function') revivePlayer();
    } else if (GAME_STATE === STATE.PLAYING && !_loopRunning) {
        startGameLoop();
    }
};

// Fallback 1: visibilitychange (may not fire on all Android WebViews)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && GAME_STATE === STATE.PLAYING && !_loopRunning) {
        console.log('visibilitychange: restarting game loop.');
        startGameLoop();
    }
});

// Fallback 2: window focus (fires when WebView regains focus after ad)
window.addEventListener('focus', () => {
    if (GAME_STATE === STATE.PLAYING && !_loopRunning) {
        console.log('window.focus: restarting game loop.');
        startGameLoop();
    }
});

// Fallback 3: pageshow (fires on Android when returning to WebView)
window.addEventListener('pageshow', () => {
    if (GAME_STATE === STATE.PLAYING && !_loopRunning) {
        console.log('pageshow: restarting game loop.');
        startGameLoop();
    }
});

function update(dt) {
    frameCount++;
    if(frameCount%600===0) baseSpeed=Math.min(baseSpeed+1,20);

    // Drone speed sync
    if(droneOscs.length>0 && droneOscs[0].gain) {
        const vol=0.04+(baseSpeed*0.004);
        droneOscs.slice(0,3).forEach(d=>{ try{d.gain.gain.setTargetAtTime(vol,audioCtx.currentTime,0.1);}catch(e){}});
    }

    // Chromatic aberration at score > 100
    if(score>100) canvas.classList.add('aberration');
    else canvas.classList.remove('aberration');

    // Random stingers
    if(Math.random()<0.002) playSfx('score');

    // ─── TIME TRIAL COUNTDOWN ─────────────────────────────────────────
    if (GAME_MODE === MODE.TIMETRIAL) {
        timerSeconds -= (dt * 16.67) / 1000; // convert dt units to real seconds
        if (timerSeconds <= 0) {
            timerSeconds = 0;
            updateTimerDisplay();
            gameOver(true); // true = time up
            return;
        }
        updateTimerDisplay();
    }

    // Player gravity swap movement
    if(player.isSwapping) {
        const spd=15*dt;
        player.y+=spd*player.gravityDir;
        if(player.gravityDir===1&&player.y>=FLOOR-player.height){ player.y=FLOOR-player.height; player.isSwapping=false; }
        if(player.gravityDir===-1&&player.y<=CEILING){ player.y=CEILING; player.isSwapping=false; }
    }

    // Trail
    player.trail.push({x:player.x,y:player.y});
    if(player.trail.length>12) player.trail.shift();

    // Spawn obstacles
    const spawnInterval=Math.max(55,150-baseSpeed*5);
    if(frameCount%spawnInterval===0) obstaclePool.acquire();

    // Update obstacles & collisions
    for(let i=obstaclePool.active.length-1;i>=0;i--) {
        const o=obstaclePool.active[i];
        o.x-=baseSpeed*dt;
        if(!player.invincible&&player.x<o.x+o.width&&player.x+player.width>o.x&&player.y<o.y+o.height&&player.y+player.height>o.y){
            gameOver(); return;
        }
        if(!o.passed&&player.x>o.x+o.width){
            o.passed=true;
            const near=(player.y<o.y+o.height+30&&player.y+player.height>o.y-30);
            if(near){ score+=50; updateScoreDisplay(); playSfx('nearmiss'); canvas.classList.add('flash-white'); setTimeout(()=>canvas.classList.remove('flash-white'),200); }
        }
        if(o.x+o.width<0){ obstaclePool.release(o); score+=10; updateScoreDisplay(); }
    }

    // Update particles
    for(let i=particlePool.active.length-1;i>=0;i--) {
        const p=particlePool.active[i];
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
        if(p.life<=0) particlePool.release(p);
    }

    // BG particles
    bgParticles.forEach(p=>{
        p.x+=p.vx*dt-(player.isSwapping?6*dt:0);
        if(p.vx<p.baseVx) p.vx+=0.3*dt;
        if(p.x<0){p.x=window.innerWidth; p.y=Math.random()*window.innerHeight; p.vx=p.baseVx;}
    });
}

function updateScoreDisplay() { document.getElementById('scoreValue').textContent = score; }

function updateTimerDisplay() {
    const secs = Math.ceil(timerSeconds);
    const bar = document.getElementById('timer-bar');
    const label = document.getElementById('timer-label');
    if (!bar || !label) return;
    const pct = (timerSeconds / TIME_TRIAL_DURATION) * 100;
    bar.style.width = pct + '%';
    label.textContent = secs;
    // Turn red when under 10 seconds
    const color = secs <= 10 ? '#ff003c' : '#7000ff';
    bar.style.background = color;
    label.style.color = color;
}

function draw() {
    const W=window.innerWidth, H=window.innerHeight;
    ctx.clearRect(0,0,W,H);

    // Tunnel lines
    ctx.strokeStyle='#333'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,CEILING); ctx.lineTo(W,CEILING);
    ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke();

    // Moving grid - Optimized: One beginPath/stroke instead of looping them
    ctx.strokeStyle='rgba(255,0,60,0.08)'; ctx.lineWidth=1;
    const off=(frameCount*baseSpeed)%50;
    ctx.beginPath();
    for(let i=-off;i<W;i+=50){ ctx.moveTo(i,CEILING); ctx.lineTo(i,FLOOR); }
    ctx.stroke();

    // BG particles
    bgParticles.forEach(p=>ctx.drawImage(p.sprite,Math.floor(p.x-2),Math.floor(p.y-2)));

    // Obstacles
    obstaclePool.active.forEach(o=>{
        if(o.sprite) ctx.drawImage(o.sprite,Math.floor(o.x-15),Math.floor(o.y-15));
        else { ctx.fillStyle='#ff00ff'; ctx.fillRect(o.x,o.y,o.width,o.height); }
    });

    // Player trail - Optimized: fixed alpha to reduce state changes
    ctx.globalAlpha=0.2; ctx.fillStyle='#ff003c';
    for(let i=0;i<player.trail.length;i++) {
        const pt=player.trail[i];
        ctx.fillRect(Math.floor(pt.x),Math.floor(pt.y),player.width,player.height);
    }
    ctx.globalAlpha=1;

    // Particles - Optimized: group by alpha to reduce state changes
    ctx.globalAlpha=0.6;
    particlePool.active.forEach(p=>{
        ctx.drawImage(p.sprite,Math.floor(p.x-4),Math.floor(p.y-4));
    });
    ctx.globalAlpha=1;

    // Player
    if(GAME_STATE===STATE.PLAYING||GAME_STATE===STATE.PAUSED) {
        const spr=SPRITES.player;
        if(spr) ctx.drawImage(spr,Math.floor(player.x-15),Math.floor(player.y-15));
        else { ctx.fillStyle=player.invincible?'#ffffff':'#ff003c'; ctx.fillRect(player.x,player.y,player.width,player.height); }
    }

    // Logo Pulse in Menu
    if(GAME_STATE===STATE.MENU) {
        const pulse = 1 + Math.sin(frameCount * 0.05) * 0.05;
        const logo = document.querySelector('.unified-logo');
        if(logo) logo.style.transform = `scale(${pulse})`;
    }
}

// ─── GAME ACTIONS ─────────────────────────────────────────────────────────────
function swapGravity() {
    if(GAME_STATE!==STATE.PLAYING) return;
    if(!player.isSwapping){
        player.gravityDir*=-1; player.isSwapping=true;
        bgParticles.forEach(p=>p.vx-=10);
        const ex=player.x+player.width/2, ey=player.y+(player.gravityDir===1?0:player.height);
        for(let i=0;i<20;i++) particlePool.acquire(ex,ey);
        playSfx('jump'); vibrate([30]);
    }
}

function pauseGame() {
    if(GAME_STATE!==STATE.PLAYING) return;
    GAME_STATE=STATE.PAUSED;
    cancelAnimationFrame(rafId);
    showScreen('pause-screen');
}

function resumeGame() {
    if(GAME_STATE!==STATE.PAUSED) return;
    hideScreen('pause-screen');
    GAME_STATE=STATE.PLAYING;
    startGameLoop();
}

function quitToMenu() {
    cancelAnimationFrame(rafId);
    stopDrone();
    GAME_STATE=STATE.MENU;
    hideAllScreens(); hideHUD();
    canvas.classList.remove('aberration');
    document.getElementById('game-container').classList.remove('glitch-shake');
    showScreen('start-screen');
}

function createExplosion(x,y) { for(let i=0;i<25;i++) particlePool.acquire(x,y); }

function gameOver(isTimeUp=false) {
    GAME_STATE=STATE.GAMEOVER;
    cancelAnimationFrame(rafId);
    createExplosion(player.x+15,player.y+15);
    playCrash(); playCreepyMelody(); vibrate([100,50,100]);
    draw();
    document.getElementById('game-container').classList.add('glitch-shake');
    canvas.classList.remove('aberration');

    const isNew=SaveData.updateHighScore(score);
    const data=SaveData.load();
    document.getElementById('finalScore').textContent=score;
    document.getElementById('highScore').textContent=data.highScore;
    document.getElementById('new-record-badge').style.display=isNew?'block':'none';

    hideHUD();
    showScreen('game-over-screen');

    // Show TIME UP message if time trial
    const timeUpMsg = document.getElementById('time-up-msg');
    if (timeUpMsg) timeUpMsg.style.display = isTimeUp ? 'block' : 'none';

    // Revive only available in Classic mode (not in Time Trial)
    const reviveBtn = document.getElementById('revive-btn');
    if (GAME_MODE === MODE.CLASSIC) {
        reviveBtn.style.display = 'block';
        reviveBtn.textContent = '🚀 REVIVE (WATCH AD)';
        reviveBtn.disabled = false;
    } else {
        reviveBtn.style.display = 'none';
    }
}

function revivePlayer() {
    hideScreen('game-over-screen');
    // Reset player state
    player.y=FLOOR-player.height; player.gravityDir=1; player.isSwapping=false;
    player.invincible=true;
    obstaclePool.releaseAll();
    document.getElementById('revive-btn').style.display='none';
    document.getElementById('game-container').classList.remove('glitch-shake');
    showHUD();

    // Show 3-2-1 countdown before resuming
    const overlay = document.getElementById('revive-countdown');
    overlay.style.display = 'flex';
    let count = 3;
    overlay.textContent = count;

    const tick = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(tick);
            overlay.style.display = 'none';
            GAME_STATE = STATE.PLAYING;
            _loopRunning = false;
            startGameLoop();
            setTimeout(() => player.invincible = false, 1500);
        } else {
            overlay.textContent = count;
            playSfx('jump'); // tick sound
        }
    }, 1000);

    // Set state to PAUSED during countdown so no accidental input triggers
    GAME_STATE = STATE.PAUSED;
}
window.revivePlayer=revivePlayer;


function resetGame() {
    score=0; frameCount=0; baseSpeed=5;
    player.x=100; player.y=FLOOR-player.height;
    player.gravityDir=1; player.isSwapping=false; player.invincible=false; player.trail=[];
    window._browserReviveUsed = false;
    timerSeconds = TIME_TRIAL_DURATION;
    obstaclePool.releaseAll(); particlePool.releaseAll();
    initBgParticles();
    updateScoreDisplay();
    document.getElementById('game-container').classList.remove('glitch-shake');
    canvas.classList.remove('aberration');
    // Hide timer bar by default (shown only in time trial)
    const wrap = document.getElementById('timer-bar-wrap');
    if (wrap) wrap.style.display = GAME_MODE === MODE.TIMETRIAL ? 'flex' : 'none';
}

function startGame() {
    GAME_MODE = MODE.CLASSIC;
    getAudio();
    resetGame();
    hideAllScreens(); showHUD();
    GAME_STATE=STATE.PLAYING;
    startDrone();
    startGameLoop();
}

function startTimeTrial() {
    GAME_MODE = MODE.TIMETRIAL;
    getAudio();
    resetGame();
    hideAllScreens(); showHUD();
    GAME_STATE=STATE.PLAYING;
    startDrone();
    startGameLoop();
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); swapGravity(); }
    if(e.key==='Escape') pauseGame();
});
window.addEventListener('touchstart', e=>{ if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) swapGravity(); }, {passive:true});
window.addEventListener('mousedown', e=>{ if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) swapGravity(); });

// ─── UI BUTTONS ───────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('timetrial-btn').addEventListener('click', startTimeTrial);
document.getElementById('restart-btn').addEventListener('click', () => GAME_MODE === MODE.TIMETRIAL ? startTimeTrial() : startGame());
document.getElementById('pause-btn').addEventListener('click', pauseGame);
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('quit-btn').addEventListener('click', quitToMenu);

document.getElementById('settings-btn').addEventListener('click', ()=>{
    if(GAME_STATE===STATE.PLAYING) pauseGame();
    showScreen('settings-screen');
});
document.getElementById('settings-from-pause-btn').addEventListener('click', ()=>showScreen('settings-screen'));
document.getElementById('settings-back-btn').addEventListener('click', ()=>{
    hideScreen('settings-screen');
    if(GAME_STATE===STATE.PAUSED) showScreen('pause-screen');
});

// Revive button — clean callback approach, no async/await
document.getElementById('revive-btn').addEventListener('click', () => {
    const btn = document.getElementById('revive-btn');
    btn.disabled = true;
    btn.textContent = '⏳ LOADING...';

    if (FlutterBridge.isFlutter()) {
        // Flutter will call window.FlutterBridge.onRewardGranted() or onRewardFailed()
        // Safety timeout: if no callback in 30s, re-enable button
        window._reviveAdTimeout = setTimeout(() => {
            btn.textContent = '⚡ REVIVE (WATCH AD)';
            btn.disabled = false;
        }, 30000);
        window.AdChannel.postMessage('showRewarded');
    } else {
        // Browser: free revive fallback
        setTimeout(() => window.requestBrowserRevive(), 300);
    }
});

// ─── UTILS ────────────────────────────────────────────────────────────────────
window.pauseGameForAd  = ()=>{ if(GAME_STATE===STATE.PLAYING){ cancelAnimationFrame(rafId); }};
window.resumeGameFromAd= ()=>{ if(GAME_STATE===STATE.PLAYING) startGameLoop(); };

function applyApkMode() {
    if(window.IS_APK===true) {
        document.querySelectorAll('.apk-only').forEach(el=>el.remove());
    }
}
window.addEventListener('load',()=>{ applyApkMode(); setTimeout(applyApkMode,800); });

function shareToWhatsApp() {
    const t=`🔥 I scored ${score} on NEON DRIFT: BOSS LEVEL! 😈 Beat me: https://neon-drift-game-tau.vercel.app/`;
    window.location.href=`https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`;
}
function shareToTelegram() {
    window.location.href=`https://t.me/share/url?url=${encodeURIComponent('https://neon-drift-game-tau.vercel.app/')}&text=${encodeURIComponent(`🔥 I scored ${score} on NEON DRIFT!`)}`;
}
function downloadApk() {
    window.location.href='https://neon-drift-game-tau.vercel.app/neon-drift-boss.apk?v='+Date.now();
}

// --- OFFLINE MODE LOGIC -------------------------------------------------------
let _offlineTimer = null;
function handleOffline() {
    if (!navigator.onLine) {
        // Start 5-second countdown
        _offlineTimer = setTimeout(() => {
            if (!navigator.onLine) {
                if (GAME_STATE === STATE.PLAYING) {
                    cancelAnimationFrame(rafId);
                }
                const offlineScreen = document.getElementById('offline-screen');
                if (offlineScreen) offlineScreen.classList.add('active');
            }
        }, 5000);
    }
}
function handleOnline() {
    if (_offlineTimer) {
        clearTimeout(_offlineTimer);
        _offlineTimer = null;
    }
    const offlineScreen = document.getElementById('offline-screen');
    if (offlineScreen) offlineScreen.classList.remove('active');
    
    // Resume game if we were playing
    if (GAME_STATE === STATE.PLAYING && offlineScreen && !offlineScreen.classList.contains('active')) {
        startGameLoop();
    }
}
window.addEventListener('offline', handleOffline);
window.addEventListener('online', handleOnline);

// Check immediately just in case
if (!navigator.onLine) {
    handleOffline();
}

