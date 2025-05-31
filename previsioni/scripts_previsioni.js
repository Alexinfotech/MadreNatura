// File: scripts_previsioni.js

document.addEventListener("DOMContentLoaded", function () {
    // --- Riferimenti DOM e Stato Globale ---
    const forecastSearchForm = document.getElementById("forecastSearchForm");
    const citySearchInput = document.getElementById("citySearchInput");
    const geoButton = document.getElementById("geoButton");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const initialForecastsSection = document.getElementById("initialForecasts");
    const initialForecastsGrid = document.getElementById("initialForecastsGrid");
    const searchResultsSection = document.getElementById("searchResults");
    const forecastTypeSelection = document.getElementById("forecastTypeSelection");
    const btn7DayDetail = document.getElementById("btn7DayDetail");
    const btn14DayBasic = document.getElementById("btn14DayBasic");
    let currentSearchLat = null;
    let currentSearchLon = null;
    let currentSearchCityName = "Posizione Corrente";
    let charts = {};
    let zoomedCardElement = null;

    // --- Funzioni Helper ---
    function showSpinner() { loadingSpinner.style.display = 'block'; }
    function hideSpinner() { loadingSpinner.style.display = 'none'; }
    function showElement(el) { if (el) el.style.display = ''; }
    function hideElement(el) { if (el) el.style.display = 'none'; }

    // Funzione icone aggiornata
    function getWeatherIconUrl(weatherCode, isDay = 1) {
        let iconBaseName = "default";
        const code = parseInt(weatherCode, 10);
        const dayNight = (isDay === 1 || isDay === true || isDay === undefined || isDay === null) ? "" : "_notte";

        switch (code) {
            case 0: iconBaseName = `cielo_sereno${dayNight}`; break;
            case 1: iconBaseName = `per_lo_piu_sereno${dayNight}`; break;
            case 2: iconBaseName = `parzialmente_nuvoloso${dayNight}`; break;
            case 3: iconBaseName = `coperto${dayNight}`; break;
            case 45: iconBaseName = `nebbia${dayNight}`; break;
            case 48: iconBaseName = `brina_nebbiosa_depositata${dayNight}`; break;
            case 51: iconBaseName = `pioviggine_leggera${dayNight}`; break;
            case 53: iconBaseName = `pioviggine_moderata${dayNight}`; break;
            case 55: iconBaseName = `pioviggine_densa${dayNight}`; break;
            case 56: iconBaseName = `pioggia_gelida_leggera${dayNight}`; break;
            case 57: iconBaseName = `pioggia_gelida_densa${dayNight}`; break;
            case 61: iconBaseName = `pioggia_debole${dayNight}`; break;
            case 63: iconBaseName = `pioggia_moderata${dayNight}`; break;
            case 65: iconBaseName = `pioggia_forte${dayNight}`; break;
            case 66: iconBaseName = `pioggia_gelata_leggera${dayNight}`; break;
            case 67: iconBaseName = `pioggia_gelata_forte${dayNight}`; break;
            case 71: iconBaseName = `nevicate_lieve${dayNight}`; break;
            case 73: iconBaseName = `nevicate_moderata${dayNight}`; break;
            case 75: iconBaseName = `nevicate_intensa${dayNight}`; break;
            case 77: iconBaseName = `granelli_di_neve${dayNight}`; break;
            case 80: iconBaseName = `rovesci_di_pioggia_lievi${dayNight}`; break;
            case 81: iconBaseName = `rovesci_di_pioggia_moderati${dayNight}`; break;
            case 82: iconBaseName = `rovesci_di_pioggia_violenti${dayNight}`; break;
            case 85: iconBaseName = `nevicate_leggere${dayNight}`; break;
            case 86: iconBaseName = `nevicate_intense${dayNight}`; break;
            case 95: iconBaseName = `temporale_leggero_moderato${dayNight}`; break;
            case 96: iconBaseName = `temporale_con_grandine${dayNight}`; break;
            case 99: iconBaseName = `temporale_con_grandine${dayNight}`; break;
            default: iconBaseName = "default";
        }
        // Percorso corretto
        return `../meteo/icons/${iconBaseName}.svg`;
    }

    function getWeatherDescription(code, descriptionFromPHP) {
        if (descriptionFromPHP && descriptionFromPHP !== 'N/D') { return descriptionFromPHP; }
        const descriptions = { 0: 'Sereno', 1: 'Prev. sereno', 2: 'Parz. nuvoloso', 3: 'Coperto', 45: 'Nebbia', 48: 'Nebbia c/brina', 51: 'Pioviggine L.', 53: 'Pioviggine', 55: 'Pioviggine F.', 56: 'Piov. gelata', 57: 'Piov. gelata F.', 61: 'Pioggia L.', 63: 'Pioggia', 65: 'Pioggia F.', 66: 'Piog. gelata', 67: 'Piog. gelata F.', 71: 'Neve L.', 73: 'Neve', 75: 'Neve F.', 77: 'Grani neve', 80: 'Rovescio L.', 81: 'Rovescio', 82: 'Rovescio viol.', 85: 'Rovescio neve', 86: 'Rov. neve F.', 95: 'Temporale', 96: 'Temp. c/g', 99: 'Temp. c/g', };
        let parsedCode = parseInt(code, 10);
        return descriptions[parsedCode] || 'N/D';
    }
    function formatWindSpeed(speed) { if (typeof speed !== 'number' || isNaN(speed)) return 'N/D'; return `${speed.toFixed(1)} km/h`; }
    function formatWindDirection(degrees) { if (typeof degrees !== 'number' || isNaN(degrees)) return ''; const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; const index = Math.round(((degrees % 360) + 22.5) / 45) % 8; return directions[index]; }
    function formatUVIndex(uv) { if (uv === null || uv === undefined || uv === 'N/D' || typeof uv !== 'number' || isNaN(uv) || uv < 0) return 'N/D'; const val = Math.round(uv); let risk = ''; if (val <= 2) risk = '(Basso)'; else if (val <= 5) risk = '(Moderato)'; else if (val <= 7) risk = '(Alto)'; else if (val <= 10) risk = '(Molto Alto)'; else risk = '(Estremo)'; return `${val} ${risk}`; }
    function formatShortDate(dateString) { try { const date = moment(dateString, "YYYY-MM-DD"); if (!date.isValid()) return dateString; return date.format("ddd DD MMM"); } catch (e) { console.error("Errore formattazione data:", e); return dateString; } }
    function formatTime(dateTimeString) { try { const date = moment(dateTimeString); if (!date.isValid()) return 'N/D'; return date.format("HH:mm"); } catch (e) { console.error("Errore formattazione ora:", e); return 'N/D'; } }
    function showUserMessage(type, message) { console.log(`${type.toUpperCase()}: ${message}`); if (window.AlertsManager?.showMessage) { window.AlertsManager.showMessage(type, message, 6000); } else { alert(`${type === 'error' ? 'Errore: ' : ''}${message}`); } }

    // --- Funzioni Principali ---

    function loadInitialForecasts() {
        showSpinner(); hideElement(searchResultsSection); hideElement(forecastTypeSelection); showElement(initialForecastsSection); initialForecastsGrid.innerHTML = '';
        fetch('previsioni_data.php?mode=initial')
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => { hideSpinner(); if (data.error) { AlertsManager.showMessage('error', `Errore caricamento dati iniziali: ${data.error}`); return; } displayInitialForecasts(data); })
            .catch(error => { hideSpinner(); AlertsManager.showMessage('error', `Errore di rete o caricamento dati iniziali: ${error.message}`); console.error("Fetch initial error:", error); });
    }

    /**
     * Mostra previsioni iniziali in tabella.
     * *** MODIFICATO: Aggiunta descrizione sopra icona ***
     */
    function displayInitialForecasts(forecasts) {
        initialForecastsGrid.innerHTML = '';
        if (!forecasts || forecasts.length === 0) { initialForecastsGrid.innerHTML = '<p class="text-center">Nessun dato iniziale disponibile.</p>'; return; }

        const tableContainer = document.createElement('div'); tableContainer.className = 'table-responsive';
        const table = document.createElement('table'); table.className = 'table table-dark table-striped table-bordered table-hover initial-forecast-table';
        const thead = table.createTHead(); const headerRow = thead.insertRow();
        const thCity = document.createElement('th'); thCity.textContent = 'Città'; headerRow.appendChild(thCity);

        const firstForecastDaily = forecasts.find(f => f.daily && f.daily.time)?.daily;
        const dates = firstForecastDaily ? firstForecastDaily.time.slice(0, 7) : [];
        dates.forEach(dateStr => { const thDay = document.createElement('th'); thDay.innerHTML = formatShortDate(dateStr).replace(' ', '<br>'); headerRow.appendChild(thDay); });

        const tbody = table.createTBody();
        forecasts.forEach(cityForecast => {
            const row = tbody.insertRow(); const cellCity = row.insertCell(); cellCity.className = 'city-name-cell'; cellCity.textContent = cityForecast.city;
            if (cityForecast.error || !cityForecast.daily || !cityForecast.daily.time) { const cellError = row.insertCell(); cellError.colSpan = 7; cellError.textContent = cityForecast.error || 'Dati non disponibili'; cellError.classList.add('text-danger', 'text-center'); }
            else {
                for (let i = 0; i < 7; i++) {
                    const cellDay = row.insertCell(); cellDay.className = 'day-forecast-cell text-center';
                    const weatherCode = cityForecast.daily.weather_code?.[i] ?? 99;
                    const description = getWeatherDescription(weatherCode, cityForecast.daily.description?.[i]); // Get description
                    const iconUrl = getWeatherIconUrl(weatherCode);
                    const tempMax = cityForecast.daily.temperature_2m_max?.[i]; const tempMin = cityForecast.daily.temperature_2m_min?.[i];
                    const windSpeed = cityForecast.daily.wind_speed_10m_max?.[i];
                    const windDirText = cityForecast.daily.wind_direction_dominant_text?.[i] ?? '';
                    const uvMax = cityForecast.daily.uv_index_max?.[i];

                    const tempMaxText = (typeof tempMax === 'number') ? `${tempMax.toFixed(0)}°` : '-'; const tempMinText = (typeof tempMin === 'number') ? `${tempMin.toFixed(0)}°` : '-';
                    const windText = (typeof windSpeed === 'number') ? `<div class="wind-info"><i class="fas fa-wind"></i> ${windSpeed.toFixed(0)} km/h ${windDirText}</div>` : '';
                    const uvText = formatUVIndex(uvMax);
                    const uvHtml = uvText !== 'N/D' ? `<div class="uv-info"><i class="fas fa-sun"></i> ${uvText}</div>` : '';

                    // --- Modifica HTML Cella ---
                    cellDay.innerHTML = `
                        <div class="weather-description-small" style="font-size: 0.8em; line-height: 1; margin-bottom: 2px; color: #ccc;">${description}</div>
                        <img src="${iconUrl}" alt="${description}" class="weather-icon-small d-block mx-auto mb-1" title="${description}">
                        <div class="temp-max">${tempMaxText}</div>
                        <div class="temp-min">${tempMinText}</div>
                        ${windText}
                        ${uvHtml}
                    `;
                    // --- Fine Modifica HTML Cella ---
                }
            }
        });
        tableContainer.appendChild(table); initialForecastsGrid.appendChild(tableContainer);
    }


    function requestAndDisplayForecast(lat, lon, days, detail) {
        if (zoomedCardElement) { zoomedCardElement.classList.remove('card-zoomed'); zoomedCardElement = null; }
        showSpinner();
        hideElement(initialForecastsSection);
        searchResultsSection.innerHTML = '';
        showElement(searchResultsSection);
        showElement(forecastTypeSelection);
        if (days === 7 && detail) { btn7DayDetail.classList.add('active'); btn14DayBasic.classList.remove('active'); }
        else if (days === 14 && !detail) { btn7DayDetail.classList.remove('active'); btn14DayBasic.classList.add('active'); }
        else { btn7DayDetail.classList.remove('active'); btn14DayBasic.classList.remove('active'); }
        const url = `previsioni_data.php?mode=search&lat=${lat}&lon=${lon}&days=${days}&detail=${detail ? 'true' : 'false'}`;
        fetch(url)
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => {
                hideSpinner();
                if (data.error) {
                    AlertsManager.showMessage('error', `Errore previsioni per ${currentSearchCityName}: ${data.error}`);
                    searchResultsSection.innerHTML = `<p class="text-center text-danger">Impossibile caricare le previsioni per ${currentSearchCityName}.</p>`;
                    return;
                }
                Object.values(charts).forEach(chart => chart.destroy()); charts = {};
                if (detail && days === 7) { displayDetailedForecast7Days(data); }
                else if (!detail && days === 14) { displayBasicForecast14Days(data); }
                else { console.warn("Fallback display basic 7 days"); displayBasicForecast(data, 7); }
            })
            .catch(error => {
                hideSpinner();
                AlertsManager.showMessage('error', `Errore di rete o caricamento previsioni per ${currentSearchCityName}: ${error.message}`);
                searchResultsSection.innerHTML = `<p class="text-center text-danger">Errore durante il caricamento.</p>`;
                console.error("Fetch search error:", error);
            });
    }

    /**
     * Mostra previsioni dettagliate 7 giorni (accordion).
     * *** MODIFICATO: Aggiunta descrizione sopra icona nel bottone ***
     */
    function displayDetailedForecast7Days(data) {
        searchResultsSection.innerHTML = `<h2 class="text-center mb-4">Previsioni Dettagliate 7 Giorni - ${currentSearchCityName}</h2>`;
        const accordion = document.createElement('div'); accordion.className = 'accordion accordion-flush'; accordion.id = 'forecastAccordion';
        if (!data.daily || !data.daily.time) { searchResultsSection.innerHTML += '<p class="text-center">Dati giornalieri non disponibili.</p>'; return; }
        data.daily.time.forEach((dateStr, i) => {
            const dayId = `day-${i}`;
            const weatherCode = data.daily.weather_code?.[i] ?? 99;
            const description = data.daily.description?.[i] ?? getWeatherDescription(weatherCode); // Get description
            const iconUrl = getWeatherIconUrl(weatherCode);
            const tempMax = data.daily.temperature_2m_max?.[i]; const tempMin = data.daily.temperature_2m_min?.[i];
            const appTempMax = data.daily.apparent_temperature_max?.[i]; const appTempMin = data.daily.apparent_temperature_min?.[i];
            const precipSum = data.daily.precipitation_sum?.[i]; const precipProb = data.daily.precipitation_probability_max?.[i];
            const windSpeed = data.daily.wind_speed_10m_max?.[i]; const windDirText = data.daily.wind_direction_dominant_text?.[i] ?? '';
            const uvMax = data.daily.uv_index_max?.[i];
            // UV Current logic (fallback to noon if current hour is not available)
            const currentHour = new Date().getHours();
            let uvIndexCurrent = null;
            const hourlyUvIndex = data.hourly?.uv_index;
            if (hourlyUvIndex) {
                const currentHourIndex = i * 24 + currentHour;
                const noonIndex = i * 24 + 12;
                if (hourlyUvIndex.length > currentHourIndex && hourlyUvIndex[currentHourIndex] !== null && !isNaN(hourlyUvIndex[currentHourIndex])) {
                    uvIndexCurrent = hourlyUvIndex[currentHourIndex];
                } else if (hourlyUvIndex.length > noonIndex && hourlyUvIndex[noonIndex] !== null && !isNaN(hourlyUvIndex[noonIndex])) {
                    uvIndexCurrent = hourlyUvIndex[noonIndex]; // Fallback to noon
                }
            }
            const sunrise = data.daily.sunrise?.[i]; const sunset = data.daily.sunset?.[i];
            const formattedDate = formatShortDate(dateStr);
            const tempMaxText = (typeof tempMax === 'number') ? `${tempMax.toFixed(1)}°` : 'N/D';
            const tempMinText = (typeof tempMin === 'number') ? `${tempMin.toFixed(1)}°` : 'N/D';
            const appTempText = (typeof appTempMin === 'number' && typeof appTempMax === 'number') ? ` (${appTempMin.toFixed(0)}°/${appTempMax.toFixed(0)}°)` : '';
            const precipText = (typeof precipSum === 'number') ? `${precipSum.toFixed(1)} mm` : '0 mm';
            const precipProbText = (typeof precipProb === 'number') ? `${precipProb.toFixed(0)}%` : 'N/D';
            const windText = (typeof windSpeed === 'number') ? `${windSpeed.toFixed(1)} km/h ${windDirText}`.trim() : 'N/D';
            const uvMaxText = formatUVIndex(uvMax);
            const uvCurrentText = formatUVIndex(uvIndexCurrent);
            const uvCombinedText = uvCurrentText !== 'N/D' ? `UV: ${uvCurrentText} / Max: ${uvMaxText}` : `UV Max: ${uvMaxText}`;
            const sunriseText = sunrise ? formatTime(sunrise) : 'N/D';
            const sunsetText = sunset ? formatTime(sunset) : 'N/D';
            const accordionItem = document.createElement('div'); accordionItem.className = 'accordion-item forecast-card-detail';

            // --- Modifica HTML Bottone Accordion ---
            accordionItem.innerHTML = `
                <h2 class="accordion-header" id="heading${dayId}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${dayId}" aria-expanded="false" aria-controls="collapse${dayId}">
                        <div class="d-flex w-100 justify-content-between align-items-center flex-wrap">
                            <span class="fw-bold date-col me-2">${formattedDate}</span>
                            <div style="text-align: center; margin: 0 0.8rem; flex-shrink: 0;"> 
                                <div class="weather-description-small" style="font-size: 0.8em; line-height: 1; margin-bottom: 2px; color: #ccc; font-weight: normal;">${description}</div> 
                                <img src="${iconUrl}" alt="${description}" class="weather-icon-small" title="${description}">
                            </div>
                            <span class="temp-col me-2">${tempMinText} / ${tempMaxText} <small class="text-muted">${appTempText}</small></span>
                            <span class="precip-col d-none d-sm-inline me-2"><i class="fas fa-umbrella"></i> ${precipProbText} (${precipText})</span>
                            <span class="wind-col d-none d-lg-inline me-2"><i class="fas fa-wind"></i> ${windText}</span>
                            <span class="uv-col d-none d-md-inline"><i class="fas fa-sun"></i> ${uvCombinedText}</span>
                        </div>
                    </button>
                </h2>
                <div id="collapse${dayId}" class="accordion-collapse collapse" aria-labelledby="heading${dayId}" data-bs-parent="#forecastAccordion">
                    <div class="accordion-body">
                        <div class="row mb-3 text-center small border-bottom pb-2">
                             <div class="col-6 col-sm-3"> <i class="fas fa-sunrise"></i> ${sunriseText}</div>
                             <div class="col-6 col-sm-3"> <i class="fas fa-sunset"></i> ${sunsetText}</div>
                            
                        </div>
                        <p class="text-center mb-1 small text-muted">Previsioni Orarie:</p>
                        <canvas id="chart${dayId}" class="hourly-chart"></canvas>
                    </div>
                </div>`;
            // --- Fine Modifica HTML Bottone Accordion ---

            accordion.appendChild(accordionItem); const collapseElement = accordionItem.querySelector(`#collapse${dayId}`);
            collapseElement.addEventListener('shown.bs.collapse', function () {
                createHourlyChart(dayId, data.hourly, i * 24, (i + 1) * 24);
                if (zoomedCardElement && zoomedCardElement !== accordionItem) { zoomedCardElement.classList.remove('card-zoomed'); }
                accordionItem.classList.add('card-zoomed');
                zoomedCardElement = accordionItem;
            });
            collapseElement.addEventListener('hidden.bs.collapse', function () {
                if (charts[dayId]) { charts[dayId].destroy(); delete charts[dayId]; }
                if (zoomedCardElement === accordionItem) { accordionItem.classList.remove('card-zoomed'); zoomedCardElement = null; }
            });
        });
        searchResultsSection.appendChild(accordion);
    }

    /**
     * Mostra previsioni base 14 giorni (lista).
     * *** MODIFICATO: Aggiunta descrizione sopra icona ***
     */
    function displayBasicForecast14Days(data) {
        searchResultsSection.innerHTML = `<h2 class="text-center mb-4">Previsioni Base 14 Giorni - ${currentSearchCityName}</h2>`;
        const list = document.createElement('ul'); list.className = 'list-group list-group-flush forecast-card-basic';
        if (!data.daily || !data.daily.time) { searchResultsSection.innerHTML += '<p class="text-center">Dati giornalieri non disponibili.</p>'; return; }
        data.daily.time.forEach((dateStr, i) => {
            const weatherCode = data.daily.weather_code?.[i] ?? 99;
            const description = data.daily.description?.[i] ?? getWeatherDescription(weatherCode); // Get description
            const iconUrl = getWeatherIconUrl(weatherCode);
            const tempMax = data.daily.temperature_2m_max?.[i]; const tempMin = data.daily.temperature_2m_min?.[i];
            const windSpeed = data.daily.wind_speed_10m_max?.[i]; const windDirText = data.daily.wind_direction_dominant_text?.[i] ?? '';
            const uvMax = data.daily.uv_index_max?.[i];
            const formattedDate = formatShortDate(dateStr);
            const tempMaxText = (typeof tempMax === 'number') ? `${tempMax.toFixed(0)}°` : 'N/D';
            const tempMinText = (typeof tempMin === 'number') ? `${tempMin.toFixed(0)}°` : 'N/D';
            const windText = (typeof windSpeed === 'number') ? `${windSpeed.toFixed(1)} km/h ${windDirText}`.trim() : 'N/D';
            const uvText = formatUVIndex(uvMax);
            const listItem = document.createElement('li'); listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // --- Modifica HTML Lista ---
            listItem.innerHTML = `
                <span class="fw-bold date-col">${formattedDate}</span>
                <div style="text-align: center; margin: 0 0.8rem; flex-shrink: 0;"> 
                    <div class="weather-description-small" style="font-size: 0.8em; line-height: 1; margin-bottom: 2px; color: #ccc;">${description}</div> 
                    <img src="${iconUrl}" alt="${description}" class="weather-icon-small" title="${description}">
                </div>
                <span class="temp-col"><i class="fas fa-temperature-high text-danger"></i> ${tempMaxText} <i class="fas fa-temperature-low text-primary"></i> ${tempMinText}</span>
                <span class="wind-col d-none d-lg-inline"><i class="fas fa-wind"></i> ${windText}</span>
                <span class="uv-col d-none d-md-inline"><i class="fas fa-sun"></i> ${uvText}</span>`;
            // --- Fine Modifica HTML Lista ---

            list.appendChild(listItem);
        });
        searchResultsSection.appendChild(list);
    }

    /**
     * Mostra previsioni base (fallback, es. 7 giorni).
     * *** MODIFICATO: Aggiunta descrizione sopra icona ***
     */
    function displayBasicForecast(data, numDays) {
        // Nota: Questa funzione è simile a displayBasicForecast14Days, ma usa numDays.
        // searchResultsSection.innerHTML += `<h2 class="text-center mb-4">Previsioni Base ${numDays} Giorni - ${currentSearchCityName}</h2>`; // Titolo opzionale se serve
        const list = document.createElement('ul'); list.className = 'list-group list-group-flush forecast-card-basic';
        if (!data.daily || !data.daily.time) { searchResultsSection.innerHTML += '<p class="text-center">Dati giornalieri non disponibili.</p>'; return; }
        const daysToShow = data.daily.time.slice(0, numDays);
        daysToShow.forEach((dateStr, i) => {
            const weatherCode = data.daily.weather_code?.[i] ?? 99;
            const description = data.daily.description?.[i] ?? getWeatherDescription(weatherCode); // Get description
            const iconUrl = getWeatherIconUrl(weatherCode);
            const tempMax = data.daily.temperature_2m_max?.[i]; const tempMin = data.daily.temperature_2m_min?.[i];
            const windSpeed = data.daily.wind_speed_10m_max?.[i]; const windDirText = data.daily.wind_direction_dominant_text?.[i] ?? '';
            const uvMax = data.daily.uv_index_max?.[i];
            const formattedDate = formatShortDate(dateStr);
            const tempMaxText = (typeof tempMax === 'number') ? `${tempMax.toFixed(0)}°` : 'N/D';
            const tempMinText = (typeof tempMin === 'number') ? `${tempMin.toFixed(0)}°` : 'N/D';
            const windText = (typeof windSpeed === 'number') ? `${windSpeed.toFixed(1)} km/h ${windDirText}`.trim() : 'N/D';
            const uvText = formatUVIndex(uvMax);
            const listItem = document.createElement('li'); listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // --- Modifica HTML Lista (Identica a 14 giorni) ---
            listItem.innerHTML = `
                <span class="fw-bold date-col">${formattedDate}</span>
                 <div style="text-align: center; margin: 0 0.8rem; flex-shrink: 0;"> 
                    <div class="weather-description-small" style="font-size: 0.8em; line-height: 1; margin-bottom: 2px; color: #ccc;">${description}</div> 
                    <img src="${iconUrl}" alt="${description}" class="weather-icon-small" title="${description}">
                </div>
                <span class="temp-col"><i class="fas fa-temperature-high text-danger"></i> ${tempMaxText} <i class="fas fa-temperature-low text-primary"></i> ${tempMinText}</span>
                <span class="wind-col d-none d-lg-inline"><i class="fas fa-wind"></i> ${windText}</span>
                <span class="uv-col d-none d-md-inline"><i class="fas fa-sun"></i> ${uvText}</span>`;
            // --- Fine Modifica HTML Lista ---

            list.appendChild(listItem);
        });
        searchResultsSection.appendChild(list);
    }

    function createHourlyChart(dayId, hourlyData, startIndex, endIndex) {
        const canvasId = `chart${dayId}`;
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement || !hourlyData || !hourlyData.time) return;
        if (charts[dayId]) { charts[dayId].destroy(); }
        const ctx = canvasElement.getContext('2d');
        const timeLabels = hourlyData.time.slice(startIndex, endIndex).map(t => moment(t).valueOf()); // Usa timestamp per Chart.js time scale
        const tempData = hourlyData.temperature_2m.slice(startIndex, endIndex);
        const precipProbData = hourlyData.precipitation_probability.slice(startIndex, endIndex);
        const uvIndexData = hourlyData.uv_index?.slice(startIndex, endIndex) ?? [];
        const datasets = [
            { label: 'Temperatura (°C)', data: tempData.map((val, index) => ({ x: timeLabels[index], y: val })), borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', yAxisID: 'yTemp', tension: 0.1 },
            { label: 'Prob. Precip. (%)', data: precipProbData.map((val, index) => ({ x: timeLabels[index], y: val })), borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'yPrecip', tension: 0.1, stepped: true }
        ];
        if (uvIndexData.length === timeLabels.length && uvIndexData.some(uv => uv !== null && !isNaN(uv))) {
            datasets.push({ label: 'Indice UV', data: uvIndexData.map((val, index) => ({ x: timeLabels[index], y: (val === null || isNaN(val) ? null : val) })), borderColor: 'rgb(255, 205, 86)', backgroundColor: 'rgba(255, 205, 86, 0.5)', yAxisID: 'yUV', tension: 0.1, });
        }
        charts[dayId] = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets }, // Labels sono impliciti nei dati {x,y}
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, },
                scales: {
                    x: {
                        type: 'time', time: { // Parser non serve più con timestamp
                            unit: 'hour', tooltipFormat: 'll HH:mm', displayFormats: { hour: 'HH' }
                        }, ticks: { color: '#ccc' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    yTemp: { type: 'linear', display: true, position: 'left', title: { display: true, text: '°C', color: '#ccc' }, ticks: { color: '#ccc' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    yPrecip: { type: 'linear', display: true, position: 'right', min: 0, max: 100, title: { display: true, text: '% Precip.', color: '#ccc' }, ticks: { color: '#ccc' }, grid: { drawOnChartArea: false } },
                    ...(datasets.find(ds => ds.yAxisID === 'yUV') ? { yUV: { type: 'linear', display: true, position: 'right', min: 0, title: { display: true, text: 'UV Index', color: '#ccc' }, ticks: { color: '#ccc', stepSize: 1 }, grid: { drawOnChartArea: false } } } : {})
                },
                plugins: { legend: { labels: { color: '#ccc' } }, tooltip: { titleFont: { weight: 'bold' } } }
            }
        });
    }

    // --- Event Listeners ---
    forecastSearchForm.addEventListener('submit', function (event) {
        event.preventDefault(); event.stopPropagation();
        if (!forecastSearchForm.checkValidity()) { forecastSearchForm.classList.add('was-validated'); return; }
        forecastSearchForm.classList.remove('was-validated');
        const city = citySearchInput.value.trim();
        if (!city) { AlertsManager.showMessage('warning', 'Inserisci un nome di città.'); return; }
        showSpinner();
        fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`)
            .then(res => { if (!res.ok) throw new Error("Errore Nominatim"); return res.json(); })
            .then(data => {
                if (!data || data.length === 0) { hideSpinner(); AlertsManager.showMessage('warning', `Città "${city}" non trovata.`); return; }
                currentSearchLat = parseFloat(data[0].lat); currentSearchLon = parseFloat(data[0].lon);
                currentSearchCityName = data[0].display_name.split(',')[0]; citySearchInput.value = currentSearchCityName;
                requestAndDisplayForecast(currentSearchLat, currentSearchLon, 7, true); // Default to 7-day detailed on new search
            })
            .catch(err => { hideSpinner(); AlertsManager.showMessage('error', `Errore ricerca città: ${err.message}`); console.error("Geocoding error:", err); });
    });
    geoButton.addEventListener('click', function () {
        if (!navigator.geolocation) { AlertsManager.showMessage("warning", "Geolocalizzazione non supportata."); return; }
        showSpinner();
        navigator.geolocation.getCurrentPosition((pos) => {
            currentSearchLat = pos.coords.latitude; currentSearchLon = pos.coords.longitude;
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentSearchLat}&lon=${currentSearchLon}&zoom=10&addressdetails=1`)
                .then(res => res.json()).then(data => { currentSearchCityName = data?.address?.city || data?.address?.town || data?.address?.village || "Posizione Corrente"; citySearchInput.value = currentSearchCityName; })
                .catch(err => { console.warn("Reverse geocoding failed:", err); citySearchInput.value = "Posizione Corrente"; })
                .finally(() => { requestAndDisplayForecast(currentSearchLat, currentSearchLon, 7, true); }); // Default to 7-day detailed on geo
        }, (err) => {
            hideSpinner(); AlertsManager.showMessage("error", `Errore geolocalizzazione: ${err.message}`); console.error("Geolocation error:", err);
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    });
    btn7DayDetail.addEventListener('click', () => { if (currentSearchLat && currentSearchLon) { requestAndDisplayForecast(currentSearchLat, currentSearchLon, 7, true); } });
    btn14DayBasic.addEventListener('click', () => { if (currentSearchLat && currentSearchLon) { requestAndDisplayForecast(currentSearchLat, currentSearchLon, 14, false); } });
    searchResultsSection.addEventListener('click', function (event) {
        const button = event.target.closest('.accordion-button');
        if (button) {
            const item = button.closest('.accordion-item');
            if (!item) return;
            const isAlreadyZoomed = item.classList.contains('card-zoomed');
            // Remove zoom from previously zoomed card if it exists and is not the current one
            if (zoomedCardElement && zoomedCardElement !== item) {
                zoomedCardElement.classList.remove('card-zoomed');
            }
            // Toggle zoom on the clicked item only if it's being expanded (or manually clicked again)
            if (isAlreadyZoomed) { // If it was already zoomed, remove zoom
                item.classList.remove('card-zoomed');
                zoomedCardElement = null;
            } else { // If it was not zoomed (or a different one was), add zoom
                if (!item.classList.contains('card-zoomed')) { // Check again before adding
                    item.classList.add('card-zoomed');
                    zoomedCardElement = item;
                }
            }
        }
    });
    // Click outside listener to remove zoom
    document.addEventListener('click', function (event) {
        if (zoomedCardElement && !event.target.closest('.accordion-item.card-zoomed')) {
            zoomedCardElement.classList.remove('card-zoomed');
            zoomedCardElement = null;
        }
    });

    // --- Caricamento Iniziale ---
    loadInitialForecasts();

});