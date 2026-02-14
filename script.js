// ============================================================
// OUR STORY — A Pixel-Art Love Story Side-Scroller
// ============================================================
(() => {
'use strict';

// ==================== CONFIGURATION ====================
const VH = 400;           // virtual world height
const GY = 330;           // ground Y (feet)
const SPD = 2.8;          // player walk speed (virtual units/frame)
const SCENE_COUNT = 9;

// Character color palettes
const PLAYER_COLORS = {
    hair: '#2C1810', skin: '#EDBC8A', eyes: '#1A1A1A',
    top: '#4A90D9', bottom: '#34495E', shoes: '#1A1A1A'
};
const SANJANA_COLORS = {
    hair: '#0A0A0A', skin: '#EDBC8A', eyes: '#1A1A1A',
    top: '#E84393', bottom: '#8E44AD', shoes: '#C0392B'
};

// ==================== GAME STATE ====================
let gameState = 'start';
// States: start, cinematic, playing, polaroid, transition, valentine, celebration
let scene = 0;
let px = 100, py = GY;         // player world position
let compX = 0, compY = GY;     // companion position
let compState = 'entry';        // entry, together, farewell_anim, apart, reunion_anim, together
let compAlpha = 1;
let compVisible = true;
let camX = 0;
let facing = true;              // true = right
let compFacing = false;
let wFrame = 0;                 // walk animation frame (0, 1, 2)
let wTick = 0;
let moving = false;
let keysDown = {};
let heartsCollected = 0;
let t = 0;                      // global animation timer
let visited = new Array(SCENE_COUNT).fill(false);
let captionDone = false;
let fadeAlpha = 0;
let fading = 0;                 // 0=none, 1=out, -1=in
let fadeCallback = null;
let cinStep = 0;
let cinTimer = 0;
let particles = [];
let sceneHearts = [];           // active hearts for current scene
let musicOn = false;

// ==================== CANVAS ====================
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

function resize() {
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function S() { return cvs.height / VH; }
function VW() { return cvs.width / S(); }

// World to screen helpers
function wx(worldX) { return (worldX - camX) * S(); }
function wy(worldY) { return worldY * S(); }
function ws(size) { return size * S(); }

// ==================== SCENE DATA ====================
const scenes = [
    { // 0 — Pondicherry 2017
        width: 1400, triggerX: 700,
        photos: ['photos/1.jpeg'],
        caption: "Pondicherry, 2017.\nYou were supposed to be my wingman... funny how that turned out 😏\nNo one from that trip talks anymore — it was only ever meant for us to meet.",
        hearts: [{x:250,y:312},{x:450,y:316},{x:900,y:314},{x:1150,y:312}],
        cinematic: 'meeting'
    },
    { // 1 — Goa 2018
        width: 1300, triggerX: 650,
        photos: ['photos/2.jpeg'],
        caption: "Goa, 2018.\nYoung, in love, and not a single care in the world.\nStill one of my favorite memories with you, Sanna 🌅",
        hearts: [{x:180,y:314},{x:380,y:312},{x:600,y:316},{x:900,y:312},{x:1100,y:314}],
    },
    { // 2 — Airport farewell 2020
        width: 1300, triggerX: 600,
        photos: ['photos/3.jpeg'],
        caption: "2020. The hardest goodbye.\nI chased a dream 10,000 miles away from\nthe only person who felt like home ✈️",
        hearts: [{x:200,y:314},{x:500,y:312},{x:850,y:316}],
        cinematic: 'farewell'
    },
    { // 3 — Long distance
        width: 1100, triggerX: 550,
        photos: ['photos/4.jpeg'],
        caption: "Time zones apart, but never really apart.\nOur e-date nights kept us going 💻🌙",
        hearts: [{x:180,y:314},{x:400,y:312},{x:750,y:316}],
    },
    { // 4 — Reunion 2021
        width: 1300, triggerX: 650,
        photos: ['photos/5.jpeg'],
        caption: "2021. And then you showed up again.\nBest surprise life ever gave me 🛬❤️",
        hearts: [{x:200,y:314},{x:450,y:312},{x:800,y:316},{x:1050,y:312}],
        cinematic: 'reunion'
    },
    { // 5 — Graduation 2022
        width: 1300, triggerX: 650,
        photos: ['photos/6.jpeg'],
        caption: "Graduation Day, 2022.\nIn front of everyone, I asked.\nAnd you said yes 💍🎓",
        hearts: [{x:180,y:314},{x:420,y:312},{x:700,y:316},{x:1000,y:312}],
    },
    { // 6 — Wedding 2023
        width: 1300, triggerX: 650,
        photos: ['photos/7.jpeg'],
        caption: "January 2023.\nThe day you officially became my forever, Sanna 💒✨",
        hearts: [{x:200,y:314},{x:480,y:312},{x:780,y:316},{x:1050,y:312}],
    },
    { // 7 — Marriage 3 years
        width: 1300, triggerX: 650,
        photos: ['photos/8a.jpeg','photos/8b.jpeg','photos/8c.jpeg'],
        caption: "3 amazing years of marriage.\nEvery single day with you has been a gift, Sanna 🏠💕",
        hearts: [{x:160,y:314},{x:350,y:312},{x:560,y:316},{x:800,y:312},{x:1050,y:314}],
    },
    { // 8 — Valentine's finale
        width: 1000, triggerX: 500,
        photos: [],
        caption: "",
        hearts: [{x:100,y:314},{x:200,y:312},{x:300,y:316},{x:400,y:312},{x:500,y:314},{x:600,y:312},{x:700,y:316},{x:800,y:314}],
        cinematic: 'valentine'
    }
];

// ==================== DRAWING HELPERS ====================

function drawSky(colors) {
    const g = ctx.createLinearGradient(0, 0, 0, cvs.height);
    for (const [stop, col] of colors) g.addColorStop(stop, col);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
}

function drawGround(color, detail) {
    const s = S();
    ctx.fillStyle = color;
    ctx.fillRect(0, GY * s, cvs.width, (VH - GY + 10) * s);
    if (detail) {
        ctx.fillStyle = detail;
        for (let i = 0; i < 40; i++) {
            const gx = ((i * 137.5 + 50) % cvs.width);
            const gy = GY * s + 5 + (i * 73.3 % ((VH - GY) * s * 0.6));
            ctx.fillRect(gx, gy, 3, 3);
        }
    }
}

function drawPalm(worldX, size) {
    const x = wx(worldX), y = wy(GY), sz = ws(size);
    // Trunk
    ctx.fillStyle = '#8B6914';
    const tw = sz * 0.07;
    ctx.fillRect(x - tw, y - sz * 0.85, tw * 2, sz * 0.85);
    // Leaves
    ctx.fillStyle = '#228B22';
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 1.6 - 0.5 + Math.sin(t * 0.02 + i) * 0.05;
        ctx.save();
        ctx.translate(x, y - sz * 0.85);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(sz * 0.22, 0, sz * 0.28, sz * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawTree(worldX, size) {
    const x = wx(worldX), y = wy(GY), sz = ws(size);
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(x - sz * 0.05, y - sz * 0.5, sz * 0.1, sz * 0.5);
    ctx.fillStyle = '#2E7D32';
    drawTriangle(x, y - sz, sz * 0.35, sz * 0.4);
    ctx.fillStyle = '#388E3C';
    drawTriangle(x, y - sz * 0.75, sz * 0.3, sz * 0.4);
}

function drawTriangle(cx, top, halfW, h) {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx - halfW, top + h);
    ctx.lineTo(cx + halfW, top + h);
    ctx.fill();
}

function drawBuilding(worldX, w, h, color, roofColor, windowColor) {
    const x = wx(worldX), y = wy(GY), bw = ws(w), bh = ws(h);
    // Main
    ctx.fillStyle = color;
    ctx.fillRect(x, y - bh, bw, bh);
    // Roof
    if (roofColor) {
        ctx.fillStyle = roofColor;
        ctx.fillRect(x - ws(3), y - bh - ws(8), bw + ws(6), ws(8));
    }
    // Windows
    if (windowColor) {
        ctx.fillStyle = windowColor;
        const ww = ws(6), wh = ws(7), gap = (bw - ww * 2) / 3;
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
                ctx.fillRect(x + gap + c * (ww + gap), y - bh + ws(8) + r * (wh + ws(6)), ww, wh);
            }
        }
    }
}

function drawCloud(worldX, worldY, size, parallax) {
    const adjX = worldX - camX * (parallax || 0.3);
    const x = adjX * S(), y = worldY * S(), sz = size * S();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, sz * 0.5, 0, Math.PI * 2);
    ctx.arc(x - sz * 0.4, y + sz * 0.1, sz * 0.35, 0, Math.PI * 2);
    ctx.arc(x + sz * 0.45, y + sz * 0.08, sz * 0.38, 0, Math.PI * 2);
    ctx.fill();
}

function drawStar(screenX, screenY, size) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 0.05 + screenX) * 0.4})`;
    ctx.fillRect(screenX, screenY, size, size);
}

function drawSignpost(worldX, text) {
    const x = wx(worldX), y = wy(GY), s = S();
    // Post
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x - 2 * s, y - 45 * s, 4 * s, 45 * s);
    // Sign
    ctx.fillStyle = '#DEB887';
    const tw = ctx.measureText(text).width + 12 * s;
    ctx.fillRect(x - tw / 2, y - 45 * s, tw, 16 * s);
    ctx.fillStyle = '#3E2723';
    ctx.font = `bold ${11 * s}px Nunito`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 33 * s);
}

function drawWaves(yPos, color1, color2) {
    const s = S();
    for (let i = 0; i < cvs.width + 30; i += 20) {
        const wave = Math.sin((i + t * 1.5) * 0.03) * 4 * s;
        ctx.fillStyle = (i % 40 < 20) ? color1 : color2;
        ctx.fillRect(i, yPos * s + wave, 22, (VH - yPos + 10) * s);
    }
}

function drawLantern(worldX, worldY, color) {
    const x = wx(worldX), y = wy(worldY), s = S();
    // String
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 10 * s);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Lantern body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + 5 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = `rgba(255,200,50,${0.15 + Math.sin(t * 0.08 + worldX) * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y + 5 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== CHARACTER DRAWING ====================

function drawPerson(worldX, worldY, colors, frame, faceRight, isFemale, alpha) {
    const s = S();
    const x = wx(worldX);
    const y = wy(worldY);
    const p = 2.5 * s; // pixel unit

    ctx.save();
    if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;

    // Hair
    ctx.fillStyle = colors.hair;
    if (isFemale) {
        ctx.fillRect(x - 3 * p, y - 15 * p, 6 * p, 3 * p);
        // Long hair sides
        ctx.fillRect(x - 3 * p, y - 12 * p, 1.2 * p, 5 * p);
        ctx.fillRect(x + 1.8 * p, y - 12 * p, 1.2 * p, 5 * p);
    } else {
        ctx.fillRect(x - 2.5 * p, y - 15 * p, 5 * p, 2.5 * p);
    }

    // Head
    ctx.fillStyle = colors.skin;
    ctx.fillRect(x - 2.5 * p, y - 12.5 * p, 5 * p, 4 * p);

    // Eyes
    ctx.fillStyle = colors.eyes;
    const eyeOff = faceRight ? 0 : -1;
    ctx.fillRect(x + (eyeOff - 0.5) * p, y - 11 * p, 0.8 * p, 0.8 * p);
    ctx.fillRect(x + (eyeOff + 1.2) * p, y - 11 * p, 0.8 * p, 0.8 * p);

    // Smile
    ctx.fillStyle = colors.skin;

    // Neck
    ctx.fillStyle = colors.skin;
    ctx.fillRect(x - 0.8 * p, y - 8.5 * p, 1.6 * p, 1 * p);

    // Body
    ctx.fillStyle = colors.top;
    if (isFemale) {
        // A-line top / dress upper
        ctx.fillRect(x - 3 * p, y - 7.5 * p, 6 * p, 4 * p);
        // Dress flare
        ctx.fillStyle = colors.bottom;
        ctx.fillRect(x - 3.5 * p, y - 3.5 * p, 7 * p, 2.5 * p);
    } else {
        ctx.fillRect(x - 3 * p, y - 7.5 * p, 6 * p, 4.5 * p);
        // Pants
        ctx.fillStyle = colors.bottom;
        ctx.fillRect(x - 2.5 * p, y - 3 * p, 5 * p, 1.5 * p);
    }

    // Arms
    ctx.fillStyle = colors.top;
    ctx.fillRect(x - 4 * p, y - 7 * p, 1 * p, 3.5 * p);
    ctx.fillRect(x + 3 * p, y - 7 * p, 1 * p, 3.5 * p);
    // Hands
    ctx.fillStyle = colors.skin;
    ctx.fillRect(x - 4 * p, y - 3.5 * p, 1 * p, 1 * p);
    ctx.fillRect(x + 3 * p, y - 3.5 * p, 1 * p, 1 * p);

    // Legs
    ctx.fillStyle = isFemale ? colors.skin : colors.bottom;
    const legW = 1.5, legH = 3.5;
    if (frame === 0) {
        ctx.fillRect(x - 2 * p, y - 1 * p, legW * p, legH * p);
        ctx.fillRect(x + 0.5 * p, y - 1 * p, legW * p, legH * p);
    } else if (frame === 1) {
        ctx.fillRect(x - 2.8 * p, y - 1 * p, legW * p, legH * p);
        ctx.fillRect(x + 1.3 * p, y - 1 * p, legW * p, (legH - 0.5) * p);
    } else {
        ctx.fillRect(x - 1.5 * p, y - 1 * p, legW * p, (legH - 0.5) * p);
        ctx.fillRect(x + 0.3 * p, y - 1 * p, legW * p, legH * p);
    }

    // Shoes
    ctx.fillStyle = colors.shoes;
    const shoeH = 1;
    if (frame === 0) {
        ctx.fillRect(x - 2.2 * p, y + 2.5 * p, 2 * p, shoeH * p);
        ctx.fillRect(x + 0.3 * p, y + 2.5 * p, 2 * p, shoeH * p);
    } else if (frame === 1) {
        ctx.fillRect(x - 3 * p, y + 2.5 * p, 2 * p, shoeH * p);
        ctx.fillRect(x + 1.1 * p, y + 2 * p, 2 * p, shoeH * p);
    } else {
        ctx.fillRect(x - 1.7 * p, y + 2 * p, 2 * p, shoeH * p);
        ctx.fillRect(x + 0.1 * p, y + 2.5 * p, 2 * p, shoeH * p);
    }

    ctx.restore();
}

// ==================== SCENE RENDERERS ====================

function drawScene0_Pondicherry() {
    // Sky — warm sunset
    drawSky([[0, '#FF7E5F'], [0.4, '#FEB47B'], [0.75, '#F0E68C'], [1, '#FFECD2']]);
    // Clouds
    drawCloud(200, 60, 30, 0.2);
    drawCloud(600, 45, 25, 0.25);
    drawCloud(1000, 55, 28, 0.15);
    // Far buildings (French colonial style) — parallax
    const ps = 0.4;
    drawBuildingParallax(100, 60, 80, '#FFF5E1', '#C0392B', '#87CEEB', ps);
    drawBuildingParallax(220, 50, 70, '#FFEAA7', '#E17055', '#FFF', ps);
    drawBuildingParallax(380, 55, 85, '#FAD4D4', '#8B4513', '#FFE', ps);
    drawBuildingParallax(550, 45, 65, '#FFFFF0', '#B22222', '#87CEEB', ps);
    drawBuildingParallax(750, 60, 75, '#FFF8DC', '#CD5C5C', '#FFF', ps);
    drawBuildingParallax(950, 50, 80, '#FFEAA7', '#A0522D', '#87CEEB', ps);
    drawBuildingParallax(1100, 55, 70, '#FAD4D4', '#C0392B', '#FFE', ps);
    // Ground — sandy
    drawGround('#F4E0C9', '#E0CDB0');
    // Ocean strip at bottom-right
    drawWaves(GY + 15, '#4DB8D0', '#3AA0B8');
    // Palms
    drawPalm(150, 55);
    drawPalm(520, 50);
    drawPalm(880, 60);
    drawPalm(1250, 48);
    // Signposts
    drawSignpost(80, 'Vellore →');
    drawSignpost(700, '🌴 Pondicherry');
    drawSignpost(1320, '← Delhi');
    // Party lights
    drawPartyLights(600, 900);
}

function drawBuildingParallax(worldX, w, h, color, roofColor, windowColor, parallax) {
    const adjX = worldX - camX * parallax;
    const s = S();
    const x = adjX * s, y = GY * s, bw = w * s, bh = h * s;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - bh, bw, bh);
    if (roofColor) {
        ctx.fillStyle = roofColor;
        ctx.fillRect(x - 2 * s, y - bh - 6 * s, bw + 4 * s, 7 * s);
    }
    if (windowColor) {
        ctx.fillStyle = windowColor;
        const ww = 5 * s, wh = 6 * s;
        for (let r = 0; r < 2; r++) {
            for (let cc = 0; cc < Math.floor(w / 25); cc++) {
                ctx.fillRect(x + 8 * s + cc * 20 * s, y - bh + 12 * s + r * 16 * s, ww, wh);
            }
        }
    }
}

function drawPartyLights(startX, endX) {
    const s = S();
    const colors = ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#5F27CD'];
    for (let i = startX; i < endX; i += 15) {
        const lx = wx(i);
        const ly = wy(GY - 50 + Math.sin(i * 0.1) * 8);
        const ci = Math.floor((i + t * 2) / 15) % colors.length;
        ctx.fillStyle = colors[ci];
        ctx.beginPath();
        ctx.arc(lx, ly, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = colors[ci] + '30';
        ctx.beginPath();
        ctx.arc(lx, ly, 7 * s, 0, Math.PI * 2);
        ctx.fill();
    }
    // String
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = startX; i < endX; i += 5) {
        const lx = wx(i);
        const ly = wy(GY - 52 + Math.sin(i * 0.1) * 8);
        if (i === startX) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
}

function drawScene1_Goa() {
    // Sky — dramatic sunset
    drawSky([[0, '#1A0A2E'], [0.2, '#6B2FA0'], [0.45, '#FF416C'], [0.65, '#FF6B35'], [0.8, '#FFA751'], [1, '#FFE259']]);
    // Clouds
    drawCloud(300, 50, 22, 0.2);
    drawCloud(800, 40, 28, 0.15);
    // Ocean
    drawWaves(GY - 5, '#1565C0', '#1976D2');
    // Beach sand ground
    drawGround('#F4D8A5', '#E8C98A');
    // Palm trees
    drawPalm(100, 60);
    drawPalm(350, 52);
    drawPalm(700, 58);
    drawPalm(1000, 55);
    drawPalm(1200, 50);
    // Beach shack
    const sx = wx(500), sy = wy(GY), ss = S();
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(sx - 30 * ss, sy - 40 * ss, 60 * ss, 40 * ss);
    ctx.fillStyle = '#D2B48C';
    // Thatch roof
    drawTriangle(sx, sy - 55 * ss, 45 * ss, 18 * ss);
    ctx.fillStyle = '#A0522D';
    drawTriangle(sx, sy - 58 * ss, 48 * ss, 18 * ss);
    // Beach umbrella
    const ux = wx(850), uy = wy(GY);
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(ux, uy - 42 * ss, 25 * ss, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(ux, uy - 42 * ss, 25 * ss, Math.PI, Math.PI + Math.PI / 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ux, uy - 42 * ss, 25 * ss, Math.PI + (2 * Math.PI / 3), 0);
    ctx.fill();
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(ux - 1.5 * ss, uy - 42 * ss, 3 * ss, 42 * ss);
}

function drawScene2_Airport() {
    // Sky — overcast grey
    drawSky([[0, '#5D6D7E'], [0.5, '#85929E'], [1, '#AAB7B8']]);
    // Rain
    ctx.fillStyle = 'rgba(180,200,220,0.3)';
    for (let i = 0; i < 80; i++) {
        const rx = (i * 97 + t * 3) % cvs.width;
        const ry = (i * 131 + t * 5) % cvs.height;
        ctx.fillRect(rx, ry, 1.5, 8);
    }
    // Terminal building
    const s = S();
    ctx.fillStyle = '#BDC3C7';
    ctx.fillRect(wx(200), wy(GY - 90), ws(500), ws(90));
    ctx.fillStyle = '#95A5A6';
    ctx.fillRect(wx(200), wy(GY - 95), ws(500), ws(8));
    // Windows
    ctx.fillStyle = '#D4E6F1';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(wx(220 + i * 58), wy(GY - 75), ws(35), ws(25));
    }
    // "DEPARTURES" text
    ctx.fillStyle = '#E74C3C';
    ctx.font = `bold ${10 * s}px Nunito`;
    ctx.textAlign = 'center';
    ctx.fillText('DEPARTURES', wx(450), wy(GY - 80));
    // Ground — tarmac
    drawGround('#7F8C8D', '#6C7A7D');
    // Yellow lines on tarmac
    ctx.fillStyle = '#F1C40F';
    for (let i = 0; i < 1400; i += 60) {
        ctx.fillRect(wx(i), wy(GY + 8), ws(30), ws(3));
    }
    // Airplane
    drawAirplane(900);
    // Suitcases
    drawSuitcase(350, '#E74C3C');
    drawSuitcase(380, '#3498DB');
}

function drawAirplane(worldX) {
    const x = wx(worldX), y = wy(GY - 30), s = S();
    // Body
    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(x - 50 * s, y - 12 * s, 100 * s, 24 * s);
    // Nose
    ctx.beginPath();
    ctx.moveTo(x + 50 * s, y - 10 * s);
    ctx.lineTo(x + 70 * s, y);
    ctx.lineTo(x + 50 * s, y + 10 * s);
    ctx.fillStyle = '#D5DBDB';
    ctx.fill();
    // Tail
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.moveTo(x - 50 * s, y - 12 * s);
    ctx.lineTo(x - 65 * s, y - 35 * s);
    ctx.lineTo(x - 30 * s, y - 12 * s);
    ctx.fill();
    // Wing
    ctx.fillStyle = '#BDC3C7';
    ctx.fillRect(x - 20 * s, y + 5 * s, 45 * s, 8 * s);
    ctx.fillRect(x - 20 * s, y - 13 * s, 45 * s, 6 * s);
    // Windows
    ctx.fillStyle = '#85C1E9';
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(x - 35 * s + i * 12 * s, y - 3 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSuitcase(worldX, color) {
    const x = wx(worldX), y = wy(GY), s = S();
    ctx.fillStyle = color;
    ctx.fillRect(x - 6 * s, y - 14 * s, 12 * s, 14 * s);
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(x - 2 * s, y - 17 * s, 4 * s, 4 * s);
}

function drawScene3_LongDistance() {
    // Split-screen scene
    const s = S();
    const halfW = scenes[3].width / 2;
    const splitScreenX = wx(halfW);

    // Left half — USA night
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(splitScreenX, 0), cvs.height);
    ctx.clip();
    drawSky([[0, '#0A1628'], [0.5, '#1A237E'], [1, '#283593']]);
    // Stars
    for (let i = 0; i < 40; i++) {
        drawStar((i * 73) % cvs.width, (i * 47 + 20) % (GY * s * 0.7), 2);
    }
    // Moon
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath();
    ctx.arc(wx(150), wy(60), 18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(wx(150), wy(60), 16 * s, 0, Math.PI * 2);
    ctx.fill();
    drawGround('#1A1A2E', '#151530');
    // Desk with laptop
    drawDesk(250, '#4FC3F7');
    ctx.restore();

    // Right half — India daytime
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(splitScreenX, 0), 0, cvs.width, cvs.height);
    ctx.clip();
    drawSky([[0, '#FF9800'], [0.4, '#FFB74D'], [0.7, '#FFE082'], [1, '#FFF8E1']]);
    drawCloud(700, 50, 20, 0.3);
    drawCloud(900, 65, 18, 0.25);
    drawGround('#E8D5B7', '#D4C4A0');
    // Desk with laptop
    drawDesk(800, '#FF69B4');
    // Sanjana standing at her desk in long-distance scene
    drawPerson(790, GY, SANJANA_COLORS, (Math.floor(t / 30) % 2 === 0) ? 0 : 0, false, true, 1);
    ctx.restore();

    // Dotted divider line
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(splitScreenX, 0);
    ctx.lineTo(splitScreenX, cvs.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated heart bouncing along the dotted line
    const heartY = GY * 0.5 + Math.sin(t * 0.06) * 40;
    const heartX = halfW + Math.sin(t * 0.03) * (halfW * 0.6);
    drawPixelHeart(heartX, heartY, 8, '#FF69B4');
}

function drawDesk(worldX, laptopGlow) {
    const x = wx(worldX), y = wy(GY), s = S();
    // Desk
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x - 22 * s, y - 18 * s, 44 * s, 4 * s);
    // Desk legs
    ctx.fillRect(x - 20 * s, y - 14 * s, 4 * s, 14 * s);
    ctx.fillRect(x + 16 * s, y - 14 * s, 4 * s, 14 * s);
    // Laptop
    ctx.fillStyle = '#37474F';
    ctx.fillRect(x - 10 * s, y - 30 * s, 20 * s, 14 * s);
    ctx.fillStyle = laptopGlow;
    ctx.fillRect(x - 8 * s, y - 28 * s, 16 * s, 10 * s);
    // Keyboard
    ctx.fillStyle = '#455A64';
    ctx.fillRect(x - 10 * s, y - 20 * s, 20 * s, 3 * s);
    // Glow
    ctx.fillStyle = laptopGlow + '20';
    ctx.beginPath();
    ctx.arc(x, y - 25 * s, 25 * s, 0, Math.PI * 2);
    ctx.fill();
}

function drawScene4_Reunion() {
    // Sky — bright cheerful blue
    drawSky([[0, '#1976D2'], [0.4, '#42A5F5'], [0.7, '#90CAF9'], [1, '#BBDEFB']]);
    // Clouds
    drawCloud(200, 50, 30, 0.2);
    drawCloud(500, 40, 24, 0.3);
    drawCloud(900, 55, 26, 0.15);
    // Airport arrivals building
    const s = S();
    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(wx(250), wy(GY - 100), ws(500), ws(100));
    ctx.fillStyle = '#CFD8DC';
    ctx.fillRect(wx(250), wy(GY - 105), ws(500), ws(8));
    // Glass
    ctx.fillStyle = '#B3E5FC';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(wx(280 + i * 72), wy(GY - 85), ws(45), ws(50));
    }
    // "ARRIVALS" banner
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(wx(380), wy(GY - 108), ws(240), ws(15));
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${11 * s}px Nunito`;
    ctx.textAlign = 'center';
    ctx.fillText('✈️ ARRIVALS', wx(500), wy(GY - 97));
    // Ground
    drawGround('#CFD8DC', '#B0BEC5');
    // Welcome flowers
    drawFlowerCluster(300, GY - 5);
    drawFlowerCluster(700, GY - 5);
}

function drawFlowerCluster(worldX, worldY) {
    const colors = ['#E91E63', '#FF5722', '#FFC107', '#9C27B0'];
    const s = S();
    for (let i = 0; i < 5; i++) {
        const fx = wx(worldX + i * 8 - 16);
        const fy = wy(worldY - Math.abs(i - 2) * 3);
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(fx, fy, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(fx - 1 * s, fy, 2 * s, 8 * s);
    }
}

function drawScene5_Graduation() {
    // Sky — sunny
    drawSky([[0, '#1565C0'], [0.4, '#42A5F5'], [0.75, '#90CAF9'], [1, '#E3F2FD']]);
    drawCloud(250, 45, 26, 0.2);
    drawCloud(700, 55, 22, 0.25);
    // University building
    const s = S();
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(wx(300), wy(GY - 110), ws(400), ws(110));
    // Columns
    ctx.fillStyle = '#EFEBE9';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(wx(330 + i * 100), wy(GY - 100), ws(12), ws(100));
    }
    // Pediment / roof
    ctx.fillStyle = '#A1887F';
    drawTriangle(wx(500), wy(GY - 130), ws(220), ws(25));
    // Ground — green lawn
    drawGround('#66BB6A', '#4CAF50');
    // Stage area
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(wx(450), wy(GY - 8), ws(200), ws(8));
    // Podium
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(wx(540), wy(GY - 25), ws(20), ws(18));
    // Graduation banner
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(wx(420), wy(GY - 75), ws(160), ws(12));
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${8 * s}px Nunito`;
    ctx.textAlign = 'center';
    ctx.fillText('CLASS OF 2022 🎓', wx(500), wy(GY - 66));
    // Audience (small dots)
    ctx.fillStyle = '#78909C';
    for (let r = 0; r < 3; r++) {
        for (let cc = 0; cc < 12; cc++) {
            ctx.beginPath();
            ctx.arc(wx(350 + cc * 25), wy(GY + 15 + r * 10), 3 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawScene6_Wedding() {
    // Sky — golden magical
    drawSky([[0, '#CE93D8'], [0.3, '#FF8A65'], [0.6, '#FFD54F'], [0.85, '#FFF176'], [1, '#FFF9C4']]);
    // Ground — decorated
    drawGround('#FFF3E0', '#FFE0B2');
    const s = S();
    // Mandap / arch
    const mx = 650;
    // Pillars
    ctx.fillStyle = '#E65100';
    ctx.fillRect(wx(mx - 60), wy(GY - 100), ws(8), ws(100));
    ctx.fillRect(wx(mx + 52), wy(GY - 100), ws(8), ws(100));
    // Top beam
    ctx.fillStyle = '#BF360C';
    ctx.fillRect(wx(mx - 65), wy(GY - 105), ws(130), ws(10));
    // Drapes
    ctx.fillStyle = '#F44336';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(wx(mx - 55), wy(GY - 95), ws(110), ws(20));
    ctx.globalAlpha = 1;
    // Marigold garlands
    const garlandColors = ['#FF9800', '#FFC107', '#FFEB3B'];
    for (let g = 0; g < 3; g++) {
        ctx.fillStyle = garlandColors[g];
        for (let i = 0; i < 15; i++) {
            const gx = wx(mx - 50 + i * 7);
            const gy = wy(GY - 75 + g * 12 + Math.sin(i * 0.5) * 3);
            ctx.beginPath();
            ctx.arc(gx, gy, 3.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Hanging diyas / lanterns
    drawLantern(mx - 80, GY - 60, '#FF6F00');
    drawLantern(mx + 80, GY - 60, '#FF6F00');
    drawLantern(mx - 40, GY - 70, '#E65100');
    drawLantern(mx + 40, GY - 70, '#E65100');
    drawLantern(350, GY - 55, '#FFB300');
    drawLantern(950, GY - 55, '#FFB300');
    // Flower petals floating
    for (let i = 0; i < 15; i++) {
        const px2 = (i * 97 + t * 0.5) % 1300;
        const py2 = GY - 120 + Math.sin(t * 0.03 + i * 2) * 30 + i * 5;
        ctx.fillStyle = ['#E91E63', '#FF5722', '#FF9800', '#FFC107'][i % 4];
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(wx(px2), wy(py2), 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Palms / decorative trees
    drawPalm(100, 50);
    drawPalm(1150, 48);
}

function drawScene7_Marriage() {
    // Sky — sunset to dusk
    drawSky([[0, '#7B1FA2'], [0.3, '#E91E63'], [0.55, '#FF7043'], [0.75, '#FFB74D'], [1, '#FFF176']]);
    drawCloud(400, 50, 20, 0.2);
    // Ground — green grass
    drawGround('#81C784', '#66BB6A');
    const s = S();
    // Cozy house
    const hx = 650;
    // Walls
    ctx.fillStyle = '#FFECB3';
    ctx.fillRect(wx(hx - 50), wy(GY - 70), ws(100), ws(70));
    // Roof
    ctx.fillStyle = '#D84315';
    drawTriangle(wx(hx), wy(GY - 90), ws(65), ws(22));
    // Door
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(wx(hx - 8), wy(GY - 30), ws(16), ws(30));
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(wx(hx + 4), wy(GY - 15), 2 * s, 0, Math.PI * 2);
    ctx.fill();
    // Windows with warm glow
    ctx.fillStyle = '#FFF176';
    ctx.fillRect(wx(hx - 38), wy(GY - 55), ws(20), ws(18));
    ctx.fillRect(wx(hx + 18), wy(GY - 55), ws(20), ws(18));
    // Window glow
    ctx.fillStyle = 'rgba(255,241,118,0.2)';
    ctx.beginPath();
    ctx.arc(wx(hx - 28), wy(GY - 46), 20 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx(hx + 28), wy(GY - 46), 20 * s, 0, Math.PI * 2);
    ctx.fill();
    // Heart-shaped tree
    drawHeartTree(350);
    // Garden flowers
    for (let i = 0; i < 20; i++) {
        const fx = 200 + i * 50;
        ctx.fillStyle = ['#E91E63', '#FF5722', '#9C27B0', '#F44336', '#FFC107'][i % 5];
        ctx.beginPath();
        ctx.arc(wx(fx), wy(GY - 3 + Math.sin(i) * 2), 3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(wx(fx) - s, wy(GY - 2), 2 * s, 5 * s);
    }
    // Porch chairs
    drawChair(hx - 80);
    drawChair(hx + 65);
    // Trees
    drawTree(150, 55);
    drawTree(1050, 50);
    drawTree(1180, 45);
}

function drawHeartTree(worldX) {
    const x = wx(worldX), y = wy(GY), s = S();
    // Trunk
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(x - 4 * s, y - 50 * s, 8 * s, 50 * s);
    // Heart-shaped canopy
    ctx.fillStyle = '#E91E63';
    drawPixelHeart(worldX, GY - 70, 22, '#E91E63');
    ctx.fillStyle = '#C2185B';
    drawPixelHeart(worldX, GY - 68, 16, '#C2185B');
}

function drawChair(worldX) {
    const x = wx(worldX), y = wy(GY), s = S();
    ctx.fillStyle = '#8D6E63';
    // Seat
    ctx.fillRect(x - 8 * s, y - 12 * s, 16 * s, 3 * s);
    // Back
    ctx.fillRect(x - 8 * s, y - 22 * s, 3 * s, 13 * s);
    // Legs
    ctx.fillRect(x - 7 * s, y - 9 * s, 3 * s, 9 * s);
    ctx.fillRect(x + 5 * s, y - 9 * s, 3 * s, 9 * s);
}

function drawScene8_Valentine() {
    // Sky — magical twilight
    drawSky([[0, '#0D0221'], [0.3, '#1A0533'], [0.6, '#2D1B69'], [0.8, '#5B2C6F'], [1, '#8E44AD']]);
    const s = S();
    // Stars
    for (let i = 0; i < 60; i++) {
        const sx2 = (i * 89) % cvs.width;
        const sy2 = (i * 53 + 10) % (GY * s * 0.7);
        drawStar(sx2, sy2, 2 + (i % 3));
    }
    // Rose petal ground
    drawGround('#4A0E2E', '#3D0A25');
    // Rose petals scattered
    for (let i = 0; i < 30; i++) {
        const rpx = (i * 33 + 10) % 1000;
        ctx.fillStyle = ['#E91E63', '#F44336', '#FF5252', '#FF1744'][i % 4];
        ctx.globalAlpha = 0.5 + Math.sin(t * 0.04 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(wx(rpx), wy(GY + 5 + (i % 3) * 5), (2 + i % 3) * s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Grand heart arch in center
    drawPixelHeart(500, GY - 100, 40, '#E91E63');
    drawPixelHeart(500, GY - 97, 30, '#FF1744');
    // Sparkle particles
    for (let i = 0; i < 20; i++) {
        const spx = 300 + (i * 23) % 400;
        const spy = GY - 140 + Math.sin(t * 0.05 + i * 1.1) * 50;
        const sa = 0.3 + Math.sin(t * 0.08 + i) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${sa})`;
        ctx.beginPath();
        ctx.arc(wx(spx), wy(spy), (1.5 + Math.sin(t * 0.1 + i) * 0.5) * s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Floating hearts everywhere
    for (let i = 0; i < 12; i++) {
        const hx = (i * 83 + t * 0.3) % 1000;
        const hy = GY - 60 - (t * 0.5 + i * 30) % 150;
        drawPixelHeart(hx, hy, 5 + i % 3, '#FF69B4');
    }
}

// Pixel heart drawing
function drawPixelHeart(worldX, worldY, size, color) {
    const x = wx(worldX), y = wy(worldY), s = S();
    const u = size * s * 0.1;
    ctx.fillStyle = color;
    // Heart shape using circles + triangle
    ctx.beginPath();
    ctx.arc(x - u * 2.5, y, u * 3, 0, Math.PI * 2);
    ctx.arc(x + u * 2.5, y, u * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - u * 5.2, y + u * 1);
    ctx.lineTo(x, y + u * 6);
    ctx.lineTo(x + u * 5.2, y + u * 1);
    ctx.fill();
}

// Collectible floating heart
function drawCollectibleHeart(worldX, worldY, collected) {
    if (collected) return;
    const bob = Math.sin(t * 0.06 + worldX * 0.1) * 5;
    const x = wx(worldX), y = wy(worldY + bob), s = S();
    const u = s * 0.8;
    // Glow
    ctx.fillStyle = 'rgba(255,105,180,0.2)';
    ctx.beginPath();
    ctx.arc(x, y, 12 * s, 0, Math.PI * 2);
    ctx.fill();
    // Heart
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.arc(x - 2.5 * u, y, 3 * u, 0, Math.PI * 2);
    ctx.arc(x + 2.5 * u, y, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5.2 * u, y + 1 * u);
    ctx.lineTo(x, y + 6 * u);
    ctx.lineTo(x + 5.2 * u, y + 1 * u);
    ctx.fill();
}

// All scene renderers
const sceneRenderers = [
    drawScene0_Pondicherry,
    drawScene1_Goa,
    drawScene2_Airport,
    drawScene3_LongDistance,
    drawScene4_Reunion,
    drawScene5_Graduation,
    drawScene6_Wedding,
    drawScene7_Marriage,
    drawScene8_Valentine
];

// ==================== HEART PICKUP SYSTEM ====================

function initSceneHearts() {
    const sd = scenes[scene];
    sceneHearts = sd.hearts.map(h => ({ x: h.x, y: h.y, collected: false }));
}

function checkHeartPickup() {
    for (const h of sceneHearts) {
        if (h.collected) continue;
        const dx = Math.abs(px - h.x);
        const dy = Math.abs(py - h.y);
        if (dx < 20 && dy < 25) {
            h.collected = true;
            heartsCollected++;
            document.getElementById('heart-count').textContent = heartsCollected;
            spawnHeartBurst(h.x, h.y);
        }
    }
}

// ==================== PARTICLE SYSTEM ====================

function spawnHeartBurst(worldX, worldY) {
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        particles.push({
            x: worldX, y: worldY,
            vx: Math.cos(angle) * (1.5 + Math.random()),
            vy: Math.sin(angle) * (1.5 + Math.random()) - 1,
            life: 1,
            color: ['#FF69B4', '#FF1493', '#FF6B6B', '#FFB3D9'][i % 4]
        });
    }
}

function spawnMeetingHearts(worldX, worldY) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: worldX + (Math.random() - 0.5) * 20,
            y: worldY - 10,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -1.5 - Math.random() * 1.5,
            life: 1.5,
            color: ['#FF69B4', '#FF1493', '#E91E63', '#FF6B6B'][i % 4],
            isHeart: true
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    const s = S();
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.isHeart) {
            drawPixelHeart(p.x, p.y, 3, p.color);
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(wx(p.x), wy(p.y), 4 * s, 4 * s);
        }
    }
    ctx.globalAlpha = 1;
}

// ==================== CAMERA ====================

function updateCamera() {
    const vw = VW();
    const target = px - vw * 0.35;
    const sceneW = scenes[scene].width;
    const clamped = Math.max(0, Math.min(target, sceneW - vw));
    camX += (clamped - camX) * 0.08;
}

// ==================== INPUT ====================

document.addEventListener('keydown', e => {
    keysDown[e.key] = true;

    if (gameState === 'start') {
        startGame();
        return;
    }
    if (gameState === 'polaroid') {
        dismissPolaroid();
        return;
    }
});

document.addEventListener('keyup', e => {
    keysDown[e.key] = false;
});

// Touch input for start/polaroid
document.addEventListener('touchstart', e => {
    if (gameState === 'start') { startGame(); return; }
    if (gameState === 'polaroid') { dismissPolaroid(); return; }
}, { passive: true });

// Mouse click for start/polaroid
document.addEventListener('click', e => {
    if (gameState === 'start') { startGame(); return; }
    if (gameState === 'polaroid') {
        // Don't dismiss if clicking the polaroid image itself
        if (!e.target.closest('#polaroid-frame')) {
            dismissPolaroid();
        }
        return;
    }
});

// Mobile buttons
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

btnLeft.addEventListener('touchstart', e => { e.preventDefault(); keysDown['mobileLeft'] = true; }, { passive: false });
btnLeft.addEventListener('touchend', e => { keysDown['mobileLeft'] = false; });
btnLeft.addEventListener('mousedown', () => { keysDown['mobileLeft'] = true; });
btnLeft.addEventListener('mouseup', () => { keysDown['mobileLeft'] = false; });

btnRight.addEventListener('touchstart', e => { e.preventDefault(); keysDown['mobileRight'] = true; }, { passive: false });
btnRight.addEventListener('touchend', e => { keysDown['mobileRight'] = false; });
btnRight.addEventListener('mousedown', () => { keysDown['mobileRight'] = true; });
btnRight.addEventListener('mouseup', () => { keysDown['mobileRight'] = false; });

function isLeft() {
    return keysDown['ArrowLeft'] || keysDown['a'] || keysDown['A'] || keysDown['mobileLeft'];
}
function isRight() {
    return keysDown['ArrowRight'] || keysDown['d'] || keysDown['D'] || keysDown['mobileRight'];
}

// ==================== POLAROID SYSTEM ====================

function showPolaroid() {
    const sd = scenes[scene];
    if (!sd.photos.length) return;

    gameState = 'polaroid';

    const overlay = document.getElementById('polaroid-overlay');
    const photosDiv = document.getElementById('polaroid-photos');
    const captionP = document.getElementById('polaroid-caption');

    // Clear previous
    photosDiv.innerHTML = '';
    photosDiv.className = sd.photos.length > 1 ? 'multi-photo' : '';

    for (const src of sd.photos) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Memory';
        img.onerror = function() {
            this.style.background = 'linear-gradient(135deg, #FFB3D9, #FF69B4)';
            this.style.display = 'flex';
            this.alt = '📷';
        };
        photosDiv.appendChild(img);
    }

    captionP.textContent = sd.caption;

    overlay.classList.remove('hidden');
    // Force reflow for animation
    overlay.offsetHeight;
    overlay.classList.add('visible');
}

function dismissPolaroid() {
    const overlay = document.getElementById('polaroid-overlay');
    overlay.classList.remove('visible');
    setTimeout(() => {
        overlay.classList.add('hidden');

        // Handle post-polaroid state based on scene cinematic type
        if (scenes[scene].cinematic === 'farewell') {
            // After farewell polaroid, companion starts fading
            compState = 'farewell_anim';
            compX = px - 25;
            gameState = 'playing';
        } else if (scenes[scene].cinematic === 'meeting') {
            // After meeting polaroid, start playing together
            compState = 'together';
            compFacing = true;
            gameState = 'playing';
        } else if (scenes[scene].cinematic === 'reunion') {
            compState = 'together';
            compFacing = true;
            gameState = 'playing';
        } else {
            gameState = 'playing';
        }
        captionDone = true;
    }, 400);
}

// ==================== FADE SYSTEM ====================

function startFade(direction, callback) {
    fading = direction; // 1 = fade out (to black), -1 = fade in (from black)
    fadeCallback = callback;
}

function updateFade() {
    if (fading === 1) {
        fadeAlpha += 0.03;
        if (fadeAlpha >= 1) {
            fadeAlpha = 1;
            fading = 0;
            if (fadeCallback) { fadeCallback(); fadeCallback = null; }
        }
    } else if (fading === -1) {
        fadeAlpha -= 0.03;
        if (fadeAlpha <= 0) {
            fadeAlpha = 0;
            fading = 0;
            if (fadeCallback) { fadeCallback(); fadeCallback = null; }
        }
    }
}

function drawFade() {
    if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
}

// ==================== SCENE TRANSITIONS ====================

function goToNextScene() {
    if (scene >= SCENE_COUNT - 1) return;

    gameState = 'transition';
    startFade(1, () => {
        scene++;
        captionDone = false;
        px = 60;
        cinStep = 0;
        cinTimer = 0;

        // Set companion state for new scene
        if (scene === 3) {
            // Long distance — apart
            compState = 'apart';
            compVisible = true;
            compAlpha = 1;
        } else if (scene === 4) {
            // Reunion — starts apart, will become together
            compState = 'apart';
            compVisible = false;
        } else if (scene <= 2) {
            compState = 'together';
            compVisible = true;
            compAlpha = 1;
        } else {
            compState = 'together';
            compVisible = true;
            compAlpha = 1;
        }

        // Position companion
        if (compState === 'together') {
            compX = px - 25;
            compFacing = true;
        }

        initSceneHearts();
        updateCamera();
        camX = Math.max(0, px - VW() * 0.35); // instant camera

        visited[scene] = true;
        updateProgressBar();

        startFade(-1, () => {
            if (scenes[scene].cinematic === 'reunion') {
                gameState = 'cinematic';
            } else if (scenes[scene].cinematic === 'valentine') {
                gameState = 'cinematic';
            } else {
                gameState = 'playing';
            }
        });
    });
}

// ==================== CINEMATIC SEQUENCES ====================

function updateCinematic() {
    cinTimer++;

    const sd = scenes[scene];

    if (sd.cinematic === 'meeting') {
        // Scene 0: both characters walk toward center
        const meetX = sd.width / 2;

        if (cinStep === 0) {
            // Player walks right from left
            px = Math.min(px + SPD * 0.8, meetX - 15);
            // Companion walks left from right
            compX = Math.max(compX - SPD * 0.8, meetX + 15);
            compFacing = false;
            facing = true;

            // Walking animation
            wTick++;
            if (wTick >= 8) { wTick = 0; wFrame = (wFrame + 1) % 3; }

            if (px >= meetX - 16 && compX <= meetX + 16) {
                cinStep = 1;
                cinTimer = 0;
                wFrame = 0;
                spawnMeetingHearts(meetX, GY - 15);
            }
        } else if (cinStep === 1) {
            // Pause — hearts floating
            if (cinTimer > 60) {
                cinStep = 2;
                showPolaroid();
            }
        }
    } else if (sd.cinematic === 'farewell') {
        // Scene 2: at trigger, show polaroid, then companion stays behind
        if (cinStep === 0) {
            // Auto-walk both to trigger point
            if (!captionDone) {
                showPolaroid();
                cinStep = 1;
            }
        }
    } else if (sd.cinematic === 'reunion') {
        if (cinStep === 0) {
            gameState = 'playing';
            cinStep = 1;
        } else if (cinStep === 2) {
            // Sanjana appears from right
            compVisible = true;
            compAlpha = 1;
            compX -= SPD * 0.9;
            compFacing = false;
            wTick++;
            if (wTick >= 8) { wTick = 0; wFrame = (wFrame + 1) % 3; }

            if (Math.abs(compX - px) < 30) {
                cinStep = 3;
                cinTimer = 0;
                wFrame = 0;
                compFacing = true;
                spawnMeetingHearts((px + compX) / 2, GY - 15);
            }
        } else if (cinStep === 3) {
            if (cinTimer > 50) {
                showPolaroid();
                cinStep = 4;
            }
        }
    } else if (sd.cinematic === 'valentine') {
        // Scene 8: both walk together to center
        const centerX = sd.width / 2;

        if (cinStep === 0) {
            compState = 'together';
            compVisible = true;
            compAlpha = 1;
            compX = px - 25;
            compFacing = true;
            // Let player walk
            gameState = 'playing';
            cinStep = 1;
        }
    }
}

// ==================== GAME UPDATE ====================

function updatePlaying() {
    const sd = scenes[scene];
    moving = false;

    // Player movement
    if (isRight()) {
        px += SPD;
        facing = true;
        moving = true;
    }
    if (isLeft()) {
        px -= SPD;
        facing = false;
        moving = true;
    }

    // Clamp position
    px = Math.max(15, Math.min(px, sd.width - 15));

    // Walk animation
    if (moving) {
        wTick++;
        if (wTick >= 8) { wTick = 0; wFrame = (wFrame + 1) % 3; }
    } else {
        wFrame = 0;
        wTick = 0;
    }

    // Companion follows when together
    if (compState === 'together' && compVisible) {
        const targetCompX = px - 25;
        compX += (targetCompX - compX) * 0.1;
        compFacing = facing;
    }

    // Farewell animation — companion fades as player walks away
    if (compState === 'farewell_anim') {
        const dist = Math.abs(px - compX);
        compAlpha = Math.max(0, 1 - dist / 200);
        if (compAlpha <= 0) {
            compVisible = false;
            compState = 'apart';
        }
    }

    // Check for caption trigger
    if (!captionDone && Math.abs(px - sd.triggerX) < 30) {
        if (sd.cinematic === 'farewell') {
            gameState = 'cinematic';
            cinStep = 0;
        } else if (sd.cinematic === 'reunion' && cinStep === 1) {
            // Trigger reunion cinematic
            gameState = 'cinematic';
            cinStep = 2;
            cinTimer = 0;
            compX = sd.width - 50;
            compVisible = true;
            compAlpha = 1;
        } else if (sd.cinematic === 'valentine' && cinStep === 1) {
            // Trigger valentine overlay
            gameState = 'valentine';
            const vOverlay = document.getElementById('valentine-overlay');
            vOverlay.classList.remove('hidden');
            vOverlay.offsetHeight;
            vOverlay.classList.add('visible');
            captionDone = true;
            return;
        } else if (!sd.cinematic || sd.cinematic === 'meeting') {
            // Normal caption trigger
            showPolaroid();
        }
    }

    // Heart pickups
    checkHeartPickup();

    // Scene transition — walk off right edge
    if (px >= sd.width - 20 && captionDone) {
        goToNextScene();
    }

    // Camera
    updateCamera();
}

// ==================== MAIN RENDER ====================

function render() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // Draw current scene background
    if (scene < sceneRenderers.length) {
        sceneRenderers[scene]();
    }

    // Draw collectible hearts
    for (const h of sceneHearts) {
        drawCollectibleHeart(h.x, h.y, h.collected);
    }

    // Draw companion (behind player for depth)
    if (compVisible && compState !== 'apart' && scene !== 3) {
        drawPerson(compX, compY, SANJANA_COLORS, moving ? wFrame : 0, compFacing, true, compAlpha);
    }

    // Draw player (skip in long-distance right half)
    drawPerson(px, py, PLAYER_COLORS, moving ? wFrame : 0, facing, false, 1);

    // Draw particles on top
    drawParticles();

    // Draw fade overlay
    drawFade();

    // Scene indicator arrow (walk right hint)
    if (gameState === 'playing' && captionDone && t % 120 < 80) {
        const s = S();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `bold ${16 * s}px Nunito`;
        ctx.textAlign = 'center';
        ctx.fillText('→', cvs.width - 40 * s, cvs.height / 2);
    }
}

// ==================== GAME LOOP ====================

function gameLoop() {
    t++;

    if (gameState === 'playing') {
        updatePlaying();
    } else if (gameState === 'cinematic') {
        updateCinematic();
        updateCamera();
    } else if (gameState === 'transition') {
        // Just updating fade
    }

    updateFade();
    updateParticles();

    if (gameState !== 'start') {
        render();
    }

    requestAnimationFrame(gameLoop);
}

// ==================== PROGRESS BAR ====================

function initProgressBar() {
    const bar = document.getElementById('progress-bar');
    bar.innerHTML = '';
    for (let i = 0; i < SCENE_COUNT - 1; i++) { // 8 milestone hearts (scene 9 is finale)
        const heart = document.createElement('span');
        heart.className = 'progress-heart';
        heart.textContent = '♡';
        heart.id = `ph-${i}`;
        bar.appendChild(heart);
    }
}

function updateProgressBar() {
    for (let i = 0; i < SCENE_COUNT - 1; i++) {
        const el = document.getElementById(`ph-${i}`);
        if (el) {
            if (visited[i]) {
                el.classList.add('filled');
                el.textContent = '♥';
            }
        }
    }
}

// ==================== MUSIC ====================

const music = document.getElementById('bg-music');
music.volume = 0.3;

function toggleMusic() {
    if (musicOn) {
        music.pause();
        musicOn = false;
        document.getElementById('music-toggle').textContent = '🔇';
    } else {
        music.play().catch(() => {});
        musicOn = true;
        document.getElementById('music-toggle').textContent = '🔊';
    }
}
// Expose to global for onclick
window.toggleMusic = toggleMusic;

// ==================== VALENTINE YES ====================

function handleValentineYes() {
    gameState = 'celebration';

    document.getElementById('valentine-overlay').classList.remove('visible');
    setTimeout(() => {
        document.getElementById('valentine-overlay').classList.add('hidden');
    }, 500);

    // Show celebration
    const celeb = document.getElementById('celebration-overlay');
    celeb.classList.add('visible');

    // Fire confetti
    launchConfetti();
}
window.handleValentineYes = handleValentineYes;

function launchConfetti() {
    const colors = ['#ff69b4', '#ff1493', '#ff85a2', '#ffb3c1', '#ff0000', '#ff6347', '#fff', '#ffdf00'];
    const duration = 8000;
    const end = Date.now() + duration;

    // Big burst
    confetti({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.3 }, colors });

    const interval = setInterval(() => {
        if (Date.now() > end) { clearInterval(interval); return; }
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    }, 350);
}

// ==================== START GAME ====================

function startGame() {
    if (gameState !== 'start') return;

    // Start music
    music.play().then(() => { musicOn = true; }).catch(() => {});
    document.getElementById('music-toggle').textContent = '🔊';

    // Fade out start screen
    document.getElementById('start-screen').classList.add('fade-out');

    // Show UI
    setTimeout(() => {
        document.getElementById('progress-bar').classList.add('visible');
        document.getElementById('heart-counter').classList.add('visible');
    }, 600);

    // Initialize scene 0
    scene = 0;
    px = 50;
    compX = scenes[0].width - 50;
    compY = GY;
    compState = 'entry';
    compVisible = true;
    compAlpha = 1;
    compFacing = false;
    facing = true;
    visited[0] = true;
    updateProgressBar();
    initSceneHearts();
    camX = 0;

    // Enter cinematic for scene 0 (meeting)
    gameState = 'cinematic';
    cinStep = 0;
    cinTimer = 0;

    // Start fade in
    fadeAlpha = 1;
    startFade(-1, null);
}

// ==================== INIT ====================

initProgressBar();
gameLoop();

})();
