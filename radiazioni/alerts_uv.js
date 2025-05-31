// Gestore di messaggi modali Bootstrap
const AlertsManager = (function () {
    // Trova gli elementi del modal solo una volta
    const modalElement = document.getElementById("alertModal");
    const alertModalBody = document.getElementById("alertModalBody");
    const alertModalLabel = document.getElementById("alertModalLabel");
    let bootstrapModalInstance = null;

    // Inizializza l'istanza di Bootstrap Modal se l'elemento esiste
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
            bootstrapModalInstance = new bootstrap.Modal(modalElement);
        } catch (e) {
            console.error("Errore durante l'inizializzazione del Modal Bootstrap:", e);
        }
    } else if (!modalElement) {
        console.error("Elemento Modal '#alertModal' non trovato.");
    } else if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
        console.error("Libreria Bootstrap Modal non trovata o non caricata.");
    }

    function showMessage(type, text, duration = 5000) {
        if (!bootstrapModalInstance || !alertModalBody || !alertModalLabel) {
            console.error(`Tentativo di mostrare messaggio [${type}] fallito: Modal non inizializzato. Messaggio: ${text}`);
            alert(`[${type.toUpperCase()}] ${text}`); // Fallback
            return;
        }

        switch (type.toLowerCase()) {
            case "success": alertModalLabel.textContent = "Successo"; break;
            case "error": alertModalLabel.textContent = "Errore"; break;
            case "warning": alertModalLabel.textContent = "Attenzione"; break;
            default: alertModalLabel.textContent = "Informazione";
        }
        alertModalBody.innerHTML = text;

        try {
            bootstrapModalInstance.show();
        } catch (e) {
            console.error("Errore durante la visualizzazione del modal:", e);
            alert(`[${type.toUpperCase()}] ${text}`); // Fallback
            return;
        }

        if (duration > 0) {
            setTimeout(() => {
                if (modalElement && bootstrapModalInstance && modalElement.classList.contains('show')) {
                    try { bootstrapModalInstance.hide(); } catch (e) { console.error("Errore durante la chiusura automatica del modal:", e); }
                }
            }, duration);
        }
    }

    function clearAllMessages() {
        if (bootstrapModalInstance && modalElement && modalElement.classList.contains('show')) {
            try { bootstrapModalInstance.hide(); } catch (e) { console.error("Errore durante la chiusura forzata del modal:", e); }
        }
    }

    return { showMessage, clearAllMessages };
})();
window.AlertsManager = AlertsManager;