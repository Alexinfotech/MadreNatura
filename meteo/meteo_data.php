<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Funzione Helper per Descrizioni Meteo
function getWeatherDescription($code) {
    $code = intval($code);
    $descriptions = [
        0 => 'Sereno', 1 => 'Prev. sereno', 2 => 'Parz. nuvoloso', 3 => 'Coperto',
        45 => 'Nebbia', 48 => 'Nebbia c/brina', 51 => 'Pioviggine L.', 53 => 'Pioviggine',
        55 => 'Pioviggine F.', 56 => 'Piov. gelata L.', 57 => 'Piov. gelata F.',
        61 => 'Pioggia L.', 63 => 'Pioggia', 65 => 'Pioggia F.', 66 => 'Piog. gelata L.',
        67 => 'Piog. gelata F.', 71 => 'Neve L.', 73 => 'Neve', 75 => 'Neve F.',
        77 => 'Grani neve', 80 => 'Rovescio L.', 81 => 'Rovescio', 82 => 'Rovescio viol.',
        85 => 'Rovescio neve L.', 86 => 'Rov. neve F.', 95 => 'Temporale',
        96 => 'Temp. c/grandine L.', 99 => 'Temp. c/grandine F.',
    ];
    return $descriptions[$code] ?? 'N/D';
}

// Funzione Helper per Direzione Vento (Già presente nel tuo codice)
function getWindDirectionDescription($degrees) {
    if ($degrees === null || $degrees === 'N/D' || !is_numeric($degrees)) {
        return ''; // Ritorna stringa vuota se non valido
    }
    $degrees = intval($degrees);
    $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    $index = intval((($degrees + 11.25) % 360) / 22.5);
    return $directions[$index] ?? '';
}


