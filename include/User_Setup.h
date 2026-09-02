#ifndef USER_SETUP_H
#define USER_SETUP_H

// Setup for Waveshare ESP32-S3-LCD-1.28 / ESP32-S3-Touch-LCD-1.28
#define GC9A01_DRIVER

#define TFT_WIDTH  240
#define TFT_HEIGHT 240

// ESP32-S3 SPI Pin Definitions for Waveshare 1.28" LCD
#define TFT_MOSI 11
#define TFT_SCLK 10
#define TFT_CS    9
#define TFT_DC    8
#define TFT_RST  12
#define TFT_BL   40

#define TFT_BACKLIGHT_ON HIGH

#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_GFXFF
#define SMOOTH_FONT

#define SPI_FREQUENCY  80000000
#define SPI_READ_FREQUENCY 20000000

#endif // USER_SETUP_H
