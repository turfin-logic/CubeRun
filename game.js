// game.js Ã¢â‚¬â€ CUBE RUN (Production Build)
// Skill: html5-canvas-mobile-game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ STATE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const STATE = { MENU:'MENU', PLAYING:'PLAYING', PAUSED:'PAUSED', GAMEOVER:'GAMEOVER' };
let GAME_STATE = STATE.MENU;
let CURRENT_MODE = 'CLASSIC';
let score = 0, frameCount = 0, baseSpeed = 7, rafId = null, lastTime = 0;
let bestScore = 0, runStartedAt = 0, shakeFrames = 0, phaseIndex = 0, phaseFlashUntil = 0;
// ─── INTERSTITIAL POLICY ──────────────────────────────────────────────────
// Natural cadence: every 3rd death OR after a 75s gap — whichever comes first.
// Never shown on runs under 10s, never while Remove Ads is active, and always
// after the game-over screen has settled (natural break, AdMob-policy safe).
const INTERSTITIAL_POLICY = {
    MIN_RUN_MS: 10000,   // runs shorter than this never count toward cadence and never trigger
    DEATHS: 3,           // …AND at least this many qualifying deaths since the last ad
    COOLDOWN_MS: 75000,  // …AND at least this long since the last ad (also the launch grace)
    DELAY_MS: 900        // let the game-over screen settle first
};
let lastInterstitialAt = Date.now(); // launch grace period before the first ad
let deathsSinceInterstitial = 0;
function loadSessionDeathCount() {
    try {
        const count=Number.parseInt(sessionStorage.getItem('cr_session_death_count')||'0',10);
        return Number.isFinite(count)?Math.max(0,count):0;
    } catch(error) {
        console.warn('[CubeRun] Session storage unavailable; death count is not persistent.',error);
        return 0;
    }
}
function saveSessionDeathCount(count) {
    try {
        sessionStorage.setItem('cr_session_death_count',String(count));
    } catch(error) {
        console.warn('[CubeRun] Unable to persist session death count.',error);
    }
}
let sessionDeathCount = loadSessionDeathCount();
let activeRunId = 0, interstitialTimer = null, reviveCountdownInterval = null, reviveCountdownElement = null;
let reviveRequestRunId = null;
let lastTopDownHapticAt = 0, lastTopDownHapticY = 0;
let patternQueue = [], patternTimer = 72, patternIndex = 0, classicLane = 'top';
let floatTexts = [];
const RUN_PHASES = [
    { score: 0, name: 'NEON', title: 'PHASE I: NEON', grid: '#00f3ff', obstacle: '#00f3ff', speed: 1, scoreMultiplier: 1 },
    { score: 50, name: 'OVERDRIVE', title: 'PHASE II: OVERDRIVE', grid: '#b000ff', obstacle: '#b000ff', speed: 1.04, scoreMultiplier: 1.2 },
    { score: 150, name: 'INFERNO', title: 'PHASE III: OVERDRIVE', grid: '#ff003c', obstacle: '#ff003c', speed: 1.08, scoreMultiplier: 1.5 },
    { score: 300, name: 'MATRIX', title: 'PHASE IV: MATRIX', grid: '#00ff66', obstacle: '#00ff66', speed: 1.12, scoreMultiplier: 2 }
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SPRITES & POOLS (Defined early to prevent ReferenceError) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const SPRITES = {};

function getCanvasScale() {
    return Math.min(window.devicePixelRatio || 1, window.IS_APK ? 1.5 : 2);
}

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ LAYOUT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
let CEILING, FLOOR;
// Play-field size in CSS pixels. Always derived from #game-container — NOT
// window.innerWidth — so on desktop (>800px) the canvas matches the visible
// arena and obstacles spawn at the true right edge instead of off-screen.
let VIEW_W = 0, VIEW_H = 0;
let resizeTimer;

function layoutCanvas() {
    const rect = document.getElementById('game-container').getBoundingClientRect();
    VIEW_W = Math.max(1, Math.round(rect.width));
    VIEW_H = Math.max(1, Math.round(rect.height));
    const dpr = getCanvasScale();
    canvas.width  = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    canvas.style.width  = VIEW_W + 'px';
    canvas.style.height = VIEW_H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CEILING = VIEW_H * 0.18;
    FLOOR   = VIEW_H * 0.82;
}

function resizeCanvas() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const previousCeiling=CEILING, previousFloor=FLOOR;
        layoutCanvas();
        const oldRange=Math.max(1,previousFloor-previousCeiling);
        const newRange=FLOOR-CEILING;
        if(CURRENT_MODE==='CLASSIC') {
            const progress=(player.y-previousCeiling)/Math.max(1,oldRange-player.height);
            if(!player.isSwapping) {
                player.y=player.gravityDir===1?FLOOR-player.height:CEILING;
            } else {
                player.y=CEILING+Math.max(0,Math.min(1,progress))*(newRange-player.height);
            }
            obstaclePool.active.forEach(obstacle=>{
                const topDistance=Math.abs(obstacle.y-previousCeiling);
                const bottomDistance=Math.abs(obstacle.y+obstacle.height-previousFloor);
                obstacle.y=topDistance<=bottomDistance?CEILING:FLOOR-obstacle.height;
            });
        } else {
            player.y=Math.max(CEILING,Math.min(FLOOR-player.height,player.y));
            if(player.targetY!==undefined) {
                player.targetY=Math.max(CEILING+player.height/2,Math.min(FLOOR-player.height/2,player.targetY));
            }
            obstaclePool.active.forEach(obstacle=>{
                obstacle.y=CEILING+(obstacle.y-previousCeiling)/oldRange*newRange;
            });
        }
        if(CURRENT_MODE==='LASER') player.y=FLOOR-player.height-60;
        player.trail=[];
        if(typeof initSprites==='function') initSprites();
    }, 100);
}
window.addEventListener('resize', resizeCanvas);
// Call immediately for initial setup
layoutCanvas();
if(typeof initSprites === 'function') initSprites();


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SETTINGS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
            if (b) {
                const enabled = Boolean(this[k]);
                const icon = b.querySelector('img');
                if (icon && b.dataset.iconOn && b.dataset.iconOff) {
                    icon.src = enabled ? b.dataset.iconOn : b.dataset.iconOff;
                    b.setAttribute('aria-label', `${b.dataset.label}: ${enabled ? 'on' : 'off'}`);
                } else {
                    b.textContent = enabled ? 'ON' : 'OFF';
                }
                b.setAttribute('aria-pressed', String(enabled));
                b.classList.toggle('active', enabled);
            }
        });
    }
};
Settings.load();
document.querySelectorAll('.toggle-btn').forEach(b => b.addEventListener('click', () => Settings.toggle(b.dataset.key)));

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SAVE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const SaveData = {
    _k: 'ndSave',
    load() { 
        try { 
            let raw = localStorage.getItem(this._k);
            if (!raw) return {highScore:0};
            try {
                let parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null && parsed.highScore !== undefined) {
                    // Backwards compatibility: re-save as base64
                    localStorage.setItem(this._k, btoa(JSON.stringify(parsed)));
                    return {...{highScore:0}, ...parsed};
                }
            } catch(e) {}
            let decoded = atob(raw);
            return {...{highScore:0}, ...JSON.parse(decoded)};
        } catch(e){ return {highScore:0}; }
    },
    updateHighScore(s) { 
        const d=this.load(); 
        if(s>d.highScore){
            d.highScore=s;
            localStorage.setItem(this._k, btoa(JSON.stringify(d)));
            return true;
        } 
        return false; 
    }
};
bestScore = SaveData.load().highScore;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SCREEN HELPERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function showScreen(id) { document.getElementById(id).classList.add('active'); }
function hideScreen(id) { document.getElementById(id).classList.remove('active'); }
function hideAllScreens() { document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); }
function showHUD() { document.getElementById('hud').classList.add('active'); }
function hideHUD() { document.getElementById('hud').classList.remove('active'); }

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ AUDIO Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

