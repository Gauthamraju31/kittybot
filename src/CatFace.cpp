#include "CatFace.h"
#include <math.h>

// Built-in Color Themes (RGB565 format)
static const CatTheme THEMES[] = {
    // 0: Cyberpunk Neon Cyan
    { 0x0842, 0x07E0, 0x000F, 0xFFFF, 0xF81F, 0x07FF, 0x10A4, 0xF81F },
    // 1: Classic Orange Tabby
    { 0x1082, 0xFD20, 0x3000, 0xFFFF, 0xFA20, 0xFEA0, 0xD280, 0xF81F },
    // 2: Midnight Black & Gold
    { 0x0000, 0xFFE0, 0x0000, 0xFFFF, 0xF940, 0xFFE0, 0x18C3, 0xFA20 },
    // 3: Pastel Pink Kitty
    { 0x2084, 0xFB56, 0x4809, 0xFFFF, 0xF81F, 0xF997, 0x618B, 0xFD1A }
};

CatFace::CatFace() :
    tft(nullptr),
    sprite(nullptr),
    currentEmotion(EMOTION_IDLE),
    targetEmotion(EMOTION_IDLE),
    emotionTimer(0),
    currentLookX(0), currentLookY(0),
    targetLookX(0), targetLookY(0),
    isBlinking(false),
    blinkProgress(0.0f),
    nextBlinkTime(0),
    animTime(0.0f),
    earWaspProgress(0.0f),
    purrVibration(0.0f),
    dizzyAngle(0.0f)
{
    theme = THEMES[0];
    for (int i = 0; i < MAX_PARTICLES; i++) {
        particles[i].active = false;
    }
}

CatFace::~CatFace() {
    if (sprite) {
        if (sprite->created()) {
            sprite->deleteSprite();
        }
        delete sprite;
        sprite = nullptr;
    }
}

void CatFace::begin(TFT_eSPI* tftPtr) {
    tft = tftPtr;
    Serial.println("[CatFace] Initializing sprite buffer...");

    if (sprite != nullptr) {
        if (sprite->created()) {
            sprite->deleteSprite();
        }
        delete sprite;
        sprite = nullptr;
    }

    sprite = new TFT_eSprite(tft);
    sprite->setAttribute(PSRAM_ENABLE, true);

    void* buf = sprite->createSprite(240, 240);
    if (buf == nullptr) {
        Serial.println("[CatFace] Warning: Could not allocate 16-bit sprite in PSRAM/DRAM, falling back to 8-bit color...");
        sprite->setColorDepth(8);
        buf = sprite->createSprite(240, 240);
        if (buf == nullptr) {
            Serial.println("[CatFace] ERROR: Sprite creation failed completely! Check free heap.");
        } else {
            Serial.println("[CatFace] SUCCESS: 8-bit Sprite created (240x240).");
        }
    } else {
        Serial.println("[CatFace] SUCCESS: 16-bit Sprite created (240x240).");
    }

    if (sprite->created()) {
        sprite->setSwapBytes(true);
    }
    nextBlinkTime = millis() + 3000;
}

void CatFace::setTheme(int themeIndex) {
    if (themeIndex >= 0 && themeIndex < 4) {
        theme = THEMES[themeIndex];
    }
}

void CatFace::setEmotion(CatEmotion emotion) {
    currentEmotion = emotion;
    targetEmotion = emotion;
    emotionTimer = millis();
}

void CatFace::setLookTarget(float normX, float normY) {
    targetLookX = constrain(normX, -1.0f, 1.0f);
    targetLookY = constrain(normY, -1.0f, 1.0f);
}

void CatFace::triggerBlink() {
    if (!isBlinking && currentEmotion != EMOTION_SLEEPY && currentEmotion != EMOTION_HAPPY) {
        isBlinking = true;
        blinkProgress = 0.0f;
    }
}

void CatFace::triggerPat() {
    setEmotion(EMOTION_HAPPY);
    for (int i = 0; i < 4; i++) {
        spawnParticle(120 + random(-40, 40), 100 + random(-30, 30));
    }
}

