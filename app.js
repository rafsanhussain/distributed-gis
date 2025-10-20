// Real-time Air Quality & Weather Explorer
// Uses Open-Meteo (free, no API key) and Nominatim for geocoding.
const NOMINATIM_EMAIL = 'rafsan_hussain@yahoo.com';

// --------------------------------------
// Open Streeet Map
// --------------------------------------
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
});

// --------------------------------------
//  ESRI Satellite
// --------------------------------------
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles © Esri'
});

// --------------------------------------
// Topographic Map
// --------------------------------------
const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap'
});

// --------------------------------------
// Grayscale Map (Carto Light)
// --------------------------------------
const gray = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> | © OpenStreetMap contributors'
});

// --------------------------------------
// Map Initialization
// --------------------------------------
const map = L.map('map', {
  center: [52.507259, 13.329013],
  zoom: 13,
  layers: [osm]
});

// --------------------------------------
// Overlay Layers
// --------------------------------------
const animalLayer = L.layerGroup().addTo(map);
const treeLayer = L.layerGroup().addTo(map);

// --------------------------------------
// Layer control
// --------------------------------------
const baseMaps = {
  "OpenStreetMap": osm,
  "Satellite (Esri)": satellite,
  "Topo Map": topo,
  "Gray Map (Carto Light)": gray
};

const overlayMaps = {
  "Animal Sightings": animalLayer,
  "Tree Mapping": treeLayer
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// --------------------------------------
// Marker setup
// --------------------------------------
let marker = L.marker([52.507259, 13.329013]).addTo(map);

function setMarker(lat, lon) {
  if (marker) marker.remove();
  marker = L.marker([lat, lon]).addTo(map);
}

map.on('click', (e)=>{
  const {lat, lng} = e.latlng;
  setMarker(lat, lng);
  fetchAndDisplay(lat, lng);
});


// --------------------------------------
// Load Existing Animals and Trees
// -------------------------------------- 
async function loadExistingData() {
try {

  // --------------------------------------
  // Load animal sightings
  // --------------------------------------
  const aRes = await fetch('animals.json');
  const animals = await aRes.json();
  animals.forEach(a => {
    const m = L.marker([a.lat, a.lon], { icon: L.icon({
      iconUrl: 'https://openmoji.org/data/color/svg/1F98A.svg',
      iconSize: [30, 30],
      iconAnchor: [12, 12]
    })})
    .bindPopup(`<b>🦊 ${a.species}</b><br>${a.note || ''}<br><small>${a.lat.toFixed(4)}, ${a.lon.toFixed(4)}</small>`);
    m.on('mouseover', function () { this.openPopup(); });
    m.on('mouseout', function () { this.closePopup(); });
    m.addTo(animalLayer);
  });

  // --------------------------------------
  // Load tree mapping data
  // --------------------------------------
  const tRes = await fetch('trees.json');
  const trees = await tRes.json();
  trees.forEach(t => {
    const m = L.marker([t.lat, t.lon], { icon: L.icon({
      iconUrl: 'https://openmoji.org/data/color/svg/1F332.svg',
      iconSize: [36, 36],
      iconAnchor: [12, 12]
    })}).bindPopup(`<b>🌳 ${t.species}</b><br>${t.note || ''}<br><small>${t.lat.toFixed(4)}, ${t.lon.toFixed(4)}</small>`);
    m.on('mouseover', function () { this.openPopup(); });
    m.on('mouseout', function () { this.closePopup(); });
    m.addTo(treeLayer);
  });

} catch (err) {
  console.error('Error loading JSON data:', err);
}
}
loadExistingData();


// --------------------------------------
// Geo Location or Find Place
// --------------------------------------
document.getElementById('geocodeBtn').addEventListener('click', async () => {
  const query = document.getElementById('address').value.trim();
  if (!query) {
    alert('Please enter a place name or address.');
    return;
  }

  setStatus('Finding location...');
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}`;
    console.log('Geocode URL:', url); // debug line - remove when working
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      setStatus('Location not found.');
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    map.setView([lat, lon], 12);
    setMarker(lat, lon);
    fetchAndDisplay(lat, lon);
    setStatus(`Found: ${data[0].display_name}`);
  } catch (err) {
    console.error('Geocoding error:', err);
    setStatus('Error finding place. See console for details.');
    alert('Error finding place: ' + err.message);
  }
});


// --------------------------------------
// Weather Data
// --------------------------------------
document.getElementById('useLocationBtn').addEventListener('click', ()=>{
  if(!navigator.geolocation) return alert('Geolocation not supported');
  setStatus('Locating...');
  navigator.geolocation.getCurrentPosition((pos)=>{
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    map.setView([lat, lon], 12);
    setMarker(lat, lon);
    fetchAndDisplay(lat, lon);
  }, (err)=>{ alert('Location error: '+err.message); setStatus(''); });
});

function setStatus(msg){ document.getElementById('status').textContent = msg; }

async function fetchAndDisplay(lat, lon){
setStatus('Fetching data...');
  // Open-Meteo Weather Forecast API (hourly + daily)
  const weatherVars = [
    'temperature_2m','relativehumidity_2m','precipitation','windspeed_10m','winddirection_10m','uv_index'
  ].join(',');
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${weatherVars}&current_weather=true&daily=sunrise,sunset&timezone=auto`;

  // Open-Meteo Air Quality API for PM2.5/PM10 (hourly)
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5&timezone=auto`;

  try{
    const [wRes, aqRes] = await Promise.all([fetch(weatherUrl), fetch(aqUrl)]);
    if(!wRes.ok) throw new Error('Weather fetch failed');
    if(!aqRes.ok) throw new Error('Air quality fetch failed');
    const wJson = await wRes.json();
    const aqJson = await aqRes.json();

    // Current weather
    const current = wJson.current_weather || {};
    const tz = wJson.timezone || '';

    // Hourly arrays
    const hourly = wJson.hourly || {};
    const aq_hourly = aqJson.hourly || {};

    // Use current values when available
    const temp = current.temperature ?? (hourly.temperature_2m ? hourly.temperature_2m[0] : null);
    const windspeed = current.windspeed ?? null;
    const winddir = current.winddirection ?? null;

    // Humidity, precipitation, uv index - pick closest hour (use first hour)
    const timeIndex = 0;

    const humidity = hourly.relativehumidity_2m ? hourly.relativehumidity_2m[timeIndex] : null;
    const precip = hourly.precipitation ? hourly.precipitation[timeIndex] : null;
    const uv = hourly.uv_index ? hourly.uv_index[timeIndex] : null;

    // Sunrise / sunset from daily
    const sunrise = (wJson.daily && wJson.daily.sunrise && wJson.daily.sunrise[0]) || 'N/A';
    const sunset = (wJson.daily && wJson.daily.sunset && wJson.daily.sunset[0]) || 'N/A';

     // Air quality latest hour
    let pm25 = null, pm10 = null;
    if(aq_hourly.pm2_5 && aq_hourly.time){
      // pick last available
      const lastIdx = aq_hourly.time.length - 1;
      pm25 = aq_hourly.pm2_5[lastIdx];
    }
    if(aq_hourly.pm10 && aq_hourly.time){
      const lastIdx = aq_hourly.time.length - 1;
      pm10 = aq_hourly.pm10[lastIdx];
    }

    // Populate UI
    document.getElementById('locationName').textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)} (${tz})`;
    document.getElementById('temp').textContent = temp !== null ? `${temp} °C` : 'N/A';
    document.getElementById('humidity').textContent = humidity !== null ? `${humidity} %` : 'N/A';
    document.getElementById('precip').textContent = precip !== null ? `${precip} mm` : 'N/A';
    document.getElementById('wind').textContent = windspeed !== null ? `${windspeed} m/s (${winddir}°)` : 'N/A';
    document.getElementById('uv').textContent = uv !== null ? `${uv}` : 'N/A';
    document.getElementById('sun').textContent = `${sunrise} / ${sunset}`;
    document.getElementById('aq').textContent = `PM2.5: ${pm25 !== null ? pm25 + ' µg/m³' : 'N/A'} — PM10: ${pm10 !== null ? pm10 + ' µg/m³' : 'N/A'}`;

    setStatus('Updated');
  }catch(err){ console.error(err); setStatus('Data fetch error: '+err.message); }

// --------------------------------------
// Handle Map Click
// --------------------------------------
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  setMarker(lat, lng);
  document.getElementById('latInput').value = lat.toFixed(6);
  document.getElementById('lonInput').value = lng.toFixed(6);
  fetchAndDisplay(lat, lng);
});


