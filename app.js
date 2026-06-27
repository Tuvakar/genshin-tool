"use strict";
/* ============================================================
   GENSHIN TOOL — app logic
   Vanilla JS, no framework. All state in localStorage.
   Loaded via plain <script src> (file:// + GitHub Pages compatible).
   ============================================================ */
(function () {

// ---------- Constants ----------
const STORAGE_KEY     = 'genshinTrackerData_v3';
const OLD_STORAGE_KEY = 'genshinTrackerData_v2_stable';
const ITEM_DB_KEY     = 'genshinItemDB_v1';
const MAP_DATA_KEY    = 'genshinMapData_v1';
const THEME_KEY       = 'genshinTheme_v1';
const ACCOUNTS_KEY    = 'genshinAccounts_v1';   // { activeId, list: [{id, name}] }
// Each account's data lives under DATA_PREFIX + accountId.
const DATA_PREFIX     = 'genshinTrackerData_v3_acc_';
// CORS proxies — corsproxy.io first (matches the original working script),
// with fallbacks for when it rate-limits or returns 403.
const CORS_PROXIES = [
    (u) => 'https://corsproxy.io/?' + encodeURIComponent(u),
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.org/?' + encodeURIComponent(u),
    (u) => 'https://thingproxy.freeboard.io/fetch/' + u,
];
const CORS_PROXY = CORS_PROXIES[0];
const STATE_VERSION   = 3;
const PRIMO_PER_PULL  = 160;

const THEMES = {
    Anemo:    { accent:'#4ecdc4', bg:'#14171a', card:'#1d2024', border:'#2a2e33', secondary:'#8b929b', primary:'#f2f4f7' },
    Geo:      { accent:'#f0a500', bg:'#1a1712', card:'#24201a', border:'#332e26', secondary:'#968a78', primary:'#f4f1ea' },
    Electro:  { accent:'#9b59b6', bg:'#171219', card:'#211c24', border:'#2e2633', secondary:'#8b7e95', primary:'#f1ecf4' },
    Dendro:   { accent:'#27ae60', bg:'#121812', card:'#1a211a', border:'#263326', secondary:'#7e9580', primary:'#ecf4ec' },
    Hydro:    { accent:'#2980b9', bg:'#121617', card:'#1a2124', border:'#263033', secondary:'#7e8e95', primary:'#ecf1f4' },
    Pyro:     { accent:'#e74c3c', bg:'#1a1311', card:'#241b18', border:'#332621', secondary:'#95807a', primary:'#f4ece8' },
    Cryo:     { accent:'#85c1e9', bg:'#121617', card:'#1a2024', border:'#262e33', secondary:'#80909a', primary:'#ecf2f4' },
};

const BANNERS = [
    { id:'301', name:'Character Event',  type:'character',  hardPity5:90, softPity5:74, hardPity4:10, has5050:true,  hasFatePoints:false },
    { id:'302', name:'Weapon Event',     type:'weapon',     hardPity5:80, softPity5:63, hardPity4:10, has5050:false, hasFatePoints:true  },
    { id:'200', name:'Standard',         type:'standard',   hardPity5:90, softPity5:74, hardPity4:10, has5050:false, hasFatePoints:false },
    { id:'500', name:'Chronicled Wish',  type:'chronicled', hardPity5:90, softPity5:74, hardPity4:10, has5050:false, hasFatePoints:false },
];

const IMPORT_BANNER_TYPES = [
    { id:'301', name:'Character Event' },
    { id:'302', name:'Weapon Event' },
    { id:'200', name:'Standard' },
    { id:'500', name:'Chronicled Wish' },
    { id:'100', name:'Novice' },
];

const MAP_CATEGORIES = ['chests','quests','oculi','other'];
const MAP_CAT_LABELS = { chests:'Chests', quests:'Quests', oculi:'Oculi', other:'Other' };

const MAP_DATA_FALLBACK = {
    Mondstadt: { chests:1800, quests:1680, oculi:170, other:200 },
    Liyue:     { chests:2700, quests:2160, oculi:300, other:300 },
    Inazuma:   { chests:2160, quests:1800, oculi:180, other:400 },
    Sumeru:    { chests:3240, quests:2520, oculi:270, other:500 },
    Fontaine:  { chests:2880, quests:2160, oculi:220, other:600 },
    Natlan:    { chests:2000, quests:1800, oculi:150, other:400 },
};

const ITEM_DB_FALLBACK = {
    'Alhaitham':5,'Albedo':5,'Aloy':5,'Arataki Itto':5,'Arlecchino':5,'Baizhu':5,'Cyno':5,'Dehya':5,'Diluc':5,'Emilie':5,
    'Eula':5,'Furina':5,'Ganyu':5,'Hu Tao':5,'Jean':5,'Kaedehara Kazuha':5,'Kamisato Ayaka':5,'Kamisato Ayato':5,'Kinich':5,'Klee':5,
    'Mona':5,'Mualani':5,'Nahida':5,'Neuvillette':5,'Nilou':5,'Qiqi':5,'Raiden Shogun':5,'Sangonomiya Kokomi':5,'Shenhe':5,'Sigewinne':5,
    'Tartaglia':5,'Tighnari':5,'Venti':5,'Wanderer':5,'Wriothesley':5,'Xianyun':5,'Xiao':5,'Yae Miko':5,'Yelan':5,'Yoimiya':5,
    'Yumemizuki Mizuki':5,'Zhongli':5,'Clorinde':5,'Chiori':5,'Chasca':5,'Mavuika':5,'Citlali':5,'Xilonen':5,'Skirk':5,'Escoffier':5,
    'Lyney':5,'Navia':5,
    'Amber':4,'Barbara':4,'Beidou':4,'Bennett':4,'Candace':4,'Charlotte':4,'Chongyun':4,'Collei':4,'Diona':4,'Dori':4,
    'Faruzan':4,'Fischl':4,'Freminet':4,'Gaming':4,'Gorou':4,'Kachina':4,'Kaveh':4,'Kirara':4,'Kuki Shinobu':4,'Layla':4,
    'Lynette':4,'Mika':4,'Ningguang':4,'Noelle':4,'Ororon':4,'Razor':4,'Rosaria':4,'Sayu':4,'Sethos':4,'Sucrose':4,
    'Thoma':4,'Xiangling':4,'Xingqiu':4,'Xinyan':4,'Yun Jin':4,'Chevreuse':4,'Kaeya':4,'Lisa':4,'Shikanoin Heizou':4,'Yanfei':4,
    'Kujou Sara':4,
    "Amos\u2019 Bow":5,'Aqua Simulacra':5,'Beacon of the Reed Sea':5,'Calamity Queller':5,"Crimson Moon\u2019s Semblance":5,
    'Elegy for the End':5,'Engulfing Lightning':5,'Everlasting Moonglow':5,'Freedom-Sworn':5,'Haran Geppaku Futsu':5,
    "Hunter\u2019s Path":5,"Jadefall\u2019s Splendor":5,'Key of Khaj-Nisut':5,'Light of Foliar Incision':5,'Lost Prayer to the Sacred Winds':5,
    'Mistsplitter Reforged':5,'Polar Star':5,'Primordial Jade Cutter':5,'Primordial Jade Winged-Spear':5,'Redhorn Stonethresher':5,
    'Skyward Atlas':5,'Skyward Blade':5,'Skyward Harp':5,'Skyward Pride':5,'Skyward Spine':5,'Song of Broken Pines':5,
    'Summit Shaper':5,'The Unforged':5,'Thundering Pulse':5,"Tulaytullah\u2019s Remembrance":5,'Vortex Vanquished':5,
    "Wolf\u2019s Gravestone":5,'Cashflow Supervision':5,"Crane\u2019s Echoing Call":5,'Lumidouce Elegy':5,'Portent of Dawn':5,
    'Silvershower Heartstrings':5,'Splendor of Tranquil Waters':5,"Surf\u2019s Up":5,'Symphonist of Scents':5,'Tome of the Eternal Flow':5,
    'Uraku Misugiri':5,'Peak Patrol Song':5,'A Thousand Blazing Suns':5,'Absolution':5,'Earth Shaker':5,
    'Dragon\u2019s Bane':4,'Eye of Perception':4,'Favonius Codex':4,'Favonius Greatsword':4,'Favonius Lance':4,'Favonius Sword':4,
    'Favonius Warbow':4,'Festering Desire':4,"Lion\u2019s Roar":4,'Rainslasher':4,'Sacrificial Bow':4,'Sacrificial Fragments':4,
    'Sacrificial Greatsword':4,'Sacrificial Sword':4,'The Bell':4,'The Flute':4,'The Stringless':4,'The Widsith':4,
    'Prototype Rancour':4,'Prototype Amber':4,'Prototype Archaic':4,'Prototype Crescent':4,'Prototype Starglitter':4,
    'Mappa Mare':4,'Iron Sting':4,'Whiteblind':4,'Compound Bow':4,'Snow-Tombed Starsilver':4,'The Viridescent Hunt':5,
};

// ---------- State ----------
let state, itemDB = {}, _standardPool = new Set(), _mapData = null;
let _activeTheme = 'Anemo', _customAccent = null, _editMode = false, _gachaSort = 'newest';
let _viewAnimating = false, _resinInterval = null;

function defaultPityState() {
    return {
        '301': { current5:0, current4:0, guaranteed:false },
        '302': { current5:0, current4:0, fatePoints:0 },
        '200': { current5:0, current4:0 },
        '500': { current5:0, current4:0 },
    };
}
function defaultMapCompletion() {
    const m = {}; Object.keys(MAP_DATA_FALLBACK).forEach(n => m[n] = { chests:0, quests:0, oculi:0, other:0 }); return m;
}
function getDefaultState() {
    const now = new Date().toISOString();
    return {
        stateVersion: STATE_VERSION,
        dailyTasks: [
            { name:'Do commission', completed:false, streak:0 },
            { name:'Do event (if any)', completed:false, streak:0, isEvent:true },
            { name:'Artifacts fodder farming route', completed:false, streak:0 },
            { name:'Use all my resin', completed:false, streak:0 },
            { name:'Do battlepass', completed:false, streak:0 },
            { name:'Explore/Chests for 30 mins', completed:false, streak:0 },
            { name:'World quests for friendship', completed:false, streak:0 },
        ],
        weeklyTasks: [
            { name:'Reputation Commissions', completed:false, streak:0 },
            { name:'Weekly Bosses', completed:false, streak:0 },
        ],
        primogemCount:0, primogemGoal:16000, dailyStreak:0,
        lastDailyReset:now, lastWeeklyReset:now,
        gachaLog:null, calendarDisplayYear:new Date().getFullYear(), customDate:null,
        pityState: defaultPityState(),
        userItemOverrides: {},
        mapCompletion: defaultMapCompletion(),
        mapOverrides: {},
        welkinActive:false, otherDailyPrimos:10,
        resin: { current:0, max:160, lastSetAt:now },
    };
}

function migrateV2(v2) {
    const next = getDefaultState();
    if (!v2) return next;
    if (Array.isArray(v2.dailyTasks)) next.dailyTasks = v2.dailyTasks.map(t => ({ name:t.name||'', completed:!!t.completed, streak:t.streak||0, isEvent:!!t.isEvent }));
    if (Array.isArray(v2.weeklyTasks)) next.weeklyTasks = v2.weeklyTasks.map(t => ({ name:t.name||'', completed:!!t.completed, streak:t.streak||0 }));
    if (typeof v2.primogemCount === 'number') next.primogemCount = v2.primogemCount;
    if (typeof v2.primogemGoal === 'number') next.primogemGoal = v2.primogemGoal;
    if (typeof v2.dailyStreak === 'number') next.dailyStreak = v2.dailyStreak;
    if (v2.lastDailyReset) next.lastDailyReset = v2.lastDailyReset;
    if (v2.gachaLog) next.gachaLog = v2.gachaLog;
    if (v2.calendarDisplayYear) next.calendarDisplayYear = v2.calendarDisplayYear;
    if (v2.customDate) next.customDate = v2.customDate;
    next.lastWeeklyReset = v2.lastDailyReset || next.lastWeeklyReset;
    return next;
}

function mergeDefaults(parsed) {
    const def = getDefaultState();
    const merged = Object.assign({}, def, parsed);
    merged.resin = Object.assign({}, def.resin, parsed.resin || {});
    merged.pityState = Object.assign({}, def.pityState, parsed.pityState || {});
    Object.keys(def.pityState).forEach(k => { if (!merged.pityState[k]) merged.pityState[k] = def.pityState[k]; });
    if (!merged.mapCompletion) merged.mapCompletion = def.mapCompletion;
    if (!merged.mapOverrides) merged.mapOverrides = def.mapOverrides;
    Object.keys(def.mapCompletion).forEach(n => { if (!merged.mapCompletion[n]) merged.mapCompletion[n] = { chests:0, quests:0, oculi:0, other:0 }; });
    if (!Array.isArray(merged.dailyTasks) || merged.dailyTasks.length===0) merged.dailyTasks = def.dailyTasks;
    if (!Array.isArray(merged.weeklyTasks) || merged.weeklyTasks.length===0) merged.weeklyTasks = def.weeklyTasks;
    if (typeof merged.calendarDisplayYear !== 'number') merged.calendarDisplayYear = new Date().getFullYear();
    merged.stateVersion = STATE_VERSION;
    return merged;
}

// ---------- Accounts (multi-account support) ----------
function getAccountsIndex() {
    try {
        const raw = localStorage.getItem(ACCOUNTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch(e){}
    // First run: migrate any existing v3 data into a default "Main" account.
    return null;
}
function saveAccountsIndex(idx) {
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(idx)); } catch(e){}
}
function getActiveAccountId() {
    let idx = getAccountsIndex();
    if (idx && idx.activeId) return idx.activeId;
    // Bootstrap: create a default "Main" account and migrate existing data.
    const id = 'main';
    const oldData = localStorage.getItem(STORAGE_KEY);
    if (oldData) {
        localStorage.setItem(DATA_PREFIX + id, oldData);
        localStorage.removeItem(STORAGE_KEY);
    }
    idx = { activeId: id, list: [{ id, name: 'Main' }] };
    saveAccountsIndex(idx);
    return id;
}
function getActiveAccountName() {
    const idx = getAccountsIndex();
    const id = idx ? idx.activeId : getActiveAccountId();
    if (idx) {
        const acc = idx.list.find(a => a.id === id);
        if (acc) return acc.name;
    }
    return 'Main';
}
function accountDataKey() { return DATA_PREFIX + getActiveAccountId(); }

// Switch to a different account (loads its state, re-renders everything).
function switchAccount(accountId) {
    const idx = getAccountsIndex(); if (!idx) return;
    if (!idx.list.find(a => a.id === accountId)) return;
    idx.activeId = accountId;
    saveAccountsIndex(idx);
    loadState();
    deriveStandardPool();
    recomputePityState();
    renderAll();
    renderAccountPill();
}
function createAccount(name) {
    const idx = getAccountsIndex() || { activeId: 'main', list: [{id:'main', name:'Main'}] };
    const id = 'acc_' + Date.now();
    idx.list.push({ id, name: name || ('Account ' + (idx.list.length + 1)) });
    saveAccountsIndex(idx);
    // Initialise this account with a fresh default state.
    const fresh = getDefaultState();
    try { localStorage.setItem(DATA_PREFIX + id, JSON.stringify(fresh)); } catch(e){}
    switchAccount(id);
}
function renameAccount(accountId, newName) {
    const idx = getAccountsIndex(); if (!idx) return;
    const acc = idx.list.find(a => a.id === accountId);
    if (acc) { acc.name = newName || acc.name; saveAccountsIndex(idx); renderAccountPill(); }
}
async function deleteAccount(accountId) {
    const idx = getAccountsIndex(); if (!idx) return;
    if (idx.list.length <= 1) { await showModal({type:'alert',title:'Cannot Delete',message:'You must have at least one account.',confirmText:'OK'}); return; }
    const ok = await showModal({title:'Delete Account',message:'This permanently deletes this account and all its data. Continue?',type:'confirm'});
    if (!ok) return;
    idx.list = idx.list.filter(a => a.id !== accountId);
    try { localStorage.removeItem(DATA_PREFIX + accountId); } catch(e){}
    if (idx.activeId === accountId) idx.activeId = idx.list[0].id;
    saveAccountsIndex(idx);
    loadState();
    deriveStandardPool();
    recomputePityState();
    renderAll();
    renderAccountPill();
}

function loadState() {
    const key = accountDataKey();
    let migrated = false;
    const savedV3 = localStorage.getItem(key);
    if (savedV3) {
        try { state = mergeDefaults(JSON.parse(savedV3)); if (!JSON.parse(savedV3).stateVersion || JSON.parse(savedV3).stateVersion < STATE_VERSION) migrated = true; }
        catch(e) { state = getDefaultState(); }
    } else {
        const savedV2 = localStorage.getItem(OLD_STORAGE_KEY);
        if (savedV2) {
            try { state = migrateV2(JSON.parse(savedV2)); migrated = true; localStorage.removeItem(OLD_STORAGE_KEY); }
            catch(e) { state = getDefaultState(); }
        } else { state = getDefaultState(); }
    }
    if (migrated) saveState();
}
function saveState() { try { localStorage.setItem(accountDataKey(), JSON.stringify(state)); } catch(e) {} }

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const getAppDate = () => state.customDate ? new Date(state.customDate + 'T12:00:00') : new Date();
const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const escHtml = (s) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const escAttr = (s) => String(s).replace(/"/g,'&quot;');
function hexToDim(hex) {
    if (!hex || hex[0]!=='#' || hex.length<7) return hex;
    return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},0.3)`;
}

// ---------- Modal ----------
function showModal(opts) {
    opts = opts || {};
    const modal=$('custom-modal'), title=$('modal-title'), msg=$('modal-message'), input=$('modal-input'), custom=$('modal-custom-content'), cancelB=$('modal-cancel-btn'), confirmB=$('modal-confirm-btn');
    title.textContent = opts.title || '';
    msg.style.display = opts.message ? 'block' : 'none';
    msg.innerHTML = opts.message || '';
    custom.innerHTML = opts.customHtml || '';
    custom.style.display = opts.customHtml ? 'block' : 'none';
    input.style.display = opts.type === 'prompt' ? 'block' : 'none';
    if (opts.type === 'prompt') { input.value = opts.defaultValue || ''; input.placeholder = opts.placeholder || ''; }
    cancelB.style.display = opts.type === 'alert' ? 'none' : 'inline-flex';
    confirmB.textContent = opts.confirmText || 'Confirm';
    modal.classList.add('visible');
    if (opts.type === 'prompt') setTimeout(() => input.focus(), 50);
    return new Promise(resolve => {
        let result = null;
        const cleanup = () => { confirmB.onclick=null; cancelB.onclick=null; modal.classList.remove('visible'); setTimeout(()=>resolve(result),50); };
        confirmB.onclick = () => { result = opts.type==='prompt' ? input.value : true; cleanup(); };
        cancelB.onclick  = () => { result = false; cleanup(); };
    });
}

// ---------- Theme ----------
function applyTheme(themeName, customAccent) {
    const p = THEMES[themeName] || THEMES.Anemo;
    const r = document.documentElement.style;
    r.setProperty('--bg-color', p.bg);
    r.setProperty('--card-color', p.card);
    r.setProperty('--border-color', p.border);
    r.setProperty('--accent', customAccent || p.accent);
    r.setProperty('--accent-dim', hexToDim(customAccent || p.accent));
    r.setProperty('--primary-text', p.primary);
    r.setProperty('--secondary-text', p.secondary);
    const icon = $('header-element-icon');
    if (icon) { icon.style.background = customAccent || p.accent; icon.style.boxShadow = `0 0 0 2px ${p.bg}, 0 0 0 3px ${customAccent || p.accent}`; }
    _activeTheme = themeName; _customAccent = customAccent || null;
}
function loadTheme() {
    let t='Anemo', ca=null;
    try { const s=JSON.parse(localStorage.getItem(THEME_KEY)||'{}'); t=s.theme||t; ca=s.customAccent||null; } catch(e){}
    applyTheme(t, ca);
}
function saveTheme(t, ca) { try { localStorage.setItem(THEME_KEY, JSON.stringify({theme:t, customAccent:ca||null})); } catch(e){} }

// ---------- Floating theme switcher (bottom-right popover) ----------
function buildThemePopover() {
    const grid = $('theme-popover-grid'); if (!grid) return;
    grid.innerHTML = Object.keys(THEMES).map(name => {
        const sel = name === _activeTheme ? 'selected' : '';
        return `<div class="theme-popover-chip ${sel}" data-theme="${name}" title="${name}">
            <span class="theme-popover-swatch" style="background:${THEMES[name].accent}"></span>
            <span class="theme-popover-name">${name}</span>
        </div>`;
    }).join('');
    grid.querySelectorAll('.theme-popover-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const name = chip.dataset.theme;
            applyTheme(name, _customAccent);
            saveTheme(name, _customAccent);
            syncThemePopover();
            syncSettingsThemePicker();
        });
    });
    const accentInput = $('theme-popover-accent');
    if (accentInput) {
        accentInput.value = _customAccent || THEMES[_activeTheme].accent;
        accentInput.addEventListener('input', e => applyTheme(_activeTheme, e.target.value));
        accentInput.addEventListener('change', e => { saveTheme(_activeTheme, e.target.value); syncThemePopover(); syncSettingsThemePicker(); });
    }
    const resetBtn = $('theme-popover-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
        _customAccent = null;
        applyTheme(_activeTheme, null);
        saveTheme(_activeTheme, null);
        syncThemePopover();
        syncSettingsThemePicker();
    });
}
function syncThemePopover() {
    // update selected states + accent dot
    document.querySelectorAll('.theme-popover-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.dataset.theme === _activeTheme);
    });
    const dot = $('theme-fab-dot');
    if (dot) dot.style.background = _customAccent || THEMES[_activeTheme].accent;
    const accentInput = $('theme-popover-accent');
    if (accentInput) accentInput.value = _customAccent || THEMES[_activeTheme].accent;
}
function syncSettingsThemePicker() {
    // if the Settings view is open, refresh its theme chips too
    if ($('view-settings').classList.contains('active')) renderSettings();
}
function initThemeFab() {
    const fab = $('theme-fab'), pop = $('theme-popover');
    if (!fab || !pop) return;
    buildThemePopover();
    syncThemePopover();
    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.classList.toggle('visible');
    });
    // Close popover when clicking outside it
    document.addEventListener('click', (e) => {
        if (!pop.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
            pop.classList.remove('visible');
        }
    });
}

// ---------- Account pill (header) ----------
function renderAccountPill() {
    const name = getActiveAccountName();
    const el = $('header-account-name');
    if (el) el.textContent = name;
    const pill = $('header-account-pill');
    if (pill) {
        // Update tooltip to show account count
        const idx = getAccountsIndex();
        const count = idx ? idx.list.length : 1;
        pill.title = `${name} (${count} account${count===1?'':'s'}) — click to switch`;
    }
}
function initAccountPill() {
    const pill = $('header-account-pill');
    if (!pill) return;
    pill.addEventListener('click', () => showView('view-settings'));
    renderAccountPill();
}

// ---------- Rarity DB ----------
function getItemRarity(name) {
    if (state.userItemOverrides && Object.prototype.hasOwnProperty.call(state.userItemOverrides, name)) return state.userItemOverrides[name];
    if (Object.prototype.hasOwnProperty.call(itemDB, name)) return itemDB[name];
    return null;
}
async function promptUnknownRarity(name) {
    if (state.userItemOverrides && Object.prototype.hasOwnProperty.call(state.userItemOverrides, name)) return state.userItemOverrides[name];
    const result = await showModal({ title:'Unknown Item', message:`We don't recognise "<b>${escHtml(name)}</b>". Is it 4\u2605 or 5\u2605?`, type:'confirm', confirmText:'5\u2605' });
    const rarity = (result === false) ? 4 : 5;
    if (!state.userItemOverrides) state.userItemOverrides = {};
    state.userItemOverrides[name] = rarity;
    saveState();
    return rarity;
}
async function loadItemDB() {
    itemDB = Object.assign({}, ITEM_DB_FALLBACK);
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(ITEM_DB_KEY)||'null'); } catch(e){}
    const TTL = 24*60*60*1000;
    if (cached && cached.fetchedAt && (Date.now()-new Date(cached.fetchedAt).getTime())<TTL && cached.map) {
        Object.assign(itemDB, cached.map); deriveStandardPool(); return;
    }
    try {
        const [charRes, weapRes] = await Promise.all([
            fetch(CORS_PROXY + encodeURIComponent('https://genshin.dev/api/characters')),
            fetch(CORS_PROXY + encodeURIComponent('https://genshin.dev/api/weapons')),
        ]);
        if (!charRes.ok || !weapRes.ok) throw new Error('non-200');
        const chars = await charRes.json(), weapons = await weapRes.json();
        const map = {};
        const cl = Array.isArray(chars) ? chars : (chars.characters||[]);
        cl.forEach(c => { if (typeof c==='string') { map[c]=5; } else if (c&&c.name) map[c.name]=(c.rarity===5||c.rarity==='5')?5:4; });
        const wl = Array.isArray(weapons) ? weapons : (weapons.weapons||[]);
        wl.forEach(w => { if (typeof w==='string') { map[w]=4; } else if (w&&w.name) map[w.name]=(w.rarity===5||w.rarity==='5')?5:4; });
        Object.assign(itemDB, map);
        try { localStorage.setItem(ITEM_DB_KEY, JSON.stringify({map:itemDB, fetchedAt:new Date().toISOString()})); } catch(e){}
    } catch(e) { console.warn('Rarity DB fetch failed, using fallback.', e); }
    deriveStandardPool();
}
function deriveStandardPool() {
    const pool = new Set(['Keqing','Mona','Qiqi','Diluc','Jean','Dehya','Tighnari']);
    if (state.gachaLog && Array.isArray(state.gachaLog.wishes)) {
        state.gachaLog.wishes.filter(w => w.gacha_type==='200' && getItemRarity(w.name)===5).forEach(w => pool.add(w.name));
    }
    _standardPool = pool;
}
function isStandardFiveStar(name) { return _standardPool.has(name); }

