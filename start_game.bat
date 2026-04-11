@echo off
echo Starting Stopwatch Defence Server...
start "" "http://localhost:8080"
python -m http.server 8080
pause