void CatFace::triggerShake() {
    setEmotion(EMOTION_DIZZY);
}

uint16_t CatFace::color565(uint8_t r, uint8_t g, uint8_t b) {
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

void CatFace::update(unsigned long deltaTimeMs) {
    float dt = deltaTimeMs / 1000.0f;
    animTime += dt;

    currentLookX += (targetLookX - currentLookX) * 0.15f;
    currentLookY += (targetLookY - currentLookY) * 0.15f;

    if (currentEmotion == EMOTION_IDLE && random(0, 100) < 3) {
        targetLookX = (random(-100, 100) / 100.0f) * 0.6f;
        targetLookY = (random(-80, 80) / 100.0f) * 0.4f;
    }

    if (millis() > nextBlinkTime && !isBlinking && currentEmotion == EMOTION_IDLE) {
        triggerBlink();
        nextBlinkTime = millis() + random(2500, 6000);
    }

    if (isBlinking) {
        blinkProgress += dt * 10.0f;
        if (blinkProgress >= 1.0f) {
            blinkProgress = 0.0f;
            isBlinking = false;
        }
    }

    if (currentEmotion != EMOTION_IDLE && currentEmotion != EMOTION_SLEEPY) {
        if (millis() - emotionTimer > 4000) {
            setEmotion(EMOTION_IDLE);
        }
    }

    if (currentEmotion == EMOTION_DIZZY) {
        dizzyAngle += dt * 8.0f;
    }

    if (currentEmotion == EMOTION_HAPPY) {
        purrVibration = sinf(animTime * 30.0f) * 1.5f;
    } else {
        purrVibration = 0.0f;
    }

    updateParticles(dt);
}

void CatFace::spawnParticle(float x, float y) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) {
            particles[i].x = x;
            particles[i].y = y;
            particles[i].vx = (random(-30, 30) / 10.0f);
            particles[i].vy = -random(20, 50) / 10.0f;
            particles[i].alpha = 1.0f;
            particles[i].scale = random(6, 12);
            particles[i].active = true;
            break;
        }
    }
}

void CatFace::updateParticles(float dt) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].alpha -= dt * 0.8f;
            if (particles[i].alpha <= 0.0f) {
                particles[i].active = false;
            }
        }
    }
}

void CatFace::drawBackground() {
    sprite->fillScreen(theme.bg);
}

void CatFace::drawEars() {
    float earWiggle = sinf(animTime * 5.0f) * 3.0f;
    if (currentEmotion == EMOTION_CURIOUS) earWiggle *= 2.5f;

    // Left Ear
    int16_t lx1 = 30, ly1 = 65;
    int16_t lx2 = 80, ly2 = 20 + earWiggle;
    int16_t lx3 = 95, ly3 = 65;
    sprite->fillTriangle(lx1, ly1, lx2, ly2, lx3, ly3, theme.earOuter);
    sprite->fillTriangle(lx1 + 6, ly1 - 2, lx2, ly2 + 8, lx3 - 6, ly3 - 2, theme.earInner);

    // Right Ear
    int16_t rx1 = 145, ry1 = 65;
    int16_t rx2 = 160, ry2 = 20 - earWiggle;
    int16_t rx3 = 210, ry3 = 65;
    sprite->fillTriangle(rx1, ry1, rx2, ry2, rx3, ry3, theme.earOuter);
    sprite->fillTriangle(rx1 + 6, ry1 - 2, rx2, ry2 + 8, rx3 - 6, ry3 - 2, theme.earInner);
}

void CatFace::drawHeart(int16_t x, int16_t y, int16_t size, uint16_t color) {
    int16_t r = size / 2;
    sprite->fillCircle(x - r / 2, y - r / 2, r, color);
    sprite->fillCircle(x + r / 2, y - r / 2, r, color);
    sprite->fillTriangle(x - size, y - r / 4, x + size, y - r / 4, x, y + size, color);
}

