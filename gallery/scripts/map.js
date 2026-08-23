class SimplexNoise {
  constructor(seed = Math.random()) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Shuffle with seed
    let n, q;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = this.p[i];
      this.p[i] = this.p[n];
      this.p[n] = q;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    let n0, n1, n2;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

// Text color for glow (matches CSS --text-color)
const TEXT_COLOR = '#EFE7E0';

class Blob {
  constructor(x, y, radius, color, glowColor, name, noiseOffset = 0, aspectRatio = 0.45) {
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    this.radius = radius;
    this.aspectRatio = aspectRatio; // < 1 = wider/flatter, > 1 = taller
    this.color = color;
    this.glowColor = glowColor;
    this.name = name;
    this.noiseOffset = noiseOffset;
    this.noise = new SimplexNoise(noiseOffset);

    // Hover properties
    this.hovered = false;
    this.hoverProgress = 0;

    // Wobble settings
    this.wobbleSpeed = 0.00018;
    this.wobbleAmount = 0.12;
    this.numPoints = 64;
  }

  update(mouseX, mouseY) {
    // Check hover (rough circular check)
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.hovered = dist < this.radius * 1.2;


    // Animate hover progress
    const targetHover = this.hovered ? 1 : 0;
    this.hoverProgress += (targetHover - this.hoverProgress) * 0.08;

    // Scale on hover (25% bigger)
    const targetRadius = this.baseRadius * (1 + this.hoverProgress * 0.25);
    this.radius += (targetRadius - this.radius) * 0.1;
  }

  draw(ctx, time, mouseX, mouseY) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Helper function to get radius at a given angle with smooth noise
    // Lower frequency = wider, smoother bumps (0.8 instead of 2)
    const getRadiusAtAngle = (angle, baseRadius) => {
      // Multiple noise layers for organic feel - lower frequency for wider perturbations
      const noiseVal1 = this.noise.noise2D(
        Math.cos(angle) * 0.8 + time * this.wobbleSpeed,
        Math.sin(angle) * 0.8 + this.noiseOffset
      );
      const noiseVal2 = this.noise.noise2D(
        Math.cos(angle * 2) * 0.5 + time * this.wobbleSpeed * 0.7,
        Math.sin(angle * 2) * 0.5 + this.noiseOffset + 100
      );

      const noise = (noiseVal1 * 0.7 + noiseVal2 * 0.3) * this.wobbleAmount;

      return baseRadius * (1 + noise);
    };

    // Draw outer glow
    const glowIntensity = 20 + this.hoverProgress * 40;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = glowIntensity;

    // Draw blob using smooth path with bezier curves
    ctx.beginPath();

    // Create smooth blob shape using quadratic curves
    const segments = this.numPoints;
    const points = [];

    // Generate points (NOT including duplicate endpoint - we'll close smoothly)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = getRadiusAtAngle(angle, this.radius);
      points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r * this.aspectRatio
      });
    }

    // Start at midpoint between first and last point for smooth closure
    const startX = (points[0].x + points[segments - 1].x) / 2;
    const startY = (points[0].y + points[segments - 1].y) / 2;
    ctx.moveTo(startX, startY);

    // Draw smooth curves through all points, wrapping around
    for (let i = 0; i < segments; i++) {
      const current = points[i];
      const next = points[(i + 1) % segments];

      // End point is midway to the next point
      const endX = (current.x + next.x) / 2;
      const endY = (current.y + next.y) / 2;

      ctx.quadraticCurveTo(current.x, current.y, endX, endY);
    }

    ctx.closePath();

    // Drop shadow glow (text color)
    ctx.shadowColor = TEXT_COLOR;
    ctx.shadowBlur = 25 + this.hoverProgress * 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Solid vertical gradient fill (no transparency)
    const gradient = ctx.createLinearGradient(
      0, -this.radius * this.aspectRatio,
      0, this.radius * this.aspectRatio
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, this.glowColor);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Reset shadow for stroke
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Perspective stroke: vertical gradient from highlight (top) to shadow (bottom)
    const blobHeight = this.radius * this.aspectRatio;
    const strokeGradient = ctx.createLinearGradient(0, -blobHeight, 0, blobHeight);
    strokeGradient.addColorStop(0, 'rgba(248, 250, 209, 0.9)');    // highlight at top
    strokeGradient.addColorStop(1, 'rgba(31, 38, 166, 0.85)');     // shadow at bottom
    ctx.strokeStyle = strokeGradient;
    ctx.lineWidth = 3 + this.hoverProgress * 0.5;
    ctx.stroke();

    // Draw cursor reflection inside the blob
    const relX = mouseX - this.x;
    const relY = mouseY - this.y;
    const distToBlob = Math.sqrt(relX * relX + relY * relY);
    const maxReflectionDist = this.radius * 2.5;

    if (distToBlob < maxReflectionDist) {
      // Calculate cursor reflection position (mirrored and scaled down)
      const reflectionScale = 0.3;
      const reflectX = -relX * reflectionScale;
      const reflectY = -relY * reflectionScale * this.aspectRatio;

      // Fade based on distance - closer = more visible
      const proximityFade = 1 - (distToBlob / maxReflectionDist);
      const reflectionAlpha = proximityFade * 0.5;

      // Size varies slightly with distance
      const reflectionSize = 4 + proximityFade * 4;

      // Draw the reflection dot with a soft glow
      ctx.beginPath();
      ctx.arc(reflectX, reflectY, reflectionSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${reflectionAlpha * 0.6})`;
      ctx.fill();

      // Inner brighter dot
      ctx.beginPath();
      ctx.arc(reflectX, reflectY, reflectionSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${reflectionAlpha})`;
      ctx.fill();
    }

    ctx.restore();
  }

  containsPoint(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius * 1.2;
  }
}

