const AlertsManager = (function () {
    const alertModal = new bootstrap.Modal(document.getElementById("alertModal"));
    const alertModalBody = document.getElementById("alertModalBody");
    const alertModalLabel = document.getElementById("alertModalLabel");

    function showMessage(type, text, duration = 5000) {
        switch (type) {
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
        alertModalBody.innerHTML = `<p>${text}</p>`;
        alertModal.show();

        if (duration > 0) {
            setTimeout(() => {
                alertModal.hide();
            }, duration);
        }
    }

    function clearAllMessages() {
        alertModalBody.innerHTML = "";
        alertModalLabel.textContent = "";
        alertModal.hide();
    }

    return {
        showMessage,
        clearAllMessages
    };
})();
window.AlertsManager = AlertsManager;