void CatFace::drawSpiral(int16_t x, int16_t y, int16_t radius, float angle, uint16_t color) {
    int lastX = x, lastY = y;
    for (float r = 2; r < radius; r += 1.5f) {
        float a = angle + r * 0.4f;
        int px = x + cosf(a) * r;
        int py = y + sinf(a) * r;
        sprite->drawLine(lastX, lastY, px, py, color);
        lastX = px;
        lastY = py;
    }
}

void CatFace::drawSingleEye(int centerX, int centerY, bool isLeft) {
    int eyeW = 46;
    int eyeH = 58;

    if (currentEmotion == EMOTION_SURPRISED) {
        eyeW = 54;
        eyeH = 64;
    } else if (currentEmotion == EMOTION_CURIOUS) {
        if (isLeft) { eyeW = 50; eyeH = 60; }
        else { eyeW = 40; eyeH = 48; }
    }

    int eyeX = centerX - eyeW / 2;
    int eyeY = centerY - eyeH / 2;

    // 1. Emotion: HAPPY (^ ^)
    if (currentEmotion == EMOTION_HAPPY) {
        int yOffset = (int)purrVibration;
        sprite->drawWideLine(centerX - 20, centerY + yOffset, centerX, centerY - 12 + yOffset, 5, theme.eyeBg);
        sprite->drawWideLine(centerX, centerY - 12 + yOffset, centerX + 20, centerY + yOffset, 5, theme.eyeBg);
        return;
    }

    // 2. Emotion: SLEEPY (u u)
    if (currentEmotion == EMOTION_SLEEPY) {
        float breathing = sinf(animTime * 2.0f) * 2.0f;
        sprite->drawWideLine(centerX - 20, centerY - 5 + breathing, centerX, centerY + 10 + breathing, 4, theme.eyeBg);
        sprite->drawWideLine(centerX, centerY + 10 + breathing, centerX + 20, centerY - 5 + breathing, 4, theme.eyeBg);
        return;
    }

    // 3. Eye Outer BG
    sprite->fillRoundRect(eyeX, eyeY, eyeW, eyeH, 22, theme.eyeBg);

    // 4. Emotion: HEART_EYES
    if (currentEmotion == EMOTION_HEART_EYES) {
        drawHeart(centerX, centerY, 16, theme.blush);
        return;
    }

    // 5. Emotion: DIZZY
    if (currentEmotion == EMOTION_DIZZY) {
        drawSpiral(centerX, centerY, 20, dizzyAngle * (isLeft ? 1 : -1), theme.pupil);
        return;
    }

    // 6. Pupil calculation
    int maxPupilShiftX = 14;
    int maxPupilShiftY = 12;
    int pupilX = centerX + (int)(currentLookX * maxPupilShiftX);
    int pupilY = centerY + (int)(currentLookY * maxPupilShiftY);

    int pupilW = 18;
    int pupilH = (currentEmotion == EMOTION_ANGRY) ? 36 : 30;

    sprite->fillEllipse(pupilX, pupilY, pupilW / 2, pupilH / 2, theme.pupil);
    sprite->fillCircle(pupilX - 5, pupilY - 6, 4, theme.highlight);
    sprite->fillCircle(pupilX + 4, pupilY + 5, 2, theme.highlight);

    // 7. Blinking / Eyelid Overlay
    if (isBlinking || currentEmotion == EMOTION_ANGRY) {
        float lidRatio = isBlinking ? (sinf(blinkProgress * 3.14159f)) : 0.0f;
        if (currentEmotion == EMOTION_ANGRY) lidRatio = 0.45f;

        int lidH = (int)(eyeH * lidRatio);
        if (lidH > 0) {
            if (currentEmotion == EMOTION_ANGRY) {
                int slant = isLeft ? 10 : -10;
                sprite->fillTriangle(eyeX - 5, eyeY - 2, eyeX + eyeW + 5, eyeY - 2, centerX + slant, eyeY + lidH + 10, theme.bg);
            } else {
                sprite->fillRect(eyeX - 2, eyeY - 2, eyeW + 4, lidH, theme.bg);
            }
        }
    }
}