$cities = [ /* ... (array $cities completo come fornito) ... */
    // Abruzzo (IT_65)
    [ "city" => "L'Aquila",  "lat" => 42.3508, "lon" => 13.3997, "region_id" => "IT_65" ], [ "city" => "Pescara",   "lat" => 42.4643, "lon" => 14.2142, "region_id" => "IT_65" ], [ "city" => "Teramo",    "lat" => 42.6588, "lon" => 13.7042, "region_id" => "IT_65" ], [ "city" => "Chieti",    "lat" => 42.351,  "lon" => 14.167,  "region_id" => "IT_65" ],
    // Basilicata (IT-77)
    [ "city" => "Potenza",   "lat" => 40.6397, "lon" => 15.8047, "region_id" => "IT-77" ], [ "city" => "Matera",    "lat" => 40.6667, "lon" => 16.6,    "region_id" => "IT-77" ],
    // Calabria (IT-78)
    [ "city" => "Reggio Calabria", "lat" => 38.1147, "lon" => 15.65,   "region_id" => "IT-78" ], [ "city" => "Catanzaro", "lat" => 38.9097, "lon" => 16.5878, "region_id" => "IT-78" ], [ "city" => "Cosenza",   "lat" => 39.2988, "lon" => 16.2511, "region_id" => "IT-78" ], [ "city" => "Crotone",   "lat" => 39.0833, "lon" => 17.1167, "region_id" => "IT-78" ],
    // Campania (IT-72)
    [ "city" => "Napoli",    "lat" => 40.8518, "lon" => 14.2681, "region_id" => "IT-72" ], [ "city" => "Salerno",   "lat" => 40.6825, "lon" => 14.765,  "region_id" => "IT-72" ], [ "city" => "Caserta",   "lat" => 41.0745, "lon" => 14.3333, "region_id" => "IT-72" ], [ "city" => "Avellino",  "lat" => 40.9149, "lon" => 14.795,  "region_id" => "IT-72" ], [ "city" => "Benevento", "lat" => 41.1306, "lon" => 14.775,  "region_id" => "IT-72" ],
    // Emilia-Romagna (IT-45)
    [ "city" => "Bologna",   "lat" => 44.4949, "lon" => 11.3426, "region_id" => "IT-45" ], [ "city" => "Modena",    "lat" => 44.6471, "lon" => 10.9254, "region_id" => "IT-45" ], [ "city" => "Parma",     "lat" => 44.8015, "lon" => 10.328,  "region_id" => "IT-45" ], [ "city" => "Reggio Emilia","lat" => 44.7, "lon" => 10.6333, "region_id" => "IT-45" ], [ "city" => "Rimini",    "lat" => 44.0594, "lon" => 12.5683, "region_id" => "IT-45" ], [ "city" => "Ferrara",   "lat" => 44.8358, "lon" => 11.6199, "region_id" => "IT-45" ],
    // Friuli-Venezia Giulia (IT-36)
    [ "city" => "Trieste",   "lat" => 45.6495, "lon" => 13.7768, "region_id" => "IT-36" ], [ "city" => "Udine",     "lat" => 46.0627, "lon" => 13.2352, "region_id" => "IT-36" ], [ "city" => "Pordenone", "lat" => 45.9638, "lon" => 12.6612, "region_id" => "IT-36" ], [ "city" => "Gorizia",   "lat" => 45.9417, "lon" => 13.6218, "region_id" => "IT-36" ],
    // Lazio (IT-62)
    [ "city" => "Roma",      "lat" => 41.8933, "lon" => 12.4829, "region_id" => "IT-62" ], [ "city" => "Latina",    "lat" => 41.4676, "lon" => 12.9037, "region_id" => "IT-62" ], [ "city" => "Viterbo",   "lat" => 42.4194, "lon" => 12.1077, "region_id" => "IT-62" ], [ "city" => "Frosinone", "lat" => 41.6399, "lon" => 13.3446, "region_id" => "IT-62" ], [ "city" => "Rieti",     "lat" => 42.4055, "lon" => 12.8625, "region_id" => "IT-62" ],
    // Liguria (IT-42)
    [ "city" => "Genova",    "lat" => 44.4056, "lon" => 8.9463,  "region_id" => "IT-42" ], [ "city" => "La Spezia", "lat" => 44.1024, "lon" => 9.8241,  "region_id" => "IT-42" ], [ "city" => "Savona",    "lat" => 44.308,  "lon" => 8.481,   "region_id" => "IT-42" ], [ "city" => "Imperia",   "lat" => 43.8888, "lon" => 8.0268,  "region_id" => "IT-42" ],
    // Lombardia (IT-25)
    [ "city" => "Milano",    "lat" => 45.4642, "lon" => 9.19,    "region_id" => "IT-25" ], [ "city" => "Brescia",   "lat" => 45.5416, "lon" => 10.2118, "region_id" => "IT-25" ], [ "city" => "Bergamo",   "lat" => 45.6983, "lon" => 9.6779,  "region_id" => "IT-25" ], [ "city" => "Como",      "lat" => 45.808,  "lon" => 9.0852,  "region_id" => "IT-25" ], [ "city" => "Varese",    "lat" => 45.8206, "lon" => 8.8241,  "region_id" => "IT-25" ], [ "city" => "Monza",     "lat" => 45.584,  "lon" => 9.273,   "region_id" => "IT-25" ],
    // Marche (IT-57)
    [ "city" => "Ancona",    "lat" => 43.6158, "lon" => 13.5189, "region_id" => "IT-57" ], [ "city" => "Pesaro",    "lat" => 43.909,  "lon" => 12.914,  "region_id" => "IT-57" ], [ "city" => "Ascoli Piceno", "lat" => 42.8538, "lon" => 13.575, "region_id" => "IT-57" ], [ "city" => "Macerata",  "lat" => 43.2996, "lon" => 13.453,  "region_id" => "IT-57" ], [ "city" => "Fermo",     "lat" => 43.1606, "lon" => 13.718,  "region_id" => "IT-57" ],
    // Molise (IT-67)
    [ "city" => "Campobasso","lat" => 41.5614, "lon" => 14.6611, "region_id" => "IT-67" ], [ "city" => "Isernia",   "lat" => 41.5917, "lon" => 14.2317, "region_id" => "IT-67" ],
    // Piemonte (IT-21)
    [ "city" => "Torino",    "lat" => 45.0703, "lon" => 7.6869,  "region_id" => "IT-21" ], [ "city" => "Novara",    "lat" => 45.4466, "lon" => 8.6194,  "region_id" => "IT-21" ], [ "city" => "Alessandria","lat"=> 44.9132, "lon" => 8.6129,  "region_id" => "IT-21" ], [ "city" => "Asti",      "lat" => 44.9,    "lon" => 8.2,     "region_id" => "IT-21" ], [ "city" => "Cuneo",     "lat" => 44.3907, "lon" => 7.5461,  "region_id" => "IT-21" ],
    // Puglia (IT-75)
    [ "city" => "Bari",      "lat" => 41.1259, "lon" => 16.8625, "region_id" => "IT-75" ], [ "city" => "Lecce",     "lat" => 40.3515, "lon" => 18.175,  "region_id" => "IT-75" ], [ "city" => "Taranto",   "lat" => 40.4656, "lon" => 17.2439, "region_id" => "IT-75" ], [ "city" => "Foggia",    "lat" => 41.4624, "lon" => 15.5446, "region_id" => "IT-75" ], [ "city" => "Brindisi",  "lat" => 40.6378, "lon" => 17.9462, "region_id" => "IT-75" ],
    // Sardegna (IT-88)
    [ "city" => "Cagliari",  "lat" => 39.2238, "lon" => 9.1217,  "region_id" => "IT-88" ], [ "city" => "Sassari",   "lat" => 40.7267, "lon" => 8.5592,  "region_id" => "IT-88" ], [ "city" => "Olbia",     "lat" => 40.9225, "lon" => 9.5017,  "region_id" => "IT-88" ], [ "city" => "Nuoro",     "lat" => 40.3214, "lon" => 9.3286,  "region_id" => "IT-88" ], [ "city" => "Oristano",  "lat" => 39.9031, "lon" => 8.5903,  "region_id" => "IT-88" ],
    // Sicilia (IT-82)
    [ "city" => "Palermo",   "lat" => 38.1157, "lon" => 13.3613, "region_id" => "IT-82" ], [ "city" => "Catania",   "lat" => 37.5079, "lon" => 15.0834, "region_id" => "IT-82" ], [ "city" => "Messina",   "lat" => 38.1938, "lon" => 15.554,  "region_id" => "IT-82" ], [ "city" => "Siracusa",  "lat" => 37.0857, "lon" => 15.284,  "region_id" => "IT-82" ], [ "city" => "Trapani",   "lat" => 38.0148, "lon" => 12.5433, "region_id" => "IT-82" ], [ "city" => "Agrigento", "lat" => 37.3111, "lon" => 13.5766, "region_id" => "IT-82" ],
    // Toscana (IT-52)
    [ "city" => "Firenze",   "lat" => 43.7696, "lon" => 11.2558, "region_id" => "IT-52" ], [ "city" => "Pisa",      "lat" => 43.7228, "lon" => 10.4017, "region_id" => "IT-52" ], [ "city" => "Siena",     "lat" => 43.3188, "lon" => 11.3308, "region_id" => "IT-52" ], [ "city" => "Livorno",   "lat" => 43.543,  "lon" => 10.308,  "region_id" => "IT-52" ], [ "city" => "Arezzo",    "lat" => 43.4636, "lon" => 11.8781, "region_id" => "IT-52" ],
    // Trentino-Alto Adige (IT-32)
    [ "city" => "Trento",    "lat" => 46.0667, "lon" => 11.1167, "region_id" => "IT-32" ], [ "city" => "Bolzano",   "lat" => 46.4983, "lon" => 11.3548, "region_id" => "IT-32" ],
    // Umbria (IT-55)
    [ "city" => "Perugia",   "lat" => 43.1107, "lon" => 12.3889, "region_id" => "IT-55" ], [ "city" => "Terni",     "lat" => 42.562,  "lon" => 12.642,  "region_id" => "IT-55" ],
    // Valle d'Aosta (IT-23)
    [ "city" => "Aosta",     "lat" => 45.7372, "lon" => 7.3133,  "region_id" => "IT-23" ],
    // Veneto (IT-34)
    [ "city" => "Venezia",   "lat" => 45.4408, "lon" => 12.3155, "region_id" => "IT-34" ], [ "city" => "Verona",    "lat" => 45.4384, "lon" => 10.9916, "region_id" => "IT-34" ], [ "city" => "Padova",    "lat" => 45.4064, "lon" => 11.8768, "region_id" => "IT-34" ], [ "city" => "Vicenza",   "lat" => 45.5455, "lon" => 11.5354, "region_id" => "IT-34" ], [ "city" => "Treviso",   "lat" => 45.6675, "lon" => 12.2421, "region_id" => "IT-34" ],
];

