<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Madre Natura - Radiazione Solare & UV</title>

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.2.3/css/bootstrap.min.css"/>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
    <!-- CSS personalizzato -->
    <link rel="stylesheet" href="styles_uv.css" />
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
            <h1><i class="fas fa-sun spinning-icon"></i> Radiazione Solare & UV</h1>
            <p class="lead">Visualizza i dati UV e di radiazione per le principali città o cerca la tua località.</p>
        </header>

        <!-- Sezione Ricerca e Controlli -->
        <section id="searchSection" class="mb-4 p-3 rounded" style="background-color: rgba(0,0,0,0.2);">
            <form id="uvSearchForm" class="row g-3 align-items-end">
                <div class="col-md-7 col-lg-8">
                    <label for="citySearchInput" class="form-label">Cerca Città</label>
                    <input type="text" class="form-control" id="citySearchInput" placeholder="Es: Milano" required>
                    <div class="invalid-feedback">Inserisci un nome di città.</div>
                </div>
                <div class="col-md-3 col-lg-2">
                    <button type="submit" class="btn btn-primary w-100"><i class="fas fa-search"></i> Cerca</button>
                </div>
                <div class="col-md-2 col-lg-2">
                     <button type="button" class="btn btn-info w-100" id="geoButton" title="Usa la tua posizione">
                        <i class="fas fa-map-marker-alt"></i></button>
                </div>
            </form>
             <!-- Pulsanti selezione giorni (visibili dopo ricerca) -->
             <div id="forecastDaysSelection" class="mt-3 text-center" style="display: none;">
                 <span class="me-2">Visualizza Dati per:</span>
                 <div class="btn-group" role="group" aria-label="Selezione Giorni">
                     <button type="button" class="btn btn-outline-light" data-days="1" id="btn1Day">Oggi</button>
                     <button type="button" class="btn btn-outline-light active" data-days="7" id="btn7Days">7 Giorni</button>
                     <button type="button" class="btn btn-outline-light" data-days="16" id="btn16Days">16 Giorni</button>
                 </div>
             </div>
        </section>

        <!-- Indicatore di Caricamento Globale -->
        <div id="loadingSpinner" class="text-center my-5" style="display: none;">
            <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            <p class="mt-2">Caricamento dati...</p>
        </div>

        <!-- Risultati Ricerca -->
        <section id="searchResults" class="mt-4 forecast-section"></section>

        <!-- Dati Iniziali (Città Principali) -->
        <section id="initialData" class="mt-4 forecast-section">
            <h2 class="text-center mb-4">Dati Giornalieri Principali (Oggi)</h2>
            <div id="initialDataTableContainer">
                <!-- La tabella iniziale verrà caricata qui -->
            </div>
        </section>

    </div> <!-- fine .my-container -->

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.2.3/js/bootstrap.bundle.min.js"></script>
    <!-- Chart.js + Adapter Moment -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/locale/it.min.js"></script> <!-- Locale italiano per Moment -->
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-moment@1.0.1/dist/chartjs-adapter-moment.min.js"></script>
    <!-- Gestione Alert -->
    <script src="alerts_uv.js"></script> <!-- Assicurati che il nome sia corretto -->
    <!-- Script personalizzato -->
    <script src="scripts_uv.js"></script>
</body>
</html>