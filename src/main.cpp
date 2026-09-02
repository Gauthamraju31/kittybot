#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <Wire.h>
#include "CatFace.h"

// Hardware Pin Definitions for Waveshare ESP32-S3 1.28 LCD
#define PIN_LCD_BL 40
#define PIN_I2C_SDA 6
#define PIN_I2C_SCL 7
#define PIN_TOUCH_INT 5
#define PIN_TOUCH_RST 13

// CST816S Touch I2C Address
#define CST816S_ADDR 0x15

TFT_eSPI tft = TFT_eSPI();
CatFace cat;

unsigned long lastFrameTime = 0;
const int TARGET_FPS = 60;
const int FRAME_DELAY_MS = 1000 / TARGET_FPS;

// Touch State
struct TouchState {
    bool touched;
    uint16_t x;
    uint16_t y;
    uint8_t gesture;
};

void scanI2CBus() {
    Serial.println("[I2C Scanner] Scanning I2C bus on SDA=6, SCL=7...");
    byte error, address;
    int nDevices = 0;
    for (address = 1; address < 127; address++) {
        Wire.beginTransmission(address);
        error = Wire.endTransmission();
        if (error == 0) {
            Serial.printf(" -> Found I2C device at address 0x%02X\n", address);
            nDevices++;
        }
    }
    if (nDevices == 0) {
        Serial.println(" -> No I2C devices found.");
    } else {
        Serial.printf(" -> Total %d I2C device(s) found.\n", nDevices);
    }
}

void initHardware() {
    Serial.begin(115200);
    delay(500); // Give Serial monitor time to open
    Serial.println("\n==============================================");
    Serial.println(" Waveshare ESP32-S3 Kitty Bot Initializing...");
    Serial.println("==============================================");

    // 1. Backlight PWM Setup on GPIO 40
    Serial.println("[1/5] Configuring Backlight on GPIO 40...");
    pinMode(PIN_LCD_BL, OUTPUT);
    digitalWrite(PIN_LCD_BL, HIGH);

    // 2. Hardware SPI Host Initialization for ESP32-S3 (FSPI / SPI2)
    Serial.println("[2/5] Initializing Hardware SPI bus (SCLK=10, MOSI=11, CS=9)...");
    SPI.begin(10, -1, 11, 9);
    delay(50);

    // 3. TFT GC9A01 LCD Setup
    Serial.println("[3/5] Initializing GC9A01 SPI LCD Driver...");
    tft.init();
    tft.setRotation(2); // 180 degree rotation for upside-down mounted display
    tft.fillScreen(TFT_BLACK);
    Serial.println("[3/5] LCD Hardware Initialized (180° Rotated)!");

    // 4. I2C Setup for Touch (CST816S) & IMU (QMI8658)
    Serial.println("[4/5] Initializing I2C bus (SDA=6, SCL=7)...");
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000);

    // Setup Touch Interrupt Pin
    pinMode(PIN_TOUCH_INT, INPUT_PULLUP);

    // Reset CST816S Touch Controller
    pinMode(PIN_TOUCH_RST, OUTPUT);
    digitalWrite(PIN_TOUCH_RST, LOW);
    delay(10);
    digitalWrite(PIN_TOUCH_RST, HIGH);
    delay(50);

    // Scan bus to verify CST816S (0x15) and IMU presence
    scanI2CBus();

    // 5. Initialize Cat Face Engine
    Serial.println("[5/5] Starting Cat Face Graphics Engine & Allocating Sprite Buffer...");
    cat.begin(&tft);
    cat.setEmotion(EMOTION_IDLE);

    Serial.println("==============================================");
    Serial.println(" === Cat Face Engine Ready! Starting 60 FPS loop ===");
    Serial.println("==============================================");
}

TouchState readTouch() {
    TouchState ts = { false, 0, 0, 0 };

    // The CST816S touch controller asserts PIN_TOUCH_INT (GPIO 5) LOW on active touch.
    // When no touch is active, it goes to sleep and NACKs I2C reads.
    // Check INT pin first to prevent spamming I2C error logs when idle!
    if (digitalRead(PIN_TOUCH_INT) == HIGH) {
        return ts;
    }

    Wire.beginTransmission(CST816S_ADDR);
    Wire.write(0x01); // Register 0x01: Gesture ID
    if (Wire.endTransmission(true) == 0) {
        if (Wire.requestFrom((uint8_t)CST816S_ADDR, (uint8_t)6) == 6) {
            uint8_t data[6] = {0};
            for (int i = 0; i < 6; i++) {
                data[i] = Wire.read();
            }
            ts.gesture = data[0];
            uint8_t points = data[1] & 0x0F;
            if (points > 0 || ts.gesture != 0) {
                ts.touched = true;
                ts.x = ((data[2] & 0x0F) << 8) | data[3];
                ts.y = ((data[4] & 0x0F) << 8) | data[5];
            }
        }
    }
    return ts;
}

void pollInputs() {
    // 1. Check Serial Commands (for interactive remote control)
    if (Serial.available()) {
        char cmd = Serial.read();
        switch (cmd) {
            case '1': cat.setEmotion(EMOTION_IDLE); Serial.println("Emotion: IDLE"); break;
            case '2': cat.setEmotion(EMOTION_HAPPY); Serial.println("Emotion: HAPPY"); break;
            case '3': cat.setEmotion(EMOTION_SLEEPY); Serial.println("Emotion: SLEEPY"); break;
            case '4': cat.setEmotion(EMOTION_HEART_EYES); Serial.println("Emotion: HEART_EYES"); break;
            case '5': cat.setEmotion(EMOTION_DIZZY); Serial.println("Emotion: DIZZY"); break;
            case '6': cat.setEmotion(EMOTION_SURPRISED); Serial.println("Emotion: SURPRISED"); break;
            case '7': cat.setEmotion(EMOTION_ANGRY); Serial.println("Emotion: ANGRY"); break;
            case '8': cat.setEmotion(EMOTION_CURIOUS); Serial.println("Emotion: CURIOUS"); break;
            case 'b': cat.triggerBlink(); Serial.println("Trigger: BLINK"); break;
            case 'p': cat.triggerPat(); Serial.println("Trigger: PAT"); break;
            case 's': cat.triggerShake(); Serial.println("Trigger: SHAKE"); break;
            case 't': {
                static int themeIdx = 0;
                themeIdx = (themeIdx + 1) % 4;
                cat.setTheme(themeIdx);
                Serial.printf("Theme changed to: %d\n", themeIdx);
                break;
            }
        }
    }

    // 2. Check Touch Controller Input
    TouchState ts = readTouch();
    if (ts.touched) {
        // Invert normX and normY for 180° rotated display orientation
        float normX = -((ts.x - 120.0f) / 120.0f);
        float normY = -((ts.y - 120.0f) / 120.0f);
        cat.setLookTarget(normX, normY);

        static bool lastTouch = false;
        if (!lastTouch) {
            cat.triggerPat();
        }
        lastTouch = true;
    } else {
        static bool lastTouch = false;
        lastTouch = false;
    }
}

void setup() {
    initHardware();
    lastFrameTime = millis();
}

void loop() {
    unsigned long now = millis();
    unsigned long delta = now - lastFrameTime;

    if (delta >= FRAME_DELAY_MS) {
        lastFrameTime = now;

        pollInputs();
        cat.update(delta);
        cat.draw();
    }
}
