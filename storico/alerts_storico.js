// Gestore di messaggi modali Bootstrap
const AlertsManager = (function () {
    const modalElement = document.getElementById("alertModal");
    const alertModalBody = document.getElementById("alertModalBody");
    const alertModalLabel = document.getElementById("alertModalLabel");
    let bootstrapModalInstance = null;
    if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) { try { bootstrapModalInstance = new bootstrap.Modal(modalElement); } catch (e) { console.error("Errore inizializzazione Modal:", e); } } else if (!modalElement) { console.error("Elemento Modal '#alertModal' non trovato."); } else if (typeof bootstrap === 'undefined' || !bootstrap.Modal) { console.error("Libreria Bootstrap Modal non trovata."); }
    function showMessage(type, text, duration = 6000) { if (!bootstrapModalInstance || !alertModalBody || !alertModalLabel) { console.error(`Show message [${type}] failed: Modal not initialized. Msg: ${text}`); alert(`[${type.toUpperCase()}] ${text}`); return; } switch (type.toLowerCase()) { case "success": alertModalLabel.textContent = "Successo"; break; case "error": alertModalLabel.textContent = "Errore"; break; case "warning": alertModalLabel.textContent = "Attenzione"; break; default: alertModalLabel.textContent = "Informazione"; } alertModalBody.innerHTML = text; try { bootstrapModalInstance.show(); } catch (e) { console.error("Errore show modal:", e); alert(`[${type.toUpperCase()}] ${text}`); return; } if (duration > 0) { setTimeout(() => { if (modalElement && bootstrapModalInstance && modalElement.classList.contains('show')) { try { bootstrapModalInstance.hide(); } catch (e) { console.error("Errore hide modal:", e); } } }, duration); } }
    function clearAllMessages() { if (bootstrapModalInstance && modalElement && modalElement.classList.contains('show')) { try { bootstrapModalInstance.hide(); } catch (e) { console.error("Errore clear modal:", e); } } }
    return { showMessage, clearAllMessages };
})();
window.AlertsManager = AlertsManager;