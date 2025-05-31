// Gestione centralizzata dei messaggi (via Modal di Bootstrap)
const AlertsManager = (function () {
    // Ensure the modal element exists before creating the Bootstrap Modal instance
    const modalElement = document.getElementById("alertModal");
    let alertModalInstance = null;
    if (modalElement) {
        try {
            alertModalInstance = new bootstrap.Modal(modalElement);
        } catch (e) {
            console.error("Failed to initialize Bootstrap Modal:", e);
            // Provide fallback mechanism or disable functionality
            return { // Return a dummy object if modal fails
                showMessage: (type, text) => console.log(`ALERT (${type}): ${text}`), // Log to console as fallback
                clearAllMessages: () => { }
            };
        }
    } else {
        console.error("Modal element #alertModal not found.");
        return { // Return a dummy object if modal element not found
            showMessage: (type, text) => console.log(`ALERT (${type}): ${text}`),
            clearAllMessages: () => { }
        };
    }


    const alertModalBody = document.getElementById("alertModalBody");
    const alertModalLabel = document.getElementById("alertModalLabel");
    let closeTimer = null; // To manage the auto-close timeout

    /**
     * Mostra un messaggio dentro la modal.
     * @param {string} type - info, success, warning, error
     * @param {string} text - contenuto del messaggio HTML supportato
     * @param {number} duration - ms prima di chiudere (0 = non chiudere)
     */
    function showMessage(type, text, duration = 5000) {
        // Ensure modal instance and elements are available
        if (!alertModalInstance || !alertModalBody || !alertModalLabel) {
            console.error("Cannot show message: Modal components not ready.");
            console.log(`Fallback ALERT (${type}): ${text}`); // Log message if modal fails
            return;
        }

        // Clear previous timer if exists
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        // Imposta titolo e stile base (puoi aggiungere classi per colore)
        let title = "Informazione"; // Default title
        alertModalLabel.classList.remove('text-success', 'text-danger', 'text-warning', 'text-info'); // Reset colors

        switch (type) {
            case "success":
                title = "Successo";
                alertModalLabel.classList.add('text-success');
                break;
            case "error":
                title = "Errore";
                alertModalLabel.classList.add('text-danger');
                break;
            case "warning":
                title = "Attenzione";
                alertModalLabel.classList.add('text-warning');
                break;
            case "info": // Explicitly handle info
                title = "Informazione";
                alertModalLabel.classList.add('text-info');
                break;
            default: // Keep default title for unknown types
                title = "Messaggio";
        }
        alertModalLabel.textContent = title;

        // Imposta il corpo del messaggio (permette HTML)
        // *** SYNTAX CORRECTION: Added backticks for template literal ***
        alertModalBody.innerHTML = `<p>${text}</p>`; // Use innerHTML to allow basic formatting if needed

        // Mostra modal
        try {
            alertModalInstance.show();
        } catch (e) {
            console.error("Error showing modal:", e);
        }


        // Timer di chiusura automatica
        if (duration > 0) {
            closeTimer = setTimeout(() => {
                try {
                    if (alertModalInstance) { // Check if instance still exists
                        alertModalInstance.hide();
                    }
                } catch (e) {
                    console.error("Error hiding modal:", e);
                }
                closeTimer = null; // Reset timer variable
            }, duration);
        }
    }

    // Chiude la modal e resetta il contenuto
    function clearAllMessages() {
        if (!alertModalInstance || !alertModalBody || !alertModalLabel) return; // Check if components exist

        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        // Svuota il contenuto
        alertModalBody.innerHTML = "";
        alertModalLabel.textContent = "Messaggio"; // Reset title
        alertModalLabel.classList.remove('text-success', 'text-danger', 'text-warning', 'text-info'); // Reset colors

        // Nasconde la modal se è visibile
        try {
            // Check if the modal is currently shown before trying to hide
            // Note: Bootstrap 5 doesn't have a reliable public `isShown` property on the instance easily accessible here.
            // We can try hiding anyway, or check the element's classes/attributes if needed, but hide() handles it gracefully if not shown.
            alertModalInstance.hide();
        } catch (e) {
            console.error("Error hiding modal during clear:", e);
        }
    }

    // Expose public methods
    return {
        showMessage,
        clearAllMessages
    };
})();

// Assign to window only if AlertsManager was successfully created
if (typeof AlertsManager !== 'undefined') {
    window.AlertsManager = AlertsManager;
} else {
    console.error("AlertsManager could not be initialized.");
    // Define a dummy fallback on window to prevent errors in other scripts
    window.AlertsManager = {
        showMessage: (type, text) => console.log(`ALERT (${type}): ${text}`),
        clearAllMessages: () => { }
    };
}