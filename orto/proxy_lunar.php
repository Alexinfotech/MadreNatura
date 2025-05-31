<?php
// Imposta l'header JSON all'inizio per assicurare che sia sempre JSON
header('Content-Type: application/json; charset=utf-8');
// Disabilita output errori diretti nel browser (meglio loggarli)
error_reporting(0); // Non mostrare errori all'utente
ini_set('display_errors', 0);
// Imposta un file di log (assicurati che il server web abbia i permessi per scriverlo)
// **ATTENZIONE:** Cambia questo percorso con uno valido sul tuo server!
// ini_set('log_errors', 1);
// ini_set('error_log', '/var/log/php-error.log'); // Esempio per Linux

/**
 * Calcola approssimativamente le date delle 4 fasi lunari principali per un dato anno.
 * Usa cal_from_jd per conversione data.
 * Fonte algoritmo approssimazione: varia (basato su JDN e mese sinodico medio)
 * Precisione: Approssimata al giorno, sufficiente per scopi agricoli tradizionali.
 */
function calculateLunarPhases($year) {
    $phasesData = [];
    // Riferimento noto: Luna Nuova del 6 Gennaio 2000 alle 18:14 UT
    // Julian Day Number (JDN) approssimato per questo evento.
    // Nota: JDN è un conteggio di giorni, non include l'ora precisa qui per semplicità.
    $jdKnownNewMoon = 2451549.5; // JDN per 6 Gen 2000 (approssimato a mezzogiorno UT)
    $synodicMonth = 29.530588853; // Durata media mese sinodico (da Nuova a Nuova)

    // Calcola JDN approssimato dell'inizio e fine dell'anno richiesto
    // Nota: gregoriantojd richiede mese, giorno, anno interi.
    $jdStartYear = gregoriantojd(1, 1, $year);
    $jdEndYear = gregoriantojd(12, 31, $year);

    // Stima il numero di cicli sinodici trascorsi dal riferimento
    $k = floor(($jdStartYear - $jdKnownNewMoon) / $synodicMonth);

    // Calcola il JDN della prima Luna Nuova *vicino* all'inizio dell'anno
    $jdNewMoon = $jdKnownNewMoon + ($k * $synodicMonth);

    // Cicla finché la Luna Nuova calcolata è precedente all'inizio dell'anno
    // per trovare la prima lunazione che inizia *prima* o *all'inizio* dell'anno.
    while ($jdNewMoon < $jdStartYear - ($synodicMonth / 2) ) { // Controlla se è troppo presto
         $jdNewMoon += $synodicMonth; // Passa alla successiva
    }

    // Itera calcolando le fasi per ogni lunazione finché si supera la fine dell'anno
    while ($jdNewMoon <= $jdEndYear + $synodicMonth) { // Aggiungi margine per includere fasi che cadono poco dopo fine anno ma iniziano prima
        // Calcola JDN approssimati per le 4 fasi principali
        $phases = [
            ['jd' => $jdNewMoon,                       'name' => 'Nuova',         'value' => 0],    // Luna Nuova
            ['jd' => $jdNewMoon + ($synodicMonth / 4), 'name' => 'Primo Quarto',  'value' => 0.25], // Circa 7.4 giorni dopo
            ['jd' => $jdNewMoon + ($synodicMonth / 2), 'name' => 'Piena',         'value' => 0.50], // Circa 14.8 giorni dopo
            ['jd' => $jdNewMoon + (3 * $synodicMonth / 4), 'name' => 'Ultimo Quarto', 'value' => 0.75] // Circa 22.1 giorni dopo
        ];

        foreach ($phases as $phase) {
            // Controlla se il Giorno Giuliano della fase cade all'interno dell'anno richiesto
            $jdCurrentPhase = floor($phase['jd'] + 0.5); // Arrotonda al giorno più vicino (considerando 0.5 per mezzogiorno)

            if ($jdCurrentPhase >= $jdStartYear && $jdCurrentPhase <= $jdEndYear) {
                // Converti JDN in data Gregoriana usando l'estensione Calendar di PHP
                try {
                    // CAL_GREGORIAN specifica il calendario di output
                    $gregorianInfo = cal_from_jd($jdCurrentPhase, CAL_GREGORIAN);

                    // Verifica che la funzione abbia restituito un array valido con le chiavi attese
                    if ($gregorianInfo && is_array($gregorianInfo) && isset($gregorianInfo['year'], $gregorianInfo['month'], $gregorianInfo['day'])) {
                         // Formatta la data come YYYY-MM-DD (standard ISO 8601)
                         $dateString = sprintf('%04d-%02d-%02d', $gregorianInfo['year'], $gregorianInfo['month'], $gregorianInfo['day']);

                         // Aggiungi i dati della fase all'array dei risultati
                         $phasesData[] = [
                            'date' => $dateString,
                            'phase_value' => $phase['value'], // Valore numerico (0, 0.25, 0.5, 0.75)
                            'phase_name' => $phase['name']    // Nome della fase (Nuova, Primo Quarto, etc.)
                         ];
                    } else {
                         // Logga un avviso se cal_from_jd non restituisce i dati attesi
                         error_log("Avviso: cal_from_jd ha restituito dati non validi per JD: " . $jdCurrentPhase);
                    }
                } catch (Exception $e) {
                    // Logga eventuali eccezioni durante la conversione (raro con JDN validi)
                    error_log("Errore durante la conversione JD->Gregoriana: " . $e->getMessage() . " per JD: " . $jdCurrentPhase);
                }
            }
        }
        // Passa alla Luna Nuova della prossima lunazione
        $jdNewMoon += $synodicMonth;
    }

    // Ordina l'array risultante per data (assicura ordine cronologico)
    if (!empty($phasesData)) {
        usort($phasesData, function($a, $b) {
            // Confronto sicuro basato su timestamp Unix
            $timeA = strtotime($a['date']);
            $timeB = strtotime($b['date']);
            // Gestisce il caso (improbabile) che strtotime fallisca
            if ($timeA === false || $timeB === false) return 0;
            return $timeA <=> $timeB; // Operatore spaceship per confronto numerico
        });
    }

     // Rimuovi eventuali duplicati (poco probabile con questo algoritmo, ma per sicurezza)
    $uniquePhases = [];
    $seenKeys = []; // Array per tracciare chiavi 'data-nomefase' già viste
    foreach ($phasesData as $phase) {
        $key = $phase['date'] . '-' . $phase['name'];
        if (!isset($seenKeys[$key])) {
             $uniquePhases[] = $phase;
             $seenKeys[$key] = true;
        } else {
            error_log("Avviso: Fase duplicata rimossa - " . $key); // Logga se rimuove duplicati
        }
    }


    return $uniquePhases; // Restituisce l'array ordinato e univoco delle fasi
}

