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
const ITEM_DB_KEY     = 'genshinItemDB_v4';
const THEME_KEY       = 'genshinTheme_v1';
const ACCOUNTS_KEY    = 'genshinAccounts_v1';   // { activeId, list: [{id, name}] }
// Each account's data lives under DATA_PREFIX + accountId.
const DATA_PREFIX     = 'genshinTrackerData_v3_acc_';
// CORS proxies — corsproxy.io first (the original working order; it's fast when it
// works), with fallbacks. The bulletproof Promise.race timeout in fetchWithRetry
// means a hung proxy only costs 10s before falling through to the next one, so the
// order is a preference, not a reliability critical-path.
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
    { id:'302', name:'Weapon Event',     type:'weapon',     hardPity5:80, softPity5:63, hardPity4:10, has5050:false, hasFatePoints:false },
    { id:'200', name:'Standard',         type:'standard',   hardPity5:90, softPity5:74, hardPity4:10, has5050:false, hasFatePoints:false },
    { id:'500', name:'Chronicled Wish',  type:'chronicled', hardPity5:90, softPity5:74, hardPity4:10, has5050:false, hasFatePoints:false },
];

const IMPORT_BANNER_TYPES = [
    { id:'301', name:'Character Event' },
    { id:'302', name:'Weapon Event' },
    { id:'200', name:'Standard' },
    { id:'500', name:'Chronicled Wish' },
    { id:'100', name:'Novice' }, // Beginners' Wish — removed long ago; most accounts have 0 pulls, kept last so the active banners import first.
];



const ITEM_DB_FALLBACK = {"Aino":4,"Albedo":5,"Alhaitham":5,"Aloy":5,"Amber":4,"Arataki Itto":5,"Arlecchino":5,"Baizhu":5,"Barbara":4,"Beidou":4,"Bennett":4,"Candace":4,"Charlotte":4,"Chasca":5,"Chevreuse":4,"Chiori":5,"Chongyun":4,"Citlali":5,"Clorinde":5,"Collei":4,"Columbina":5,"Cyno":5,"Dahlia":4,"Dehya":5,"Diluc":5,"Diona":4,"Dori":4,"Durin":5,"Emilie":5,"Escoffier":5,"Eula":5,"Faruzan":4,"Fischl":4,"Flins":5,"Freminet":4,"Furina":5,"Gaming":4,"Ganyu":5,"Gorou":4,"Hu Tao":5,"Iansan":4,"Ifa":4,"Illuga":4,"Ineffa":5,"Jahoda":4,"Jean":5,"Kachina":4,"Kaedehara Kazuha":5,"Kaeya":4,"Kamisato Ayaka":5,"Kamisato Ayato":5,"Kaveh":4,"Keqing":5,"Kinich":5,"Kirara":4,"Klee":5,"Kujou Sara":4,"Kuki Shinobu":4,"Lan Yan":4,"Lauma":5,"Layla":4,"Linnea":5,"Lisa":4,"Lohen":5,"Lynette":4,"Lyney":5,"Mavuika":5,"Mika":4,"Mona":5,"Mualani":5,"Nahida":5,"Navia":5,"Nefer":5,"Neuvillette":5,"Nicole":5,"Nilou":5,"Ningguang":4,"Noelle":4,"Ororon":4,"Prune":4,"Qiqi":5,"Raiden Shogun":5,"Razor":4,"Rosaria":4,"Sangonomiya Kokomi":5,"Sayu":4,"Sethos":4,"Shenhe":5,"Shikanoin Heizou":4,"Sigewinne":5,"Skirk":5,"Sucrose":4,"Tartaglia":5,"Thoma":4,"Tighnari":5,"player's choice":5,"Traveler (Dendro)":5,"Traveler":5,"Varesa":5,"Varka":5,"Venti":5,"Wanderer":5,"Wriothesley":5,"Xiangling":4,"Xianyun":5,"Xiao":5,"Xilonen":5,"Xingqiu":4,"Xinyan":4,"Yae Miko":5,"Yanfei":4,"Yaoyao":4,"Yelan":5,"Yoimiya":5,"Yumemizuki Mizuki":5,"Yun Jin":4,"Zhongli":5,"Zibai":5,"Wolf's Gravestone":5,"Aquila Favonia":5,"Lost Prayer to the Sacred Winds":5,"Skyward Harp":5,"Skyward Pride":5,"Skyward Spine":5,"Memory of Dust":5,"The Unforged":5,"Vortex Vanquisher":5,"Summit Shaper":5,"Skyward Blade":5,"Amos' Bow":5,"Skyward Atlas":5,"The Flute":4,"Sacrificial Sword":4,"paimon's bargains":4,"Eye of Perception":4,"Iron Sting":4,"Prototype Rancour":4,"Lion's Roar":4,"Serpent Spine":4,"Prototype Crescent":4,"Dragon's Bane":4,"The Black Sword":4,"Crescent Pike":4,"The Viridescent Hunt":4,"Favonius Lance":4,"Festering Desire":4,"Frostbearer":4,"Sacrificial Greatsword":4,"Sword of Descension":4,"The Alley Flash":4,"Deathmatch":4,"Favonius Sword":4,"Alley Hunter":4,"Lithic Spear":4,"Wine and Song":4,"Lithic Blade":4,"Prototype Starglitter":4,"Whiteblind":4,"The Widsith":4,"Compound Bow":4,"Favonius Warbow":4,"Rust":4,"The Stringless":4,"Sacrificial Bow":4,"Favonius Codex":4,"Mappa Mare":4,"Prototype Amber":4,"Sacrificial Fragments":4,"Solar Pearl":4,"Dragonspine Spear":4,"Favonius Greatsword":4,"The Bell":4,"Rainslasher":4,"Prototype Archaic":4,"Ferrous Shadow":3,"Debate Club":3,"Dark Iron Sword":3,"Cool Steel":3,"Otherworldly Story":3,"Halberd":3,"Slingshot":3,"Sharpshooter's Oath":3,"Raven Bow":3,"Black Tassel":3,"Skyrider Greatsword":3,"wish, kaeya's gain":3,"Recurve Bow":3,"Bloodtainted Greatsword":3,"White Iron Greatsword":3,"White Tassel":3,"wish, from pan guan'er":3,"Messenger":3,"Emerald Orb":3,"Traveler's Handy Sword":3,"Twin Nephrite":3,"Fillet Blade":3,"Thrilling Tales of Dragon Slayers":3,"Magic Guide":3,"Seasoned Hunter's Bow":2,"Silver Sword":2,"Pocket Grimoire":2,"Old Merc's Pal":2,"Iron Point":2,"Beginner's Protector":1,"Apprentice's Notes":1,"Dull Blade":1,"Waster Greatsword":1,"Hunter's Bow":1,"Primordial Jade Cutter":5,"Staff of Homa":5,"Elegy for the End":5,"Windblume Ode":4,"Song of Broken Pines":5,"Mitternachts Waltz":4,"Dodoco Tales":4,"Mistsplitter Reforged":5,"Thundering Pulse":5,"Amenoma Kageuchi":4,"Hakushin Ring":4,"Hamayumi":4,"Katsuragikiri Nagamasa":4,"Kitain Cross Spear":4,"Engulfing Lightning":5,"\"The Catch\"":4,"Predator":4,"Everlasting Moonglow":5,"Polar Star":5,"Akuoumaru":4,"Wavebreaker's Fin":4,"Mouun's Moon":4,"Cinnabar Spindle":4,"Redhorn Stonethresher":5,"Calamity Queller":5,"Kagura's Verity":5,"Oathsworn Eye":4,"Haran Geppaku Futsu":5,"Aqua Simulacra":5,"Fading Twilight":4,"Kagotsurube Isshin":4,"Hunter's Path":5,"End of the Line":4,"Forest Regalia":4,"Fruit of Fulfillment":4,"King's Squire":4,"Moonpiercer":4,"Sapwood Blade":4,"Staff of the Scarlet Sands":5,"Makhaira Aquamarine":4,"Xiphos' Moonlight":4,"Wandering Evenstar":4,"Missive Windspear":4,"A Thousand Floating Dreams":5,"Tulaytullah's Remembrance":5,"Toukabou Shigure":4,"Light of Foliar Incision":5,"Beacon of the Reed Sea":5,"Mailed Flower":4,"Jadefall's Splendor":5,"Duel! The Summoners' Summit! Event":4,"The First Great Magic":5,"Ballad of the Fjords":4,"Finale of the Deep":4,"Fleuve Cendre Ferryman":4,"Flowing Purity":4,"Rightful Reward":4,"Scion of the Blazing Sun":4,"Song of Stillness":4,"Talking Stick":4,"Tidal Shadow":4,"Sacrificial Jade":4,"Tome of the Eternal Flow":5,"The Dockhand's Assistant":4,"Portable Power Saw":4,"Ballad of the Boundless Blue":4,"Cashflow Supervision":5,"Prospector's Drill":4,"Range Gauge":4,"Splendor of Tranquil Waters":5,"Verdict":5,"\"Ultimate Overlord\\":4,"Crane's Echoing Call":5,"Dialogues of the Desert Sages":4,"Uraku Misugiri":5,"Crimson Moon's Semblance":5,"Absolution":5,"Cloudforged":4,"Silvershower Heartstrings":5,"Lumidouce Elegy":5,"Surf's Up":5,"Chain Breaker":4,"Earth Shaker":4,"Flute of Ezpitzal":4,"Footprint of the Rainbow":4,"Ring of Yaxche":4,"Fang of the Mountain King":5,"Fruitful Hook":4,"Peak Patrol Song":5,"Sturdy Bone":4,"Astral Vulture's Crimson Plumage":5,"Waveriding Whirl":4,"Calamity of Eshu":4,"A Thousand Blazing Suns":5,"Starcaller's Watch":5,"Tamayuratei no Ohanashi":4,"Vivid Notions":5,"Symphonist of Scents":5,"Sequence of Solitude":4,"Azurelight":5,"Fractured Halo":5,"Nightweaver's Looking Glass":5,"Etherlight Spindlelute":4,"Bloodsoaked Ruins":5,"Reliquary of Truth":5,"Dawning Frost":4,"Moonweaver's Dawn":4,"Sacrificer's Staff":4,"Athame Artis":5,"The Daybreak Chronicles":5,"Rainbow Serpent's Rain Bow":4,"Nocturne's Curtain Call":5,"Lightbearing Moonshard":5,"Gest of the Mighty Wolf":5,"Golden Frostbound Oath":5,"Angelos' Heptades":5,"Disaster and Remorse":5}; // Bundled rarity database (characters + weapons) — like paimon.moe, no runtime fetch needed