// ---------- Pity engine ----------
function estimateFiveStarProb(current5, cfg) {
    if (current5 >= cfg.hardPity5) return 100;
    if (current5 < cfg.softPity5) return 0.6;
    return 0.6 + 6 * (current5 - cfg.softPity5 + 1);
}
function analyzeBannerData(wishes, cfg) {
    if (!wishes || wishes.length===0) return null;
    const oldToNew = [...wishes].reverse();
    let fives=[], fours=[], p5=0, p4=0, guaranteed=false, fatePoints=0;
    oldToNew.forEach(w => {
        p5++; p4++;
        const rarity = getItemRarity(w.name) || parseInt(w.rank_type, 10);
        const pd = { name:w.name, pity:p5, win:null, fatePoints:null, inSoftPity: p5>=cfg.softPity5 };
        if (rarity===5) {
            if (cfg.type==='character') {
                const isLoss = isStandardFiveStar(w.name);
                if (guaranteed) { pd.win=true; guaranteed=false; }
                else if (isLoss) { pd.win=false; guaranteed=true; }
                else { pd.win=true; }
            } else if (cfg.type==='weapon') {
                if (fatePoints>=2) { pd.win=true; fatePoints=0; }
                else { pd.win=false; fatePoints=Math.min(fatePoints+1,2); }
                pd.fatePoints = fatePoints;
            } else { pd.win=true; }
            fives.push(pd); p5=0;
        }
        if (rarity===4) { fours.push(Object.assign({}, w, {pity:p4})); p4=0; }
    });
    const avg = a => a.length ? a.reduce((s,i)=>s+i.pity,0)/a.length : 0;
    let f4c=[], f4w=[];
    if (cfg.type==='character') fours.forEach(s => { if (s.item_type==='Character') f4c.push(s); else f4w.push(s); });
    const wins = fives.filter(s=>s.win).length, losses = fives.filter(s=>!s.win).length;
    return {
        totalWishes: wishes.length,
        five: { list:fives.slice().reverse(), total:fives.length, avgPity:avg(fives), percent:(fives.length/wishes.length)*100, wins, losses, winRate:(wins+losses)>0?(wins/(wins+losses))*100:0 },
        four: { list:fours.slice().reverse(), total:fours.length, avgPity:avg(fours), percent:(fours.length/wishes.length)*100, chars:{total:f4c.length,avgPity:avg(f4c),percent:(f4c.length/wishes.length)*100}, weapons:{total:f4w.length,avgPity:avg(f4w),percent:(f4w.length/wishes.length)*100} },
        pity: { current5:p5, current4:p4, guaranteed, fatePoints },
    };
}
function recomputePityState() {
    const wishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes : [];
    const next = {};
    BANNERS.forEach(b => {
        const bw = wishes.filter(w => w.gacha_type===b.id);
        const s = analyzeBannerData(bw, b);
        if (s) {
            if (b.type==='character') next[b.id]={current5:s.pity.current5,current4:s.pity.current4,guaranteed:s.pity.guaranteed};
            else if (b.type==='weapon') next[b.id]={current5:s.pity.current5,current4:s.pity.current4,fatePoints:s.pity.fatePoints};
            else next[b.id]={current5:s.pity.current5,current4:s.pity.current4};
        } else {
            if (b.type==='character') next[b.id]={current5:0,current4:0,guaranteed:false};
            else if (b.type==='weapon') next[b.id]={current5:0,current4:0,fatePoints:0};
            else next[b.id]={current5:0,current4:0};
        }
    });
    state.pityState = next; saveState();
}
async function checkUnknownItems() {
    const log = state.gachaLog; if (!log || !log.wishes) return;
    const seen = new Set(), unknowns = [];
    log.wishes.forEach(w => {
        if (seen.has(w.name)) return; seen.add(w.name);
        const r = getItemRarity(w.name);
        if (r!==4 && r!==5) {
            const rank = parseInt(w.rank_type,10);
            if (rank===4||rank===5) { if(!state.userItemOverrides) state.userItemOverrides={}; if(!Object.prototype.hasOwnProperty.call(state.userItemOverrides,w.name)) state.userItemOverrides[w.name]=rank; }
            else unknowns.push(w.name);
        }
    });
    for (const n of unknowns) await promptUnknownRarity(n);
    deriveStandardPool(); recomputePityState();
}

