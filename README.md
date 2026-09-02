# 🐱 KittyBot - Waveshare ESP32-S3 1.28" Round LCD Cat Animations

A high-performance C++ firmware and interactive HTML5 studio preview featuring fancy, vector-rendered cat face animations designed specifically for the **Waveshare ESP32-S3 1.28" IPS Round LCD** board (GC9A01 SPI Display, CST816S Touch, QMI8658 Accelerometer, CNC Metal Case).

![Cat Face Simulator Preview](https://img.shields.gradient.net/badge/Waveshare-ESP32--S3-cyan?style=for-the-badge)

## ✨ Features

- ⚡ **60 FPS Double-Buffered Vector Rendering**: Smooth, flicker-free graphics using TFT_eSPI sprites on 240x240 circular screen.
- 😽 **8 Expressive Cat Emotion States**:
  - **Idle**: Periodic realistic blinking, subtle breathing, and curious pupil tracking.
  - **Happy Purr**: Crescent moon smiling eyes (`^ ^`), open mouth, pulsing blush cheeks, purr vibration, heart particle bursts.
  - **Sleepy ZzZ**: Closed eyelids (`u u`), slow calm breathing animation.
  - **Heart Eyes**: Glowing hearts (`♥ ♥`) in eyes, blushing cheeks, open `aww` mouth.
  - **Dizzy Shake**: Animated rotating spiral pupils (`@ @`), wavy mouth, droopy ears (triggered by board shake).
  - **Surprised**: Extra-wide pupils (`O O`), standing ears.
  - **Fierce / Angry**: Slanted fierce eyelids (`> <`), downward frown.
  - **Curious Tilt**: Asymmetric eyes (`O o`), twitching cat ears.
- 👆 **Interactive Touch & Shake**:
  - **Touch (CST816S)**: Tapping screen pats kitty, triggering heart particles & purring.
  - **Motion/Shake (QMI8658)**: Shaking device triggers dizzy spiral eyes.
- 🎨 **4 Color Themes**: Cyberpunk Neon Cyan, Classic Orange Tabby, Midnight Black & Gold, Pastel Pink.
- 🖥️ **Interactive Web Simulator (`index.html`)**: Instant zero-install browser preview simulating the round LCD screen inside the CNC metal case frame.

---

## 🛠️ Hardware Pinout Specification (Waveshare ESP32-S3-LCD-1.28)

| Feature | GPIO Pin | Function |
| :--- | :--- | :--- |
| **LCD SPI MOSI** | `GPIO 11` | GC9A01 Master Out Slave In |
| **LCD SPI SCLK** | `GPIO 10` | GC9A01 SPI Clock |
| **LCD SPI CS** | `GPIO 9` | Chip Select |
| **LCD DC** | `GPIO 8` | Data / Command |
| **LCD Reset** | `GPIO 12` | Hardware Reset |
| **Backlight PWM** | `GPIO 40` | Screen Backlight Enable |
| **Touch I2C SDA** | `GPIO 6` | CST816S Touch SDA / IMU SDA |
| **Touch I2C SCL** | `GPIO 7` | CST816S Touch SCL / IMU SCL |
| **Touch INT** | `GPIO 5` | CST816S Interrupt |
| **Touch Reset** | `GPIO 13` | CST816S Hardware Reset |

---

## 🚀 How to Build & Flash Firmware (PlatformIO)

1. Connect your Waveshare ESP32-S3 board to your computer via USB-C.
2. Open this directory in VS Code with the PlatformIO extension installed.
3. Build and upload firmware to board:
   ```bash
   pio run -t upload
   ```
4. Open PlatformIO Serial Monitor at `115200` baud to control kitty via keyboard input:
   - `1`..`8`: Switch emotions
   - `p`: Pat kitty head
   - `b`: Trigger blink
   - `s`: Shake / trigger dizzy
   - `t`: Cycle color themes

---

## 🌐 How to Run the Web Simulator

Simply open `index.html` in any web browser, or launch a local web server:
```bash
npx serve .
# or
python3 -m http.server 8000
```
Open `http://localhost:8000` to preview the interactive simulator!