let crashBuffer = null;
function playCrash() {
    if (!Settings.sfx) return;
    const ac = getAudio();
    if (!crashBuffer) {
        crashBuffer = ac.createBuffer(1, ac.sampleRate*0.5, ac.sampleRate);
        const d = crashBuffer.getChannelData(0);
        for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    }
    const src = ac.createBufferSource(); src.buffer = crashBuffer;
    const flt = ac.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=1000;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.5);
    src.connect(flt); flt.connect(gain); gain.connect(ac.destination); src.start();
}

function playCreepyMelody() { return;
    if (!Settings.sfx) return;
    const ac = getAudio(), now = ac.currentTime;
    [{f:783.99,t:0},{f:783.99,t:0.3},{f:622.25,t:0.6}].forEach(n => {
        const osc=ac.createOscillator(), gain=ac.createGain();
        osc.type='triangle'; osc.frequency.setValueAtTime(n.f,now+n.t);
        gain.gain.setValueAtTime(0,now+n.t); gain.gain.linearRampToValueAtTime(0.25,now+n.t+0.05); gain.gain.exponentialRampToValueAtTime(0.001,now+n.t+0.5);
        osc.connect(gain); gain.connect(ac.destination); osc.start(now+n.t); osc.stop(now+n.t+0.5);
    });
}

function startDrone() { return;
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

function vibrate(pattern=[50]) {
    if (!Settings.vibration) return;
    if (window.GameHaptics) {
        window.GameHaptics.postMessage(pattern.length > 1 ? 'medium' : 'light');
        return;
    }
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ OFF-SCREEN SPRITES (Glow, pre-rendered once) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
    SPRITES.player   = createGlowSprite('#ff003c', 30, 30, 20);
    SPRITES.partRed  = createGlowCircle('#ff003c', 2, 6);
    SPRITES.partPurp = createGlowCircle('#7000ff', 2, 6);
    SPRITES.bgDot1   = createGlowCircle('#ff003c', 1, 3);
    SPRITES.bgDot2   = createGlowCircle('#7000ff', 1, 3);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ OBJECT POOLS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Obstacle pool
const obstaclePool = new ObjectPool(
    () => ({x:0,y:0,width:0,height:0,passed:false}),
    (o, pattern = {}) => {
        o.passed=false;
        o.x=VIEW_W;
        if (CURRENT_MODE === 'LASER') {
            o.width = VIEW_W; o.height = 15;
            o.x = 0;
            o.y = CEILING - 20; // Spawn above visible area
        } else if (CURRENT_MODE === 'TOPDOWN') {
            o.width=pattern.width || 46;
            o.height=pattern.height || 58;
            o.y=pattern.y ?? CEILING + Math.random() * (FLOOR - CEILING - o.height);
        } else {
            o.width=40+Math.random()*60; o.height=40+Math.random()*80;
            const top=pattern.lane ? pattern.lane === 'top' : Math.random()>0.5;
            o.y=top?CEILING:FLOOR-o.height;
        }
    }, 15
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
    // Reduced from 100 to 40 for much better mobile performance
    for(let i=0;i<40;i++) bgParticles.push({
        x:Math.random()*VIEW_W,
        y:Math.random()*VIEW_H,
        baseVx:-(Math.random()*1.5+0.5),
        vx:0,
        sprite:Math.random()>0.5?SPRITES.bgDot1:SPRITES.bgDot2
    });
    bgParticles.forEach(p=>p.vx=p.baseVx);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ PLAYER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const player = {
    x:100, y:0, width:30, height:30,
    gravityDir:1, isSwapping:false, invincible:false,
    z: 0, zVelocity: 0,
    trail:[], squashX:1, squashY:1, squashFrames:0
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ FLUTTER BRIDGE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// ─── IN-GAME AD STATUS TOAST ──────────────────────────────────────────────
function showAdToast(msg) {
    let t = document.getElementById('ad-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'ad-toast';
        const gc = document.getElementById('game-container');
        if (gc) gc.appendChild(t); else document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('visible'), 3500);
}

const GAME_DISTRIBUTION_SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';
let gameDistributionSdkPromise = null;
let gameDistributionSdkReady = false;
let gameDistributionSdkReadyResolver = null;

function loadGameDistributionSdk() {
    if (gameDistributionSdkReady && window.gdsdk && typeof window.gdsdk.showAd === 'function') {
        return Promise.resolve(window.gdsdk);
    }
    if (gameDistributionSdkPromise) return gameDistributionSdkPromise;

    window.GD_OPTIONS = {
        gameId: 'b13fb38f722340388cd26e643ed2d6f8',
        onEvent(event) {
            switch (event.name) {
                case 'SDK_READY':
                    gameDistributionSdkReady = true;
                    if (gameDistributionSdkReadyResolver) {
                        const resolve = gameDistributionSdkReadyResolver;
                        gameDistributionSdkReadyResolver = null;
                        resolve(window.gdsdk);
                    }
                    break;
                case 'SDK_GAME_START':
                    if (window.resumeGameFromAd) window.resumeGameFromAd();
                    break;
                case 'SDK_GAME_PAUSE':
                    if (window.pauseGameForAd) window.pauseGameForAd();
                    break;
                case 'SDK_REWARDED_WATCH_COMPLETE':
                    if (window.FlutterBridge) window.FlutterBridge.onRewardGranted();
                    setTimeout(() => {
                        if (window.onAdClose) window.onAdClose();
                    }, 100);
                    break;
            }
        }
    };

    let sdkScript;
    const loadingPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            gameDistributionSdkReadyResolver = null;
            if (gameDistributionSdkPromise === loadingPromise) gameDistributionSdkPromise = null;
            sdkScript.remove();
            reject(new Error('GameDistribution SDK did not become ready in time.'));
        }, 10000);

        gameDistributionSdkReadyResolver = sdk => {
            clearTimeout(timeoutId);
            resolve(sdk);
        };

        sdkScript = document.createElement('script');
        sdkScript.id = 'gamedistribution-sdk';
        sdkScript.async = true;
        sdkScript.src = GAME_DISTRIBUTION_SDK_URL;
        sdkScript.onerror = () => {
            clearTimeout(timeoutId);
            gameDistributionSdkReadyResolver = null;
            if (gameDistributionSdkPromise === loadingPromise) gameDistributionSdkPromise = null;
            sdkScript.remove();
            reject(new Error('GameDistribution SDK could not be loaded.'));
        };
        document.head.appendChild(sdkScript);
    });

    gameDistributionSdkPromise = loadingPromise;
    return loadingPromise;
}