// ---------- State ----------
let state, itemDB = {}, _standardPool = new Set();
let _activeTheme = 'Anemo', _customAccent = null, _dailyEditMode = false, _weeklyEditMode = false, _gachaSort = 'newest';
let _viewAnimating = false, _resinInterval = null;

function defaultPityState() {
    return {
        '301': { current5:0, current4:0, guaranteed:false },
        '302': { current5:0, current4:0, guaranteed:false },
        '200': { current5:0, current4:0 },
        '500': { current5:0, current4:0 },
    };
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
        welkinActive:false, otherDailyPrimos:10,
        resin: { current:0, max:200, lastSetAt:now },
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
    // Upgrade old resin cap (160) to the new 200 cap.
    if (!merged.resin.max || merged.resin.max === 160) merged.resin.max = 200;
    merged.pityState = Object.assign({}, def.pityState, parsed.pityState || {});
    Object.keys(def.pityState).forEach(k => { if (!merged.pityState[k]) merged.pityState[k] = def.pityState[k]; });
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
    // Already classified by the user before — use the saved override.
    if (state.userItemOverrides && Object.prototype.hasOwnProperty.call(state.userItemOverrides, name)) return state.userItemOverrides[name];
    // Show a custom modal with 3★ / 4★ / 5★ buttons (and a Skip option).
    const modal = $('custom-modal');
    const title = $('modal-title'), msg = $('modal-message'), input = $('modal-input'), custom = $('modal-custom-content');
    const cancelB = $('modal-cancel-btn'), confirmB = $('modal-confirm-btn');
    title.textContent = 'Unknown Item';
    msg.innerHTML = `We don't recognise "<b>${escHtml(name)}</b>". What rarity is it?<br><span style="font-size:0.8em;color:var(--secondary-text);">Your choice is saved permanently so you won't be asked again.</span>`;
    msg.style.display = 'block';
    input.style.display = 'none';
    custom.innerHTML = `<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
        <button class="btn btn-secondary" id="rarity-3-btn" style="flex:1;font-size:1.15em;">3\u2605</button>
        <button class="btn btn-secondary" id="rarity-4-btn" style="flex:1;font-size:1.15em;">4\u2605</button>
        <button class="btn btn-primary" id="rarity-5-btn" style="flex:1;font-size:1.15em;">5\u2605</button>
    </div>`;
    custom.style.display = 'block';
    // Hide the default Cancel/Confirm buttons — we use the custom rarity buttons.
    cancelB.style.display = 'none';
    confirmB.style.display = 'none';
    modal.classList.add('visible');
    const rarity = await new Promise(resolve => {
        const b3 = $('rarity-3-btn'), b4 = $('rarity-4-btn'), b5 = $('rarity-5-btn');
        const done = (r) => { modal.classList.remove('visible'); resolve(r); };
        b3.onclick = () => done(3);
        b4.onclick = () => done(4);
        b5.onclick = () => done(5);
    });
    // Restore the default modal buttons for future use.
    cancelB.style.display = '';
    confirmB.style.display = '';
    confirmB.onclick = null; cancelB.onclick = null;
    if (rarity) {
        // Save permanently: to userItemOverrides (per-account state) AND to the rarity DB cache.
        if (!state.userItemOverrides) state.userItemOverrides = {};
        state.userItemOverrides[name] = rarity;
        saveState();
        try {
            const cached = JSON.parse(localStorage.getItem(ITEM_DB_KEY) || 'null');
            if (cached && cached.map) {
                cached.map[name] = rarity;
                localStorage.setItem(ITEM_DB_KEY, JSON.stringify(cached));
            }
        } catch(e) {}
        itemDB[name] = rarity; // in-memory so getItemRarity() returns it immediately
    }
    return rarity;
}
async function loadItemDB() {
    // The rarity database is BUNDLED in ITEM_DB_FALLBACK (325 entries: all characters
    // + weapons through the current patch, sourced from paimon.moe's data files).
    // This is the paimon.moe approach: no runtime fetch needed, the app works 100%
    // offline and never blocks on or fails due to api.github.com rate-limiting.
    itemDB = Object.assign({}, ITEM_DB_FALLBACK);
    // Apply any cached overlay from localStorage. This preserves characters that a
    // previous successful background fetch may have picked up (forward-compat), and
    // user-seeded rarities (checkUnknownItems). Cached data overrides the bundle.
    try {
        const cached = JSON.parse(localStorage.getItem(ITEM_DB_KEY)||'null');
        if (cached && cached.map) Object.assign(itemDB, cached.map);
    } catch(e){}
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
    // Order wishes oldest -> newest for pity accumulation.
    //
    // The Genshin wish API assigns each pull a numeric `id` that increases
    // monotonically with each pull (globally, across all banners). So for wishes
    // that carry a numeric id (URL import, UIGF, Constellation exports of those),
    // sorting by (time ASC, id ASC) yields TRUE pull order regardless of how the
    // source ordered the data.
    //
    // This fixes a pity miscount for chronological (oldest-first) file exports:
    // a plain reverse() assumes the input is newest-first (id-descending) within
    // each timestamp. For oldest-first input, reverse() inverts the within-10-pull
    // order, displacing the 5★ and producing wrong pity that cascades to every
    // subsequent 5★. Sorting by id is order-independent and correct in all cases.
    //
    // A banner may contain a MIX of numeric ids (URL import) and non-numeric ids
    // (paimon.moe synthetic ids like "pm_301_..._00000974") if the user imported
    // from multiple sources. The comparator handles each id individually: numeric
    // comparison (BigInt) when BOTH ids are numeric, string comparison otherwise.
    // This never throws, regardless of id format.
    const isNumericId = (id) => id != null && /^[0-9]+$/.test(String(id));
    function cmpId(a, b) {
        const na = isNumericId(a), nb = isNumericId(b);
        if (na && nb) {
            const ia = BigInt(a), ib = BigInt(b);
            return ia < ib ? -1 : (ia > ib ? 1 : 0);
        }
        // If one or both are non-numeric, fall back to string comparison.
        const sa = String(a), sb = String(b);
        return sa < sb ? -1 : (sa > sb ? 1 : 0);
    }
    const oldToNew = [...wishes].sort((a, b) => {
        const ta = new Date(a.time).getTime(), tb = new Date(b.time).getTime();
        if (ta !== tb) return ta - tb;              // oldest first
        return cmpId(a.id, b.id);                    // within same timestamp: id ascending = pull order
    });
    let fives=[], fours=[], threes=[], p5=0, p4=0, guaranteed=false, fatePoints=0;
    oldToNew.forEach(w => {
        p5++; p4++;
        const rarity = getItemRarity(w.name) || parseInt(w.rank_type, 10);
        const pd = { name:w.name, pity:p5, win:null, outcome:null, fatePoints:null, inSoftPity: p5>=cfg.softPity5, time:w.time, item_type:w.item_type, rank_type:w.rank_type };
        if (rarity===5) {
            if (cfg.type==='character') {
                // Character banner: 50/50 with guarantee (lose -> next 5★ guaranteed featured).
                const isLoss = isStandardFiveStar(w.name);
                if (guaranteed) {
                    pd.win = true;
                    pd.outcome = 'guarantee';
                    guaranteed = false;
                } else if (isLoss) {
                    pd.win = false;
                    pd.outcome = 'loss';
                    guaranteed = true;
                } else {
                    pd.win = true;
                    pd.outcome = 'win';
                }
            } else if (cfg.type==='weapon') {
                // Weapon banner: can't determine win/loss without knowing the featured
                // weapon list, so we don't tag outcomes. Just track pity.
                pd.win = null;
                pd.outcome = null;
            } else { pd.win=true; pd.outcome='win'; }
            fives.push(pd); p5=0;
        }
        if (rarity===4) { fours.push(Object.assign({}, w, {pity:p4})); p4=0; }
        if (rarity===3) { threes.push(Object.assign({}, w, {pity:p5})); }
    });
    const avg = a => a.length ? a.reduce((s,i)=>s+i.pity,0)/a.length : 0;
    let f4c=[], f4w=[];
    if (cfg.type==='character') fours.forEach(s => { if (s.item_type==='Character') f4c.push(s); else f4w.push(s); });
    // Count outcomes: win (won 50/50), loss (lost 50/50), guarantee (got featured because previous was a loss).
    const wins = fives.filter(s=>s.outcome==='win').length;
    const losses = fives.filter(s=>s.outcome==='loss').length;
    const guarantees = fives.filter(s=>s.outcome==='guarantee').length;
    return {
        totalWishes: wishes.length,
        five: { list:fives.slice().reverse(), total:fives.length, avgPity:avg(fives), percent:(fives.length/wishes.length)*100, wins, losses, guarantees, winRate:(wins+losses+guarantees)>0?((wins+guarantees)/(wins+losses+guarantees))*100:0 },
        four: { list:fours.slice().reverse(), total:fours.length, avgPity:avg(fours), percent:(fours.length/wishes.length)*100, chars:{total:f4c.length,avgPity:avg(f4c),percent:(f4c.length/wishes.length)*100}, weapons:{total:f4w.length,avgPity:avg(f4w),percent:(f4w.length/wishes.length)*100} },
        three: { total: threes.length, percent: (threes.length/wishes.length)*100, list: threes.slice().reverse() },
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
            else next[b.id]={current5:s.pity.current5,current4:s.pity.current4};
        } else {
            if (b.type==='character') next[b.id]={current5:0,current4:0,guaranteed:false};
            else next[b.id]={current5:0,current4:0};
        }
    });
    state.pityState = next; saveState();
}
async function checkUnknownItems() {
    const log = state.gachaLog; if (!log || !log.wishes) return;
    const seen = new Set();
    log.wishes.forEach(w => {
        if (seen.has(w.name)) return; seen.add(w.name);
        const r = getItemRarity(w.name);
        if (r !== 3 && r !== 4 && r !== 5) {
            // Item not in database — seed silently from rank_type if available.
            // NO popup — the database should categorize everything.
            const rank = parseInt(w.rank_type, 10);
            if (rank === 3 || rank === 4 || rank === 5) {
                if (!state.userItemOverrides) state.userItemOverrides = {};
                if (!Object.prototype.hasOwnProperty.call(state.userItemOverrides, w.name)) {
                    state.userItemOverrides[w.name] = rank;
                    itemDB[w.name] = rank;
                }
            }
            // If rank_type is also missing (0 or NaN), just skip — don't prompt.
        }
    });
    saveState();
    deriveStandardPool(); recomputePityState();
}