// ---------- Resin ----------
function getCurrentResin() {
    const r = state.resin; if (!r || !r.lastSetAt) return r ? r.current : 0;
    const elapsedMin = (Date.now()-new Date(r.lastSetAt).getTime())/1000/60;
    return Math.min((r.current||0)+Math.floor(elapsedMin/8), r.max||160);
}
function timeToFullResin() {
    const r = state.resin, cur = getCurrentResin(), max = r.max||160;
    if (cur>=max) return 'Full';
    const needed = max-cur;
    const minsNeeded = needed*8 - (Math.floor((Date.now()-new Date(r.lastSetAt).getTime())/1000/60)%8);
    return `Full in ${Math.floor(minsNeeded/60)}h ${minsNeeded%60}m`;
}
async function openSetResin() {
    const v = await showModal({ type:'prompt', title:'Set Current Resin', message:'Enter your current resin from the game.', defaultValue:String(getCurrentResin()), placeholder:'0 - 160' });
    if (v===false) return;
    const n = parseInt(v,10);
    if (isNaN(n)||n<0) { await showModal({type:'alert',title:'Invalid Input',message:'Please enter a valid number.',confirmText:'OK'}); return; }
    state.resin.current = Math.min(n, state.resin.max||160);
    state.resin.lastSetAt = new Date().toISOString();
    saveState(); renderResinWidget(); renderStatusBar();
}
function renderResinWidget() {
    const el = $('resin-widget'); if (!el) return;
    const cur = getCurrentResin(), max = state.resin.max||160, pct = (cur/max)*100;
    el.innerHTML = `<div class="resin-display"><span class="resin-value">${cur}<span class="resin-max"> / ${max}</span></span></div><div class="resin-bar-wrap"><div class="resin-bar"><div class="resin-bar-fill" style="width:${pct}%"></div></div><div class="resin-time">${timeToFullResin()}</div></div><button class="btn btn-secondary" id="set-resin-btn">Set Resin</button>`;
    const b = $('set-resin-btn'); if (b) b.addEventListener('click', openSetResin);
}
function startResinTicker() {
    if (_resinInterval) clearInterval(_resinInterval);
    _resinInterval = setInterval(() => { renderResinWidget(); renderStatusBar(); }, 60000);
}

// ---------- Reset logic ----------
function getLastDailyResetUTC() {
    const now = new Date();
    const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0, 0));
    if (reset > now) reset.setUTCDate(reset.getUTCDate()-1);
    return reset;
}
function getLastWeeklyResetUTC() {
    const now = new Date();
    const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0, 0));
    const day = reset.getUTCDay();
    const diff = (day===0) ? 6 : (day-1);
    reset.setUTCDate(reset.getUTCDate()-diff);
    if (reset > now) reset.setUTCDate(reset.getUTCDate()-7);
    return reset;
}
function daysUntilWeeklyReset() {
    const next = new Date(getLastWeeklyResetUTC().getTime()+7*24*60*60*1000);
    return Math.max(0, Math.ceil((next-Date.now())/(24*60*60*1000)));
}
async function performDailyReset(isAuto) {
    const wasPerfect = state.dailyTasks.every(t => t.completed);
    if (wasPerfect) state.dailyStreak++; else state.dailyStreak = 0;
    state.dailyTasks.forEach(t => { t.streak = t.completed ? (t.streak||0)+1 : 0; t.completed = false; });
    state.lastDailyReset = new Date().toISOString();
    const lastW = state.lastWeeklyReset ? new Date(state.lastWeeklyReset) : new Date(0);
    if (getLastWeeklyResetUTC() > lastW) {
        state.weeklyTasks.forEach(t => { t.streak = t.completed ? (t.streak||0)+1 : 0; t.completed = false; });
        state.lastWeeklyReset = getLastWeeklyResetUTC().toISOString();
    }
    saveState(); renderAll();
    if (!isAuto) await showModal({type:'alert',title:'Reset Complete',message:'Daily and weekly tasks have been reset.',confirmText:'OK'});
}
async function checkForAutomaticResets() {
    const lastD = state.lastDailyReset ? new Date(state.lastDailyReset) : new Date(0);
    if (getLastDailyResetUTC() > lastD) await performDailyReset(true);
}