// ─── REMOVE ADS (IAP entitlement) ─────────────────────────────────────────
// Single source of truth for the no-ads state. Native Flutter verifies the
// purchase (or restores it on every launch) and calls window.setNoAds(true).
// When active: interstitials are fully disabled. The rewarded revive stays
// available — it is always player-initiated and opt-in.
const RemoveAds = {
    KEY: 'ndRemoveAds',
    _active: false,
    load() {
        try { this._active = localStorage.getItem(this.KEY) === 'true'; }
        catch(error) { this._active = false; }
        return this._active;
    },
    active() { return this._active === true; },
    set(enabled) {
        try { localStorage.setItem(this.KEY, enabled ? 'true' : 'false'); } catch(error) {}
        this.load();
        this.syncUI();
        return this._active;
    },
    syncUI() {
        const row=document.getElementById('remove-ads-row');
        if(row) row.style.display=(window.IS_APK && !this._active) ? 'flex' : 'none';
    }
};
RemoveAds.load();

// Native bridge hooks (Flutter → JS):
//   setNoAds(true)  → after successful IAP verification or purchase restore
//   getNoAds()      → Flutter can read current entitlement state
window.setNoAds = (verified) => {
    const wasActive = RemoveAds.active();
    const nowActive = RemoveAds.set(verified === true);
    // Only toast on a real transition, so silent launch-time restores don't nag.
    if (nowActive && !wasActive) showAdToast('Ads removed — thank you for supporting Cube Run! \uD83D\uDC9C');
    return nowActive;
};
window.getNoAds = () => RemoveAds.active();

const FlutterBridge = {
    isFlutter() { return typeof window.AdChannel !== 'undefined'; },
    _adStartTime: 0,
    _waitingForReward: false,
    showInterstitial() {
        if (RemoveAds.active()) return; // no-ads entitlement: hard stop
        if(this.isFlutter()) window.AdChannel.postMessage('showInterstitial');
        else {
            loadGameDistributionSdk()
                .then(sdk => sdk.showAd())
                .catch(error => console.warn('[CubeRun] Interstitial ad unavailable:', error));
        }
    },
    showRewarded() {
        return new Promise((resolve,reject) => {
            const cleanup = () => {
                clearTimeout(window._rewardTimeout);
                FlutterBridge._waitingForReward = false;
                window._onRewardGranted = null;
                window._onRewardFailed = null;
            };

            const failReward = () => {
                if(!window._onRewardFailed) return;
                const cb = window._onRewardFailed;
                cleanup();
                cb('Ad not available');
            };

            window._onRewardGranted = resolve;
            window._onRewardFailed = reject;
            // Timeout: fail cleanly after 30s if ad never reports back
            window._rewardTimeout = setTimeout(()=>failReward(), 30000);
            FlutterBridge._waitingForReward = true;
            FlutterBridge._adStartTime = Date.now();

            if (!navigator.onLine) {
                console.warn("Sentinel: Device is offline. Failing SDK.");
                failReward();
                return;
            }

            if(this.isFlutter()) {
                window.AdChannel.postMessage('showRewarded');
            } else {
                loadGameDistributionSdk()
                    .then(sdk => {
                        if (!FlutterBridge._waitingForReward) return;
                        const adPromise = sdk.showAd('rewarded');
                        if (adPromise && typeof adPromise.then === 'function') {
                            adPromise.catch(error => {
                                console.warn('[CubeRun] Rewarded ad failed:', error);
                                failReward();
                            });
                        }
                    })
                    .catch(error => {
                        console.warn('[CubeRun] Rewarded ad unavailable:', error);
                        failReward();
                    });
            }
        });
    },
    onRewardGranted() {
        clearTimeout(window._rewardTimeout);
        if(window._onRewardGranted) {
            const cb = window._onRewardGranted;
            window._onRewardGranted = null; window._onRewardFailed = null;
            FlutterBridge._waitingForReward = false;
            cb();
        }
    },
    onRewardFailed() {
        clearTimeout(window._rewardTimeout);
        if(window._onRewardFailed) {
            const cb = window._onRewardFailed;
            window._onRewardGranted = null; window._onRewardFailed = null;
            FlutterBridge._waitingForReward = false;
            cb('Ad not available');
        }
    }
};
window.FlutterBridge = FlutterBridge;

// Visibility listener - audio management only.
// Reward is ONLY granted by native AdMob onUserEarnedReward via FlutterBridge.
// The old auto-grant here was a free-revive exploit (fixed 2026-10-14).
document.addEventListener('visibilitychange', () => {
    if (typeof audioCtx !== 'undefined' && audioCtx !== null) {
        if (document.hidden && audioCtx.state === 'running') {
            audioCtx.suspend();
        } else if (!document.hidden && audioCtx.state === 'suspended' && GAME_STATE === STATE.PLAYING) {
            audioCtx.resume();
        }
    }
});

function consumePendingRevive() {
    window._pendingRevive = false;
    const shouldRevive = reviveRequestRunId === activeRunId && GAME_STATE === STATE.GAMEOVER;
    reviveRequestRunId = null;
    if (shouldRevive) revivePlayer();
}

window.onAdClose = () => {
    clearTimeout(window._rewardTimeout);
    if (window._pendingRevive) { consumePendingRevive(); return; }
    // Race guard: if native fires onRewardGranted() + onAdClose() inside the
    // SAME JS task, the revive click-handler's `await` continuation (which
    // sets _pendingRevive) hasn't run yet. A macrotask re-check (not a
    // microtask — those are FIFO and order-dependent) always runs after that
    // continuation, so a fully-watched ad never loses its revive.
    setTimeout(() => {
        if (window._pendingRevive) { consumePendingRevive(); return; }
        if (window._onRewardFailed) { window.FlutterBridge.onRewardFailed(); return; }
        // Ad closed with no reward and no pending callbacks — reset the
        // button so the player isn't stuck.
        const btn = document.getElementById('revive-btn');
        if (btn) { btn.textContent = '\u26A1 CLUTCH REVIVE (WATCH AD)'; btn.disabled = false; }
    }, 0);
};

