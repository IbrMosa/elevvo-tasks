const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const debounce = (fn, ms = 250) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

const recentKey = 'weather_recent_cities_v1';
const cardsEl = el('#cards');
const recentEl = el('#recent');
const suggestionsEl = el('#suggestions');

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(recentKey)) || [];
  } catch { return []; }
}
function saveRecent(list) { localStorage.setItem(recentKey, JSON.stringify(list.slice(0, 8))); }

function chip(label, onClick) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function setRecent(list) {
  if (!recentEl) return; // recent chips section removed
  recentEl.innerHTML = '';
  list.forEach(c => recentEl.appendChild(chip(c.name, () => addCityCard(c))));
}

function addRecent(city) {
  const list = loadRecent();
  const exists = list.find(c => c.id === city.id);
  const next = [city, ...list.filter(c => c.id !== city.id)];
  saveRecent(next);
  setRecent(next);
}

function showSkeleton() {
  const tpl = el('#card-skeleton');
  const node = tpl.content.firstElementChild.cloneNode(true);
  cardsEl.prepend(node);
  return node;
}

function removeNode(node) { node?.parentElement?.removeChild(node); }

function iconUrl(code) {
  // Map a simple set using Open‑Meteo weather codes
  const map = {
    0: '01d', 1: '02d', 2: '03d', 3: '04d',
    45: '50d', 48: '50d',
    51: '09d', 53: '09d', 55: '09d',
    61: '10d', 63: '10d', 65: '10d',
    71: '13d', 73: '13d', 75: '13d',
    80: '09d', 81: '09d', 82: '09d',
    95: '11d', 96: '11d', 99: '11d',
  };
  const k = map[code] || '02d';
  return `https://openweathermap.org/img/wn/${k}@2x.png`;
}

function formatDay(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

async function geocodeCity(q) {
  // Use Open‑Meteo geocoding
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.results?.length) throw new Error('City not found');
  const c = data.results[0];
  return { id: `${c.id}`, name: `${c.name}${c.country ? ', ' + c.country : ''}`.trim(), lat: c.latitude, lon: c.longitude };
}

async function searchCities(q, limit = 6) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map(c => ({
    id: `${c.id}`,
    name: c.name,
    country: c.country || '',
    admin1: c.admin1 || '',
    lat: c.latitude,
    lon: c.longitude
  }));
}

async function reverseGeocode(lat, lon) {
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const c = data.results?.[0];
  if (!c) return null;
  return { id: `${c.id || `${lat},${lon}`}`, name: `${c.name}${c.country ? ', ' + c.country : ''}`.trim(), lat, lon };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto'
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function buildCard(city, wx) {
  const tpl = el('#card-template');
  const node = tpl.content.firstElementChild.cloneNode(true);
  el('.title', node).textContent = city.name;
  const subtitle = city.placeName
    ? `${city.placeName} · ${new Date().toLocaleString()}`
    : new Date().toLocaleString();
  el('.sub', node).textContent = subtitle;

  const c = wx.current;
  el('.icon', node).src = iconUrl(c.weather_code);
  el('.temp', node).textContent = `${Math.round(c.temperature_2m)}°C`;
  el('.humidity', node).textContent = `Humidity: ${c.relative_humidity_2m}%`;
  el('.wind', node).textContent = `Wind: ${Math.round(c.wind_speed_10m)} km/h`;

  const fc = el('.forecast', node);
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'day';
    const date = wx.daily.time[i];
    const code = wx.daily.weather_code[i];
    const hi = wx.daily.temperature_2m_max[i];
    const lo = wx.daily.temperature_2m_min[i];
    d.innerHTML = `
      <div class="d">${formatDay(date)}</div>
      <img alt="" src="${iconUrl(code)}" width="36" height="36" />
      <div>${Math.round(lo)}° / ${Math.round(hi)}°</div>
    `;
    fc.appendChild(d);
  }

  el('.remove', node).addEventListener('click', () => removeNode(node));
  return node;
}

async function addCityCard(city, addToRecent = true) {
  if (addToRecent) addRecent(city);
  const sk = showSkeleton();
  try {
    const wx = await fetchWeather(city.lat, city.lon);
    const card = buildCard(city, wx);
    cardsEl.replaceChild(card, sk);
  } catch (e) {
    console.error(e);
    const err = document.createElement('div');
    err.className = 'card';
    err.textContent = `Failed to load weather for ${city.name}`;
    cardsEl.replaceChild(err, sk);
  }
}

