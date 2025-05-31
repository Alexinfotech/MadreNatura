<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Funzioni Helper ---
function getWeatherDescription($code) { $code = intval($code); $descriptions = [ 0 => 'Sereno', 1 => 'Prev. sereno', 2 => 'Parz. nuvoloso', 3 => 'Coperto', 45 => 'Nebbia', 48 => 'Nebbia c/brina', 51 => 'Pioviggine L.', 53 => 'Pioviggine', 55 => 'Pioviggine F.', 56 => 'Piov. gelata', 57 => 'Piov. gelata F.', 61 => 'Pioggia L.', 63 => 'Pioggia', 65 => 'Pioggia F.', 66 => 'Piog. gelata', 67 => 'Piog. gelata F.', 71 => 'Neve L.', 73 => 'Neve', 75 => 'Neve F.', 77 => 'Grani neve', 80 => 'Rovescio L.', 81 => 'Rovescio', 82 => 'Rovescio viol.', 85 => 'Rovescio neve', 86 => 'Rov. neve F.', 95 => 'Temporale', 96 => 'Temp. c/g', 99 => 'Temp. c/g', ]; return $descriptions[$code] ?? 'N/D'; }
function windDirectionFromDegrees($degrees) { if (!is_numeric($degrees)) return null; $val = floor(($degrees / 22.5) + 0.5); $arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]; return $arr[($val % 16)]; }

// --- Logica Principale ---

$mode = $_GET['mode'] ?? 'initial'; // 'initial' o 'search'
$results = [];