// Global aliases for Android WebView compatibility
window.onRewardGranted = () => { if(window.FlutterBridge) window.FlutterBridge.onRewardGranted(); };
window.onRewardFailed = () => { if(window.FlutterBridge) window.FlutterBridge.onRewardFailed(); };
window._adRewardCallback = (success) => { 
    if(success && window.FlutterBridge) window.FlutterBridge.onRewardGranted(); 
    else if(window.FlutterBridge) window.FlutterBridge.onRewardFailed(); 
};
window.AdRewardSuccess = () => { if(window.FlutterBridge) window.FlutterBridge.onRewardGranted(); };
window.rewardUser = () => { if(window.FlutterBridge) window.FlutterBridge.onRewardGranted(); };

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
function startGameLoop() {
    function loop(ts) {
        if(GAME_STATE!==STATE.PLAYING) return;
        const dt=Math.min((ts-lastTime)/16.67,3);
        lastTime=ts;
        update(dt); draw();
        rafId=requestAnimationFrame(loop);
    }
    lastTime=performance.now();
    rafId=requestAnimationFrame(loop);
}

function currentRunPhase() {
    for (let i = RUN_PHASES.length - 1; i >= 0; i--) {
        if (score >= RUN_PHASES[i].score) return i;
    }
    return 0;
}

