document.addEventListener("DOMContentLoaded", function () {
    // --- Riferimenti DOM ---
    const historicalSearchForm = document.getElementById("historicalSearchForm");
    const citySearchInput = document.getElementById("citySearchInput");
    const geoButton = document.getElementById("geoButton");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const searchResultsSection = document.getElementById("historicalResults");
    const chartContainer = document.getElementById("chartContainer"); // Container div
    const climateChartCanvas = document.getElementById("climateChart"); // Canvas element
    const resultsPlaceholder = document.getElementById("resultsPlaceholder");
    const resultsTitle = document.getElementById("resultsTitle");
    const resultsMessagePlaceholder = document.getElementById("resultsMessagePlaceholder"); // For errors/messages inside results

    // --- Stato Applicazione ---
    let currentSearchLat = null;
    let currentSearchLon = null;
    let currentSearchCityName = null;
    let climateChartInstance = null; // Renamed to avoid conflict with element ID
    let currentApiData = null; // Conserva ultima risposta API valida

    // --- Funzioni Helper ---
    function showSpinner() { if (loadingSpinner) loadingSpinner.style.display = 'block'; }
    function hideSpinner() { if (loadingSpinner) loadingSpinner.style.display = 'none'; }
    function showElement(el) { if (el) el.style.display = 'block'; } // Simple show
    function hideElement(el) { if (el) el.style.display = 'none'; } // Simple hide

    function showUserMessage(type, message) {
        // Use AlertsManager if available (assumed from alerts_storico.js)
        if (window.AlertsManager?.showMessage) {
            window.AlertsManager.showMessage(type, message, 6000);
        } else {
            // Fallback to console/alert if AlertsManager is missing
            console.warn("AlertsManager non trovato. Messaggio:", type, message);
            alert(`${type === 'error' ? 'Errore: ' : (type === 'warning' ? 'Attenzione: ' : '')}${message}`);
        }
    }

    const parameterLabels = {
        temperature_2m_max: { label: "T. Max", unit: "°C" }
    };

    function getParamLabel(key, units) {
        const baseKey = 'temperature_2m_max';
        if (key.startsWith(baseKey)) {
            // Extract model name, handle potential empty model name if API changes
            const modelName = key.substring(baseKey.length + 1) || 'Reference'; // e.g., _CMCC_CM2_VHR4 -> CMCC_CM2_VHR4
            const baseLabel = parameterLabels[baseKey];
            // Use model name in label, fallback to base label if model name is missing
            const finalLabel = modelName ? `T. Max (${modelName.replace(/_/g, ' ')})` : baseLabel.label;
            return { label: finalLabel, unit: units?.[key] || baseLabel.unit };
        }
        // Fallback (shouldn't be needed for climate with current PHP)
        return { label: key.replace(/_/g, ' ').toUpperCase(), unit: units?.[key] || '' };
    }


    // --- Funzioni Principali ---

    /**
     * Fetches climate data from the PHP backend and triggers display.
     */
    function getAndDisplayClimateData(lat, lon) {
        currentSearchLat = lat; // Store coordinates used for this search
        currentSearchLon = lon;

        const startDate = "1980-01-01"; // Fixed for climate
        const endDate = "2024-12-31";   // Fixed for climate
        const dataType = 'climate';

        showSpinner();
        hideElement(resultsPlaceholder); // Hide initial placeholder
        hideElement(searchResultsSection); // Hide results section during load
        hideElement(chartContainer); // Ensure chart container is hidden
        if (resultsMessagePlaceholder) resultsMessagePlaceholder.innerHTML = ''; // Clear previous messages
        if (climateChartInstance) {
            climateChartInstance.destroy();
            climateChartInstance = null;
        }

        const url = `storico_data.php?lat=${lat}&lon=${lon}&start_date=${startDate}&end_date=${endDate}&data_type=${dataType}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    // Attempt to parse error JSON, otherwise use status text
                    return response.json().catch(() => {
                        throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
                    }).then(errData => {
                        throw new Error(errData.error || `Errore API (HTTP ${response.status})`);
                    });
                }
                return response.json();
            })
            .then(data => {
                hideSpinner();
                if (data.error) {
                    throw new Error(data.error); // Handle API-reported errors
                }
                if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
                    throw new Error("La risposta API non contiene dati giornalieri validi ('daily.time').");
                }
                currentApiData = data; // Store valid data
                displayClimateResults(data); // Process and display
            })
            .catch(error => {
                hideSpinner();
                showUserMessage('error', `Errore caricamento dati climatici: ${error.message}`);
                // Display error within the results section
                if (resultsTitle) resultsTitle.textContent = 'Errore Dati Climatici';
                if (resultsMessagePlaceholder) resultsMessagePlaceholder.innerHTML = `<div class="alert alert-danger text-center mt-3">Impossibile caricare i dati: ${error.message}</div>`;
                showElement(searchResultsSection); // Show the section to display the error
                hideElement(chartContainer);      // Keep chart hidden
                currentApiData = null; // Clear invalid data state
                console.error("Fetch/Process Climate error:", error);
            });
    }

    /**
     * Prepares the results section and calls the chart creation function.
     */
    function displayClimateResults(data) {
        // Set the title
        if (resultsTitle) {
            resultsTitle.textContent = `Andamento Temperatura Max (1980-2024) - ${currentSearchCityName || 'Posizione Selezionata'}`;
        }
        if (resultsMessagePlaceholder) resultsMessagePlaceholder.innerHTML = ''; // Clear previous messages/errors

        // Attempt to create the chart
        const chartCreated = createClimateChart(data);

        if (chartCreated) {
            showElement(chartContainer); // Show chart container only if chart was created
        } else {
            hideElement(chartContainer); // Ensure container is hidden if chart creation failed
            if (resultsMessagePlaceholder) resultsMessagePlaceholder.innerHTML = '<p class="text-center text-warning mt-3">Dati insufficienti o non validi per generare il grafico.</p>';
        }

        showElement(searchResultsSection); // Show the results section (title and chart/message)
    }

    /**
     * Creates the Chart.js climate chart with improved sampling.
     * Returns true if chart was created successfully, false otherwise.
     */
    function createClimateChart(data) {
        const timeData = data?.daily; // Daily data node

        // Robust validation
        if (!climateChartCanvas || !timeData || !timeData.time || !Array.isArray(timeData.time) || timeData.time.length === 0) {
            console.warn("Dati o canvas mancanti/invalidi per il grafico climatico.");
            return false; // Indicate chart creation failed
        }

        if (climateChartInstance) { climateChartInstance.destroy(); } // Destroy previous chart instance

        const ctx = climateChartCanvas.getContext('2d');
        const datasets = [];
        const originalTimeLabels = timeData.time;
        const availableColors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(75, 192, 192)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)', 'rgb(255, 205, 86)', 'rgb(201, 203, 207)'];
        let colorIndex = 0;
        const units = data.daily_units || {};

        // Find all available Tmax parameters (e.g., temperature_2m_max_CMCC_CM2_VHR4)
        const paramsToPlot = Object.keys(timeData).filter(key => key.startsWith('temperature_2m_max'));

        // --- Improved Sampling Logic ---
        const MAX_POINTS_DISPLAY = 365 * 5; // Target max points (e.g., ~5 years of daily data worth) - ADJUST AS NEEDED
        let effectiveLabels;
        let dataToPlot = {};
        let sampling = 1; // Default: no sampling

        if (originalTimeLabels.length > MAX_POINTS_DISPLAY) {
            // Calculate sampling factor based on the target points
            sampling = Math.ceil(originalTimeLabels.length / MAX_POINTS_DISPLAY);
            console.log(`Campionamento dati grafico: 1 punto ogni ${sampling} punti originali (circa ${Math.round(sampling / 365 * 365)} giorni). Target: ~${MAX_POINTS_DISPLAY} punti.`); // More informative log

            const sampledLabelsTemp = [];
            const sampledDataTemp = {};
            paramsToPlot.forEach(key => sampledDataTemp[key] = []); // Initialize arrays for sampled data

            for (let i = 0; i < originalTimeLabels.length; i += sampling) {
                sampledLabelsTemp.push(originalTimeLabels[i]);
                paramsToPlot.forEach(key => {
                    // Ensure the data array for the key exists and index is valid
                    if (timeData[key] && i < timeData[key].length) {
                        // Push the value or null if it's missing/invalid at the source index
                        sampledDataTemp[key].push(timeData[key][i] ?? null);
                    } else {
                        // If source data is missing for this index, push null
                        sampledDataTemp[key].push(null);
                        // Log a warning only once per missing key to avoid console flooding
                        if (!sampledDataTemp[key].warned) {
                            console.warn(`Dati mancanti per ${key} all'indice ${i} durante il campionamento.`);
                            sampledDataTemp[key].warned = true; // Flag to avoid repeated warnings for the same key
                        }
                    }
                });
            }
            effectiveLabels = sampledLabelsTemp;
            dataToPlot = sampledDataTemp; // Use the sampled data
        } else {
            console.log("Nessun campionamento necessario.");
            effectiveLabels = originalTimeLabels; // Use all original labels
            // Copy only the necessary data arrays to dataToPlot
            paramsToPlot.forEach(key => {
                if (timeData[key]) {
                    dataToPlot[key] = timeData[key];
                } else {
                    console.warn(`Dati mancanti per la chiave ${key} anche senza campionamento.`);
                    dataToPlot[key] = []; // Assign empty array to avoid errors later
                }
            });
        }
        // --- End Sampling Logic ---


        // Build Chart.js Datasets using the (potentially sampled) data
        paramsToPlot.forEach(paramKey => {
            // Check if data exists in dataToPlot and has the same length as effectiveLabels
            if (dataToPlot[paramKey] && Array.isArray(dataToPlot[paramKey]) && dataToPlot[paramKey].length === effectiveLabels.length) {
                // Check if there's at least one valid number in the dataset
                const hasValidData = dataToPlot[paramKey].some(v => v !== null && !isNaN(v));

                if (hasValidData) {
                    const labelInfo = getParamLabel(paramKey, units);
                    const color = availableColors[colorIndex % availableColors.length];
                    datasets.push({
                        label: labelInfo.label,
                        data: dataToPlot[paramKey], // Already handles nulls from sampling/source
                        borderColor: color,
                        backgroundColor: 'transparent', // Line chart, no fill
                        yAxisID: 'yTemp', // Single Y-axis for temperature
                        tension: 0.3,     // Slight curve to lines
                        pointRadius: 0,   // No points for performance
                        borderWidth: 1.5,
                        hidden: colorIndex >= 4 // Optionally hide models beyond the 4th initially
                    });
                    colorIndex++;
                } else {
                    console.warn(`Parametro ${paramKey} scartato (grafico): nessun dato numerico valido trovato dopo il campionamento.`);
                }
            } else {
                console.warn(`Parametro ${paramKey} scartato (grafico): dati mancanti, non validi, o di lunghezza non corrispondente alle etichette (${dataToPlot[paramKey]?.length} vs ${effectiveLabels.length}).`);
            }
        });


        if (datasets.length === 0) {
            console.warn("Nessun dataset valido trovato per il grafico climatico dopo l'elaborazione.");
            return false; // Indicate chart creation failed
        }

        // Configure and create the Chart.js instance
        const timeUnitSuggest = effectiveLabels.length > 365 * 10 ? 'year' : 'month'; // Adjust time unit based on sampled data length

        climateChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: effectiveLabels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index', // Show tooltips for all datasets at the same x-index
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            parser: 'YYYY-MM-DD',
                            unit: timeUnitSuggest,
                            tooltipFormat: 'll', // e.g., 'Sep 4, 1986'
                            displayFormats: { // How labels are shown on the axis
                                month: 'MMM YYYY', // e.g., 'Jan 2020'
                                year: 'YYYY'       // e.g., '2020'
                            }
                        },
                        ticks: {
                            color: '#ccc',
                            maxRotation: 0, // Prevent label rotation
                            autoSkip: true,  // Automatically skip labels to prevent overlap
                            maxTicksLimit: 15 // Limit number of visible ticks
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    yTemp: { // Single Y-axis for Temperature
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: `Temperatura Max (${parameterLabels.temperature_2m_max.unit})`, // Use unit from config
                            color: '#ccc'
                        },
                        ticks: { color: '#ccc' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ccc',
                            boxWidth: 12,
                            padding: 15,
                            // Filter out hidden datasets from legend if needed (optional)
                            // filter: (legendItem) => !legendItem.hidden
                        }
                    },
                    tooltip: {
                        titleFont: { weight: 'bold' },
                        bodyFont: { size: 11 },
                        callbacks: {
                            // Optional: Customize tooltip labels further if needed
                            // label: function(context) {
                            //     let label = context.dataset.label || '';
                            //     if (label) { label += ': '; }
                            //     if (context.parsed.y !== null) {
                            //         label += context.parsed.y.toFixed(1) + ' °C'; // Example formatting
                            //     }
                            //     return label;
                            // }
                        }
                    }
                }
            }
        });

        return true; // Indicate chart creation succeeded
    }


    // --- Event Listeners ---
    historicalSearchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();

        // Bootstrap validation
        if (!historicalSearchForm.checkValidity()) {
            historicalSearchForm.classList.add('was-validated');
            return;
        }
        historicalSearchForm.classList.remove('was-validated'); // Reset validation state

        const city = citySearchInput.value.trim();

        // Require city input OR prior successful geolocalization
        if (!city && (!currentSearchLat || !currentSearchLon)) {
            showUserMessage('warning', 'Inserisci una città o usa il pulsante di geolocalizzazione.');
            citySearchInput.focus(); // Focus the input field
            return;
        }

        // If city input is present AND different from the last search name, OR if no coords exist yet
        if (city && (city !== currentSearchCityName || !currentSearchLat || !currentSearchLon)) {
            showSpinner();
            // Use Nominatim for geocoding
            fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Errore geocoding (HTTP ${res.status})`);
                    return res.json();
                })
                .then(data => {
                    if (!data || data.length === 0) {
                        throw new Error(`Città "${city}" non trovata.`);
                    }
                    const location = data[0];
                    const lat = parseFloat(location.lat);
                    const lon = parseFloat(location.lon);
                    // Extract a cleaner city name if possible
                    currentSearchCityName = location.display_name.split(',')[0] || city;
                    citySearchInput.value = currentSearchCityName; // Update input field with found name

                    getAndDisplayClimateData(lat, lon); // Fetch data for the found coordinates
                })
                .catch(err => {
                    hideSpinner();
                    showUserMessage('error', `Errore ricerca città: ${err.message}`);
                    console.error("Geocoding error:", err);
                    currentSearchCityName = null; // Clear city name on error
                    currentSearchLat = null;
                    currentSearchLon = null;
                });
        } else if (currentSearchLat && currentSearchLon) {
            // If city input is empty or matches last search, and we have coords, use existing coords
            console.log(`Utilizzo coordinate memorizzate per ${currentSearchCityName}: ${currentSearchLat}, ${currentSearchLon}`);
            getAndDisplayClimateData(currentSearchLat, currentSearchLon);
        }
        // No 'else' needed, the first condition handles the case where city is empty and no coords exist.
    });

    geoButton.addEventListener('click', function () {
        if (!navigator.geolocation) {
            showUserMessage("warning", "La geolocalizzazione non è supportata da questo browser.");
            return;
        }
        showSpinner();
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                currentSearchLat = lat; // Store coords immediately
                currentSearchLon = lon;

                // Attempt reverse geocoding to get city name (optional but good UX)
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`)
                    .then(res => res.ok ? res.json() : null) // Return null if reverse geocoding fails
                    .then(data => {
                        if (data?.address) {
                            currentSearchCityName = data.address.city || data.address.town || data.address.village || "Posizione Corrente";
                        } else {
                            currentSearchCityName = "Posizione Corrente";
                        }
                        citySearchInput.value = currentSearchCityName; // Update input field
                    })
                    .catch(err => {
                        console.warn("Reverse geocoding failed:", err);
                        currentSearchCityName = "Posizione Corrente"; // Fallback name
                        citySearchInput.value = currentSearchCityName;
                    })
                    .finally(() => {
                        hideSpinner();
                        showUserMessage('info', `Posizione ${currentSearchCityName} (${lat.toFixed(4)}, ${lon.toFixed(4)}) acquisita. Clicca 'Mostra' per visualizzare il grafico.`);
                        // Optional: Automatically trigger the search after geolocation
                        // getAndDisplayClimateData(lat, lon);
                    });
            },
            (err) => {
                hideSpinner();
                showUserMessage("error", `Errore geolocalizzazione: ${err.message}`);
                console.error("Geolocation error:", err);
                currentSearchLat = null; // Clear coords on error
                currentSearchLon = null;
                currentSearchCityName = null;
            },
            { // Geolocation options
                enableHighAccuracy: false, // Faster, less battery drain
                timeout: 10000, // 10 seconds max wait
                maximumAge: 60000 // Accept cached position up to 1 min old
            }
        );
    });

    // --- Inizializzazione ---
    hideElement(searchResultsSection); // Hide results section initially
    showElement(resultsPlaceholder); // Show the initial prompt message
    hideSpinner(); // Ensure spinner is hidden on load

});