// --------------------------------------
// Handle Add Entry
// --------------------------------------
document.getElementById('addBtn').addEventListener('click', async () => {
  const type = document.getElementById('entryType').value;
  const species = document.getElementById('speciesInput').value.trim();
  const note = document.getElementById('noteInput').value.trim();
  const lat = parseFloat(document.getElementById('latInput').value);
  const lon = parseFloat(document.getElementById('lonInput').value);
  const statusEl = document.getElementById('addStatus');

  if (!species || isNaN(lat) || isNaN(lon)) {
    statusEl.textContent = '❌ Please click a map location and enter species.';
    return;
  }

  const entry = { type, species, note, lat, lon };

  try {
    const res = await fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const data = await res.json();
    statusEl.textContent = data.message || '✅ Entry added!';

    // Add marker instantly
    const layer = (type === 'animal') ? animalLayer : treeLayer;
    const iconUrl = type === 'animal'
      ? 'https://openmoji.org/data/color/svg/1F98A.svg'
      : 'https://openmoji.org/data/color/svg/1F332.svg';

    L.marker([lat, lon], {
      icon: L.icon({ iconUrl, iconSize: [24,24], iconAnchor:[12,12] })
    }).bindPopup(`<b>${type === 'animal' ? '🦊' : '🌳'} ${species}</b><br>${note}<br><small>${lat.toFixed(4)}, ${lon.toFixed(4)}</small>`)
    .addTo(layer);
  } catch (err) {
    console.error(err);
    statusEl.textContent = '⚠️ Error saving entry.';
  }
});

}
