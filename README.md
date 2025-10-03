# weather-dashboard

WeatherDash — (README)

WeatherDash is a single-page, responsive weather dashboard built with plain HTML/CSS/JS. It shows current weather, a 5-day forecast (with chart), a map, favorites, unit toggle (°C/°F) and light/dark themes. This README explains how to run the project locally and how to push & deploy it to GitHub Pages.

Features

Current weather (by browser geolocation or search)

5-day forecast with Chart.js

Leaflet map with marker

Favorites (localStorage)

Unit toggle (°C / °F)

Light (lavender) and dark themes

Optional service-worker for basic caching

Prerequisites

Node is not required. You only need:

A Git client (Git)

VS Code or any editor

Live Server extension (optional for local testing)

An OpenWeatherMap API key (free): https://openweathermap.org

Files you should have

index.html

styles.css

app.js

config.js ← contains your API key

(optional) service-worker.js

README.md

Important: config.js should export the API key like this:

const CONFIG = { OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_API_KEY_HERE' };

Run locally (quick)

Open the project folder in VS Code.

Install Live Server extension (if not installed).

Replace the placeholder in config.js with your OpenWeatherMap API key.

Right-click index.html → Open with Live Server (or open the served URL in your browser).

If Live Server isn't used, you can also open index.html directly in the browser (some features like service-worker require a server).

<img width="1919" height="1079" alt="Screenshot 2025-10-03 234825" src="https://github.com/user-attachments/assets/41b695ec-c901-408b-97ba-272c04756979" />

<img width="1919" height="1079" alt="Screenshot 2025-10-03 234843" src="https://github.com/user-attachments/assets/3e74bd17-04b6-4523-a089-5ee0ebe6403f" />

<img width="1919" height="1079" alt="Screenshot 2025-10-03 234905" src="https://github.com/user-attachments/assets/2d411ff6-22aa-4fde-b02a-2515f9117ebd" />

<img width="1919" height="1079" alt="Screenshot 2025-10-03 234917" src="https://github.com/user-attachments/assets/0a7bcb18-de31-4043-bd50-6670d35364ef" />

<img width="1919" height="1079" alt="Screenshot 2025-10-03 234942" src="https://github.com/user-attachments/assets/e1005749-68ea-4686-8967-f06832f81950" />

<img width="1916" height="1078" alt="Screenshot 2025-10-03 234954" src="https://github.com/user-attachments/assets/59970627-72eb-4b86-8a83-de50ae6954c7" />
