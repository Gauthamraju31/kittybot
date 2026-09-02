#ifndef CAT_FACE_H
#define CAT_FACE_H

#include <Arduino.h>
#include <TFT_eSPI.h>

enum CatEmotion {
    EMOTION_IDLE = 0,
    EMOTION_HAPPY,
    EMOTION_SLEEPY,
    EMOTION_HEART_EYES,
    EMOTION_DIZZY,
    EMOTION_SURPRISED,
    EMOTION_ANGRY,
    EMOTION_CURIOUS
};

struct CatTheme {
    uint16_t bg;
    uint16_t eyeBg;
    uint16_t pupil;
    uint16_t highlight;
    uint16_t blush;
    uint16_t noseMouth;
    uint16_t earOuter;
    uint16_t earInner;
};

class CatFace {
public:
    CatFace();
    ~CatFace();
    void begin(TFT_eSPI* tft);
    void update(unsigned long deltaTimeMs);
    void draw();

    // Controls & Interaction
    void setEmotion(CatEmotion emotion);
    CatEmotion getEmotion() const { return currentEmotion; }
    void setLookTarget(float normX, float normY); // -1.0 to 1.0
    void triggerBlink();
    void triggerPat(); // Touch screen pat reaction
    void triggerShake(); // Accel shake reaction
    void setTheme(int themeIndex);

private:
    TFT_eSPI* tft;
    TFT_eSprite* sprite; // Pointer to offscreen double-buffer sprite

    CatEmotion currentEmotion;
    CatEmotion targetEmotion;
    unsigned long emotionTimer;

    // Look target
    float currentLookX, currentLookY;
    float targetLookX, targetLookY;

    // Blinking animation
    bool isBlinking;
    float blinkProgress; // 0.0 to 1.0
    unsigned long nextBlinkTime;

    // Animation progress timers
    float animTime;
    float earWaspProgress;
    float purrVibration;
    float dizzyAngle;

    // Particles (for heart/sleep/dizzy VFX)
    struct Particle {
        float x, y;
        float vx, vy;
        float alpha;
        float scale;
        bool active;
    };
    static const int MAX_PARTICLES = 8;
    Particle particles[MAX_PARTICLES];

    // Color Theme
    CatTheme theme;

    // Internal Drawing Functions (Rendered into double-buffer sprite)
    void drawBackground();
    void drawEars();
    void drawEyes();
    void drawSingleEye(int centerX, int centerY, bool isLeft);
    void drawCheeks();
    void drawNoseAndMouth();
    void drawWhiskers();
    void drawParticles();
    void spawnParticle(float x, float y);
    void updateParticles(float dt);

    // Helpers
    uint16_t color565(uint8_t r, uint8_t g, uint8_t b);
    void drawHeart(int16_t x, int16_t y, int16_t size, uint16_t color);
    void drawSpiral(int16_t x, int16_t y, int16_t radius, float angle, uint16_t color);
};

#endif // CAT_FACE_H