// ============================================
// MAIN CANVAS SETUP
// ============================================
const canvas = document.getElementById('blobCanvas');
const ctx = canvas.getContext('2d');

let width, height, dpr;
let mouseX = 0, mouseY = 0;
let blobs = [];

function resize() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Reposition blobs based on screen size
  createBlobs();
}

function createBlobs() {
  const centerX = width * 0.58;
  const centerY = height * 0.38;
  const baseSize = Math.min(width, height) * 0.14;

  blobs = [
    // Daydream
    new Blob(
      centerX - baseSize * 0.2,
      centerY - baseSize * 0.3,
      baseSize * 1.2,
      'hsla(206, 65%, 88%, 1.00)',
      'hsla(314, 45%, 87%, 1.00)',
      'daydream',
      0,
      0.4
    ),
    // Strangers - right of daydream, purple-blue
    new Blob(
      centerX + baseSize * 1.4,
      centerY + baseSize * 0.4,
      baseSize * 1.0,
      'hsl(250, 40%, 78%)',
      'hsl(250, 55%, 70%)',
      'strangers',
      100,
      0.45
    ),
    // Sunsets - center-right, pink/coral
    new Blob(
      centerX + baseSize * 0.6,
      centerY + baseSize * 1.5,
      baseSize * 1.1,
      'hsl(350, 65%, 82%)',
      'hsl(350, 75%, 75%)',
      'sunsets',
      200,
      0.42
    ),
    // Portraits - left-center, peach/orange
    new Blob(
      centerX - baseSize * 0.5,
      centerY + baseSize * 2.3,
      baseSize * 0.95,
      'hsl(25, 75%, 82%)',
      'hsl(25, 85%, 75%)',
      'portraits',
      300,
      0.48
    ),
    // Sketches - bottom, yellow/cream
    new Blob(
      centerX + baseSize * 0.8,
      centerY + baseSize * 3.2,
      baseSize * 0.9,
      'hsl(50, 70%, 87%)',
      'hsl(50, 80%, 80%)',
      'sketches',
      1000,
      0.43
    ),
  ];
}

function animate(time) {
  ctx.clearRect(0, 0, width, height);

  for (const blob of blobs) {
    blob.update(time, mouseX, mouseY);
    blob.draw(ctx, time, mouseX, mouseY);
  }

  requestAnimationFrame(animate);
}

// Mouse tracking
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Click handling
canvas.style.pointerEvents = 'auto';
canvas.addEventListener('click', (e) => {
  for (const blob of blobs) {
    if (blob.containsPoint(e.clientX, e.clientY)) {
      console.log(`Clicked ${blob.name}! Would navigate to /${blob.name}`);
      triggerTransition(blob);
      break;
    }
  }
});

