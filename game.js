// game.js Ã¢â‚¬â€ CUBE RUN (Production Build)
// Skill: html5-canvas-mobile-game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ STATE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const STATE = { MENU:'MENU', PLAYING:'PLAYING', PAUSED:'PAUSED', GAMEOVER:'GAMEOVER' };
let GAME_STATE = STATE.MENU;
let CURRENT_MODE = 'CLASSIC';
let score = 0, frameCount = 0, baseSpeed = 7, rafId = null, lastTime = 0;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SPRITES & POOLS (Defined early to prevent ReferenceError) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ LAYOUT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
let CEILING, FLOOR;
let resizeTimer;
function resizeCanvas() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width  = window.innerWidth  * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width  = window.innerWidth  + 'px';
        canvas.style.height = window.innerHeight + 'px';
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        CEILING = window.innerHeight * 0.18;
        FLOOR   = window.innerHeight * 0.82;
        if(typeof initSprites === 'function') initSprites();
    }, 100);
}
window.addEventListener('resize', resizeCanvas);
// Call immediately for initial setup
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = window.innerWidth  * dpr;
canvas.height = window.innerHeight * dpr;
canvas.style.width  = window.innerWidth  + 'px';
canvas.style.height = window.innerHeight + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
CEILING = window.innerHeight * 0.18;
FLOOR   = window.innerHeight * 0.82;
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
            if (b) { b.textContent = this[k] ? 'ON' : 'OFF'; b.classList.toggle('active', this[k]); }
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

function vibrate(p=[50]) { if(Settings.vibration && navigator.vibrate) navigator.vibrate(p); }

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
    SPRITES.obsRed   = createGlowSprite('#ff003c', 60, 80, 15);
    SPRITES.obsMag   = createGlowSprite('#ff00ff', 60, 80, 15);
    SPRITES.partRed  = createGlowCircle('#ff003c', 2, 6);
    SPRITES.partPurp = createGlowCircle('#7000ff', 2, 6);
    SPRITES.bgDot1   = createGlowCircle('#ff003c', 1, 3);
    SPRITES.bgDot2   = createGlowCircle('#7000ff', 1, 3);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ OBJECT POOLS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Obstacle pool
