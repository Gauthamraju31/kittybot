// HTML5 Canvas Pro Cat Face Simulator v2.0 & Lottie Vector Player
// Designed for Waveshare ESP32-S3 1.28" LCD Board

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

class Spring {
  constructor(val, k = 150.0, d = 0.75) {
    this.pos = val;
    this.vel = 0.0;
    this.target = val;
    this.stiffness = k;
    this.damping = d;
  }

  impulse(force) {
    this.vel += force;
  }

  update(dt) {
    const force = (this.target - this.pos) * this.stiffness;
    this.vel = (this.vel + force * dt) * this.damping;
    this.pos += this.vel * dt;
  }
}

class WebSerialController {
  constructor() {
    this.port = null;
    this.writer = null;
    this.reader = null;
    this.isConnected = false;

    this.btnConnect = document.getElementById('btnConnectSerial');
    this.statusBadge = document.getElementById('serialStatusBadge');
    this.consoleElem = document.getElementById('serialLogConsole');

    if (!('serial' in navigator)) {
      if (this.btnConnect) {
        this.btnConnect.disabled = true;
        this.btnConnect.innerText = '⚠️ Web Serial Not Supported';
      }
    } else {
      if (this.btnConnect) {
        this.btnConnect.addEventListener('click', () => this.toggleConnect());
      }
    }
  }

  async toggleConnect() {
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.isConnected = true;
      this.updateStatus(true);

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      this.logConsole('System', 'Connected to ESP32-S3 via Web Serial at 115200 baud!\n');
      this.readLoop();
    } catch (err) {
      console.error('Serial connection error:', err);
      this.logConsole('Error', `Failed to connect: ${err.message}\n`);
      this.updateStatus(false);
    }
  }

  async disconnect() {
    this.isConnected = false;
    if (this.reader) {
      try { await this.reader.cancel(); } catch (e) {}
    }
    if (this.writer) {
      try { await this.writer.close(); } catch (e) {}
    }
    if (this.port) {
      try { await this.port.close(); } catch (e) {}
    }
    this.updateStatus(false);
    this.logConsole('System', 'Serial connection closed.\n');
  }

  updateStatus(connected) {
    if (connected) {
      this.statusBadge.innerText = '🟢 Serial Connected';
      this.statusBadge.classList.add('connected');
      this.btnConnect.innerText = '🔌 Disconnect Serial';
    } else {
      this.statusBadge.innerText = '⚪ Serial Offline';
      this.statusBadge.classList.remove('connected');
      this.btnConnect.innerText = '🔌 Connect USB Serial';
    }
  }

  async send(data) {
    if (!this.isConnected || !this.writer) {
      return;
    }
    try {
      await this.writer.write(data);
      this.logConsole('TX', `Sent command: "${data}"`);
    } catch (err) {
      console.error('Failed to write to serial:', err);
      this.logConsole('Error', `Failed to send data: ${err.message}`);
    }
  }

  async readLoop() {
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.logConsole('RX', value);
      }
    } catch (err) {
      console.error('Error reading serial stream:', err);
    } finally {
      this.reader.releaseLock();
    }
  }

  logConsole(prefix, text) {
    if (!this.consoleElem) return;
    const time = new Date().toLocaleTimeString();
    if (prefix === 'RX') {
      this.consoleElem.value += text;
    } else {
      this.consoleElem.value += `[${time}] [${prefix}] ${text}\n`;
    }
    this.consoleElem.scrollTop = this.consoleElem.scrollHeight;
  }
}

class LottiePlayerManager {
  constructor(containerElem) {
    this.container = containerElem;
    this.anim = null;
    this.currentPath = 'assets/lottie/cat_idle.json';
    this.load(this.currentPath);
  }

  load(path) {
    if (this.anim) {
      this.anim.destroy();
    }
    this.currentPath = path;
    if (window.lottie) {
      this.anim = window.lottie.loadAnimation({
        container: this.container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: path
      });
    }
  }