// ---------- Tasks ----------
function renderTasks() {
    const el = $('view-tasks'); if (!el) return;
    el.innerHTML = `
        <div class="single-column-view" style="max-width:820px;margin:0 auto 20px auto;">
            <div class="resin-widget" id="resin-widget"></div>
        </div>
        <div class="app-layout">
            <div class="layout-column" style="flex:1;min-width:300px;">
                <h2>Daily Tasks <span class="streak-counter" id="daily-edit-toggle-wrap"></span></h2>
                <ul id="daily-tasks-list" class="task-list"></ul>
                <div class="task-add-row" id="daily-add-row">
                    <input type="text" class="task-name-input" id="daily-new-name" placeholder="New daily task...">
                    <button class="btn btn-primary" id="daily-add-btn">Add</button>
                </div>
            </div>
            <div class="layout-column" style="flex:1;min-width:300px;">
                <h2>Weekly Tasks <span class="streak-counter" id="weekly-reset-counter"></span></h2>
                <ul id="weekly-tasks-list" class="task-list"></ul>
                <div class="task-add-row" id="weekly-add-row">
                    <input type="text" class="task-name-input" id="weekly-new-name" placeholder="New weekly task...">
                    <button class="btn btn-primary" id="weekly-add-btn">Add</button>
                </div>
            </div>
        </div>`;
    const wrap = $('daily-edit-toggle-wrap');
    if (wrap) {
        wrap.innerHTML = `<button class="btn-icon" id="edit-tasks-toggle" title="Edit tasks">${pencilSvg()}</button>`;
        const tgl = $('edit-tasks-toggle');
        if (tgl) {
            tgl.addEventListener('click', () => {
                _editMode = !_editMode;
                document.body.setAttribute('data-edit-tasks', String(_editMode));
                tgl.style.color = _editMode ? 'var(--accent)' : '';
                tgl.style.borderColor = _editMode ? 'var(--accent)' : '';
                renderTaskLists();
            });
            if (_editMode) { document.body.setAttribute('data-edit-tasks','true'); tgl.style.color='var(--accent)'; tgl.style.borderColor='var(--accent)'; }
        }
    }
    renderTaskLists(); renderResinWidget();
    $('daily-add-btn').addEventListener('click', () => addTask('daily'));
    $('weekly-add-btn').addEventListener('click', () => addTask('weekly'));
    $('daily-new-name').addEventListener('keydown', e => { if (e.key==='Enter') addTask('daily'); });
    $('weekly-new-name').addEventListener('keydown', e => { if (e.key==='Enter') addTask('weekly'); });
    const d = daysUntilWeeklyReset();
    $('weekly-reset-counter').textContent = `Reset in: ${d} ${d===1?'day':'days'}`;
}
function renderTaskLists() {
    renderList($('daily-tasks-list'), state.dailyTasks, 'daily');
    renderList($('weekly-tasks-list'), state.weeklyTasks, 'weekly');
}
function renderList(listEl, data, type) {
    if (!listEl) return;
    listEl.innerHTML = '';
    data.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.isEvent?'is-event':''} ${task.completed?'locked':''}`;
        const nameHtml = _editMode
            ? `<input type="text" class="task-name-input" value="${escAttr(task.name)}" data-type="${type}" data-index="${index}">`
            : `<label>${escHtml(task.name)}</label>`;
        const streakHtml = `<span class="streak-counter">Streak: ${task.streak||0}</span>`;
        const checkboxHtml = task.isEvent
            ? `<div class="fake-checkbox ${task.completed?'completed':''}" data-type="${type}" data-index="${index}"></div>`
            : `<input type="checkbox" data-type="${type}" data-index="${index}" ${task.completed?'checked':''}>`;
        const editControls = type==='daily'
            ? `<span class="task-edit-controls"><label class="task-event-flag"><input type="checkbox" data-flag="event" data-index="${index}" ${task.isEvent?'checked':''}>Event</label><button class="btn-icon" data-action="delete" data-index="${index}" title="Delete">${trashSvg()}</button></span>`
            : `<span class="task-edit-controls"><button class="btn-icon" data-action="delete" data-index="${index}" title="Delete">${trashSvg()}</button></span>`;
        li.innerHTML = checkboxHtml + nameHtml + streakHtml + editControls;
        listEl.appendChild(li);
    });
    listEl.querySelectorAll('input[type="checkbox"]:not([data-flag])').forEach(cb => {
        cb.addEventListener('change', e => { if (!e.target.checked) return; toggleTask(e.target.dataset.type, parseInt(e.target.dataset.index,10)); });
    });
    listEl.querySelectorAll('.fake-checkbox').forEach(fc => {
        fc.addEventListener('click', e => { if (_editMode) return; handleEventTaskClick(e.target.dataset.type, parseInt(e.target.dataset.index,10)); });
    });
    listEl.querySelectorAll('input.task-name-input').forEach(inp => {
        inp.addEventListener('change', e => {
            const t=e.target.dataset.type, i=parseInt(e.target.dataset.index,10);
            const list = t==='daily'?state.dailyTasks:state.weeklyTasks;
            list[i].name = e.target.value; saveState();
        });
    });
    listEl.querySelectorAll('input[data-flag="event"]').forEach(cb => {
        cb.addEventListener('change', e => { state.dailyTasks[parseInt(e.target.dataset.index,10)].isEvent = e.target.checked; saveState(); renderTaskLists(); });
    });
    listEl.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', e => {
            const i = parseInt(e.target.closest('button').dataset.index,10);
            const list = type==='daily'?state.dailyTasks:state.weeklyTasks;
            list.splice(i,1); saveState(); renderTaskLists();
        });
    });
}
function addTask(type) {
    const inp = $(type+'-new-name'); if (!inp || !inp.value.trim()) return;
    const list = type==='daily'?state.dailyTasks:state.weeklyTasks;
    list.push({ name:inp.value.trim(), completed:false, streak:0 });
    inp.value=''; saveState(); renderTaskLists();
}
async function toggleTask(type, index) {
    const list = type==='daily'?state.dailyTasks:state.weeklyTasks;
    const task = list[index]; if (!task || task.completed) return;
    if (type==='daily' && task.name.toLowerCase().includes('commission')) {
        state.primogemCount += 60;
        await showModal({type:'alert',title:'Primogems Added!',message:'+60 Primogems from daily commissions have been added.',confirmText:'OK'});
    }
    task.completed = true; saveState(); renderTasks(); renderPrimos(); renderStatusBar();
}
async function handleEventTaskClick(type, index) {
    const task = state[type==='daily'?'dailyTasks':'weeklyTasks'][index];
    if (!task || task.completed) return;
    const v = await showModal({type:'prompt',title:'Event Primogems',message:'How many Primogems did you earn?',placeholder:'e.g., 420'});
    if (v===false) return;
    const n = parseInt(v,10);
    if (!isNaN(n) && n>=0) { state.primogemCount += n; task.completed = true; saveState(); renderTasks(); renderPrimos(); renderStatusBar(); }
    else if (v) await showModal({type:'alert',title:'Invalid Input',message:'Please enter a valid number.',confirmText:'OK'});
}

// ---------- Gacha ----------
const PS_SCRIPT = `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex "&{$((New-Object System.Net.WebClient).DownloadString('https://gist.githubusercontent.com/Tuvakar/5433a3d7cd9f563e43a71ab574dd25e1/raw/getlink-genshintool.ps1'))} global"`;

// Sort modes for the 5★ pull list.
const GACHA_SORT_OPTIONS = [
    { id: 'newest',  label: 'Newest first' },
    { id: 'oldest',  label: 'Oldest first' },
    { id: 'pity-hi', label: 'Pity: High \u2192 Low' },
    { id: 'pity-lo', label: 'Pity: Low \u2192 High' },
    { id: 'wins',    label: 'Wins first' },
    { id: 'losses',  label: 'Losses first' },
    { id: 'name',    label: 'Name (A\u2013Z)' },
];

// Returns a NEW sorted array (does not mutate the input).
function sortPulls(list, mode) {
    const arr = list.slice();
    switch (mode) {
        case 'oldest':  return arr.sort((a,b) => new Date(a.time) - new Date(b.time));
        case 'newest':  return arr.sort((a,b) => new Date(b.time) - new Date(a.time));
        case 'pity-hi': return arr.sort((a,b) => b.pity - a.pity);
        case 'pity-lo': return arr.sort((a,b) => a.pity - b.pity);
        case 'wins':    return arr.sort((a,b) => (a.win===b.win)?0:(a.win?-1:1));
        case 'losses':  return arr.sort((a,b) => (a.win===b.win)?0:(a.win?1:-1));
        case 'name':    return arr.sort((a,b) => a.name.localeCompare(b.name));
        default:        return arr;
    }
}

// Re-render only the pulls container for one banner card (keeps the sort dropdown stable).
function rerenderPulls(bannerId) {
    const cfg = BANNERS.find(b => b.id === bannerId); if (!cfg) return;
    const allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes : [];
    const bw = allWishes.filter(w => w.gacha_type === bannerId);
    const s = analyzeBannerData(bw, cfg); if (!s) return;
    const wrap = document.querySelector(`[data-pulls-banner="${bannerId}"]`);
    if (!wrap) return;
    const pityCls = p => p>=74?'pity-high':p<=20?'pity-low':'pity-mid';
    const sorted = sortPulls(s.five.list, _gachaSort);
    wrap.innerHTML = sorted.map(p => {
        const rarity = getItemRarity(p.name) || 5;
        const rarityTag = rarity === 5 ? '<span class="pull-rarity gold">5\u2605</span>' : '<span class="pull-rarity">5\u2605?</span>';
        const winTag = p.win===true ? '<span class="pull-tag win">WIN</span>' : (p.win===false ? '<span class="pull-tag loss">LOSS</span>' : '');
        const date = p.time ? new Date(p.time).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }) : '';
        return `<div class="gacha-pull ${p.win?'win':'loss'}"><span class="pull-name">${escHtml(p.name)}</span>${rarityTag}${winTag}<span class="pull-date">${date}</span><span class="pity-value ${pityCls(p.pity)}">${p.pity}</span></div>`;
    }).join('');
}

function renderGachaStats() {
    const view = $('view-gacha'); if (!view) return;
    const psEsc = PS_SCRIPT.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    view.innerHTML = `
        <div class="single-column-view">
            <h2 style="text-align:center;">Gacha Log Analyzer</h2>
            <details class="instructions-container"><summary>How to get your wish URL</summary>
                <div style="padding:0 16px 16px;">
                    <ol style="padding-left:20px;margin:0;line-height:1.6;">
                        <li>Open Genshin Impact on your PC.</li>
                        <li>Open the Wish History in the game and wait for it to fully load.</li>
                        <li>Press the START key, search for "PowerShell", and open it.</li>
                        <li>Copy &amp; paste the script below into PowerShell:</li>
                    </ol>
                    <div class="code-block-wrapper"><pre id="powershell-script">${psEsc}</pre><button id="copy-script-btn" class="btn btn-primary">Copy</button></div>
                    <ol start="5" style="padding-left:20px;margin-top:10px;line-height:1.6;">
                        <li>Press ENTER. The link will be copied to your clipboard.</li>
                        <li>Click the button below and paste the link.</li>
                    </ol>
                </div>
            </details>
            <div class="controls-group" style="max-width:400px;margin:0 auto 10px auto;">
                <button id="import-gacha-btn" class="btn btn-action">Import Gacha Log</button>
            </div>
            <div id="gacha-last-import" class="last-import-row"></div>
            <div id="gacha-stats-container"></div>
        </div>`;
    $('copy-script-btn').addEventListener('click', () => {
        navigator.clipboard.writeText($('powershell-script').textContent).then(() => {
            const b = $('copy-script-btn'); b.textContent='Copied!'; setTimeout(()=>b.textContent='Copy',2000);
        }).catch(()=>{});
    });
    $('import-gacha-btn').addEventListener('click', openGachaImport);
    const lastImp = $('gacha-last-import');
    const li = state.gachaLog && state.gachaLog.lastImport;
    if (li) {
        const mins = Math.floor((Date.now()-new Date(li).getTime())/60000);
        let txt = mins<1?'just now':mins<60?`${mins} minute${mins===1?'':'s'} ago`:mins<1440?`${Math.floor(mins/60)} hour${Math.floor(mins/60)===1?'':'s'} ago`:new Date(li).toLocaleDateString();
        lastImp.innerHTML = `Last imported: ${txt} <button class="btn-icon" id="gacha-reimport" title="Re-import">${reimportSvg()}</button>`;
        $('gacha-reimport').addEventListener('click', openGachaImport);
    }
    const container = $('gacha-stats-container');
    if (!state.gachaLog || !state.gachaLog.wishes || state.gachaLog.wishes.length===0) {
        container.innerHTML = `<p class="import-status">No gacha data found. Please import your log.</p>`;
        return;
    }
    const allWishes = state.gachaLog.wishes;
    const primoIcon = `<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:var(--light-blue);vertical-align:-0.15em;margin-right:5px;"><path d="M12,1L9,9L1,12L9,15L12,23L15,15L23,12L15,9L12,1Z"/></svg>`;
    const f = (n,d) => (n||0).toFixed(d==null?2:d);
    const pityCls = p => p>=74?'pity-high':p<=20?'pity-low':'pity-mid';
    let html = '<div class="gacha-view-layout">';
    BANNERS.forEach(cfg => {
        const bw = allWishes.filter(w => w.gacha_type===cfg.id);
        const s = analyzeBannerData(bw, cfg);
        if (!s) { html += emptyBannerCard(cfg); return; }
        const totalPrimos = (s.totalWishes*PRIMO_PER_PULL).toLocaleString();
        const inSoft = s.pity.current5 >= cfg.softPity5;
        const prob = estimateFiveStarProb(s.pity.current5, cfg);
        let details = '<div class="gacha-details-grid">';
        details += `<div class="gacha-grid-header"></div><div class="gacha-grid-header">Total</div><div class="gacha-grid-header">Percent</div><div class="gacha-grid-header">Pity AVG</div>`;
        details += `<div class="gacha-grid-label" style="color:var(--gold)">5 \u2605</div><div class="gacha-grid-value gold">${s.five.total}</div><div class="gacha-grid-value">${f(s.five.percent,2)}%</div><div class="gacha-grid-value gold">${f(s.five.avgPity,1)}</div>`;
        if (cfg.type==='character' && s.five.total>0) details += `<div class="gacha-grid-label indented">\u21B3 Win 50/50</div><div class="gacha-grid-value">${s.five.wins}</div><div class="gacha-grid-value">${f(s.five.winRate,1)}%</div><div class="gacha-grid-value">-</div>`;
        details += `<div class="gacha-grid-label" style="color:var(--purple)">4 \u2605</div><div class="gacha-grid-value purple">${s.four.total}</div><div class="gacha-grid-value">${f(s.four.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.avgPity,2)}</div>`;
        if (cfg.type==='character' && s.four.total>0) {
            details += `<div class="gacha-grid-label indented">\u21B3 Character</div><div class="gacha-grid-value">${s.four.chars.total}</div><div class="gacha-grid-value">${f(s.four.chars.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.chars.avgPity,2)}</div>`;
            details += `<div class="gacha-grid-label indented">\u21B3 Weapon</div><div class="gacha-grid-value">${s.four.weapons.total}</div><div class="gacha-grid-value">${f(s.four.weapons.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.weapons.avgPity,2)}</div>`;
        }
        details += '</div>';
        if (s.five.list.length>0) {
            const opts = GACHA_SORT_OPTIONS.map(o => `<option value="${o.id}" ${o.id===_gachaSort?'selected':''}>${o.label}</option>`).join('');
            const sorted = sortPulls(s.five.list, _gachaSort);
            const pullsHtml = sorted.map(p => {
                const rarity = getItemRarity(p.name) || 5;
                const rarityTag = rarity === 5 ? '<span class="pull-rarity gold">5\u2605</span>' : '<span class="pull-rarity">5\u2605?</span>';
                const winTag = p.win===true ? '<span class="pull-tag win">WIN</span>' : (p.win===false ? '<span class="pull-tag loss">LOSS</span>' : '');
                const date = p.time ? new Date(p.time).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }) : '';
                return `<div class="gacha-pull ${p.win?'win':'loss'}"><span class="pull-name">${escHtml(p.name)}</span>${rarityTag}${winTag}<span class="pull-date">${date}</span><span class="pity-value ${pityCls(p.pity)}">${p.pity}</span></div>`;
            }).join('');
            details += `<div class="gacha-pulls-header"><label class="pull-sort-label">Sort 5\u2605 pulls: <select class="pull-sort" data-banner="${cfg.id}">${opts}</select></label><span class="pull-count-text">${s.five.list.length} total</span></div><div class="gacha-pulls-container" data-pulls-banner="${cfg.id}">${pullsHtml}</div>`;
        }
        let guarLine = `Guaranteed at ${cfg.hardPity5}`;
        if (cfg.type==='character') guarLine = s.pity.guaranteed ? 'Next 5\u2605 guaranteed featured' : '50/50 active';
        else if (cfg.type==='weapon') guarLine = `Fate Points: ${s.pity.fatePoints}/2`;
        else if (cfg.type==='chronicled') guarLine = 'Every 5\u2605 guaranteed featured';
        let fateDots = '';
        if (cfg.hasFatePoints) {
            const fp = s.pity.fatePoints||0; let dots='';
            for (let i=0;i<3;i++) dots += `<span class="fate-dot ${(i<fp||fp>=2)?'filled':''}"></span>`;
            fateDots = `<div class="fate-points-row" title="Fate Points: earn one per 5\u2605 loss. At 2 points, the next 5\u2605 is guaranteed featured.">${dots} Fate Points</div>`;
        }
        const softCls = inSoft?'soft-pity':'';
        html += `<div class="gacha-banner-card">
            <h3>${cfg.name}</h3>
            <div class="pity-block"><div class="pity-info"><span class="pity-title">Lifetime Pulls</span><span class="pity-guarantee">${primoIcon} ${totalPrimos}</span></div><div class="pity-value-display lifetime">${s.totalWishes}</div></div>
            <div class="pity-block"><div class="pity-info"><span class="pity-title">5\u2605 Pity</span><span class="pity-guarantee ${inSoft?'soft-pity-active':''}">${inSoft?'Soft pity active':guarLine}</span>${fateDots}</div><div class="pity-value-display rarity-5 ${softCls}">${s.pity.current5}</div></div>
            <div class="probability-row">~${prob.toFixed(1)}% chance next pull is 5\u2605</div>
            <div class="pity-block"><div class="pity-info"><span class="pity-title">4\u2605 Pity</span><span class="pity-guarantee">Guaranteed at ${cfg.hardPity4}</span></div><div class="pity-value-display rarity-4">${s.pity.current4}</div></div>
            <details class="gacha-details-wrapper"><summary>Show Full Stats</summary><div class="gacha-details-content">${details}</div></details>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    // Bind sort dropdowns — re-render only that banner's pulls (in-place, no full rebuild).
    container.querySelectorAll('.pull-sort').forEach(sel => {
        sel.addEventListener('change', (e) => {
            _gachaSort = e.target.value;
            // update all sort dropdowns to stay in sync across banners
            container.querySelectorAll('.pull-sort').forEach(s => { if (s !== e.target) s.value = _gachaSort; });
            BANNERS.forEach(b => rerenderPulls(b.id));
        });
    });
}
function emptyBannerCard(cfg) {
    const note = cfg.type==='chronicled'?'Every 5\u2605 guaranteed featured':'No pulls yet';
    return `<div class="gacha-banner-card"><h3>${cfg.name}</h3>
        <div class="pity-block"><div class="pity-info"><span class="pity-title">Lifetime Pulls</span></div><div class="pity-value-display lifetime">0</div></div>
        <div class="pity-block"><div class="pity-info"><span class="pity-title">5\u2605 Pity</span><span class="pity-guarantee">${note}</span></div><div class="pity-value-display rarity-5">0</div></div>
        <div class="probability-row">~0.6% chance next pull is 5\u2605</div>
        <div class="pity-block"><div class="pity-info"><span class="pity-title">4\u2605 Pity</span><span class="pity-guarantee">Guaranteed at ${cfg.hardPity4}</span></div><div class="pity-value-display rarity-4">0</div></div></div>`;
}
async function openGachaImport() {
    const url = await showModal({type:'prompt',title:'Import Gacha Log',message:'Please paste your full gacha log URL.',placeholder:'https://...'});
    if (url) { state.calendarDisplayYear = new Date().getFullYear(); saveState(); await handleGachaImport(url); }
}
async function handleGachaImport(url) {
    const container = $('gacha-stats-container');
    // Helper to render the animated importing status (spinner + text + shimmer bar).
    function renderImportStatus(text) {
        if (!container) return;
        container.innerHTML = `<p class="import-status"><span class="import-spinner"></span><span class="import-text" id="gacha-import-status">${text}</span><span class="import-progress"></span></p>`;
    }
    renderImportStatus('Starting import...');
    let allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes.slice() : [];
    const existingIds = new Set(allWishes.map(w => w.id));

    function setStatus(text) {
        const el = $('gacha-import-status'); if (el) el.textContent = text;
    }

    // Fetch with proxy fallback. Tries each proxy in order until one returns valid
    // wish data. Mirrors the original script's tolerance: a non-zero retcode just
    // stops that banner (returns null = break), it does NOT throw an error.
    async function fetchWithRetry(targetUrl, label) {
        const maxAttempts = CORS_PROXIES.length;
        let lastErr = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const proxyIdx = (attempt - 1) % CORS_PROXIES.length;
            const proxyUrl = CORS_PROXIES[proxyIdx](targetUrl);
            const proxyName = ['corsproxy.io', 'allorigins.win', 'codetabs.com', 'corsproxy.org', 'thingproxy'][proxyIdx] || ('proxy ' + (proxyIdx + 1));
            try {
                setStatus(`${label}${attempt > 1 ? ` (fallback ${attempt}/${maxAttempts}: ${proxyName})` : ` (via ${proxyName})`}...`);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                // Match original behaviour: bad retcode => stop this banner (NOT an error).
                if (data.retcode !== 0) return null;
                return data;
            } catch (e) {
                lastErr = e;
                if (attempt < maxAttempts) {
                    setStatus(`${label} — ${proxyName} failed (${e.message}), trying next proxy...`);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }
        throw new Error(`${label} failed via all proxies (${lastErr ? lastErr.message : 'unknown'}). You may be rate-limited; wait a minute and try again.`);
    }

    try {
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        const baseParams = new URLSearchParams(urlObj.search);
        for (const banner of IMPORT_BANNER_TYPES) {
            let endId='0', page=1, foundExisting=false;
            while (!foundExisting) {
                const params = new URLSearchParams(baseParams);
                params.set('gacha_type', banner.id); params.set('size','20'); params.set('end_id', endId);
                const targetUrl = `${baseUrl}?${params.toString()}`;
                const label = `Fetching ${banner.name} \u2014 page ${page}`;
                const data = await fetchWithRetry(targetUrl, label);
                // null = bad retcode or end of data => stop this banner (like original's break).
                if (!data) break;
                const list = (data.data && data.data.list) || [];
                if (list.length===0) break;
                for (const wish of list) { if (existingIds.has(wish.id)) { foundExisting=true; break; } allWishes.push(wish); }
                endId = list[list.length-1].id; page++;
                await new Promise(r => setTimeout(r, 300));
            }
        }
        const unique = Array.from(new Map(allWishes.map(w => [w.id, w])).values());
        unique.sort((a,b) => new Date(b.time) - new Date(a.time));
        state.gachaLog = { wishes: unique, lastImport: new Date().toISOString() };
        saveState();
        deriveStandardPool();
        await checkUnknownItems();
        renderGachaStats(); renderCalendar(); renderStatusBar();
        await showModal({type:'alert',title:'Import Complete',message:`Imported ${unique.length} wishes.`,confirmText:'OK'});
    } catch (err) {
        // Save partial progress so a mid-import failure doesn't lose what was fetched.
        if (allWishes.length > 0) {
            const unique = Array.from(new Map(allWishes.map(w => [w.id, w])).values());
            unique.sort((a,b) => new Date(b.time) - new Date(a.time));
            state.gachaLog = { wishes: unique, lastImport: new Date().toISOString() };
            saveState();
            deriveStandardPool();
            recomputePityState();
        }
        const partialMsg = allWishes.length > 0 ? `<br><br>Partial progress saved: ${allWishes.length} wishes imported so far. You can re-import later to continue from where it stopped.` : '';
        await showModal({type:'alert',title:'Import Failed',message:err.message + partialMsg,confirmText:'OK'});
        renderGachaStats();
        renderCalendar();
        renderStatusBar();
    }
}

// ---------- Primos ----------
function getMapRemainingPrimos() {
    const data = getMapData(); let total = 0;
    Object.keys(data).forEach(nation => {
        const cats = data[nation], comp = (state.mapCompletion && state.mapCompletion[nation]) || {};
        Object.keys(cats).forEach(cat => { total += Math.round((cats[cat]||0) * (1 - ((comp[cat]!=null?comp[cat]:0)/100))); });
    });
    return total;
}
function renderPrimos() {
    const el = $('view-primos'); if (!el) return;
    const mapRem = getMapRemainingPrimos();
    const days = 30;
    const dailyEst = days*60 + days*(state.otherDailyPrimos||0);
    const welkinEst = state.welkinActive ? days*90 : 0;
    const current = state.primogemCount||0;
    const total = current + mapRem + dailyEst + welkinEst;
    const goal = state.primogemGoal||0;
    const remaining = total - goal;
    const pulls = Math.floor(total/PRIMO_PER_PULL);
    const goalPulls = Math.floor(goal/PRIMO_PER_PULL);
    el.innerHTML = `
        <div class="single-column-view" style="max-width:560px;margin:auto;">
            <h2>Primogem Stats</h2>
            <div class="stats">
                <div class="stat-item"><h3>DAILY STREAK</h3><p id="daily-streak">${state.dailyStreak||0}</p></div>
                <div class="stat-item"><h3>PRIMOGEMS</h3><p><span id="primo-count">${current.toLocaleString()}</span> / <span id="primo-goal">${goal.toLocaleString()}</span></p></div>
            </div>
            <div class="controls-group">
                <button id="add-primo-btn" class="btn btn-primary">Add Primogems</button>
                <button id="set-goal-btn" class="btn btn-primary">Set Primogem Goal</button>
                <button id="spend-wishes-btn" class="btn btn-secondary">Spend Wishes</button>
                <button id="subtract-primos-btn" class="btn btn-secondary">Subtract Primos</button>
            </div>
            <div class="income-section">
                <h3>Expected Income</h3>
                <div class="income-table">
                    <div class="income-row"><span class="income-label">Current saved</span><span class="income-val">${current.toLocaleString()}</span></div>
                    <div class="income-row"><span class="income-label">Map exploration</span><span class="income-val pos">+ ${mapRem.toLocaleString()}</span></div>
                    <div class="income-row"><span class="income-label">Daily commissions (30d)</span><span class="income-val pos">+ ${dailyEst.toLocaleString()}</span></div>
                    <div class="income-row"><span class="income-label"><label class="welkin-toggle"><input type="checkbox" id="welkin-toggle" ${state.welkinActive?'checked':''}> Welkin Moon (30d)</label></span><span class="income-val pos">+ ${welkinEst.toLocaleString()}</span></div>
                    <div class="income-row"><span class="income-label">Other daily <input type="number" id="other-daily-input" value="${state.otherDailyPrimos||0}" min="0" class="other-daily-input"></span><span class="income-val" style="color:var(--secondary-text)">/day</span></div>
                    <div class="income-row total"><span>Total projected (\u2248 ${pulls} pulls)</span><span class="income-val">${total.toLocaleString()}</span></div>
                    <div class="income-row"><span class="income-label">Goal</span><span class="income-val">${goal.toLocaleString()} (\u2248 ${goalPulls} pulls)</span></div>
                    <div class="income-row total"><span>${remaining>=0?'Surplus':'Remaining to goal'}</span><span class="income-val ${remaining>=0?'pos':'neg'}">${remaining>=0?'+':''}${remaining.toLocaleString()}</span></div>
                </div>
            </div>
        </div>`;
    $('add-primo-btn').addEventListener('click', openAddPrimos);
    $('set-goal-btn').addEventListener('click', openSetGoal);
    $('spend-wishes-btn').addEventListener('click', openSpendWishes);
    $('subtract-primos-btn').addEventListener('click', openSubtractPrimos);
    $('welkin-toggle').addEventListener('change', e => { state.welkinActive = e.target.checked; saveState(); renderPrimos(); });
    $('other-daily-input').addEventListener('change', e => { const v=parseInt(e.target.value,10); state.otherDailyPrimos = isNaN(v)||v<0?0:v; saveState(); renderPrimos(); });
}
async function openAddPrimos() {
    const v = await showModal({type:'prompt',title:'Add Primogems',placeholder:'e.g., 300'});
    if (v===false) return;
    const n = parseInt(v,10);
    if (!isNaN(n)) { state.primogemCount = (state.primogemCount||0)+n; saveState(); renderPrimos(); renderStatusBar(); }
}
async function openSetGoal() {
    const v = await showModal({type:'prompt',title:'Set Goal',placeholder:'e.g., 28800',defaultValue:String(state.primogemGoal)});
    if (v===false) return;
    const n = parseInt(v,10);
    if (!isNaN(n)) { state.primogemGoal = n; saveState(); renderPrimos(); }
}
async function openSpendWishes() {
    const v = await showModal({type:'prompt',title:'Spend Wishes',message:'How many wishes did you spend?',placeholder:'e.g., 10'});
    if (v===false) return;
    const n = parseInt(v,10);
    if (!isNaN(n) && n>0) { state.primogemCount = Math.max(0, (state.primogemCount||0) - n*PRIMO_PER_PULL); saveState(); renderPrimos(); renderStatusBar(); }
}
async function openSubtractPrimos() {
    const v = await showModal({type:'prompt',title:'Subtract Primos',message:'Spend primos on Welkin, BP, etc.',placeholder:'amount'});
    if (v===false) return;
    const n = parseInt(v,10);
    if (!isNaN(n) && n>0) { state.primogemCount = Math.max(0, (state.primogemCount||0)-n); saveState(); renderPrimos(); renderStatusBar(); }
}

// ---------- Map ----------
function getMapData() {
    const base = _mapData || MAP_DATA_FALLBACK;
    const merged = {};
    Object.keys(base).forEach(nation => {
        const ov = state.mapOverrides && state.mapOverrides[nation];
        merged[nation] = ov ? Object.assign({}, base[nation], ov) : Object.assign({}, base[nation]);
    });
    return merged;
}
async function loadMapData() {
    _mapData = Object.assign({}, MAP_DATA_FALLBACK);
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(MAP_DATA_KEY)||'null'); } catch(e){}
    const TTL = 7*24*60*60*1000;
    if (cached && cached.fetchedAt && (Date.now()-new Date(cached.fetchedAt).getTime())<TTL && cached.data) { _mapData = cached.data; return; }
    try {
        const targets = ['https://wiki.gg/wiki/Genshin_Impact/Primogems','https://genshin-impact.fandom.com/wiki/Primogem'];
        let parsed = null;
        for (const t of targets) {
            try {
                const res = await fetch(CORS_PROXY + encodeURIComponent(t));
                if (!res.ok) continue;
                parsed = parseWikiTable(await res.text());
                if (parsed) break;
            } catch(e){}
        }
        if (parsed) Object.keys(parsed).forEach(n => { if (_mapData[n]) _mapData[n] = Object.assign({}, _mapData[n], parsed[n]); });
        else console.warn('Map wiki parse failed; using fallback data.');
        try { localStorage.setItem(MAP_DATA_KEY, JSON.stringify({data:_mapData, fetchedAt:new Date().toISOString()})); } catch(e){}
    } catch(e) { console.warn('Map data fetch failed; using fallback.', e); }
}
function parseWikiTable(html) {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nationMap = { mondstadt:'Mondstadt', liyue:'Liyue', inazuma:'Inazuma', sumeru:'Sumeru', fontaine:'Fontaine', natlan:'Natlan' };
        const result = {};
        doc.querySelectorAll('table').forEach(table => {
            table.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('th, td');
                if (cells.length < 2) return;
                const nation = nationMap[cells[0].textContent.trim().toLowerCase()];
                if (!nation) return;
                if (!result[nation]) result[nation] = { chests:0, quests:0, oculi:0, other:0 };
                let sum = 0;
                for (let i=1;i<cells.length;i++) { const m = cells[i].textContent.replace(/[^0-9]/g,''); if (m) sum += parseInt(m,10); }
                result[nation].other += sum;
            });
        });
        return Object.keys(result).length>0 ? result : null;
    } catch(e) { return null; }
}
function renderMapView() {
    // Fullscreen embedded interactive map (genshin-impact-map.appsample.com).
    // The iframe fills the entire viewport when the Map view is active.
    const el = $('view-map'); if (!el) return;
    el.innerHTML = `<iframe id="interactive-map-iframe" src="https://genshin-impact-map.appsample.com/?map=teyvat"></iframe>`;
}
function renderMapTracker() {
    // Render the primo completion tracker into the primos view's tracker panel (if present).
    // The world map view no longer hosts the tracker; it's a standalone interactive map.
    const wrap = $('primos-tracker-panel'); if (!wrap) return;
    const data = getMapData();
    const nations = Object.keys(data);
    let html = `<div class="map-summary-bar" id="map-summary-bar"></div><div class="nation-grid">`;
    nations.forEach(nation => {
        const cats = data[nation], comp = state.mapCompletion[nation] || {};
        let nTotal=0, nRem=0;
        MAP_CATEGORIES.forEach(cat => { nTotal += cats[cat]||0; const pct = comp[cat]!=null?comp[cat]:0; nRem += Math.round((cats[cat]||0)*(1-pct/100)); });
        const nPct = nTotal>0 ? Math.round(((nTotal-nRem)/nTotal)*100) : 0;
        html += `<div class="nation-card" data-nation="${nation}">
            <div class="nation-card-head"><span class="nation-name">${nation}</span><span class="nation-total">Available: ${nTotal.toLocaleString()} primos</span></div>`;
        MAP_CATEGORIES.forEach(cat => {
            const avail = cats[cat]||0;
            const pct = comp[cat]!=null?comp[cat]:0;
            const rem = Math.round(avail*(1-pct/100));
            html += `<div class="cat-row" data-nation="${nation}" data-cat="${cat}">
                <span class="cat-label">${MAP_CAT_LABELS[cat]}</span>
                <input type="range" min="0" max="100" value="${pct}" class="cat-slider" data-nation="${nation}" data-cat="${cat}">
                <span class="cat-pct">${pct}%</span>
                <span class="cat-remaining">${rem.toLocaleString()}</span>
            </div>`;
        });
        html += `<div class="nation-completion" data-nation="${nation}">
            <span class="cat-label">Completion</span>
            <div class="cat-bar"><div class="cat-bar-fill" style="width:${nPct}%"></div></div>
            <span class="cat-pct">${nPct}%</span>
            <span class="cat-remaining">${nRem.toLocaleString()}</span>
        </div>
        <div class="nation-edit-row"><button class="btn-icon" data-edit-nation="${nation}">Edit totals</button></div>
        </div>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
    updateMapSummary();
    wrap.querySelectorAll('.cat-slider').forEach(s => {
        s.addEventListener('input', e => {
            const nation = e.target.dataset.nation, cat = e.target.dataset.cat;
            const v = parseInt(e.target.value, 10);
            if (!state.mapCompletion[nation]) state.mapCompletion[nation] = {};
            state.mapCompletion[nation][cat] = v;
            saveState();
            updateMapRowDisplay(nation, cat);
            updateMapNationCompletion(nation);
            updateMapSummary();
            if ($('view-primos').classList.contains('active')) renderPrimos();
        });
    });
    wrap.querySelectorAll('button[data-edit-nation]').forEach(b => {
        b.addEventListener('click', e => openEditNationTotals(e.target.dataset.editNation || e.target.closest('button').dataset.editNation));
    });
}
function updateMapRowDisplay(nation, cat) {
    const data = getMapData();
    const avail = data[nation][cat] || 0;
    const pct = state.mapCompletion[nation][cat] != null ? state.mapCompletion[nation][cat] : 0;
    const rem = Math.round(avail * (1 - pct/100));
    const row = document.querySelector(`.cat-row[data-nation="${nation}"][data-cat="${cat}"]`);
    if (row) {
        row.querySelector('.cat-pct').textContent = pct + '%';
        row.querySelector('.cat-remaining').textContent = rem.toLocaleString();
    }
}
function updateMapNationCompletion(nation) {
    const data = getMapData(), cats = data[nation], comp = state.mapCompletion[nation] || {};
    let nTotal=0, nRem=0;
    MAP_CATEGORIES.forEach(cat => { nTotal += cats[cat]||0; const pct = comp[cat]!=null?comp[cat]:0; nRem += Math.round((cats[cat]||0)*(1-pct/100)); });
    const nPct = nTotal>0 ? Math.round(((nTotal-nRem)/nTotal)*100) : 0;
    const nc = document.querySelector(`.nation-completion[data-nation="${nation}"]`);
    if (nc) {
        nc.querySelector('.cat-bar-fill').style.width = nPct + '%';
        nc.querySelector('.cat-pct').textContent = nPct + '%';
        nc.querySelector('.cat-remaining').textContent = nRem.toLocaleString();
    }
    const head = document.querySelector(`.nation-card[data-nation="${nation}"] .nation-total`);
    if (head) head.textContent = `Available: ${nTotal.toLocaleString()} primos`;
}
function updateMapSummary() {
    const el = $('map-summary-bar'); if (!el) return;
    let total = 0;
    const data = getMapData();
    Object.keys(data).forEach(n => {
        const cats = data[n], comp = state.mapCompletion[n] || {};
        Object.keys(cats).forEach(cat => { total += Math.round((cats[cat]||0)*(1-((comp[cat]!=null?comp[cat]:0)/100))); });
    });
    const pulls = Math.floor(total/PRIMO_PER_PULL);
    el.innerHTML = `Total primos remaining across all regions: <span class="summary-big">${total.toLocaleString()}</span> <span class="summary-sub">(~${pulls} pulls)</span>`;
}
async function openEditNationTotals(nation) {
    const data = getMapData()[nation] || {};
    const cur = state.mapOverrides && state.mapOverrides[nation] ? state.mapOverrides[nation] : data;
    const html = `<p style="margin-top:0;">Override primo totals for <b>${nation}</b>.</p>` +
        MAP_CATEGORIES.map(cat => `<div class="settings-row" style="justify-content:flex-start;"><label style="width:80px;">${MAP_CAT_LABELS[cat]}</label><input type="number" class="modal-input" id="ov-${cat}" value="${cur[cat]||0}" min="0" style="margin-bottom:0;"></div>`).join('');
    const ok = await showModal({ title:`Edit ${nation}`, customHtml:html, confirmText:'Save' });
    if (ok) {
        const ov = {};
        MAP_CATEGORIES.forEach(cat => { const inp=$('ov-'+cat); const v=parseInt(inp.value,10); ov[cat] = isNaN(v)||v<0?0:v; });
        if (!state.mapOverrides) state.mapOverrides = {};
        state.mapOverrides[nation] = ov; saveState();
        renderMapTracker();
        if ($('view-primos').classList.contains('active')) renderPrimos();
    }
}

