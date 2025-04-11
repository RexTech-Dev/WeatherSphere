const API_KEY = ''; // Replace with your OpenWeatherMap API key
let currentUnit = 'metric';
let touchStartX = 0;
let lastSearched = [];

const elements = {
    searchInput: document.getElementById('searchInput'),
    suggestions: document.querySelector('.suggestions'),
    searchLoader: document.querySelector('.search-loader'),
    weatherContent: document.querySelector('.weather-content'),
    errorState: document.querySelector('.error-state'),
    errorMessage: document.querySelector('.error-message'),
    themeButton: document.getElementById('themeButton'),
    successSound: document.getElementById('successSound'),
    locationElement: document.querySelector('.location'),
    conditionElement: document.querySelector('.weather-condition'),
    tempValue: document.querySelector('.temp-value'),
    humidityElement: document.querySelector('.humidity'),
    windSpeedElement: document.querySelector('.wind-speed'),
    weatherIcon: document.querySelector('.weather-icon'),
    unitButtons: document.querySelectorAll('.unit-switcher button'),
    loading: document.querySelector('.loading')
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    getLocation();
    setupEventListeners();
});

function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    document.getElementById('searchForm').addEventListener('submit', handleSearchSubmit);
    elements.themeButton.addEventListener('click', toggleTheme);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    elements.unitButtons.forEach(btn => btn.addEventListener('click', setUnit));
}

async function handleSearchSubmit(e) {
    e.preventDefault();
    const city = elements.searchInput.value.trim();
    if (city) {
        await getWeather(city);
        elements.searchInput.blur();
    }
}

async function getWeather(city) {
    try {
        toggleLoading(true);
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        const data = await handleResponse(response);
        lastSearched.push(data);
        updateUI(data);
        playSuccess();
    } catch (error) {
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        toggleLoading(true);
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
        );
        const data = await handleResponse(response);
        lastSearched.push(data);
        updateUI(data);
        playSuccess();
    } catch (error) {
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
}

function updateUI(data) {
    const isDay = data.dt > data.sys.sunrise && data.dt < data.sys.sunset;
    elements.locationElement.textContent = `${data.name}, ${data.sys.country}`;
    elements.conditionElement.textContent = data.weather[0].main;
    elements.tempValue.textContent = Math.round(data.main.temp);
    elements.humidityElement.textContent = `${data.main.humidity}%`;
    elements.windSpeedElement.textContent = currentUnit === 'metric' ?
        `${data.wind.speed} m/s` : `${(data.wind.speed * 2.237).toFixed(1)} mph`;
    
    elements.weatherIcon.className = `weather-icon wi ${getWeatherIcon(data.weather[0].id)}`;
    updateBackground(data.weather[0].main.toLowerCase(), isDay);
    elements.errorState.style.display = 'none';
    elements.weatherContent.style.display = 'block';
}

function updateBackground(condition, isDay) {
    const gradients = {
        day: {
            clear: ['#83a4d4', '#45b649'],
            rain: ['#2c5364', '#203a43'],
            clouds: ['#778899', '#2c3e50'],
            thunderstorm: ['#616161', '#9bc5c3']
        },
        night: {
            clear: ['#0f0c29', '#302b63'],
            rain: ['#232526', '#414345'],
            clouds: ['#2c3e50', '#000000'],
            thunderstorm: ['#2c3e50', '#1a1a1a']
        }
    };

    const time = isDay ? 'day' : 'night';
    const [color1, color2] = gradients[time][condition] || gradients[time].clear;
    document.body.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
}

function getWeatherIcon(conditionCode) {
    if (conditionCode >= 200 && conditionCode < 300) return 'wi-thunderstorm';
    if (conditionCode >= 300 && conditionCode < 400) return 'wi-sprinkle';
    if (conditionCode >= 500 && conditionCode < 600) return 'wi-rain';
    if (conditionCode >= 600 && conditionCode < 700) return 'wi-snow';
    if (conditionCode >= 700 && conditionCode < 800) return 'wi-fog';
    if (conditionCode === 800) return 'wi-day-sunny';
    if (conditionCode > 800) return 'wi-cloudy';
    return 'wi-day-sunny';
}

function setUnit(e) {
    const unit = e.target.dataset.unit;
    elements.unitButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentUnit = unit;
    if (lastSearched.length > 0) {
        getWeather(lastSearched[lastSearched.length - 1].name);
    }
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            getWeatherByCoords(position.coords.latitude, position.coords.longitude);
        }, () => {
            getWeather('London');
        });
    } else {
        getWeather('London');
    }
}

function toggleLoading(isLoading) {
    elements.loading.style.display = isLoading ? 'block' : 'none';
    elements.weatherContent.style.opacity = isLoading ? '0.3' : '1';
    elements.searchInput.disabled = isLoading;
}

async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch weather data');
    }
    return response.json();
}

function showError(message) {
    elements.errorState.style.display = 'block';
    elements.weatherContent.style.display = 'none';
    elements.errorMessage.textContent = message;
    vibrate();
}

function vibrate() {
    if ('vibrate' in navigator) navigator.vibrate(50);
}

function playSuccess() {
    elements.successSound.currentTime = 0;
    elements.successSound.play();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    const deltaX = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && lastSearched.length > 1) {
            lastSearched.pop();
            getWeather(lastSearched[lastSearched.length - 1].name);
        } else if (deltaX < 0) {
            getWeather(lastSearched[lastSearched.length - 1]?.name);
        }
    }
}

async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (!query) return;

    elements.searchLoader.style.display = 'block';
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
        );
        const data = await response.json();
        showSuggestions(data);
    } catch (error) {
        showError('Failed to fetch suggestions');
    } finally {
        elements.searchLoader.style.display = 'none';
    }
}

function showSuggestions(cities) {
    elements.suggestions.innerHTML = cities.map(city => 
        `<div data-lat="${city.lat}" data-lon="${city.lon}">${city.name}, ${city.country}</div>`
    ).join('');
    elements.suggestions.style.display = cities.length ? 'block' : 'none';
    
    elements.suggestions.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
            elements.searchInput.value = item.textContent;
            elements.suggestions.style.display = 'none';
            getWeatherByCoords(item.dataset.lat, item.dataset.lon);
        });
    });
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}