$results = [];
$original_indices = array_keys($cities); // Store original indices
$meteoCache = []; // Cache results based on rounded lat/lon

$mh = curl_multi_init();
$curlHandles = [];
$maxConcurrentRequests = 10; // Adjust as needed
$activeRequests = 0;
$cityQueue = $cities; // Use a copy for queue processing

// --- PARAMETRI API per fetch INIZIALE (Solo Giorno Corrente) ---
// *** MANTENUTO forecast_days=1 per il caricamento iniziale ***
$hourlyParams = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m";
$dailyParams = "temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max"; // UV Max per oggi
$baseUrl = "https://api.open-meteo.com/v1/forecast?timezone=Europe/Rome&forecast_days=1"; // SOLO 1 GIORNO

date_default_timezone_set('Europe/Rome');

// Loop principale per processare le richieste
while (!empty($cityQueue) || $activeRequests > 0) {
    // Aggiungi nuove richieste se ci sono slot liberi e città in coda
    while ($activeRequests < $maxConcurrentRequests && !empty($cityQueue)) {
        $c = array_shift($cityQueue); // Prendi la prossima città dalla coda

        // Trova l'indice originale della città nell'array $cities
        // Questo è importante per l'ordinamento finale
        $original_index = -1;
        foreach ($original_indices as $idx_key => $idx_val) {
             if (isset($cities[$idx_val]) &&
                $cities[$idx_val]['lat'] == $c['lat'] &&
                $cities[$idx_val]['lon'] == $c['lon'] &&
                $cities[$idx_val]['city'] == $c['city']) {
                $original_index = $idx_val;
                unset($original_indices[$idx_key]); // Rimuovi l'indice trovato per efficienza
                break;
            }
        }

        if ($original_index === -1) {
             error_log("Could not find original index for city: " . print_r($c, true));
             continue; // Salta città se non troviamo indice (improbabile)
         }

        $lat = $c["lat"];
        $lon = $c["lon"];
        $cacheKey = round($lat, 2) . "_" . round($lon, 2);

        // Controlla la cache prima di fare la richiesta
        if (isset($meteoCache[$cacheKey])) {
            // Crea risultato dalla cache, aggiungendo i dati della città e l'indice originale
            $cachedResult = array_merge($c, $meteoCache[$cacheKey], ["original_index" => $original_index]);
            $results[] = $cachedResult;
            continue; // Passa alla prossima città
        }

        // Costruisci URL per la richiesta cURL (solo giorno corrente)
        $url = $baseUrl . "&latitude=" . urlencode($lat) . "&longitude=" . urlencode($lon);
        if (!empty($hourlyParams)) { $url .= "&hourly=" . urlencode($hourlyParams); }
        if (!empty($dailyParams)) { $url .= "&daily=" . urlencode($dailyParams); }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Timeout totale
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 7); // Timeout connessione
        curl_setopt($ch, CURLOPT_USERAGENT, 'MeteoRegionaleApp/1.7'); // User agent
        curl_setopt($ch, CURLOPT_FAILONERROR, false); // Non fallire su errori HTTP >= 400
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
        curl_setopt($ch, CURLOPT_PRIVATE, $original_index); // Passa l'indice originale per recuperarlo dopo

        curl_multi_add_handle($mh, $ch);
        $curlHandles[$original_index] = $ch; // Usa indice originale come chiave
        $activeRequests++;
    }

    // Esegui le richieste cURL Multi
    // Loop finché ci sono richieste attive
     $status = curl_multi_exec($mh, $running);
     // Se curl_multi_exec non è pronto subito, $running sarà uguale ad $activeRequests

    // Processa i risultati completati
    // $running sarà minore di $activeRequests quando una richiesta è finita
     if ($running < $activeRequests) {
         while ($info = curl_multi_info_read($mh)) {
            $ch = $info['handle'];
            $index = curl_getinfo($ch, CURLINFO_PRIVATE); // Recupera indice originale

            // Verifica validità indice prima di accedere a $cities
            if (!isset($cities[$index])) {
                 error_log("Invalid original index retrieved from cURL handle: " . $index);
                 // Rimuovi comunque l'handle
                 curl_multi_remove_handle($mh, $ch);
                 curl_close($ch);
                 if(isset($curlHandles[$index])) unset($curlHandles[$index]);
                 $activeRequests--;
                 continue; // Passa alla prossima info letta
             }

            $cityData = $cities[$index]; // Usa indice originale per recuperare dati città
            $lat = $cityData["lat"];
            $lon = $cityData["lon"];
            $cacheKey = round($lat, 2) . "_" . round($lon, 2); // Chiave cache

            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            $apiResponse = curl_multi_getcontent($ch);
            $curlResultCode = $info['result'];

            $weatherData = [ "original_index" => $index ]; // Aggiunge indice per ordinamento
            $error_message = null;

            // Gestione Errori cURL e HTTP
             if ($curlResultCode !== CURLE_OK) {
                 $error_message = "cURL Error: " . $curlError . " (Code: " . $curlResultCode . ")";
             } elseif ($httpCode >= 400) {
                 $error_message = "HTTP Error: Status " . $httpCode;
                 // Prova a decodificare il messaggio di errore dall'API
                 $apiErrorDecoded = json_decode($apiResponse, true);
                 if ($apiErrorDecoded && isset($apiErrorDecoded['reason'])) {
                     $error_message .= " - Reason: " . $apiErrorDecoded['reason'];
                 }
             }

            // Se c'è stato un errore
            if ($error_message) {
                 $weatherData["error"] = $error_message;
                 // Popola con dati di errore ma includi i campi attesi dal JS per evitare errori
                 $weatherData = array_merge($weatherData, [
                     "temperature" => 'ERR', "windspeed" => 'ERR', "weathercode" => 99,
                     "is_day" => 1, "time" => 'ERR', "description" => 'Errore API',
                     "apparent_temperature" => 'ERR', "relative_humidity" => 'ERR',
                     "temperature_max" => 'ERR', "temperature_min" => 'ERR',
                     "sunrise" => 'ERR', "sunset" => 'ERR', "uv_index_max" => 'ERR',
                     "wind_direction" => 'ERR' // Campo aggiunto
                 ]);
                 // Logga l'errore per debug
                 error_log("Meteo Fetch Error for {$cityData['city']} (Index: {$index}): $error_message | URL: " . curl_getinfo($ch, CURLINFO_EFFECTIVE_URL));
            } else {
                // Se la richiesta ha avuto successo (HTTP 2xx)
                $decoded = json_decode($apiResponse, true);

                 // Verifica che la decodifica JSON sia andata a buon fine e che ci siano i dati attesi
                 if ($decoded && isset($decoded["hourly"]["time"], $decoded["daily"]["time"])) {
                     $hourly = $decoded["hourly"];
                     $daily = $decoded["daily"];

                     // Trova l'indice dell'ora corrente o più vicina nel passato
                     $current_timestamp = time();
                     $current_hour_index = -1;
                     foreach ($hourly["time"] as $i => $time_str) {
                         $hour_timestamp = strtotime($time_str);
                         // Trova l'ultimo timestamp orario <= all'ora attuale
                         if ($hour_timestamp !== false && $hour_timestamp <= $current_timestamp) {
                             $current_hour_index = $i;
                         } else {
                             // Se superiamo l'ora attuale, l'indice precedente era quello giusto
                             break;
                         }
                     }
                     // Fallback: se non trovato (es. siamo prima della prima ora), usa il primo indice
                     if ($current_hour_index == -1 && count($hourly["time"]) > 0) {
                         $current_hour_index = 0; // O forse count($hourly["time"]) - 1 se vogliamo l'ultimo? Meglio 0.
                     }

                     if ($current_hour_index != -1) {
                        // Estrai dati HOURLY all'indice trovato
                        $weathercode = $hourly["weather_code"][$current_hour_index] ?? null;
                        $current_temp = $hourly["temperature_2m"][$current_hour_index] ?? null;
                        $apparent_temp = $hourly["apparent_temperature"][$current_hour_index] ?? null;
                        $humidity = $hourly["relative_humidity_2m"][$current_hour_index] ?? null;
                        $windspeed = $hourly["wind_speed_10m"][$current_hour_index] ?? null;
                        $is_day = $hourly["is_day"][$current_hour_index] ?? null;
                        $time_observation = $hourly["time"][$current_hour_index] ?? null;
                        $wind_direction_deg = $hourly["wind_direction_10m"][$current_hour_index] ?? null;

                        // Estrai dati DAILY (indice 0 perché abbiamo chiesto solo 1 giorno)
                        $temp_max = $daily["temperature_2m_max"][0] ?? null;
                        $temp_min = $daily["temperature_2m_min"][0] ?? null;
                        $sunrise_ts = $daily["sunrise"][0] ?? null;
                        $sunset_ts = $daily["sunset"][0] ?? null;
                        $uv_index_max = $daily["uv_index_max"][0] ?? null; // Indice UV per oggi

                        // Prepara array dati meteo
                        $weatherInfo = [
                            "temperature" => $current_temp ?? 'N/D',
                            "windspeed" => $windspeed ?? 'N/D',
                            "weathercode" => $weathercode ?? 99, // Usa 99 come default per icona errore
                            "description" => $weathercode !== null ? getWeatherDescription($weathercode) : 'N/D',
                            "is_day" => $is_day ?? 1, // Default a giorno se non disponibile
                            "time" => $time_observation ? date("H:i", strtotime($time_observation)) : 'N/D',
                            "apparent_temperature" => $apparent_temp ?? 'N/D',
                            "relative_humidity" => $humidity ?? 'N/D',
                            "temperature_max" => $temp_max ?? 'N/D',
                            "temperature_min" => $temp_min ?? 'N/D',
                            "sunrise" => $sunrise_ts ? date("H:i", strtotime($sunrise_ts)) : 'N/D',
                            "sunset" => $sunset_ts ? date("H:i", strtotime($sunset_ts)) : 'N/D',
                            "uv_index_max" => $uv_index_max, // Può essere null o numero, gestito da JS
                            "wind_direction" => $wind_direction_deg // Passiamo i gradi, il JS formatterà
                        ];

                        // Salva in cache i dati METEO (non i dati della città)
                        $meteoCache[$cacheKey] = $weatherInfo;
                        // Unisci i dati meteo all'array $weatherData (che contiene già original_index)
                        $weatherData = array_merge($weatherData, $weatherInfo);

                     } else {
                           // Errore nel trovare l'indice orario
                           $error_message = "Could not determine current hour index.";
                           $weatherData["error"] = $error_message;
                           $weatherData = array_merge($weatherData, [
                               "temperature" => 'IDX', "windspeed" => 'IDX', "weathercode" => 99, "is_day" => 1, "time" => 'IDX',
                               "description" => 'Errore Ora', "apparent_temperature" => 'IDX', "relative_humidity" => 'IDX',
                               "temperature_max" => 'IDX', "temperature_min" => 'IDX', "sunrise" => 'IDX', "sunset" => 'IDX',
                               "uv_index_max" => 'IDX', "wind_direction" => 'IDX'
                           ]);
                           error_log("{$error_message} for {$cityData['city']}. Hourly times: " . print_r($hourly["time"] ?? '[]', true));
                     }
                 } else {
                       // Errore nella decodifica JSON o chiavi mancanti
                       $json_error = json_last_error_msg();
                       $error_message = "Invalid JSON or missing keys (hourly/daily). JSON Error: " . $json_error;
                       $weatherData["error"] = $error_message;
                        $weatherData = array_merge($weatherData, [
                           "temperature" => 'JSON', "windspeed" => 'JSON', "weathercode" => 99, "is_day" => 1, "time" => 'JSON',
                           "description" => 'Errore JSON', "apparent_temperature" => 'JSON', "relative_humidity" => 'JSON',
                           "temperature_max" => 'JSON', "temperature_min" => 'JSON', "sunrise" => 'JSON', "sunset" => 'JSON',
                           "uv_index_max" => 'JSON', "wind_direction" => 'JSON'
                       ]);
                       error_log("{$error_message} for {$cityData['city']}. Response Start: " . substr($apiResponse, 0, 200));
                 }
            }

            // Aggiunge i dati della città (nome, lat, lon, region_id) ai dati meteo raccolti
            // Assicurati che $cityData sia l'array originale della città per questo indice
            $results[] = array_merge($cityData, $weatherData);

            // Rimuovi l'handle completato da curl_multi
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            unset($curlHandles[$index]); // Rimuovi dalla nostra gestione
            $activeRequests--; // Decrementa contatore richieste attive
         } // Fine while ($info = curl_multi_info_read($mh))
     } // Fine if ($running < $activeRequests)

    // Se ci sono ancora richieste attive o città in coda, attendi un po' prima di ri-eseguire
    // Questo evita uno spinning CPU-intensivo se le richieste sono lente
     if ($running > 0 || !empty($cityQueue)) {
         // Attendi che ci sia attività su qualche socket o scada il timeout (100ms)
         curl_multi_select($mh, 0.1);
     }

} // Fine while (!empty($cityQueue) || $activeRequests > 0)

// Chiusura di curl_multi
curl_multi_close($mh);

// Ordina i risultati secondo l'indice originale per mantenere l'ordine iniziale dell'array $cities
// Questo è importante perché le richieste finiscono in ordine non garantito
usort($results, function ($a, $b) {
    // Gestisci il caso in cui 'original_index' potrebbe non essere presente (es. errore grave prima)
    $indexA = $a['original_index'] ?? PHP_INT_MAX;
    $indexB = $b['original_index'] ?? PHP_INT_MAX;
    return $indexA <=> $indexB; // Operatore spaceship (PHP 7+)
});

// Output JSON finale
// JSON_NUMERIC_CHECK converte stringhe numeriche in numeri (attenzione se hai ID numerici come stringhe)
// JSON_PRETTY_PRINT per leggibilità (opzionale in produzione)
echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK);

?>