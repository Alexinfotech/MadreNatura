<?php
// Il file PHP non richiede modifiche, fornisce già 'current' e 'hourly'.
// Assicurati di usare la versione precedente che abbiamo corretto.
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Funzioni Helper ---
function formatTimeValue($isoTimestamp) { if (!$isoTimestamp) return 'N/D'; try { $dateTime = new DateTime($isoTimestamp, new DateTimeZone('UTC')); $dateTime->setTimezone(new DateTimeZone('Europe/Rome')); return $dateTime->format('H:i'); } catch (Exception $e) { error_log("Errore formattazione data: " . $e->getMessage() . " per timestamp: " . $isoTimestamp); return 'ERR'; } }

// --- Logica Principale ---
$mode = $_GET['mode'] ?? 'search'; // Default a search se non specificato
$results = [];
date_default_timezone_set('Europe/Rome');

if ($mode === 'initial') { // Manteniamo questa modalità anche se non usata dal JS ora
     $majorCities = [ [ "city" => "Roma", "lat" => 41.89, "lon" => 12.48 ], [ "city" => "Milano", "lat" => 45.46, "lon" => 9.19 ], [ "city" => "Napoli", "lat" => 40.85, "lon" => 14.27 ], [ "city" => "Torino", "lat" => 45.07, "lon" => 7.69 ], [ "city" => "Palermo", "lat" => 38.12, "lon" => 13.36 ], [ "city" => "Genova", "lat" => 44.41, "lon" => 8.93 ], [ "city" => "Bologna", "lat" => 44.49, "lon" => 11.34 ], [ "city" => "Firenze", "lat" => 43.77, "lon" => 11.26 ], [ "city" => "Bari", "lat" => 41.13, "lon" => 16.86 ], [ "city" => "Catania", "lat" => 37.50, "lon" => 15.09 ], [ "city" => "Venezia", "lat" => 45.44, "lon" => 12.34 ], [ "city" => "Cagliari", "lat" => 39.22, "lon" => 9.12 ], ];
     $dailyParams = "uv_index_max,sunrise,sunset"; $baseUrl = "https://api.open-meteo.com/v1/forecast?timezone=Europe/Rome&forecast_days=1";
     $mh = curl_multi_init(); $curlHandles = []; $maxConcurrentRequests = 6; $activeRequests = 0; $cityQueue = $majorCities;
     while (!empty($cityQueue) || $activeRequests > 0) { while ($activeRequests < $maxConcurrentRequests && !empty($cityQueue)) { $cityInfo = array_shift($cityQueue); $lat = $cityInfo["lat"]; $lon = $cityInfo["lon"]; $url = $baseUrl . "&latitude=" . urlencode($lat) . "&longitude=" . urlencode($lon); if (!empty($dailyParams)) { $url .= "&daily=" . urlencode($dailyParams); } $ch = curl_init(); curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => 'RadiazioniApp/1.1 (Initial)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_PRIVATE => json_encode($cityInfo) ]); curl_multi_add_handle($mh, $ch); $curlHandles[] = $ch; $activeRequests++; }
         $status = curl_multi_exec($mh, $running); if ($running < $activeRequests) { while ($info = curl_multi_info_read($mh)) { $ch = $info['handle']; $cityInfoJson = curl_getinfo($ch, CURLINFO_PRIVATE); $cityInfo = json_decode($cityInfoJson, true); $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); $curlError = curl_error($ch); $apiResponse = curl_multi_getcontent($ch); $curlResultCode = $info['result']; $cityResult = ["city" => $cityInfo['city']]; $error_message = null; if ($curlResultCode !== CURLE_OK) { $error_message = "cURL Error: " . $curlError; } elseif ($httpCode >= 400) { $error_message = "HTTP Error: " . $httpCode; } if ($error_message) { $cityResult["error"] = $error_message; $cityResult['daily'] = null; error_log("Initial UV Fetch Error for {$cityInfo['city']}: $error_message"); } else { $decoded = json_decode($apiResponse, true); if ($decoded && isset($decoded['daily'])) { $dailyData = []; foreach($decoded['daily'] as $key => $values) { if(is_array($values) && count($values) > 0) { if($key === 'sunrise' || $key === 'sunset') { $dailyData[$key] = formatTimeValue($values[0]); } else { $dailyData[$key] = $values[0]; } } else { $dailyData[$key] = null; } } $cityResult['daily'] = $dailyData; } else { $cityResult["error"] = "Invalid JSON or missing daily data."; $cityResult['daily'] = null; error_log("Initial UV JSON Error for {$cityInfo['city']}"); } } $results[] = $cityResult; curl_multi_remove_handle($mh, $ch); curl_close($ch); $activeRequests--; } } if ($running > 0) { curl_multi_select($mh, 0.05); } } curl_multi_close($mh);
}
elseif ($mode === 'search') { // Gestisce la ricerca
    if (!isset($_GET['lat']) || !isset($_GET['lon'])) { echo json_encode(["error" => "Lat/Lon mancanti."]); exit; }
    $lat = $_GET['lat']; $lon = $_GET['lon'];
    $detailLevel = $_GET['detail'] ?? 'base';

    $baseUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
    $params = [ "latitude" => $lat, "longitude" => $lon, "current" => "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone", "timezone" => "Europe/Rome", "past_days" => 1, "forecast_days" => 1 ];
    if ($detailLevel === "advanced") { $params["hourly"] = "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust,uv_index,ammonia,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,european_aqi,us_aqi"; }
    else { $params["hourly"] = "pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi,us_aqi"; }

    $queryString = http_build_query($params); $url = $baseUrl . "?" . $queryString;
    $ch = curl_init(); curl_setopt_array($ch, [ CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 7, CURLOPT_USERAGENT => 'QualitaAriaApp/1.1 (Search)', CURLOPT_FAILONERROR => false, CURLOPT_HTTPHEADER => ['Accept: application/json'] ]);
    $apiResponse = curl_exec($ch); $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); $curlError = curl_error($ch); curl_close($ch);
    $searchResult = [];
    if ($curlError) { $searchResult["error"] = "cURL Error: " . $curlError; }
    elseif ($httpCode >= 400) { $searchResult["error"] = "HTTP Error: " . $httpCode; $apiErrorDecoded = json_decode($apiResponse, true); if ($apiErrorDecoded && isset($apiErrorDecoded['reason'])) { $searchResult["error"] .= " - Reason: " . $apiErrorDecoded['reason']; } }
    else { $decoded = json_decode($apiResponse, true); if ($decoded) { if (isset($decoded['error']) && $decoded['error']) { $searchResult["error"] = "API Error: " . ($decoded['reason'] ?? 'Unknown error from API'); } else if (!isset($decoded['hourly']) || !isset($decoded['current'])) { $searchResult["error"] = "Risposta API non valida: dati 'hourly' o 'current' mancanti."; } else { $searchResult = $decoded; } } else { $searchResult["error"] = "Errore decodifica JSON API."; error_log("Air Quality JSON Decode Error. Response start: " . substr($apiResponse, 0, 200)); } }
    $results = $searchResult;
} else {
    $results = ["error" => "Modalità non valida."];
}

echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
?>