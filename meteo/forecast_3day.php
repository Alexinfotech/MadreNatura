<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1); // Mostra errori in fase di sviluppo
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Parametri richiesti ---
$latitude = $_GET['latitude'] ?? null;
$longitude = $_GET['longitude'] ?? null;

// Validazione input
if ($latitude === null || $longitude === null || !is_numeric($latitude) || !is_numeric($longitude)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => true, 'reason' => 'Latitudine e/o longitudine mancanti o non valide.']);
    exit;
}

// --- Parametri API per previsioni 3 giorni (solo giornalieri) ---
$dailyParams = "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,sunrise,sunset,uv_index_max";
$forecastDays = 3;
$timezone = "Europe/Rome";
$apiUrl = "https://api.open-meteo.com/v1/forecast";

// Costruzione URL API
$url = $apiUrl . "?" . http_build_query([
    'latitude' => $latitude,
    'longitude' => $longitude,
    'daily' => $dailyParams,
    'timezone' => $timezone,
    'forecast_days' => $forecastDays
]);

// --- Chiamata API con cURL ---
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout ridotto per richiesta singola
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_USERAGENT, 'MeteoRegionaleApp/ForecastPopup/1.0');
curl_setopt($ch, CURLOPT_FAILONERROR, false); // Gestiamo errori HTTP manualmente
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$apiResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
curl_close($ch);

// --- Gestione Risposta API ---
if ($curlErrno !== CURLE_OK) {
    http_response_code(500); // Internal Server Error (cURL failed)
    echo json_encode(['error' => true, 'reason' => "Errore cURL: " . $curlError . " (Code: " . $curlErrno . ")"]);
    exit;
}

if ($httpCode >= 400) {
    http_response_code($httpCode); // Restituisce lo stesso codice di errore API
    $apiErrorDecoded = json_decode($apiResponse, true);
    $reason = $apiErrorDecoded['reason'] ?? ('Errore API non specificato. Response: ' . substr($apiResponse, 0, 200));
    echo json_encode(['error' => true, 'reason' => "Errore API Open-Meteo (Status: {$httpCode}): " . $reason]);
    exit;
}

// Decodifica JSON risposta valida
$decoded = json_decode($apiResponse, true);

if ($decoded === null || !isset($decoded['daily']) || !is_array($decoded['daily'])) {
    http_response_code(500); // Internal Server Error (Invalid JSON received)
    echo json_encode(['error' => true, 'reason' => 'Risposta API non valida o JSON malformato.']);
    exit;
}

// --- Output JSON con solo i dati giornalieri ---
// Rimuoviamo dati non necessari (lat, lon, generationtime etc.)
// per una risposta più pulita al frontend
if (isset($decoded['daily'])) {
    echo json_encode(['error' => false, 'daily' => $decoded['daily']], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);
} else {
     http_response_code(500);
     echo json_encode(['error' => true, 'reason' => 'Dati giornalieri mancanti nella risposta API valida.']);
}

?>