  play() {
    if (this.anim) this.anim.play();
  }

  pause() {
    if (this.anim) this.anim.pause();
  }

  setSpeed(speed) {
    if (this.anim) this.anim.setSpeed(speed);
  }
}

class CatFaceSimulator {
  constructor(canvas, serialController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.serial = serialController;

    this.currentEmotion = 'idle';
    this.themeIndex = 0;
    this.theme = THEMES[0];

    // Spring Physics Simulation Nodes
    this.springLookX = new Spring(0.0, 150.0, 0.75);
    this.springLookY = new Spring(0.0, 150.0, 0.75);
    this.springSquashX = new Spring(1.0, 240.0, 0.70);
    this.springSquashY = new Spring(1.0, 240.0, 0.70);
    this.springEarWiggle = new Spring(0.0, 160.0, 0.78);
    this.springPupilDilation = new Spring(1.0, 120.0, 0.80);

    this.autoEyeTracking = true;

    this.isBlinking = false;
    this.blinkProgress = 0;
    this.nextBlinkTime = performance.now() + 3000;

    this.animTime = 0;
    this.dizzyAngle = 0;
    this.purrVibration = 0;

    this.particles = [];

    this.lastTime = performance.now();
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = performance.now();
  }

  setEmotion(emotion, cmd) {
    this.currentEmotion = emotion;
    this.springSquashX.impulse(0.5);
    this.springSquashY.impulse(-0.5);
    this.springEarWiggle.impulse(4.0);

    if (cmd && this.serial) {
      this.serial.send(cmd);
    }
  }

  setTheme(index, sendSerial = true) {
    if (index >= 0 && index < THEMES.length) {
      this.themeIndex = index;
      this.theme = THEMES[index];
      this.springSquashX.impulse(0.8);
      this.springSquashY.impulse(-0.8);
      if (sendSerial && this.serial) {
        this.serial.send('t');
      }
    }
  }

  triggerBlink(sendSerial = true) {
    if (!this.isBlinking && this.currentEmotion !== 'sleepy' && this.currentEmotion !== 'happy') {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.springSquashY.impulse(-0.4);
      if (sendSerial && this.serial) {
        this.serial.send('b');
      }
    }
  }

  triggerPat(sendSerial = true) {
    this.setEmotion('happy', sendSerial ? '2' : null);
    this.springSquashY.impulse(-4.5);
    this.springSquashX.impulse(3.5);
    this.springEarWiggle.impulse(12.0);

    for (let i = 0; i < 6; i++) {
      this.spawnParticle(120 + (Math.random() * 80 - 40), 100 + (Math.random() * 60 - 30));
    }
    if (sendSerial && this.serial) {
      this.serial.send('p');
    }
  }

  triggerShake(sendSerial = true) {
    this.setEmotion('dizzy', sendSerial ? '5' : null);
    this.springLookX.impulse((Math.random() - 0.5) * 16.0);
    this.springLookY.impulse((Math.random() - 0.5) * 16.0);
    this.springEarWiggle.impulse(16.0);
    if (sendSerial && this.serial) {
      this.serial.send('s');
    }
  }

