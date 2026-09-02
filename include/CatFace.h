#ifndef CAT_FACE_H
#define CAT_FACE_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include <math.h>

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

// Elastic Spring Physics Simulation Node
struct Spring {
    float pos;
    float vel;
    float target;
    float stiffness;
    float damping;

    void init(float val, float k = 180.0f, float d = 0.78f) {
        pos = val;
        vel = 0.0f;
        target = val;
        stiffness = k;
        damping = d;
    }

    void reset(float val) {
        pos = val;
        vel = 0.0f;
        target = val;
    }

    void impulse(float force) {
        vel += force;
    }

    void update(float dt) {
        float f = (target - pos) * stiffness;
        vel = (vel + f * dt) * damping;
        pos += vel * dt;
    }
};

// Bézier Easing Curves
inline float easeOutElastic(float x) {
    const float c4 = (2.0f * M_PI) / 3.0f;
    return x == 0.0f ? 0.0f : (x == 1.0f ? 1.0f : powf(2.0f, -10.0f * x) * sinf((x * 10.0f - 0.75f) * c4) + 1.0f);
}

inline float easeOutBack(float x) {
    const float c1 = 1.70158f;
    const float c3 = c1 + 1.0f;
    return 1.0f + c3 * powf(x - 1.0f, 3.0f) + c1 * powf(x - 1.0f, 2.0f);
}

inline float easeInOutCubic(float x) {
    return x < 0.5f ? 4.0f * x * x * x : 1.0f - powf(-2.0f * x + 2.0f, 3.0f) / 2.0f;
}

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

    // Spring Physics Nodes
    Spring springLookX;
    Spring springLookY;
    Spring springSquashX; // Scale X for squash-and-stretch
    Spring springSquashY; // Scale Y for squash-and-stretch
    Spring springEarWiggle;
    Spring springPupilDilation; // Dilation factor (0.5 to 1.5)

    // Blinking animation
    bool isBlinking;
    float blinkProgress; // 0.0 to 1.0
    unsigned long nextBlinkTime;

    // Animation progress timers
    float animTime;
    float purrVibration;
    float dizzyAngle;

    // Particle Physics
    struct Particle {
        float x, y;
        float vx, vy;
        float alpha;
        float scale;
        float rotation;
        float rotVel;
        bool active;
    };
    static const int MAX_PARTICLES = 12;
    Particle particles[MAX_PARTICLES];

    // Color Theme
    CatTheme theme;

    // Internal Drawing Functions
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
