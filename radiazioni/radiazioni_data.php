<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Funzione Helper ---
function formatTimeValue($isoTimestamp) {
    if (!$isoTimestamp) return 'N/D';
    try {
        $dateTime = new DateTime($isoTimestamp, new DateTimeZone('UTC'));
        $dateTime->setTimezone(new DateTimeZone('Europe/Rome'));
        return $dateTime->format('H:i');
    } catch (Exception $e) {
        error_log("Errore formattazione data: " . $e->getMessage() . " per timestamp: " . $isoTimestamp);
        return 'ERR';
    }
}
// Rimosso getWeatherDescription e windDirectionFromDegrees (non richiesti qui)

// --- Logica Principale ---

$mode = $_GET['mode'] ?? 'initial';
$results = [];

date_default_timezone_set('Europe/Rome');

if ($mode === 'initial') {
    // --- Caricamento Iniziale - Città Principali (Dati Base Oggi) ---
     $majorCities = [
        [ "city" => "Roma",      "lat" => 41.89, "lon" => 12.48 ], [ "city" => "Milano",    "lat" => 45.46, "lon" => 9.19  ], [ "city" => "Napoli",    "lat" => 40.85, "lon" => 14.27 ], [ "city" => "Torino",    "lat" => 45.07, "lon" => 7.69  ], [ "city" => "Palermo",   "lat" => 38.12, "lon" => 13.36 ], [ "city" => "Genova",    "lat" => 44.41, "lon" => 8.93  ], [ "city" => "Bologna",   "lat" => 44.49, "lon" => 11.34 ], [ "city" => "Firenze",   "lat" => 43.77, "lon" => 11.26 ], [ "city" => "Bari",      "lat" => 41.13, "lon" => 16.86 ], [ "city" => "Catania",   "lat" => 37.50, "lon" => 15.09 ], [ "city" => "Venezia",   "lat" => 45.44, "lon" => 12.34 ], [ "city" => "Cagliari",  "lat" => 39.22, "lon" => 9.12  ],
    ];

    // Parametri API solo per dati daily UV/Alba/Tramonto
    $dailyParams = "uv_index_max,sunrise,sunset";
    $baseUrl = "https://api.open-meteo.com/v1/forecast?timezone=Europe/Rome&forecast_days=1";

    $mh = curl_multi_init();
    $curlHandles = [];
    $maxConcurrentRequests = 6;
    $activeRequests = 0;
    $cityQueue = $majorCities;

    while (!empty($cityQueue) || $activeRequests > 0) {
        while ($activeRequests < $maxConcurrentRequests && !empty($cityQueue)) {
            $cityInfo = array_shift($cityQueue);
            $lat = $cityInfo["lat"]; $lon = $cityInfo["lon"];
            $url = $baseUrl . "&latitude=" . urlencode($lat) . "&longitude=" . urlencode($lon);
            if (!empty($dailyParams)) { $url .= "&daily=" . urlencode($dailyParams); }

            $ch = curl_init();
            curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => 'RadiazioniApp/1.1 (Initial)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_PRIVATE => json_encode($cityInfo) ]);
            curl_multi_add_handle($mh, $ch);
            $curlHandles[] = $ch;
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
                $cityResult = ["city" => $cityInfo['city']];

                $error_message = null;
                if ($curlResultCode !== CURLE_OK) { $error_message = "cURL Error: " . $curlError; }
                elseif ($httpCode >= 400) { $error_message = "HTTP Error: " . $httpCode; }

                if ($error_message) {
                    $cityResult["error"] = $error_message;
                    $cityResult['daily'] = null;
                    error_log("Initial UV Fetch Error for {$cityInfo['city']}: $error_message");
                } else {
                    $decoded = json_decode($apiResponse, true);
                    if ($decoded && isset($decoded['daily'])) {
                         $dailyData = [];
                         foreach($decoded['daily'] as $key => $values) {
                             if(is_array($values) && count($values) > 0) {
                                 if($key === 'sunrise' || $key === 'sunset') {
                                     $dailyData[$key] = formatTimeValue($values[0]);
                                 } else {
                                      $dailyData[$key] = $values[0];
                                 }
                             } else { $dailyData[$key] = null; }
                         }
                         $cityResult['daily'] = $dailyData;
                    } else {
                         $cityResult["error"] = "Invalid JSON or missing daily data.";
                         $cityResult['daily'] = null;
                         error_log("Initial UV JSON Error for {$cityInfo['city']}");
                    }
                }
                $results[] = $cityResult;
                curl_multi_remove_handle($mh, $ch); curl_close($ch); $activeRequests--;
            }
        }
         if ($running > 0) { curl_multi_select($mh, 0.05); }
    }
    curl_multi_close($mh);

} elseif ($mode === 'search') {
    // --- Ricerca Specifica Utente ---
    if (!isset($_GET['lat']) || !isset($_GET['lon'])) { echo json_encode(["error" => "Latitudine e Longitudine mancanti."]); exit; }
    $lat = $_GET['lat']; $lon = $_GET['lon'];
    $days = isset($_GET['days']) ? intval($_GET['days']) : 7;
    if (!in_array($days, [1, 7, 16])) { $days = 7; }

    $params = [ "latitude" => $lat, "longitude" => $lon, "timezone" => "Europe/Rome", "forecast_days" => $days ];
    // Parametri specifici per Radiazioni/UV
    $params["hourly"] = "uv_index,shortwave_radiation";
    $params["daily"] = "uv_index_max,sunrise,sunset";

    $baseUrl = "https://api.open-meteo.com/v1/forecast";
    $queryString = http_build_query($params);
    $url = $baseUrl . "?" . $queryString;

    $ch = curl_init();
    curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 7, CURLOPT_USERAGENT => 'RadiazioniApp/1.1 (Search)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'] ]);
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
            $searchResult = $decoded;
             // Formatta sunrise/sunset
             if (isset($searchResult['daily']['sunrise'])) { $searchResult['daily']['sunrise_formatted'] = array_map('formatTimeValue', $searchResult['daily']['sunrise']); }
             if (isset($searchResult['daily']['sunset'])) { $searchResult['daily']['sunset_formatted'] = array_map('formatTimeValue', $searchResult['daily']['sunset']); }
        } else { $searchResult["error"] = "Errore decodifica JSON API."; }
    }
    $results = $searchResult;

} else {
    $results = ["error" => "Modalità non valida."];
}

echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
?>