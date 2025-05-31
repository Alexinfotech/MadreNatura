// Gestore di messaggi modali Bootstrap
const AlertsManager = (function () {
    // Trova gli elementi del modal solo una volta
    const modalElement = document.getElementById("alertModal");
    const alertModalBody = document.getElementById("alertModalBody");
    const alertModalLabel = document.getElementById("alertModalLabel");
    let bootstrapModalInstance = null;

    // Inizializza l'istanza di Bootstrap Modal se l'elemento esiste
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrapModalInstance = new bootstrap.Modal(modalElement);
    } else {
        console.error("Elemento Modal '#alertModal' non trovato o Bootstrap non caricato. AlertsManager non funzionerà correttamente.");
    }

    /**
     * Mostra un messaggio nel modal.
     * @param {string} type - Tipo di messaggio ('success', 'error', 'warning', 'info'). Determina il titolo.
     * @param {string} text - Il testo del messaggio (può contenere HTML semplice).
     * @param {number} [duration=5000] - Durata in millisecondi prima della chiusura automatica. 0 per non chiudere automaticamente.
     */
    function showMessage(type, text, duration = 5000) {
        // Non fare nulla se il modal non è inizializzato
        if (!bootstrapModalInstance || !alertModalBody || !alertModalLabel) {
            console.error(`Tentativo di mostrare messaggio [${type}] fallito: Modal non inizializzato. Messaggio: ${text}`);
            // Fallback con alert nativo
            alert(`[${type.toUpperCase()}] ${text}`);
            return;
        }

        // Imposta il titolo in base al tipo
        switch (type.toLowerCase()) {
            case "success":
                alertModalLabel.textContent = "Successo";
                break;
            case "error":
                alertModalLabel.textContent = "Errore";
                break;
            case "warning":
                alertModalLabel.textContent = "Attenzione";
                break;
            default:
                alertModalLabel.textContent = "Informazione";
        }

        // Imposta il corpo del messaggio (permetti HTML di base)
        alertModalBody.innerHTML = text; // Usare innerHTML con cautela, assicurati che 'text' sia fidato o sanitizzato se viene dall'utente

        // Mostra il modal
        bootstrapModalInstance.show();

        // Imposta timeout per chiusura automatica (se durata > 0)
        if (duration > 0) {
            setTimeout(() => {
                // Controlla se il modal è ancora visibile prima di chiuderlo
                // (l'utente potrebbe averlo chiuso manualmente nel frattempo)
                if (modalElement && modalElement.classList.contains('show')) {
                    bootstrapModalInstance.hide();
                }
            }, duration);
        }
    }

    /**
     * Chiude forzatamente il modal.
     */
    function clearAllMessages() {
        if (bootstrapModalInstance) {
            bootstrapModalInstance.hide();
            // Opzionale: pulire il contenuto dopo la chiusura
            // modalElement.addEventListener('hidden.bs.modal', () => {
            //    if (alertModalBody) alertModalBody.innerHTML = "";
            //    if (alertModalLabel) alertModalLabel.textContent = "Messaggio";
            // }, { once: true });
        }
    }

    // Rendi pubbliche le funzioni
    return {
        showMessage,
        clearAllMessages
    };
})();

// Esponi AlertsManager globalmente (se necessario)
window.AlertsManager = AlertsManager;