function lerpColor(from, to, amount) {
    const a=parseInt(from.slice(1),16), b=parseInt(to.slice(1),16);
    const r=Math.round(((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*amount);
    const g=Math.round(((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*amount);
    const bl=Math.round((a&255)+((b&255)-(a&255))*amount);
    return `rgb(${r}, ${g}, ${bl})`;
}

// Phase colors only change when score/phase change — cache keyed on both so
// the lerp rgb() strings aren't rebuilt (and re-allocated) every frame.
let _visualCache = { key: null, grid: RUN_PHASES[0].grid, obstacle: RUN_PHASES[0].obstacle };
function getRunVisuals() {
    const key = phaseIndex * 1e6 + Math.floor(score / 2);
    if (_visualCache.key === key) return _visualCache;
    let grid=RUN_PHASES[phaseIndex].grid;
    let obstacle=RUN_PHASES[phaseIndex].obstacle;
    for(let i=1;i<RUN_PHASES.length;i++) {
        const threshold=RUN_PHASES[i].score;
        const blend=(score-(threshold-15))/30;
        if(blend>=0&&blend<=1) {
            grid=lerpColor(RUN_PHASES[i-1].grid,RUN_PHASES[i].grid,blend);
            obstacle=lerpColor(RUN_PHASES[i-1].obstacle,RUN_PHASES[i].obstacle,blend);
            break;
        }
    }
    _visualCache = { key, grid, obstacle };
    return _visualCache;
}

function getObstaclePattern() {
    const sequence = patternIndex++;
    const interval = Math.max(78, 150 - baseSpeed * 5);

    if (CURRENT_MODE === 'TOPDOWN') {
        const lane = (fraction) => CEILING + fraction * (FLOOR - CEILING - 58);
        switch (sequence % 4) {
            case 1:
                return [
                    { y: lane(0.24), width: 44, height: 58, delay: 36 },
                    { y: lane(0.72), width: 44, height: 58, delay: interval }
                ];
            case 2: {
                const gap = Math.round(player.height * 1.5);
                const blockHeight = Math.max(24, (FLOOR - CEILING - gap) / 2);
                return [
                    { y: CEILING, width: 62, height: blockHeight, pairY: CEILING + blockHeight + gap, pairHeight: blockHeight, delay: interval }
                ];
            }
            case 3:
                return [
                    { y: lane(0.72), width: 44, height: 58, delay: 42 },
                    { y: lane(0.48), width: 44, height: 58, delay: 42 },
                    { y: lane(0.24), width: 44, height: 58, delay: interval }
                ];
            default:
                return [{ y: lane(Math.random() * 0.72), width: 48, height: 58, delay: interval }];
        }
    }

    const otherLane = classicLane === 'top' ? 'bottom' : 'top';
    const patterns = [
        [{ lane: classicLane, delay: interval }],
        [{ lane: otherLane, delay: 36 }, { lane: classicLane, delay: interval }],
        [
            { lane: classicLane, delay: 42 },
            { lane: otherLane, delay: 42 },
            { lane: classicLane, delay: interval }
        ]
    ];
    classicLane = otherLane;
    return patterns[sequence % patterns.length];
}

function spawnPatternObstacle(pattern) {
    const first = obstaclePool.acquire(pattern);
    if (pattern.pairY !== undefined) {
        obstaclePool.acquire({
            y: pattern.pairY,
            width: pattern.width,
            height: pattern.pairHeight
        });
    }
    return first;
}

function addFloatingText(text, x, y, color) {
    floatTexts.push({ text, x, y, color, life: 56 });
}

function update(dt) {
    frameCount++;
    if(frameCount%480===0) baseSpeed=Math.min(baseSpeed+1,22);
    const nextPhase=currentRunPhase();
    if(nextPhase!==phaseIndex) {
        phaseIndex=nextPhase;
        phaseFlashUntil=performance.now()+600;
        canvas.classList.toggle('aberration', phaseIndex===2 && !window.IS_APK);
        updateScoreDisplay();
    }
    const phase = RUN_PHASES[phaseIndex];
    const phaseVisuals = getRunVisuals();
    const runSpeed = baseSpeed * phase.speed;

    // Player movement
    if (CURRENT_MODE === 'TOPDOWN') {
        // Smoothly move towards targetY if it exists
        if (player.targetY !== undefined) {
            const dy = player.targetY - (player.y + player.height/2);
            player.y += dy * (1 - Math.pow(0.45, dt));
        }
        // Clamp to screen bounds
        if (player.y < CEILING) player.y = CEILING;
        if (player.y > FLOOR - player.height) player.y = FLOOR - player.height;
    } else if (CURRENT_MODE === 'LASER') {
        // Z-axis jump (cube jumps "up" to dodge beams passing through)
        const wasAirborne=player.z>0||player.zVelocity>0;
        player.z += player.zVelocity * dt;
        player.zVelocity -= 0.6 * dt; // Gravity
        if (player.z <= 0) {
            if (wasAirborne) {
                player.squashX = 1.2;
                player.squashY = 0.8;
                player.squashFrames = 5;
            }
            player.z = 0;
            player.zVelocity = 0;
        }
        // Keep cube centered
        player.x = VIEW_W / 2 - player.width / 2;
        player.y = FLOOR - player.height - 60;
    } else {
        // Gravity swap movement
        if(player.isSwapping) {
            const spd=15*dt;
            player.y+=spd*player.gravityDir;
            if(player.gravityDir===1&&player.y>=FLOOR-player.height){
                player.y=FLOOR-player.height; player.isSwapping=false;
                player.squashX=1.2; player.squashY=0.8; player.squashFrames=5;
            }
            if(player.gravityDir===-1&&player.y<=CEILING){
                player.y=CEILING; player.isSwapping=false;
                player.squashX=1.2; player.squashY=0.8; player.squashFrames=5;
            }
        }
    }
    if(player.squashFrames>0) {
        if(player.squashFrames<=4) {
            const spring=(player.squashFrames-1)/3;
            player.squashX=1+0.2*spring;
            player.squashY=1-0.2*spring;
        }
        player.squashFrames--;
    } else {
        player.squashX=1;
        player.squashY=1;
    }

    // Trail
    if (CURRENT_MODE === 'LASER') {
        player.trail.push({x:player.x, y:player.y - player.z});
    } else {
        player.trail.push({x:player.x, y:player.y});
    }
    if(player.trail.length>12) player.trail.shift();

    // Spawn obstacles
    if (CURRENT_MODE === 'LASER') {
        const spawnInterval = Math.max(50, 150 - baseSpeed * 5);
        if(frameCount%spawnInterval===0) obstaclePool.acquire();
    } else {
        patternTimer -= dt;
        while(patternTimer<=0) {
            if(patternQueue.length===0) patternQueue=getObstaclePattern();
            const pattern=patternQueue.shift();
            spawnPatternObstacle(pattern);
            patternTimer+=pattern.delay;
        }
    }

    // Update obstacles & collisions
    for(let i=obstaclePool.active.length-1;i>=0;i--) {
        const o=obstaclePool.active[i];
        
        if (CURRENT_MODE === 'LASER') {
            o.y += runSpeed * 1.3 * dt; // Move down
            // Collision: only hit if cube is NOT jumping (z < 15)
            if(!player.invincible && player.y < o.y + o.height && player.y + player.height > o.y && player.z < 15){
                gameOver(); return;
            }
            if(!o.passed && o.y > player.y + player.height){
                o.passed = true;
                addScore(50); playSfx('score');
                if(player.z>=15&&player.z<=21) {
                    addScore(50);
                    addFloatingText('+50 CLOSE CALL!', player.x + player.width / 2, player.y - player.z - 8, phaseVisuals.obstacle);
                    playSfx('nearmiss');
                }
            }
            if(o.y > VIEW_H + 20){ obstaclePool.release(o); }
        } else {
            o.x-=runSpeed*dt;
            if(!player.invincible&&player.x<o.x+o.width&&player.x+player.width>o.x&&player.y<o.y+o.height&&player.y+player.height>o.y){
                gameOver(); return;
            }
            if(!o.passed&&player.x>o.x+o.width){
                o.passed=true;
                const gap=player.y>o.y+o.height
                    ? player.y-(o.y+o.height)
                    : o.y>player.y+player.height
                        ? o.y-(player.y+player.height)
                        : 0;
                if(gap>0&&gap<=6){
                    addScore(50);
                    addFloatingText('+50 CLOSE CALL!', player.x + player.width / 2, player.y - 8, phaseVisuals.obstacle);
                    playSfx('nearmiss');
                    canvas.classList.add('flash-white');
                    setTimeout(()=>canvas.classList.remove('flash-white'),200);
                }
            }
            if(o.x+o.width<0){ obstaclePool.release(o); addScore(10); }
        }
    }

    // Update particles
    for(let i=particlePool.active.length-1;i>=0;i--) {
        const p=particlePool.active[i];
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
        if(p.life<=0) particlePool.release(p);
    }

    for(let i=floatTexts.length-1;i>=0;i--) {
        const item=floatTexts[i];
        item.y-=0.55*dt;
        item.life-=dt;
        if(item.life<=0) floatTexts.splice(i,1);
    }

    // BG particles
    bgParticles.forEach(p=>{
        p.x+=p.vx*phase.speed*dt-(player.isSwapping?6*dt:0);
        if(p.vx<p.baseVx) p.vx+=0.3*dt;
        if(p.x<0){p.x=VIEW_W; p.y=Math.random()*VIEW_H; p.vx=p.baseVx;}
    });
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = score;
    bestScore = Math.max(bestScore, score);
    const bestValue = document.getElementById('bestValue');
    if (bestValue) bestValue.textContent = bestScore;
    const multiplier = document.getElementById('hud-multiplier');
    if (multiplier) multiplier.textContent = `×${RUN_PHASES[phaseIndex].scoreMultiplier.toFixed(1)}`;
}

function draw() {
    const W=VIEW_W, H=VIEW_H;
    ctx.clearRect(0,0,W,H);
    const phase=RUN_PHASES[phaseIndex];
    const visuals=getRunVisuals();
    const deathShake=GAME_STATE===STATE.GAMEOVER&&shakeFrames>0;
    if(deathShake) {
        ctx.save();
        const intensity=shakeFrames/4;
        ctx.translate((Math.random()-0.5)*10*intensity,(Math.random()-0.5)*8*intensity);
        shakeFrames--;
    }

    // Tunnel lines
    ctx.strokeStyle=visuals.grid; ctx.globalAlpha=0.38; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,CEILING); ctx.lineTo(W,CEILING);
    ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke();
    ctx.globalAlpha=1;

    // Moving grid
    ctx.strokeStyle=visuals.grid; ctx.globalAlpha=0.14; ctx.lineWidth=1;
    const off=(frameCount*baseSpeed*phase.speed)%50;
    ctx.beginPath();
    for(let i=-off;i<W;i+=50){ ctx.moveTo(i,CEILING); ctx.lineTo(i,FLOOR); }
    for(let j=CEILING;j<FLOOR;j+=50){ ctx.moveTo(0,j); ctx.lineTo(W,j); }
    ctx.stroke();
    ctx.globalAlpha=1;

    if (phaseIndex === 2) {
        const tunnelHeight = FLOOR - CEILING;
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const y = CEILING + ((i * 71 + frameCount * 0.8) % tunnelHeight);
            const x = W - ((frameCount * (3 + i * 0.24)) % (W + 50));
            const length = 16 + (i % 4) * 9;
            ctx.moveTo(x, y);
            ctx.lineTo(x - length, y);
        }
        ctx.stroke();
    }

    // BG particles
    bgParticles.forEach(p=>{
        if (!p.sprite) p.sprite = Math.random()>0.5 ? SPRITES.bgDot1 : SPRITES.bgDot2;
        if (p.sprite) ctx.drawImage(p.sprite,Math.floor(p.x-2),Math.floor(p.y-2));
    });

    // Obstacles
    obstaclePool.active.forEach(o=>{
        if (CURRENT_MODE === 'LASER') {
            // Full-width neon red laser beam
            ctx.fillStyle = visuals.obstacle;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(o.x, o.y - 4, o.width, o.height + 8);
            ctx.globalAlpha = 1.0;
            ctx.fillRect(o.x, o.y, o.width, o.height);
            // White-hot core
            ctx.fillStyle = 'rgba(255,200,200,0.7)';
            ctx.fillRect(o.x, o.y + 3, o.width, Math.max(o.height - 6, 2));
        } else if (CURRENT_MODE === 'TOPDOWN') {
            // Layered-alpha glow ≈ shadowBlur at a fraction of the GPU cost
            ctx.fillStyle = visuals.obstacle;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(o.x - 4, o.y - 4, o.width + 8, o.height + 8);
            ctx.globalAlpha = 0.88;
            ctx.fillRect(o.x, o.y, o.width, o.height);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.globalAlpha = 0.65;
            ctx.fillRect(o.x + 5, o.y + 5, Math.max(3, o.width * 0.14), Math.max(4, o.height - 10));
            ctx.globalAlpha = 1;
        } else {
            // Layered-alpha glow ≈ shadowBlur at a fraction of the GPU cost
            ctx.fillStyle=visuals.obstacle;
            ctx.globalAlpha=0.22;
            ctx.fillRect(o.x-5,o.y-5,o.width+10,o.height+10);
            ctx.globalAlpha=1;
            ctx.fillRect(o.x,o.y,o.width,o.height);
            ctx.fillStyle='rgba(255,255,255,0.4)';
            ctx.fillRect(o.x+4,o.y+4,Math.max(2,o.width-8),3);
        }
    });

    // Player trail
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

    floatTexts.forEach(item=>{
        ctx.globalAlpha=Math.min(1,item.life/18);
        ctx.font='700 14px Orbitron, sans-serif';
        ctx.textAlign='center';
        ctx.fillStyle=item.color;
        ctx.fillText(item.text,item.x,item.y);
    });
    ctx.globalAlpha=1;

    // Player
    if(GAME_STATE===STATE.PLAYING||GAME_STATE===STATE.PAUSED||GAME_STATE===STATE.GAMEOVER) {
        if (CURRENT_MODE === 'TOPDOWN') {
             ctx.save();
             ctx.translate(player.x+player.width/2,player.y+player.height/2);
             ctx.scale(player.squashX,player.squashY);
             ctx.fillStyle=player.invincible?'#ffffff':visuals.obstacle;
             ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=14;
             ctx.fillRect(-player.width/2,-player.height/2,player.width,player.height);
             ctx.shadowBlur=0;
             ctx.fillStyle='rgba(255,255,255,0.55)';
             ctx.fillRect(-player.width/4,-player.height/4,player.width/2,player.height/2);
             ctx.restore();
        } else if (CURRENT_MODE === 'LASER') {
             // Clean sharp cube, lifted by z
             const drawY = player.y - player.z;
             ctx.save();
             ctx.translate(player.x+player.width/2,drawY+player.height/2);
             ctx.scale(player.squashX,player.squashY);
             ctx.fillStyle = player.invincible ? '#ffffff' : visuals.obstacle;
             ctx.fillRect(-player.width/2,-player.height/2,player.width,player.height);
             // Inner highlight
             ctx.fillStyle = 'rgba(255,255,255,0.4)';
             ctx.fillRect(-8,-8,16,16);
             ctx.restore();
        } else {
            const spr=SPRITES.player;
            ctx.save();
            ctx.translate(player.x+player.width/2,player.y+player.height/2);
            ctx.scale(player.squashX,player.squashY);
            if(spr) ctx.drawImage(spr,-player.width/2-15,-player.height/2-15);
            else { ctx.fillStyle=player.invincible?'#ffffff':visuals.obstacle; ctx.fillRect(-player.width/2,-player.height/2,player.width,player.height); }
            ctx.restore();
        }
    }

    if(performance.now()<phaseFlashUntil) {
        const remaining=phaseFlashUntil-performance.now();
        const elapsed=600-remaining;
        const alpha=Math.min(1,elapsed/90,remaining/180);
        ctx.globalAlpha=alpha;
        ctx.fillStyle=visuals.grid;
        ctx.font='900 15px Orbitron, sans-serif';
        ctx.textAlign='center';
        ctx.shadowColor=visuals.grid;
        ctx.shadowBlur=18;
        ctx.fillText(phase.title,W/2,H*0.34);
        ctx.shadowBlur=0;
        ctx.globalAlpha=1;
    }

    if(deathShake) ctx.restore();
}

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
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

function cancelPendingInterstitial() {
    if(interstitialTimer!==null) {
        clearTimeout(interstitialTimer);
        interstitialTimer=null;
    }
}

function cancelReviveCountdown() {
    if(reviveCountdownInterval!==null) {
        clearInterval(reviveCountdownInterval);
        reviveCountdownInterval=null;
    }
    if(reviveCountdownElement) {
        reviveCountdownElement.remove();
        reviveCountdownElement=null;
    }
}

function quitToMenu() {
    activeRunId++;
    cancelPendingInterstitial();
    cancelReviveCountdown();
    window._pendingRevive=false;
    reviveRequestRunId=null;
    cancelAnimationFrame(rafId);
    stopDrone();
    GAME_STATE=STATE.MENU;
    hideAllScreens(); hideHUD();
    canvas.classList.remove('aberration');
    document.getElementById('game-container').classList.remove('glitch-shake', 'game-over-flash');
    showScreen('start-screen');
}

function createExplosion(x,y) { for(let i=0;i<25;i++) particlePool.acquire(x,y); }

function gameOver() {
    GAME_STATE=STATE.GAMEOVER;
    cancelAnimationFrame(rafId);
    createExplosion(player.x+15,player.y+15);
    playCrash(); vibrate([100,50,100]);
    shakeFrames=4;
    draw();
    requestAnimationFrame(function deathKickFrame() {
        if(shakeFrames<=0) return;
        draw();
        requestAnimationFrame(deathKickFrame);
    });
    const gameContainer=document.getElementById('game-container');
    gameContainer.classList.remove('game-over-flash');
    void gameContainer.offsetWidth;
    gameContainer.classList.add('game-over-flash');
    setTimeout(()=>gameContainer.classList.remove('game-over-flash'),220);
    canvas.classList.remove('aberration');

    const previousBest=SaveData.load().highScore;
    const isNew=SaveData.updateHighScore(score);
    document.getElementById('finalScore').textContent=score;
    bestScore=SaveData.load().highScore;
    document.getElementById('highScore').textContent=bestScore;
    document.getElementById('new-record-badge').style.display=isNew?'block':'none';

    hideHUD();
    showScreen('game-over-screen');

    // Keep the optional rewarded revive secondary to the instant retry action.
    const reviveBtn = document.getElementById('revive-btn');
    const reviveAvailable=score>=30;
    reviveBtn.style.display=reviveAvailable?'block':'none';
    reviveBtn.classList.toggle('clutch-revive',reviveAvailable);
    if (reviveAvailable) {
        reviveBtn.textContent = '\u26A1 CLUTCH REVIVE (WATCH AD)';
        reviveBtn.disabled = false;
    }

    sessionDeathCount++;
    saveSessionDeathCount(sessionDeathCount);
    const now=Date.now();
    const runDuration=now-runStartedAt;
    // Interstitial engine — every gate must pass, so an ad is only ever a
    // reward for a real session, never a punishment for struggling:
    //   1. Only runs ≥ MIN_RUN_MS count toward the cadence (rapid short
    //      deaths never push the player toward an interstitial).
    //   2. ≥ DEATHS qualifying deaths since the last ad.
    //   3. ≥ COOLDOWN_MS since the last ad — this is also the launch grace,
    //      because lastInterstitialAt starts at page load.
    //   4. Natural break only: called from gameOver() after DELAY_MS, and the
    //      timer re-checks the run wasn't restarted/quit/left meanwhile.
    //   5. Never for no-ads users (double gate: here and in showInterstitial).
    if (runDuration >= INTERSTITIAL_POLICY.MIN_RUN_MS) deathsSinceInterstitial++;
    const cadenceOk = deathsSinceInterstitial >= INTERSTITIAL_POLICY.DEATHS;
    const cooldownOk = (now - lastInterstitialAt) >= INTERSTITIAL_POLICY.COOLDOWN_MS;
    if (cadenceOk && cooldownOk) {
        lastInterstitialAt = now;
        deathsSinceInterstitial = 0;
        const endedRunId=activeRunId;
        interstitialTimer=setTimeout(() => {
            interstitialTimer=null;
            // Never stack an interstitial on top of an in-flight rewarded
            // revive: skip if the player has already tapped REVIVE (their
            // rewarded ad is loading/playing) or a revive is awaiting its
            // post-ad callback.
            if(GAME_STATE===STATE.GAMEOVER && activeRunId===endedRunId && !RemoveAds.active()
               && reviveRequestRunId===null && !window._pendingRevive) {
                FlutterBridge.showInterstitial();
            }
        }, INTERSTITIAL_POLICY.DELAY_MS);
    }
}

function revivePlayer() {
    if(GAME_STATE!==STATE.GAMEOVER||reviveCountdownInterval!==null) return;
    cancelPendingInterstitial();
    hideScreen('game-over-screen');
    let count = 3;
    const countdownEl = document.createElement('div');
    countdownEl.style.position = 'absolute';
    countdownEl.style.top = '50%';
    countdownEl.style.left = '50%';
    countdownEl.style.transform = 'translate(-50%, -50%)';
    countdownEl.style.fontSize = '80px';
    countdownEl.style.fontWeight = 'bold';
    countdownEl.style.color = '#ff003c';
    countdownEl.style.zIndex = '9999';
    countdownEl.style.textShadow = '0 0 20px #ff003c';
    countdownEl.style.fontFamily = 'monospace';
    countdownEl.innerText = count;
    document.body.appendChild(countdownEl);
    reviveCountdownElement=countdownEl;

    reviveCountdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
        } else {
            clearInterval(reviveCountdownInterval);
            reviveCountdownInterval=null;
            countdownEl.remove();
            reviveCountdownElement=null;
            GAME_STATE=STATE.PLAYING;
            player.y=FLOOR-player.height; player.gravityDir=1; player.isSwapping=false;
            player.invincible=true; setTimeout(()=>player.invincible=false,2000);
            obstaclePool.releaseAll();
            document.getElementById('revive-btn').style.display='none';
            document.getElementById('game-container').classList.remove('glitch-shake');
            showHUD(); startGameLoop();
        }
    }, 1000);
}
window.revivePlayer=revivePlayer;