void CatFace::drawEyes() {
    int vibrationY = (int)purrVibration;
    drawSingleEye(74, 110 + vibrationY, true);
    drawSingleEye(166, 110 + vibrationY, false);
}

void CatFace::drawCheeks() {
    int vibrationY = (int)purrVibration;
    uint16_t blushColor = theme.blush;

    if (currentEmotion == EMOTION_HAPPY || currentEmotion == EMOTION_HEART_EYES) {
        float pulse = (sinf(animTime * 8.0f) + 1.0f) * 0.5f;
        int radius = 14 + (int)(pulse * 4);
        sprite->fillCircle(54, 142 + vibrationY, radius, blushColor);
        sprite->fillCircle(186, 142 + vibrationY, radius, blushColor);
    } else if (currentEmotion == EMOTION_IDLE || currentEmotion == EMOTION_CURIOUS) {
        sprite->fillCircle(54, 142, 10, blushColor);
        sprite->fillCircle(186, 142, 10, blushColor);
    }
}

void CatFace::drawNoseAndMouth() {
    int vibrationY = (int)purrVibration;
    int noseX = 120;
    int noseY = 132 + vibrationY;

    sprite->fillTriangle(noseX - 6, noseY - 4, noseX + 6, noseY - 4, noseX, noseY + 3, theme.noseMouth);
    int mouthY = noseY + 4;

    if (currentEmotion == EMOTION_HAPPY || currentEmotion == EMOTION_SURPRISED) {
        sprite->fillCircle(120, mouthY + 8, 10, theme.noseMouth);
        sprite->fillRect(108, mouthY, 24, 8, theme.bg);
    } else if (currentEmotion == EMOTION_SLEEPY) {
        sprite->drawCircle(120, mouthY + 6, 4, theme.noseMouth);
    } else if (currentEmotion == EMOTION_DIZZY) {
        sprite->drawWideLine(110, mouthY + 6, 120, mouthY + 2, 2, theme.noseMouth);
        sprite->drawWideLine(120, mouthY + 2, 130, mouthY + 6, 2, theme.noseMouth);
    } else if (currentEmotion == EMOTION_ANGRY) {
        sprite->drawWideLine(110, mouthY + 10, 120, mouthY + 4, 3, theme.noseMouth);
        sprite->drawWideLine(120, mouthY + 4, 130, mouthY + 10, 3, theme.noseMouth);
    } else {
        sprite->drawCircle(113, mouthY + 5, 6, theme.noseMouth);
        sprite->drawCircle(127, mouthY + 5, 6, theme.noseMouth);
        sprite->fillRect(105, mouthY, 30, 5, theme.bg);
    }
}

void CatFace::drawWhiskers() {
    int vibrationY = (int)purrVibration;
    float twitch = sinf(animTime * 12.0f) * 2.0f;
    uint16_t color = theme.noseMouth;

    sprite->drawLine(42, 138 + vibrationY, 12, 132 + twitch + vibrationY, color);
    sprite->drawLine(40, 146 + vibrationY, 8, 146 + vibrationY, color);
    sprite->drawLine(42, 154 + vibrationY, 12, 160 - twitch + vibrationY, color);

    sprite->drawLine(198, 138 + vibrationY, 228, 132 - twitch + vibrationY, color);
    sprite->drawLine(200, 146 + vibrationY, 232, 146 + vibrationY, color);
    sprite->drawLine(198, 154 + vibrationY, 228, 160 + twitch + vibrationY, color);
}

void CatFace::drawParticles() {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            drawHeart((int)particles[i].x, (int)particles[i].y, (int)particles[i].scale, theme.blush);
        }
    }
}

void CatFace::draw() {
    if (sprite == nullptr || !sprite->created()) {
        return;
    }
    drawBackground();
    drawEars();
    drawCheeks();
    drawEyes();
    drawNoseAndMouth();
    drawWhiskers();
    drawParticles();

    sprite->pushSprite(0, 0);
}
