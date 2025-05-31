document.addEventListener("DOMContentLoaded", function () {
    // --- Riferimenti DOM ---
    const airQualitySearchForm = document.getElementById("airQualitySearchForm");
    const citySearchInput = document.getElementById("citySearchInput");
    const geoButton = document.getElementById("geoButton");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const searchResultsSection = document.getElementById("airQualityResults"); // Contenitore principale risultati
    const detailLevelSelect = document.getElementById("detailLevelSelect");
    const mapContainer = document.getElementById("map"); // DIV che contiene la mappa
    const mapLegend = document.getElementById("mapLegend");

    // --- Stato Applicazione ---
    let currentSearchLat = null; let currentSearchLon = null; let currentSearchCityName = null;
    let airQualityChart = null; let map = null; let locationMarker = null; let locationCircle = null;
    let currentApiData = null;

    // --- Inizializzazione Mappa ---
    function initializeMap() {
        map = L.map("map", { center: [42.5, 12.5], zoom: 5.5, /* Zoom leggermente diverso */ zoomControl: true, scrollWheelZoom: true /* Riabilita zoom scroll */ });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors' }).addTo(map);
        // Rimosso listener doppio click per zoom
        displayMapLegend();
    }

    // --- Funzioni Helper ---
    function showSpinner() { loadingSpinner.style.display = 'block'; }
    function hideSpinner() { loadingSpinner.style.display = 'none'; }
    function showElement(el) { if (el) el.classList.add('visible'); } // Usa classe per transizione
    function hideElement(el) { if (el) el.classList.remove('visible'); } // Usa classe per transizione
    function showUserMessage(type, message) { console.log(`${type.toUpperCase()}: ${message}`); if (window.AlertsManager?.showMessage) { window.AlertsManager.showMessage(type, message, 6000); } else { alert(`${type === 'error' ? 'Errore: ' : ''}${message}`); } }
    function formatTime(dateTimeString) { try { const date = moment(dateTimeString); return date.isValid() ? date.format("HH:mm") : 'N/D'; } catch (e) { return 'N/D'; } }
    const aqiLevels = [{ limit: 20, color: '#50f0e6', text: 'Buona', textColor: '#333' }, { limit: 40, color: '#50ccaa', text: 'Discreta', textColor: '#333' }, { limit: 60, color: '#f0e641', text: 'Moderata', textColor: '#333' }, { limit: 80, color: '#ff8c1a', text: 'Scadente', textColor: '#333' }, { limit: 100, color: '#ff5050', text: 'Pessima', textColor: '#fff' }, { limit: 150, color: '#960032', text: 'Molto Pessima', textColor: '#fff' }, { limit: Infinity, color: '#732600', text: 'Estrema', textColor: '#fff' }];
    function getAqiStyle(aqi) { if (aqi === null || aqi === undefined || !isFinite(aqi)) return { color: '#9e9e9e', text: 'N/D', textColor: '#333' }; const level = aqiLevels.find(level => aqi <= level.limit); return level || aqiLevels[aqiLevels.length - 1]; } // Ritorna l'ultimo livello se > 150
    function getAqiDescription(aqi) { return getAqiStyle(aqi).text; }
    const pollutantLabels = { pm10: { label: "PM10", unit: "µg/m³" }, pm2_5: { label: "PM2.5", unit: "µg/m³" }, carbon_monoxide: { label: "CO", unit: "µg/m³" }, nitrogen_dioxide: { label: "NO₂", unit: "µg/m³" }, sulphur_dioxide: { label: "SO₂", unit: "µg/m³" }, ozone: { label: "O₃", unit: "µg/m³" }, aerosol_optical_depth: { label: "AOD", unit: "" }, dust: { label: "Polveri (>10µm)", unit: "µg/m³" }, uv_index: { label: "UV Index", unit: "" }, ammonia: { label: "NH₃", unit: "µg/m³" }, alder_pollen: { label: "P. Ontano", unit: "gr/m³" }, birch_pollen: { label: "P. Betulla", unit: "gr/m³" }, grass_pollen: { label: "P. Gramin.", unit: "gr/m³" }, mugwort_pollen: { label: "P. Artemisia", unit: "gr/m³" }, olive_pollen: { label: "P. Olivo", unit: "gr/m³" }, ragweed_pollen: { label: "P. Ambrosia", unit: "gr/m³" }, european_aqi: { label: "AQI (EU)", unit: "" }, us_aqi: { label: "AQI (US)", unit: "" } };
    function formatValue(value, decimals = 1) { return (value !== null && isFinite(value)) ? value.toFixed(decimals) : '-'; } // Helper per formattare numeri o '-'

    // --- Funzioni Principali ---

    function getAndDisplayAirQuality(lat, lon, detailLevel) {
        showSpinner();
        hideElement(searchResultsSection); // Nasconde la sezione risultati all'inizio
        searchResultsSection.innerHTML = ''; // Pulisce contenuto precedente
        if (airQualityChart) { airQualityChart.destroy(); airQualityChart = null; }

        const url = `qualita_aria_data.php?lat=${lat}&lon=${lon}&detail=${detailLevel}`;

        fetch(url)
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => {
                hideSpinner();
                if (data.error) {
                    AlertsManager.showMessage('error', `Errore dati AQ per ${currentSearchCityName || 'la posizione selezionata'}: ${data.error}`);
                    searchResultsSection.innerHTML = `<div class="alert alert-danger text-center">Impossibile caricare i dati. ${data.error}</div>`; // Mostra errore dentro la sezione
                    showElement(searchResultsSection); // Mostra sezione per visualizzare l'errore
                    if (locationMarker) { map.removeLayer(locationMarker); locationMarker = null; }
                    if (locationCircle) { map.removeLayer(locationCircle); locationCircle = null; }
                    currentApiData = null; return;
                }
                currentApiData = data;
                updateMapMarkerAndCircle(lat, lon, data.current);
                displayAirQualityResults(data);
                showElement(searchResultsSection); // Mostra la sezione risultati popolata
            })
            .catch(error => {
                hideSpinner(); AlertsManager.showMessage('error', `Errore di rete o caricamento dati: ${error.message}`);
                searchResultsSection.innerHTML = `<div class="alert alert-danger text-center">Errore durante il caricamento: ${error.message}</div>`;
                showElement(searchResultsSection);
                if (locationMarker) { map.removeLayer(locationMarker); locationMarker = null; }
                if (locationCircle) { map.removeLayer(locationCircle); locationCircle = null; }
                currentApiData = null; console.error("Fetch Air Quality error:", error);
            });
    }

    function updateMapMarkerAndCircle(lat, lon, currentData) {
        if (!map) return;
        const aqiValue = currentData?.european_aqi ?? null;
        const style = getAqiStyle(aqiValue);
        const aqiText = style.text;

        let popupContent = `<b>${currentSearchCityName || 'Posizione Selezionata'}</b><br>`;
        if (currentData?.time) { popupContent += `<small>Ora: ${formatTime(currentData.time)}</small><br>`; }
        popupContent += `Indice AQI: <b style="color:${style.textColor}; background-color: ${style.color}; padding: 1px 4px; border-radius: 3px;">${aqiText}</b> (${aqiValue ?? 'N/D'})<hr class="my-1">`;
        popupContent += `PM2.5: <b>${formatValue(currentData?.pm2_5)}</b> µg/m³<br>`;
        popupContent += `PM10: <b>${formatValue(currentData?.pm10)}</b> µg/m³<br>`;
        popupContent += `O₃: <b>${formatValue(currentData?.ozone)}</b> µg/m³<br>`;
        popupContent += `NO₂: <b>${formatValue(currentData?.nitrogen_dioxide)}</b> µg/m³`;

        const markerOptions = { radius: 6, fillColor: "#1a1a1a", color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.9 };
        if (locationMarker) { locationMarker.setLatLng([lat, lon]).setPopupContent(popupContent); }
        else { locationMarker = L.circleMarker([lat, lon], markerOptions).addTo(map).bindPopup(popupContent); }

        const circleRadius = 15000; // Raggio aumentato a 15km
        const circleOptions = { className: 'aqi-circle-overlay', color: style.color, fillColor: style.color, fillOpacity: 0.35, weight: 1, interactive: true };
        if (locationCircle) { locationCircle.setLatLng([lat, lon]).setRadius(circleRadius).setStyle(circleOptions); }
        else { locationCircle = L.circle([lat, lon], circleRadius, circleOptions).addTo(map); }
        locationCircle.off('click').on('click', () => { if (locationMarker) locationMarker.openPopup(); });

        locationMarker.openPopup();
        map.setView([lat, lon], 10); // Zoom
    }

    // Mostra i risultati (Highlights + Tabella + Grafico)
    function displayAirQualityResults(data) {
        searchResultsSection.innerHTML = ''; // Pulisce prima di aggiungere nuovo contenuto

        // 1. Sezione Highlights Dati Attuali
        displayCurrentHighlights(data.current);

        // 2. Tabella Dati Orari
        if (data.hourly && data.hourly.time) {
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-responsive aq-table-container my-4';
            const table = document.createElement('table');
            table.className = 'table table-dark table-striped table-sm hourly-aq-table';
            const thead = table.createTHead(); const headerRow = thead.insertRow();
            const thTime = document.createElement('th'); thTime.textContent = 'Ora'; headerRow.appendChild(thTime);
            const availableParams = Object.keys(data.hourly).filter(key => key !== 'time');
            availableParams.forEach(paramKey => { const labelInfo = pollutantLabels[paramKey] || { label: paramKey.replace(/_/g, ' ').toUpperCase(), unit: '' }; const th = document.createElement('th'); th.innerHTML = `${labelInfo.label}${labelInfo.unit ? `<br><small>(${labelInfo.unit})</small>` : ''}`; headerRow.appendChild(th); });

            const tbody = table.createTBody();
            const hoursToShow = data.hourly.time.length;
            for (let i = 0; i < hoursToShow; i++) {
                const row = tbody.insertRow();
                const cellTime = row.insertCell(); cellTime.textContent = moment(data.hourly.time[i]).format("DD/MM HH:mm"); cellTime.style.whiteSpace = 'nowrap';
                availableParams.forEach(paramKey => {
                    const cell = row.insertCell(); const value = data.hourly[paramKey]?.[i];
                    if (paramKey === 'european_aqi' || paramKey === 'us_aqi') { const aqiVal = (value !== null && isFinite(value)) ? Math.round(value) : null; const style = getAqiStyle(aqiVal); cell.textContent = aqiVal ?? '-'; cell.style.backgroundColor = style.color; cell.style.color = style.textColor; cell.title = style.text; }
                    else if (paramKey === 'uv_index') { cell.textContent = (value !== null && isFinite(value)) ? value.toFixed(1) : '-'; }
                    else if (paramKey.includes('pollen')) { cell.textContent = (value !== null && isFinite(value)) ? Math.round(value) : '-'; }
                    else { cell.textContent = formatValue(value); } // Usa helper formatValue
                    cell.classList.add('text-center');
                });
            }
            tableContainer.appendChild(table); searchResultsSection.appendChild(tableContainer);
        } else { searchResultsSection.innerHTML += '<p class="text-center text-warning mt-4">Dati orari dettagliati non disponibili.</p>'; }

        // 3. Grafico Orario
        if (data.hourly && data.hourly.time) {
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container p-3 rounded mt-4';
            chartContainer.innerHTML = `<h4 class="text-center mb-3">Andamento Orario Inquinanti</h4><canvas id="airQualityChart"></canvas>`;
            searchResultsSection.appendChild(chartContainer);
            createAirQualityChart(data.hourly);
        }
    }

    // Mostra Highlights Attuali
    function displayCurrentHighlights(currentData) {
        const highlightsDiv = document.createElement('div');
        highlightsDiv.id = 'currentAQIHighlights'; highlightsDiv.className = 'current-highlights-box p-3 rounded mb-4 text-center';
        if (!currentData || !currentData.time) { highlightsDiv.innerHTML = '<p class="text-warning">Dati attuali non disponibili.</p>'; }
        else {
            const aqiValue = currentData?.european_aqi ?? null; const style = getAqiStyle(aqiValue); const aqiText = style.text;
            highlightsDiv.innerHTML = `
                <h3 class="highlight-title mb-3">Condizioni Attuali (${formatTime(currentData.time)}) - ${currentSearchCityName || 'Posizione Selezionata'}</h3>
                <div class="row align-items-center justify-content-center">
                    <div class="col-md-5 col-lg-4 mb-3 mb-md-0">
                        <div class="aqi-display-lg">
                            <span class="aqi-label">Indice Qualità Aria (EU)</span>
                            <div class="aqi-value-box" style="background-color: ${style.color}; color: ${style.textColor};">
                                ${aqiValue ?? 'N/D'}
                            </div>
                            <div class="aqi-desc">${aqiText}</div>
                        </div>
                    </div>
                    <div class="col-md-7 col-lg-6">
                        <div class="pollutant-grid-highlights">
                            <div><span class="pollutant-label">PM2.5:</span> <strong class="pollutant-value">${formatValue(currentData?.pm2_5)}</strong> <small>µg/m³</small></div>
                            <div><span class="pollutant-label">PM10:</span> <strong class="pollutant-value">${formatValue(currentData?.pm10)}</strong> <small>µg/m³</small></div>
                            <div><span class="pollutant-label">Ozono (O₃):</span> <strong class="pollutant-value">${formatValue(currentData?.ozone)}</strong> <small>µg/m³</small></div>
                            <div><span class="pollutant-label">Diossido Azoto (NO₂):</span> <strong class="pollutant-value">${formatValue(currentData?.nitrogen_dioxide)}</strong> <small>µg/m³</small></div>
                            ${currentData?.carbon_monoxide !== undefined ? `<div><span class="pollutant-label">CO:</span> <strong class="pollutant-value">${formatValue(currentData.carbon_monoxide)}</strong> <small>µg/m³</small></div>` : ''}
                            ${currentData?.sulphur_dioxide !== undefined ? `<div><span class="pollutant-label">SO₂:</span> <strong class="pollutant-value">${formatValue(currentData.sulphur_dioxide)}</strong> <small>µg/m³</small></div>` : ''}
                        </div>
                    </div>
                </div>`;
        }
        searchResultsSection.prepend(highlightsDiv); // Aggiunge all'inizio
    }

    // Crea/Aggiorna grafico AQ
    function createAirQualityChart(hourlyData) {
        const canvasId = 'airQualityChart'; const canvasElement = document.getElementById(canvasId); if (!canvasElement || !hourlyData || !hourlyData.time) { if (canvasElement) canvasElement.parentElement.remove(); return; }
        const hoursToShow = hourlyData.time.length; const timeLabels = hourlyData.time.slice(0, hoursToShow);
        if (airQualityChart) { airQualityChart.destroy(); } const ctx = canvasElement.getContext('2d'); const datasets = [];
        const availableColors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)', 'rgb(201, 203, 207)']; let colorIndex = 0;
        const paramsToPlot = ['pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'carbon_monoxide', 'sulphur_dioxide', 'uv_index']; // Principali + UV
        paramsToPlot.forEach(paramKey => { if (hourlyData[paramKey] && hourlyData[paramKey].length === timeLabels.length && hourlyData[paramKey].some(v => v !== null && !isNaN(v))) { const labelInfo = pollutantLabels[paramKey] || { label: paramKey, unit: '' }; const yAxisID = (paramKey === 'uv_index') ? 'yUV' : 'yPollutant'; datasets.push({ label: `${labelInfo.label}${labelInfo.unit ? ' (' + labelInfo.unit + ')' : ''}`, data: hourlyData[paramKey].map(v => (v === null || isNaN(v) ? null : v)), borderColor: availableColors[colorIndex % availableColors.length], backgroundColor: 'transparent', yAxisID: yAxisID, tension: 0.2, pointRadius: 0, borderWidth: 1.5 }); colorIndex++; } });
        if (datasets.length === 0) { console.warn("Nessun dato valido per grafico AQ."); canvasElement.parentElement.remove(); return; }
        airQualityChart = new Chart(ctx, { type: 'line', data: { labels: timeLabels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, scales: { x: { type: 'time', time: { parser: 'YYYY-MM-DDTHH:mm', unit: 'hour', tooltipFormat: 'lll', displayFormats: { hour: 'HH:mm DD/MM' } }, ticks: { color: '#ccc', maxRotation: 0, autoSkip: true, maxTicksLimit: (hoursToShow > 48) ? 8 : 12 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, yPollutant: { type: 'linear', display: datasets.some(ds => ds.yAxisID === 'yPollutant'), position: 'left', min: 0, title: { display: true, text: 'Concentrazione (µg/m³)', color: '#ccc' }, ticks: { color: '#ccc' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, yUV: { type: 'linear', display: datasets.some(ds => ds.yAxisID === 'yUV'), position: 'right', min: 0, max: 12, title: { display: true, text: 'UV Index', color: '#ccc' }, ticks: { color: '#ccc', stepSize: 1 }, grid: { drawOnChartArea: false } } }, plugins: { legend: { position: 'bottom', labels: { color: '#ccc', boxWidth: 12, padding: 15 } }, tooltip: { titleFont: { weight: 'bold' }, bodyFont: { size: 11 } } } } });
    }

    // Mostra legenda AQI
    function displayMapLegend() { mapLegend.innerHTML = '<h6 class="text-center text-muted small mb-1">Indice Qualità Aria (EU)</h6>'; const legendRow = document.createElement('div'); legendRow.className = 'd-flex flex-wrap justify-content-center align-items-center gap-1'; aqiLevels.forEach(level => { const legendItem = document.createElement('div'); legendItem.className = 'legend-item small px-2 py-0 rounded-pill'; legendItem.style.backgroundColor = level.color; legendItem.style.color = level.textColor; legendItem.style.border = '1px solid rgba(0,0,0,0.3)'; legendItem.style.fontWeight = '500'; legendItem.textContent = level.text; legendRow.appendChild(legendItem); }); mapLegend.appendChild(legendRow); }

    // --- Event Listeners ---
    airQualitySearchForm.addEventListener('submit', function (event) { event.preventDefault(); event.stopPropagation(); if (!airQualitySearchForm.checkValidity()) { airQualitySearchForm.classList.add('was-validated'); return; } airQualitySearchForm.classList.remove('was-validated'); const city = citySearchInput.value.trim(); if (!city) { AlertsManager.showMessage('warning', 'Inserisci un nome di città.'); return; } showSpinner(); fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`).then(res => { if (!res.ok) throw new Error("Errore Nominatim"); return res.json(); }).then(data => { if (!data || data.length === 0) { hideSpinner(); AlertsManager.showMessage('warning', `Città "${city}" non trovata.`); return; } currentSearchLat = parseFloat(data[0].lat); currentSearchLon = parseFloat(data[0].lon); currentSearchCityName = data[0].display_name.split(',')[0]; citySearchInput.value = currentSearchCityName; getAndDisplayAirQuality(currentSearchLat, currentSearchLon, detailLevelSelect.value); }).catch(err => { hideSpinner(); AlertsManager.showMessage('error', `Errore ricerca città: ${err.message}`); console.error("Geocoding error:", err); }); });
    geoButton.addEventListener('click', function () { if (!navigator.geolocation) { AlertsManager.showMessage("warning", "Geolocalizzazione non supportata."); return; } showSpinner(); navigator.geolocation.getCurrentPosition((pos) => { currentSearchLat = pos.coords.latitude; currentSearchLon = pos.coords.longitude; fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentSearchLat}&lon=${currentSearchLon}&zoom=10&addressdetails=1`).then(res => res.json()).then(data => { currentSearchCityName = data?.address?.city || data?.address?.town || data?.address?.village || "Posizione Corrente"; citySearchInput.value = currentSearchCityName; }).catch(err => { console.warn("Reverse geocoding failed:", err); citySearchInput.value = "Posizione Corrente"; }).finally(() => { getAndDisplayAirQuality(currentSearchLat, currentSearchLon, detailLevelSelect.value); }); }, (err) => { hideSpinner(); AlertsManager.showMessage("error", `Errore geolocalizzazione: ${err.message}`); console.error("Geolocation error:", err); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }); });
    detailLevelSelect.addEventListener('change', function () { if (currentSearchLat && currentSearchLon) { getAndDisplayAirQuality(currentSearchLat, currentSearchLon, this.value); } });

    // --- Inizializzazione ---
    initializeMap();
    hideElement(searchResultsSection); // Nasconde la sezione risultati all'inizio

});