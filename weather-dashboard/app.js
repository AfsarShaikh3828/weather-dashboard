/* app.js - main app logic for the Lavender WeatherDash
   Requires: config.js (CONFIG.OPENWEATHER_API_KEY), Leaflet, Chart.js
*/

const apiKey = (typeof CONFIG !== 'undefined') ? CONFIG.OPENWEATHER_API_KEY : '';

/* DOM */
const searchInput = document.getElementById('searchInput');
const suggestionsEl = document.getElementById('suggestions');
const locBtn = document.getElementById('locBtn');
const unitToggle = document.getElementById('unitToggle');
const unitLabel = document.querySelector('.unitLabel');
const currentCard = document.getElementById('currentCard');
const forecastList = document.getElementById('forecastList');
const favoritesList = document.getElementById('favoritesList');
const detailsList = document.getElementById('detailsList');
const mapEl = document.getElementById('map');
const themeBtn = document.getElementById('themeBtn');
const forecastCanvas = document.getElementById('forecastChart');

let map, marker, chartInstance;
let favorites = JSON.parse(localStorage.getItem('wd_favs') || '[]');

/* persisted state */
let currentUnit = localStorage.getItem('wd_unit') || 'metric';
let theme = localStorage.getItem('wd_theme') || 'light'; // default light lavender look

// apply initial UI
document.documentElement.classList.toggle('dark', theme === 'dark');
unitToggle.checked = currentUnit === 'imperial';
unitLabel.textContent = currentUnit === 'imperial' ? '°F' : '°C';
updateThemeButtonIcon();

/* utils */
function debounce(fn, wait = 300){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}
function showSuggestions(items){
  suggestionsEl.innerHTML = '';
  if (!items || items.length === 0){ suggestionsEl.style.display = 'none'; return; }
  for (const place of items){
    const div = document.createElement('div');
    div.className = 'item';
    div.tabIndex = 0;
    div.textContent = `${place.name}${place.state ? ', '+place.state : ''} • ${place.country}`;
    div.addEventListener('click', ()=> {
      suggestionsEl.style.display = 'none';
      searchInput.value = `${place.name}${place.state ? ', '+place.state : ''}`;
      loadWeather(place.lat, place.lon, place.name);
    });
    suggestionsEl.appendChild(div);
  }
  suggestionsEl.style.display = 'block';
}

/* Map */
function initMap(){
  if (map) return;
  map = L.map('map', {zoomControl:false}).setView([20.5937,78.9629], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap' }).addTo(map);
  marker = L.marker([20.5937,78.9629]).addTo(map);
}
function updateMap(lat, lon, label){
  try {
    if (!map) initMap();
    map.setView([lat, lon], 10, {animate:true});
    if (!marker) marker = L.marker([lat, lon]).addTo(map);
    else marker.setLatLng([lat, lon]);
    marker.bindPopup(label || 'Location').openPopup();
  } catch(e){ console.warn('Map update error', e); }
}

/* Fetch helpers */
async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function geocode(q){
  return fetchJSON(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${apiKey}`);
}
async function fetchCurrent(lat, lon){
  return fetchJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);
}
async function fetchForecast(lat, lon){
  return fetchJSON(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);
}

/* Renderers */
function renderCurrent(data){
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  currentCard.innerHTML = `
    <div class="current-row">
      <div>
        <div class="current-temp">${Math.round(data.main.temp)}°${currentUnit==='metric'?'C':'F'}</div>
        <div class="current-desc">${data.name} · ${capitalize(data.weather[0].description)}</div>
        <div style="color:var(--muted);margin-top:6px">Feels like ${Math.round(data.main.feels_like)}° • Humidity ${data.main.humidity}% • Wind ${Math.round(data.wind.speed)} ${currentUnit==='metric'?'m/s':'mph'}</div>
      </div>
      <div style="margin-left:auto;text-align:center">
        <img src="${iconUrl}" alt="${data.weather[0].description}" width="84" height="84" />
        <div style="margin-top:6px">
          <button id="favBtn" class="control-btn">${isFavorite(data.name)?'★':'☆'} Favorite</button>
        </div>
      </div>
    </div>
  `;
  // animate
  currentCard.classList.remove('fade-in'); void currentCard.offsetWidth; currentCard.classList.add('fade-in');

  document.getElementById('favBtn').addEventListener('click', ()=>{
    toggleFavorite({name: data.name, lat: data.coord.lat, lon: data.coord.lon});
  });
}

function renderDetails(data){
  detailsList.innerHTML = `
    <li>Pressure: ${data.main.pressure} hPa</li>
    <li>Visibility: ${Math.round((data.visibility||0)/1000)} km</li>
    <li>Sunrise: ${new Date(data.sys.sunrise*1000).toLocaleTimeString()}</li>
    <li>Sunset: ${new Date(data.sys.sunset*1000).toLocaleTimeString()}</li>
  `;
}

function renderForecast(days){
  forecastList.innerHTML = '';
  for (const d of days){
    const el = document.createElement('div');
    el.className = 'forecast-item';
    const short = new Date(d.date).toLocaleDateString(undefined,{weekday:'short', day:'numeric'});
    el.innerHTML = `<div style="font-weight:700">${short}</div><img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.desc}"/><div style="margin-top:6px">${Math.round(d.avgTemp)}°</div>`;
    forecastList.appendChild(el);
  }
}

