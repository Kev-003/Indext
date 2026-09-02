@echo off
setlocal

REM Set up MSVC library paths for Rust build scripts
set "RUST_BIN=%USERPROFILE%\.cargo\bin"
set "TOOLCHAIN=%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-msvc"
set "LIB=%TOOLCHAIN%\lib\rustlib\x86_64-pc-windows-msvc\lib;%ProgramFiles(x86)%\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64;%ProgramFiles(x86)%\Windows Kits\10\Lib\10.0.26100.0\um\x64;%ProgramFiles%\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.51.36231\lib\onecore\x64"

REM Build the WASM module
cd /d "%~dp0"
"%RUST_BIN%\wasm-pack.exe" build --target web %*
