<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Madre Natura - Qualità dell’Aria</title>

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.2.3/css/bootstrap.min.css"/>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    <!-- CSS personalizzato -->
    <link rel="stylesheet" href="styles_aria.css" />
</head>
<body>

    <!-- Modal per Messaggi -->
    <div class="modal fade" id="alertModal" tabindex="-1" aria-labelledby="alertModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content custom-modal-content">
                <div class="modal-header custom-modal-header">
                    <h5 class="modal-title" id="alertModalLabel">Messaggio</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body custom-modal-body" id="alertModalBody"></div>
                <div class="modal-footer custom-modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                </div>
            </div>
        </div>
    </div>
    <!-- Fine Modal -->

    <div class="container my-container">
        <header class="header text-center mb-4">
            <h1><i class="fas fa-smog spinning-icon"></i> Qualità dell’Aria</h1>
            <p class="lead">Cerca una località per visualizzare i dati sulla qualità dell'aria.</p>
        </header>

        <!-- Sezione Ricerca e Controlli -->
        <section id="searchSection" class="mb-4 p-3 rounded shadow-sm">
            <form id="airQualitySearchForm" class="row g-3 align-items-end" novalidate>
                <div class="col-md-5 col-lg-6">
                    <label for="citySearchInput" class="form-label">Cerca Città</label>
                    <input type="text" class="form-control form-control-lg" id="citySearchInput" placeholder="Es: Milano, Napoli..." required>
                    <div class="invalid-feedback">Inserisci un nome di città valido.</div>
                </div>
                 <div class="col-md-4 col-lg-4">
                    <label for="detailLevelSelect" class="form-label">Livello Dettaglio Dati</label>
                    <select class="form-select form-select-lg" id="detailLevelSelect">
                        <option value="base" selected>Indici Principali (PM, NO₂, O₃, AQI)</option>
                        <option value="advanced">Tutti i Parametri (inclusi Pollini)</option>
                    </select>
                </div>
                <div class="col-md-3 col-lg-2 d-flex">
                     <button type="submit" class="btn btn-primary btn-lg w-100 me-2" title="Cerca"><i class="fas fa-search"></i></button>
                     <button type="button" class="btn btn-info btn-lg" id="geoButton" title="Usa la tua posizione">
                        <i class="fas fa-map-marker-alt"></i></button>
                </div>
            </form>
        </section>

        <!-- Indicatore di Caricamento Globale -->
        <div id="loadingSpinner" class="text-center my-4" style="display: none;">
            <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            <p class="mt-2">Caricamento dati qualità aria...</p>
        </div>

        <!-- Mappa -->
        <div id="mapContainer" class="mb-4 map-container-full-width"> 
            <h3 class="text-center mb-2 map-title">Mappa Qualità Aria</h3>
            <div id="map"></div>
            <div id="mapLegend" class="mt-2"></div>
        </div>

        <!-- Risultati (Nascosti inizialmente) -->
        <section id="airQualityResults" class="results-section">
             
        </section>

    </div> <!-- fine .my-container -->

    <!-- Script -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.2.3/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/locale/it.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-moment@1.0.1/dist/chartjs-adapter-moment.min.js"></script>
    <script src="alerts_aria.js"></script>
    <script src="scripts_aria.js"></script>
</body>
</html>