function drawChart(days){
  const labels = days.map(d=> new Date(d.date).toLocaleDateString(undefined,{weekday:'short'}));
  const data = days.map(d=> Math.round(d.avgTemp));
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(forecastCanvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: `Temp (${currentUnit==='metric'?'°C':'°F'})`, data, fill:true, tension:0.3, borderWidth:2 }]},
    options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}} }
  });
}

/* forecast grouping */
function groupForecastToDays(forecastData){
  const byDay = {};
  for (const item of forecastData.list){
    const key = new Date(item.dt*1000).toISOString().slice(0,10);
    (byDay[key] = byDay[key]||[]).push(item);
  }
  return Object.keys(byDay).slice(0,6).map(key=>{
    const items = byDay[key];
    const temps = items.map(i=>i.main.temp);
    const avg = temps.reduce((a,b)=>a+b,0)/temps.length;
    const midday = items.reduce((p,c)=> Math.abs(new Date(c.dt*1000).getHours()-12) < Math.abs(new Date(p.dt*1000).getHours()-12) ? c : p, items[0]);
    return {date:key, avgTemp:avg, icon:midday.weather[0].icon, desc:midday.weather[0].description};
  });
}

/* favorites */
function isFavorite(name){ return favorites.some(f=>f.name===name); }
function saveFavorites(){ localStorage.setItem('wd_favs', JSON.stringify(favorites)); }
function renderFavorites(){
  favoritesList.innerHTML = '';
  if (favorites.length===0){ favoritesList.innerHTML = '<li style="color:var(--muted)">No favorites yet</li>'; return; }
  for (const f of favorites){
    const li = document.createElement('li');
    li.textContent = f.name;
    li.addEventListener('click', ()=> loadWeather(f.lat, f.lon, f.name));
    favoritesList.appendChild(li);
  }
}
function toggleFavorite(obj){
  if (isFavorite(obj.name)) favorites = favorites.filter(f=>f.name!==obj.name);
  else favorites.push(obj);
  saveFavorites();
  renderFavorites();
  const btn = document.getElementById('favBtn'); if (btn) btn.textContent = `${isFavorite(obj.name)?'★':'☆'} Favorite`;
}

/* helpers */
function capitalize(s){ return s.replace(/\b\w/g,c=>c.toUpperCase()); }
async function fetchJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error(`${r.status}`); return r.json(); }

/* API wrappers */
async function geocode(q){ return fetchJSON(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${apiKey}`); }
async function fetchCurrent(lat,lon){ return fetchJSON(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`); }
async function fetchForecast(lat,lon){ return fetchJSON(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`); }

/* main loader */
async function loadWeather(lat, lon, label){
  try {
    currentCard.innerHTML = `<div class="placeholder">Loading weather…</div>`;
    const [cur, fc] = await Promise.all([ fetchCurrent(lat, lon), fetchForecast(lat, lon) ]);
    renderCurrent(cur);
    renderDetails(cur);
    updateMap(lat, lon, label || cur.name);
    const days = groupForecastToDays(fc);
    renderForecast(days);
    drawChart(days);
  } catch(e){
    console.error(e);
    currentCard.innerHTML = `<div class="placeholder">Could not load weather. Try again.</div>`;
  }
}

/* search */
const doSearch = debounce(async (val)=>{
  if (!val || val.length < 2){ suggestionsEl.style.display = 'none'; return; }
  try{ const res = await geocode(val); showSuggestions(res); } catch(e){ suggestionsEl.style.display = 'none'; }
}, 350);

searchInput.addEventListener('input', e=> doSearch(e.target.value));
document.addEventListener('click', e=> { if (!suggestionsEl.contains(e.target) && e.target !== searchInput) suggestionsEl.style.display = 'none'; });

locBtn.addEventListener('click', ()=>{
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your location');
  }, err => alert('Could not get location: '+err.message));
});

/* unit toggle */
unitToggle.addEventListener('change', ()=>{
  currentUnit = unitToggle.checked ? 'imperial' : 'metric';
  unitLabel.textContent = currentUnit==='imperial' ? '°F' : '°C';
  localStorage.setItem('wd_unit', currentUnit);
  // reload using current map center or fallback
  if (marker && marker.getLatLng){ const {lat,lng}=marker.getLatLng(); loadWeather(lat,lng); }
  else loadWeather(28.7041,77.1025,'New Delhi');
});

/* theme button */
themeBtn.addEventListener('click', ()=>{
  theme = (theme === 'dark') ? 'light' : 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('wd_theme', theme);
  updateThemeButtonIcon();
});
function updateThemeButtonIcon(){ themeBtn.textContent = (theme==='dark') ? '🌙' : '🌞'; }

/* init */
function init(){
  renderFavorites();
  initMap();
  // try geolocation
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your location'),
      ()=> {
        if (favorites[0]) loadWeather(favorites[0].lat, favorites[0].lon, favorites[0].name);
        else loadWeather(28.7041,77.1025,'New Delhi');
      }, {timeout:5000});
  } else {
    if (favorites[0]) loadWeather(favorites[0].lat, favorites[0].lon, favorites[0].name);
    else loadWeather(28.7041,77.1025,'New Delhi');
  }
  // register service worker optional
  if ('serviceWorker' in navigator) navigator.serviceWorker?.register('/service-worker.js').catch(()=>{});
}
init();