// ---------- Resin ----------
function getCurrentResin() {
    const r = state.resin; if (!r || !r.lastSetAt) return r ? r.current : 0;
    const elapsedMin = (Date.now()-new Date(r.lastSetAt).getTime())/1000/60;
    return Math.min((r.current||0)+Math.floor(elapsedMin/8), r.max||200);
}
function timeToFullResin() {
    const r = state.resin, cur = getCurrentResin(), max = r.max||200;
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
                <h2>Weekly Tasks <span class="streak-counter" id="weekly-reset-counter"></span> <span class="streak-counter" id="weekly-edit-toggle-wrap"></span></h2>
                <ul id="weekly-tasks-list" class="task-list"></ul>
                <div class="task-add-row" id="weekly-add-row">
                    <input type="text" class="task-name-input" id="weekly-new-name" placeholder="New weekly task...">
                    <button class="btn btn-primary" id="weekly-add-btn">Add</button>
                </div>
            </div>
        </div>`;
    // Daily edit toggle
    const dWrap = $('daily-edit-toggle-wrap');
    if (dWrap) {
        dWrap.innerHTML = `<button class="btn-icon" id="edit-daily-toggle" title="Edit daily tasks">${pencilSvg()}</button>`;
        const tgl = $('edit-daily-toggle');
        if (tgl) {
            tgl.addEventListener('click', () => {
                _dailyEditMode = !_dailyEditMode;
                document.body.setAttribute('data-edit-daily', String(_dailyEditMode));
                tgl.style.color = _dailyEditMode ? 'var(--accent)' : '';
                tgl.style.borderColor = _dailyEditMode ? 'var(--accent)' : '';
                renderTaskLists();
            });
            if (_dailyEditMode) { document.body.setAttribute('data-edit-daily','true'); tgl.style.color='var(--accent)'; tgl.style.borderColor='var(--accent)'; }
        }
    }
    // Weekly edit toggle
    const wWrap = $('weekly-edit-toggle-wrap');
    if (wWrap) {
        wWrap.innerHTML = `<button class="btn-icon" id="edit-weekly-toggle" title="Edit weekly tasks">${pencilSvg()}</button>`;
        const tgl = $('edit-weekly-toggle');
        if (tgl) {
            tgl.addEventListener('click', () => {
                _weeklyEditMode = !_weeklyEditMode;
                document.body.setAttribute('data-edit-weekly', String(_weeklyEditMode));
                tgl.style.color = _weeklyEditMode ? 'var(--accent)' : '';
                tgl.style.borderColor = _weeklyEditMode ? 'var(--accent)' : '';
                renderTaskLists();
            });
            if (_weeklyEditMode) { document.body.setAttribute('data-edit-weekly','true'); tgl.style.color='var(--accent)'; tgl.style.borderColor='var(--accent)'; }
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
    renderList($('daily-tasks-list'), state.dailyTasks, 'daily', _dailyEditMode);
    renderList($('weekly-tasks-list'), state.weeklyTasks, 'weekly', _weeklyEditMode);
}
function renderList(listEl, data, type, editMode) {
    if (!listEl) return;
    listEl.innerHTML = '';
    data.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.isEvent?'is-event':''} ${task.completed?'locked':''} ${editMode?'editing':''}`;
        const nameHtml = editMode
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
        fc.addEventListener('click', e => { if (editMode) return; handleEventTaskClick(e.target.dataset.type, parseInt(e.target.dataset.index,10)); });
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
    { id: 'newest',     label: 'Newest first' },
    { id: 'oldest',     label: 'Oldest first' },
    { id: 'pity-hi',    label: 'Pity: High \u2192 Low' },
    { id: 'pity-lo',    label: 'Pity: Low \u2192 High' },
    { id: 'wins',       label: 'Wins first' },
    { id: 'losses',     label: 'Losses first' },
    { id: 'guarantees', label: 'Guarantees first' },
    { id: 'name',       label: 'Name (A\u2013Z)' },
];

