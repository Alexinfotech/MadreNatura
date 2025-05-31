document.addEventListener("DOMContentLoaded", function () {
    // Imposta max data fine (uguale a prima, senza modifiche)
    try {
        var now = new Date(); var year = now.getFullYear(); var month = (now.getMonth() + 1).toString().padStart(2, '0'); var day = now.getDate().toString().padStart(2, '0'); var hours = now.getHours().toString().padStart(2, '0'); var minutes = now.getMinutes().toString().padStart(2, '0'); var currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        var endTimeInput = document.getElementById("endTime"); if (endTimeInput) endTimeInput.setAttribute("max", currentDateTime);
    } catch (e) { console.error("Errore imp. data max:", e); }

    // Riferimenti principali (invariati)
    const startTimeInput = document.getElementById("startTime");
    const minMagnitudeInput = document.getElementById("minMagnitude");
    const radiusInput = document.getElementById("radius");
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const locationNameInput = document.getElementById("locationName");
    const resetButton = document.getElementById("resetButton");
    const exportCSVBtn = document.getElementById("exportCSVBtn");
    const exportPDFBtn = document.getElementById("exportPDFBtn");
    const tableContainer = document.getElementById("tableContainer");
    const chartCanvas = document.getElementById("earthquakeChart");
    const statsContainer = document.getElementById("statsContainer");
    const spinner = document.getElementById("spinner");
    const interpretationDiv = document.getElementById("interpretationContainer");

    // Salva/Ripristina valori (invariati)
    const savedStartTime = localStorage.getItem("startTime"); const savedEndTime = localStorage.getItem("endTime"); const savedMinMag = localStorage.getItem("minMag"); const savedRadius = localStorage.getItem("radius");
    if (savedStartTime) startTimeInput.value = savedStartTime; if (savedEndTime) endTimeInput.value = savedEndTime; if (savedMinMag) minMagnitudeInput.value = savedMinMag; if (savedRadius) radiusInput.value = savedRadius;

    // Mappa con limiti Italia (invariata)
    const southWest = L.latLng(35.5, 6.5), northEast = L.latLng(47.1, 19.0), bounds = L.latLngBounds(southWest, northEast);
    const map = L.map("map", { center: [41.9, 12.6], zoom: 6, maxBounds: bounds, maxBoundsViscosity: 1.0 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
    const outer = [[-90, -180], [-90, 180], [90, 180], [90, -180]]; const inner = [[35.5, 6.5], [35.5, 19.0], [47.1, 19.0], [47.1, 6.5]];
    L.polygon([outer, inner], { color: "#000", fillColor: "#000", fillOpacity: 0.5 }).addTo(map);
    let marker = null; let circle = null; let earthquakeMarkersLayer = L.layerGroup().addTo(map);

    // Click mappa => posizioniamo marker + geocodifica inversa (con marker trascinabile)
    map.on("click", function (e) {
        if (e.latlng.lat >= 35.5 && e.latlng.lat <= 47.1 && e.latlng.lng >= 6.5 && e.latlng.lng <= 19.0) {
            if (marker) { marker.setLatLng(e.latlng); }
            else { marker = L.marker(e.latlng, { draggable: true }).addTo(map); marker.on('dragend', function (event) { var latlng = event.target.getLatLng(); latitudeInput.value = latlng.lat; longitudeInput.value = latlng.lng; reverseGeocode(latlng); }); }
            latitudeInput.value = e.latlng.lat; longitudeInput.value = e.latlng.lng; reverseGeocode(e.latlng);
        } else { if (window.AlertsManager) AlertsManager.showMessage("warning", "Seleziona un punto all'interno dei confini italiani visualizzati.", 4000); }
    });

    // Funzione per Geocodifica Inversa (invariata)
    function reverseGeocode(latlng) { fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=10&addressdetails=1`).then((res) => res.json()).then((data) => { let locationDisplayName = "N/A"; if (data.display_name) { locationDisplayName = data.display_name; } let simpleName = ''; if (data.address) { simpleName = [data.address.city, data.address.town, data.address.village, data.address.county, data.address.state].filter(Boolean).join(', '); } locationNameInput.value = simpleName || locationDisplayName; document.getElementById("selectedLocation").innerHTML = `<div class="card mt-2"><div class="card-body p-2"><h6 class="card-title mb-1">Centro Ricerca:</h6><small><strong>${locationNameInput.value}</strong><br>Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}</small></div></div>`; }).catch((error) => { console.error("Errore geocodifica:", error); document.getElementById("selectedLocation").innerHTML = `<div class="card mt-2"><div class="card-body p-2"><h6 class="card-title mb-1">Centro Ricerca:</h6><small>Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}<br>(Nome non disp.)</small></div></div>`; }); }

    // Gestione form (invariata, con validazione migliorata)
    const earthquakeForm = document.getElementById("earthquakeForm");
    earthquakeForm.addEventListener("submit", function (event) {
        event.preventDefault(); if (window.AlertsManager) { AlertsManager.clearAllMessages(); }
        const startTime = new Date(startTimeInput.value); const endTime = new Date(endTimeInput.value); const minMagnitude = parseFloat(minMagnitudeInput.value); const latitude = parseFloat(latitudeInput.value); const longitude = parseFloat(longitudeInput.value); const radiusVal = parseFloat(radiusInput.value); let valid = true;
        if (isNaN(startTime.getTime()) || !startTimeInput.value) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Data inizio non valida."); valid = false; startTimeInput.classList.add('is-invalid'); } else if (startTime < new Date("2023-01-01T00:00:00")) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Data inizio < 01/01/2023."); valid = false; startTimeInput.classList.add('is-invalid'); } else { startTimeInput.classList.remove('is-invalid'); }
        if (isNaN(endTime.getTime()) || !endTimeInput.value) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Data fine non valida."); valid = false; endTimeInput.classList.add('is-invalid'); } else if (endTime > new Date()) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Data fine futura."); valid = false; endTimeInput.classList.add('is-invalid'); } else if (valid && endTime < startTime) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Data fine < Data inizio."); valid = false; endTimeInput.classList.add('is-invalid'); } else { endTimeInput.classList.remove('is-invalid'); }
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Seleziona località valida."); valid = false; document.getElementById('map').style.borderColor = 'red'; } else { const latOk = latitude >= 35.5 && latitude <= 47.1; const lngOk = longitude >= 6.5 && longitude <= 19.0; if (!latOk || !lngOk) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Punto fuori confini italiani."); valid = false; document.getElementById('map').style.borderColor = 'red'; } else { document.getElementById('map').style.borderColor = '#444'; } }
        if (!minMagnitude || isNaN(minMagnitude) || minMagnitude <= 0) { if (window.AlertsManager) AlertsManager.showMessage("warning", "Magnitudo minima non valida."); valid = false; minMagnitudeInput.classList.add('is-invalid'); } else { minMagnitudeInput.classList.remove('is-invalid'); }
        if (valid) { startTimeInput.classList.remove('is-invalid'); endTimeInput.classList.remove('is-invalid'); minMagnitudeInput.classList.remove('is-invalid'); document.getElementById('map').style.borderColor = '#444'; }
        if (!valid) return;
        localStorage.setItem("startTime", startTimeInput.value); localStorage.setItem("endTime", endTimeInput.value); localStorage.setItem("minMag", minMagnitudeInput.value); localStorage.setItem("radius", radiusInput.value);
        const formattedStartTime = startTime.toISOString().split(".")[0]; const formattedEndTime = endTime.toISOString().split(".")[0]; const url = `proxy.php?starttime=${encodeURIComponent(formattedStartTime)}&endtime=${encodeURIComponent(formattedEndTime)}&minmagnitude=${encodeURIComponent(minMagnitude)}&latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radius=${encodeURIComponent(radiusVal)}`;
        spinner.style.display = "block"; clearResults();

        fetch(url).then((response) => { if (!response.ok) { return response.text().then(text => { throw new Error(`Errore ${response.status}: ${response.statusText}. ${text}`); }); } const contentType = response.headers.get("content-type"); if (contentType && contentType.indexOf("application/json") !== -1) { return response.json(); } else { return response.text().then(text => { throw new Error(`Risposta non JSON: ${text.substring(0, 100)}...`); }); } })
            .then((data) => {
                spinner.style.display = "none";
                if (data.error) { console.error("Errore API INGV:", data.message || data.error); if (window.AlertsManager) AlertsManager.showMessage("error", `Errore API INGV: ${data.message || data.error}`); resetButton.style.display = "inline-block"; return; }
                if (!data.features || data.features.length === 0) { if (window.AlertsManager) AlertsManager.showMessage("info", "Nessun terremoto trovato."); clearResults(false); resetButton.style.display = "inline-block"; if (circle) { circle.setLatLng([latitude, longitude]); circle.setRadius(radiusVal * 1000); circle.setStyle({ color: "#f03", fillColor: "#f03", fillOpacity: 0.15 }); } else { circle = L.circle([latitude, longitude], { color: "#f03", fillColor: "#f03", fillOpacity: 0.15, radius: radiusVal * 1000, interactive: false }).addTo(map); } if (circle) map.fitBounds(circle.getBounds()); return; }
                if (circle) { map.removeLayer(circle); circle = null; } circle = L.circle([latitude, longitude], { color: "#f03", fillColor: "#f03", fillOpacity: 0.15, radius: radiusVal * 1000, interactive: false }).addTo(map);
                earthquakeMarkersLayer.clearLayers();
                let bounds = L.latLngBounds();
                data.features.forEach((feature) => { const coords = feature.geometry.coordinates; const magnitude = feature.properties.mag; const depth = coords[2]; const latLng = L.latLng(coords[1], coords[0]); if (typeof magnitude === 'number' && magnitude >= minMagnitude) { const markerRadius = Math.max(magnitude * 1.5, 3); const markerColor = getColor(magnitude); let eqMarker = L.circleMarker(latLng, { radius: markerRadius, fillColor: markerColor, color: "#000", weight: 1, opacity: 1, fillOpacity: 0.8 }).bindPopup(`<strong>Magnitudo: ${magnitude.toFixed(1)}</strong><br>Profondità: ${depth != null ? depth.toFixed(1) + ' km' : 'N/D'}<br>Località: ${feature.properties.place || 'N/D'}<br>Data: ${moment(feature.properties.time).format("DD/MM/YYYY HH:mm:ss")}`); earthquakeMarkersLayer.addLayer(eqMarker); bounds.extend(latLng); } });
                if (bounds.isValid()) { map.fitBounds(bounds.pad(0.1)); } else if (circle) { map.fitBounds(circle.getBounds()); }

                // --- PARTE GRAFICO: RIPORTATA ALLA VERSIONE PRECEDENTE (SENZA MOMENT ADAPTER) ---
                const ctx = chartCanvas.getContext("2d");
                const validFeatures = data.features.filter(f => typeof f.properties.mag === 'number');
                const timeLabels = validFeatures.map((f) => moment(f.properties.time).format("YYYY-MM-DD HH:mm")); // FORMATO ORIGINALE LABEL
                const magnitudes = validFeatures.map((f) => f.properties.mag);
                const depths = validFeatures.map((f) => f.geometry.coordinates[2]);
                const locations = validFeatures.map((f) => f.properties.place);

                if (magnitudes.length === 0) { if (window.AlertsManager) AlertsManager.showMessage("info", "Nessun dato valido per grafico."); clearResults(false); resetButton.style.display = "inline-block"; return; }
                const backgroundColors = magnitudes.map((mag) => getColor(mag)); const borderColors = backgroundColors.map((color) => color.replace(/rgba?\((\d+,\s*\d+,\s*\d+),\s*[\d.]+\)/, 'rgba($1, 1)'));
                if (window.myChart && typeof window.myChart.destroy === 'function') { window.myChart.destroy(); }
                const numericMagnitudes = magnitudes.filter(m => typeof m === 'number'); const avgMagnitudeVal = numericMagnitudes.length > 0 ? numericMagnitudes.reduce((a, b) => a + b, 0) / numericMagnitudes.length : 0; const timeIndices = timeLabels.map((_, i) => i); const regression = numericMagnitudes.length > 1 ? linearRegression(timeIndices, numericMagnitudes) : { slope: 0, intercept: avgMagnitudeVal };

                // CREAZIONE GRAFICO (VERSIONE ORIGINALE SENZA ADAPTER)
                window.myChart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: timeLabels, // Usa labels formattate
                        datasets: [
                            { label: "Magnitudo (Barre)", data: magnitudes, backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 1, yAxisID: "yMag", order: 2 },
                            { label: "Magnitudo (Linea)", data: magnitudes, type: "line", borderColor: "rgba(75, 192, 192, 1)", backgroundColor: "rgba(75, 192, 192, 0.2)", tension: 0.1, borderWidth: 2, fill: false, pointRadius: 3, yAxisID: "yMag", order: 1 },
                            { label: "Media Magnitudo", data: new Array(timeLabels.length).fill(avgMagnitudeVal.toFixed(2)), type: "line", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 0, yAxisID: "yMag", order: 0 },
                            { label: "Trend Magnitudo", data: (typeof regression.slope === 'number' && typeof regression.intercept === 'number') ? timeIndices.map(i => (regression.slope * i + regression.intercept).toFixed(2)) : new Array(timeLabels.length).fill(null), type: "line", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 2, fill: false, pointRadius: 0, borderDash: [10, 5], yAxisID: "yMag", order: 0 },
                            { label: "Profondità (km)", data: depths.map(d => (typeof d === 'number' ? d : null)), type: "line", borderColor: "rgba(255, 206, 86, 1)", backgroundColor: "rgba(255, 206, 86, 0.2)", tension: 0.1, borderWidth: 2, fill: false, pointRadius: 3, yAxisID: "yDepth", order: 1 }
                        ]
                    },
                    options: { // OPZIONI ORIGINALI (SENZA SCALA TEMPORALE SPECIFICA)
                        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                        scales: {
                            yMag: { type: "linear", position: "left", title: { display: true, text: "Magnitudo", color: '#ccc' }, ticks: { color: '#ccc' } },
                            yDepth: { type: "linear", position: "right", title: { display: true, text: "Profondità (km)", color: '#ccc' }, grid: { drawOnChartArea: false }, ticks: { color: '#ccc' } },
                            x: { title: { display: true, text: "Data e Ora", color: '#ccc' }, ticks: { color: '#ccc', maxRotation: 45, minRotation: 0 } } // Asse X categoriale
                        },
                        plugins: {
                            title: { display: true, text: "Andamento Sismico nel Tempo - Clicca legenda per filtrare", color: "white", font: { size: 16 } },
                            legend: { labels: { color: '#ccc' } },
                            tooltip: {
                                callbacks: { // CALLBACK TOOLTIP ORIGINALI
                                    title: function (tooltipItems) { return tooltipItems[0].label; },
                                    label: function (context) { const index = context.dataIndex; const datasetLabel = context.dataset.label || ''; let value = context.raw; let label = datasetLabel + ': '; if (value == null) return label + 'N/D'; if (datasetLabel.includes("Profondità")) { label = `Profondità: ${value.toFixed(1)} km`; } else if (datasetLabel.includes("Magnitudo")) { label = `Magnitudo: ${typeof value === 'number' ? value.toFixed(1) : value}`; } else { label += typeof value === 'number' ? value.toFixed(2) : value; } if (locations && locations[index] && !datasetLabel.includes("Media") && !datasetLabel.includes("Trend")) { label += `, Luogo: ${locations[index]}`; } return label; }
                                }
                            }
                        }
                    }
                });
                // --- FINE PARTE GRAFICO RIPRISTINATA ---

                chartCanvas.style.display = "block";
                createTableWithPagination(validFeatures);
                showStatistics({ features: validFeatures });
                showInterpretation(avgMagnitudeVal, regression.slope, regression.intercept, numericMagnitudes, validFeatures); // Chiama la nuova funzione
                resetButton.style.display = "inline-block"; exportCSVBtn.style.display = "inline-block"; exportPDFBtn.style.display = "inline-block";
            })
            .catch((error) => { spinner.style.display = "none"; console.error("Errore Fetch:", error); if (window.AlertsManager) AlertsManager.showMessage("error", `Errore recupero dati: ${error.message}`); clearResults(); resetButton.style.display = "inline-block"; });
    });

    // Funzione clearResults (invariata)
    function clearResults(clearMapElements = true) { if (window.myChart?.destroy) { window.myChart.destroy(); window.myChart = null; } chartCanvas.style.display = "none"; tableContainer.innerHTML = ""; statsContainer.innerHTML = ""; interpretationDiv.innerHTML = ""; exportCSVBtn.style.display = "none"; exportPDFBtn.style.display = "none"; currentFeatures = []; interpretationText = ""; if (clearMapElements) { if (marker) { map.removeLayer(marker); marker = null; } if (circle) { map.removeLayer(circle); circle = null; } earthquakeMarkersLayer.clearLayers(); document.getElementById("selectedLocation").innerHTML = ""; latitudeInput.value = ""; longitudeInput.value = ""; locationNameInput.value = ""; } }
    // Funzione getColor (invariata)
    function getColor(m) { const cM = Math.max(0, Math.min(m, 8)); const mMC = 8.0; if (cM < 3) { let f = cM / 3.0; let gb = 255 * (1 - f); return `rgba(255,255,${Math.round(gb)},0.7)`; } else if (cM < 5) { let f = (cM - 3.0) / 2.0; let g = 255 * (1 - f); return `rgba(255,${Math.round(g)},0,0.7)`; } else { let f = (cM - 5.0) / (mMC - 5.0); f = Math.min(f, 1.0); let i = Math.round(200 + 55 * f); return `rgba(${i},0,0,0.8)`; } }
    // Funzione linearRegression (invariata)
    function linearRegression(x, y) { if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) { const aY = y && y.length > 0 ? y.reduce((a, b) => a + b, 0) / y.length : 0; return { slope: 0, intercept: aY }; } const n = x.length; let sX = 0, sY = 0, sXY = 0, sX2 = 0; for (let i = 0; i < n; i++) { const xi = Number(x[i]); const yi = Number(y[i]); if (!isNaN(xi) && !isNaN(yi)) { sX += xi; sY += yi; sXY += xi * yi; sX2 += xi * xi; } } const d = (n * sX2 - sX * sX); if (d === 0) { const aY = n > 0 ? sY / n : 0; return { slope: 0, intercept: aY }; } const s = (n * sXY - sX * sY) / d; const t = (sY - s * sX) / n; if (isNaN(s) || isNaN(t)) { const aY = n > 0 ? sY / n : 0; return { slope: 0, intercept: aY }; } return { slope: s, intercept: t }; }

    // Statistiche (con range aggiornati per interpretazione)
    function showStatistics(data) {
        if (!data || !data.features || data.features.length === 0) { statsContainer.innerHTML = `<div class="card"><div class="card-body"><h5 class="card-title">Statistiche</h5><p class="card-text">Nessun dato.</p></div></div>`; return; }
        const magnitudes = data.features.map(f => f.properties.mag).filter(m => typeof m === 'number'); const depths = data.features.map(f => f.geometry.coordinates[2]).filter(d => typeof d === 'number'); const times = data.features.map(f => new Date(f.properties.time).getHours()); const dates = data.features.map(f => new Date(f.properties.time)); const totalEq = magnitudes.length;
        if (totalEq === 0) { statsContainer.innerHTML = `<div class="card"><div class="card-body"><h5 class="card-title">Statistiche</h5><p class="card-text">Nessun dato valido.</p></div></div>`; return; }
        const maxMagnitude = Math.max(...magnitudes); const minMagnitude = Math.min(...magnitudes); const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / totalEq; const stdDevMag = Math.sqrt(magnitudes.map(x => Math.pow(x - avgMagnitude, 2)).reduce((a, b) => a + b) / totalEq); const sortedMag = [...magnitudes].sort((a, b) => a - b); const mid = Math.floor(sortedMag.length / 2); const medMagnitude = sortedMag.length % 2 !== 0 ? sortedMag[mid] : (sortedMag[mid - 1] + sortedMag[mid]) / 2;
        const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : NaN; const minDepth = depths.length > 0 ? Math.min(...depths) : NaN; const maxDepth = depths.length > 0 ? Math.max(...depths) : NaN; const hourCounts = times.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {}); let mostCommonHour = -1, maxCount = 0; for (const h in hourCounts) { if (hourCounts[h] > maxCount) { maxCount = hourCounts[h]; mostCommonHour = parseInt(h, 10); } }
        const maxMagEvent = data.features.find(f => f.properties.mag === maxMagnitude); const minMagEvent = data.features.find(f => f.properties.mag === minMagnitude); const maxMagTime = maxMagEvent?.properties.time; const minMagTime = minMagEvent?.properties.time;
        const searchEndTime = endTimeInput.value ? new Date(endTimeInput.value).getTime() : Date.now(); const thirtyDaysAgo = searchEndTime - 30 * 24 * 60 * 60 * 1000; const oneYearAgo = searchEndTime - 365 * 24 * 60 * 60 * 1000; const recentEq = data.features.filter(f => new Date(f.properties.time).getTime() > thirtyDaysAgo).length; const yearlyEq = data.features.filter(f => new Date(f.properties.time).getTime() > oneYearAgo).length;
        const months = dates.map(d => d.getMonth()); const monthlyCounts = Array(12).fill(0); months.forEach(m => monthlyCounts[m]++); const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]; const monthlyDistributionStr = monthLabels.map((l, i) => `${l}: ${monthlyCounts[i]}`).join(", ");
        // RANGES USATI ANCHE NELLA INTERPRETAZIONE
        const magnitudeRanges = { "0-2": 0, "2-3": 0, "3-4": 0, "4-5": 0, "5+": 0 }; magnitudes.forEach(mag => { if (mag < 2) magnitudeRanges["0-2"]++; else if (mag < 3) magnitudeRanges["2-3"]++; else if (mag < 4) magnitudeRanges["3-4"]++; else if (mag < 5) magnitudeRanges["4-5"]++; else magnitudeRanges["5+"]++; });
        statsContainer.innerHTML = `<div class="card"><div class="card-body"><h5 class="card-title">Statistiche Riepilogative (${totalEq} eventi)</h5><div class="row"><div class="col-md-6"><p class="card-text">Max Mag: <strong>${maxMagnitude.toFixed(1)}</strong> ${maxMagTime ? `(${moment(maxMagTime).format("DD/MM/YY HH:mm")})` : ''}</p><p class="card-text">Min Mag: <strong>${minMagnitude.toFixed(1)}</strong> ${minMagTime ? `(${moment(minMagTime).format("DD/MM/YY HH:mm")})` : ''}</p><p class="card-text">Media Mag: <strong>${avgMagnitude.toFixed(2)}</strong></p><p class="card-text">Mediana Mag: <strong>${medMagnitude.toFixed(2)}</strong></p><p class="card-text">Dev. Std Mag: <strong>${stdDevMag.toFixed(2)}</strong></p><p class="card-text">Ora più freq.: <strong>${mostCommonHour !== -1 ? `${mostCommonHour}:00-${mostCommonHour + 1}:00` : 'N/D'}</strong></p></div><div class="col-md-6"><p class="card-text">Media Prof.: <strong>${!isNaN(avgDepth) ? avgDepth.toFixed(1) + ' km' : 'N/D'}</strong></p><p class="card-text">Min Prof.: <strong>${!isNaN(minDepth) ? minDepth.toFixed(1) + ' km' : 'N/D'}</strong></p><p class="card-text">Max Prof.: <strong>${!isNaN(maxDepth) ? maxDepth.toFixed(1) + ' km' : 'N/D'}</strong></p><p class="card-text">Eventi ultimi 30gg: <strong>${recentEq}</strong></p><p class="card-text">Eventi ultimo anno: <strong>${yearlyEq}</strong></p></div></div><hr><p class="card-text"><strong>Distr. Magnitudo:</strong> <span class="badge bg-secondary me-1" title="<2">0-2: ${magnitudeRanges["0-2"]}</span> <span class="badge bg-info text-dark me-1" title="2-2.9">2-3: ${magnitudeRanges["2-3"]}</span> <span class="badge bg-success me-1" title="3-3.9">3-4: ${magnitudeRanges["3-4"]}</span> <span class="badge bg-warning text-dark me-1" title="4-4.9">4-5: ${magnitudeRanges["4-5"]}</span> <span class="badge bg-danger me-1" title=">=5">5+: ${magnitudeRanges["5+"]}</span></p><p class="card-text"><strong>Distr. Mensile (periodo):</strong> ${monthlyDistributionStr}</p></div></div>`;
    }

    // === INTERPRETAZIONE AUTOMATICA MIGLIORATA (uguale alla precedente risposta) ===
    let interpretationText = "";
    function showInterpretation(avgMagnitudeVal, slope, intercept, magnitudes, features) {
        if (!magnitudes || magnitudes.length === 0) { interpretationDiv.innerHTML = ""; interpretationText = ""; return; }
        const startDate = startTimeInput.value ? moment(startTimeInput.value).format('DD/MM/YYYY HH:mm') : 'N/D'; const endDate = endTimeInput.value ? moment(endTimeInput.value).format('DD/MM/YYYY HH:mm') : 'N/D'; const minMag = minMagnitudeInput.value || 'N/D'; const radiusKm = radiusInput.value || 'N/D'; const locName = locationNameInput.value || `Lat ${latitudeInput.value?.substring(0, 6)}, Lon ${longitudeInput.value?.substring(0, 6)}`;
        const depths = features.map(f => f.geometry.coordinates[2]).filter(d => typeof d === 'number'); const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : NaN; const shallowCount = depths.filter(d => d <= 15).length; const deepCount = depths.filter(d => d > 50).length;
        const hours = features.map(f => new Date(f.properties.time).getHours()); const hourCounts = {}; let mostFrequentHour = 'N/D', maxHourCount = 0, totalHoursWithEvents = 0;
        if (hours.length > 0) { hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1); const sortedHours = Object.keys(hourCounts).sort((a, b) => hourCounts[b] - hourCounts[a]); mostFrequentHour = `${sortedHours[0]}:00 - ${parseInt(sortedHours[0]) + 1}:00`; maxHourCount = hourCounts[sortedHours[0]]; totalHoursWithEvents = Object.keys(hourCounts).length; }
        const magRangesInterp = { "< 2 (Impercettibile)": 0, "2-3 (Molto Leggero)": 0, "3-4 (Leggero)": 0, "4-5 (Moderato)": 0, "5+ (Forte/Dannoso)": 0 }; magnitudes.forEach(mag => { if (mag < 2) magRangesInterp["< 2 (Impercettibile)"]++; else if (mag < 3) magRangesInterp["2-3 (Molto Leggero)"]++; else if (mag < 4) magRangesInterp["3-4 (Leggero)"]++; else if (mag < 5) magRangesInterp["4-5 (Moderato)"]++; else magRangesInterp["5+ (Forte/Dannoso)"]++; });
        interpretationText = `📊 **Analisi Automatica Attività Sismica** 📊\n\n`; interpretationText += `**Parametri Ricerca:**\n • Periodo: ${startDate} -> ${endDate}\n • Area: Entro ${radiusKm} km da "${locName}"\n • Magnitudo Minima: ${minMag}\n\n`; interpretationText += `**Risultati Principali (${magnitudes.length} eventi trovati):**\n`; interpretationText += ` • **Magnitudo Media:** ${avgMagnitudeVal.toFixed(2)}. Indica l'intensità media degli eventi.\n`; interpretationText += ` • **Distribuzione Magnitudo:**\n`; let significantEvents = false; for (const range in magRangesInterp) { if (magRangesInterp[range] > 0) { interpretationText += `    - ${range}: ${magRangesInterp[range]} eventi\n`; if (range.includes("Moderato") || range.includes("Forte/Dannoso")) { significantEvents = true; } } } if (!significantEvents) { interpretationText += `    - Nessun evento significativo (>= Magnitudo 4) registrato.\n`; }
        interpretationText += ` • **Trend Magnitudo nel Periodo:** `; if (typeof slope !== 'number' || isNaN(slope) || magnitudes.length < 5) { interpretationText += `Non calcolabile.\n`; } else if (Math.abs(slope) < 0.005) { interpretationText += `Sostanzialmente **stabile**.\n`; } else if (slope > 0) { interpretationText += `Leggero **aumento**.\n`; } else { interpretationText += `Leggero **calo**.\n`; }
        interpretationText += ` • **Profondità Eventi:** `; if (isNaN(avgDepth)) { interpretationText += `Dati profondità non disponibili.\n`; } else { interpretationText += `Media **${avgDepth.toFixed(1)} km**. `; if (shallowCount > deepCount && shallowCount > magnitudes.length * 0.6) { interpretationText += `Prevalentemente **superficiali** (<= 15 km).\n`; } else if (deepCount > shallowCount && deepCount > magnitudes.length * 0.6) { interpretationText += `Prevalentemente **profondi** (> 50 km).\n`; } else { interpretationText += `Profondità **mista**.\n`; } }
        interpretationText += ` • **Distribuzione Oraria:** `; if (mostFrequentHour !== 'N/D') { interpretationText += `Picco attività **${mostFrequentHour}** (${maxHourCount} eventi). `; if (totalHoursWithEvents < 6 && magnitudes.length > 10) { interpretationText += `Attività concentrata.\n`; } else { interpretationText += `Attività distribuita.\n`; } } else { interpretationText += `Nessun pattern orario evidente.\n`; }
        interpretationText += `\n⚠️ **Nota:** Analisi automatica e semplificata. Non sostituisce valutazioni esperte.`;
        interpretationDiv.innerHTML = `<div class="card"><div class="card-body"><h5 class="card-title">Interpretazione Automatica</h5><pre style="white-space: pre-wrap; color: #f0f0f0; font-family: 'Roboto', sans-serif; font-size: 0.95em;">${interpretationText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</pre></div></div>`;
    }
    // === FINE INTERPRETAZIONE MIGLIORATA ===

    // Tabella + paginazione (invariata)
    let currentPage = 1; const rowsPerPage = 10; let currentFeatures = []; let sortDirection = { date: "asc", time: "asc", magnitude: "asc", depth: "asc", place: "asc" };
    function createTableWithPagination(f) { currentFeatures = f; currentPage = 1; renderTable(); }
    function renderTable() { tableContainer.innerHTML = ""; if (!currentFeatures || currentFeatures.length === 0) { tableContainer.innerHTML = "<p class='text-center mt-3'>Nessun dato tabella.</p>"; return; } const sI = (currentPage - 1) * rowsPerPage; const eI = sI + rowsPerPage; const pF = currentFeatures.slice(sI, eI); const t = document.createElement("table"); t.classList.add("table", "table-dark", "table-striped", "table-hover", "table-sm"); const th = document.createElement("thead"); const tb = document.createElement("tbody"); const hs = [{ text: "Data", key: "date" }, { text: "Ora", key: "time" }, { text: "Magn.", key: "magnitude" }, { text: "Prof.(km)", key: "depth" }, { text: "Luogo", key: "place" }]; const hr = document.createElement("tr"); hs.forEach(h => { const e = document.createElement("th"); e.scope = "col"; e.textContent = h.text; e.style.cursor = "pointer"; e.dataset.key = h.key; if (sortDirection[h.key]) { e.innerHTML += sortDirection[h.key] === 'asc' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>'; } e.addEventListener("click", () => sortTable(h.key)); hr.appendChild(e); }); th.appendChild(hr); pF.forEach(f => { const r = document.createElement("tr"); const dC = document.createElement("td"); const tC = document.createElement("td"); const mC = document.createElement("td"); const dpC = document.createElement("td"); const pC = document.createElement("td"); const dT = f.properties.time ? moment(f.properties.time) : null; const d = dT ? dT.format("YYYY-MM-DD") : "N/D"; const tm = dT ? dT.format("HH:mm:ss") : "N/D"; const mg = typeof f.properties.mag === 'number' ? f.properties.mag.toFixed(1) : "N/D"; const dpV = typeof f.geometry.coordinates[2] === 'number' ? f.geometry.coordinates[2].toFixed(1) : "N/D"; const pl = f.properties.place || "N/D"; dC.textContent = d; tC.textContent = tm; mC.textContent = mg; dpC.textContent = dpV; pC.textContent = pl; pC.title = pl; r.appendChild(dC); r.appendChild(tC); r.appendChild(mC); r.appendChild(dpC); r.appendChild(pC); tb.appendChild(r); }); t.appendChild(th); t.appendChild(tb); tableContainer.appendChild(t); createPaginationControls(); }
    function createPaginationControls() { const tP = Math.ceil(currentFeatures.length / rowsPerPage); if (tP <= 1) return; const pD = document.createElement("nav"); pD.setAttribute("aria-label", "Navigazione risultati"); pD.classList.add("d-flex", "justify-content-center", "mt-3"); const ul = document.createElement("ul"); ul.classList.add("pagination", "pagination-sm"); const pLi = document.createElement("li"); pLi.classList.add("page-item"); if (currentPage === 1) pLi.classList.add("disabled"); const pLk = document.createElement("a"); pLk.classList.add("page-link"); pLk.href = "#"; pLk.textContent = "Precedente"; pLk.addEventListener("click", e => { e.preventDefault(); if (currentPage > 1) { currentPage--; renderTable(); } }); pLi.appendChild(pLk); ul.appendChild(pLi); const pILi = document.createElement("li"); pILi.classList.add("page-item", "disabled"); const pIS = document.createElement("span"); pIS.classList.add("page-link"); pIS.textContent = `Pagina ${currentPage} di ${tP}`; pILi.appendChild(pIS); ul.appendChild(pILi); const nLi = document.createElement("li"); nLi.classList.add("page-item"); if (currentPage === tP) nLi.classList.add("disabled"); const nLk = document.createElement("a"); nLk.classList.add("page-link"); nLk.href = "#"; nLk.textContent = "Successiva"; nLk.addEventListener("click", e => { e.preventDefault(); if (currentPage < tP) { currentPage++; renderTable(); } }); nLi.appendChild(nLk); ul.appendChild(nLi); pD.appendChild(ul); tableContainer.appendChild(pD); }
    function sortTable(k) { const d = sortDirection[k] === "asc" ? 1 : -1; currentFeatures.sort((a, b) => { let vA, vB; switch (k) { case "date": case "time": vA = a.properties.time ? new Date(a.properties.time).getTime() : 0; vB = b.properties.time ? new Date(b.properties.time).getTime() : 0; break; case "magnitude": vA = typeof a.properties.mag === 'number' ? a.properties.mag : -Infinity; vB = typeof b.properties.mag === 'number' ? b.properties.mag : -Infinity; break; case "depth": vA = typeof a.geometry.coordinates[2] === 'number' ? a.geometry.coordinates[2] : -Infinity; vB = typeof b.geometry.coordinates[2] === 'number' ? b.geometry.coordinates[2] : -Infinity; break; case "place": vA = a.properties.place || ""; vB = b.properties.place || ""; return vA.localeCompare(vB) * d; default: return 0; }if (vA < vB) return -1 * d; if (vA > vB) return 1 * d; return 0; }); sortDirection[k] = sortDirection[k] === "asc" ? "desc" : "asc"; for (let i in sortDirection) { if (i !== k) { sortDirection[i] = 'asc'; } } renderTable(); }

    // Export CSV (invariato)
    exportCSVBtn.addEventListener("click", function () {
        if (!currentFeatures || currentFeatures.length === 0) {
            if (window.AlertsManager) AlertsManager.showMessage('info', 'Nessun dato da esportare.');
            return;
        }
        let c = "data:text/csv;charset=utf-8,\uFEFF"; // BOM per compatibilità UTF-8
        c += "Data,Ora,Magnitudo,Profondita (km),Latitudine,Longitudine,Luogo\r\n"; // Header

        currentFeatures.forEach(f => {
            const dT = f.properties.time ? moment(f.properties.time) : null;
            const d = dT ? dT.format("YYYY-MM-DD") : "N/D";
            const t = dT ? dT.format("HH:mm:ss") : "N/D";
            const mg = typeof f.properties.mag === 'number' ? f.properties.mag.toFixed(1) : "N/D";
            const dp = typeof f.geometry.coordinates[2] === 'number' ? f.geometry.coordinates[2].toFixed(1) : "N/D";
            const lt = typeof f.geometry.coordinates[1] === 'number' ? f.geometry.coordinates[1].toFixed(4) : "N/D";
            const lg = typeof f.geometry.coordinates[0] === 'number' ? f.geometry.coordinates[0].toFixed(4) : "N/D";
            let p = f.properties.place || "N/D";
            // Escape di virgole e doppi apici nel luogo
            if (p.includes('"') || p.includes(',')) {
                p = `"${p.replace(/"/g, '""')}"`;
            }
            let r = `${d},${t},${mg},${dp},${lt},${lg},${p}\r\n`;
            c += r;
        });

        // -- Sezione Interpretazione RIMOSSA --
        // if (interpretationText) {
        //     const clI = interpretationText.replace(/"/g, '""').replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/\*\*(.*?)\*\*/g, '$1');
        //     c += `\r\n"Interpretazione Automatica","${clI}"\r\n`;
        // }
        // -- Fine Sezione Rimossa --

        const eU = encodeURI(c);
        const l = document.createElement("a");
        l.setAttribute("href", eU);
        l.setAttribute("download", "report_terremoti.csv"); // Mantenuto nome file originale
        document.body.appendChild(l);
        l.click();
        document.body.removeChild(l);
        if (window.AlertsManager) AlertsManager.showMessage('success', 'Esportazione CSV completata.');
    });    // Export PDF (invariato)
    exportPDFBtn.addEventListener("click", async function () { if (!currentFeatures || currentFeatures.length === 0) { if (window.AlertsManager) AlertsManager.showMessage('info', 'Nessun dato PDF.'); return; } if (!window.jspdf || !window.html2canvas || !window.Chart || !window.myChart) { if (window.AlertsManager) AlertsManager.showMessage('error', 'Librerie/Grafico non pronti PDF.'); return; } const pL = document.getElementById("pdfLoader"); const pE = document.getElementById("pdfError"); pL.style.display = "flex"; pE.style.display = "none"; try { const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" }); const pW = pdf.internal.pageSize.getWidth(); const pH = pdf.internal.pageSize.getHeight(); const m = 40; const uW = pW - 2 * m; const uH = pH - 2 * m; const hH = uH / 2; let yP = m; function addChartImage(iD, x, y, mW, mH) { try { const iP = pdf.getImageProperties(iD); const s = Math.min(mW / iP.width, mH / iP.height); const dW = iP.width * s; const dH = iP.height * s; const oX = x + (mW - dW) / 2; pdf.addImage(iD, "PNG", oX, y, dW, dH); return dH; } catch (e) { console.error("PDF addChartImage Error:", e); pdf.setFont("helvetica", "italic").text("Errore img", x, y + 10); return 15; } } async function generateChartImage(dI, t) { if (!window.myChart?.config?.data?.datasets?.[dI]) { return null; } let tC = document.createElement("canvas"); tC.width = 800; tC.height = 400; const oO = window.myChart.config.options; const sO = JSON.parse(JSON.stringify(oO.scales || {})); const dt = { labels: window.myChart.config.data.labels, datasets: [window.myChart.config.data.datasets[dI]] }; const cf = { type: window.myChart.config.data.datasets[dI].type || 'line', data: dt, options: { responsive: false, animation: false, maintainAspectRatio: true, plugins: { title: { display: true, text: t, font: { size: 14 } }, legend: { display: false } }, scales: sO } }; let iD = null; let tCh = null; try { const cX = tC.getContext("2d"); if (!cX) throw new Error("No ctx"); tCh = new Chart(cX, cf); await new Promise(r => setTimeout(r, 300)); iD = tC.toDataURL("image/png", 1.0); } catch (cE) { console.error(`PDF generateChartImage Error '${t}':`, cE); iD = null; } finally { if (tCh?.destroy) { tCh.destroy(); } tC.remove(); } return iD; } pdf.setFontSize(18); pdf.setFont("helvetica", "bold"); pdf.text("Report Terremoti - Geo Shock Italia", pW / 2, yP, { align: 'center' }); yP += 30; let cIC = null; if (chartCanvas?.style.display !== 'none') { try { cIC = chartCanvas.toDataURL("image/png", 1.0); } catch (e) { console.error("PDF capture combined Error:", e); } } if (cIC) { yP += addChartImage(cIC, m, yP, uW, hH - 10); yP += 10; } else { pdf.setFont("helvetica", "italic").text("Grafico combinato non disponibile.", m, yP); yP += 15; } const cI0 = await generateChartImage(0, window.myChart.config.data.datasets[0].label || "Dataset 1"); if (cI0) { if (yP + (hH - 10) > pH - m) { pdf.addPage(); yP = m; } yP += addChartImage(cI0, m, yP, uW, hH - 10); yP += 10; } else { if (yP + 15 > pH - m) { pdf.addPage(); yP = m; } pdf.setFont("helvetica", "italic").text("Grafico Dataset 1 non disponibile.", m, yP); yP += 15; } const cIs = []; for (let i = 1; i < 5; i++) { if (window.myChart.config.data.datasets[i]) { const img = await generateChartImage(i, window.myChart.config.data.datasets[i].label || `Dataset ${i + 1}`); cIs.push(img); } else { cIs.push(null); } } for (let i = 0; i < cIs.length; i += 2) { pdf.addPage(); yP = m; const i1 = cIs[i]; const i2 = (i + 1 < cIs.length) ? cIs[i + 1] : null; if (i1) { yP += addChartImage(i1, m, yP, uW, hH - 10); yP += 10; } else { pdf.setFont("helvetica", "italic").text(`Grafico Dataset ${i + 2} non disp.`, m, yP); yP += 15; } if (i2) { if (yP + (hH - 10) > pH - m) { pdf.addPage(); yP = m; } yP += addChartImage(i2, m, yP, uW, hH - 10); yP += 10; } else if (i + 1 < cIs.length) { if (yP + 15 > pH - m) { pdf.addPage(); yP = m; } pdf.setFont("helvetica", "italic").text(`Grafico Dataset ${i + 3} non disp.`, m, yP); yP += 15; } } pdf.addPage(); yP = m; function addTextWithPageBreaks(pI, ls, sX, sY, lH, pM, uPH, tPH) { let cY = sY; ls.forEach(l => { if (cY + lH > tPH - pM) { pI.addPage(); cY = pM; } pI.text(l, sX, cY); cY += lH; }); return cY; } if (interpretationText) { pdf.setFontSize(12); pdf.setFont("helvetica", "bold"); pdf.text("Interpretazione Automatica", m, yP); yP += 20; pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); const iLs = pdf.splitTextToSize(interpretationText.replace(/\*\*(.*?)\*\*/g, '$1'), uW); yP = addTextWithPageBreaks(pdf, iLs, m, yP, 11, m, uH, pH); yP += 15; } if (currentFeatures.length > 0) { if (yP + 30 > pH - m) { pdf.addPage(); yP = m; } pdf.setFontSize(12); pdf.setFont("helvetica", "bold"); pdf.text("Dati Tabellari (Primi Eventi)", m, yP); yP += 20; pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); const tHs = ["Data", "Ora", "Magn.", "Prof(km)", "Lat", "Lon", "Luogo"]; const cWs = [55, 45, 35, 45, 45, 45, uW - (55 + 45 + 35 + 45 + 45 + 45) - 5]; let xP = m; tHs.forEach((h, i) => { pdf.text(h, xP, yP); xP += cWs[i] + 5; }); yP += 12; pdf.setLineWidth(0.5); pdf.line(m, yP - 8, pW - m, yP - 8); const rTP = Math.min(currentFeatures.length, 50); for (let i = 0; i < rTP; i++) { const f = currentFeatures[i]; if (yP + 10 > pH - m) { pdf.addPage(); yP = m; xP = m; tHs.forEach((h, j) => { pdf.text(h, xP, yP); xP += cWs[j] + 5; }); yP += 12; pdf.line(m, yP - 8, pW - m, yP - 8); } const dT = f.properties.time ? moment(f.properties.time) : null; const rD = [dT ? dT.format("YYYY-MM-DD") : "N/D", dT ? dT.format("HH:mm:ss") : "N/D", typeof f.properties.mag === 'number' ? f.properties.mag.toFixed(1) : "N/D", typeof f.geometry.coordinates[2] === 'number' ? f.geometry.coordinates[2].toFixed(1) : "N/D", typeof f.geometry.coordinates[1] === 'number' ? f.geometry.coordinates[1].toFixed(4) : "N/D", typeof f.geometry.coordinates[0] === 'number' ? f.geometry.coordinates[0].toFixed(4) : "N/D", f.properties.place || "N/D"]; xP = m; rD.forEach((cD, j) => { const tx = pdf.splitTextToSize(cD.toString(), cWs[j]); pdf.text(tx[0], xP, yP); xP += cWs[j] + 5; }); yP += 10; } } pdf.save("report_terremoti_GeoShockItalia.pdf"); pL.style.display = "none"; if (window.AlertsManager) AlertsManager.showMessage("success", "PDF generato!", 4000); } catch (error) { console.error("PDF Generation Error:", error); pL.style.display = "none"; pE.textContent = `Errore PDF: ${error.message || error}`; pE.style.display = "block"; if (window.AlertsManager) AlertsManager.showMessage("error", `Errore generazione PDF: ${error.message || error}`); } });

    // Reset form e risultati (invariato)
    resetButton.addEventListener("click", function () { localStorage.removeItem("startTime"); localStorage.removeItem("endTime"); localStorage.removeItem("minMag"); localStorage.removeItem("radius"); earthquakeForm.reset(); try { var n = new Date(); var y = n.getFullYear(); var mo = (n.getMonth() + 1).toString().padStart(2, '0'); var d = n.getDate().toString().padStart(2, '0'); var h = n.getHours().toString().padStart(2, '0'); var mi = n.getMinutes().toString().padStart(2, '0'); var cDT = `${y}-${mo}-${d}T${h}:${mi}`; var eTI = document.getElementById("endTime"); if (eTI) eTI.setAttribute("max", cDT); } catch (e) { console.error("Errore reset data max:", e); } clearResults(true); resetButton.style.display = "none"; });

}); // Fine DOMContentLoaded
//FUNZIONATE