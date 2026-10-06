(() => {
    "use strict";

    // Early error hook so future failures aren't silent
    window.addEventListener('error', (e) => {
        // eslint-disable-next-line no-console
        console.error('[SENTINEL]', e.message, e.error && e.error.stack);
    });

    // ============================================================
    //  ELEMENTS
    // ============================================================
    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay');
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const bootEl = document.getElementById('boot');
    const bootMsg = document.getElementById('bootMsg');
    const activateBtn = document.getElementById('activateBtn');
    const clockEl = document.getElementById('clock');
    const hudEl = document.getElementById('hud');
    const telemetryEl = document.getElementById('telemetry');
    const toastEl = document.getElementById('toast');

    const tFps = document.getElementById('tFps');
    const tHands = document.getElementById('tHands');
    const tPose = document.getElementById('tPose');
    const tSpeed = document.getElementById('tSpeed');
    const tSpeedBar = document.getElementById('tSpeedBar');

    const settingsPanel = document.getElementById('settingsPanel');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsClose = document.getElementById('settingsClose');
    const panelOverlay = document.getElementById('panelOverlay');

    const accentCustom = document.getElementById('accentCustom');
    const glowCustom = document.getElementById('glowCustom');
    const presetSelect = document.getElementById('presetSelect');

    // ============================================================
    //  SHARED POOLS  (declared early so nothing else can TDZ on them)
    // ============================================================
    const particles = [];
    const ambientParticles = [];
    const glitchBars = [];

    // ============================================================
    //  CONFIG
    // ============================================================
    const DEFAULTS = {
        enableHands: true,
        maxHands: 2,
        modelComplexity: 1,
        minDetection: 0.6,
        minTracking: 0.6,

        stabilization: 0.55,
        responsiveness: 0.5,
        prediction: 1.0,
        graceFrames: 6,

        showHand: true,
        skeletonMode: 'solid',
        boneColorMode: 'accent',
        boneWidth: 1.0,
        segCount: 1,
        segGap: 0.18,
        segTaper: 0.15,
        jointStyle: 'dot',
        jointRadius: 1.8,
        glowOpacity: 0.10,

        showLowPoly: false,
        meshStyle: 'slab',
        lowPolyOpacity: 0.72,
        lowPolyDensity: 1,
        depthScale: 1.0,
        lowPolyShade: true,
        lowPolyEdges: true,

        fxReticle: false,
        fxLabels: false,
        fxAngles: false,
        fxAxis: false,
        fxTrail: false,
        fxComet: false,
        fxBounds: false,
        fxVector: false,
        fxRings: false,
        fxPulse: false,
        fxScan: false,
        fxTag: false,
        fxPose: false,
        fxPinch: false,
        fxPoint: false,
        fxPredict: false,
        fxZfog: false,
        fxGrid: false,

        fxParticles: false,
        fxSparkle: false,
        fxConstellation: false,
        fxHearts: false,
        fxRipple: false,
        fxConfetti: false,
        fxSnow: false,
        fxSpeedGlow: false,
        fxShake: false,
        fxGlitch: false,
        fxAura: false,
        fxRainbow: false,
        trailLength: 22,
        particleCap: 240,

        accent: '#ffffff',
        accentName: 'WHITE',
        glowColor: '#ffffff',
        videoGrayscale: true,
        videoMirror: true,
        videoBrightness: 0.92,
        videoContrast: 1.10,
        videoSaturate: 0.55,

        facingMode: 'user',
        resolution: '1280x720',
        pauseOnHide: true,

        showTelemetry: true,
        showClock: true,
        showFps: true,
        gestureShortcuts: false,
        fpsCap: 60,
    };

    const STORAGE_KEY = 'sentinel.config.v5';
    const config = { ...DEFAULTS };

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) Object.assign(config, DEFAULTS, JSON.parse(raw));
        } catch (e) { }
    }
    function saveConfig() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) { }
    }

    // ============================================================
    //  PRESETS
    // ============================================================
    const PRESETS = {
        default: {},
        cyber: {
            accent: '#00e0b8', accentName: 'TEAL', glowColor: '#00e0b8',
            showLowPoly: true, meshStyle: 'neon', lowPolyOpacity: 0.6,
            skeletonMode: 'neon', glowOpacity: 0.32, boneWidth: 1.6,
            fxSparkle: true, fxConstellation: true, fxPulse: true,
            fxTrail: true, fxParticles: true,
            videoSaturate: 0.35, videoBrightness: 0.85,
        },
        thermal: {
            accent: '#ff5c5c', accentName: 'RED', glowColor: '#ffb37a',
            showLowPoly: true, meshStyle: 'thermal', lowPolyOpacity: 0.85,
            fxZfog: true, fxLabels: true,
            videoSaturate: 0.15, videoBrightness: 0.75, videoContrast: 1.25,
        },
        minimal: {
            accent: '#ffffff', accentName: 'WHITE', glowColor: '#ffffff',
            showLowPoly: false, showHand: true,
            skeletonMode: 'solid', boneColorMode: 'accent',
            boneWidth: 1.4, glowOpacity: 0.06, jointStyle: 'dot', jointRadius: 2,
            fxReticle: false, fxTrail: false, fxRings: false,
        },
        arcade: {
            accent: '#ffd166', accentName: 'AMBER', glowColor: '#ff5c5c',
            showHand: true, boneWidth: 2.4, skeletonMode: 'rope',
            glowOpacity: 0.30, jointStyle: 'square', jointRadius: 3,
            fxSparkle: true, fxConfetti: true, fxParticles: true,
            fxHearts: true, fxShake: true, fxGlitch: true,
            meshStyle: 'holo', showLowPoly: true, lowPolyOpacity: 0.55,
            videoSaturate: 0.9, videoBrightness: 1.05,
        },
        cinema: {
            accent: '#b28dff', accentName: 'VIOLET', glowColor: '#5fc9ff',
            videoSaturate: 0.28, videoBrightness: 0.72, videoContrast: 1.35,
            meshStyle: 'xray', showLowPoly: true, lowPolyOpacity: 0.45,
            glowOpacity: 0.06, skeletonMode: 'dotted', boneWidth: 0.9,
            fxZfog: true, fxComet: true, fxTrail: true,
        },
    };

    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        Object.assign(config, DEFAULTS, p);
        updateAccentRGB();
        updateGlowRGB();
        applyVideoFilter();
        syncAllInputs();
        updateSliderFillAll();
        onConfigChange('showTelemetry', config.showTelemetry);
        onConfigChange('showClock', config.showClock);
        saveConfig();
        showToast(`Preset · ${name.toUpperCase()}`);
    }

    // ============================================================
    //  MATH
    // ============================================================
    const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
    function dist3(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }

    // ============================================================
    //  COLOR LUTS
    // ============================================================
    const ACCENT_RGB = { r: 255, g: 255, b: 255 };
    const GLOW_RGB = { r: 255, g: 255, b: 255 };
    const RGBA_LUT = new Array(33);
    const GLOW_LUT = new Array(33);

    function hexToRgb(hex) {
        const h = (hex || '#ffffff').replace('#', '');
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        return {
            r: parseInt(full.substring(0, 2), 16) || 0,
            g: parseInt(full.substring(2, 4), 16) || 0,
            b: parseInt(full.substring(4, 6), 16) || 0,
        };
    }

    function updateAccentRGB() {
        const c = hexToRgb(config.accent);
        ACCENT_RGB.r = c.r; ACCENT_RGB.g = c.g; ACCENT_RGB.b = c.b;
        document.documentElement.style.setProperty('--accent-hex', config.accent);
        RGBA_LUT.fill(undefined);
    }
    function updateGlowRGB() {
        const c = hexToRgb(config.glowColor || config.accent);
        GLOW_RGB.r = c.r; GLOW_RGB.g = c.g; GLOW_RGB.b = c.b;
        document.documentElement.style.setProperty('--glow-hex', config.glowColor);
        GLOW_LUT.fill(undefined);
    }
    function rgbaQ(a) {
        if (a <= 0) return 'rgba(0,0,0,0)';
        if (a >= 1) a = 1;
        let idx = (a * 32 + 0.5) | 0;
        if (idx < 0) idx = 0; else if (idx > 32) idx = 32;
        let s = RGBA_LUT[idx];
        if (s === undefined) {
            s = `rgba(${ACCENT_RGB.r},${ACCENT_RGB.g},${ACCENT_RGB.b},${idx / 32})`;
            RGBA_LUT[idx] = s;
        }
        return s;
    }
    function glowQ(a) {
        if (a <= 0) return 'rgba(0,0,0,0)';
        if (a >= 1) a = 1;
        let idx = (a * 32 + 0.5) | 0;
        if (idx < 0) idx = 0; else if (idx > 32) idx = 32;
        let s = GLOW_LUT[idx];
        if (s === undefined) {
            s = `rgba(${GLOW_RGB.r},${GLOW_RGB.g},${GLOW_RGB.b},${idx / 32})`;
            GLOW_LUT[idx] = s;
        }
        return s;
    }

    // ============================================================
    //  ONE-EURO FILTER
    // ============================================================
    class LowPass {
        constructor() { this.y = 0; this.initialized = false; }
        filter(x, alpha) {
            if (!this.initialized) { this.y = x; this.initialized = true; }
            else this.y = alpha * x + (1 - alpha) * this.y;
            return this.y;
        }
        reset() { this.initialized = false; this.y = 0; }
    }

    class OneEuroFilter {
        constructor(minCutoff, beta, dCutoff) {
            this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
            this.xFilt = new LowPass(); this.dxFilt = new LowPass();
            this.prevX = null; this.prevT = null;
            this.value = 0; this.velocity = 0;
        }
        setParams(minCutoff, beta, dCutoff) {
            this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
        }
        alpha(cutoff, dt) {
            const tau = 1 / (2 * Math.PI * cutoff);
            return 1 / (1 + tau / dt);
        }
        filter(x, tSec) {
            if (this.prevT === null) {
                this.prevT = tSec; this.prevX = x;
                this.value = this.xFilt.filter(x, 1);
                this.velocity = 0;
                return this.value;
            }
            const dt = tSec - this.prevT;
            if (dt <= 0) return this.value;
            const dx = (x - this.prevX) / dt;
            this.prevX = x; this.prevT = tSec;
            const aD = this.alpha(this.dCutoff, dt);
            const dxHat = this.dxFilt.filter(dx, aD);
            const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
            const a = this.alpha(cutoff, dt);
            this.value = this.xFilt.filter(x, a);
            this.velocity = dxHat;
            return this.value;
        }
        reset() {
            this.xFilt.reset(); this.dxFilt.reset();
            this.prevX = null; this.prevT = null;
            this.value = 0; this.velocity = 0;
        }
    }

    const minCutoffFromStabilization = s => 12 * Math.pow(0.038, s);
    const betaFromResponsiveness = r => 0.003 + r * 0.117;
    const D_CUTOFF = 1.0;

    // ============================================================
    //  STATE
    // ============================================================
    let active = false;
    let mediaStream = null;
    let rafInfer = null;
    let rafRender = null;
    let inferLast = 0;
    let fpsSmooth = 0;
    let inferenceInFlight = false;
    let handData = [];
    let hands = null;

    // ============================================================
    //  CANVAS SIZE + COVER MAPPING
    // ============================================================
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    const cover = { valid: false, drawW: 0, drawH: 0, offsetX: 0, offsetY: 0 };

    function updateCover() {
        const vw = video.videoWidth | 0;
        const vh = video.videoHeight | 0;
        if (!vw || !vh || !viewW || !viewH) { cover.valid = false; return; }
        const cA = viewW / viewH;
        const vA = vw / vh;
        let dW, dH;
        if (vA > cA) { dH = viewH; dW = viewH * vA; }
        else { dW = viewW; dH = viewW / vA; }
        cover.drawW = dW; cover.drawH = dH;
        cover.offsetX = (viewW - dW) / 2;
        cover.offsetY = (viewH - dH) / 2;
        cover.valid = true;
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        viewW = window.innerWidth;
        viewH = window.innerHeight;
        canvas.width = Math.round(viewW * dpr);
        canvas.height = Math.round(viewH * dpr);
        canvas.style.width = viewW + 'px';
        canvas.style.height = viewH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        updateCover();
        // NOTE: snow is seeded once from init(); resizing leaves existing flakes be.
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    video.addEventListener('loadedmetadata', updateCover);
    video.addEventListener('loadeddata', updateCover);
    resize();

    function projectX(nx) { return cover.offsetX + (config.videoMirror ? 1 - nx : nx) * cover.drawW; }
    function projectY(ny) { return cover.offsetY + ny * cover.drawH; }
    function projectZ(nz) { return (nz || 0) * (cover.drawW || viewW) * config.depthScale; }

    // ============================================================
    //  LANDMARK TOPOLOGY
    // ============================================================
    const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17],
    ];
    const FINGER_CHAINS = [
        [1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20],
    ];
    const FINGERTIPS = [4, 8, 12, 16, 20];
    const IS_TIP = new Uint8Array(21);
    for (let i = 0; i < 5; i++) IS_TIP[FINGERTIPS[i]] = 1;

    // Per-finger colors (T, I, M, R, P) used by `per-finger` bone mode.
    const FINGER_COLORS = [
        [255, 96, 96],   // Thumb
        [255, 210, 80],  // Index
        [120, 255, 120], // Middle
        [90, 180, 255],  // Ring
        [210, 120, 255], // Pinky
    ];
    // Map each HAND_CONNECTIONS index to a finger 0..4 (palm bones fall back to middle)
    const BONE_FINGER = new Uint8Array(HAND_CONNECTIONS.length);
    for (let i = 0; i < BONE_FINGER.length; i++) {
        if (i <= 3) BONE_FINGER[i] = 0;
        else if (i >= 5 && i <= 7) BONE_FINGER[i] = 1;
        else if (i >= 9 && i <= 11) BONE_FINGER[i] = 2;
        else if (i >= 13 && i <= 15) BONE_FINGER[i] = 3;
        else if (i >= 17 && i <= 19) BONE_FINGER[i] = 4;
        else BONE_FINGER[i] = 2; // palm bones
    }

    function colorForBone(boneIdx, pts) {
        const mode = config.boneColorMode;
        if (mode === 'per-finger') {
            const c = FINGER_COLORS[BONE_FINGER[boneIdx]];
            return `rgba(${c[0]},${c[1]},${c[2]},0.94)`;
        }
        if (mode === 'gradient') {
            const c = HAND_CONNECTIONS[boneIdx];
            const a = pts[c[0]], b = pts[c[1]];
            const t = clamp(((a.z + b.z) * 0.5 + 120) / 240, 0, 1);
            const r = (255 * (1 - t)) | 0;
            const bl = (255 * t) | 0;
            return `rgba(${r},160,${bl},0.94)`;
        }
        return rgbaQ(0.94);
    }

    // ============================================================
    //  CLOCK
    // ============================================================
    function tickClock() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    setInterval(tickClock, 1000);
    tickClock();

    // ============================================================
    //  TOAST
    // ============================================================
    let toastTimer = 0;
    function showToast(text, ms) {
        toastEl.textContent = text;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 1100);
    }

    // ============================================================
    //  CACHED FONTS
    // ============================================================
    const FONT_MONO_9 = '9px ui-monospace, Menlo, monospace';
    const FONT_MONO_8 = '8px ui-monospace, Menlo, monospace';
    const FONT_MONO_11B = 'bold 11px ui-monospace, Menlo, monospace';

    // ============================================================
    //  MESH TOPOLOGY
    // ============================================================
    const meshTopologyCache = new Map();

    function buildTopology(density) {
        const sides = [4, 6, 8][density] || 6;
        const palmN = 18;
        const fingerN = 3 * sides + 1;
        const vertCount = palmN + 5 * fingerN;

        const faces = [];
        const recipes = new Array(vertCount);

        const palmLm = [0, 1, 5, 9, 13, 17];
        for (let i = 0; i < 6; i++) recipes[i] = { k: 0, lm: palmLm[i] };
        for (let i = 0; i < 6; i++) recipes[6 + i] = { k: 1, lm: palmLm[i] };
        for (let i = 0; i < 6; i++) recipes[12 + i] = { k: 2, lm: palmLm[i] };

        faces.push([6, 7, 8, 9, 10, 11]);
        faces.push([12, 13, 14, 15, 16, 17]);

        for (let i = 0; i < 6; i++) {
            const j = (i + 1) % 6;
            faces.push([6 + i, 6 + j, j, i]);
            faces.push([i, j, 12 + j, 12 + i]);
        }

        const fingerLm = [
            [1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20],
        ];
        const fingerRad = [0.135, 0.100, 0.105, 0.092, 0.075];
        const taper = [1.0, 0.88, 0.78, 0.62];

        let base = palmN;
        for (let f = 0; f < 5; f++) {
            for (let k = 0; k < 3; k++) {
                for (let s = 0; s < sides; s++) {
                    recipes[base + k * sides + s] = { k: 3, f, seg: k, side: s, sides };
                }
            }
            recipes[base + 3 * sides] = { k: 4, f };

            const r0 = base;
            const r2 = base + 2 * sides;
            const apex = base + 3 * sides;

            const cap = [];
            for (let s = 0; s < sides; s++) cap.push(r0 + s);
            faces.push(cap);

            for (let k = 0; k < 2; k++) {
                const a = base + k * sides;
                const b = base + (k + 1) * sides;
                for (let s = 0; s < sides; s++) {
                    const s2 = (s + 1) % sides;
                    faces.push([a + s, a + s2, b + s2, b + s]);
                }
            }

            for (let s = 0; s < sides; s++) {
                const s2 = (s + 1) % sides;
                faces.push([r2 + s, r2 + s2, apex]);
            }

            base += fingerN;
        }

        return { density, sides, vertCount, faces, recipes, fingerLm, fingerRad, taper };
    }

    function getTopology(density) {
        let t = meshTopologyCache.get(density);
        if (!t) { t = buildTopology(density); meshTopologyCache.set(density, t); }
        return t;
    }

    const meshRenderers = new Map();

    function getMeshRenderer(density) {
        let r = meshRenderers.get(density);
        if (!r) {
            const topo = getTopology(density);
            const positions = new Float32Array(topo.vertCount * 3);
            const faceZ = new Float32Array(topo.faces.length);
            const faceOrder = new Array(topo.faces.length);
            for (let i = 0; i < topo.faces.length; i++) faceOrder[i] = i;
            r = { topo, positions, faceZ, faceOrder };
            meshRenderers.set(density, r);
        }
        return r;
    }

    let _cmpFaceZ_arr = null;
    function _cmpFaceZ(a, b) { return _cmpFaceZ_arr[b] - _cmpFaceZ_arr[a]; }

    // ============================================================
    //  MESH EVALUATION
    // ============================================================
    function evaluateMesh(topo, pts, positions) {
        const { vertCount, recipes, fingerLm, fingerRad, taper } = topo;

        const p0 = pts[0], p5 = pts[5], p9 = pts[9], p17 = pts[17];

        const e1x = p5.x - p0.x, e1y = p5.y - p0.y, e1z = p5.z - p0.z;
        const e2x = p17.x - p0.x, e2y = p17.y - p0.y, e2z = p17.z - p0.z;
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        let nl = dist3(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;

        const scale = dist3(p9.x - p0.x, p9.y - p0.y, p9.z - p0.z) || 1;
        const thick = scale * 0.17;
        const halfT = thick * 0.5;
        const shrinkK = 0.16;

        const palmLm = [0, 1, 5, 9, 13, 17];
        let ccx = 0, ccy = 0, ccz = 0;
        for (let i = 0; i < 6; i++) {
            const p = pts[palmLm[i]];
            ccx += p.x; ccy += p.y; ccz += p.z;
        }
        ccx /= 6; ccy /= 6; ccz /= 6;

        for (let i = 0; i < vertCount; i++) {
            const r = recipes[i];
            let x, y, z;
            switch (r.k) {
                case 0: { const p = pts[r.lm]; x = p.x; y = p.y; z = p.z; break; }
                case 1: {
                    const p = pts[r.lm];
                    const ax = ccx - p.x, ay = ccy - p.y, az = ccz - p.z;
                    x = p.x + ax * shrinkK + nx * halfT;
                    y = p.y + ay * shrinkK + ny * halfT;
                    z = p.z + az * shrinkK + nz * halfT;
                    break;
                }
                case 2: {
                    const p = pts[r.lm];
                    const ax = ccx - p.x, ay = ccy - p.y, az = ccz - p.z;
                    x = p.x + ax * shrinkK - nx * halfT;
                    y = p.y + ay * shrinkK - ny * halfT;
                    z = p.z + az * shrinkK - nz * halfT;
                    break;
                }
                case 3: {
                    const chain = fingerLm[r.f];
                    const a = pts[chain[r.seg]];
                    const b = pts[chain[r.seg + 1]];
                    let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
                    const dl = dist3(dx, dy, dz) || 1;
                    dx /= dl; dy /= dl; dz /= dl;
                    const dn = nx * dx + ny * dy + nz * dz;
                    let ux = nx - dn * dx, uy = ny - dn * dy, uz = nz - dn * dz;
                    const ul = dist3(ux, uy, uz);
                    if (ul < 1e-5) { ux = 0; uy = 1; uz = 0; }
                    else { ux /= ul; uy /= ul; uz /= ul; }
                    const rx = dy * uz - dz * uy;
                    const ry = dz * ux - dx * uz;
                    const rz = dx * uy - dy * ux;
                    const rad = fingerRad[r.f] * taper[r.seg] * scale;
                    const ang = (r.side / r.sides) * Math.PI * 2;
                    const ca = Math.cos(ang), sa = Math.sin(ang);
                    x = a.x + (rx * ca + ux * sa) * rad;
                    y = a.y + (ry * ca + uy * sa) * rad;
                    z = a.z + (rz * ca + uz * sa) * rad;
                    break;
                }
                default: {
                    const chain = fingerLm[r.f];
                    const b = pts[chain[2]];
                    const t = pts[chain[3]];
                    let dx = t.x - b.x, dy = t.y - b.y, dz = t.z - b.z;
                    const dl = dist3(dx, dy, dz) || 1;
                    dx /= dl; dy /= dl; dz /= dl;
                    const rad = fingerRad[r.f] * scale * 0.95;
                    x = t.x + dx * rad; y = t.y + dy * rad; z = t.z + dz * rad;
                }
            }
            const o = i * 3;
            positions[o] = x;
            positions[o + 1] = y;
            positions[o + 2] = z;
        }
    }

    // ============================================================
    //  HAND SLOTS
    // ============================================================
    let nextSlotId = 1;
    const handSlots = new Map();

    function makeSlot(id, label, now) {
        const slot = {
            id, label, score: 0,
            initialized: false,
            smooth: new Array(21),
            pts: new Array(21),
            filters: new Array(63),
            center: { x: 0, y: 0, z: 0 },
            palmNormal: { x: 0, y: 0, z: 0 },
            along: { x: 0, y: 0, z: 0 },
            across: { x: 0, y: 0, z: 0 },
            scale: 1,
            speed: 0,
            fingerState: [false, false, false, false, false],
            pose: '—',
            prevPose: '—',
            pinchActive: false,
            pinchStrength: 0,
            prevPinchActive: false,

            lastWrist: null,
            lastActive: now,
            active: false,
            lostFrames: 0,

            st: {
                tips: {},
                trail: {},
                pulses: [],
                ripples: [],
                cx: 0, cy: 0,
                px0: 0, py0: 0,
                t: now,
                lastPulse: 0,
                lastParticle: 0,
                pulsePhase: 0,
            },
        };
        for (let j = 0; j < 21; j++) {
            slot.smooth[j] = { x: 0, y: 0, z: 0 };
            slot.pts[j] = { x: 0, y: 0, z: 0 };
        }
        for (let i = 0; i < 63; i++) slot.filters[i] = new OneEuroFilter(1.0, 0.02, D_CUTOFF);
        return slot;
    }

    const _pairs = [];

    function matchDetections(dets) {
        const MAX_DIST2 = 0.05;
        const assigned = new Array(dets.length).fill(null);
        const slotUsed = new Set();

        _pairs.length = 0;
        for (let i = 0; i < dets.length; i++) {
            const w = dets[i].lm[0];
            for (const slot of handSlots.values()) {
                if (slotUsed.has(slot.id)) continue;
                const pw = slot.lastWrist;
                if (!pw) continue;
                if (slot.label !== dets[i].label) continue;
                const dx = w.x - pw.x;
                const dy = w.y - pw.y;
                const dz = (w.z || 0) - (pw.z || 0);
                const d2 = dx * dx + dy * dy + dz * dz * 0.25;
                if (d2 < MAX_DIST2) _pairs.push({ i, slot, d2 });
            }
        }
        _pairs.sort((a, b) => a.d2 - b.d2);
        for (let p = 0; p < _pairs.length; p++) {
            const pair = _pairs[p];
            if (assigned[pair.i] !== null) continue;
            if (slotUsed.has(pair.slot.id)) continue;
            assigned[pair.i] = pair.slot;
            slotUsed.add(pair.slot.id);
        }
        return assigned;
    }

    // ============================================================
    //  GESTURES
    // ============================================================
    function computeFingerState(pts, palmScale) {
        const state = [false, false, false, false, false];

        const tt = pts[4], pmcp = pts[17];
        const dTx = tt.x - pmcp.x, dTy = tt.y - pmcp.y;
        state[0] = Math.sqrt(dTx * dTx + dTy * dTy) > palmScale * 1.05;

        for (let f = 1; f < 5; f++) {
            const ch = FINGER_CHAINS[f];
            const a = pts[ch[0]], b = pts[ch[1]], c = pts[ch[2]], d = pts[ch[3]];
            const v1x = a.x - b.x, v1y = a.y - b.y;
            const v2x = c.x - b.x, v2y = c.y - b.y;
            const v3x = d.x - c.x, v3y = d.y - c.y;
            const l1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
            const l2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
            const l3 = Math.sqrt(v3x * v3x + v3y * v3y) || 1;
            const cos1 = (v1x * v2x + v1y * v2y) / (l1 * l2);
            const cos2 = (v2x * v3x + v2y * v3y) / (l2 * l3);
            state[f] = cos1 < -0.4 && cos2 < -0.4;
        }
        return state;
    }

    function classifyPose(state) {
        const [t, i, m, r, p] = state;
        const count = (t ? 1 : 0) + (i ? 1 : 0) + (m ? 1 : 0) + (r ? 1 : 0) + (p ? 1 : 0);
        if (count === 5) return 'OPEN';
        if (count === 0) return 'FIST';
        if (t && i && !m && !r && !p) return 'GUN';
        if (!t && i && !m && !r && !p) return 'POINT';
        if (!t && i && m && !r && !p) return 'PEACE';
        if (t && !i && !m && !r && !p) return 'THUMB';
        if (!t && i && m && r && !p) return 'THREE';
        if (t && i && m && !r && !p) return 'THREE';
        if (!t && i && m && r && p) return 'FOUR';
        return count + '/5';
    }

    // ============================================================
    //  PARTICLES
    // ============================================================
    function emitParticle(x, y, vx, vy, life, size, hue) {
        if (particles.length >= config.particleCap) particles.shift();
        particles.push({ x, y, vx, vy, life, maxLife: life, size, hue: hue || -1 });
    }

    function emitHeart(x, y) {
        if (particles.length >= config.particleCap) particles.shift();
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 30,
            vy: -40 - Math.random() * 40,
            life: 1.4, maxLife: 1.4,
            size: 6 + Math.random() * 4,
            heart: true, hue: -1,
        });
    }

    function emitConfetti(x, y, count) {
        for (let i = 0; i < count; i++) {
            if (particles.length >= config.particleCap) particles.shift();
            const ang = Math.random() * Math.PI * 2;
            const mag = 80 + Math.random() * 220;
            particles.push({
                x, y,
                vx: Math.cos(ang) * mag,
                vy: Math.sin(ang) * mag - 100,
                life: 1.1 + Math.random() * 0.8,
                maxLife: 1.9,
                size: 2 + Math.random() * 2,
                hue: Math.floor(Math.random() * 360),
            });
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.heart ? -30 : 340) * dt;
            p.vx *= 0.985;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        if (!particles.length) return;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const a = clamp(p.life / p.maxLife, 0, 1);
            if (p.hue >= 0) {
                ctx.fillStyle = `hsla(${p.hue},90%,65%,${a})`;
            } else {
                ctx.fillStyle = rgbaQ(a * 0.9);
            }
            if (p.heart) {
                const s = p.size * (0.4 + a * 0.6);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y + s * 0.3);
                ctx.bezierCurveTo(p.x, p.y - s * 0.4, p.x + s, p.y - s * 0.4, p.x + s, p.y + s * 0.2);
                ctx.bezierCurveTo(p.x + s, p.y + s * 0.9, p.x, p.y + s * 1.1, p.x, p.y + s * 1.4);
                ctx.bezierCurveTo(p.x, p.y + s * 1.1, p.x - s, p.y + s * 0.9, p.x - s, p.y + s * 0.2);
                ctx.bezierCurveTo(p.x - s, p.y - s * 0.4, p.x, p.y - s * 0.4, p.x, p.y + s * 0.3);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function initSnow() {
        ambientParticles.length = 0;
        const n = 60;
        for (let i = 0; i < n; i++) {
            ambientParticles.push({
                x: Math.random() * viewW,
                y: Math.random() * viewH,
                vy: 20 + Math.random() * 40,
                vx: (Math.random() - 0.5) * 15,
                size: 0.8 + Math.random() * 1.6,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    function updateSnow(dt) {
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            p.phase += dt * 1.5;
            p.x += (p.vx + Math.sin(p.phase) * 12) * dt;
            p.y += p.vy * dt;
            if (p.y > viewH + 4) { p.y = -4; p.x = Math.random() * viewW; }
            if (p.x < -4) p.x = viewW + 4;
            if (p.x > viewW + 4) p.x = -4;
        }
    }

    function drawSnow() {
        if (!ambientParticles.length) return;
        ctx.fillStyle = 'rgba(230,235,240,0.55)';
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function emitGlitchBar() {
        glitchBars.push({
            y: Math.random() * viewH,
            h: 4 + Math.random() * 14,
            off: (Math.random() - 0.5) * 30,
            t: performance.now(),
            life: 90 + Math.random() * 120,
        });
        if (glitchBars.length > 18) glitchBars.shift();
    }

    function updateGlitchBars() {
        const now = performance.now();
        for (let i = glitchBars.length - 1; i >= 0; i--) {
            if (now - glitchBars[i].t > glitchBars[i].life) glitchBars.splice(i, 1);
        }
    }

    function drawGlitchBars() {
        if (!glitchBars.length) return;
        for (let i = 0; i < glitchBars.length; i++) {
            const g = glitchBars[i];
            ctx.fillStyle = rgbaQ(0.4);
            ctx.fillRect(g.off, g.y, viewW, g.h);
        }
    }

    // ============================================================
    //  BUILD HAND DATA
    // ============================================================
    function buildHandData(r) {
        const list = r.multiHandLandmarks || [];
        const meta = r.multiHandedness || [];
        const now = performance.now();
        const tSec = now / 1000;
        const predictS = config.prediction * 0.03;

        const minCutoff = minCutoffFromStabilization(config.stabilization);
        const beta = betaFromResponsiveness(config.responsiveness);

        const dets = [];
        for (let i = 0; i < list.length; i++) {
            const lm = list[i];
            const rawLabel = (meta[i] && meta[i].label) || 'Hand';
            const label = rawLabel === 'Left' ? 'Right' : (rawLabel === 'Right' ? 'Left' : 'Hand');
            const score = (meta[i] && meta[i].score) || 0;
            dets.push({ lm, label, score });
        }

        const assigned = matchDetections(dets);

        for (let i = 0; i < dets.length; i++) {
            if (assigned[i]) continue;
            const slot = makeSlot(nextSlotId++, dets[i].label, now);
            handSlots.set(slot.id, slot);
            assigned[i] = slot;
        }

        const out = [];
        const usedSlotIds = new Set();

        for (let i = 0; i < dets.length; i++) {
            const slot = assigned[i];
            const det = dets[i];
            const lm = det.lm;
            usedSlotIds.add(slot.id);

            const filters = slot.filters;
            const smooth = slot.smooth;
            const pts = slot.pts;

            if (!slot.initialized) {
                for (let j = 0; j < 21; j++) {
                    const p = lm[j];
                    const s = smooth[j];
                    s.x = p.x; s.y = p.y; s.z = p.z || 0;
                }
                slot.initialized = true;
            }

            for (let j = 0; j < 21; j++) {
                const p = lm[j];
                const s = smooth[j];
                const fIdx = j * 3;
                const fx = filters[fIdx];
                const fy = filters[fIdx + 1];
                const fz = filters[fIdx + 2];
                fx.setParams(minCutoff, beta, D_CUTOFF);
                fy.setParams(minCutoff, beta, D_CUTOFF);
                fz.setParams(minCutoff, beta, D_CUTOFF);
                s.x = fx.filter(p.x, tSec);
                s.y = fy.filter(p.y, tSec);
                s.z = fz.filter(p.z || 0, tSec);
            }

            const dxLead = predictS;
            for (let j = 0; j < 21; j++) {
                const s = smooth[j];
                const q = pts[j];
                const fIdx = j * 3;
                const vx = filters[fIdx].velocity;
                const vy = filters[fIdx + 1].velocity;
                const vz = filters[fIdx + 2].velocity;
                const sx = s.x + vx * dxLead;
                const sy = s.y + vy * dxLead;
                const sz = s.z + vz * dxLead;
                q.x = projectX(sx);
                q.y = projectY(sy);
                q.z = projectZ(sz);
            }

            const wrist = pts[0];
            const iMCP = pts[5];
            const pMCP = pts[17];
            const mMCP = pts[9];

            const e1x = iMCP.x - wrist.x, e1y = iMCP.y - wrist.y, e1z = iMCP.z - wrist.z;
            const e2x = pMCP.x - wrist.x, e2y = pMCP.y - wrist.y, e2z = pMCP.z - wrist.z;
            let nx = e1y * e2z - e1z * e2y;
            let ny = e1z * e2x - e1x * e2z;
            let nz = e1x * e2y - e1y * e2x;
            const nl = dist3(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            slot.palmNormal.x = nx; slot.palmNormal.y = ny; slot.palmNormal.z = nz;

            let ax = mMCP.x - wrist.x, ay = mMCP.y - wrist.y, az = mMCP.z - wrist.z;
            const al = dist3(ax, ay, az) || 1;
            ax /= al; ay /= al; az /= al;
            slot.along.x = ax; slot.along.y = ay; slot.along.z = az;
            slot.scale = al;

            let cx = ny * az - nz * ay;
            let cy = nz * ax - nx * az;
            let cz = nx * ay - ny * ax;
            const cl = dist3(cx, cy, cz) || 1;
            cx /= cl; cy /= cl; cz /= cl;
            slot.across.x = cx; slot.across.y = cy; slot.across.z = cz;

            let ccx = 0, ccy = 0, ccz = 0;
            const centerIdx = [0, 1, 5, 9, 13, 17];
            for (let k = 0; k < 6; k++) {
                const p = pts[centerIdx[k]];
                ccx += p.x; ccy += p.y; ccz += p.z;
            }
            ccx /= 6; ccy /= 6; ccz /= 6;
            slot.center.x = ccx; slot.center.y = ccy; slot.center.z = ccz;

            const st = slot.st;
            const dt = Math.max(0.001, (now - st.t) / 1000);
            st.t = now;
            const ddx = ccx - st.cx;
            const ddy = ccy - st.cy;
            const instSpeed = Math.sqrt(ddx * ddx + ddy * ddy) / dt;
            slot.speed = slot.speed * 0.7 + instSpeed * 0.3;

            // For fxPredict: previous center before this frame
            st.px0 = st.cx;
            st.py0 = st.cy;
            st.cx = ccx; st.cy = ccy;
            st.pulsePhase += dt;

            if (slot.speed > 900 && (now - st.lastPulse) > 420) {
                st.lastPulse = now;
                st.pulses.push({ x: ccx, y: ccy, t: now });
            }
            let w = 0;
            for (let p = 0; p < st.pulses.length; p++) {
                if (now - st.pulses[p].t < 1100) st.pulses[w++] = st.pulses[p];
            }
            st.pulses.length = w;

            for (let ti = 0; ti < 5; ti++) {
                const tip = FINGERTIPS[ti];
                const p = pts[tip];
                let t = st.tips[tip];
                if (t) {
                    t.vx = (p.x - t.x) / dt;
                    t.vy = (p.y - t.y) / dt;
                    t.x = p.x; t.y = p.y;
                } else {
                    st.tips[tip] = { x: p.x, y: p.y, vx: 0, vy: 0 };
                }
                let tr = st.trail[tip];
                if (!tr) { tr = []; st.trail[tip] = tr; }
                tr.push({ x: p.x, y: p.y, t: now });
                const maxTrail = config.trailLength | 0;
                while (tr.length > maxTrail) tr.shift();
                while (tr.length && now - tr[0].t > 700) tr.shift();
            }

            const fingerState = computeFingerState(pts, slot.scale);
            slot.fingerState = fingerState;
            slot.prevPose = slot.pose;
            slot.pose = classifyPose(fingerState);

            const tt = pts[4], it = pts[8];
            const pdx = tt.x - it.x, pdy = tt.y - it.y;
            const pinchDist = Math.sqrt(pdx * pdx + pdy * pdy);
            const pinchMax = slot.scale * 0.55;
            const pinchStrength = clamp(1 - pinchDist / pinchMax, 0, 1);
            slot.prevPinchActive = slot.pinchActive;
            slot.pinchActive = pinchStrength > 0.65;
            slot.pinchStrength = pinchStrength;

            // Fun triggers
            if (config.fxRipple && slot.prevPinchActive && !slot.pinchActive) {
                st.ripples.push({ x: (tt.x + it.x) * 0.5, y: (tt.y + it.y) * 0.5, t: now });
            }
            if (config.fxHearts && slot.prevPinchActive && !slot.pinchActive) {
                const hx = (tt.x + it.x) * 0.5;
                const hy = (tt.y + it.y) * 0.5;
                for (let k = 0; k < 6; k++) emitHeart(hx + (Math.random() - 0.5) * 20, hy + (Math.random() - 0.5) * 20);
            }
            if (config.fxConfetti && slot.prevPose !== slot.pose && slot.pose !== '—') {
                emitConfetti(ccx, ccy, 14);
            }
            if (config.fxParticles) {
                if ((slot.speed > 400 || pinchStrength > 0.7) && (now - st.lastParticle) > 45) {
                    st.lastParticle = now;
                    for (let ti = 0; ti < 5; ti++) {
                        const tp = st.tips[FINGERTIPS[ti]];
                        if (!tp) continue;
                        const tSpeed = Math.sqrt(tp.vx * tp.vx + tp.vy * tp.vy);
                        if (tSpeed < 120) continue;
                        const ang = Math.random() * Math.PI * 2;
                        const mag = 40 + Math.random() * 90;
                        emitParticle(
                            pts[FINGERTIPS[ti]].x, pts[FINGERTIPS[ti]].y,
                            Math.cos(ang) * mag, Math.sin(ang) * mag - 60,
                            0.55 + Math.random() * 0.55,
                            1.2 + Math.random() * 1.6
                        );
                    }
                }
            }
            if (config.fxGlitch && slot.speed > 700 && Math.random() < 0.35) {
                emitGlitchBar();
            }

            let rw = 0;
            for (let ri = 0; ri < st.ripples.length; ri++) {
                if (now - st.ripples[ri].t < 900) st.ripples[rw++] = st.ripples[ri];
            }
            st.ripples.length = rw;

            slot.label = det.label;
            slot.score = det.score;
            slot.active = true;
            slot.lastActive = now;
            slot.lostFrames = 0;
            slot.lastWrist = { x: lm[0].x, y: lm[0].y, z: lm[0].z || 0 };

            out.push(slot);
        }

        const graceLimit = config.graceFrames | 0;
        for (const slot of [...handSlots.values()]) {
            if (usedSlotIds.has(slot.id)) continue;
            slot.lostFrames++;
            if (slot.lostFrames > graceLimit) handSlots.delete(slot.id);
            else slot.active = false;
        }

        handData = out;

        const n = out.length;
        tHands.textContent = n;
        tHands.classList.toggle('idle', n === 0);

        if (n > 0) {
            tPose.textContent = out[0].pose;
            tPose.classList.remove('idle');
            const sp = Math.round(out[0].speed);
            tSpeed.textContent = String(Math.min(9999, sp));
            tSpeed.classList.remove('idle');
            tSpeedBar.style.width = clamp(out[0].speed / 30, 0, 100) + '%';
        } else {
            tPose.textContent = '—';
            tPose.classList.add('idle');
            tSpeed.textContent = '—';
            tSpeed.classList.add('idle');
            tSpeedBar.style.width = '0%';
        }
    }

    // ============================================================
    //  DRAW — 3D MESH
    // ============================================================
    const LIGHT = { x: -0.42, y: -0.62, z: -0.66 };
    {
        const L = Math.sqrt(LIGHT.x * LIGHT.x + LIGHT.y * LIGHT.y + LIGHT.z * LIGHT.z);
        LIGHT.x /= L; LIGHT.y /= L; LIGHT.z /= L;
    }

    function drawMesh(hand) {
        const density = config.lowPolyDensity;
        const renderer = getMeshRenderer(density);
        const topo = renderer.topo;
        const positions = renderer.positions;
        const faceZ = renderer.faceZ;
        const faceOrder = renderer.faceOrder;
        const faces = topo.faces;

        evaluateMesh(topo, hand.pts, positions);

        const faceCount = faces.length;
        for (let i = 0; i < faceCount; i++) {
            const f = faces[i];
            let z = 0;
            const fn = f.length;
            for (let j = 0; j < fn; j++) z += positions[f[j] * 3 + 2];
            faceZ[i] = z / fn;
        }

        _cmpFaceZ_arr = faceZ;
        faceOrder.sort(_cmpFaceZ);

        const op = config.lowPolyOpacity;
        const edges = config.lowPolyEdges;
        const mode = config.meshStyle;
        const ar = ACCENT_RGB.r, ag = ACCENT_RGB.g, ab = ACCENT_RGB.b;
        const now = performance.now();

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.8;

        const isHolo = mode === 'holo';
        if (isHolo) ctx.globalCompositeOperation = 'lighter';

        for (let oi = 0; oi < faceCount; oi++) {
            const fi = faceOrder[oi];
            const f = faces[fi];

            const i0 = f[0] * 3, i1 = f[1] * 3, i2 = f[2] * 3;
            const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
            const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
            const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
            const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
            const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
            let nX = e1y * e2z - e1z * e2y;
            let nY = e1z * e2x - e1x * e2z;
            let nZ = e1x * e2y - e1y * e2x;
            const nL = dist3(nX, nY, nZ);
            if (nL < 1e-6) { nX = 0; nY = 0; nZ = -1; }
            else {
                nX /= nL; nY /= nL; nZ /= nL;
                if (nZ > 0) { nX = -nX; nY = -nY; nZ = -nZ; }
            }

            const diff = Math.max(0, nX * LIGHT.x + nY * LIGHT.y + nZ * LIGHT.z);
            const absNZ = nZ < 0 ? -nZ : nZ;
            const rimB = 1 - (absNZ > 1 ? 1 : absNZ);
            const rim = rimB * rimB * rimB;
            let sh = 0.16 + diff * 0.80 + rim * 0.30;
            if (sh > 1.15) sh = 1.15;
            const zAvg = (az + bz + cz) / 3;

            ctx.beginPath();
            ctx.moveTo(positions[i0], positions[i0 + 1]);
            for (let j = 1; j < f.length; j++) {
                const idx = f[j] * 3;
                ctx.lineTo(positions[idx], positions[idx + 1]);
            }
            ctx.closePath();

            switch (mode) {
                case 'wire': {
                    ctx.strokeStyle = rgbaQ(op * (0.28 + diff * 0.72));
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    break;
                }
                case 'xray': {
                    const r = (8 + (ar - 8) * sh) | 0;
                    const g = (10 + (ag - 10) * sh) | 0;
                    const b = (14 + (ab - 14) * sh) | 0;
                    ctx.fillStyle = `rgba(${r},${g},${b},${op * 0.28})`;
                    ctx.fill();
                    ctx.strokeStyle = rgbaQ(op * (0.35 + diff * 0.65));
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                    break;
                }
                case 'holo': {
                    const h = 0.35 + diff * 0.9 + rim * 0.5;
                    const r = Math.min(255, (ar * h) | 0);
                    const g = Math.min(255, (ag * h) | 0);
                    const b = Math.min(255, (ab * h) | 0);
                    ctx.fillStyle = `rgba(${r},${g},${b},${op * 0.5})`;
                    ctx.fill();
                    if (edges) {
                        ctx.strokeStyle = rgbaQ(op * (0.55 + diff * 0.45));
                        ctx.lineWidth = 0.9;
                        ctx.stroke();
                    }
                    break;
                }
                case 'chrome': {
                    const shC = 0.06 + Math.pow(diff, 0.65) * 0.95 + rim * 0.4;
                    const r = (4 + (ar - 4) * shC) | 0;
                    const g = (6 + (ag - 6) * shC) | 0;
                    const b = (10 + (ab - 10) * shC) | 0;
                    ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
                    ctx.fill();
                    if (edges) {
                        ctx.strokeStyle = rgbaQ(op * (0.15 + diff * 0.85));
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                    break;
                }
                case 'neon': {
                    ctx.fillStyle = `rgba(3,4,6,${op * 0.55})`;
                    ctx.fill();
                    ctx.strokeStyle = rgbaQ(op * (0.7 + diff * 0.3));
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    break;
                }
                case 'matrix': {
                    const t = clamp((zAvg + 200) / 400, 0, 1);
                    const r = (10 * (1 - t)) | 0;
                    const g = (90 + 160 * (1 - t)) | 0;
                    const b = (30 * (1 - t)) | 0;
                    ctx.fillStyle = `rgba(${r},${g},${b},${op * 0.75})`;
                    ctx.fill();
                    if ((oi + ((now / 100) | 0)) % 7 === 0) {
                        ctx.strokeStyle = `rgba(120,255,140,${op * 0.9})`;
                        ctx.lineWidth = 0.9;
                        ctx.stroke();
                    }
                    break;
                }
                case 'glass': {
                    ctx.fillStyle = rgbaQ(op * 0.14);
                    ctx.fill();
                    ctx.strokeStyle = rgbaQ(op * (0.35 + diff * 0.55));
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                    break;
                }
                case 'thermal': {
                    const t = clamp((zAvg + 220) / 440, 0, 1);
                    const r = (60 + 195 * t) | 0;
                    const g = (60 + 120 * (1 - Math.abs(t - 0.5) * 2)) | 0;
                    const b = (200 * (1 - t) + 40) | 0;
                    ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
                    ctx.fill();
                    if (edges) {
                        ctx.strokeStyle = `rgba(${r},${g},${b},${op * 0.7})`;
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                    break;
                }
                case 'sketch': {
                    ctx.fillStyle = `rgba(220,220,220,${op * 0.12})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(240,240,240,${op * (0.4 + diff * 0.5)})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                    break;
                }
                default: {
                    // slab
                    const r = (8 + (ar - 8) * sh) | 0;
                    const g = (10 + (ag - 10) * sh) | 0;
                    const b = (14 + (ab - 14) * sh) | 0;
                    ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
                    ctx.fill();
                    if (edges) {
                        ctx.strokeStyle = rgbaQ(op * 0.75 * (0.30 + diff * 0.70));
                        ctx.stroke();
                    }
                }
            }
        }

        if (isHolo) ctx.globalCompositeOperation = 'source-over';
    }

    // ============================================================
    //  DRAW — SKELETON
    // ============================================================
    function drawSegmentedBone(p0, p1, width, color) {
        const segs = Math.max(1, Math.round(config.segCount));
        const gap = clamp(config.segGap, 0, 0.85);
        const taper = clamp(config.segTaper, 0, 0.9);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;

        ctx.strokeStyle = color;
        ctx.lineCap = 'butt';
        for (let i = 0; i < segs; i++) {
            const t0 = (i + gap * 0.5) / segs;
            const t1 = (i + 1 - gap * 0.5) / segs;
            const w = width * (1 - taper * (segs > 1 ? i / (segs - 1) : 0));
            ctx.beginPath();
            ctx.moveTo(p0.x + dx * t0, p0.y + dy * t0);
            ctx.lineTo(p0.x + dx * t1, p0.y + dy * t1);
            ctx.lineWidth = Math.max(0.35, w);
            ctx.stroke();
        }
    }

    function drawBoneStyled(p0, p1, width, color, mode) {
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        if (mode === 'dashed') {
            ctx.setLineDash([Math.max(4, width * 4), Math.max(2, width * 2)]);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (mode === 'dotted') {
            ctx.setLineDash([0.1, Math.max(3, width * 3)]);
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1.2, width * 1.3);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (mode === 'neon') {
            ctx.lineCap = 'round';
            ctx.strokeStyle = rgbaQ(0.22);
            ctx.lineWidth = width * 3.2;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        } else if (mode === 'rope') {
            const N = Math.max(6, Math.floor(len / 6));
            const amp = Math.max(1.5, width * 1.4);
            const nx = -dy / len;
            const ny = dx / len;
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(0.8, width * 0.7);
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const t = i / N;
                const px = p0.x + dx * t;
                const py = p0.y + dy * t;
                const off = (i % 2 === 0 ? 1 : -1) * amp;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px + nx * off, py + ny * off);
            }
            ctx.stroke();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }
    }

    function drawJoint(p, r, style) {
        if (style === 'none' || r <= 0) return;
        ctx.lineWidth = 1;
        if (style === 'ring') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = rgbaQ(0.92);
            ctx.stroke();
        } else if (style === 'cross') {
            const s = r * 1.5;
            ctx.strokeStyle = rgbaQ(0.92);
            ctx.beginPath();
            ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y);
            ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s);
            ctx.stroke();
        } else if (style === 'square') {
            const s = r;
            ctx.strokeStyle = rgbaQ(0.92);
            ctx.strokeRect(p.x - s, p.y - s, s * 2, s * 2);
        }
    }

    function drawSkeleton(hand) {
        const pts = hand.pts;
        const bw = config.boneWidth;
        let glow = config.glowOpacity;
        if (config.fxSpeedGlow) {
            glow = Math.min(0.7, glow + clamp(hand.speed / 5000, 0, 0.3));
        }

        const mode = config.skeletonMode;
        const boneMode = config.boneColorMode;

        if (glow > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = glowQ(glow);
            ctx.lineWidth = bw * 4.5;
            ctx.beginPath();
            for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
                const c = HAND_CONNECTIONS[i];
                ctx.moveTo(pts[c[0]].x, pts[c[0]].y);
                ctx.lineTo(pts[c[1]].x, pts[c[1]].y);
            }
            ctx.stroke();
        }

        let zMin = Infinity, zMax = -Infinity;
        if (config.fxZfog) {
            for (let i = 0; i < 21; i++) {
                const z = pts[i].z;
                if (z < zMin) zMin = z;
                if (z > zMax) zMax = z;
            }
            if (zMax - zMin < 1) { zMin = 0; zMax = 1; }
        }

        const segs = Math.round(config.segCount);

        if (segs <= 1 && mode === 'solid' && boneMode === 'accent' && !config.fxZfog) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = rgbaQ(0.94);
            ctx.lineWidth = bw;
            ctx.beginPath();
            for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
                const c = HAND_CONNECTIONS[i];
                ctx.moveTo(pts[c[0]].x, pts[c[0]].y);
                ctx.lineTo(pts[c[1]].x, pts[c[1]].y);
            }
            ctx.stroke();
        } else {
            ctx.lineJoin = 'round';
            for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
                const c = HAND_CONNECTIONS[i];
                let color = colorForBone(i, pts);
                if (config.fxZfog) {
                    const zMid = (pts[c[0]].z + pts[c[1]].z) * 0.5;
                    const t = clamp((zMid - zMin) / (zMax - zMin), 0, 1);
                    const alpha = 0.25 + (1 - t) * 0.75;
                    color = rgbaQ(0.94 * alpha);
                }
                if (segs <= 1) drawBoneStyled(pts[c[0]], pts[c[1]], bw, color, mode);
                else drawSegmentedBone(pts[c[0]], pts[c[1]], bw, color);
            }
        }

        const jr = config.jointRadius;
        const style = config.jointStyle;

        if (style === 'dot') {
            ctx.beginPath();
            for (let i = 0; i < 21; i++) {
                const r = IS_TIP[i] ? jr + 1.2 : jr;
                if (r <= 0) continue;
                const p = pts[i];
                ctx.moveTo(p.x + r, p.y);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            }
            ctx.fillStyle = rgbaQ(0.96);
            ctx.fill();
        } else if (style !== 'none') {
            for (let i = 0; i < 21; i++) {
                drawJoint(pts[i], IS_TIP[i] ? jr + 1.2 : jr, style);
            }
        }

        ctx.strokeStyle = rgbaQ(0.85);
        ctx.lineWidth = 1;
        const wp = pts[0];
        ctx.beginPath();
        ctx.moveTo(wp.x - 6, wp.y - 3); ctx.lineTo(wp.x - 3, wp.y - 6);
        ctx.moveTo(wp.x + 6, wp.y - 3); ctx.lineTo(wp.x + 3, wp.y - 6);
        ctx.moveTo(wp.x - 6, wp.y + 3); ctx.lineTo(wp.x - 3, wp.y + 6);
        ctx.moveTo(wp.x + 6, wp.y + 3); ctx.lineTo(wp.x + 3, wp.y + 6);
        ctx.stroke();
    }

    // ============================================================
    //  DRAW — TACTICAL FX
    // ============================================================
    function fxArrowInto(x0, y0, x1, y1, h) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        const a = Math.atan2(y1 - y0, x1 - x0);
        const ca = Math.cos(a), sa = Math.sin(a);
        const c1 = Math.cos(0.4), s1 = Math.sin(0.4);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - (ca * c1 + sa * s1) * h, y1 - (sa * c1 - ca * s1) * h);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - (ca * c1 - sa * s1) * h, y1 - (sa * c1 + ca * s1) * h);
    }

    function drawFX(hand) {
        const pts = hand.pts;
        const st = hand.st;
        const now = performance.now();

        if (config.fxAura) {
            const c = hand.center;
            const pulse = 1 + Math.sin(now / 420) * 0.08;
            const r = Math.max(24, hand.scale * 1.1) * pulse;
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
            grad.addColorStop(0, rgbaQ(0.20));
            grad.addColorStop(0.55, rgbaQ(0.07));
            grad.addColorStop(1, rgbaQ(0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (config.fxRings) {
            const base = Math.max(24, hand.scale * 0.45);
            const cX = hand.center.x, cY = hand.center.y;

            ctx.setLineDash([4, 6]);
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(cX, cY, base * (1 + i * 0.55), 0, Math.PI * 2);
                ctx.strokeStyle = rgbaQ(0.14 - i * 0.03);
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.setLineDash([]);

            const a = (now / 1000) * 1.6;
            ctx.beginPath();
            ctx.moveTo(cX, cY);
            ctx.lineTo(cX + Math.cos(a) * base * 2.1, cY + Math.sin(a) * base * 2.1);
            ctx.strokeStyle = rgbaQ(0.35);
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            for (let i = 0; i < st.pulses.length; i++) {
                const pl = st.pulses[i];
                const age = (now - pl.t) / 1100;
                const r = base * 0.4 + age * base * 2.4;
                ctx.moveTo(pl.x + r, pl.y);
                ctx.arc(pl.x, pl.y, r, 0, Math.PI * 2);
            }
            ctx.strokeStyle = rgbaQ(0.4);
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }

        if (config.fxPulse) {
            const w = pts[0];
            const phase = (st.pulsePhase % 1.2) / 1.2;
            for (let k = 0; k < 3; k++) {
                const t = (phase + k / 3) % 1;
                const r = 6 + t * hand.scale * 1.3;
                const a = (1 - t) * 0.5;
                ctx.beginPath();
                ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = rgbaQ(a);
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
        }

        if (config.fxBounds) {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            for (let i = 0; i < 21; i++) {
                const p = pts[i];
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
                if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
            }
            const pad = 12;
            minX -= pad; maxX += pad; minY -= pad; maxY += pad;
            const dz = clamp((maxZ - minZ) * 0.14, 0, 26);

            ctx.strokeStyle = rgbaQ(0.28);
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.strokeRect(minX - dz, minY - dz, maxX - minX, maxY - minY);
            ctx.setLineDash([]);

            ctx.strokeStyle = rgbaQ(0.6);
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            ctx.strokeStyle = rgbaQ(0.22);
            ctx.beginPath();
            const csx = [minX, maxX, maxX, minX];
            const csy = [minY, minY, maxY, maxY];
            for (let i = 0; i < 4; i++) {
                ctx.moveTo(csx[i], csy[i]);
                ctx.lineTo(csx[i] - dz, csy[i] - dz);
            }
            ctx.stroke();

            ctx.strokeStyle = rgbaQ(0.95);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            const corners = [[minX, minY], [maxX, maxY]];
            for (let ci = 0; ci < 2; ci++) {
                const cx0 = corners[ci][0], cy0 = corners[ci][1];
                const r = 8, L = 4;
                for (let sx = -1; sx <= 1; sx += 2) {
                    for (let sy = -1; sy <= 1; sy += 2) {
                        ctx.moveTo(cx0 + sx * r - sx * L, cy0 + sy * r);
                        ctx.lineTo(cx0 + sx * r, cy0 + sy * r);
                        ctx.lineTo(cx0 + sx * r, cy0 + sy * r - sy * L);
                    }
                }
            }
            ctx.stroke();

            ctx.font = FONT_MONO_9;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = rgbaQ(0.8);
            ctx.fillText(
                `${(maxX - minX).toFixed(0)}×${(maxY - minY).toFixed(0)}·D${(maxZ - minZ).toFixed(0)}`,
                minX, minY - 5
            );
        }

        if (config.fxAxis) {
            const c = hand.center;
            const L = Math.max(30, hand.scale * 0.85);
            const pn = hand.palmNormal, al = hand.along, ac = hand.across;

            ctx.strokeStyle = rgbaQ(0.6);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            fxArrowInto(c.x, c.y, c.x + al.x * L, c.y + al.y * L, 4.8);
            fxArrowInto(c.x, c.y, c.x + ac.x * L, c.y + ac.y * L, 4.8);
            ctx.stroke();

            ctx.strokeStyle = rgbaQ(0.95);
            ctx.beginPath();
            fxArrowInto(c.x, c.y, c.x + pn.x * L, c.y + pn.y * L, 4.8);
            ctx.stroke();

            ctx.font = FONT_MONO_9;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = rgbaQ(0.95);
            ctx.fillText('N', c.x + pn.x * (L + 9), c.y + pn.y * (L + 9));
            ctx.fillStyle = rgbaQ(0.6);
            ctx.fillText('Y', c.x + al.x * (L + 9), c.y + al.y * (L + 9));
            ctx.fillText('X', c.x + ac.x * (L + 9), c.y + ac.y * (L + 9));

            ctx.beginPath();
            ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = rgbaQ(0.9);
            ctx.fill();
        }

        if (config.fxAngles) {
            ctx.font = FONT_MONO_9;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = rgbaQ(0.55);
            ctx.lineWidth = 1;
            ctx.fillStyle = rgbaQ(0.9);

            for (let fi = 0; fi < 5; fi++) {
                const ch = FINGER_CHAINS[fi];
                const a = pts[ch[0]], b = pts[ch[1]], cc = pts[ch[2]];
                const v1x = a.x - b.x, v1y = a.y - b.y;
                const v2x = cc.x - b.x, v2y = cc.y - b.y;
                const l1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
                const l2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
                let cosA = (v1x * v2x + v1y * v2y) / (l1 * l2);
                if (cosA > 1) cosA = 1; else if (cosA < -1) cosA = -1;
                const deg = Math.acos(cosA) * 180 / Math.PI;

                const a1 = Math.atan2(v1y, v1x);
                const a2 = Math.atan2(v2y, v2x);
                let d = a2 - a1;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;

                const r = Math.max(12, Math.min(20, hand.scale * 0.16));
                ctx.beginPath();
                ctx.arc(b.x, b.y, r, a1, a1 + d, d < 0);
                ctx.stroke();

                const mid = a1 + d / 2;
                ctx.fillText(`${deg.toFixed(0)}°`, b.x + Math.cos(mid) * (r + 12), b.y + Math.sin(mid) * (r + 12));
            }
        }

        if (config.fxVector) {
            ctx.strokeStyle = rgbaQ(0.75);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const tip = FINGERTIPS[i];
                const t = st.tips[tip];
                if (!t) continue;
                const sp = Math.sqrt(t.vx * t.vx + t.vy * t.vy);
                if (sp < 60) continue;
                const len = Math.min(95, sp * 0.11);
                const ux = t.vx / sp, uy = t.vy / sp;
                const p = pts[tip];
                fxArrowInto(p.x, p.y, p.x + ux * len, p.y + uy * len, 4.8);
            }
            ctx.stroke();
        }

        if (config.fxTrail) {
            for (let ti = 0; ti < 5; ti++) {
                const tr = st.trail[FINGERTIPS[ti]];
                if (!tr || tr.length < 2) continue;
                for (let i = 1; i < tr.length; i++) {
                    const t0 = tr[i - 1], t1 = tr[i];
                    const age = (now - t1.t) / 700;
                    const a = (1 - age) * 0.55;
                    if (a <= 0.01) continue;
                    ctx.beginPath();
                    ctx.moveTo(t0.x, t0.y);
                    ctx.lineTo(t1.x, t1.y);
                    ctx.strokeStyle = rgbaQ(a);
                    ctx.lineWidth = 1.4 * (1 - age) + 0.4;
                    ctx.stroke();
                }
            }
        }

        if (config.fxComet) {
            ctx.lineCap = 'round';
            for (let ti = 0; ti < 5; ti++) {
                const tr = st.trail[FINGERTIPS[ti]];
                if (!tr || tr.length < 2) continue;
                for (let i = 1; i < tr.length; i++) {
                    const t0 = tr[i - 1], t1 = tr[i];
                    const age = (now - t1.t) / 700;
                    if (age >= 1) continue;
                    const a = (1 - age) * 0.85;
                    const w = 4.5 * (1 - age) + 0.5;
                    ctx.beginPath();
                    ctx.moveTo(t0.x, t0.y);
                    ctx.lineTo(t1.x, t1.y);
                    ctx.strokeStyle = glowQ(a);
                    ctx.lineWidth = w;
                    ctx.stroke();
                }
                const tip = pts[FINGERTIPS[ti]];
                ctx.fillStyle = glowQ(1);
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (config.fxSparkle) {
            for (let i = 0; i < 5; i++) {
                const p = pts[FINGERTIPS[i]];
                const phase = (now * 0.003 + i * 1.3) % 1;
                const r = 3 + Math.sin(phase * Math.PI) * 7;
                const a = Math.sin(phase * Math.PI) * 0.9;
                ctx.strokeStyle = rgbaQ(a);
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y);
                ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r);
                ctx.moveTo(p.x - r * 0.6, p.y - r * 0.6); ctx.lineTo(p.x + r * 0.6, p.y + r * 0.6);
                ctx.moveTo(p.x - r * 0.6, p.y + r * 0.6); ctx.lineTo(p.x + r * 0.6, p.y - r * 0.6);
                ctx.stroke();
            }
        }

        if (config.fxConstellation) {
            const maxD = hand.scale * 1.3;
            ctx.strokeStyle = rgbaQ(0.4);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                for (let j = i + 1; j < 5; j++) {
                    const a = pts[FINGERTIPS[i]], b = pts[FINGERTIPS[j]];
                    const ddx = a.x - b.x, ddy = a.y - b.y;
                    const d = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (d < maxD) {
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                    }
                }
            }
            ctx.stroke();
            ctx.fillStyle = rgbaQ(0.95);
            for (let i = 0; i < 5; i++) {
                const p = pts[FINGERTIPS[i]];
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (config.fxReticle) {
            const rBase = Math.max(9, hand.scale * 0.11);
            const L = rBase * 0.5;

            ctx.strokeStyle = rgbaQ(0.85);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const p = pts[FINGERTIPS[i]];
                for (let sx = -1; sx <= 1; sx += 2) {
                    for (let sy = -1; sy <= 1; sy += 2) {
                        ctx.moveTo(p.x + sx * rBase - sx * L, p.y + sy * rBase);
                        ctx.lineTo(p.x + sx * rBase, p.y + sy * rBase);
                        ctx.lineTo(p.x + sx * rBase, p.y + sy * rBase - sy * L);
                    }
                }
            }
            ctx.stroke();

            ctx.strokeStyle = rgbaQ(0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const p = pts[FINGERTIPS[i]];
                ctx.moveTo(p.x - rBase * 0.35, p.y);
                ctx.lineTo(p.x + rBase * 0.35, p.y);
                ctx.moveTo(p.x, p.y - rBase * 0.35);
                ctx.lineTo(p.x, p.y + rBase * 0.35);
            }
            ctx.stroke();
        }

        if (config.fxLabels) {
            ctx.font = FONT_MONO_8;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = rgbaQ(0.85);
            const names = ['T', 'I', 'M', 'R', 'P'];
            for (let i = 0; i < 5; i++) {
                const p = pts[FINGERTIPS[i]];
                ctx.fillText(names[i], p.x, p.y - 12);
            }
        }

        if (config.fxGrid) {
            // Palm lattice: interpolate two orthogonal families across the palm quad.
            const w = pts[0];   // wrist
            const iM = pts[5];   // index MCP
            const mM = pts[9];   // middle MCP
            const pM = pts[17];  // pinky MCP
            ctx.strokeStyle = rgbaQ(0.35);
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            const rows = 4, cols = 4;
            for (let i = 1; i < cols; i++) {
                const t = i / cols;
                const ax = iM.x + (pM.x - iM.x) * t;
                const ay = iM.y + (pM.y - iM.y) * t;
                const bx = w.x + (mM.x - w.x) * t;
                const by = w.y + (mM.y - w.y) * t;
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
            }
            for (let i = 1; i < rows; i++) {
                const t = i / rows;
                const ax = w.x + (mM.x - w.x) * t;
                const ay = w.y + (mM.y - w.y) * t;
                const bx = iM.x + (pM.x - iM.x) * t;
                const by = iM.y + (pM.y - iM.y) * t;
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
            }
            ctx.stroke();
        }

        if (config.fxScan) {
            let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
            for (let i = 0; i < 21; i++) {
                const p = pts[i];
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
            }
            const span = Math.max(1, maxY - minY);
            const phase = ((now / 1800) % 1);
            const y = minY + phase * span;

            const grad = ctx.createLinearGradient(minX, y, maxX, y);
            grad.addColorStop(0, rgbaQ(0));
            grad.addColorStop(0.5, rgbaQ(0.7));
            grad.addColorStop(1, rgbaQ(0));

            ctx.beginPath();
            ctx.moveTo(minX - 20, y);
            ctx.lineTo(maxX + 20, y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        if (config.fxPredict) {
            const c = hand.center;
            const leadX = st.cx + (st.cx - st.px0);
            const leadY = st.cy + (st.cy - st.py0);

            ctx.strokeStyle = rgbaQ(0.55);
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(leadX, leadY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(leadX, leadY, 4, 0, Math.PI * 2);
            ctx.strokeStyle = rgbaQ(0.7);
            ctx.stroke();
        }

        if (config.fxPinch) {
            const tt = pts[4], it = pts[8];
            const strength = hand.pinchStrength;
            if (strength > 0.15) {
                ctx.strokeStyle = rgbaQ(0.3 + strength * 0.65);
                ctx.lineWidth = 1 + strength * 1.8;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(tt.x, tt.y);
                ctx.lineTo(it.x, it.y);
                ctx.stroke();
                ctx.setLineDash([]);

                const mx = (tt.x + it.x) * 0.5;
                const my = (tt.y + it.y) * 0.5;
                const r = 4 + strength * 6;
                ctx.beginPath();
                ctx.arc(mx, my, r, 0, Math.PI * 2);
                ctx.strokeStyle = rgbaQ(0.5 + strength * 0.5);
                ctx.lineWidth = 1.3;
                ctx.stroke();

                if (hand.pinchActive) {
                    ctx.beginPath();
                    ctx.arc(mx, my, 1.6, 0, Math.PI * 2);
                    ctx.fillStyle = rgbaQ(0.95);
                    ctx.fill();
                }
            }
        }

        if (config.fxRipple && st.ripples.length) {
            for (let i = 0; i < st.ripples.length; i++) {
                const rp = st.ripples[i];
                const age = (now - rp.t) / 900;
                const r = 4 + age * 60;
                const a = (1 - age) * 0.7;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = rgbaQ(a);
                ctx.lineWidth = 1.6 * (1 - age) + 0.4;
                ctx.stroke();
            }
        }

        if (config.fxPoint) {
            const tip = pts[8];
            const pip = pts[6];
            let dx = tip.x - pip.x, dy = tip.y - pip.y;
            const dl = Math.sqrt(dx * dx + dy * dy) || 1;
            dx /= dl; dy /= dl;
            const len = 180;
            const ex = tip.x + dx * len;
            const ey = tip.y + dy * len;

            ctx.strokeStyle = rgbaQ(0.6);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            fxArrowInto(tip.x, tip.y, ex, ey, 8);
            ctx.stroke();

            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = rgbaQ(0.25);
            ctx.beginPath();
            ctx.moveTo(tip.x + dx * 20, tip.y + dy * 20);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = rgbaQ(0.9);
            ctx.fill();
        }

        if (config.fxPose) {
            const wp = pts[0];
            const bx = wp.x - 110;
            const by = wp.y + 26;
            const bw = 84;
            const bh = 66;

            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = rgbaQ(0.55);
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);

            ctx.font = FONT_MONO_9;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = rgbaQ(0.5);
            ctx.fillText('POSE', bx + 7, by + 6);
            ctx.fillStyle = rgbaQ(0.95);
            ctx.font = FONT_MONO_11B;
            ctx.fillText(hand.pose, bx + 7, by + 18);

            const fNames = ['T', 'I', 'M', 'R', 'P'];
            ctx.font = FONT_MONO_8;
            for (let i = 0; i < 5; i++) {
                const fx = bx + 7 + i * 14;
                const fy = by + 44;
                const extended = hand.fingerState[i];
                const fh = extended ? 12 : 4;
                ctx.fillStyle = extended ? rgbaQ(0.95) : rgbaQ(0.2);
                ctx.fillRect(fx, fy + (12 - fh), 8, fh);
                ctx.fillStyle = rgbaQ(0.55);
                ctx.fillText(fNames[i], fx + 1, fy + 14);
            }
        }

        if (config.fxTag) {
            const wp = pts[0];
            const bx = wp.x + 26;
            const by = wp.y + 26;

            ctx.font = FONT_MONO_9;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const l0 = `${hand.label === 'Left' ? 'L' : hand.label === 'Right' ? 'R' : '?'}-${String(Math.round(hand.scale)).padStart(3, '0')}`;
            const l1 = `TRK ${(hand.score * 100).toFixed(0)}%`;
            const l2 = `SPD ${Math.min(9999, Math.round(hand.speed)).toString().padStart(4, '0')}`;
            const wMax = Math.max(ctx.measureText(l0).width, ctx.measureText(l1).width, ctx.measureText(l2).width);
            const bw = wMax + 14;
            const bh = 44;

            ctx.strokeStyle = rgbaQ(0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wp.x, wp.y);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx, by + bh * 0.5);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = rgbaQ(0.55);
            ctx.strokeRect(bx, by, bw, bh);

            ctx.fillStyle = rgbaQ(0.92);
            ctx.fillText(l0, bx + 7, by + 5);
            ctx.fillText(l1, bx + 7, by + 17);
            ctx.fillText(l2, bx + 7, by + 29);
        }
    }

    // ============================================================
    //  RAINBOW ACCENT
    // ============================================================
    let rainbowHue = 0;
    function updateRainbow(dt) {
        rainbowHue = (rainbowHue + dt * 60) % 360;
        const h = rainbowHue / 60;
        const c = 1, x = c * (1 - Math.abs(h % 2 - 1));
        let r, g, b;
        if (h < 1) { r = c; g = x; b = 0; }
        else if (h < 2) { r = x; g = c; b = 0; }
        else if (h < 3) { r = 0; g = c; b = x; }
        else if (h < 4) { r = 0; g = x; b = c; }
        else if (h < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        const nr = (r * 255) | 0, ng = (g * 255) | 0, nb = (b * 255) | 0;
        if (nr !== ACCENT_RGB.r || ng !== ACCENT_RGB.g || nb !== ACCENT_RGB.b) {
            ACCENT_RGB.r = nr; ACCENT_RGB.g = ng; ACCENT_RGB.b = nb;
            RGBA_LUT.fill(undefined);
        }
    }

    // ============================================================
    //  GESTURE SHORTCUTS
    // ============================================================
    const shortcutState = { pose: '', since: 0, fired: '' };

    function checkGestureShortcuts() {
        if (!config.gestureShortcuts || !handData.length) {
            shortcutState.pose = '';
            shortcutState.fired = '';
            return;
        }
        const pose = handData[0].pose;
        const now = performance.now();
        if (pose !== shortcutState.pose) {
            shortcutState.pose = pose;
            shortcutState.since = now;
            shortcutState.fired = '';
            return;
        }
        if (shortcutState.fired === pose) return;
        if (now - shortcutState.since < 700) return;

        if (pose === 'OPEN') {
            shortcutState.fired = pose;
            if (!active) { activate(); showToast('ACTIVATE'); }
        } else if (pose === 'FIST') {
            shortcutState.fired = pose;
            if (active) { deactivate(); showToast('STANDBY'); }
        } else if (pose === 'PEACE') {
            shortcutState.fired = pose;
            if (!settingsPanel.classList.contains('open')) { openPanel(); showToast('SETTINGS'); }
        }
    }

    // ============================================================
    //  RENDER LOOP
    // ============================================================
    let lastRenderTime = 0;

    function render() {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastRenderTime) / 1000) || 0.016;
        lastRenderTime = now;

        if (config.fxRainbow) updateRainbow(dt);

        if (!cover.valid) updateCover();

        ctx.clearRect(0, 0, viewW, viewH);
        if (!active) {
            // Draw ambient overlays when idle so the app doesn't feel dead
            if (config.fxSnow) { updateSnow(dt); drawSnow(); }
            return;
        }

        updateParticles(dt);
        if (config.fxSnow) updateSnow(dt);
        updateGlitchBars();

        if (config.gestureShortcuts) checkGestureShortcuts();

        // Screen shake via CSS transform on canvas
        if (config.fxShake && handData.length) {
            let maxSpeed = 0;
            for (let i = 0; i < handData.length; i++) {
                if (handData[i].speed > maxSpeed) maxSpeed = handData[i].speed;
            }
            if (maxSpeed > 500) {
                const amt = Math.min(6, (maxSpeed - 500) / 300);
                const sx = (Math.random() - 0.5) * amt;
                const sy = (Math.random() - 0.5) * amt;
                canvas.style.transform = `translate(${sx}px, ${sy}px)`;
            } else if (canvas.style.transform) {
                canvas.style.transform = '';
            }
        } else if (canvas.style.transform) {
            canvas.style.transform = '';
        }

        const showLP = config.showLowPoly;
        const showSk = config.showHand;

        for (let i = 0; i < handData.length; i++) {
            const hand = handData[i];
            if (showLP) drawMesh(hand);
            if (showSk) drawSkeleton(hand);
            drawFX(hand);
        }

        if (config.fxParticles) drawParticles();
        if (config.fxSnow) drawSnow();
        if (config.fxGlitch && glitchBars.length) drawGlitchBars();
    }

    function renderLoop() {
        render();
        rafRender = requestAnimationFrame(renderLoop);
    }

    // ============================================================
    //  MEDIAPIPE HANDS (lazy)
    // ============================================================
    function ensureHands() {
        if (hands) return hands;
        if (typeof Hands === 'undefined') return null;
        hands = new Hands({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
        });
        hands.onResults(onHandsResults);
        return hands;
    }

    function onHandsResults(r) {
        if (config.enableHands) {
            buildHandData(r);
        } else {
            handData = [];
            handSlots.clear();
            tHands.textContent = '0';
            tHands.classList.add('idle');
            tPose.textContent = '—';
            tPose.classList.add('idle');
            tSpeed.textContent = '—';
            tSpeed.classList.add('idle');
            tSpeedBar.style.width = '0%';
        }
    }

    function applyHandsOptions() {
        const h = ensureHands();
        if (!h) return;
        h.setOptions({
            maxNumHands: config.maxHands,
            modelComplexity: config.modelComplexity,
            minDetectionConfidence: config.minDetection,
            minTrackingConfidence: config.minTracking,
            selfieMode: false,
        });
    }

    // ============================================================
    //  CAMERA
    // ============================================================
    async function startCamera() {
        const [wStr, hStr] = config.resolution.split('x');
        const constraints = {
            video: {
                facingMode: config.facingMode,
                width: { ideal: parseInt(wStr, 10) },
                height: { ideal: parseInt(hStr, 10) },
            },
            audio: false,
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = mediaStream;
        await video.play();
        setTimeout(updateCover, 60);
    }

    function stopCamera() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        video.srcObject = null;
    }

    async function restartCamera() {
        if (!active) return;
        try {
            stopCamera();
            await startCamera();
        } catch (e) { console.warn('camera restart failed', e); }
    }

    // ============================================================
    //  INFERENCE LOOP
    // ============================================================
    let sendErrorLogged = false;

    async function frameLoop() {
        if (!active) return;
        rafInfer = requestAnimationFrame(frameLoop);
        if (inferenceInFlight) return;

        const now = performance.now();
        const minInterval = 1000 / config.fpsCap;
        const dt = now - inferLast;
        if (dt < minInterval) return;
        inferLast = now;

        const fps = 1000 / Math.max(1, dt);
        fpsSmooth = fpsSmooth ? fpsSmooth * 0.9 + fps * 0.1 : fps;
        if (config.showFps) {
            tFps.textContent = String(Math.min(999, Math.round(fpsSmooth)));
            tFps.classList.remove('idle');
        } else if (tFps.textContent !== '—') {
            tFps.textContent = '—';
            tFps.classList.add('idle');
        }

        if (video.readyState < 2 || video.videoWidth === 0) return;
        if (!config.enableHands) return;

        const h = ensureHands();
        if (!h) return;

        inferenceInFlight = true;
        try {
            await h.send({ image: video });
            sendErrorLogged = false;
        } catch (e) {
            if (!sendErrorLogged) {
                console.warn('[SENTINEL] hands.send error', e);
                sendErrorLogged = true;
            }
        }
        inferenceInFlight = false;
    }

    // ============================================================
    //  ACTIVATION
    // ============================================================
    async function activate() {
        if (active) return;

        // Try to bring the tracking library up before we ask for the camera
        if (!ensureHands()) {
            activateBtn.disabled = false;
            activateBtn.textContent = 'ACTIVATE';
            bootEl.classList.remove('hidden');
            bootEl.classList.add('error');
            bootMsg.textContent = 'TRACKING LIBRARY UNAVAILABLE';
            return;
        }

        applyHandsOptions();

        activateBtn.disabled = true;
        activateBtn.textContent = 'STARTING';

        try {
            await startCamera();
        } catch (e) {
            console.error(e);
            let msg = 'CAMERA ACCESS DENIED';
            if (e && e.name === 'NotAllowedError') msg = 'PERMISSION DENIED';
            else if (e && e.name === 'NotFoundError') msg = 'NO CAMERA FOUND';
            else if (e && e.name === 'NotReadableError') msg = 'CAMERA BUSY';

            activateBtn.disabled = false;
            activateBtn.textContent = 'ACTIVATE';
            bootEl.classList.remove('hidden');
            bootEl.classList.add('error');
            bootMsg.textContent = msg;
            return;
        }

        active = true;
        activateBtn.disabled = false;
        activateBtn.textContent = 'ACTIVE';
        activateBtn.classList.add('on');

        bootEl.classList.add('hidden');
        bootEl.classList.remove('error');

        inferLast = performance.now();
        frameLoop();
    }

    function deactivate() {
        if (!active) return;
        active = false;

        if (rafInfer) { cancelAnimationFrame(rafInfer); rafInfer = null; }

        stopCamera();
        handSlots.clear();
        handData = [];
        inferenceInFlight = false;
        particles.length = 0;
        glitchBars.length = 0;
        canvas.style.transform = '';

        activateBtn.textContent = 'ACTIVATE';
        activateBtn.classList.remove('on');

        tHands.textContent = '0';
        tPose.textContent = '—';
        tSpeed.textContent = '—';
        tHands.classList.add('idle');
        tPose.classList.add('idle');
        tSpeed.classList.add('idle');
        tSpeedBar.style.width = '0%';
        tFps.textContent = '—';
        tFps.classList.add('idle');

        ctx.clearRect(0, 0, viewW, viewH);
    }

    activateBtn.addEventListener('click', () => {
        if (active) deactivate(); else activate();
    });

    // ============================================================
    //  PANEL
    // ============================================================
    function openPanel() {
        settingsPanel.classList.add('open');
        settingsPanel.setAttribute('aria-hidden', 'false');
        panelOverlay.classList.add('show');
    }
    function closePanel() {
        settingsPanel.classList.remove('open');
        settingsPanel.setAttribute('aria-hidden', 'true');
        panelOverlay.classList.remove('show');
    }
    settingsToggle.addEventListener('click', openPanel);
    settingsClose.addEventListener('click', closePanel);
    panelOverlay.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        const k = e.key.toLowerCase();
        if (k === 's') {
            if (settingsPanel.classList.contains('open')) closePanel();
            else openPanel();
        } else if (e.key === 'Escape') {
            closePanel();
        } else if (k === 'a') {
            if (active) deactivate(); else activate();
        } else if (k === 'h') {
            hudEl.classList.toggle('hidden');
        } else if (k === 'f') {
            toggleFullscreen();
        } else if (k === 'p') {
            saveFrame();
        }
    });

    document.querySelectorAll('.section-head').forEach(h => {
        h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
    });

    // ============================================================
    //  UI WIRING
    // ============================================================
    const FMT = {
        minDetection: v => v.toFixed(2),
        minTracking: v => v.toFixed(2),
        stabilization: v => v.toFixed(2),
        responsiveness: v => v.toFixed(2),
        prediction: v => v.toFixed(1),
        glowOpacity: v => v.toFixed(2),
        lowPolyOpacity: v => v.toFixed(2),
        depthScale: v => v.toFixed(2),
        segGap: v => v.toFixed(2),
        segTaper: v => v.toFixed(2),
        boneWidth: v => v.toFixed(1),
        jointRadius: v => v.toFixed(1),
        videoBrightness: v => v.toFixed(2),
        videoContrast: v => v.toFixed(2),
        videoSaturate: v => v.toFixed(2),
        segCount: v => String(v | 0),
        graceFrames: v => String(v | 0),
        fpsCap: v => String(v | 0),
        maxHands: v => String(v | 0),
        modelComplexity: v => String(v | 0),
        lowPolyDensity: v => String(v | 0),
        trailLength: v => String(v | 0),
        particleCap: v => String(v | 0),
    };

    const labelEls = {};
    function cacheLabelEls() {
        document.querySelectorAll('[data-value]').forEach(el => {
            labelEls[el.dataset.value] = el;
        });
    }

    function syncSliderLabel(key, val) {
        const el = labelEls[key];
        if (!el) return;
        const f = FMT[key];
        el.textContent = f ? f(parseFloat(val)) : String(val);
    }

    function updateSliderFill(input) {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const val = parseFloat(input.value);
        const pct = ((val - min) / (max - min)) * 100;
        input.style.setProperty('--fill', pct.toFixed(2) + '%');
    }

    function updateSliderFillAll() {
        document.querySelectorAll('input[type="range"][data-key]').forEach(updateSliderFill);
    }

    function wireInputs() {
        document.querySelectorAll('input[type="range"][data-key]').forEach(input => {
            const key = input.dataset.key;
            input.value = config[key];
            syncSliderLabel(key, input.value);
            updateSliderFill(input);
            input.addEventListener('input', () => {
                const val = parseFloat(input.value);
                config[key] = val;
                syncSliderLabel(key, val);
                updateSliderFill(input);
                onConfigChange(key, val);
            });
        });

        document.querySelectorAll('.toggle[data-key]').forEach(t => {
            const key = t.dataset.key;
            t.classList.toggle('on', !!config[key]);
            t.addEventListener('click', (e) => {
                e.preventDefault();
                config[key] = !config[key];
                t.classList.toggle('on', config[key]);
                onConfigChange(key, config[key]);
            });
        });

        document.querySelectorAll('select[data-key]').forEach(s => {
            const key = s.dataset.key;
            s.value = config[key];
            s.addEventListener('change', () => {
                config[key] = s.value;
                onConfigChange(key, s.value);
            });
        });

        document.querySelectorAll('.color-swatch').forEach(sw => {
            const hex = sw.dataset.accent;
            sw.classList.toggle('active', hex === config.accent);
            sw.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
                sw.classList.add('active');
                config.accent = hex;
                const nameMap = {
                    '#ffffff': 'WHITE', '#00e0b8': 'TEAL', '#5fc9ff': 'BLUE',
                    '#ff5c5c': 'RED', '#ffd166': 'AMBER', '#b28dff': 'VIOLET',
                    '#7dff8a': 'LIME',
                };
                config.accentName = nameMap[hex] || 'CUSTOM';
                if (labelEls.accentName) labelEls.accentName.textContent = config.accentName;
                if (config.fxRainbow) {
                    config.fxRainbow = false;
                    document.querySelectorAll('.toggle[data-key="fxRainbow"]').forEach(x => x.classList.remove('on'));
                }
                accentCustom.value = hex;
                updateAccentRGB();
                saveConfig();
            });
        });

        accentCustom.addEventListener('input', () => {
            config.accent = accentCustom.value;
            config.accentName = 'CUSTOM';
            if (labelEls.accentName) labelEls.accentName.textContent = 'CUSTOM';
            document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
            updateAccentRGB();
            saveConfig();
        });
        accentCustom.addEventListener('change', () => {
            config.accent = accentCustom.value;
            saveConfig();
        });

        glowCustom.addEventListener('input', () => {
            config.glowColor = glowCustom.value;
            updateGlowRGB();
            saveConfig();
        });
        glowCustom.addEventListener('change', () => {
            config.glowColor = glowCustom.value;
            saveConfig();
        });

        presetSelect.addEventListener('change', () => {
            const v = presetSelect.value;
            if (v) {
                applyPreset(v);
                presetSelect.value = '';
            }
        });
    }

    function onConfigChange(key, val) {
        if (key === 'showTelemetry') telemetryEl.style.display = val ? '' : 'none';
        if (key === 'showClock') clockEl.style.display = val ? '' : 'none';
        if (key === 'showFps' && !val) {
            tFps.textContent = '—';
            tFps.classList.add('idle');
        }
        if (key === 'videoGrayscale' || key === 'videoMirror' ||
            key === 'videoBrightness' || key === 'videoContrast' || key === 'videoSaturate') {
            applyVideoFilter();
        }
        if (key === 'fxRainbow' && !val) updateAccentRGB();
        if (key === 'glowColor') updateGlowRGB();

        if (['maxHands', 'modelComplexity', 'minDetection', 'minTracking', 'enableHands'].includes(key)) {
            applyHandsOptions();
            if (key === 'enableHands' && !val) {
                handSlots.clear();
                handData = [];
                tHands.textContent = '0';
                tHands.classList.add('idle');
                tPose.textContent = '—';
                tPose.classList.add('idle');
                tSpeed.textContent = '—';
                tSpeed.classList.add('idle');
                tSpeedBar.style.width = '0%';
            }
        }
        if ((key === 'facingMode' || key === 'resolution') && active) {
            restartCamera();
        }

        saveConfig();
    }

    function applyVideoFilter() {
        const b = config.videoBrightness;
        const c = config.videoContrast;
        const s = config.videoGrayscale ? 0.15 : config.videoSaturate;
        video.style.filter = `contrast(${c}) brightness(${b}) saturate(${s})`;
        video.style.transform = config.videoMirror ? 'scaleX(-1)' : 'none';
    }

    function syncAllInputs() {
        document.querySelectorAll('input[type="range"][data-key]').forEach(i => {
            const k = i.dataset.key;
            i.value = config[k];
            syncSliderLabel(k, config[k]);
            updateSliderFill(i);
        });
        document.querySelectorAll('.toggle[data-key]').forEach(t => {
            t.classList.toggle('on', !!config[t.dataset.key]);
        });
        document.querySelectorAll('select[data-key]').forEach(s => {
            s.value = config[s.dataset.key];
        });
        document.querySelectorAll('.color-swatch').forEach(x => {
            x.classList.toggle('active', x.dataset.accent === config.accent);
        });
        if (labelEls.accentName) labelEls.accentName.textContent = config.accentName;
        accentCustom.value = config.accent;
        glowCustom.value = config.glowColor;
    }

    // ============================================================
    //  ACTIONS
    // ============================================================
    document.getElementById('resetDefaults').addEventListener('click', () => {
        Object.assign(config, DEFAULTS);
        updateAccentRGB();
        updateGlowRGB();
        applyVideoFilter();
        syncAllInputs();
        Object.keys(config).forEach(k => onConfigChange(k, config[k]));
        saveConfig();
        showToast('Defaults restored');
    });

    document.getElementById('exportConfig').addEventListener('click', async () => {
        const data = JSON.stringify(config, null, 2);
        try {
            await navigator.clipboard.writeText(data);
            showToast('Config copied');
        } catch (e) {
            window.prompt('Config JSON:', data);
        }
    });

    document.getElementById('importConfig').addEventListener('click', () => {
        const data = window.prompt('Paste config JSON:');
        if (!data) return;
        try {
            const parsed = JSON.parse(data);
            Object.assign(config, DEFAULTS, parsed);
            updateAccentRGB();
            updateGlowRGB();
            applyVideoFilter();
            syncAllInputs();
            Object.keys(config).forEach(k => onConfigChange(k, config[k]));
            saveConfig();
            showToast('Config loaded');
        } catch (e) {
            showToast('Invalid config');
        }
    });

    function toggleFullscreen() {
        const el = document.getElementById('stage');
        if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => { });
        else document.exitFullscreen?.();
    }
    document.getElementById('toggleFullscreen').addEventListener('click', toggleFullscreen);

    function saveFrame() {
        try {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const outW = Math.round(viewW * dpr);
            const outH = Math.round(viewH * dpr);
            const tmp = document.createElement('canvas');
            tmp.width = outW;
            tmp.height = outH;
            const tc = tmp.getContext('2d');

            // Composite the video with the same filter/mirror the user sees.
            if (cover.valid && video.videoWidth) {
                tc.save();
                const s = config.videoGrayscale ? 0.15 : config.videoSaturate;
                if ('filter' in tc) {
                    tc.filter = `contrast(${config.videoContrast}) brightness(${config.videoBrightness}) saturate(${s})`;
                }
                if (config.videoMirror) {
                    tc.translate(outW, 0);
                    tc.scale(-1, 1);
                    tc.drawImage(
                        video,
                        cover.offsetX * dpr, cover.offsetY * dpr,
                        cover.drawW * dpr, cover.drawH * dpr
                    );
                } else {
                    tc.drawImage(
                        video,
                        cover.offsetX * dpr, cover.offsetY * dpr,
                        cover.drawW * dpr, cover.drawH * dpr
                    );
                }
                tc.restore();
            }
            // Overlay canvas is already at (viewW*dpr, viewH*dpr) — 1:1 blit
            tc.drawImage(canvas, 0, 0, outW, outH);

            const url = tmp.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `sentinel_${Date.now()}.png`;
            a.click();
            showToast('Frame saved');
        } catch (e) {
            console.warn('save failed', e);
            showToast('Save failed');
        }
    }
    document.getElementById('screenshotBtn').addEventListener('click', saveFrame);

    // ============================================================
    //  VISIBILITY
    // ============================================================
    document.addEventListener('visibilitychange', () => {
        if (!active) return;
        if (document.hidden) {
            if (config.pauseOnHide && rafInfer) {
                cancelAnimationFrame(rafInfer);
                rafInfer = null;
            }
        } else {
            if (config.pauseOnHide && !rafInfer) {
                inferLast = performance.now();
                frameLoop();
            }
        }
    });

    // ============================================================
    //  BOOT
    // ============================================================
    function init() {
        loadConfig();
        cacheLabelEls();
        updateAccentRGB();
        updateGlowRGB();
        applyVideoFilter();
        wireInputs();
        syncAllInputs();
        initSnow();

        onConfigChange('showTelemetry', config.showTelemetry);
        onConfigChange('showClock', config.showClock);

        renderLoop();
    }

    setTimeout(() => {
        init();
        if (typeof Hands === 'undefined') {
            // The UI still works — activating will show a dedicated error.
            bootEl.classList.add('error');
            bootMsg.textContent = 'TRACKING LIBRARY UNAVAILABLE';
            setTimeout(() => bootEl.classList.add('hidden'), 2200);
        } else {
            bootEl.classList.add('hidden');
        }
    }, 300);

})();
