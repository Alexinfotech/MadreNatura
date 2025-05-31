<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1); // Enable errors for debugging (disable in production)
ini_set('display_startup_errors', 1); // Enable startup errors for debugging (disable in production)
error_reporting(E_ALL); // Report all errors (adjust for production)

// --- Input Validation ---
if (!isset($_GET['lat']) || !isset($_GET['lon'])) {
    http_response_code(400);
    echo json_encode(["error" => "Parametri 'lat' e 'lon' mancanti."]);
    exit;
}
// Validate coordinates format (basic check)
if (!is_numeric($_GET['lat']) || !is_numeric($_GET['lon'])) {
     http_response_code(400);
     echo json_encode(["error" => "Parametri 'lat' e 'lon' devono essere numerici."]);
     exit;
}

$lat = $_GET['lat'];
$lon = $_GET['lon'];
$dataType = $_GET['data_type'] ?? 'climate'; // Default to 'climate'

// --- API Configuration based on dataType ---
$baseUrl = "";
$params = [
    "latitude" => $lat,
    "longitude" => $lon,
];
$userAgent = 'GenericWeatherDataApp/1.0'; // Default User Agent

if ($dataType === 'climate') {
    $baseUrl = "https://climate-api.open-meteo.com/v1/climate";
    // Use fixed date range for climate models as per requirement
    $params["start_date"] = "1980-01-01";
    $params["end_date"] = "2024-12-31";
    // Request only max temperature from specified models
    $params["daily"] = "temperature_2m_max";
    $params["models"] = "CMCC_CM2_VHR4,FGOALS_f3_H,HiRAM_SIT_HR,MRI_AGCM3_2_S,EC_Earth3P_HR,MPI_ESM1_2_XR,NICAM16_8S";
    $userAgent = 'ClimateChangeApp/1.1'; // Specific User Agent for Climate API
    // Timezone is generally not needed or supported by climate models API

} elseif ($dataType === 'archive') {
     // --- Archive API specific settings (kept for potential future use) ---
    $baseUrl = "https://archive-api.open-meteo.com/v1/archive";
    // Validate required dates for archive
    if (empty($_GET['start_date']) || empty($_GET['end_date'])) {
        http_response_code(400);
        echo json_encode(["error" => "Parametri 'start_date' e 'end_date' sono obbligatori per data_type=archive."]);
        exit;
    }
     // Basic date format validation
     if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['start_date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['end_date'])) {
         http_response_code(400);
         echo json_encode(["error" => "Formato data non valido (YYYY-MM-DD richiesto)."]);
         exit;
     }
    $params["start_date"] = $_GET['start_date'];
    $params["end_date"] = $_GET['end_date'];
    $params["hourly"] = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m";
    $params["daily"] = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant";
    $params["timezone"] = "Europe/Rome"; // Timezone relevant for archive data
    $userAgent = 'HistoricalWeatherApp/1.1'; // Specific User Agent for Archive API

     // Optional: Add date range validation for archive if needed (e.g., limit query duration)

} else {
    http_response_code(400);
    echo json_encode(["error" => "Valore 'data_type' non valido. Usare 'climate' o 'archive'."]);
    exit;
}

// --- Build API URL ---
// Use http_build_query for proper encoding, but decode spaces (+) back to %20 if API requires it (Open-Meteo usually handles +)
$queryString = http_build_query($params);
// Open-Meteo handles comma-separated lists correctly, no need to manually encode commas typically.
$url = $baseUrl . "?" . $queryString;

// --- Execute cURL Request ---
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60, // Increased timeout for potentially large climate data
    CURLOPT_CONNECTTIMEOUT => 20,
    CURLOPT_USERAGENT => $userAgent,
    CURLOPT_FAILONERROR => false, // Handle HTTP errors manually based on code
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_FOLLOWLOCATION => true, // Follow redirects if any
    CURLOPT_MAXREDIRS => 5,
]);

$apiResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// --- Process Response ---
$result = [];
if ($curlError) {
    http_response_code(500); // Internal Server Error (cURL failed)
    $result["error"] = "Errore cURL: " . $curlError;
    error_log("Weather API cURL Error: " . $curlError . " | URL: " . $url); // Log error server-side
} elseif ($httpCode >= 400) {
    // API returned an error status code
    http_response_code($httpCode);
    $apiErrorDecoded = json_decode($apiResponse, true);
    // Try to extract the reason from the API response JSON
    $errorMessage = "Errore API (HTTP " . $httpCode . ")";
    if ($apiErrorDecoded && isset($apiErrorDecoded['reason'])) {
        $errorMessage .= ": " . $apiErrorDecoded['reason'];
    } elseif (!empty($apiResponse)) {
         $errorMessage .= ". Risposta: " . substr($apiResponse, 0, 200); // Include part of the raw response if no JSON reason
    }
    $result["error"] = $errorMessage;
    error_log("Weather API HTTP Error " . $httpCode . ": " . $errorMessage . " | URL: " . $url);
} else {
    // Successful response (HTTP 2xx)
    $decoded = json_decode($apiResponse, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // JSON decoding failed
        http_response_code(500);
        $result["error"] = "Errore decodifica risposta JSON dall'API.";
        error_log("Weather API JSON Decode Error: " . json_last_error_msg() . " | URL: " . $url . " | Response Start: " . substr($apiResponse, 0, 200));
    } elseif (isset($decoded['error']) && $decoded['error']) {
        // API reported an error within the JSON structure (e.g., invalid parameters)
        http_response_code(400); // Often Bad Request
        $result["error"] = "Errore restituito dall'API: " . ($decoded['reason'] ?? 'Dettagli non disponibili');
        error_log("Weather API Functional Error: " . $result['error'] . " | URL: " . $url);
    } else {
        // SUCCESS! Validate essential data structure based on type
         $isValid = false;
         if ($dataType === 'climate' && isset($decoded['daily']['time']) && is_array($decoded['daily']['time'])) {
              $isValid = true;
         } elseif ($dataType === 'archive' && ( (isset($decoded['hourly']['time']) && is_array($decoded['hourly']['time'])) || (isset($decoded['daily']['time']) && is_array($decoded['daily']['time'])) ) ) {
              $isValid = true;
         }

         if ($isValid) {
             $decoded['request_type'] = $dataType; // Add request type to response for JS context
             $result = $decoded;
              // Note: Sunrise/sunset formatting removed as it was only relevant for 'archive' which is not the focus here.
         } else {
             http_response_code(500);
             $result["error"] = "Risposta API ricevuta ma mancano dati essenziali (es. 'daily.time').";
             error_log("Weather API Missing Essential Data Error | URL: " . $url);
         }
    }
}

// --- Output JSON Response ---
// JSON_PRETTY_PRINT for readability during dev, remove for production
// JSON_UNESCAPED_UNICODE for correct character encoding
// JSON_NUMERIC_CHECK to ensure numbers are not output as strings
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
?>