// Returns a NEW sorted array (does not mutate the input).
function sortPulls(list, mode) {
    const arr = list.slice();
    switch (mode) {
        case 'oldest':  return arr.sort((a,b) => new Date(a.time) - new Date(b.time));
        case 'newest':  return arr.sort((a,b) => new Date(b.time) - new Date(a.time));
        case 'pity-hi': return arr.sort((a,b) => b.pity - a.pity);
        case 'pity-lo': return arr.sort((a,b) => a.pity - b.pity);
        case 'wins':    return arr.sort((a,b) => (a.outcome===b.outcome)?0:(a.outcome==='win'?-1:1));
        case 'losses':  return arr.sort((a,b) => (a.outcome===b.outcome)?0:(a.outcome==='loss'?-1:1));
        case 'guarantees': return arr.sort((a,b) => (a.outcome===b.outcome)?0:(a.outcome==='guarantee'?-1:1));
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
        let outcomeTag = '';
        let pullCls = p.win ? 'win' : 'loss';
        if (p.outcome === 'win') { outcomeTag = '<span class="pull-tag win">WIN</span>'; }
        else if (p.outcome === 'loss') { outcomeTag = '<span class="pull-tag loss">LOSS</span>'; }
        else if (p.outcome === 'guarantee') { outcomeTag = '<span class="pull-tag guarantee">GUARANTEE</span>'; pullCls = 'win'; }
        else if (p.win===true) { outcomeTag = '<span class="pull-tag win">WIN</span>'; }
        else if (p.win===false) { outcomeTag = '<span class="pull-tag loss">LOSS</span>'; }
        const date = p.time ? new Date(p.time).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }) : '';
        return `<div class="gacha-pull ${pullCls}"><span class="pull-name">${escHtml(p.name)}</span>${rarityTag}${outcomeTag}<span class="pull-date">${date}</span><span class="pity-value ${pityCls(p.pity)}">${p.pity}</span></div>`;
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
            <div class="wish-data-row">
                <button id="import-wish-file-btn" class="btn btn-secondary" title="Import wishes from a JSON file (paimon.moe or universal format)">Import Wishes File</button>
                <button id="export-wish-btn" class="btn btn-secondary" title="Export your wish history to a universal JSON file">Export Wishes</button>
                <input type="file" id="wish-file-input" accept=".json" style="display:none;">
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
    $('import-wish-file-btn').addEventListener('click', () => $('wish-file-input').click());
    $('wish-file-input').addEventListener('change', importWishFile);
    $('export-wish-btn').addEventListener('click', exportWishes);
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
        if (cfg.type==='character' && s.five.total>0) {
            details += `<div class="gacha-grid-label indented">\u21B3 Win 50/50</div><div class="gacha-grid-value">${s.five.wins}</div><div class="gacha-grid-value">${f(s.five.total>0?(s.five.wins/s.five.total)*100:0,1)}%</div><div class="gacha-grid-value">-</div>`;
            details += `<div class="gacha-grid-label indented">\u21B3 Lost 50/50</div><div class="gacha-grid-value">${s.five.losses}</div><div class="gacha-grid-value">${f(s.five.total>0?(s.five.losses/s.five.total)*100:0,1)}%</div><div class="gacha-grid-value">-</div>`;
            details += `<div class="gacha-grid-label indented">\u21B3 Guarantee</div><div class="gacha-grid-value">${s.five.guarantees}</div><div class="gacha-grid-value">${f(s.five.total>0?(s.five.guarantees/s.five.total)*100:0,1)}%</div><div class="gacha-grid-value">-</div>`;
        }
        details += `<div class="gacha-grid-label" style="color:var(--purple)">4 \u2605</div><div class="gacha-grid-value purple">${s.four.total}</div><div class="gacha-grid-value">${f(s.four.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.avgPity,2)}</div>`;
        if (cfg.type==='character' && s.four.total>0) {
            details += `<div class="gacha-grid-label indented">\u21B3 Character</div><div class="gacha-grid-value">${s.four.chars.total}</div><div class="gacha-grid-value">${f(s.four.chars.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.chars.avgPity,2)}</div>`;
            details += `<div class="gacha-grid-label indented">\u21B3 Weapon</div><div class="gacha-grid-value">${s.four.weapons.total}</div><div class="gacha-grid-value">${f(s.four.weapons.percent,2)}%</div><div class="gacha-grid-value">${f(s.four.weapons.avgPity,2)}</div>`;
        }
        details += `<div class="gacha-grid-label" style="color:var(--light-blue)">3 \u2605</div><div class="gacha-grid-value" style="color:var(--light-blue)">${s.three.total}</div><div class="gacha-grid-value">${f(s.three.percent,2)}%</div><div class="gacha-grid-value">-</div>`;
        details += '</div>';
        // "View all pulls" button — opens a modal listing every pull, color-coded by rarity.
        details += `<button class="btn btn-secondary view-all-pulls-btn" data-banner="${cfg.id}" style="margin-top:12px;width:100%;">View All ${s.totalWishes} Pulls</button>`;
        if (s.five.list.length>0) {
            const opts = GACHA_SORT_OPTIONS.map(o => `<option value="${o.id}" ${o.id===_gachaSort?'selected':''}>${o.label}</option>`).join('');
            const sorted = sortPulls(s.five.list, _gachaSort);
            const pullsHtml = sorted.map(p => {
                const rarity = getItemRarity(p.name) || 5;
                const rarityTag = rarity === 5 ? '<span class="pull-rarity gold">5\u2605</span>' : '<span class="pull-rarity">5\u2605?</span>';
                // Three outcomes: WIN (won 50/50), LOSS (lost 50/50), GUARANTEE (got featured because previous was a loss).
                let outcomeTag = '';
                let pullCls = p.win ? 'win' : 'loss';
                if (p.outcome === 'win') { outcomeTag = '<span class="pull-tag win">WIN</span>'; }
                else if (p.outcome === 'loss') { outcomeTag = '<span class="pull-tag loss">LOSS</span>'; }
                else if (p.outcome === 'guarantee') { outcomeTag = '<span class="pull-tag guarantee">GUARANTEE</span>'; pullCls = 'win'; }
                else if (p.win===true) { outcomeTag = '<span class="pull-tag win">WIN</span>'; }
                else if (p.win===false) { outcomeTag = '<span class="pull-tag loss">LOSS</span>'; }
                const date = p.time ? new Date(p.time).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }) : '';
                return `<div class="gacha-pull ${pullCls}"><span class="pull-name">${escHtml(p.name)}</span>${rarityTag}${outcomeTag}<span class="pull-date">${date}</span><span class="pity-value ${pityCls(p.pity)}">${p.pity}</span></div>`;
            }).join('');
            details += `<div class="gacha-pulls-header"><label class="pull-sort-label">Sort 5\u2605 pulls: <select class="pull-sort" data-banner="${cfg.id}">${opts}</select></label><span class="pull-count-text">${s.five.list.length} total</span></div><div class="gacha-pulls-container" data-pulls-banner="${cfg.id}">${pullsHtml}</div>`;
        }
        let guarLine = `Guaranteed at ${cfg.hardPity5}`;
        if (cfg.type==='character') guarLine = s.pity.guaranteed ? 'Next 5\u2605 guaranteed featured' : '50/50 active';
        else if (cfg.type==='chronicled') guarLine = 'Every 5\u2605 guaranteed featured';
        // Fate Points dots removed — weapon banner now uses 50/50 + guarantee (same as character banner).
        const fateDots = '';
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
    // Bind "View all pulls" buttons — open a modal listing every pull, color-coded by rarity.
    container.querySelectorAll('.view-all-pulls-btn').forEach(btn => {
        btn.addEventListener('click', () => showAllPullsModal(btn.dataset.banner));
    });
}