// --- Blocco Principale Esecuzione Script ---
$response = []; // Inizializza l'array di risposta JSON

try {
    // Ottieni l'anno dalla query string (?year=YYYY)
    // Usa filter_input per validazione e sanificazione
    $year = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT, [
        'options' => [
            'default' => (int)date('Y'), // Default all'anno corrente se non specificato o non valido
            'min_range' => 1970,         // Range ragionevole minimo
            'max_range' => 2050          // Range ragionevole massimo
        ]
    ]);

    // Se filter_input restituisce false (fallimento validazione range/tipo), usa l'anno corrente
    if ($year === false) {
        $year = (int)date('Y');
         error_log("Avviso: Anno non valido o fuori range ricevuto, usato anno corrente: " . $year);
    }

    // Calcola le fasi lunari per l'anno specificato
    $lunarPhases = calculateLunarPhases($year);

    // Prepara la risposta JSON di successo
    $response['status'] = 'success'; // Stato per il frontend JS
    $response['year'] = $year;       // Anno per cui sono state calcolate le fasi
    $response['phases'] = $lunarPhases; // Array delle fasi calcolate

    // Stampa l'output JSON formattato
    // JSON_PRETTY_PRINT: Rende l'output leggibile
    // JSON_UNESCAPED_UNICODE: Assicura che caratteri accentati (come in 'Nuova') siano corretti
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // Gestione centralizzata di errori imprevisti durante l'esecuzione
    http_response_code(500); // Imposta codice di stato HTTP 500 (Internal Server Error)

    // Logga l'errore completo sul server (NON inviarlo al client in produzione)
    error_log("Errore critico in proxy_lunar.php: " . $e->getMessage() . "\nStack trace:\n" . $e->getTraceAsString());

    // Prepara una risposta JSON di errore generica per il client
    $response['status'] = 'error';
    $response['message'] = 'Si è verificato un errore interno durante il calcolo delle fasi lunari. Si prega di riprovare più tardi.';
    // $response['error_details'] = $e->getMessage(); // **NON** includere in produzione per sicurezza

    // Stampa la risposta JSON di errore
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

exit; // Termina lo script esplicitamente
?>