function attachSearch() {
  const form = el('#search-form');
  const input = el('#search-input');
  let activeIndex = -1; // for keyboard navigation

  function hideSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.classList.remove('show');
    suggestionsEl.innerHTML = '';
    activeIndex = -1;
  }

  function renderSuggestions(list) {
    if (!suggestionsEl) return;
    if (!list.length) return hideSuggestions();
    suggestionsEl.innerHTML = '';
    list.forEach((c, idx) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.setAttribute('role', 'option');
      item.innerHTML = `<span class="name">${c.name}${c.country ? ', ' + c.country : ''}</span><span class="subtle">${c.admin1 || ''}</span>`;
      item.addEventListener('mousedown', (e) => { // mousedown to fire before blur
        e.preventDefault();
        hideSuggestions();
        addCityCard({ id: c.id, name: `${c.name}${c.country ? ', ' + c.country : ''}`, lat: c.lat, lon: c.lon });
        input.value = '';
      });
      suggestionsEl.appendChild(item);
    });
    suggestionsEl.classList.add('show');
  }

  const doSuggest = debounce(async (q) => {
    if (!q || q.length < 1) return hideSuggestions();
    try {
      const list = await searchCities(q);
      renderSuggestions(list);
    } catch { hideSuggestions(); }
  }, 200);

  input.addEventListener('input', (e) => {
    doSuggest(e.target.value.trim());
  });

  input.addEventListener('keydown', (e) => {
    if (!suggestionsEl?.classList.contains('show')) return;
    const items = els('.item', suggestionsEl);
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; }
    else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault(); items[activeIndex].dispatchEvent(new Event('mousedown')); return;
      }
    } else if (e.key === 'Escape') { hideSuggestions(); return; }
    items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
  });

  input.addEventListener('blur', () => setTimeout(hideSuggestions, 120));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    try {
      const city = await geocodeCity(q);
      addCityCard(city);
      input.value = '';
      hideSuggestions();
    } catch (err) {
      alert(err.message || 'City not found');
    }
  });
}

function attachGeo() {
  el('#geo-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    const sk = showSkeleton();
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const [wx, place] = await Promise.all([
          fetchWeather(lat, lon),
          reverseGeocode(lat, lon).catch(() => null)
        ]);
        const city = place
          ? { id: `${place.id || `${lat.toFixed(3)},${lon.toFixed(3)}`}`, name: 'My Location', placeName: place.name, lat, lon }
          : { id: `${lat.toFixed(3)},${lon.toFixed(3)}`, name: 'My Location', lat, lon };
        addRecent(city);
        const card = buildCard(city, wx);
        cardsEl.replaceChild(card, sk);
      } catch (e) {
        console.error(e);
        const err = document.createElement('div'); err.className = 'card'; err.textContent = 'Failed to load weather';
        cardsEl.replaceChild(err, sk);
      }
    }, () => {
      const err = document.createElement('div'); err.className = 'card'; err.textContent = 'Location permission denied';
      cardsEl.replaceChild(err, sk);
    });
  });
}

function famousCities() {
  return [
    { id: 'nyc', name: 'New York, US', lat: 40.7128, lon: -74.0060 },
    { id: 'lon', name: 'London, UK', lat: 51.5072, lon: -0.1276 },
    { id: 'par', name: 'Paris, FR', lat: 48.8566, lon: 2.3522 },
    { id: 'ber', name: 'Berlin, DE', lat: 52.5200, lon: 13.4050 },
    { id: 'tok', name: 'Tokyo, JP', lat: 35.6762, lon: 139.6503 },
    { id: 'dub', name: 'Dubai, AE', lat: 25.2048, lon: 55.2708 },
    { id: 'syd', name: 'Sydney, AU', lat: -33.8688, lon: 151.2093 },
    { id: 'ist', name: 'Istanbul, TR', lat: 41.0082, lon: 28.9784 },
    { id: 'mos', name: 'Moscow, RU', lat: 55.7558, lon: 37.6173 }
  ];
}

function preloadFamous() {
  famousCities().forEach(c => addCityCard(c, false));
}

// Init
(function init() {
  setRecent(loadRecent());
  attachSearch();
  attachGeo();
  preloadFamous();
})();
