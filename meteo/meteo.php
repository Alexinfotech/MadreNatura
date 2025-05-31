<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Madre Natura - Meteo Regionale Italia</title>

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/css/bootstrap.min.css"/>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"/>
    <!-- CSS personalizzato -->
    <link rel="stylesheet" href="styles_meteo.css" />

    <!-- Stili specifici per SVG e poco altro (RIDOTTI) -->
    <style>
        /* Stili per la mappa SVG sono OK qui o nel CSS esterno */
        #map svg {
            display: block;
            max-width: 100%;
            height: auto;
            cursor: default;
            transition: viewbox 0.6s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        #map .land {
            fill: #CCCCCC; fill-opacity: 1; stroke: white; stroke-opacity: 1;
            stroke-width: 0.5; cursor: pointer;
            transition: fill 0.3s ease, stroke-width 0.3s ease;
        }
        #map .land:hover { fill: #a0a0a0; fill-opacity: 0.9; }
        #map .land.active-region {
            fill: #ff006e; fill-opacity: 0.8; stroke: #ffd6ff; stroke-width: 1.5;
        }

        /* Stili per il bottone reset sono OK qui o nel CSS esterno */
        #resetViewBtn {
            transition: opacity 0.3s ease, transform 0.3s ease;
            opacity: 0; transform: scale(0.8); display: none;
        }
        #resetViewBtn.visible { display: inline-block; opacity: 1; transform: scale(1); }

        /* Stile spinner caricamento mappa */
        .map-loading-spinner { color: #ffd6ff; }

        /*
         !!! REGOLE RIMOSSE DA QUI PER #cityWeatherDetails E #cityWeatherDetails.visible !!!
             ORA SONO GESTITE CORRETTAMENTE NEL FILE styles_meteo.css
        */

    </style>
</head>
<body>

    <!-- Modal per Messaggi (POPUP) -->
    <div class="modal fade" id="alertModal" tabindex="-1" aria-labelledby="alertModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content custom-modal-content">
                <div class="modal-header custom-modal-header">
                    <h5 class="modal-title" id="alertModalLabel">Messaggio</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" id="closeModalBtn"></button>
                </div>
                <div class="modal-body custom-modal-body" id="alertModalBody">
                    <!-- Contenuto del messaggio -->
                </div>
                <div class="modal-footer custom-modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    </div>
    <!-- Fine Modal -->

    <div class="container my-container">
        <div class="header text-center">
            <h1>
                <i class="fas fa-map-marked-alt spinning-icon"></i> Meteo Regionale - Italia
            </h1>
            <p class="lead">Clicca su una regione per visualizzare il meteo delle città principali.</p>
            <button id="resetViewBtn" class="btn btn-secondary mt-2 mb-3">Mostra tutta Italia</button>
        </div>

        <!-- Contenitore per la mappa SVG -->
        <div id="map">
            <!-- Indicatore di caricamento -->
             <div id="map-loader" class="d-flex justify-content-center align-items-center p-5" style="min-height: 300px;">
                <div class="spinner-border map-loading-spinner" role="status">
                    <span class="visually-hidden">Caricamento mappa...</span>
                </div>
                <span class="ms-3 text-light">Caricamento mappa...</span>
             </div>
            <!-- L'SVG verrà caricato qui da JavaScript -->
        </div>

        <!-- Sezione per visualizzare i dettagli meteo della regione selezionata -->
        <!-- La classe 'visible' verrà aggiunta/rimossa da JS -->
        <div id="cityWeatherDetails">
            <h4 id="regionName" class="text-center"></h4>
            <!-- Usare la classe .row di Bootstrap per la griglia delle card -->
            <div id="weatherList" class="row">
                <!-- Le card meteo verranno inserite qui come colonne (es. <div class="col-md-6 col-lg-4 ...">) -->
            </div>
        </div>

    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/js/bootstrap.bundle.min.js"></script>
    <!-- Gestione Alert (Assicurati che questo file esista e funzioni) -->
    <script src="alerts_meteo.js"></script>
    <!-- Script personalizzato (USA QUELLO COMPLETO FORNITO IN PRECEDENZA) -->
    <script src="scripts_meteo.js"></script>
</body>
</html>