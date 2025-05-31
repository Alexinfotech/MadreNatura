document.addEventListener("DOMContentLoaded", function () {
    // --- Riferimenti DOM e Stato Globale ---
    const uvSearchForm = document.getElementById("uvSearchForm"); const citySearchInput = document.getElementById("citySearchInput"); const geoButton = document.getElementById("geoButton"); const loadingSpinner = document.getElementById("loadingSpinner"); const initialDataSection = document.getElementById("initialData"); const initialDataTableContainer = document.getElementById("initialDataTableContainer"); const searchResultsSection = document.getElementById("searchResults"); const forecastDaysSelection = document.getElementById("forecastDaysSelection"); const btn1Day = document.getElementById("btn1Day"); const btn7Days = document.getElementById("btn7Days"); const btn16Days = document.getElementById("btn16Days");
    let currentSearchLat = null; let currentSearchLon = null; let currentSearchCityName = "Posizione Corrente"; let currentDaysSelection = 7; let uvChart = null; let currentApiData = null;

    // --- Funzioni Helper ---
    function showSpinner() { loadingSpinner.style.display = 'block'; }
    function hideSpinner() { loadingSpinner.style.display = 'none'; }
    function showElement(el) { if (el) el.style.display = ''; }
    function hideElement(el) { if (el) el.style.display = 'none'; }
    function showUserMessage(type, message) { console.log(`${type.toUpperCase()}: ${message}`); if (window.AlertsManager?.showMessage) { window.AlertsManager.showMessage(type, message, 6000); } else { alert(`${type === 'error' ? 'Errore: ' : ''}${message}`); } }
    function getWeatherIconUrl(weatherCode, isDay = 1) { /* ... (invariata) ... */ } // Mantenuta anche se non usata qui, per coerenza se copi/incolli tra progetti
    function formatUVIndex(uv) { if (uv === null || uv === undefined || uv === 'N/D' || typeof uv !== 'number' || isNaN(uv) || uv < 0) return 'N/D'; const val = Math.round(uv); let risk = ''; if (val <= 2) risk = '(Basso)'; else if (val <= 5) risk = '(Moderato)'; else if (val <= 7) risk = '(Alto)'; else if (val <= 10) risk = '(Molto Alto)'; else risk = '(Estremo)'; return `${val} ${risk}`; }
    function formatShortDate(dateString) { try { const date = moment(dateString, "YYYY-MM-DD"); if (!date.isValid()) return dateString; return date.format("ddd DD MMM"); } catch (e) { console.error("Errore formattazione data:", e); return dateString; } }
    function formatTime(timeString) { return (timeString && timeString !== 'N/D' && timeString !== 'ERR') ? timeString : 'N/D'; }

    // --- Funzioni Principali ---

    function loadInitialData() {
        showSpinner(); hideElement(searchResultsSection); hideElement(forecastDaysSelection); showElement(initialDataSection); initialDataTableContainer.innerHTML = '';
        fetch('radiazioni_data.php?mode=initial')
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => { hideSpinner(); if (data.error) { AlertsManager.showMessage('error', `Errore caricamento dati iniziali: ${data.error}`); return; } displayInitialDataTable(data); })
            .catch(error => { hideSpinner(); AlertsManager.showMessage('error', `Errore di rete o caricamento dati iniziali: ${error.message}`); console.error("Fetch initial error:", error); });
    }

    function displayInitialDataTable(cityDataArray) {
        initialDataTableContainer.innerHTML = '';
        if (!cityDataArray || cityDataArray.length === 0) { initialDataTableContainer.innerHTML = '<p class="text-center">Nessun dato iniziale disponibile.</p>'; return; }
        const table = document.createElement('table'); table.className = 'table table-dark table-striped table-sm initial-uv-table';
        const thead = table.createTHead();
        thead.innerHTML = `<tr><th>Città</th><th>UV Max (Oggi)</th><th>Alba</th><th>Tramonto</th></tr>`;
        const tbody = table.createTBody();
        cityDataArray.forEach(cityData => {
            const row = tbody.insertRow();
            const cellCity = row.insertCell(); cellCity.textContent = cityData.city;
            if (cityData.error || !cityData.daily) { const cellError = row.insertCell(); cellError.colSpan = 3; cellError.textContent = cityData.error || 'Dati non disponibili'; cellError.classList.add('text-danger'); }
            else {
                const uvMax = cityData.daily.uv_index_max ?? null;
                const sunrise = cityData.daily.sunrise ?? 'N/D';
                const sunset = cityData.daily.sunset ?? 'N/D';
                const cellUV = row.insertCell(); cellUV.textContent = formatUVIndex(uvMax); cellUV.classList.add('text-center');
                const cellSunrise = row.insertCell(); cellSunrise.textContent = sunrise; cellSunrise.classList.add('text-center');
                const cellSunset = row.insertCell(); cellSunset.textContent = sunset; cellSunset.classList.add('text-center');
            }
        });
        initialDataTableContainer.appendChild(table);
    }

    function requestAndDisplayUvData(lat, lon, days) {
        showSpinner(); hideElement(initialDataSection); searchResultsSection.innerHTML = ''; showElement(searchResultsSection); showElement(forecastDaysSelection);
        [btn1Day, btn7Days, btn16Days].forEach(btn => { btn.classList.remove('active'); if (parseInt(btn.dataset.days) === days) { btn.classList.add('active'); } });
        currentDaysSelection = days;

        const url = `radiazioni_data.php?mode=search&lat=${lat}&lon=${lon}&days=${days}`;

        fetch(url)
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => {
                hideSpinner();
                if (data.error) { AlertsManager.showMessage('error', `Errore dati UV per ${currentSearchCityName}: ${data.error}`); searchResultsSection.innerHTML = `<p class="text-center text-danger">Impossibile caricare i dati UV per ${currentSearchCityName}.</p>`; currentApiData = null; return; }
                currentApiData = data;
                displaySearchResults(data);
            })
            .catch(error => { hideSpinner(); AlertsManager.showMessage('error', `Errore di rete o caricamento dati UV per ${currentSearchCityName}: ${error.message}`); searchResultsSection.innerHTML = `<p class="text-center text-danger">Errore durante il caricamento dei dati UV.</p>`; currentApiData = null; console.error("Fetch UV search error:", error); });
    }

    function displaySearchResults(data) {
        searchResultsSection.innerHTML = `<h2 class="text-center mb-4">Dati UV / Radiazione - ${currentSearchCityName} (${currentDaysSelection} ${currentDaysSelection > 1 ? 'Giorni' : 'Giorno'})</h2>`; // Titolo dinamico

        const dailyTableContainer = document.createElement('div'); dailyTableContainer.className = 'table-responsive mb-4';
        const dailyTable = document.createElement('table'); dailyTable.className = 'table table-dark table-striped table-sm daily-summary-table';
        dailyTable.innerHTML = `<thead><tr><th>Giorno</th><th>UV Max</th><th>Alba</th><th>Tramonto</th></tr></thead><tbody></tbody>`;
        const tbody = dailyTable.querySelector('tbody');

        if (data.daily && data.daily.time) {
            data.daily.time.forEach((dateStr, i) => {
                const uvMax = data.daily.uv_index_max?.[i] ?? null;
                const sunrise = data.daily.sunrise_formatted?.[i] ?? formatTime(data.daily.sunrise?.[i]);
                const sunset = data.daily.sunset_formatted?.[i] ?? formatTime(data.daily.sunset?.[i]);
                const row = tbody.insertRow();
                row.innerHTML = `<td>${formatShortDate(dateStr)}</td><td class="text-center">${formatUVIndex(uvMax)}</td><td class="text-center">${sunrise}</td><td class="text-center">${sunset}</td>`;
            });
        } else { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-warning">Dati giornalieri non disponibili.</td></tr>'; }
        dailyTableContainer.appendChild(dailyTable); searchResultsSection.appendChild(dailyTableContainer);

        const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container p-3 rounded'; chartContainer.style.backgroundColor = 'rgba(0,0,0,0.2)';
        chartContainer.innerHTML = `<h4 class="text-center mb-3">Andamento Orario</h4><canvas id="uvRadiationChart"></canvas>`; // Titolo generico grafico
        searchResultsSection.appendChild(chartContainer);
        createUvRadiationChart(data.hourly);
    }

    // *** MODIFICA: Rimossa limitazione a 7 giorni ***
    function createUvRadiationChart(hourlyData) {
        const canvasId = 'uvRadiationChart';
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement || !hourlyData || !hourlyData.time) { console.warn("Dati orari o canvas non disponibili per il grafico."); if (canvasElement) canvasElement.parentElement.remove(); return; } // Rimuovi contenitore se no canvas/dati

        // *** USA TUTTI I DATI ORARI DISPONIBILI (non più limitato a 7*24) ***
        const hoursToShow = hourlyData.time.length; // Usa la lunghezza effettiva dei dati ricevuti
        const timeLabels = hourlyData.time.slice(0, hoursToShow);
        const uvIndexData = hourlyData.uv_index?.slice(0, hoursToShow) ?? [];
        const radiationData = hourlyData.shortwave_radiation?.slice(0, hoursToShow) ?? [];

        if (uvChart) { uvChart.destroy(); }
        const ctx = canvasElement.getContext('2d');
        const datasets = [];

        if (uvIndexData.length === timeLabels.length && uvIndexData.some(uv => uv !== null && !isNaN(uv))) { datasets.push({ label: 'Indice UV', data: uvIndexData.map(uv => (uv === null || isNaN(uv) ? null : uv)), borderColor: 'rgb(255, 159, 64)', backgroundColor: 'rgba(255, 159, 64, 0.5)', yAxisID: 'yUV', tension: 0.1, pointRadius: 1, borderWidth: 2 }); }
        if (radiationData.length === timeLabels.length && radiationData.some(r => r !== null && !isNaN(r))) { datasets.push({ label: 'Radiazione (W/m²)', data: radiationData.map(r => (r === null || isNaN(r) ? null : r)), borderColor: 'rgb(255, 205, 86)', backgroundColor: 'rgba(255, 205, 86, 0.5)', yAxisID: 'yRadiation', tension: 0.1, pointRadius: 1, borderWidth: 2 }); }
        if (datasets.length === 0) { console.warn("Nessun dato orario valido per UV o Radiazione."); canvasElement.parentElement.remove(); return; } // Rimuovi contenitore se no dati

        // Adatta unità asse X in base ai giorni
        let xAxisUnit = 'day';
        if (currentDaysSelection <= 2) {
            xAxisUnit = 'hour';
        }

        uvChart = new Chart(ctx, {
            type: 'line',
            data: { labels: timeLabels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            parser: 'YYYY-MM-DDTHH:mm',
                            unit: xAxisUnit, // Unità dinamica
                            tooltipFormat: 'll HH:mm',
                            displayFormats: {
                                hour: 'HH', // Mostra solo ora se pochi giorni
                                day: 'DD MMM' // Mostra giorno e mese se più giorni
                            }
                        },
                        ticks: { color: '#ccc', maxRotation: 0, autoSkip: true, maxTicksLimit: (currentDaysSelection > 7) ? 8 : 12 }, // Meno tick se molti giorni
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    yUV: { type: 'linear', display: datasets.some(ds => ds.yAxisID === 'yUV'), position: 'left', min: 0, title: { display: true, text: 'UV Index', color: '#ccc' }, ticks: { color: '#ccc', stepSize: 1 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    yRadiation: { type: 'linear', display: datasets.some(ds => ds.yAxisID === 'yRadiation'), position: 'right', min: 0, title: { display: true, text: 'W/m²', color: '#ccc' }, ticks: { color: '#ccc' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { labels: { color: '#ccc' } }, tooltip: { titleFont: { weight: 'bold' } } }
            }
        });
    }


    // --- Event Listeners ---
    uvSearchForm.addEventListener('submit', function (event) { event.preventDefault(); event.stopPropagation(); if (!uvSearchForm.checkValidity()) { uvSearchForm.classList.add('was-validated'); return; } uvSearchForm.classList.remove('was-validated'); const city = citySearchInput.value.trim(); if (!city) { AlertsManager.showMessage('warning', 'Inserisci un nome di città.'); return; } showSpinner(); fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`).then(res => { if (!res.ok) throw new Error("Errore Nominatim"); return res.json(); }).then(data => { if (!data || data.length === 0) { hideSpinner(); AlertsManager.showMessage('warning', `Città "${city}" non trovata.`); return; } currentSearchLat = parseFloat(data[0].lat); currentSearchLon = parseFloat(data[0].lon); currentSearchCityName = data[0].display_name.split(',')[0]; citySearchInput.value = currentSearchCityName; requestAndDisplayUvData(currentSearchLat, currentSearchLon, currentDaysSelection); }).catch(err => { hideSpinner(); AlertsManager.showMessage('error', `Errore ricerca città: ${err.message}`); console.error("Geocoding error:", err); }); });
    geoButton.addEventListener('click', function () { if (!navigator.geolocation) { AlertsManager.showMessage("warning", "Geolocalizzazione non supportata."); return; } showSpinner(); navigator.geolocation.getCurrentPosition((pos) => { currentSearchLat = pos.coords.latitude; currentSearchLon = pos.coords.longitude; fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentSearchLat}&lon=${currentSearchLon}&zoom=10&addressdetails=1`).then(res => res.json()).then(data => { currentSearchCityName = data?.address?.city || data?.address?.town || data?.address?.village || "Posizione Corrente"; citySearchInput.value = currentSearchCityName; }).catch(err => { console.warn("Reverse geocoding failed:", err); citySearchInput.value = "Posizione Corrente"; }).finally(() => { requestAndDisplayUvData(currentSearchLat, currentSearchLon, currentDaysSelection); }); }, (err) => { hideSpinner(); AlertsManager.showMessage("error", `Errore geolocalizzazione: ${err.message}`); console.error("Geolocation error:", err); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }); });
    forecastDaysSelection.addEventListener('click', (event) => { const button = event.target.closest('button'); if (button && !button.classList.contains('active')) { const days = parseInt(button.dataset.days, 10); if (currentSearchLat && currentSearchLon && !isNaN(days)) { requestAndDisplayUvData(currentSearchLat, currentSearchLon, days); } } });
    // Rimossi listener zoom card

    // --- Caricamento Iniziale ---
    loadInitialData();

});