if ($mode === 'initial') {
    // --- Caricamento Iniziale - Città Principali (Previsioni Base 7gg) ---
    $majorCities = [ // Seleziona solo le città principali
        [ "city" => "Roma",      "lat" => 41.89, "lon" => 12.48 ],
        [ "city" => "Milano",    "lat" => 45.46, "lon" => 9.19  ],
        [ "city" => "Napoli",    "lat" => 40.85, "lon" => 14.27 ],
        [ "city" => "Torino",    "lat" => 45.07, "lon" => 7.69  ],
        [ "city" => "Palermo",   "lat" => 38.12, "lon" => 13.36 ],
        [ "city" => "Genova",    "lat" => 44.41, "lon" => 8.93  ],
        [ "city" => "Bologna",   "lat" => 44.49, "lon" => 11.34 ],
        [ "city" => "Firenze",   "lat" => 43.77, "lon" => 11.26 ],
        [ "city" => "Bari",      "lat" => 41.13, "lon" => 16.86 ],
        [ "city" => "Catania",   "lat" => 37.50, "lon" => 15.09 ],
        [ "city" => "Venezia",   "lat" => 45.44, "lon" => 12.34 ],
        [ "city" => "Cagliari",  "lat" => 39.22, "lon" => 9.12  ],
    ];

    // Parametri API per previsioni base 7 giorni
    $dailyParams = "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max";
    $baseUrl = "https://api.open-meteo.com/v1/forecast?timezone=Europe/Rome&forecast_days=7";

    $mh = curl_multi_init();
    $curlHandles = [];
    $maxConcurrentRequests = 6; // Riduci concorrenza per meno carico iniziale
    $activeRequests = 0;
    $cityQueue = $majorCities;
    $cityDataMap = []; // Mappa per associare handle cURL ai dati città

    while (!empty($cityQueue) || $activeRequests > 0) {
        while ($activeRequests < $maxConcurrentRequests && !empty($cityQueue)) {
            $cityInfo = array_shift($cityQueue);
            $lat = $cityInfo["lat"]; $lon = $cityInfo["lon"];
            $url = $baseUrl . "&latitude=" . urlencode($lat) . "&longitude=" . urlencode($lon);
            if (!empty($dailyParams)) { $url .= "&daily=" . urlencode($dailyParams); }

            $ch = curl_init();
            curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => 'MeteoPrevisioniApp/1.0 (Initial)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_PRIVATE => json_encode($cityInfo) /* Passa info città */ ]);
            curl_multi_add_handle($mh, $ch);
            $curlHandles[] = $ch; // Aggiungi all'array semplice
            $activeRequests++;
        }

        $status = curl_multi_exec($mh, $running);
        if ($running < $activeRequests) {
            while ($info = curl_multi_info_read($mh)) {
                $ch = $info['handle'];
                $cityInfoJson = curl_getinfo($ch, CURLINFO_PRIVATE);
                $cityInfo = json_decode($cityInfoJson, true);

                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                $apiResponse = curl_multi_getcontent($ch);
                $curlResultCode = $info['result'];
                $forecastData = ["city" => $cityInfo['city']]; // Inizia con il nome città

                $error_message = null;
                if ($curlResultCode !== CURLE_OK) { $error_message = "cURL Error: " . $curlError; }
                elseif ($httpCode >= 400) { $error_message = "HTTP Error: " . $httpCode; }

                if ($error_message) {
                    $forecastData["error"] = $error_message;
                    error_log("Initial Fetch Error for {$cityInfo['city']}: $error_message");
                } else {
                    $decoded = json_decode($apiResponse, true);
                    if ($decoded && isset($decoded['daily'])) {
                         $forecastData['daily'] = $decoded['daily']; // Aggiungi tutti i dati daily
                         // Aggiungi descrizioni testuali
                         if (isset($forecastData['daily']['weather_code'])) {
                             $forecastData['daily']['description'] = array_map('getWeatherDescription', $forecastData['daily']['weather_code']);
                         }
                         // Aggiungi direzione vento testuale
                          if (isset($forecastData['daily']['wind_direction_10m_dominant'])) {
                             $forecastData['daily']['wind_direction_dominant_text'] = array_map('windDirectionFromDegrees', $forecastData['daily']['wind_direction_10m_dominant']);
                         }
                    } else {
                         $forecastData["error"] = "Invalid JSON or missing daily data.";
                         error_log("Initial Fetch JSON Error for {$cityInfo['city']}");
                    }
                }
                $results[] = $forecastData; // Aggiungi al risultato finale

                curl_multi_remove_handle($mh, $ch); curl_close($ch); $activeRequests--;
            }
        }
         if ($running > 0) { curl_multi_select($mh, 0.05); } // Breve pausa
    }
    curl_multi_close($mh);

} elseif ($mode === 'search') {
    // --- Ricerca Specifica Utente ---
    if (!isset($_GET['lat']) || !isset($_GET['lon'])) {
        echo json_encode(["error" => "Latitudine e Longitudine mancanti per la ricerca."]); exit;
    }
    $lat = $_GET['lat']; $lon = $_GET['lon'];
    $days = isset($_GET['days']) ? intval($_GET['days']) : 7; // Default 7 giorni
    $detail = isset($_GET['detail']) && $_GET['detail'] === 'true'; // Default a dettaglio

    $params = [ "latitude" => $lat, "longitude" => $lon, "timezone" => "Europe/Rome", "forecast_days" => $days ];

    if ($detail && $days <= 7) { // Dettaglio solo per 7 giorni max (come da esempio curl)
        $params["daily"]  = "temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,weather_code";
        $params["hourly"] = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,uv_index"; // Aggiunto uv_index hourly
    } else { // Previsione base (7 o 14 giorni)
        $params["daily"]  = "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max";
        // Non richiediamo hourly per la vista base
    }

    $baseUrl = "https://api.open-meteo.com/v1/forecast";
    $queryString = http_build_query($params);
    $url = $baseUrl . "?" . $queryString;

    $ch = curl_init();
    curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 7, CURLOPT_USERAGENT => 'MeteoPrevisioniApp/1.0 (Search)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'] ]);
    $apiResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $searchResult = [];
    if ($curlError) { $searchResult["error"] = "cURL Error: " . $curlError; }
    elseif ($httpCode >= 400) { $searchResult["error"] = "HTTP Error: " . $httpCode; $apiErrorDecoded = json_decode($apiResponse, true); if ($apiErrorDecoded && isset($apiErrorDecoded['reason'])) { $searchResult["error"] .= " - Reason: " . $apiErrorDecoded['reason']; } }
    else {
        $decoded = json_decode($apiResponse, true);
        if ($decoded) {
            $searchResult = $decoded; // Restituisci l'intera risposta API
             // Aggiungi descrizioni testuali se ci sono dati daily
             if (isset($searchResult['daily']['weather_code'])) {
                 $searchResult['daily']['description'] = array_map('getWeatherDescription', $searchResult['daily']['weather_code']);
             }
             // Aggiungi direzione vento testuale se ci sono dati daily
             if (isset($searchResult['daily']['wind_direction_10m_dominant'])) {
                 $searchResult['daily']['wind_direction_dominant_text'] = array_map('windDirectionFromDegrees', $searchResult['daily']['wind_direction_10m_dominant']);
             }
        } else {
            $searchResult["error"] = "Errore decodifica JSON dalla risposta API.";
        }
    }
    // Per la ricerca, restituiamo un singolo oggetto (o oggetto errore)
    $results = $searchResult;

} else {
    $results = ["error" => "Modalità non valida."];
}

// Output JSON
echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
?>