// Modal showing every pull on a banner, color-coded by rarity.
async function showAllPullsModal(bannerId) {
    const cfg = BANNERS.find(b => b.id === bannerId); if (!cfg) return;
    const allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes : [];
    const bw = allWishes.filter(w => w.gacha_type === bannerId);
    // newest first (already sorted in storage, but ensure)
    const sorted = bw.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
    const listHtml = sorted.map(w => {
        const rarity = getItemRarity(w.name) || parseInt(w.rank_type, 10) || 3;
        const date = w.time ? new Date(w.time).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' }) : '';
        return `<li class="all-pull rarity-${rarity}"><span class="all-pull-rarity">${rarity}\u2605</span><span class="all-pull-name">${escHtml(w.name)}</span><span class="all-pull-type">${w.item_type || ''}</span><span class="all-pull-date">${date}</span></li>`;
    }).join('');
    await showModal({
        title: `${cfg.name} \u2014 All Pulls (${sorted.length})`,
        customHtml: `<ul class="all-pulls-list">${listHtml}</ul>`,
        confirmText: 'Close',
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
    // Switch to the Gacha view FIRST so the user sees the import status (not the
    // constellation menu) while it runs. Without this, the spinner renders inside
    // the hidden #view-gacha and the user sees the menu with nothing happening.
    showView('view-gacha');
    const container = $('gacha-stats-container');
    // Helper to render the animated importing status (spinner + text + shimmer bar)
    // plus a Cancel button so the user can abort a stuck import at any time.
    let _importAborted = false;
    function renderImportStatus(text) {
        if (!container) return;
        container.innerHTML = `<p class="import-status"><span class="import-spinner"></span><span class="import-text" id="gacha-import-status">${text}</span><span class="import-progress"></span></p><div style="text-align:center;margin-top:10px;"><button id="cancel-import-btn" class="btn btn-secondary">Cancel Import</button></div>`;
        const cancelBtn = document.getElementById('cancel-import-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => { _importAborted = true; setStatus('Cancelling...'); });
    }
    renderImportStatus('Starting import...');
    let allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes.slice() : [];
    // Multiset dedup: count how many of each (gacha_type|name|time) exist.
    // This allows duplicate items from 10-pulls (same name + timestamp) while
    // still catching cross-source duplicates (paimon.moe vs URL import).
    const existingIds = new Set(allWishes.map(w => w.id));
    const existingCounts = {};
    allWishes.forEach(w => { const k = `${w.gacha_type}|${normalizeNameKey(w.name)}|${w.time}`; existingCounts[k] = (existingCounts[k]||0) + 1; });

    function setStatus(text) {
        const el = $('gacha-import-status'); if (el) el.textContent = text;
    }

    // Fetch with proxy fallback. Tries each proxy in order until one returns valid
    // wish data. A non-zero retcode stops that banner (returns null = break).
    //
    // TIMEOUT: Each attempt is raced against a hard timeout via Promise.race. This is
    // bulletproof — it fires regardless of whether AbortController works for the
    // specific cross-origin response (some browsers don't abort opaque/CORS-blocked
    // responses reliably). A hung proxy connection (or a slow body drip) is guaranteed
    // to be caught at 10s, then the next proxy is tried. 5 × 10s = 50s worst-case.
    async function fetchWithRetry(targetUrl, label) {
        const maxAttempts = CORS_PROXIES.length;
        const ATTEMPT_TIMEOUT_MS = 10000;
        const proxyNames = ['corsproxy.io', 'allorigins.win', 'codetabs.com', 'corsproxy.org', 'thingproxy'];
        let lastErr = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (_importAborted) throw new Error('Import cancelled by user.');
            const proxyIdx = (attempt - 1) % CORS_PROXIES.length;
            const proxyUrl = CORS_PROXIES[proxyIdx](targetUrl);
            const proxyName = proxyNames[proxyIdx] || ('proxy ' + (proxyIdx + 1));
            setStatus(`${label}${attempt > 1 ? ` (fallback ${attempt}/${maxAttempts}: ${proxyName})` : ` (via ${proxyName})`}...`);
            try {
                // Race the fetch+parse against a hard timeout. The timeout promise
                // NEVER resolves — it only rejects — so if the fetch hangs, the race
                // settles on the timeout rejection at exactly ATTEMPT_TIMEOUT_MS.
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('__TIMEOUT__')), ATTEMPT_TIMEOUT_MS);
                });
                const fetchPromise = (async () => {
                    const controller = new AbortController();
                    const tid = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
                    try {
                        const response = await fetch(proxyUrl, { signal: controller.signal });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        return data;
                    } finally {
                        clearTimeout(tid);
                    }
                })();
                const data = await Promise.race([fetchPromise, timeoutPromise]);
                if (_importAborted) throw new Error('Import cancelled by user.');
                // Match original behaviour: bad retcode => stop this banner (NOT an error).
                if (data.retcode !== 0) return null;
                return data;
            } catch (e) {
                if (_importAborted) throw new Error('Import cancelled by user.');
                const reason = e.message === '__TIMEOUT__' ? `timed out after ${ATTEMPT_TIMEOUT_MS/1000}s` : e.message;
                lastErr = e;
                if (attempt < maxAttempts) {
                    setStatus(`${label} — ${proxyName} ${reason}, trying next proxy...`);
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    // All proxies failed — surface a clear error rather than hanging.
                    throw new Error(`${label} failed via all proxies (${reason}). You may be rate-limited; wait a minute and try again, or use File Import instead.`);
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
            if (_importAborted) break;
            let endId='0', page=1, foundExisting=false;
            while (!foundExisting && !_importAborted) {
                const params = new URLSearchParams(baseParams);
                params.set('gacha_type', banner.id); params.set('size','20'); params.set('end_id', endId);
                const targetUrl = `${baseUrl}?${params.toString()}`;
                const label = `Fetching ${banner.name} \u2014 page ${page}`;
                const data = await fetchWithRetry(targetUrl, label);
                // null = bad retcode or end of data => stop this banner (like original's break).
                if (!data) break;
                const list = (data.data && data.data.list) || [];
                if (list.length===0) break;
                for (const wish of list) {
                    // Resolve the name to canonical form using the live database.
                    wish.name = resolveItemName(wish.name);
                    wish.gacha_type = String(wish.gacha_type);
                    if (wish.gacha_type === '400') wish.gacha_type = '301';
                    if (existingIds.has(wish.id)) { foundExisting=true; break; }
                    const key = `${wish.gacha_type}|${normalizeNameKey(wish.name)}|${wish.time}`;
                    if (existingCounts[key] > 0) { existingCounts[key]--; continue; }
                    allWishes.push(wish);
                    existingIds.add(wish.id);
                }
                endId = list[list.length-1].id; page++;
                await new Promise(r => setTimeout(r, 300));
            }
        }
        if (_importAborted) {
            // User cancelled — save partial progress (if any) and show a friendly message.
            if (allWishes.length > 0) {
                const unique = Array.from(new Map(allWishes.map(w => [w.id, w])).values());
                unique.sort((a,b) => new Date(b.time) - new Date(a.time));
                state.gachaLog = { wishes: unique, lastImport: new Date().toISOString() };
                saveState(); deriveStandardPool(); recomputePityState();
            }
            renderGachaStats(); renderCalendar(); renderStatusBar();
            await showModal({type:'alert',title:'Import Cancelled',message: allWishes.length > 0 ? `Import cancelled. ${allWishes.length} wishes were saved before you cancelled — re-import later to continue.` : 'Import cancelled. No wishes were fetched.',confirmText:'OK'});
            return;
        }
        // Final dedup by wish ID only (multi-pulls can share name+timestamp).
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

// ---------- Wish data import/export (paimon.moe + universal format) ----------

// Universal name resolution: builds a reverse lookup from the live database.
// Any name (paimon.moe snake_case, UIGF display name, etc.) is normalized to a
// canonical form and matched against the database. No hardcoded aliases needed.
function normalizeNameKey(name) {
    return (name || '').toLowerCase()
        .replace(/['\u2019\u2018`]/g, '')   // strip apostrophes/quotes
        .replace(/[^a-z0-9]+/g, '')            // strip all non-alphanumeric (spaces, underscores, hyphens)
        .trim();
}
let _nameLookup = null;
function buildNameLookup() {
    if (_nameLookup) return _nameLookup;
    _nameLookup = {};
    // Build from the live itemDB (fetched from genshin-db).
    Object.keys(itemDB).forEach(canonicalName => {
        _nameLookup[normalizeNameKey(canonicalName)] = canonicalName;
    });
    // Also add user overrides.
    if (state && state.userItemOverrides) {
        Object.keys(state.userItemOverrides).forEach(name => {
            _nameLookup[normalizeNameKey(name)] = name;
        });
    }
    return _nameLookup;
}
function resolveItemName(rawName) {
    if (!rawName) return rawName;
    const lookup = buildNameLookup();
    const key = normalizeNameKey(rawName);
    // Direct match in the database.
    if (lookup[key]) return lookup[key];
    // Try converting snake_case to title-case as a fallback.
    const titleCased = rawName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const titleKey = normalizeNameKey(titleCased);
    if (lookup[titleKey]) return lookup[titleKey];
    // Not in the database — return the title-cased version.
    return titleCased;
}

// Parse a paimon.moe export file and return an array of wishes in our format.
function parsePaimonMoe(data) {
    const bannerKeys = {
        'wish-counter-character-event': '301',
        'wish-counter-weapon-event': '302',
        'wish-counter-standard': '200',
        'wish-counter-chronicled': '500',
        'wish-counter-beginners': '100',
    };
    const wishes = [];
    // Global counter so every pull gets a UNIQUE id. Without this, two pulls of
    // the same item in one 10-pull (same name + same timestamp) would share an id
    // and the Replace-All dedup-by-id would silently collapse them, dropping pulls
    // and undercounting pity. The counter is appended (not replacing p.id) so the
    // id stays non-numeric and routes through the reverse() path in analyzeBannerData.
    let pmSeq = 0;
    Object.keys(bannerKeys).forEach(bk => {
        const banner = data[bk];
        if (!banner || !Array.isArray(banner.pulls)) return;
        banner.pulls.forEach(p => {
            // Use the pull's own 'code' field as the gacha_type. Code 400 (Character
            // Event 2) is merged into 301 (Character Event) since we track them together.
            const rawCode = p.code || bannerKeys[bk];
            const gachaType = (rawCode === '400') ? '301' : rawCode;
            const name = resolveItemName(p.id);
            const rarity = getItemRarity(name);
            // If rarity is unknown (not in DB), use '0' so checkUnknownItems prompts the user.
            wishes.push({
                id: 'pm_' + gachaType + '_' + p.time.replace(/[^0-9]/g, '') + '_' + (p.id || '') + '_' + String(pmSeq++).padStart(8, '0'),
                gacha_type: gachaType,
                name: name,
                item_type: p.type === 'character' ? 'Character' : 'Weapon',
                rank_type: rarity ? String(rarity) : '0',
                time: p.time,
            });
        });
    });
    return wishes;
}

// Detect format and parse any supported wish-data JSON file.
function parseWishFile(text) {
    const data = JSON.parse(text);
    // paimon.moe format: has wish-counter-* keys
    if (data['wish-counter-character-event'] || data['wish-counter-standard']) {
        return { format: 'paimon.moe', wishes: parsePaimonMoe(data), uid: data['wish-uid'] || '' };
    }
    // UIGF format (community standard): { info: {...}, list: [...] }
    if (data.info && Array.isArray(data.list)) {
        const wishes = data.list.map(w => ({
            id: w.id || ('uigf_' + w.gacha_type + '_' + w.time.replace(/[^0-9]/g, '') + '_' + (w.name||'').replace(/\s/g, '_')),
            gacha_type: w.uigf_gacha_type || w.gacha_type,
            name: w.name,
            item_type: w.item_type || '',
            rank_type: String(w.rank_type || ''),
            time: w.time,
        }));
        return { format: 'UIGF', wishes, uid: data.info.uid || '' };
    }
    // Our universal format: { format: 'constellation-wishes-v1', wishes: [...] }
    if (data.format === 'constellation-wishes-v1' && Array.isArray(data.wishes)) {
        return { format: 'universal', wishes: data.wishes, uid: data.uid || '' };
    }
    // Raw array of wishes
    if (Array.isArray(data) && data.length > 0 && data[0].gacha_type && data[0].name && data[0].time) {
        return { format: 'raw-array', wishes: data, uid: '' };
    }
    throw new Error('Unrecognised wish data format. Supported: paimon.moe, UIGF, Constellation universal, or raw wish array.');
}

// Import wishes from a file (paimon.moe, UIGF, universal, or raw array). Merges or replaces.
async function importWishFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
        const text = await file.text();
        const parsed = parseWishFile(text);
        const existingCount = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes.length : 0;
        // Determine import mode: Replace All or Merge.
        let importMode = 'replace';
        if (existingCount > 0) {
            // Show a custom modal with Replace / Merge / Cancel buttons (not showModal).
            const modal = $('custom-modal');
            const title = $('modal-title'), msg = $('modal-message'), input = $('modal-input'), custom = $('modal-custom-content');
            const cancelB = $('modal-cancel-btn'), confirmB = $('modal-confirm-btn');
            title.textContent = 'Import Wishes';
            msg.innerHTML = `Detected <b>${parsed.format}</b> format with <b>${parsed.wishes.length}</b> pulls.<br><br>You currently have <b>${existingCount}</b> wishes. Choose how to import:`;
            msg.style.display = 'block';
            input.style.display = 'none';
            custom.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
                <button class="btn btn-primary" id="import-replace-btn" style="width:100%;">Replace All (recommended — wipes existing &amp; imports fresh)</button>
                <button class="btn btn-secondary" id="import-merge-btn" style="width:100%;">Merge (add only new pulls, skip duplicates)</button>
            </div>`;
            custom.style.display = 'block';
            cancelB.style.display = 'inline-flex';
            cancelB.textContent = 'Cancel';
            confirmB.style.display = 'none';
            modal.classList.add('visible');
            importMode = await new Promise(resolve => {
                const repBtn = $('import-replace-btn'), mergeBtn = $('import-merge-btn');
                const done = (mode) => { modal.classList.remove('visible'); resolve(mode); };
                if (repBtn) repBtn.onclick = () => done('replace');
                if (mergeBtn) mergeBtn.onclick = () => done('merge');
                cancelB.onclick = () => done(null);
            });
            cancelB.style.display = '';
            confirmB.style.display = '';
            cancelB.onclick = null;
            if (!importMode) return; // cancelled
        }

        // Universal name resolution: resolve every wish name to its canonical form
        // using the live database. This handles apostrophes, snake_case, etc. universally.
        _nameLookup = null; // force rebuild with current DB
        parsed.wishes.forEach(w => {
            w.name = resolveItemName(w.name);
            w.gacha_type = String(w.gacha_type);
            if (w.gacha_type === '400') w.gacha_type = '301';
        });

        let allWishes, added;
        if (importMode === 'replace') {
            // Dedup by wish ID only (multi-pulls share name+timestamp).
            allWishes = Array.from(new Map(parsed.wishes.map(w => [w.id, w])).values());
            added = allWishes.length;
        } else {
            allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes.slice() : [];
            const existingIds = new Set(allWishes.map(w => w.id));
            // Multiset: count existing pulls per key (allows 10-pull duplicates).
            const existingCounts = {};
            allWishes.forEach(w => { const k = `${w.gacha_type}|${normalizeNameKey(w.name)}|${w.time}`; existingCounts[k] = (existingCounts[k]||0) + 1; });
            added = 0;
            parsed.wishes.forEach(w => {
                if (existingIds.has(w.id)) return;
                const key = `${w.gacha_type}|${normalizeNameKey(w.name)}|${w.time}`;
                if (existingCounts[key] > 0) { existingCounts[key]--; return; }
                allWishes.push(w); added++;
            });
        }
        allWishes.sort((a, b) => new Date(b.time) - new Date(a.time));
        state.gachaLog = { wishes: allWishes, lastImport: new Date().toISOString() };
        saveState();
        deriveStandardPool();
        await checkUnknownItems();
        renderGachaStats(); renderCalendar(); renderStatusBar();
        await showModal({ type: 'alert', title: 'Import Complete', message: `${importMode === 'replace' ? 'Replaced with' : 'Added'} ${added} wish${added === 1 ? '' : 'es'} (${allWishes.length} total).`, confirmText: 'OK' });
    } catch (err) {
        await showModal({ type: 'alert', title: 'Import Failed', message: err.message || String(err), confirmText: 'OK' });
        renderGachaStats();
    }
}

// Export wishes in a clean universal JSON format that other tools can import.
async function exportWishes() {
    if (!state.gachaLog || !state.gachaLog.wishes || state.gachaLog.wishes.length === 0) {
        await showModal({ type: 'alert', title: 'No Wishes', message: 'You have no wish history to export. Import your gacha log first.', confirmText: 'OK' });
        return;
    }
    // Ask which format to export
    const modalPromise = showModal({
        title: 'Export Format',
        message: 'Choose an export format:',
        customHtml: `<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" id="export-uigf" style="width:100%;">UIGF v4.0 (recommended — works with paimon.moe, stardb.gg, etc.)</button>
            <button class="btn btn-secondary" id="export-constellation" style="width:100%;">Constellation format (includes rarity + banner names)</button>
        </div>`,
        type: 'alert',
        confirmText: 'Cancel',
    });
    // Wire the custom buttons to set the format and close the modal.
    setTimeout(() => {
        const uigfBtn = $('export-uigf'), constBtn = $('export-constellation');
        const modal = $('custom-modal');
        if (uigfBtn) uigfBtn.onclick = () => { window._exportFormat = 'uigf'; modal.classList.remove('visible'); };
        if (constBtn) constBtn.onclick = () => { window._exportFormat = 'constellation'; modal.classList.remove('visible'); };
    }, 100);
    await modalPromise;
    // Determine which was clicked (default to UIGF if cancelled)
    const format = window._exportFormat || 'uigf';
    window._exportFormat = null;

    try {
        let exportData, filename;
        const d = new Date();
        const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const accSlug = getActiveAccountName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'account';
        const ts = Math.floor(d.getTime() / 1000);

        if (format === 'uigf') {
            // UIGF v4.0 — the community standard for wish data interchange.
            exportData = {
                info: {
                    uid: '',
                    lang: 'en-us',
                    export_time: d.toISOString().replace('T', ' ').substring(0, 19),
                    export_timestamp: ts,
                    export_app: 'Constellation',
                    export_app_version: '1.0',
                    uigf_version: 'v4.0',
                },
                list: state.gachaLog.wishes.map(w => ({
                    uigf_gacha_type: w.gacha_type,
                    gacha_type: w.gacha_type,
                    id: w.id,
                    name: w.name,
                    item_type: w.item_type || '',
                    rank_type: String(w.rank_type || ''),
                    time: w.time,
                })),
            };
            filename = `UIGF_${accSlug}_${stamp}.json`;
        } else {
            // Constellation format — includes rarity + banner names for our own re-import.
            exportData = {
                format: 'constellation-wishes-v1',
                exportedAt: d.toISOString(),
                account: getActiveAccountName(),
                uid: '',
                bannerNames: BANNERS.reduce((m, b) => { m[b.id] = b.name; return m; }, {}),
                wishes: state.gachaLog.wishes.map(w => ({
                    id: w.id,
                    gacha_type: w.gacha_type,
                    banner: BANNERS.find(b => b.id === w.gacha_type)?.name || w.gacha_type,
                    name: w.name,
                    item_type: w.item_type || '',
                    rank_type: String(w.rank_type),
                    rarity: parseInt(w.rank_type, 10) || getItemRarity(w.name) || 3,
                    time: w.time,
                })),
            };
            filename = `constellation-wishes-${accSlug}-${stamp}.json`;
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
        await showModal({ type: 'alert', title: 'Export Failed', message: e.message, confirmText: 'OK' });
    }
}

// ---------- Primos ----------
function renderPrimos() {
    const el = $('view-primos'); if (!el) return;
    const days = 30;
    const dailyEst = days*60 + days*(state.otherDailyPrimos||0);
    const welkinEst = state.welkinActive ? days*90 : 0;
    const current = state.primogemCount||0;
    const total = current + dailyEst + welkinEst;
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
function renderMapView() {
    // Fullscreen embedded interactive map (genshin-impact-map.appsample.com).
    // The iframe fills the entire viewport when the Map view is active.
    const el = $('view-map'); if (!el) return;
    el.innerHTML = `<iframe id="interactive-map-iframe" src="https://genshin-impact-map.appsample.com/?map=teyvat"></iframe>`;
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
    // newest first, color-coded by rarity (left border + rarity tag color)
    const sorted = pulls.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
    const listHtml = sorted.map(p => {
        const r = getItemRarity(p.name) || parseInt(p.rank_type, 10) || 3;
        const time = p.time ? new Date(p.time).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '';
        return `<li class="rarity-${r}"><span class="rarity-${r}" style="font-weight:700;margin-right:8px;">${r}\u2605</span><span style="color:var(--primary-text)">${escHtml(p.name)}</span><span style="color:var(--secondary-text);font-size:0.85em;margin-left:auto;">${time}</span></li>`;
    }).join('');
    await showModal({ title:`Pulls for ${dateKey} (${pulls.length})`, customHtml:`<ul class="pull-breakdown-list">${listHtml}</ul>`, confirmText:'Close' });
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
        <div class="settings-section" style="text-align:center;color:var(--secondary-text);font-size:0.8em;opacity:0.7;">
            <p>Constellation v10 &middot; timeout-protected import</p>
            <p style="font-size:0.9em;margin-top:4px;">If the import hangs on "via corsproxy.io" for more than 10 seconds without falling back, you are viewing a CACHED old version. Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) to load the latest.</p>
        </div>
    </div>`;
    document.querySelectorAll('.theme-chip').forEach(chip => chip.addEventListener('click', () => { const n=chip.dataset.theme; applyTheme(n, _customAccent); saveTheme(n, _customAccent); renderSettings(); }));
    const ai = $('custom-accent-input');
    if (ai) { ai.addEventListener('input', e => applyTheme(_activeTheme, e.target.value)); ai.addEventListener('change', e => { saveTheme(_activeTheme, e.target.value); renderSettings(); }); }
    const ra = $('reset-accent-btn'); if (ra) ra.addEventListener('click', () => { _customAccent=null; applyTheme(_activeTheme, null); saveTheme(_activeTheme, null); renderSettings(); });
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
        a.href = url; a.download = `constellation-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { await showModal({type:'alert',title:'Export Failed',message:e.message,confirmText:'OK'}); }
}
async function importData(e) {
    const file = e.target.files && e.target.files[0]; e.target.value='';
    if (!file) return;
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Check if it's a full Constellation state backup.
        const required = ['dailyTasks','weeklyTasks','primogemCount','gachaLog'];
        if (required.every(k => Object.prototype.hasOwnProperty.call(parsed, k))) {
            if (!await showModal({title:'Import Data',message:'This will replace all current data for this account. Continue?',type:'confirm'})) return;
            state = mergeDefaults(parsed); state.stateVersion = STATE_VERSION; saveState();
            await loadItemDB(); deriveStandardPool(); recomputePityState(); renderAll();
            await showModal({type:'alert',title:'Import Complete',message:'Your data has been restored.',confirmText:'OK'});
            return;
        }
        // Not a full backup — try parsing as a wish-data file (paimon.moe / universal / raw array).
        try {
            const wishParsed = parseWishFile(text);
            const ok = await showModal({
                title: 'Import Wishes',
                message: `This looks like a <b>${wishParsed.format}</b> wish file with <b>${wishParsed.wishes.length}</b> pulls.${wishParsed.wishes.length > 0 ? '<br><br>This will merge with your existing wish history (duplicates are skipped by pull ID).' : ''}`,
                type: 'confirm',
                confirmText: 'Import',
            });
            if (!ok) return;
            let allWishes = (state.gachaLog && state.gachaLog.wishes) ? state.gachaLog.wishes.slice() : [];
            // Universal name resolution + dedup.
            _nameLookup = null;
            wishParsed.wishes.forEach(w => {
                w.name = resolveItemName(w.name);
                w.gacha_type = String(w.gacha_type);
                if (w.gacha_type === '400') w.gacha_type = '301';
            });
            const existingIds = new Set(allWishes.map(w => w.id));
            const existingCounts = {};
            allWishes.forEach(w => { const k = `${w.gacha_type}|${normalizeNameKey(w.name)}|${w.time}`; existingCounts[k] = (existingCounts[k]||0) + 1; });
            let added = 0;
            wishParsed.wishes.forEach(w => {
                if (existingIds.has(w.id)) return;
                const key = `${w.gacha_type}|${normalizeNameKey(w.name)}|${w.time}`;
                if (existingCounts[key] > 0) { existingCounts[key]--; return; }
                allWishes.push(w); added++;
            });
            allWishes.sort((a, b) => new Date(b.time) - new Date(a.time));
            state.gachaLog = { wishes: allWishes, lastImport: new Date().toISOString() };
            saveState();
            deriveStandardPool();
            await checkUnknownItems();
            renderAll();
            await showModal({ type: 'alert', title: 'Import Complete', message: `Imported ${added} new wish${added === 1 ? '' : 'es'} (${allWishes.length} total).`, confirmText: 'OK' });
        } catch (wishErr) {
            await showModal({type:'alert',title:'Invalid File',message:'This file is neither a Constellation backup nor a recognised wish-data file (paimon.moe / universal / raw array).',confirmText:'OK'});
        }
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
    const back = $('back-button-hotspot'), header = document.querySelector('.header-section'), statusBar = $('status-bar');
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
    $('btn-back-main').addEventListener('click', () => showView('main-menu'));
    const tick = () => { $('live-clock').textContent = new Date().toLocaleTimeString('en-US', { hour12:true, hour:'2-digit', minute:'2-digit' }); };
    tick(); setInterval(tick, 1000);
}

async function init() {
    // Global safety net: if ANY uncaught error happens during init, still force the
    // constellation menu visible so the user never sees a blank page. This is the
    // last line of defence against environment-specific throws (e.g. GitHub Pages).
    window.addEventListener('error', (e) => {
        console.error('Uncaught error:', e.error || e.message);
        try { forceMenuVisible(); } catch(_) {}
    });
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled rejection:', e.reason);
        try { forceMenuVisible(); } catch(_) {}
    });

    $('custom-modal').innerHTML = `<div class="modal-content"><h3 id="modal-title"></h3><p id="modal-message"></p><div id="modal-custom-content"></div><input type="text" id="modal-input" class="modal-input" style="display:none;"><div class="modal-buttons"><button id="modal-cancel-btn" class="btn btn-secondary">Cancel</button><button id="modal-confirm-btn" class="btn btn-primary">Confirm</button></div></div>`;
    loadTheme();

    initAccountPill();
    loadState();
    // Kick off the rarity-DB load WITHOUT awaiting. The UI must render immediately
    // (constellation menu, status bar, clock) even if the network fetch is slow or
    // blocked (e.g. GitHub Pages with no cached DB, or api.github.com rate-limiting).
    // loadItemDB applies cached/fallback data synchronously, then refreshes in the
    // background and re-renders gacha/pity/status once rarities are available.
    loadItemDB();
    // Wrap data-dependent steps so a throw in any one never blocks the UI rendering.
    try { deriveStandardPool(); } catch(e) { console.warn('deriveStandardPool failed', e); }
    try { recomputePityState(); } catch(e) { console.warn('recomputePityState failed', e); }
    try { checkForAutomaticResets(); } catch(e) { console.warn('checkForAutomaticResets failed', e); }
    // Start the clock + bind nav clicks FIRST so the header is alive immediately.
    try { startResinTicker(); } catch(e) { console.warn('startResinTicker failed', e); }
    try { bindGlobalEvents(); } catch(e) { console.warn('bindGlobalEvents failed', e); }
    // Show the constellation menu BEFORE rendering the (hidden) sub-views. This way,
    // even if a sub-view render throws, the menu is already visible to the user.
    try { showView('main-menu'); } catch(e) { console.warn('showView failed', e); forceMenuVisible(); }
    try { setTimeout(animateConstellationEntry, 50); } catch(e) { console.warn('animateConstellationEntry failed', e); }
    // Render each sub-view in its own try/catch so one broken view can't break the rest.
    try { renderTasks(); } catch(e) { console.warn('renderTasks failed', e); }
    try { renderPrimos(); } catch(e) { console.warn('renderPrimos failed', e); }
    try { renderGachaStats(); } catch(e) { console.warn('renderGachaStats failed', e); }
    try { renderCalendar(); } catch(e) { console.warn('renderCalendar failed', e); }
    try { renderSettings(); } catch(e) { console.warn('renderSettings failed', e); }
    try { renderStatusBar(); } catch(e) { console.warn('renderStatusBar failed', e); }
    try { saveState(); } catch(e) { console.warn('saveState failed', e); }
}

// Last-resort: force the constellation menu + clock + status bar visible even if
// the rest of init threw. Used by the global error handler and as a showView fallback.
function forceMenuVisible() {
    const menu = document.getElementById('main-menu');
    if (menu) menu.classList.add('active');
    document.body.setAttribute('data-view', 'main-menu');
    // Kick the clock if it's still showing dashes.
    const clock = document.getElementById('live-clock');
    if (clock && clock.textContent && clock.textContent.includes('-')) {
        try { clock.textContent = new Date().toLocaleTimeString('en-US', { hour12:true, hour:'2-digit', minute:'2-digit' }); } catch(e) {}
    }
    // Animate the stars in if they haven't already.
    try {
        if (document.querySelectorAll('.const-star.entered').length === 0) {
            document.querySelectorAll('.const-star').forEach((s, i) => {
                setTimeout(() => s.classList.add('entered'), 50 + i * 70);
            });
        }
    } catch(e) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