function resetGame() {
    score=0; frameCount=0; baseSpeed=7;
    player.x=100; player.y=FLOOR-player.height;
    player.gravityDir=1; player.isSwapping=false; player.invincible=false; player.trail=[];
    player.z=0; player.zVelocity=0; player.targetY=undefined;
    if (CURRENT_MODE === 'TOPDOWN') {
        player.y=(CEILING+FLOOR-player.height)/2;
        player.targetY=player.y+player.height/2;
    }
    lastTopDownHapticAt=0;
    lastTopDownHapticY=player.y+player.height/2;
    player.squashX=1; player.squashY=1; player.squashFrames=0;
    phaseIndex=0; phaseFlashUntil=0; shakeFrames=0;
    canvas.classList.remove('aberration');
    patternQueue=[]; patternTimer=72; patternIndex=0; classicLane='top'; floatTexts=[];
    window._freeRevives = 0;
    obstaclePool.releaseAll(); particlePool.releaseAll();
    initBgParticles();
    updateScoreDisplay();
    document.getElementById('game-container').classList.remove('glitch-shake', 'game-over-flash');
    canvas.classList.remove('aberration');
}

function startGame() {
    activeRunId++;
    cancelPendingInterstitial();
    cancelReviveCountdown();
    window._pendingRevive=false;
    reviveRequestRunId=null;
    getAudio(); // unlock AudioContext on user gesture
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) CURRENT_MODE = modeSelect.value;

    resetGame();
    hideAllScreens(); showHUD();
    GAME_STATE=STATE.PLAYING;
    runStartedAt=Date.now();
    cancelAnimationFrame(rafId);
    startDrone();
    startGameLoop();
}

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
function handleInput(yPos) {
    if (GAME_STATE !== STATE.PLAYING) return;
    if (CURRENT_MODE === 'TOPDOWN') {
        const halfHeight=player.height/2;
        const targetY=Math.max(CEILING+halfHeight,Math.min(FLOOR-halfHeight,yPos));
        player.targetY=targetY;
        const now=performance.now();
        if (Math.abs(targetY-lastTopDownHapticY)>=player.height && now-lastTopDownHapticAt>=160) {
            vibrate([20]);
            lastTopDownHapticAt=now;
            lastTopDownHapticY=targetY;
        }
    } else if (CURRENT_MODE === 'LASER') {
        // Jump only when on ground (z==0)
        if (player.z <= 0) {
            player.zVelocity = 12;
            playSfx('jump');
            vibrate([30]);
        }
    } else {
        swapGravity();
    }
}
window.addEventListener('keydown', e=>{
    if(e.code==='Space'){
        e.preventDefault();
        if(e.repeat) return;
        if(GAME_STATE===STATE.GAMEOVER) startGame();
        else handleInput((CEILING+FLOOR)/2); // arena center, viewport-independent
    }
    if(e.key==='Escape') pauseGame();
});
window.addEventListener('touchstart', e=>{
    if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        // All modes: swallow the tap so the browser never synthesizes a
        // follow-up mouse event (double-input guard) and never starts a
        // scroll/zoom gesture from gameplay touches.
        if (e.cancelable) e.preventDefault();
        handleInput(e.touches[0].clientY);
    }
}, {passive:false});
window.addEventListener('mousedown', e=>{ 
    if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        handleInput(e.clientY);
    }
});
window.addEventListener('mousemove', e=>{ 
    if(GAME_STATE===STATE.PLAYING && CURRENT_MODE === 'TOPDOWN' && e.buttons === 1 && !e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        handleInput(e.clientY);
    }
});
window.addEventListener('touchmove', e=>{
    if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        if (e.cancelable) e.preventDefault();
        if (CURRENT_MODE === 'TOPDOWN') handleInput(e.touches[0].clientY);
    }
}, {passive:false});
// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
document.getElementById('start-btn')?.addEventListener('click', () => {
    startGame();
});
document.getElementById('tutorial-got-it-btn')?.addEventListener('click', () => {
    localStorage.setItem('cubeRunTutorialCompleted', 'true');
    hideAllScreens();
    startGame();
});
document.getElementById('tutorial-skip-btn')?.addEventListener('click', () => {
    let skips = parseInt(localStorage.getItem('cubeRunTutorialSkips') || '0');
    localStorage.setItem('cubeRunTutorialSkips', (skips + 1).toString());
    hideAllScreens();
    startGame();
});
document.getElementById('tutorial-replay-btn')?.addEventListener('click', () => {
    hideAllScreens();
    showScreen('tutorial-screen');
});
document.getElementById('restart-btn')?.addEventListener('click', startGame);
window.addEventListener('pointerdown', e=>{
    if(GAME_STATE===STATE.GAMEOVER&&e.target.closest('#game-over-screen')&&!e.target.closest('button, a')) {
        startGame();
    }
});
document.getElementById('pause-btn')?.addEventListener('click', pauseGame);
document.getElementById('resume-btn')?.addEventListener('click', resumeGame);
document.getElementById('quit-btn')?.addEventListener('click', quitToMenu);
document.getElementById('menu-btn-icon')?.addEventListener('click', quitToMenu);
document.getElementById('menu-btn')?.addEventListener('click', quitToMenu);
document.getElementById('game-over-menu-btn')?.addEventListener('click', quitToMenu);