const obstaclePool = new ObjectPool(
    () => ({x:0,y:0,width:0,height:0,sprite:null,passed:false}),
    (o) => {
        o.passed=false;
        o.x=window.innerWidth;
        if (CURRENT_MODE === 'LASER') {
            o.width = window.innerWidth; o.height = 15;
            o.x = 0;
            o.y = CEILING - 20; // Spawn above visible area
            o.sprite = null;
        } else if (CURRENT_MODE === 'TOPDOWN') {
            o.width=40+Math.random()*60; o.height=40+Math.random()*60; // Square-ish obstacles
            o.y=CEILING + Math.random() * (FLOOR - CEILING - o.height);
            o.sprite=null;
        } else {
            o.width=40+Math.random()*60; o.height=40+Math.random()*80;
            const top=Math.random()>0.5;
            o.y=top?CEILING:FLOOR-o.height;
            o.sprite=Math.random()>0.5?SPRITES.obsRed:SPRITES.obsMag;
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
        x:Math.random()*window.innerWidth,
        y:Math.random()*window.innerHeight,
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
    trail:[]
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

const FlutterBridge = {
    isFlutter() { return typeof window.AdChannel !== 'undefined'; },
    _adStartTime: 0,
    _waitingForReward: false,
    showInterstitial() { 
        if(this.isFlutter()) window.AdChannel.postMessage('showInterstitial');
        else if(typeof gdsdk !== 'undefined') { try { gdsdk.showAd(); } catch(e) { console.warn('[CubeRun] interstitial gdsdk threw:', e); } }
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
            } else if(typeof gdsdk !== 'undefined' && typeof gdsdk.showAd !== 'undefined') {
                try {
                    const adPromise = gdsdk.showAd('rewarded');
                    if (adPromise && typeof adPromise.then === 'function') {
                        adPromise.then(() => {
                            if (FlutterBridge._waitingForReward) FlutterBridge.onRewardGranted();
                        }).catch(() => {
                            failReward();
                        });
                    }
                } catch(e) {
                    failReward();
                }
            } else {
                failReward();
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

window.onAdClose = () => {
    clearTimeout(window._rewardTimeout);
    if (window._pendingRevive) {
        window._pendingRevive = false;
        revivePlayer();
    } else if (window._onRewardFailed) {
        window._onRewardFailed('Ad Closed');
    } else {
        // Edge case: ad closed without a reward and no pending callbacks.
        // Reset the button so the player isn't stuck.
        const btn = document.getElementById('revive-btn');
        if (btn) { btn.textContent = '\u26A1 REVIVE (WATCH AD)'; btn.disabled = false; }
    }
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

function update(dt) {
    frameCount++;
    if(frameCount%480===0) baseSpeed=Math.min(baseSpeed+1,22);

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

    // Player movement
    if (CURRENT_MODE === 'TOPDOWN') {
        // Smoothly move towards targetY if it exists
        if (player.targetY !== undefined) {
            const dy = player.targetY - (player.y + player.height/2);
            player.y += dy * 0.15 * dt;
        }
        // Clamp to screen bounds
        if (player.y < CEILING) player.y = CEILING;
        if (player.y > FLOOR - player.height) player.y = FLOOR - player.height;
    } else if (CURRENT_MODE === 'LASER') {
        // Z-axis jump (cube jumps "up" to dodge beams passing through)
        player.z += player.zVelocity * dt;
        player.zVelocity -= 0.6 * dt; // Gravity
        if (player.z <= 0) {
            player.z = 0;
            player.zVelocity = 0;
        }
        // Keep cube centered
        player.x = window.innerWidth / 2 - player.width / 2;
        player.y = FLOOR - player.height - 60;
    } else {
        // Gravity swap movement
        if(player.isSwapping) {
            const spd=15*dt;
            player.y+=spd*player.gravityDir;
            if(player.gravityDir===1&&player.y>=FLOOR-player.height){ player.y=FLOOR-player.height; player.isSwapping=false; }
            if(player.gravityDir===-1&&player.y<=CEILING){ player.y=CEILING; player.isSwapping=false; }
        }
    }

    // Trail
    if (CURRENT_MODE === 'LASER') {
        player.trail.push({x:player.x, y:player.y - player.z});
    } else {
        player.trail.push({x:player.x, y:player.y});
    }
    if(player.trail.length>12) player.trail.shift();

    // Spawn obstacles
    let spawnInterval = Math.max(50, 150 - baseSpeed * 5);
    if (CURRENT_MODE === 'TOPDOWN') {
        spawnInterval = Math.max(25, 90 - baseSpeed * 3);
    }
    if(frameCount%spawnInterval===0) obstaclePool.acquire();

    // Update obstacles & collisions
    for(let i=obstaclePool.active.length-1;i>=0;i--) {
        const o=obstaclePool.active[i];
        
        if (CURRENT_MODE === 'LASER') {
            o.y += baseSpeed * 1.3 * dt; // Move down
            // Collision: only hit if cube is NOT jumping (z < 15)
            if(!player.invincible && player.y < o.y + o.height && player.y + player.height > o.y && player.z < 15){
                gameOver(); return;
            }
            if(!o.passed && o.y > player.y + player.height){
                o.passed = true;
                addScore(50); playSfx('score');
            }
            if(o.y > window.innerHeight + 20){ obstaclePool.release(o); }
        } else {
            o.x-=baseSpeed*dt;
            if(!player.invincible&&player.x<o.x+o.width&&player.x+player.width>o.x&&player.y<o.y+o.height&&player.y+player.height>o.y){
                gameOver(); return;
            }
            if(!o.passed&&player.x>o.x+o.width){
                o.passed=true;
                const near=(player.y<o.y+o.height+30&&player.y+player.height>o.y-30);
                if(near){ addScore(50); playSfx('nearmiss'); canvas.classList.add('flash-white'); setTimeout(()=>canvas.classList.remove('flash-white'),200); }
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

    // BG particles
    bgParticles.forEach(p=>{
        p.x+=p.vx*dt-(player.isSwapping?6*dt:0);
        if(p.vx<p.baseVx) p.vx+=0.3*dt;
        if(p.x<0){p.x=window.innerWidth; p.y=Math.random()*window.innerHeight; p.vx=p.baseVx;}
    });
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = score;
    // Show active score multiplier in HUD if > 1
    const mul = EventManager.getScoreMultiplier();
    let mulEl = document.getElementById('hud-multiplier');
    if (mul > 1.0) {
        if (!mulEl) {
            mulEl = document.createElement('div');
            mulEl.id = 'hud-multiplier';
            const sd = document.getElementById('score-display');
            if (sd) sd.appendChild(mulEl);
        }
        mulEl.textContent = '×' + mul.toFixed(1) + ' EVENT';
    } else if (mulEl) {
        mulEl.textContent = '';
    }
}

function draw() {
    const W=window.innerWidth, H=window.innerHeight;
    ctx.clearRect(0,0,W,H);

    // Tunnel lines
    ctx.strokeStyle='#333'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,CEILING); ctx.lineTo(W,CEILING);
    ctx.moveTo(0,FLOOR); ctx.lineTo(W,FLOOR); ctx.stroke();

    // Moving grid
    ctx.strokeStyle='rgba(255,0,60,0.12)'; ctx.lineWidth=1;
    const off=(frameCount*baseSpeed)%50;
    ctx.beginPath();
    for(let i=-off;i<W;i+=50){ ctx.moveTo(i,CEILING); ctx.lineTo(i,FLOOR); }
    for(let j=CEILING;j<FLOOR;j+=50){ ctx.moveTo(0,j); ctx.lineTo(W,j); }
    ctx.stroke();

    // BG particles
    bgParticles.forEach(p=>{
        if (!p.sprite) p.sprite = Math.random()>0.5 ? SPRITES.bgDot1 : SPRITES.bgDot2;
        if (p.sprite) ctx.drawImage(p.sprite,Math.floor(p.x-2),Math.floor(p.y-2));
    });

    // Obstacles
    obstaclePool.active.forEach(o=>{
        if (CURRENT_MODE === 'LASER') {
            // Full-width neon red laser beam
            ctx.fillStyle = '#ff003c';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(o.x, o.y - 4, o.width, o.height + 8);
            ctx.globalAlpha = 1.0;
            ctx.fillRect(o.x, o.y, o.width, o.height);
            // White-hot core
            ctx.fillStyle = 'rgba(255,200,200,0.7)';
            ctx.fillRect(o.x, o.y + 3, o.width, Math.max(o.height - 6, 2));
        } else if (CURRENT_MODE === 'TOPDOWN') {
            ctx.strokeStyle = '#ff003c'; ctx.lineWidth=3;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(o.x - 4, o.y - 4, o.width + 8, o.height + 8);
            ctx.globalAlpha = 1.0;
            ctx.strokeRect(o.x, o.y, o.width, o.height);
        } else {
            if(o.sprite) ctx.drawImage(o.sprite,Math.floor(o.x-15),Math.floor(o.y-15));
            else { ctx.fillStyle='#ff00ff'; ctx.fillRect(o.x,o.y,o.width,o.height); }
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

    // Player
    if(GAME_STATE===STATE.PLAYING||GAME_STATE===STATE.PAUSED) {
        if (CURRENT_MODE === 'TOPDOWN') {
             ctx.fillStyle=player.invincible?'#ffffff':'#ff003c'; 
             ctx.globalAlpha = 0.4;
             ctx.fillRect(player.x - 6, player.y - 6, player.width + 12, player.height + 12);
             ctx.globalAlpha = 1.0;
             ctx.fillRect(player.x,player.y,player.width,player.height);
        } else if (CURRENT_MODE === 'LASER') {
             // Clean sharp cube, lifted by z
             const drawY = player.y - player.z;
             ctx.fillStyle = player.invincible ? '#ffffff' : '#ff003c';
             ctx.fillRect(player.x, drawY, player.width, player.height);
             // Inner highlight
             ctx.fillStyle = 'rgba(255,255,255,0.4)';
             ctx.fillRect(player.x + 7, drawY + 7, 16, 16);
        } else {
            const spr=SPRITES.player;
            if(spr) ctx.drawImage(spr,Math.floor(player.x-15),Math.floor(player.y-15));
            else { ctx.fillStyle=player.invincible?'#ffffff':'#ff003c'; ctx.fillRect(player.x,player.y,player.width,player.height); }
        }
    }

    // Logo Pulse in Menu
    if(GAME_STATE===STATE.MENU) {
        const pulse = 1 + Math.sin(frameCount * 0.05) * 0.05;
        const logo = document.querySelector('.unified-logo');
        if(logo) logo.style.transform = `scale(${pulse})`;
    }
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

function quitToMenu() {
    cancelAnimationFrame(rafId);
    stopDrone();
    GAME_STATE=STATE.MENU;
    hideAllScreens(); hideHUD();
    canvas.classList.remove('aberration');
    document.getElementById('game-container').classList.remove('glitch-shake');
    const sidePills = document.getElementById('event-side-pills');
    if (sidePills) sidePills.style.opacity = '1';
    showScreen('start-screen');
}

function createExplosion(x,y) { for(let i=0;i<25;i++) particlePool.acquire(x,y); }

function gameOver() {
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
    // Show event score bonus note
    const _mul = EventManager.getScoreMultiplier();
    const _ev  = EventManager.getActiveEvent ? EventManager.getActiveEvent() : null;
    let _me = document.getElementById('event-score-note');
    if (!_me) {
        _me = document.createElement('p');
        _me.id = 'event-score-note';
        const statsDiv = document.querySelector('.stats');
        if (statsDiv) statsDiv.appendChild(_me);
    }
    if (_me) {
        if (_mul > 1.0 && _ev) {
            _me.textContent = '×' + _mul.toFixed(1) + ' ' + (_ev.name || 'EVENT') + ' BONUS ACTIVE!';
            _me.style.display = 'block';
        } else { _me.style.display = 'none'; }
    }
    document.getElementById('new-record-badge').style.display=isNew?'block':'none';
    if (_ev && typeof EventPopup !== 'undefined' && EventPopup.trackEventScore) {
        EventPopup.trackEventScore(_ev.id, score);
    }

    hideHUD();
    showScreen('game-over-screen');

        // Show revive button logic (limited in offline mode)
    if (typeof window.offlineGameCount === 'undefined') window.offlineGameCount = 0;
    
    const reviveBtn = document.getElementById('revive-btn');
    
    if (!navigator.onLine) {
        window.offlineGameCount++;
        if (window.offlineGameCount > 3) {
            reviveBtn.style.display = 'none';
        } else {
            reviveBtn.style.display = 'block';
        }
    } else {
        // Online: Always show
        reviveBtn.style.display = 'block';
    }

    if (reviveBtn.style.display !== 'none') {
        reviveBtn.textContent = '\u26A1 REVIVE (WATCH AD)';
        reviveBtn.disabled = false;
    }

    // Show Interstitial Ad every 3 deaths. Delayed 1500ms so game-over screen
    // and revive button render before the ad overlay appears (AdMob policy + UX).
    if (typeof window.deathCount === 'undefined') window.deathCount = 0;
    window.deathCount++;
    if (window.deathCount % 3 === 0) {
        setTimeout(() => { FlutterBridge.showInterstitial(); }, 1500);
    }
}

function revivePlayer() {
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

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
        } else {
            clearInterval(interval);
            countdownEl.remove();
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
    window._freeRevives = 0;
    obstaclePool.releaseAll(); particlePool.releaseAll();
    initBgParticles();
    updateScoreDisplay();
    document.getElementById('game-container').classList.remove('glitch-shake');
    canvas.classList.remove('aberration');
}

function startGame() {
    getAudio(); // unlock AudioContext on user gesture
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) CURRENT_MODE = modeSelect.value;
    
    const sidePills = document.getElementById('event-side-pills');
    if (sidePills) sidePills.style.opacity = '0';

    resetGame();
    hideAllScreens(); showHUD();
    GAME_STATE=STATE.PLAYING;
    cancelAnimationFrame(rafId);
    startDrone();
    startGameLoop();
}

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
function handleInput(yPos) {
    if (GAME_STATE !== STATE.PLAYING) return;
    if (CURRENT_MODE === 'TOPDOWN') {
        player.targetY = yPos;
    } else if (CURRENT_MODE === 'LASER') {
        // Jump only when on ground (z==0)
        if (player.z <= 0) {
            player.zVelocity = 12;
            playSfx('jump');
        }
    } else {
        swapGravity();
    }
}
window.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); handleInput(window.innerHeight/2); }
    if(e.key==='Escape') pauseGame();
});
window.addEventListener('touchstart', e=>{ 
    if(GAME_STATE===STATE.PLAYING&&!e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        handleInput(e.touches[0].clientY);
    }
}, {passive:true});
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
    if(GAME_STATE===STATE.PLAYING && CURRENT_MODE === 'TOPDOWN' && !e.target.closest('button')&&!e.target.closest('.hud-btn')) {
        handleInput(e.touches[0].clientY);
    }
}, {passive:true});
// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
document.getElementById('start-btn')?.addEventListener('click', () => {
    let completed = localStorage.getItem('cubeRunTutorialCompleted') === 'true';
    let skips = parseInt(localStorage.getItem('cubeRunTutorialSkips') || '0');
    if (!completed && skips < 2) {
        hideAllScreens();
        showScreen('tutorial-screen');
    } else {
        startGame();
    }
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
document.getElementById('restart-btn')?.addEventListener('click', startGame);
document.getElementById('pause-btn')?.addEventListener('click', pauseGame);
document.getElementById('resume-btn')?.addEventListener('click', resumeGame);
document.getElementById('quit-btn')?.addEventListener('click', quitToMenu);
document.getElementById('menu-btn-icon')?.addEventListener('click', quitToMenu);
document.getElementById('menu-btn')?.addEventListener('click', quitToMenu);

document.getElementById('settings-btn')?.addEventListener('click', ()=>{
    if(GAME_STATE===STATE.PLAYING) pauseGame();
    showScreen('settings-screen');
});
document.getElementById('settings-from-pause-btn')?.addEventListener('click', ()=>showScreen('settings-screen'));
document.getElementById('settings-back-btn')?.addEventListener('click', ()=>{
    hideScreen('settings-screen');
    if(GAME_STATE===STATE.PAUSED) showScreen('pause-screen');
});

// Revive button
document.getElementById('revive-btn')?.addEventListener('click', async ()=>{
    const btn=document.getElementById('revive-btn');
    btn.disabled=true; btn.textContent='⏳ LOADING...';
    try { 
        await FlutterBridge.showRewarded(); window._pendingRevive = true; 
    }
    catch(e) { 
        btn.textContent = '❌ TRY AGAIN LATER';
        showAdToast('Ad unavailable — tap REVIVE again in a moment.');
        setTimeout(() => {
            btn.textContent = '\u26A1 REVIVE (WATCH AD)';
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
window.addEventListener('load',()=>{ applyApkMode(); setTimeout(applyApkMode,800); });

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
    { value: 'CLASSIC', label: 'CLASSIC (GRAVITY FLIP)' },
    { value: 'LASER', label: 'LASER (JUMP OVER BEAMS)' },
    { value: 'TOPDOWN', label: 'TOP-DOWN (FREE MOVE)' }
];
let currentModeIndex = 0;

function updateModeCarousel() {
    const modeDisplay = document.getElementById('mode-display');
    const modeInput = document.getElementById('mode-select');
    if (modeDisplay && modeInput) {
        modeDisplay.textContent = MODES[currentModeIndex].label;
        modeInput.value = MODES[currentModeIndex].value;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('mode-prev');
    const nextBtn = document.getElementById('mode-next');
    
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

// Offline Logic (Disabled to prevent blocking game on false positives)
/*
let offlineTimer = null;
function handleOffline() {
    console.log('Network went offline.');
    offlineTimer = setTimeout(() => {
        document.getElementById('offline-screen').classList.add('active');
        if(GAME_STATE === STATE.PLAYING) pauseGame();
    }, 5000);
}
function handleOnline() {
    console.log('Network came online.');
    if (offlineTimer) clearTimeout(offlineTimer);
    document.getElementById('offline-screen').classList.remove('active');
}
window.addEventListener('offline', handleOffline);
window.addEventListener('online', handleOnline);
// Initial check
if (!navigator.onLine) handleOffline();
*/

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT MANAGER — Cube Run Live-Ops Event System
// Fetches events_config.json from GitHub Pages, caches to localStorage,
// evaluates active events by UTC date, applies themes and score multipliers.
// ═══════════════════════════════════════════════════════════════════════════════
const EventManager = (function() {
    const CONFIG_URL = 'https://turfin-logic.github.io/CubeRun/events_config.json';
    const CACHE_KEY = 'cr_events_config';
    const CACHE_TS_KEY = 'cr_events_ts';
    const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

    let _config = null;
    let _activeEvent = null;
    let _testDate = null; // Set via EventManager.setTestDate('2026-12-25') for QA

    // ── Utilities ──────────────────────────────────────────────────────────────

    function _now() {
        return _testDate ? new Date(_testDate) : new Date();
    }

    function _isWeekend(date) {
        const d = date || _now();
        const day = d.getUTCDay();
        return day === 0 || day === 6; // 0=Sunday, 6=Saturday
    }

    function _parseUTC(str) {
        // Handles both "2026-12-25" and "2026-12-25T00:00:00Z"
        if (!str) return null;
        return new Date(str.includes('T') ? str : str + 'T00:00:00Z');
    }

    // ── Config Fetching ────────────────────────────────────────────────────────

    async function _fetchConfig() {
        // 1. Try to serve from cache if still fresh
        try {
            const cachedTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);
            const ttl = _config && _config.global_settings && _config.global_settings.cache_ttl_minutes
                ? _config.global_settings.cache_ttl_minutes * 60 * 1000
                : CACHE_TTL_MS;
            if (Date.now() - cachedTs < ttl) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    _config = JSON.parse(cached);
                    return _config;
                }
            }
        } catch(e) { /* cache unreadable, fall through */ }

        // 2. Try network (first relative path, then remote fallback)
        const urlsToTry = ['events_config.json?t=' + Date.now(), CONFIG_URL + '?t=' + Date.now()];
        for (const url of urlsToTry) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                _config = data;
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
                return _config;
            } catch(fetchErr) {
                // Try next url
            }
        }
        console.warn('EventManager: network fetch failed, using cached config.');

        // 3. Fall back to stale cache
        try {
            const stale = localStorage.getItem(CACHE_KEY);
            if (stale) { _config = JSON.parse(stale); return _config; }
        } catch(e) {}

        // 4. No config available — events simply won't run
        _config = null;
        return null;
    }

    // ── Event Evaluation ───────────────────────────────────────────────────────

    function _evaluateActiveEvent(config) {
        if (!config || !Array.isArray(config.events)) return null;
        const now = _now();

        // Check dated events (highest priority, first match wins)
        for (const ev of config.events) {
            if (!ev.active) continue;
            const start = _parseUTC(ev.start_utc);
            const end   = _parseUTC(ev.end_utc);
            if (!start || !end) continue;
            if (now >= start && now <= end) {
                // Handle weekend-only score multipliers
                if (ev.score_multiplier_on_weekends_only && !_isWeekend(now)) {
                    return { ...ev, score_multiplier: 1.0 }; // theme applies, no multiplier
                }
                return ev;
            }
        }

        // Weekend boost (if no themed event active)
        if (config.weekend_boost && config.weekend_boost.active && _isWeekend(now)) {
            return config.weekend_boost;
        }

        return null; // Default — no active event
    }

    // ── Theme Application ─────────────────────────────────────────────────────

    function _applyTheme(event, config) {
        const themeId = (event && event.theme) || 'default';
        const themes = (config && config.themes) || {};
        const theme = themes[themeId] || themes['default'] || {};

        // Store on window so game loop can read particle/trail colors
        EventManager._activeEventObj = event;
        window.CR_EVENT_THEME = {
            id: themeId,
            playerColor:    theme.player_color   || '#00f3ff',
            obstacleColor:  theme.obstacle_color || '#ff003c',
            bgColor:        theme.bg_color       || '#030005',
            particleColors: theme.particle_colors || ['#ff003c', '#7000ff'],
            trailColor:     theme.trail_color    || '#00f3ff',
            uiAccent:       theme.ui_accent      || '#ff003c',
            invertColors:   theme.invert_colors  || false,
            scoreMultiplier: (event && event.score_multiplier) || 1.0
        };

        // Keep game core neon colors authentic
        document.documentElement.style.setProperty('--event-accent', '#ff003c');
    }

    // ── Banner UI ─────────────────────────────────────────────────────────────

    function _updateBanner(event) {
        const banner = document.getElementById('event-banner');
        if (!banner) return;
        if (!event || !event.banner_text) {
            banner.style.display = 'none';
            const _tk = document.getElementById('hud-event-ticker');
            if (_tk) _tk.style.display = 'none';
            return;
        }
        banner.textContent = event.banner_text;
        banner.style.display = 'block';
        // Also update the HUD event ticker (visible during gameplay)
        let ticker = document.getElementById('hud-event-ticker');
        if (ticker) {
            ticker.textContent = event.banner_text;
            ticker.style.color = event.banner_color || 'var(--neon-pink)';
            ticker.style.display = 'block';
        }
        banner.style.background = 'rgba(0,0,0,0.7)';
        banner.style.color = event.banner_color || '#ff003c';
        banner.style.border = '1px solid ' + (event.banner_color || '#ff003c');
        banner.style.borderRadius = '4px';
        banner.style.padding = '6px 14px';
        banner.style.fontSize = '0.85rem';
        banner.style.fontFamily = "Orbitron, monospace";
        banner.style.letterSpacing = '1px';
        banner.style.textAlign = 'center';
        banner.style.margin = '8px auto 0';
        banner.style.maxWidth = '300px';
        banner.style.textShadow = '0 0 8px ' + (event.banner_color || '#ff003c');
        banner.style.animation = 'eventBannerPulse 2s ease-in-out infinite';
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    async function init() {
        try {
            const config = await _fetchConfig();
            if (!config) {
                console.log('EventManager: no config available, using defaults.');
                window.CR_EVENT_THEME = null;
                return;
            }
            _activeEvent = _evaluateActiveEvent(config);
            _applyTheme(_activeEvent, config);
            _updateBanner(_activeEvent);
            // Reinit canvas sprites so gameplay reflects the active event theme
            if (typeof initSprites === 'function') initSprites();


            if (_activeEvent) {
                console.log('EventManager: active event =>', _activeEvent.id,
                    '| theme:', _activeEvent.theme,
                    '| score x' + window.CR_EVENT_THEME.scoreMultiplier);
            } else {
                console.log('EventManager: no active event (default theme).');
            }
        } catch(e) {
            console.warn('EventManager: init error', e);
            window.CR_EVENT_THEME = null;
        }
    }

    function getScoreMultiplier() {
        return (window.CR_EVENT_THEME && window.CR_EVENT_THEME.scoreMultiplier) || 1.0;
    }

    function getActiveEventId() {
        return _activeEvent ? _activeEvent.id : null;
    }

    function getTheme() {
        return window.CR_EVENT_THEME || null;
    }

    // Test mode: EventManager.setTestDate('2026-12-25') to simulate future events
    function setTestDate(dateStr) {
        _testDate = dateStr ? new Date(dateStr) : null;
        console.log('EventManager: test date set to', _testDate || 'REAL TIME');
        // Re-evaluate with new date
        if (_config) {
            _activeEvent = _evaluateActiveEvent(_config);
            _applyTheme(_activeEvent, _config);
            _updateBanner(_activeEvent);
        }
    }

    function getActiveEvent() {
        return _activeEvent || null;
    }

    // Find next upcoming event
    function getNextEvent() {
        if (!_config || !Array.isArray(_config.events)) return null;
        const now = _now();
        let nearest = null;
        let nearestStart = Infinity;
        for (const ev of _config.events) {
            if (!ev.active) continue;
            const start = _parseUTC(ev.start_utc);
            if (!start) continue;
            if (start > now && start.getTime() < nearestStart) {
                nearest = ev;
                nearestStart = start.getTime();
            }
        }
        return nearest;
    }

    function getAllEvents() {
        return (_config && Array.isArray(_config.events)) ? _config.events.filter(e => e.active) : [];
    }

    return { init, getScoreMultiplier, getActiveEventId, getActiveEvent, getNextEvent, getAllEvents, getTheme, setTestDate };
})();

window.EventManager = EventManager;

// Wire score multiplier into the existing score update
// The existing updateScoreDisplay/score increment logic stays intact.
// CR_EVENT_THEME.scoreMultiplier is read at the point of score addition.
// See: function addScore(points) in game loop integration below.
function addScore(points) {
    const multiplier = EventManager.getScoreMultiplier();
    score += Math.round(points * multiplier);
    updateScoreDisplay();
}

// Initialize EventManager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EventManager.init());
} else {
    EventManager.init();
}


// ═══════════════════════════════════════════════════════════════════════════════
// EVENT POPUP SYSTEM — Alien Invasion RPG-style popups
// Shows event announcement on game open, event ended recap, and side pills.
// ═══════════════════════════════════════════════════════════════════════════════

const EventPopup = (function() {
    const SEEN_KEY = 'cr_event_popup_seen';     // sessionStorage: current event seen
    const ENDED_KEY = 'cr_event_ended_seen';    // localStorage: last ended event id
    const BEST_KEY = 'cr_event_best_';          // localStorage: best score per event
    let _countdownInterval = null;
    let _pillInterval = null;

    // ── Emoji map for event themes ──────────────────────────────────────────
    const THEME_EMOJI = {
        halloween: '💀', diwali: '✨', christmas: '🎄', newyear: '🎆',
        lunar: '🧧', valentine: '💜', holi: '🌈', eid: '🌙',
        glitch: '⚡', summer: '☀️', tricolor: '🇮🇳', anniversary: '🏆',
        default: '🎮'
    };

    const THEME_SUBTITLE = {
        halloween: 'HAS STRUCK!', diwali: 'IS HERE!', christmas: 'HAS ARRIVED!',
        newyear: 'HAS BEGUN!', lunar: 'IS HERE!', valentine: 'IS IN THE AIR!',
        holi: 'EXPLODES!', eid: 'IS HERE!', glitch: 'ACTIVATED!',
        summer: 'HAS ARRIVED!', tricolor: 'IS HERE!', anniversary: 'CELEBRATION!',
        default: 'IS LIVE!'
    };

    // ── Time formatting ─────────────────────────────────────────────────────
    function _formatCountdown(ms) {
        if (ms <= 0) return 'ENDED';
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0) return d + 'D ' + h + 'H ' + m + 'M';
        if (h > 0) return h + 'H ' + m + 'M';
        return m + 'M ' + (s % 60) + 'S';
    }

    function _parseUTC(str) {
        if (!str) return null;
        return new Date(str.includes('T') ? str : str + 'T00:00:00Z');
    }

    // ── Show Event Announcement Popup ────────────────────────────────────────
    function showEventPopup(event) {
        if (!event || !event.name) return;

        const themeId = event.theme || 'default';
        const emoji = THEME_EMOJI[themeId] || THEME_EMOJI.default;
        const subtitle = THEME_SUBTITLE[themeId] || THEME_SUBTITLE.default;
        const accent = event.banner_color || '#ff003c';

        // Set popup content
        const iconEl = document.getElementById('event-popup-icon');
        const titleEl = document.getElementById('event-popup-title');
        const subtitleEl = document.getElementById('event-popup-subtitle');
        const mulEl = document.getElementById('event-popup-multiplier');
        const cdEl = document.getElementById('event-popup-countdown');

        if (iconEl) iconEl.textContent = emoji;
        if (titleEl) {
            titleEl.textContent = event.name.toUpperCase();
            titleEl.setAttribute('data-text', event.name.toUpperCase());
        }
        if (subtitleEl) subtitleEl.textContent = subtitle;
        if (mulEl) {
            const mul = event.score_multiplier || 1.0;
            mulEl.textContent = mul > 1 ? '×' + mul.toFixed(1) : 'ACTIVE';
            mulEl.style.color = accent;
            mulEl.style.textShadow = '0 0 20px ' + accent;
        }

        // Set accent color on popup
        document.documentElement.style.setProperty('--event-accent', accent);

        // Live countdown
        if (_countdownInterval) clearInterval(_countdownInterval);
        const endDate = _parseUTC(event.end_utc);
        function updateCountdown() {
            if (!endDate || !cdEl) return;
            const remaining = endDate.getTime() - Date.now();
            cdEl.textContent = _formatCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(_countdownInterval);
                cdEl.textContent = 'ENDED';
            }
        }
        updateCountdown();
        _countdownInterval = setInterval(updateCountdown, 1000);

        // Show popup
        const sidePills = document.getElementById('event-side-pills');
        if (sidePills) sidePills.style.opacity = '0';
        showScreen('event-popup');

        // Mark as seen this session
        try { sessionStorage.setItem(SEEN_KEY, event.id); } catch(e) {}
    }

    // ── Show Event Ended Recap ───────────────────────────────────────────────
    function showEventEnded(event) {
        if (!event || !event.name) return;

        const nameEl = document.getElementById('event-ended-name');
        const bestEl = document.getElementById('event-ended-best');
        const nextEl = document.getElementById('event-ended-next');

        if (nameEl) {
            nameEl.textContent = event.name.toUpperCase();
            nameEl.setAttribute('data-text', event.name.toUpperCase());
        }

        // Best score during event
        const bestKey = BEST_KEY + event.id;
        const best = localStorage.getItem(bestKey) || '0';
        if (bestEl) bestEl.textContent = best;

        // Next event teaser
        const nextEvent = EventManager.getNextEvent ? EventManager.getNextEvent() : null;
        if (nextEl) {
            if (nextEvent) {
                const nextStart = _parseUTC(nextEvent.start_utc);
                const daysUntil = nextStart ? Math.ceil((nextStart.getTime() - Date.now()) / 86400000) : 0;
                nextEl.textContent = 'Next: ' + nextEvent.name + ' in ' + daysUntil + ' days';
            } else {
                nextEl.textContent = 'More events coming soon...';
            }
        }

        const sidePills = document.getElementById('event-side-pills');
        if (sidePills) sidePills.style.opacity = '0';
        showScreen('event-ended-popup');
        try { localStorage.setItem(ENDED_KEY, event.id); } catch(e) {}
    }

    // ── Build Floating Side Pills ────────────────────────────────────────────
    function buildSidePills() {
        const container = document.getElementById('event-side-pills');
        if (!container) return;
        container.innerHTML = '';

        const activeEvent = EventManager.getActiveEvent ? EventManager.getActiveEvent() : null;
        const allEvents = EventManager.getAllEvents ? EventManager.getAllEvents() : [];
        if (!activeEvent && allEvents.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Show active event pill + next 2 upcoming
        const now = Date.now();
        const pills = [];

        // Active event pill
        if (activeEvent && activeEvent.id !== 'weekend_boost') {
            pills.push({ event: activeEvent, type: 'active' });
        }

        // Upcoming events (max 2)
        const upcoming = allEvents.filter(ev => {
            const start = _parseUTC(ev.start_utc);
            return start && start.getTime() > now && ev.id !== 'weekend_boost';
        }).sort((a, b) => {
            return _parseUTC(a.start_utc).getTime() - _parseUTC(b.start_utc).getTime();
        }).slice(0, 2);

        upcoming.forEach(ev => pills.push({ event: ev, type: 'upcoming' }));

        if (pills.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        pills.forEach(({ event: ev, type }) => {
            const pill = document.createElement('div');
            pill.className = 'event-pill';
            const themeId = ev.theme || 'default';
            const accent = ev.banner_color || '#ff003c';
            pill.style.borderColor = accent;
            pill.style.boxShadow = '0 0 10px ' + accent + '40';

            const emoji = THEME_EMOJI[themeId] || THEME_EMOJI.default;
            const iconSpan = document.createElement('span');
            iconSpan.className = 'event-pill-icon';
            iconSpan.textContent = emoji;

            const timerSpan = document.createElement('span');
            timerSpan.className = 'event-pill-timer';
            timerSpan.dataset.eventEnd = ev.end_utc || '';
            timerSpan.dataset.eventStart = ev.start_utc || '';
            timerSpan.dataset.pillType = type;

            // Notification dot for unseen events
            const seenEvents = JSON.parse(localStorage.getItem('cr_pills_seen') || '[]');
            if (!seenEvents.includes(ev.id)) {
                const dot = document.createElement('div');
                dot.className = 'event-pill-dot';
                dot.style.background = accent;
                pill.appendChild(dot);
            }

            pill.appendChild(iconSpan);
            pill.appendChild(timerSpan);

            // Click to show event popup
            pill.addEventListener('click', () => {
                showEventPopup(ev);
                // Mark as seen
                const seen = JSON.parse(localStorage.getItem('cr_pills_seen') || '[]');
                if (!seen.includes(ev.id)) {
                    seen.push(ev.id);
                    localStorage.setItem('cr_pills_seen', JSON.stringify(seen));
                }
                const dot = pill.querySelector('.event-pill-dot');
                if (dot) dot.remove();
            });

            container.appendChild(pill);
        });

        // Update pill timers every second
        if (_pillInterval) clearInterval(_pillInterval);
        _pillInterval = setInterval(() => {
            container.querySelectorAll('.event-pill-timer').forEach(el => {
                const type = el.dataset.pillType;
                const endStr = el.dataset.eventEnd;
                const startStr = el.dataset.eventStart;
                if (type === 'active' && endStr) {
                    const end = new Date(endStr);
                    const remaining = end.getTime() - Date.now();
                    el.textContent = _formatCountdown(remaining);
                } else if (type === 'upcoming' && startStr) {
                    const start = new Date(startStr);
                    const until = start.getTime() - Date.now();
                    el.textContent = 'IN ' + _formatCountdown(until);
                }
            });
        }, 1000);
    }

    // ── Save event best score ────────────────────────────────────────────────
    function trackEventScore(eventId, score) {
        if (!eventId) return;
        const key = BEST_KEY + eventId;
        const prev = parseInt(localStorage.getItem(key) || '0', 10);
        if (score > prev) {
            localStorage.setItem(key, String(score));
        }
    }

    // ── Main init (call after EventManager.init) ────────────────────────────
    function init() {
        const activeEvent = EventManager.getActiveEvent ? EventManager.getActiveEvent() : null;
        const seenId = sessionStorage.getItem(SEEN_KEY);
        const lastEndedId = localStorage.getItem(ENDED_KEY);
        const lastSeenActive = localStorage.getItem('cr_last_active_event');

        // Check if a previously active event has ended (show recap)
        if (lastSeenActive && (!activeEvent || activeEvent.id !== lastSeenActive)) {
            // The previously active event ended
            if (lastEndedId !== lastSeenActive) {
                // We haven't shown the ended popup for this event yet
                const allEvents = EventManager.getAllEvents ? EventManager.getAllEvents() : [];
                const endedEvent = allEvents.find(e => e.id === lastSeenActive);
                if (endedEvent) {
                    setTimeout(() => showEventEnded(endedEvent), 800);
                }
            }
        }

        // Show active event popup if not seen this session
        if (activeEvent && activeEvent.id !== 'weekend_boost' && seenId !== activeEvent.id) {
            setTimeout(() => showEventPopup(activeEvent), 500);
        }

        // Remember current active event
        if (activeEvent && activeEvent.id !== 'weekend_boost') {
            localStorage.setItem('cr_last_active_event', activeEvent.id);
        }

        // Build side pills
        setTimeout(() => buildSidePills(), 300);

        // Wire up continue buttons
        document.getElementById('event-popup-continue')?.addEventListener('click', () => {
            hideScreen('event-popup');
            if (_countdownInterval) clearInterval(_countdownInterval);
            const sidePills = document.getElementById('event-side-pills');
            if (sidePills && GAME_STATE === STATE.MENU) sidePills.style.opacity = '1';
        });
        document.getElementById('event-ended-continue')?.addEventListener('click', () => {
            hideScreen('event-ended-popup');
            const sidePills = document.getElementById('event-side-pills');
            if (sidePills && GAME_STATE === STATE.MENU) sidePills.style.opacity = '1';
        });
    }

    return { init, showEventPopup, showEventEnded, buildSidePills, trackEventScore };
})();

window.EventPopup = EventPopup;

// ── Wire EventPopup.trackEventScore into score additions ─────────────────────
const _origAddScore = addScore;
window.addScore = function(points) {
    _origAddScore(points);
    const evId = EventManager.getActiveEventId ? EventManager.getActiveEventId() : null;
    if (evId) EventPopup.trackEventScore(evId, score);
};

// ═══════════════════════════════════════════════════════════════════════════════
// OPENING LOADING WORKFLOW — Alien Invasion Style
// ═══════════════════════════════════════════════════════════════════════════════
function initLoadingWorkflow() {
    let playerId = localStorage.getItem('cr_player_id');
    if (!playerId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let r1 = '', r2 = '';
        for (let i = 0; i < 6; i++) r1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 4; i++) r2 += chars.charAt(Math.floor(Math.random() * chars.length));
        playerId = 'fROS-' + r1 + '-' + r2;
        localStorage.setItem('cr_player_id', playerId);
    }
    const pidEl = document.getElementById('loading-player-id');
    if (pidEl) pidEl.textContent = 'PlayerId: ' + playerId;

    const bar = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status-text');
    const loadingScreen = document.getElementById('loading-screen');

    let currentPct = 0;
    const stages = [
        { target: 35, text: 'LOADING NEON MATRIX... 35%', delay: 180 },
        { target: 70, text: 'SYNCING 2-YEAR LIVE EVENTS... 70%', delay: 240 },
        { target: 90, text: 'INITIALIZING AD PROTECTION... 90%', delay: 180 },
        { target: 100, text: 'SYSTEM READY! 100%', delay: 150 }
    ];

    let stageIdx = 0;
    function nextStage() {
        if (stageIdx < stages.length) {
            const s = stages[stageIdx];
            currentPct = s.target;
            if (bar) bar.style.width = currentPct + '%';
            if (status) status.textContent = s.text;
            stageIdx++;
            setTimeout(nextStage, s.delay);
        } else {
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.style.transition = 'opacity 0.5s ease';
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.classList.remove('active');
                        loadingScreen.style.display = 'none';

                        // Reveal main start screen
                        showScreen('start-screen');

                        // Now initialize and trigger the Alien Invasion event popup workflow!
                        EventPopup.init();
                    }, 500);
                } else {
                    showScreen('start-screen');
                    EventPopup.init();
                }
            }, 250);
        }
    }
    setTimeout(nextStage, 100);
}

// Start loading workflow on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadingWorkflow);
} else {
    initLoadingWorkflow();
}