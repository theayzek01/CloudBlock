@echo off
title Cloud Block Setup
echo ==========================================
echo        Cloud Block Extension Setup
echo ==========================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js bilgisayarinizda yuklu degil!
    echo Lutfen https://nodejs.org/ adresinden Node.js indirip kurun.
    echo.
    pause
    exit /b
)

echo [OK] Node.js algilandi.
echo.

:: 2. Install dependencies
echo [1/3] Bagimliliklar yukleniyor (npm install)...
cd extension
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [HATA] npm install sirasinda bir sorun olustu!
    pause
    exit /b
)
echo [OK] Bagimliliklar basariyla yuklendi.
echo.

:: 3. Build extension
echo [2/3] Eklenti derleniyor (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [HATA] Eklenti derlenirken bir sorun olustu!
    pause
    exit /b
)
echo [OK] Eklenti basariyla derlendi!
echo.

:: 4. Complete instructions
echo [3/3] Kurulum Tamamlandi!
echo ==========================================
echo Eklenti yuklemeye hazir! Simdi tarayiciniza kurun:
echo.
echo 1. Chrome'da chrome://extensions/ adresine gidin.
echo 2. Sag ustteki "Gelistirici Modu" (Developer Mode) secenegini acin.
echo 3. Sol ustteki "Paketlenmemis oge yukle" (Load unpacked) butonuna basin.
echo 4. Klonladiginiz klasordeki "extension/dist" klasorunu secin.
echo ==========================================
echo.
pause