  spawnParticle(x, y) {
    this.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 4 - 2,
      alpha: 1.0,
      scale: Math.random() * 8 + 8
    });
  }

  update(dt) {
    this.animTime += dt;

    this.springLookX.update(dt);
    this.springLookY.update(dt);
    this.springSquashX.update(dt);
    this.springSquashY.update(dt);
    this.springEarWiggle.update(dt);
    this.springPupilDilation.update(dt);

    switch (this.currentEmotion) {
      case 'happy':
      case 'heart_eyes':
        this.springPupilDilation.target = 1.35;
        break;
      case 'surprised':
      case 'curious':
        this.springPupilDilation.target = 1.45;
        break;
      case 'angry':
        this.springPupilDilation.target = 0.65;
        break;
      default:
        this.springPupilDilation.target = 1.0;
        break;
    }

    if (this.currentEmotion === 'idle' && this.autoEyeTracking && Math.random() < 0.02) {
      this.springLookX.target = (Math.random() - 0.5) * 1.2;
      this.springLookY.target = (Math.random() - 0.5) * 0.8;
      if (Math.random() < 0.3) {
        this.springEarWiggle.impulse((Math.random() - 0.5) * 8.0);
      }
    }

    const now = performance.now();
    if (now > this.nextBlinkTime && !this.isBlinking && this.currentEmotion === 'idle') {
      this.triggerBlink(false);
      this.nextBlinkTime = now + 2500 + Math.random() * 3500;
    }

    if (this.isBlinking) {
      this.blinkProgress += dt * 10.0;
      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 0;
        this.isBlinking = false;
        this.springSquashY.impulse(0.3);
      }
    }

    if (this.currentEmotion === 'dizzy') {
      this.dizzyAngle += dt * 8.0;
    }

    if (this.currentEmotion === 'happy') {
      this.purrVibration = Math.sin(this.animTime * 30.0) * 1.5;
    } else {
      this.purrVibration = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx + Math.sin(this.animTime * 6.0 + i) * 0.8;
      p.y += p.vy;
      p.vy += 1.5 * dt;
      p.alpha -= dt * 0.7;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

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
    const earWiggle = this.springEarWiggle.pos + Math.sin(this.animTime * 5.0) * 2.5;

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
    let baseW = 46;
    let baseH = 58;

    if (this.currentEmotion === 'surprised') {
      baseW = 54; baseH = 64;
    } else if (this.currentEmotion === 'curious') {
      if (isLeft) { baseW = 50; baseH = 60; }
      else { baseW = 40; baseH = 48; }
    }

    const eyeW = baseW * this.springSquashX.pos;
    const eyeH = baseH * this.springSquashY.pos;

    const eyeX = centerX - eyeW / 2;
    const eyeY = centerY - eyeH / 2;

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

    if (this.currentEmotion === 'sleepy') {
      const breathing = Math.sin(this.animTime * 2.0) * 2.5;
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

    ctx.fillStyle = this.theme.eyeBg;
    ctx.beginPath();
    ctx.roundRect(eyeX, eyeY, eyeW, eyeH, 22);
    ctx.fill();

    if (this.currentEmotion === 'heart_eyes') {
      this.drawHeart(centerX, centerY - 8, 16, this.theme.blush);
      return;
    }

    if (this.currentEmotion === 'dizzy') {
      this.drawSpiral(centerX, centerY, 20, this.dizzyAngle * (isLeft ? 1 : -1), this.theme.pupil);
      return;
    }

    const maxShiftX = 14;
    const maxShiftY = 12;
    const pupilX = centerX + this.springLookX.pos * maxShiftX;
    const pupilY = centerY + this.springLookY.pos * maxShiftY;

    const dilation = this.springPupilDilation.pos;
    const basePupilW = (this.currentEmotion === 'angry') ? 14 : 18;
    const basePupilH = (this.currentEmotion === 'angry') ? 36 : 30;

    const pupilW = basePupilW * dilation;
    const pupilH = basePupilH * dilation;

    ctx.fillStyle = this.theme.pupil;
    ctx.beginPath();
    ctx.ellipse(pupilX, pupilY, pupilW / 2, pupilH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.theme.highlight;
    ctx.beginPath();
    ctx.arc(pupilX - 5, pupilY - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pupilX + 4, pupilY + 5, 2, 0, Math.PI * 2);
    ctx.fill();

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
    const twitch = Math.sin(this.animTime * 12.0) * 2.0 + this.springEarWiggle.pos * 0.3;

    ctx.strokeStyle = this.theme.noseMouth;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(42, 138 + vibY); ctx.lineTo(12, 132 + twitch + vibY);
    ctx.moveTo(40, 146 + vibY); ctx.lineTo(8, 146 + vibY);
    ctx.moveTo(42, 154 + vibY); ctx.lineTo(12, 160 - twitch + vibY);
    ctx.stroke();

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

// Setup & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const serialController = new WebSerialController();
  const canvas = document.getElementById('lcdCanvas');
  const lottieContainer = document.getElementById('lottieContainer');
  const sim = new CatFaceSimulator(canvas, serialController);
  const lottieMgr = new LottiePlayerManager(lottieContainer);

  sim.render();

  // Engine Mode Switcher (Procedural vs Lottie)
  const modeProcedural = document.getElementById('modeProcedural');
  const modeLottie = document.getElementById('modeLottie');

  if (modeProcedural && modeLottie) {
    modeProcedural.addEventListener('click', () => {
      modeProcedural.classList.add('active');
      modeLottie.classList.remove('active');
      canvas.style.display = 'block';
      lottieContainer.style.display = 'none';
    });

    modeLottie.addEventListener('click', () => {
      modeLottie.classList.add('active');
      modeProcedural.classList.remove('active');
      canvas.style.display = 'none';
      lottieContainer.style.display = 'block';
    });
  }

  // Lottie Controls
  const btnLottiePlay = document.getElementById('btnLottiePlay');
  const btnLottiePause = document.getElementById('btnLottiePause');
  const lottieSpeedRange = document.getElementById('lottieSpeedRange');

  if (btnLottiePlay) btnLottiePlay.addEventListener('click', () => lottieMgr.play());
  if (btnLottiePause) btnLottiePause.addEventListener('click', () => lottieMgr.pause());
  if (lottieSpeedRange) {
    lottieSpeedRange.addEventListener('input', (e) => {
      lottieMgr.setSpeed(parseFloat(e.target.value));
    });
  }

  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Emotion Buttons
  const emotionBtns = document.querySelectorAll('.emotion-btn');
  emotionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      emotionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.setEmotion(btn.dataset.emotion, btn.dataset.cmd);
    });
  });

  // Action Buttons
  document.getElementById('btnBlink').addEventListener('click', () => sim.triggerBlink(true));
  document.getElementById('btnPat').addEventListener('click', () => sim.triggerPat(true));
  document.getElementById('btnShake').addEventListener('click', () => sim.triggerShake(true));

  // Theme Selector Cards
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      sim.setTheme(parseInt(card.dataset.theme), true);
    });
  });

  // Serial Console Controls
  const serialInput = document.getElementById('serialInputText');
  const btnSend = document.getElementById('btnSendSerial');
  const btnClear = document.getElementById('btnClearSerial');

  if (btnSend && serialInput) {
    const handleSend = () => {
      const val = serialInput.value;
      if (val) {
        serialController.send(val);
        serialInput.value = '';
      }
    };
    btnSend.addEventListener('click', handleSend);
    serialInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const consoleElem = document.getElementById('serialLogConsole');
      if (consoleElem) consoleElem.value = '';
    });
  }

  // Slider controls
  const sliderLookX = document.getElementById('sliderLookX');
  const sliderLookY = document.getElementById('sliderLookY');
  const checkTracking = document.getElementById('checkEyeTracking');

  sliderLookX.addEventListener('input', (e) => {
    sim.springLookX.target = parseFloat(e.target.value);
    sim.autoEyeTracking = false;
    checkTracking.checked = false;
  });

  sliderLookY.addEventListener('input', (e) => {
    sim.springLookY.target = parseFloat(e.target.value);
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
    sim.springLookX.target = Math.max(-1, Math.min(1, normX));
    sim.springLookY.target = Math.max(-1, Math.min(1, normY));
  });

  screen.addEventListener('click', (e) => {
    const rect = screen.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;

    ripple.style.left = `${rx}px`;
    ripple.style.top = `${ry}px`;
    ripple.classList.remove('active');
    void ripple.offsetWidth;
    ripple.classList.add('active');

    sim.triggerPat(true);
  });
});