// ---------- Calendar ----------
function renderCalendar() {
    const el = $('view-calendar'); if (!el) return;
    const year = state.calendarDisplayYear;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    el.innerHTML = `<div class="single-column-view">
        <div class="calendar-header"><div class="calendar-controls"><h2>Yearly Wish Calendar</h2></div>
        <div class="year-selector"><button id="prev-year-btn" class="btn btn-secondary">&lt;</button><span id="current-year-display">${year}</span><button id="next-year-btn" class="btn btn-secondary">&gt;</button></div></div>
        <div id="calendar-grid" class="calendar-grid"></div></div>`;
    const nextBtn = $('next-year-btn'); nextBtn.disabled = year >= getAppDate().getFullYear();
    nextBtn.addEventListener('click', () => { if (state.calendarDisplayYear < getAppDate().getFullYear()) { state.calendarDisplayYear++; saveState(); renderCalendar(); } });
    $('prev-year-btn').addEventListener('click', () => { state.calendarDisplayYear--; saveState(); renderCalendar(); });
    const grid = $('calendar-grid');
    if (!state.gachaLog || !state.gachaLog.wishes) { grid.innerHTML = `<p style="text-align:center;grid-column:1/-1;color:var(--secondary-text);">Import gacha log to see calendar.</p>`; return; }
    const wishesForYear = state.gachaLog.wishes.filter(w => new Date(w.time).getFullYear()===year);
    const pullsByDay = {};
    wishesForYear.forEach(w => { const dk = w.time.split(' ')[0]; pullsByDay[dk] = (pullsByDay[dk]||0)+1; });
    const todayKey = toLocalISO(getAppDate());
    grid.innerHTML = months.map((name, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month+1, 0).getDate();
        let days = Array(firstDay).fill('<div class="day-cell empty"></div>').join('');
        for (let day=1; day<=daysInMonth; day++) {
            const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const pc = pullsByDay[dk];
            let hClass = pc>5?'highlight-green':pc===5?'highlight-yellow':pc>0?'highlight-red':'';
            if (dk===todayKey) hClass += ' today';
            if (pc) hClass += ' has-pulls';
            days += `<div class="day-cell ${hClass}" data-date="${dk}"><span>${day}</span>${pc?`<div class="pull-count">${pc}</div>`:''}</div>`;
        }
        return `<div class="month"><h4>${name}</h4><div class="day-headers">${['S','M','T','W','T','F','S'].map(d=>`<div>${d}</div>`).join('')}</div><div class="days-grid">${days}</div></div>`;
    }).join('');
    grid.querySelectorAll('.has-pulls').forEach(cell => cell.addEventListener('click', () => showDailyBreakdown(cell.dataset.date)));
}
async function showDailyBreakdown(dateKey) {
    const pulls = state.gachaLog.wishes.filter(w => w.time.startsWith(dateKey));
    if (pulls.length===0) return;
    const listHtml = pulls.map(p => { const r = getItemRarity(p.name)||parseInt(p.rank_type,10); return `<li><span class="rarity-${r}">${escHtml(p.name)}</span></li>`; }).join('');
    await showModal({ title:`Pulls for ${dateKey}`, customHtml:`<ul class="pull-breakdown-list">${listHtml}</ul>`, confirmText:'Close' });
}