// Update cursor and sync blob hover to legend
canvas.addEventListener('mousemove', (e) => {
  let hoveredBlobName = null;
  for (const blob of blobs) {
    if (blob.containsPoint(e.clientX, e.clientY)) {
      hoveredBlobName = blob.name;
      break;
    }
  }
  canvas.style.cursor = hoveredBlobName ? 'pointer' : 'default';

  // Sync hover state to legend items
  document.querySelectorAll('.legend-item').forEach(item => {
    if (item.dataset.room === hoveredBlobName) {
      item.classList.add('hover');
    } else {
      item.classList.remove('hover');
    }
  });
});

// Legend item hover sync
document.querySelectorAll('.legend-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    const room = item.dataset.room;
    const blob = blobs.find(b => b.name === room);
    if (blob) blob.hovered = true;
  });
  item.addEventListener('mouseleave', () => {
    const room = item.dataset.room;
    const blob = blobs.find(b => b.name === room);
    if (blob) blob.hovered = false;
  });
  item.addEventListener('click', () => {
    const room = item.dataset.room;
    const blob = blobs.find(b => b.name === room);
    if (blob) triggerTransition(blob);
  });
});

// ============================================
// PAGE TRANSITION
// ============================================
const transitionOverlay = document.querySelector('.transition-overlay');
const transitionCanvas = document.getElementById('transitionCanvas');
const tCtx = transitionCanvas.getContext('2d');

// Map blob names to actual page URLs
const roomUrls = {
  daydream: 'halls/daydream.html',
  strangers: 'halls/strangers.html',
  sunsets: 'halls/sunsets.html',
  portraits: 'halls/portraits.html',
  sketches: 'halls/sketches.html',
};

function triggerTransition(blob) {
  transitionCanvas.width = width * dpr;
  transitionCanvas.height = height * dpr;
  tCtx.scale(dpr, dpr);

  transitionOverlay.style.opacity = '1';
  transitionOverlay.style.pointerEvents = 'auto';

  let progress = 0;
  let fadeProgress = 0;
  let phase = 'expand'; // 'expand' -> 'hold' -> 'fade' -> 'navigate'

  const startX = blob.x;
  const startY = blob.y;
  const startRadius = blob.radius;
  const targetRadius = Math.max(width, height) * 1.5;
  const noise = new SimplexNoise(blob.noiseOffset);

  const holdDuration = 15; // frames to hold at full size
  let holdCounter = 0;

  function animateTransition() {
    tCtx.clearRect(0, 0, width, height);

    if (phase === 'expand') {
      progress += 0.025;
      if (progress >= 1) {
        progress = 1;
        phase = 'hold';
      }
    } else if (phase === 'hold') {
      holdCounter++;
      if (holdCounter >= holdDuration) {
        phase = 'fade';
      }
    } else if (phase === 'fade') {
      fadeProgress += 0.04;
      if (fadeProgress >= 1) {
        // Navigate to the room page
        const url = roomUrls[blob.name] || `halls/${blob.name}.html`;
        window.location.href = url;
        return;
      }
    }

    const eased = easeInOutCubic(progress);
    const currentRadius = startRadius + (targetRadius - startRadius) * eased;

    // Draw expanding blob
    tCtx.save();
    tCtx.translate(startX, startY);

    const numPoints = 64;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const noiseVal = noise.noise2D(
        Math.cos(angle) * 2 + progress * 3,
        Math.sin(angle) * 2
      );
      const wobble = noiseVal * 0.1 * (1 - eased); // Less wobble as it expands
      const r = currentRadius * (1 + wobble);
      points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    tCtx.beginPath();
    tCtx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < numPoints; i++) {
      const next = points[(i + 1) % numPoints];
      const nextNext = points[(i + 2) % numPoints];
      const nx = (next.x + nextNext.x) / 2;
      const ny = (next.y + nextNext.y) / 2;
      tCtx.quadraticCurveTo(next.x, next.y, nx, ny);
    }
    tCtx.closePath();

    // Gradient fill
    const gradient = tCtx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(1, blob.glowColor);
    tCtx.fillStyle = gradient;
    tCtx.fill();

    tCtx.restore();

    // Fade to cream overlay during fade phase
    if (phase === 'fade') {
      const fadeAlpha = easeInOutCubic(fadeProgress);
      tCtx.fillStyle = `rgba(248, 239, 229, ${fadeAlpha})`; // #F8EFE5 with alpha
      tCtx.fillRect(0, 0, width, height);
    }

    requestAnimationFrame(animateTransition);
  }

  animateTransition();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================
// INIT
// ============================================
window.addEventListener('resize', resize);
resize();
animate(0);