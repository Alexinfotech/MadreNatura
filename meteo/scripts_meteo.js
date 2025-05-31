// File: scripts_meteo.js

document.addEventListener("DOMContentLoaded", function () {
    // -----------------------------
    // Riferimenti DOM e Stato Globale
    // -----------------------------
    const mapContainer = document.getElementById("map");
    const mapLoader = document.getElementById("map-loader");
    const cityWeatherDetailsContainer = document.getElementById("cityWeatherDetails");
    const weatherListDiv = document.getElementById("weatherList");
    const regionNameHeader = document.getElementById("regionName");
    const resetViewBtn = document.getElementById("resetViewBtn");
    let allWeatherData = {}, globalViewCities = [], svgElement = null, svgPaths = {};
    let mapWeatherIconsGroup = null, originalViewBoxString = null, activeRegionId = null;
    let activeRegionalCityElement = null, isRegionalFocusActive = false;
    const FOCUSED_MARKER_CLASS = 'focused-marker';
    let projectionParams = { mercator: false, leftLongitude: null, topLatitude: null, rightLongitude: null, bottomLatitude: null, svgViewBox: { x: 0, y: 0, width: 0, height: 0 } };
    let threeDayForecastCache = {}; // Cache per previsioni 3 giorni

    // -----------------------------
    // Costanti di configurazione
    // -----------------------------
    const SVG_NS = "http://www.w3.org/2000/svg";
    const XLINK_NS = "http://www.w3.org/1999/xlink";
    const ALWAYS_VISIBLE_CITIES = ["Aosta", "Torino", "Milano", "Genova", "Trento", "Venezia", "Trieste", "Bologna", "Firenze", "Perugia", "Ancona", "L'Aquila", "Roma", "Campobasso", "Napoli", "Bari", "Matera", "Cagliari", "Palermo", "Reggio Calabria"];
    const ICON_SIZE_MAP_GLOBAL = 22, ICON_SIZE_MAP_REGION = 18;
    const LABEL_FONT_SIZE_GLOBAL = 13, LABEL_FONT_SIZE_REGION = 14;
    const LABEL_OFFSET_GLOBAL = 4, LABEL_OFFSET_REGION = 5;
    const ICON_SIZE_CARD = 50;
    const ICON_SIZE_FORECAST_DAY = 35; // Dimensione icona previsione giorno

    // -----------------------------
    // Funzioni Helper
    // -----------------------------
    function showUserMessage(type, message) {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (window.AlertsManager?.showMessage) { window.AlertsManager.showMessage(type, message, 6000); }
        else { console.warn("AlertsManager not found, using console for message:", message); }
    }

    function getWeatherIconUrl(weatherCode, isDay) {
        let iconBaseName = "default";
        // Se isDay è 1, true, undefined o null, si assume giorno (stringa vuota), altrimenti "_notte"
        const dayNight = (isDay === 1 || isDay === true || isDay === undefined || isDay === null) ? "" : "_notte";
        const code = parseInt(weatherCode, 10);

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
            case 85: iconBaseName = `nevicate_leggere${dayNight}`; break; // Showers -> Nevicate
            case 86: iconBaseName = `nevicate_intense${dayNight}`; break; // Showers -> Nevicate
            // --- Manca gestione temporali ---
            case 95: iconBaseName = `temporale${dayNight}`; break;
            case 96: iconBaseName = `temporale_con_grandine_leggera${dayNight}`; break;
            case 97: iconBaseName = `temporale_con_grandine_leggera${dayNight}`; break;
            case 99: iconBaseName = `temporale_con_grandine_forte${dayNight}`; break;
            default: iconBaseName = "default";
        }
        // Manca un fallback specifico per i temporali se non commentati sopra
        if ([95, 96, 99].includes(code)) {
            iconBaseName = `temporale${dayNight}`; // Fallback generico temporale
        }


        return `icons/${iconBaseName}.svg`;
    }

    function getWeatherDescription(code) {
        const descriptions = { 0: 'Sereno', 1: 'Prev. sereno', 2: 'Parz. nuvoloso', 3: 'Coperto', 45: 'Nebbia', 48: 'Nebbia c/brina', 51: 'Pioviggine L.', 53: 'Pioviggine', 55: 'Pioviggine F.', 56: 'Piov. gelata L.', 57: 'Piov. gelata F.', 61: 'Pioggia L.', 63: 'Pioggia', 65: 'Pioggia F.', 66: 'Piog. gelata L.', 67: 'Piog. gelata F.', 71: 'Neve L.', 73: 'Neve', 75: 'Neve F.', 77: 'Grani neve', 80: 'Rovescio L.', 81: 'Rovescio', 82: 'Rovescio viol.', 85: 'Rovescio neve L.', 86: 'Rov. neve F.', 95: 'Temporale', 96: 'Temp. c/grandine L.', 99: 'Temp. c/grandine F.', };
        return descriptions[code] || 'N/D';
    }
    function formatWindSpeed(speed) {
        if (typeof speed !== 'number') return 'N/D'; const kmh = speed; return `${kmh.toFixed(1)} km/h`;
    }
    function formatUVIndex(uv) {
        if (uv === null || uv === undefined || uv === 'N/D' || uv < 0) return 'N/D'; const val = Math.round(uv); let risk = ''; if (val <= 2) risk = '(Basso)'; else if (val <= 5) risk = '(Moderato)'; else if (val <= 7) risk = '(Alto)'; else if (val <= 10) risk = '(Molto Alto)'; else risk = '(Estremo)'; return `${val} ${risk}`;
    }
    function formatWindDirection(degrees) {
        if (degrees === null || degrees === undefined || degrees === 'N/D' || !isFinite(degrees)) { return ''; } const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']; const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16; return directions[index] || '';
    }
    function formatForecastDate(dateString, index) {
        if (index === 0) return "Oggi";
        if (index === 1) return "Domani";
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${day}/${month}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Fallback
        }
    }


    // --- Funzioni Mappa e Coordinate (INVARIATE) ---
    function convertLatLonToXY_original(lat, lon) {
        if (!projectionParams.mercator || isNaN(projectionParams.leftLongitude) || isNaN(projectionParams.rightLongitude) || isNaN(projectionParams.topLatitude) || isNaN(projectionParams.bottomLatitude) || !projectionParams.svgViewBox || projectionParams.svgViewBox.width <= 0 || projectionParams.svgViewBox.height <= 0) { console.error("Invalid projection params.", projectionParams); return null; } const mapLonLeft = projectionParams.leftLongitude; const mapLonRight = projectionParams.rightLongitude; const mapLatTop = projectionParams.topLatitude; const mapLatBottom = projectionParams.bottomLatitude; const mapWidth = projectionParams.svgViewBox.width; const mapHeight = projectionParams.svgViewBox.height; const mapX = projectionParams.svgViewBox.x; const mapY = projectionParams.svgViewBox.y; if (mapLonRight === mapLonLeft) return null; let x = mapX + ((lon - mapLonLeft) / (mapLonRight - mapLonLeft)) * mapWidth; const latRad = lat * Math.PI / 180; const mapLatTopRad = mapLatTop * Math.PI / 180; const mapLatBottomRad = mapLatBottom * Math.PI / 180; const sinLatRad = Math.sin(latRad); const sinMapLatTopRad = Math.sin(mapLatTopRad); const sinMapLatBottomRad = Math.sin(mapLatBottomRad); if (Math.abs(sinLatRad) >= 1 || Math.abs(sinMapLatTopRad) >= 1 || Math.abs(sinMapLatBottomRad) >= 1) return null; const worldMapWidth = ((mapWidth / (mapLonRight - mapLonLeft)) * 360) / (2 * Math.PI); const calculateMercatorY = (sinLat) => (worldMapWidth / 2 * Math.log((1 + sinLat) / (1 - sinLat))); const mapOffsetY = calculateMercatorY(sinMapLatTopRad); const yMerc = calculateMercatorY(sinLatRad); const mapOffsetYBottom = calculateMercatorY(sinMapLatBottomRad); if (isNaN(mapOffsetY) || isNaN(yMerc) || isNaN(mapOffsetYBottom)) return null; const yRangeMerc = mapOffsetY - mapOffsetYBottom; const yFraction = (Math.abs(yRangeMerc) < 1e-9) ? 0.5 : (mapOffsetY - yMerc) / yRangeMerc; let y = mapY + yFraction * mapHeight; if (isNaN(x) || isNaN(y)) return null; return { x, y };
    }
    function handleRegionalIconClick(clickedGroupElement, cityInfo) {
        if (!clickedGroupElement) return; const cityNameLabel = clickedGroupElement.querySelector('.regional-map-label-interactive'); if (!cityNameLabel) { console.warn("Label not found:", clickedGroupElement); return; } if (activeRegionalCityElement === clickedGroupElement) { cityNameLabel.setAttribute('visibility', 'hidden'); clickedGroupElement.classList.remove(FOCUSED_MARKER_CLASS); showAllRegionalIcons(); } else { if (activeRegionalCityElement) { const previousLabel = activeRegionalCityElement.querySelector('.regional-map-label-interactive'); if (previousLabel) previousLabel.setAttribute('visibility', 'hidden'); activeRegionalCityElement.classList.remove(FOCUSED_MARKER_CLASS); } hideAllRegionalIconsExcept(clickedGroupElement); cityNameLabel.setAttribute('visibility', 'visible'); clickedGroupElement.classList.add(FOCUSED_MARKER_CLASS); activeRegionalCityElement = clickedGroupElement; isRegionalFocusActive = true; }
    }
    function hideAllRegionalIconsExcept(exceptionElement) {
        if (!mapWeatherIconsGroup) return; const groups = mapWeatherIconsGroup.querySelectorAll('g.map-marker.regional-marker'); groups.forEach(group => { group.setAttribute('visibility', group === exceptionElement ? 'visible' : 'hidden'); });
    }
    function showAllRegionalIcons() {
        if (!mapWeatherIconsGroup) return; const groups = mapWeatherIconsGroup.querySelectorAll('g.map-marker.regional-marker'); groups.forEach(group => { group.setAttribute('visibility', 'visible'); group.classList.remove(FOCUSED_MARKER_CLASS); const label = group.querySelector('.regional-map-label-interactive'); if (label) { label.setAttribute('visibility', 'hidden'); } }); activeRegionalCityElement = null; isRegionalFocusActive = false;
    }
    function createMapIconElement(cityInfo, x, y, size, isGlobalView) {
        const weathercode = cityInfo.weathercode ?? 99; const is_day = cityInfo.is_day ?? 1; const iconUrl = getWeatherIconUrl(weathercode, is_day); const cityName = cityInfo.city || "N/D"; const cityId = `${cityName.replace(/[^a-zA-Z0-9]/g, '-')}-${cityInfo.lat}-${cityInfo.lon}`; const group = document.createElementNS(SVG_NS, "g"); group.classList.add("map-marker"); group.setAttribute("id", `marker-${cityId}`); const img = document.createElementNS(SVG_NS, "image"); img.setAttributeNS(XLINK_NS, "href", iconUrl); img.setAttribute("x", x - size / 2); img.setAttribute("y", y - size / 2); img.setAttribute("width", size); img.setAttribute("height", size); img.classList.add("map-weather-icon"); const title = document.createElementNS(SVG_NS, "title"); const tempString = typeof cityInfo.temperature === "number" ? `${cityInfo.temperature.toFixed(1)}°C` : (cityInfo.temperature ?? "N/D"); title.textContent = `${cityName}: ${tempString}`; group.appendChild(title); img.onerror = function () { this.onerror = null; this.setAttributeNS(XLINK_NS, "href", "icons/default.svg"); console.warn(`Icon fallback: ${cityName}`); title.textContent = `${cityName}: Icona N/D`; }; group.appendChild(img); const text = document.createElementNS(SVG_NS, "text"); text.textContent = cityName; text.setAttribute("x", x); text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "hanging"); if (isGlobalView) { group.classList.add("global-marker"); text.setAttribute("y", y + size / 2 + LABEL_OFFSET_GLOBAL); text.setAttribute("font-size", LABEL_FONT_SIZE_GLOBAL); text.classList.add("global-map-label"); img.style.cursor = 'default'; group.appendChild(text); } else { group.classList.add("regional-marker"); text.setAttribute("y", y + size / 2 + LABEL_OFFSET_REGION); text.setAttribute("font-size", LABEL_FONT_SIZE_REGION); text.classList.add("regional-map-label-interactive"); text.setAttribute("visibility", "hidden"); group.appendChild(text); group.addEventListener("click", (event) => { event.stopPropagation(); handleRegionalIconClick(group, cityInfo); }); } return group;
    }
    function displayWeatherIconsOnMap(citiesToShow, isGlobalView = false) {
        if (!mapWeatherIconsGroup) { console.error("Icon group not init."); return; } mapWeatherIconsGroup.innerHTML = ""; activeRegionalCityElement = null; isRegionalFocusActive = false; if (!citiesToShow || citiesToShow.length === 0) { console.log("No cities to display."); return; } const iconSize = isGlobalView ? ICON_SIZE_MAP_GLOBAL : ICON_SIZE_MAP_REGION; citiesToShow.forEach(cityInfo => { if (typeof cityInfo.lat !== "number" || typeof cityInfo.lon !== "number") { console.warn(`Skip invalid coords: ${cityInfo.city}`); return; } const coords = convertLatLonToXY_original(cityInfo.lat, cityInfo.lon); if (coords) { mapWeatherIconsGroup.appendChild(createMapIconElement(cityInfo, coords.x, coords.y, iconSize, isGlobalView)); } else { console.warn(`Cannot convert coords: ${cityInfo.city}`); } });
    }

    // -----------------------------
    // Mostra card meteo
    // -----------------------------
    function displayWeatherInCards(citiesToShow, title = "Dettaglio Meteo") {
        weatherListDiv.innerHTML = ""; // Pulisce card precedenti
        regionNameHeader.textContent = title; // Imposta titolo sezione

        if (citiesToShow && citiesToShow.length > 0) {
            citiesToShow.forEach(cityInfo => {
                // --- Estrazione Dati ---
                const cityName = cityInfo.city || "N/D";
                const latitude = cityInfo.lat;
                const longitude = cityInfo.lon;
                const temperature = cityInfo.temperature ?? 'N/D';
                const apparent_temperature = cityInfo.apparent_temperature ?? 'N/D';
                const windspeed = cityInfo.windspeed ?? 'N/D';
                const time = cityInfo.time ?? 'N/D';
                const weathercode = cityInfo.weathercode ?? 99;
                const is_day = cityInfo.is_day ?? 1;
                const description = cityInfo.description || getWeatherDescription(weathercode);
                const temp_max = cityInfo.temperature_max ?? 'N/D';
                const temp_min = cityInfo.temperature_min ?? 'N/D';
                const humidity = cityInfo.relative_humidity ?? 'N/D';
                const uv_index_max = cityInfo.uv_index_max ?? 'N/D';
                const sunrise = cityInfo.sunrise ?? 'N/D';
                const sunset = cityInfo.sunset ?? 'N/D';
                const wind_direction_deg = cityInfo.wind_direction ?? null;
                const errorNote = cityInfo.error ? `<p class="card-text text-danger small mb-0 mt-2 px-1" title="Dettaglio: ${cityInfo.error}"><i class="fas fa-exclamation-triangle"></i> Info Errata/Mancante</p>` : "";

                // --- Formattazione Dati ---
                const iconUrl = getWeatherIconUrl(weathercode, is_day);
                const tempText = typeof temperature === 'number' ? `${temperature.toFixed(1)}°C` : String(temperature);
                const apparentTempText = typeof apparent_temperature === 'number' ? `${apparent_temperature.toFixed(1)}°C` : '';
                const tempMinMaxText = (typeof temp_min === 'number' && typeof temp_max === 'number') ? `${temp_min.toFixed(1)}°C / ${temp_max.toFixed(1)}°C` : 'N/D';
                const windSpeedText = formatWindSpeed(windspeed);
                const windDirText = formatWindDirection(wind_direction_deg);
                const windFullText = windSpeedText !== 'N/D' ? `${windSpeedText}${windDirText ? ' ' + windDirText : ''}` : 'N/D';
                const humidityText = typeof humidity === 'number' ? `${humidity}%` : 'N/D';
                const uvMaxText = uv_index_max !== 'N/D' && uv_index_max !== null ? formatUVIndex(uv_index_max) : 'N/D';
                const sunriseText = sunrise !== 'N/D' ? `${sunrise}` : 'N/D';
                const sunsetText = sunset !== 'N/D' ? `${sunset}` : 'N/D';
                const timeText = time && time !== "N/D" ? `<small class="text-muted">(Ore ${time})</small>` : "";

                // --- Costruzione HTML Card ---
                const cardHtml = `
                <div class="col-md-6 col-lg-4 mb-4 d-flex align-items-stretch">
                    <div class="card weather-card w-100" tabindex="0" role="button"
                         aria-expanded="false" aria-label="Meteo per ${cityName}, clicca per dettagli e previsione 3 giorni"
                         data-lat="${latitude}" data-lon="${longitude}" data-city-name="${cityName}">
                        <div class="card-header weather-card-header text-truncate" title="${cityName}">
                            ${cityName} ${timeText}
                        </div>
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3 weather-basic-info">
                                <img src="${iconUrl}" alt="${description}" class="weather-icon flex-shrink-0 me-3" style="width: ${ICON_SIZE_CARD}px; height: ${ICON_SIZE_CARD}px;" onerror="this.onerror=null; this.src='icons/default.svg'; this.alt='Icona N/D';">
                                <div class="flex-grow-1">
                                    <h5 class="card-title temp-main mb-0">${tempText}</h5>
                                    <p class="card-text description mb-0">${description}</p>
                                    ${apparentTempText ? `<p class="card-text apparent-temp-text small mb-0 mt-1">Percepita: ${apparentTempText}</p>` : ''}
                                </div>
                            </div>

                            <div class="weather-details-more">
                                <div class="weather-details-grid">
                                    <div class="row detail-row">
                                        <div class="col-5 detail-label"><i class="fas fa-thermometer-half"></i> Min/Max:</div>
                                        <div class="col-7 detail-value">${tempMinMaxText}</div>
                                    </div>
                                    <div class="row detail-row">
                                        <div class="col-5 detail-label"><i class="fas fa-tint"></i> Umidità:</div>
                                        <div class="col-7 detail-value">${humidityText}</div>
                                    </div>
                                    <div class="row detail-row">
                                        <div class="col-5 detail-label"><i class="fas fa-wind"></i> Vento:</div>
                                        <div class="col-7 detail-value">${windFullText}</div>
                                    </div>
                                    <div class="row detail-row">
                                        <div class="col-5 detail-label"><i class="fas fa-sun"></i> UV Max:</div>
                                        <div class="col-7 detail-value">${uvMaxText}</div>
                                    </div>
                                    <div class="row detail-row">
                                        <div class="col-5 detail-label"><i class="fas fa-arrows-alt-h"></i> Alba/Tram.:</div>
                                        <div class="col-7 detail-value">${sunriseText} / ${sunsetText}</div>
                                    </div>
                                </div>

                                <div class="three-day-forecast-container mt-3 pt-3 border-top border-secondary border-opacity-25" style="display: none;">
                                    <h6 class="three-day-forecast-title mb-2">Previsione 3 Giorni</h6>
                                    <div class="three-day-forecast-content d-flex justify-content-around text-center">
                                        <!-- Placeholder previsione 3 giorni -->
                                    </div>
                                </div>

                            </div>
                             ${errorNote}
                        </div>
                         <div class="card-footer weather-card-footer text-center py-1" aria-hidden="true">
                             <i class="fas fa-chevron-down expand-indicator"></i>
                         </div>
                    </div>
                </div>`;
                weatherListDiv.insertAdjacentHTML("beforeend", cardHtml);
            });
            cityWeatherDetailsContainer.classList.add("visible");
        } else {
            cityWeatherDetailsContainer.classList.remove("visible");
            setTimeout(() => {
                if (!cityWeatherDetailsContainer.classList.contains("visible")) {
                    regionNameHeader.textContent = "";
                }
            }, 500); // Ritardo per animazione fade out
        }
    }


    // --- Funzioni Mappa, Reset, Proiezione (INVARIATE) ---
    function handleRegionClick(regionId) {
        if (!svgElement || !svgPaths[regionId] || regionId === activeRegionId) { return; } showAllRegionalIcons(); activeRegionId = regionId; Object.values(svgPaths).forEach(p => p.classList.remove("active-region")); const clickedPath = svgPaths[regionId]; clickedPath.classList.add("active-region"); try { const bbox = clickedPath.getBBox(); if (!bbox || bbox.width === 0 || bbox.height === 0) throw new Error("BBox invalid"); const pad = 0.15, pX = bbox.width * pad, pY = bbox.height * pad; const vX = bbox.x - pX / 2, vY = bbox.y - pY / 2, vW = bbox.width + pX, vH = bbox.height + pY; svgElement.setAttribute("viewBox", `${vX} ${vY} ${vW} ${vH}`); } catch (e) { console.error(`Zoom error ${regionId}:`, e); showUserMessage("error", "Zoom error."); resetView(); return; } const cities = allWeatherData[regionId] || []; const titleElement = clickedPath.querySelector("title"); const regionTitle = titleElement?.textContent || clickedPath.getAttribute("title") || regionId; displayWeatherIconsOnMap(cities, false); displayWeatherInCards(cities, regionTitle); if (resetViewBtn) resetViewBtn.classList.add("visible");
    }
    function resetView() {
        if (!svgElement || !originalViewBoxString) return; console.log("Resetting view..."); showAllRegionalIcons(); activeRegionId = null; Object.values(svgPaths).forEach(p => p.classList.remove("active-region")); svgElement.setAttribute("viewBox", originalViewBoxString); displayWeatherIconsOnMap(globalViewCities, true); displayWeatherInCards(globalViewCities, "Meteo Città Principali"); if (resetViewBtn) resetViewBtn.classList.remove("visible");
    }
    function getProjectionParameters(svgDocumentElement) {
        let ammapElement = null; const defsElement = svgDocumentElement.querySelector(":scope > defs"); if (defsElement) { ammapElement = defsElement.querySelector("*|ammap"); if (!ammapElement) { for (const child of defsElement.children) { if (child.hasAttribute("projection") && child.hasAttribute("leftLongitude")) { ammapElement = child; break; } } } } if (!ammapElement) { ammapElement = svgDocumentElement.querySelector(":scope > *|ammap"); if (!ammapElement) { for (const child of svgDocumentElement.children) { if (child.hasAttribute("projection") && child.hasAttribute("leftLongitude")) { ammapElement = child; break; } } } } if (!ammapElement) { console.error("<ammap> not found."); return false; } const proj = ammapElement.getAttribute("projection"); projectionParams.mercator = (proj === "mercator"); projectionParams.leftLongitude = parseFloat(ammapElement.getAttribute("leftLongitude")); projectionParams.topLatitude = parseFloat(ammapElement.getAttribute("topLatitude")); projectionParams.rightLongitude = parseFloat(ammapElement.getAttribute("rightLongitude")); projectionParams.bottomLatitude = parseFloat(ammapElement.getAttribute("bottomLatitude")); let viewBoxOk = false; originalViewBoxString = svgDocumentElement.getAttribute("viewBox"); if (originalViewBoxString) { const vbParts = originalViewBoxString.trim().split(/[\s,]+/); if (vbParts.length === 4) { const [x, y, w, h] = vbParts.map(parseFloat); if (![x, y, w, h].some(isNaN) && w > 0 && h > 0) { projectionParams.svgViewBox = { x, y, width: w, height: h }; viewBoxOk = true; } else { console.warn("Invalid original viewBox."); } } else { console.warn("Invalid original viewBox format."); } } else { console.warn("Original viewBox attribute not found."); } if (!viewBoxOk) { try { const bbox = svgDocumentElement.getBBox(); if (bbox && bbox.width > 0 && bbox.height > 0) { const x = bbox.x || 0; const y = bbox.y || 0; const w = bbox.width; const h = bbox.height; projectionParams.svgViewBox = { x, y, width: w, height: h }; originalViewBoxString = `${x} ${y} ${w} ${h}`; svgDocumentElement.setAttribute("viewBox", originalViewBoxString); viewBoxOk = true; console.log("Generated viewBox from getBBox:", originalViewBoxString); } else { console.error("SVG root getBBox failed."); } } catch (e) { console.error("SVG root getBBox error:", e); } } const geoParamsValid = projectionParams.mercator && !isNaN(projectionParams.leftLongitude) && !isNaN(projectionParams.topLatitude) && !isNaN(projectionParams.rightLongitude) && !isNaN(projectionParams.bottomLatitude); if (!geoParamsValid || !viewBoxOk) { console.error("Projection parameter validation failed!"); return false; } console.log("Projection params OK."); return true;
    }

    // --- Listener Click Card ---
    function setupCardClickListener() {
        if (!weatherListDiv) {
            console.error("Weather list container not found, cannot set up card click listener.");
            return;
        }

        weatherListDiv.addEventListener('click', function (event) {
            const clickedCard = event.target.closest('.weather-card');
            if (!clickedCard) return;

            const wasExpanded = clickedCard.classList.contains('is-expanded');
            const forecastContainer = clickedCard.querySelector('.three-day-forecast-container'); // Contenitore previsione
            const forecastContentDiv = clickedCard.querySelector('.three-day-forecast-content'); // Div per il contenuto

            // Chiudi tutte le altre card aperte
            const allCards = weatherListDiv.querySelectorAll('.weather-card.is-expanded');
            allCards.forEach(card => {
                if (card !== clickedCard) {
                    card.classList.remove('is-expanded');
                    card.setAttribute('aria-expanded', 'false');
                    const otherForecastContainer = card.querySelector('.three-day-forecast-container');
                    if (otherForecastContainer) otherForecastContainer.style.display = 'none'; // Nascondi previsione quando chiudi
                }
            });

            // Toggle stato espanso della card cliccata
            clickedCard.classList.toggle('is-expanded', !wasExpanded);
            clickedCard.setAttribute('aria-expanded', !wasExpanded);

            // Gestione caricamento/visualizzazione previsione 3 giorni
            if (!wasExpanded) { // Se la card è stata APPENA espansa
                forecastContainer.style.display = 'block'; // Mostra il contenitore della previsione
                const lat = clickedCard.dataset.lat;
                const lon = clickedCard.dataset.lon;
                const cityName = clickedCard.dataset.cityName; // Recupera nome città

                if (lat && lon && forecastContentDiv) {
                    const cacheKey = `${lat}_${lon}`;

                    // Controlla cache
                    if (threeDayForecastCache[cacheKey]) {
                        console.log(`Using cached 3-day forecast for ${cityName}`);
                        renderThreeDayForecast(threeDayForecastCache[cacheKey], forecastContentDiv);
                    } else {
                        console.log(`Fetching 3-day forecast for ${cityName} (${lat}, ${lon})`);
                        fetchAndRenderThreeDayForecast(lat, lon, forecastContentDiv, cacheKey, cityName);
                    }
                } else {
                    console.error("Missing lat/lon or forecast content div for card:", clickedCard);
                    if (forecastContentDiv) forecastContentDiv.innerHTML = `<div class="text-warning small p-1">Dati Lat/Lon mancanti.</div>`;
                }
            } else { // Se la card è stata APPENA chiusa
                forecastContainer.style.display = 'none'; // Nascondi il contenitore della previsione
            }
        });

        // Gestione tastiera
        weatherListDiv.addEventListener('keydown', function (event) {
            const focusedCard = event.target.closest('.weather-card');
            if (!focusedCard) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                focusedCard.click(); // Simula il click per aprire/chiudere e caricare
            }
        });
        console.log("Card click and keyboard listeners set up.");
    }


    // --- Funzioni per Fetch e Render Previsione 3 Giorni ---

    /**
     * Effettua la chiamata API a Open-Meteo per ottenere la previsione a 3 giorni.
     */
    async function fetchAndRenderThreeDayForecast(lat, lon, targetDiv, cacheKey, cityName) {
        // Mostra loader
        targetDiv.innerHTML = `<div class="forecast-loader text-center p-2"><i class="fas fa-spinner fa-spin me-2"></i>Caricamento 3 giorni...</div>`;

        // Costruisci l'URL API
        const dailyParams = "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,sunrise,sunset,uv_index_max";
        const hourlyParams = "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,cloudcover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,shortwave_radiation,uv_index";
        const timezone = "Europe/Rome";
        const forecastDays = 3;

        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&daily=${encodeURIComponent(dailyParams)}&hourly=${encodeURIComponent(hourlyParams)}&timezone=${encodeURIComponent(timezone)}&forecast_days=${forecastDays}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                let errorReason = response.statusText;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.reason) { errorReason = errorData.reason; }
                } catch (e) { /* Ignora */ }
                throw new Error(`API Error ${response.status}: ${errorReason}`);
            }

            const data = await response.json();

            if (!data || !data.daily || !data.daily.time || data.daily.time.length < forecastDays) {
                throw new Error("Dati giornalieri mancanti o incompleti nella risposta API.");
            }

            // Salva i dati giornalieri nella cache
            threeDayForecastCache[cacheKey] = data.daily;

            // Renderizza i dati
            renderThreeDayForecast(data.daily, targetDiv);

        } catch (error) {
            console.error(`Error fetching 3-day forecast for ${cityName} (${lat}, ${lon}):`, error);
            targetDiv.innerHTML = `<div class="text-danger small p-1" title="${error.message}"><i class="fas fa-exclamation-triangle me-1"></i>Errore caricamento previsioni 3gg.</div>`;
            if (threeDayForecastCache[cacheKey] && !threeDayForecastCache[cacheKey].time) {
                delete threeDayForecastCache[cacheKey];
            }
        }
    }

    /**
     * Renderizza la previsione a 3 giorni nell'elemento target.
     * *** MODIFICATO: Aggiunta descrizione testuale sotto l'icona ***
     */
    function renderThreeDayForecast(dailyData, targetDiv) {
        targetDiv.innerHTML = ''; // Pulisci il contenuto precedente (loader o errore)

        // Verifica che i dati necessari esistano
        const requiredKeys = ['time', 'weathercode', 'temperature_2m_max', 'temperature_2m_min'];
        if (!dailyData || requiredKeys.some(key => !dailyData[key] || !Array.isArray(dailyData[key]))) {
            targetDiv.innerHTML = `<div class="text-warning small p-1">Dati previsione non validi.</div>`;
            return;
        }

        const daysToShow = Math.min(3, dailyData.time.length); // Mostra massimo 3 giorni

        for (let i = 0; i < daysToShow; i++) {
            const dateStr = dailyData.time[i];
            const weatherCode = dailyData.weathercode[i] ?? 99;
            const tempMax = dailyData.temperature_2m_max[i] ?? 'N/D';
            const tempMin = dailyData.temperature_2m_min[i] ?? 'N/D';
            // Prendiamo l'icona del giorno (isDay=1) per la previsione
            const iconUrl = getWeatherIconUrl(weatherCode, 1);
            const description = getWeatherDescription(weatherCode); // <-- Get the description text
            const dayLabel = formatForecastDate(dateStr, i);

            const tempMaxText = typeof tempMax === 'number' ? `${Math.round(tempMax)}°` : tempMax;
            const tempMinText = typeof tempMin === 'number' ? `${Math.round(tempMin)}°` : tempMin;

            // --- Modifica per aggiungere descrizione testuale ---
            const dayHtml = `
                <div class="forecast-day">
                    <div class="forecast-date">${dayLabel}</div>
                    <img src="${iconUrl}" alt="${description}" title="${description}" class="forecast-icon" style="width: ${ICON_SIZE_FORECAST_DAY}px; height: ${ICON_SIZE_FORECAST_DAY}px;" onerror="this.onerror=null; this.src='icons/default.svg'; this.alt='Icona N/D';">
                    <div class="forecast-description" style="font-size: 0.8em; color: #ccc; margin-top: 2px; line-height: 1.1;">${description}</div> 
                    <div class="forecast-temp" style="margin-top: 4px;">
                        <span class="forecast-temp-max">${tempMaxText}</span> / <span class="forecast-temp-min">${tempMinText}</span>
                    </div>
                </div>
            `;
            // --- Fine Modifica ---

            targetDiv.insertAdjacentHTML('beforeend', dayHtml);
        }
    }


    // --- Inizializzazione Principale ---
    async function initializeMap() {
        console.log("Initializing map and weather data...");
        try {
            if (mapLoader) mapLoader.style.display = 'flex';

            // Carica SVG
            const responseSvg = await fetch("italy.svg");
            if (!responseSvg.ok) throw new Error(`HTTP error ${responseSvg.status} loading italy.svg`);
            const svgData = await responseSvg.text();
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgData, "image/svg+xml");
            const parseError = svgDoc.querySelector("parsererror");
            if (parseError) throw new Error(`SVG parsing error: ${parseError.textContent.split('\n')[0]}`);
            const svgRoot = svgDoc.documentElement;
            if (!svgRoot || svgRoot.nodeName.toLowerCase() !== "svg") throw new Error("SVG root element <svg> not found.");
            svgElement = svgRoot;
            mapContainer.innerHTML = "";
            mapContainer.appendChild(svgElement);

            // Ottieni parametri proiezione
            if (!getProjectionParameters(svgElement)) {
                throw new Error("Failed to get valid projection parameters from SVG.");
            }

            // Crea gruppo icone
            mapWeatherIconsGroup = document.createElementNS(SVG_NS, "g");
            mapWeatherIconsGroup.setAttribute("id", "map-weather-icons");
            svgElement.appendChild(mapWeatherIconsGroup);

            // Associa percorsi e listeners
            const paths = svgElement.querySelectorAll('g > path[id^="IT-"], g > path[id^="IT_"]');
            svgPaths = {};
            paths.forEach(path => {
                const idRaw = path.id;
                if (!idRaw) return;
                const id = idRaw.replace("_", "-"); // Normalizza ID
                path.id = id; // Assicurati che l'ID sull'elemento sia normalizzato
                path.classList.add("land");
                svgPaths[id] = path;
                path.addEventListener("click", () => handleRegionClick(id));

                // Aggiungi/aggiorna <title> per tooltip
                let titleElement = path.querySelector("title");
                if (!titleElement) {
                    titleElement = document.createElementNS(SVG_NS, "title");
                    path.appendChild(titleElement);
                }
                // Usa attributi esistenti se il title è vuoto
                if (!titleElement.textContent?.trim()) {
                    titleElement.textContent = path.getAttribute("title") || path.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") || id;
                }
            });
            console.log(`${Object.keys(svgPaths).length} region paths found and associated.`);

            // Bottone Reset
            if (resetViewBtn) {
                resetViewBtn.addEventListener("click", resetView);
            } else {
                console.warn("Reset View button (#resetViewBtn) not found in the DOM.");
            }

            if (mapLoader) mapLoader.style.display = 'none';
            console.log("Map setup complete. Fetching weather data...");

            // Fetch dati meteo iniziali
            const responseMeteo = await fetch("meteo_data.php");
            if (!responseMeteo.ok) {
                const errorText = await responseMeteo.text().catch(() => "Could not read error response body");
                throw new Error(`HTTP error ${responseMeteo.status} fetching weather data: ${errorText.substring(0, 200)}`);
            }
            const meteoJsonText = await responseMeteo.text();
            let rawWeatherData = [];
            if (meteoJsonText && meteoJsonText.trim() !== '') {
                try {
                    rawWeatherData = JSON.parse(meteoJsonText);
                    if (!Array.isArray(rawWeatherData)) { throw new Error("Weather data from PHP is not a JSON array."); }
                } catch (e) {
                    console.error("Failed to parse weather data JSON:", e);
                    console.error("Received text:", meteoJsonText.substring(0, 500));
                    throw new Error(`Malformed weather data received: ${e.message}`);
                }
            } else {
                console.warn("Weather data response from PHP was empty.");
                showUserMessage("warning", "Nessun dato meteo ricevuto dal server.");
            }

            // Organizza dati meteo
            allWeatherData = {};
            globalViewCities = [];
            const foundGlobalCities = new Set();
            rawWeatherData.forEach(cityData => {
                if (!cityData || !cityData.region_id || !cityData.city || typeof cityData.lat !== 'number' || typeof cityData.lon !== 'number') {
                    console.warn("Skipping invalid city data received from backend:", cityData);
                    return;
                }
                const regionId = cityData.region_id.replace("_", "-"); // Normalizza ID regione
                cityData.region_id = regionId; // Aggiorna anche nel dato

                if (!allWeatherData[regionId]) {
                    allWeatherData[regionId] = [];
                }
                allWeatherData[regionId].push(cityData);

                // Popola vista globale
                if (ALWAYS_VISIBLE_CITIES.includes(cityData.city)) {
                    if (!foundGlobalCities.has(cityData.city)) { // Evita duplicati se una città appare in più regioni (improbabile ma sicuro)
                        globalViewCities.push(cityData);
                        foundGlobalCities.add(cityData.city);
                    }
                }
            });

            // Verifica città globali mancanti
            ALWAYS_VISIBLE_CITIES.forEach(cityName => {
                if (!foundGlobalCities.has(cityName)) {
                    console.warn(`Global city "${cityName}" specified in ALWAYS_VISIBLE_CITIES was not found in the received data.`);
                }
            });

            console.log(`Weather data organized. Global view cities: ${globalViewCities.length}/${ALWAYS_VISIBLE_CITIES.length}. Regions with data: ${Object.keys(allWeatherData).length}.`);

            // Visualizzazione iniziale
            if (globalViewCities.length > 0) {
                displayWeatherIconsOnMap(globalViewCities, true);
                displayWeatherInCards(globalViewCities, "Meteo Città Principali");
            } else {
                console.error("No cities found for the initial global view.");
                displayWeatherInCards([], "Nessun dato disponibile"); // Mostra messaggio vuoto
                showUserMessage("error", "Impossibile caricare i dati per le città principali.");
            }

            // Imposta listeners dopo creazione card
            setupCardClickListener();

            console.log("Initialization complete.");

        } catch (err) {
            console.error("--- CRITICAL INITIALIZATION ERROR ---", err);
            const errorMessage = `Errore durante l'inizializzazione: ${err.message || "Errore sconosciuto"}`;
            if (mapLoader) mapLoader.style.display = "none";
            if (mapContainer) {
                mapContainer.innerHTML = `<div class="alert alert-danger m-3" role="alert"><i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}. Controlla la console per dettagli.</div>`;
            }
            showUserMessage("error", errorMessage + " Impossibile caricare la mappa o i dati.");
            if (cityWeatherDetailsContainer) cityWeatherDetailsContainer.classList.remove("visible");
            if (resetViewBtn) resetViewBtn.classList.remove("visible");
        }
    }

    // --- Avvio Inizializzazione ---
    initializeMap();
});