document.getElementById('settings-btn')?.addEventListener('click', ()=>{
    if(GAME_STATE===STATE.PLAYING) pauseGame();
    showScreen('settings-screen');
});
document.getElementById('menu-settings-btn')?.addEventListener('click', ()=>{
    showScreen('settings-screen');
});
document.getElementById('settings-from-pause-btn')?.addEventListener('click', ()=>showScreen('settings-screen'));
document.getElementById('settings-back-btn')?.addEventListener('click', ()=>{
    hideScreen('settings-screen');
    if(GAME_STATE===STATE.PAUSED) showScreen('pause-screen');
});

// Remove Ads (APK only): ask Flutter to run the native IAP flow. On success
// Flutter calls window.setNoAds(true), which flips the entitlement, hides
// every interstitial path and hides this row until uninstall/refund.
document.getElementById('remove-ads-btn')?.addEventListener('click', ()=>{
    if (window.AdChannel) {
        window.AdChannel.postMessage('purchaseRemoveAds');
        showAdToast('Opening Google Play Billing…');
    } else {
        showAdToast('Remove Ads is available in the Android app.');
    }
});

// Revive button
document.getElementById('revive-btn')?.addEventListener('click', async ()=>{
    const btn=document.getElementById('revive-btn');
    const requestRunId=activeRunId;
    // Player chose the rewarded path — kill any pending auto interstitial so
    // the two full-screen ads can never overlap.
    cancelPendingInterstitial();
    reviveRequestRunId=requestRunId;
    window._pendingRevive=false; // clear any orphaned flag from a prior attempt
    btn.disabled=true; btn.textContent='⏳ LOADING...';
    try { 
        await FlutterBridge.showRewarded();
        if(requestRunId===activeRunId&&GAME_STATE===STATE.GAMEOVER) {
            window._pendingRevive=true;
        }
    }
    catch(e) { 
        if(requestRunId!==activeRunId||GAME_STATE!==STATE.GAMEOVER) return;
        reviveRequestRunId=null;
        btn.textContent = '❌ TRY AGAIN LATER';
        showAdToast('Ad unavailable — tap REVIVE again in a moment.');
        setTimeout(() => {
            if(requestRunId!==activeRunId||GAME_STATE!==STATE.GAMEOVER) return;
            btn.textContent = '\u26A1 CLUTCH REVIVE (WATCH AD)';
            btn.disabled = false;
        }, 2000);
    }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ UTILS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
window.pauseGameForAd  = ()=>{ if(GAME_STATE===STATE.PLAYING){ cancelAnimationFrame(rafId); }};
window.resumeGameFromAd= ()=>{ if(GAME_STATE===STATE.PLAYING) startGameLoop(); };

function applyApkMode() {
    if(window.IS_APK===true) {
        document.querySelectorAll('.apk-only').forEach(el=>el.remove());
    }
}
window.addEventListener('load',()=>{
    applyApkMode();
    RemoveAds.syncUI();
    setTimeout(()=>{ applyApkMode(); RemoveAds.syncUI(); },800);
});

function shareToWhatsApp() {
    const t='\uD83D\uDD25 I scored '+score+' on CUBE RUN! \uD83D\uDE08 Beat me: https://turfin-logic.github.io/CubeRun/';
    window.location.href='https://api.whatsapp.com/send?text='+encodeURIComponent(t);
}
function shareToTelegram() {
    window.location.href='https://t.me/share/url?url='+encodeURIComponent('https://turfin-logic.github.io/CubeRun/')+'&text='+encodeURIComponent('\uD83D\uDD25 I scored '+score+' on CUBE RUN!');
}
function downloadApk() {
    window.location.href='https://neon-drift-game-tau.vercel.app/neon-drift-boss.apk?v='+Date.now();
}

// Custom Carousel Mode UI Logic
const MODES = [
    {
        value: 'CLASSIC',
        label: 'CLASSIC (GRAVITY FLIP)',
        hint: 'TAP OR SPACEBAR TO FLIP GRAVITY',
        help: 'Tap or press Space to flip gravity and dodge obstacles.'
    },
    {
        value: 'LASER',
        label: 'LASER (JUMP OVER BEAMS)',
        hint: 'TAP OR SPACEBAR TO JUMP',
        help: 'Tap or press Space to jump over the incoming laser beams.'
    },
    {
        value: 'TOPDOWN',
        label: 'TOP-DOWN (VERTICAL DODGE)',
        hint: 'TAP OR DRAG UP/DOWN TO DODGE',
        help: 'Tap or click to choose a height, or drag up and down to dodge blocks. The arena scrolls toward you automatically.'
    }
];
let currentModeIndex = 0;

function updateModeCarousel() {
    const modeDisplay = document.getElementById('mode-display');
    const modeInput = document.getElementById('mode-select');
    if (modeDisplay && modeInput) {
        const mode = MODES[currentModeIndex];
        modeDisplay.textContent = mode.label;
        modeDisplay.setAttribute('aria-label', `Selected mode: ${mode.label}`);
        modeInput.value = mode.value;
        const hint = document.getElementById('hero-hint');
        if (hint) hint.textContent = mode.hint;
        const tutorialTitle = document.getElementById('tutorial-mode-title');
        if (tutorialTitle) tutorialTitle.textContent = mode.label;
        const tutorialHelp = document.getElementById('tutorial-mode-help');
        if (tutorialHelp) tutorialHelp.textContent = mode.help;
        const startButton = document.getElementById('start-btn');
        if (startButton) startButton.setAttribute('aria-label', `Start ${mode.value.toLowerCase()} mode`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('mode-prev');
    const nextBtn = document.getElementById('mode-next');

    updateModeCarousel();
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex - 1 + MODES.length) % MODES.length;
            updateModeCarousel();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex + 1) % MODES.length;
            updateModeCarousel();
        });
    }
});

function addScore(points) {
    score += Math.round(points * RUN_PHASES[phaseIndex].scoreMultiplier);
    updateScoreDisplay();
}