// ---------- Settings ----------
function renderSettings() {
    const el = $('view-settings'); if (!el) return;
    const theme = _activeTheme, customAccent = _customAccent || '';
    let chips = '';
    Object.keys(THEMES).forEach(name => {
        chips += `<div class="theme-chip ${name===theme?'selected':''}" data-theme="${name}" title="${name}"><span class="theme-chip-swatch" style="background:${THEMES[name].accent}"></span><span class="theme-chip-name">${name}</span></div>`;
    });
    // Accounts list
    const idx = getAccountsIndex() || { activeId:'main', list:[{id:'main', name:'Main'}] };
    const activeId = idx.activeId;
    const accListHtml = idx.list.map(a => {
        const active = a.id === activeId;
        return `<div class="account-row ${active?'active':''}" data-acc="${a.id}">
            <button class="account-name-btn" data-switch="${a.id}" title="Switch to this account">${escHtml(a.name)}${active?' <span class="account-badge">active</span>':''}</button>
            <span class="account-actions">
                <button class="btn-icon" data-rename="${a.id}" title="Rename">${pencilSvg()}</button>
                <button class="btn-icon" data-delete="${a.id}" title="Delete">${trashSvg()}</button>
            </span>
        </div>`;
    }).join('');
    const dateDisplay = state.customDate ? `Using custom date: ${state.customDate}` : 'Using real system time.';
    el.innerHTML = `<div class="single-column-view" style="max-width:560px;margin:auto;">
        <h2>Settings</h2>
        <div class="settings-section"><h3>Back</h3><div class="controls-group" style="margin-top:0;"><button id="back-to-menu-btn" class="btn btn-secondary">Back to Menu</button></div></div>
        <div class="settings-section"><h3>Accounts</h3>
            <p style="text-align:center;color:var(--secondary-text);font-size:0.85em;margin:0 0 12px;">Each account keeps its own tasks, primos, gacha log, resin &amp; map progress. Theme is shared.</p>
            <div class="account-list">${accListHtml}</div>
            <div class="controls-group" style="margin-top:12px;"><button id="add-account-btn" class="btn btn-primary">+ Add Account</button></div>
        </div>
        <div class="settings-section"><h3>Theme</h3><div class="theme-grid">${chips}</div>
            <div class="custom-accent-row"><label for="custom-accent-input">Custom accent:</label><input type="color" id="custom-accent-input" value="${customAccent || THEMES[theme].accent}">${customAccent?'<button class="btn-icon" id="reset-accent-btn" title="Reset to theme accent">Reset</button>':''}</div></div>
        <div class="settings-section"><h3>General Resets</h3><div class="controls-group" style="margin-top:0;"><button id="manual-reset-btn" class="btn btn-secondary">Perform Daily Task Reset</button><button id="reset-primo-btn" class="btn btn-secondary">Reset Primogem Count</button></div></div>
        <div class="settings-section"><h3>Date Override</h3><p id="custom-date-display" style="text-align:center;color:var(--secondary-text);margin-bottom:10px;">${dateDisplay}</p><div class="controls-group" style="margin-top:0;"><button id="set-date-btn" class="btn btn-secondary">Set Custom Date</button><button id="sync-date-btn" class="btn btn-secondary" style="display:${state.customDate?'block':'none'};">Sync to Today</button></div></div>
        <div class="settings-section"><h3>Data Backup</h3><div class="data-buttons"><button id="export-data-btn" class="btn btn-primary">Export Data</button><button id="import-data-btn" class="btn btn-secondary">Import Data</button><input type="file" id="import-data-file" accept=".json" style="display:none;"></div></div>
        <div class="settings-section"><h3>Danger Zone</h3><div class="controls-group" style="margin-top:0;"><button id="reset-all-btn" class="btn btn-clear">Clear &amp; Reset This Account</button></div></div>
    </div>`;
    $('back-to-menu-btn').addEventListener('click', () => showView('main-menu'));
    document.querySelectorAll('.theme-chip').forEach(chip => chip.addEventListener('click', () => { const n=chip.dataset.theme; applyTheme(n, _customAccent); saveTheme(n, _customAccent); renderSettings(); syncThemePopover(); }));
    const ai = $('custom-accent-input');
    if (ai) { ai.addEventListener('input', e => applyTheme(_activeTheme, e.target.value)); ai.addEventListener('change', e => { saveTheme(_activeTheme, e.target.value); renderSettings(); syncThemePopover(); }); }
    const ra = $('reset-accent-btn'); if (ra) ra.addEventListener('click', () => { _customAccent=null; applyTheme(_activeTheme, null); saveTheme(_activeTheme, null); renderSettings(); syncThemePopover(); });
    $('manual-reset-btn').addEventListener('click', () => performDailyReset(false));
    $('reset-primo-btn').addEventListener('click', async () => { if (await showModal({title:'Confirm Primogem Reset',message:'This will reset your Primogem count to 0. This cannot be undone.',type:'confirm'})) { state.primogemCount=0; saveState(); renderPrimos(); renderStatusBar(); } });
    $('set-date-btn').addEventListener('click', async () => {
        const ok = await showModal({ title:'Set Custom Date', customHtml:`<p style="margin-top:0;margin-bottom:15px;">Select a date. The app will use this for daily checks.</p><input type="date" id="custom-date-input-modal" class="modal-input" style="display:block;" value="${state.customDate||toLocalISO(getAppDate())}">`, confirmText:'Set Date' });
        if (ok) { const v=$('custom-date-input-modal').value; if (v) { state.customDate=v; saveState(); renderAll(); checkForAutomaticResets(); } }
    });
    $('sync-date-btn').addEventListener('click', () => { state.customDate=null; saveState(); renderAll(); checkForAutomaticResets(); });
    // Account buttons
    $('add-account-btn').addEventListener('click', async () => {
        const v = await showModal({type:'prompt',title:'New Account',message:'Name this account (e.g. "Alt", "Asia server"):',placeholder:'Account name',defaultValue:'Alt'});
        if (v === false || !v) return;
        createAccount(v.trim());
    });
    document.querySelectorAll('button[data-switch]').forEach(b => b.addEventListener('click', () => switchAccount(b.dataset.switch)));
    document.querySelectorAll('button[data-rename]').forEach(b => b.addEventListener('click', async () => {
        const id = b.dataset.rename;
        const idx2 = getAccountsIndex();
        const acc = idx2.list.find(a => a.id === id);
        const v = await showModal({type:'prompt',title:'Rename Account',defaultValue:acc ? acc.name : '',placeholder:'Account name'});
        if (v === false || !v) return;
        renameAccount(id, v.trim());
        renderSettings();
    }));
    document.querySelectorAll('button[data-delete]').forEach(b => b.addEventListener('click', () => deleteAccount(b.dataset.delete)));
    // Reset only the active account (not all accounts / not theme).
    $('reset-all-btn').addEventListener('click', async () => {
        const accName = getActiveAccountName();
        if (await showModal({title:'Confirm Reset',message:`This will delete ALL data for the "${accName}" account (tasks, primos, gacha log, resin, map progress). This cannot be undone. Continue?`,type:'confirm'})) {
            state = getDefaultState();
            saveState();
            deriveStandardPool();
            recomputePityState();
            renderAll();
            await showModal({type:'alert',title:'Reset Complete',message:`The "${accName}" account has been reset.`,confirmText:'OK'});
        }
    });
    $('export-data-btn').addEventListener('click', exportData);
    $('import-data-btn').addEventListener('click', () => $('import-data-file').click());
    $('import-data-file').addEventListener('change', importData);
}
async function exportData() {
    try {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const d = new Date();
        a.href = url; a.download = `genshin-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { await showModal({type:'alert',title:'Export Failed',message:e.message,confirmText:'OK'}); }
}
async function importData(e) {
    const file = e.target.files && e.target.files[0]; e.target.value='';
    if (!file) return;
    try {
        const parsed = JSON.parse(await file.text());
        const required = ['dailyTasks','weeklyTasks','primogemCount','gachaLog'];
        if (!required.every(k => Object.prototype.hasOwnProperty.call(parsed, k))) { await showModal({type:'alert',title:'Invalid File',message:'This file does not look like a Genshin Tool backup.',confirmText:'OK'}); return; }
        if (!await showModal({title:'Import Data',message:'This will replace all current data. Continue?',type:'confirm'})) return;
        state = mergeDefaults(parsed); state.stateVersion = STATE_VERSION; saveState();
        await loadItemDB(); deriveStandardPool(); recomputePityState(); renderAll();
        await showModal({type:'alert',title:'Import Complete',message:'Your data has been restored.',confirmText:'OK'});
    } catch (err) { await showModal({type:'alert',title:'Import Failed',message:err.message,confirmText:'OK'}); }
}

// ---------- Status bar ----------
function renderStatusBar() {
    const r=$('status-resin'), s=$('status-streak'), p=$('status-pity');
    if (!r||!s||!p) return;
    r.textContent = getCurrentResin();
    s.textContent = state.dailyStreak || 0;
    const ps = state.pityState && state.pityState['301'];
    p.textContent = ps ? (ps.current5||0) : 0;
}

// ---------- View switching ----------
function showView(viewId) {
    if (_viewAnimating) return;
    const active = document.querySelector('.view.active');
    if (active && active.id===viewId) return;
    const back = $('back-button-hotspot'), header = document.querySelector('.header-section'), settingsBtn = $('menu-btn-settings'), statusBar = $('status-bar');
    const showSettings = (viewId !== 'main-menu' && viewId !== 'view-map');
    settingsBtn.style.display = showSettings ? 'flex' : 'none';
    statusBar.style.display = (viewId==='view-map') ? 'none' : 'flex';
    if (viewId==='view-map') { document.body.classList.add('map-fullscreen'); header.style.display='none'; }
    else { document.body.classList.remove('map-fullscreen'); header.style.display='flex'; }
    document.body.setAttribute('data-view', viewId);
    document.querySelectorAll('#main-menu .const-star').forEach(b => b.classList.toggle('active-nav', b.dataset.view===viewId));
    const ANIM = 250; _viewAnimating = true;
    if (active) {
        active.classList.add('contracting');
        setTimeout(() => {
            active.classList.remove('active','contracting');
            const nv = $(viewId); if (nv) { nv.classList.add('active'); back.classList.toggle('visible', nv.id!=='main-menu'); }
            _viewAnimating = false;
            if (viewId==='view-map') renderMapView();
            document.querySelector('main').scrollTop = 0;
        }, ANIM);
    } else {
        const nv = $(viewId); if (nv) { nv.classList.add('active'); back.classList.toggle('visible', viewId!=='main-menu'); }
        _viewAnimating = false;
        if (viewId==='view-map') renderMapView();
        document.querySelector('main').scrollTop = 0;
    }
}

// Trigger the staggered constellation star entry animation.
function animateConstellationEntry() {
    const stars = document.querySelectorAll('#main-menu .const-star');
    stars.forEach(s => s.classList.remove('entered'));
    void document.body.offsetWidth;
    stars.forEach(s => s.classList.add('entered'));
}

// ---------- SVG icons ----------
function pencilSvg() { return '<svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>'; }
function trashSvg() { return '<svg viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>'; }
function reimportSvg() { return '<svg viewBox="0 0 24 24"><path d="M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12H4A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>'; }

// ---------- Render orchestration ----------
function renderAll() { renderTasks(); renderPrimos(); renderGachaStats(); renderCalendar(); renderSettings(); renderStatusBar(); }

function bindGlobalEvents() {
    document.querySelectorAll('#main-menu .const-star').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
    const sb = $('menu-btn-settings');
    sb.addEventListener('click', () => showView('view-settings'));
    sb.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); showView('view-settings'); } });
    $('btn-back-main').addEventListener('click', () => showView('main-menu'));
    const tick = () => { $('live-clock').textContent = new Date().toLocaleTimeString('en-US', { hour12:true, hour:'2-digit', minute:'2-digit' }); };
    tick(); setInterval(tick, 1000);
}

async function init() {
    $('custom-modal').innerHTML = `<div class="modal-content"><h3 id="modal-title"></h3><p id="modal-message"></p><div id="modal-custom-content"></div><input type="text" id="modal-input" class="modal-input" style="display:none;"><div class="modal-buttons"><button id="modal-cancel-btn" class="btn btn-secondary">Cancel</button><button id="modal-confirm-btn" class="btn btn-primary">Confirm</button></div></div>`;
    loadTheme();
    initThemeFab();
    initAccountPill();
    loadState();
    await loadItemDB();
    deriveStandardPool();
    recomputePityState();
    loadMapData();
    checkForAutomaticResets();
    startResinTicker();
    bindGlobalEvents();
    renderAll();
    showView('main-menu');
    setTimeout(animateConstellationEntry, 50);
    saveState();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
