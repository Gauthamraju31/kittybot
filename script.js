// HTML5 Canvas Procedural Cat Face Simulator
// Matches C++ CatFace engine for Waveshare ESP32-S3 1.28" LCD

const THEMES = [
  // 0: Cyberpunk Neon Cyan
  { bg: "#090B10", eyeBg: "#00F0FF", pupil: "#05060A", highlight: "#FFFFFF", blush: "#FF007F", noseMouth: "#00F0FF", earOuter: "#161B26", earInner: "#FF007F" },
  // 1: Classic Orange Tabby
  { bg: "#140A00", eyeBg: "#FFA500", pupil: "#200A00", highlight: "#FFFFFF", blush: "#FF69B4", noseMouth: "#FF8C00", earOuter: "#2B1600", earInner: "#FF69B4" },
  // 2: Midnight Black & Gold
  { bg: "#000000", eyeBg: "#FFD700", pupil: "#000000", highlight: "#FFFFFF", blush: "#FF4500", noseMouth: "#FFD700", earOuter: "#181818", earInner: "#FF4500" },
  // 3: Pastel Pink
  { bg: "#200814", eyeBg: "#FFB6C1", pupil: "#3A0D22", highlight: "#FFFFFF", blush: "#FF1493", noseMouth: "#FF69B4", earOuter: "#351224", earInner: "#FF1493" }
];

class CatFaceSimulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.currentEmotion = 'idle';
    this.themeIndex = 0;
    this.theme = THEMES[0];

    this.currentLookX = 0;
    this.currentLookY = 0;
    this.targetLookX = 0;
    this.targetLookY = 0;
    this.autoEyeTracking = true;

    this.isBlinking = false;
    this.blinkProgress = 0;
    this.nextBlinkTime = performance.now() + 3000;

    this.animTime = 0;
    this.dizzyAngle = 0;
    this.purrVibration = 0;

    this.particles = [];

    // Performance FPS tracking
    this.lastTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = performance.now();
  }

  setEmotion(emotion) {
    this.currentEmotion = emotion;
  }

  setTheme(index) {
    if (index >= 0 && index < THEMES.length) {
      this.themeIndex = index;
      this.theme = THEMES[index];
    }
  }

  triggerBlink() {
    if (!this.isBlinking && this.currentEmotion !== 'sleepy' && this.currentEmotion !== 'happy') {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }
  }

  triggerPat() {
    this.setEmotion('happy');
    for (let i = 0; i < 5; i++) {
      this.spawnParticle(120 + (Math.random() * 80 - 40), 100 + (Math.random() * 60 - 30));
    }
  }

  triggerShake() {
    this.setEmotion('dizzy');
  }

  spawnParticle(x, y) {
    this.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 2,
      alpha: 1.0,
      scale: Math.random() * 6 + 6
    });
  }

  update(dt) {
    this.animTime += dt;

    // Smooth interpolation for look offset
    this.currentLookX += (this.targetLookX - this.currentLookX) * 0.15;
    this.currentLookY += (this.targetLookY - this.currentLookY) * 0.15;

    // Idle random eye movements
    if (this.currentEmotion === 'idle' && this.autoEyeTracking && Math.random() < 0.02) {
      this.targetLookX = (Math.random() - 0.5) * 1.2;
      this.targetLookY = (Math.random() - 0.5) * 0.8;
    }

    // Automatic Blinking
    const now = performance.now();
    if (now > this.nextBlinkTime && !this.isBlinking && this.currentEmotion === 'idle') {
      this.triggerBlink();
      this.nextBlinkTime = now + 2500 + Math.random() * 3500;
    }

    if (this.isBlinking) {
      this.blinkProgress += dt * 10.0;
      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 0;
        this.isBlinking = false;
      }
    }

    // Dizzy rotation angle
    if (this.currentEmotion === 'dizzy') {
      this.dizzyAngle += dt * 8.0;
    }

    // Purr vibration offset
    if (this.currentEmotion === 'happy') {
      this.purrVibration = Math.sin(this.animTime * 30.0) * 1.5;
    } else {
      this.purrVibration = 0;
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 0.8;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // FPS Counter calculation
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = now;
      const fpsElem = document.getElementById('fpsDisplay');
      if (fpsElem) fpsElem.innerText = `${this.fps} FPS`;
    }
  }

  drawHeart(x, y, size, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size);
    ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.fill();
    ctx.restore();
  }

  drawSpiral(x, y, radius, angle, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let lastX = x, lastY = y;
    for (let r = 2; r < radius; r += 1.5) {
      const a = angle + r * 0.4;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawBackground() {
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, 240, 240);
  }

  drawEars() {
    const ctx = this.ctx;
    const earWiggle = Math.sin(this.animTime * 5.0) * 3.0;

    // Left Ear
    ctx.fillStyle = this.theme.earOuter;
    ctx.beginPath();
    ctx.moveTo(30, 65);
    ctx.lineTo(80, 20 + earWiggle);
    ctx.lineTo(95, 65);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.theme.earInner;
    ctx.beginPath();
    ctx.moveTo(36, 63);
    ctx.lineTo(80, 28 + earWiggle);
    ctx.lineTo(89, 63);
    ctx.closePath();
    ctx.fill();

    // Right Ear
    ctx.fillStyle = this.theme.earOuter;
    ctx.beginPath();
    ctx.moveTo(145, 65);
    ctx.lineTo(160, 20 - earWiggle);
    ctx.lineTo(210, 65);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.theme.earInner;
    ctx.beginPath();
    ctx.moveTo(151, 63);
    ctx.lineTo(160, 28 - earWiggle);
    ctx.lineTo(204, 63);
    ctx.closePath();
    ctx.fill();
  }

  drawSingleEye(centerX, centerY, isLeft) {
    const ctx = this.ctx;
    let eyeW = 46;
    let eyeH = 58;

    if (this.currentEmotion === 'surprised') {
      eyeW = 54; eyeH = 64;
    } else if (this.currentEmotion === 'curious') {
      if (isLeft) { eyeW = 50; eyeH = 60; }
      else { eyeW = 40; eyeH = 48; }
    }

    const eyeX = centerX - eyeW / 2;
    const eyeY = centerY - eyeH / 2;

    // 1. HAPPY (^ ^ crescent moon)
    if (this.currentEmotion === 'happy') {
      const yOffset = this.purrVibration;
      ctx.strokeStyle = this.theme.eyeBg;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY + yOffset);
      ctx.lineTo(centerX, centerY - 12 + yOffset);
      ctx.lineTo(centerX + 20, centerY + yOffset);
      ctx.stroke();
      return;
    }

    // 2. SLEEPY (u u closed)
    if (this.currentEmotion === 'sleepy') {
      const breathing = Math.sin(this.animTime * 2.0) * 2.0;
      ctx.strokeStyle = this.theme.eyeBg;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY - 5 + breathing);
      ctx.lineTo(centerX, centerY + 10 + breathing);
      ctx.lineTo(centerX + 20, centerY - 5 + breathing);
      ctx.stroke();
      return;
    }

    // 3. Eye Outer BG
    ctx.fillStyle = this.theme.eyeBg;
    ctx.beginPath();
    ctx.roundRect(eyeX, eyeY, eyeW, eyeH, 22);
    ctx.fill();

    // 4. HEART EYES
    if (this.currentEmotion === 'heart_eyes') {
      this.drawHeart(centerX, centerY - 8, 16, this.theme.blush);
      return;
    }

    // 5. DIZZY SPIRAL
    if (this.currentEmotion === 'dizzy') {
      this.drawSpiral(centerX, centerY, 20, this.dizzyAngle * (isLeft ? 1 : -1), this.theme.pupil);
      return;
    }

    // 6. Pupil with offset tracking
    const maxShiftX = 14;
    const maxShiftY = 12;
    const pupilX = centerX + this.currentLookX * maxShiftX;
    const pupilY = centerY + this.currentLookY * maxShiftY;

    const pupilW = 18;
    const pupilH = (this.currentEmotion === 'angry') ? 36 : 30;

    // Pupil Inner Body
    ctx.fillStyle = this.theme.pupil;
    ctx.beginPath();
    ctx.ellipse(pupilX, pupilY, pupilW / 2, pupilH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular Highlights
    ctx.fillStyle = this.theme.highlight;
    ctx.beginPath();
    ctx.arc(pupilX - 5, pupilY - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pupilX + 4, pupilY + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // 7. Blinking / Eyelid Clip
    if (this.isBlinking || this.currentEmotion === 'angry') {
      let lidRatio = this.isBlinking ? Math.sin(this.blinkProgress * Math.PI) : 0;
      if (this.currentEmotion === 'angry') lidRatio = 0.45;

      const lidH = eyeH * lidRatio;
      if (lidH > 0) {
        ctx.fillStyle = this.theme.bg;
        if (this.currentEmotion === 'angry') {
          const slant = isLeft ? 10 : -10;
          ctx.beginPath();
          ctx.moveTo(eyeX - 5, eyeY - 2);
          ctx.lineTo(eyeX + eyeW + 5, eyeY - 2);
          ctx.lineTo(centerX + slant, eyeY + lidH + 10);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(eyeX - 2, eyeY - 2, eyeW + 4, lidH);
        }
      }
    }
  }

  drawEyes() {
    const vibY = this.purrVibration;
    this.drawSingleEye(74, 110 + vibY, true);
    this.drawSingleEye(166, 110 + vibY, false);
  }

  drawCheeks() {
    const ctx = this.ctx;
    const vibY = this.purrVibration;
    const blushColor = this.theme.blush;

    if (this.currentEmotion === 'happy' || this.currentEmotion === 'heart_eyes') {
      const pulse = (Math.sin(this.animTime * 8.0) + 1.0) * 0.5;
      const radius = 14 + pulse * 4;
      ctx.fillStyle = blushColor;
      ctx.beginPath();
      ctx.arc(54, 142 + vibY, radius, 0, Math.PI * 2);
      ctx.arc(186, 142 + vibY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.currentEmotion === 'idle' || this.currentEmotion === 'curious') {
      ctx.fillStyle = blushColor;
      ctx.beginPath();
      ctx.arc(54, 142, 10, 0, Math.PI * 2);
      ctx.arc(186, 142, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawNoseAndMouth() {
    const ctx = this.ctx;
    const vibY = this.purrVibration;
    const noseX = 120;
    const noseY = 132 + vibY;

    // Nose
    ctx.fillStyle = this.theme.noseMouth;
    ctx.beginPath();
    ctx.moveTo(noseX - 6, noseY - 4);
    ctx.lineTo(noseX + 6, noseY - 4);
    ctx.lineTo(noseX, noseY + 3);
    ctx.closePath();
    ctx.fill();

    const mouthY = noseY + 4;
    ctx.strokeStyle = this.theme.noseMouth;

    if (this.currentEmotion === 'happy' || this.currentEmotion === 'surprised') {
      ctx.fillStyle = this.theme.noseMouth;
      ctx.beginPath();
      ctx.arc(120, mouthY + 6, 9, 0, Math.PI);
      ctx.fill();
    } else if (this.currentEmotion === 'sleepy') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(120, mouthY + 6, 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.currentEmotion === 'dizzy') {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(110, mouthY + 6);
      ctx.lineTo(120, mouthY + 2);
      ctx.lineTo(130, mouthY + 6);
      ctx.stroke();
    } else if (this.currentEmotion === 'angry') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(110, mouthY + 10);
      ctx.lineTo(120, mouthY + 4);
      ctx.lineTo(130, mouthY + 10);
      ctx.stroke();
    } else {
      // Classic '3' cat mouth
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(113, mouthY + 5, 5.5, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(127, mouthY + 5, 5.5, 0, Math.PI);
      ctx.stroke();
    }
  }

  drawWhiskers() {
    const ctx = this.ctx;
    const vibY = this.purrVibration;
    const twitch = Math.sin(this.animTime * 12.0) * 2.0;

    ctx.strokeStyle = this.theme.noseMouth;
    ctx.lineWidth = 2;

    // Left Whiskers
    ctx.beginPath();
    ctx.moveTo(42, 138 + vibY); ctx.lineTo(12, 132 + twitch + vibY);
    ctx.moveTo(40, 146 + vibY); ctx.lineTo(8, 146 + vibY);
    ctx.moveTo(42, 154 + vibY); ctx.lineTo(12, 160 - twitch + vibY);
    ctx.stroke();

    // Right Whiskers
    ctx.beginPath();
    ctx.moveTo(198, 138 + vibY); ctx.lineTo(228, 132 - twitch + vibY);
    ctx.moveTo(200, 146 + vibY); ctx.lineTo(232, 146 + vibY);
    ctx.moveTo(198, 154 + vibY); ctx.lineTo(228, 160 + twitch + vibY);
    ctx.stroke();
  }

  drawParticles() {
    for (let p of this.particles) {
      this.drawHeart(p.x, p.y - p.scale, p.scale, this.theme.blush);
    }
  }

  render() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);

    this.drawBackground();
    this.drawEars();
    this.drawCheeks();
    this.drawEyes();
    this.drawNoseAndMouth();
    this.drawWhiskers();
    this.drawParticles();

    requestAnimationFrame(() => this.render());
  }
}

// UI Setup & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('lcdCanvas');
  const sim = new CatFaceSimulator(canvas);
  sim.render();

  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Emotion Buttons
  const emotionBtns = document.querySelectorAll('.emotion-btn');
  emotionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      emotionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.setEmotion(btn.dataset.emotion);
    });
  });

  // Action Buttons
  document.getElementById('btnBlink').addEventListener('click', () => sim.triggerBlink());
  document.getElementById('btnPat').addEventListener('click', () => sim.triggerPat());
  document.getElementById('btnShake').addEventListener('click', () => sim.triggerShake());

  // Theme Selector Cards
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      sim.setTheme(parseInt(card.dataset.theme));
    });
  });

  // Slider controls
  const sliderLookX = document.getElementById('sliderLookX');
  const sliderLookY = document.getElementById('sliderLookY');
  const checkTracking = document.getElementById('checkEyeTracking');

  sliderLookX.addEventListener('input', (e) => {
    sim.targetLookX = parseFloat(e.target.value);
    sim.autoEyeTracking = false;
    checkTracking.checked = false;
  });

  sliderLookY.addEventListener('input', (e) => {
    sim.targetLookY = parseFloat(e.target.value);
    sim.autoEyeTracking = false;
    checkTracking.checked = false;
  });

  checkTracking.addEventListener('change', (e) => {
    sim.autoEyeTracking = e.target.checked;
  });

  // Interactive Screen Touch & Mouse Tracking
  const screen = document.querySelector('.glass-screen');
  const ripple = document.getElementById('touchRipple');

  screen.addEventListener('mousemove', (e) => {
    if (!sim.autoEyeTracking) return;
    const rect = screen.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) - 120) / 120;
    const normY = ((e.clientY - rect.top) - 120) / 120;
    sim.targetLookX = Math.max(-1, Math.min(1, normX));
    sim.targetLookY = Math.max(-1, Math.min(1, normY));
  });

  screen.addEventListener('click', (e) => {
    const rect = screen.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;

    ripple.style.left = `${rx}px`;
    ripple.style.top = `${ry}px`;
    ripple.classList.remove('active');
    void ripple.offsetWidth; // Trigger reflow
    ripple.classList.add('active');

    sim.triggerPat();
  });
});
