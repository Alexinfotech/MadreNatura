document.addEventListener("DOMContentLoaded", function () {

    // --- Riferimenti DOM ---
    const mainContent = document.getElementById('main-content');
    const sidebarNav = document.getElementById('sidebar-nav');
    const viewTitle = document.getElementById('view-title');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const sidebarGuideLinksContainer = document.getElementById('sidebar-guide-links-container');

    // --- Variabili Globali ---
    let appData = null;
    let guideDataMap = {};
    let searchableIndex = [];
    let yearlyLunarData = null;
    const guideDataFilePath = 'coltivazione_guida.json'; // Assicurati sia corretto!
    const currentYear = new Date().getFullYear();
    let bsModal;

    // --- Funzioni Helper Essenziali ---
    function showSpinner(show) {
        if (loadingSpinner) loadingSpinner.style.display = show ? 'flex' : 'none';
    }

    function showMessage(type, text) {
        try {
            const modalE = document.getElementById('alertModal');
            if (!modalE) { console.error("Modal #alertModal non trovato"); return; }
            const modalTitle = modalE.querySelector('.modal-title');
            const modalBody = modalE.querySelector('.modal-body');
            const modalHeader = modalE.querySelector('.modal-header');
            if (!modalTitle || !modalBody || !modalHeader) { console.error("Elementi interni modal mancanti"); return; }

            if (!bsModal || bsModal._element !== modalE) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    bsModal = new bootstrap.Modal(modalE);
                } else {
                    console.error("Bootstrap Modal non è disponibile.");
                    alert(`Msg (${type}): ${text}`); // Fallback alert
                    return;
                }
            }

            modalTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            modalBody.innerHTML = text; // Use innerHTML carefully, ensure text is safe or sanitized if from user input
            modalHeader.className = 'modal-header custom-modal-header'; // Reset classes
            const typeClass = { success: 'bg-success', warning: 'bg-warning text-dark', error: 'bg-danger', info: 'bg-info' }[type] || 'bg-info';
            modalHeader.classList.add(typeClass);

            if (bsModal) {
                // Delay slightly sometimes helps rendering/display issues with modals
                setTimeout(() => bsModal.show(), 150);
            } else {
                console.error("Impossibile mostrare istanza Modal Bootstrap");
            }

        } catch (e) { console.error("Errore in showMessage:", e); alert(`Msg (${type}): ${text}`); } // Fallback alert
    }

    function getPhaseType(phaseName) {
        if (!phaseName) return null;
        const nameLower = phaseName.toLowerCase();
        // Assuming these names match the API/data exactly
        if (nameLower === 'nuova' || nameLower === 'primo quarto') return 'crescente';
        if (nameLower === 'piena' || nameLower === 'ultimo quarto') return 'calante';
        return null; // Or 'unknown' if needed
    }

    function getLunarPhaseIcon(phaseName) {
        // Using Font Awesome icons
        if (!phaseName) return 'fa-circle-question'; // Default icon
        switch (phaseName) {
            case 'Nuova': return 'fa-moon'; // New Moon
            case 'Primo Quarto': return 'fa-adjust fa-rotate-270'; // First Quarter (looks like a half-moon rotated)
            case 'Piena': return 'fa-circle'; // Full Moon (represented by a solid circle)
            case 'Ultimo Quarto': return 'fa-adjust fa-rotate-90'; // Third/Last Quarter (opposite rotation)
            default: return 'fa-circle-question'; // Icon for unknown phases
        }
    }

    function getLunarPhaseClass(phaseName) {
        // CSS classes for styling based on phase
        if (!phaseName) return '';
        switch (phaseName) {
            case 'Nuova': return 'phase-new-moon';
            case 'Primo Quarto': return 'phase-first-quarter';
            case 'Piena': return 'phase-full-moon';
            case 'Ultimo Quarto': return 'phase-third-quarter';
            default: return '';
        }
    }

    function getIconForSection(title) {
        // Map section titles (or keywords) to Font Awesome icons
        if (!title) return 'fa-book-open'; // Default icon
        title = title.toLowerCase();
        if (title.includes('posizione') || title.includes('ambiente')) return 'fa-map-marker-alt';
        if (title.includes('strumenti') || title.includes('attrezzature')) return 'fa-tools';
        if (title.includes('terreno')) return 'fa-layer-group';
        if (title.includes('pianificazione') || title.includes('rotazione')) return 'fa-calendar-check';
        if (title.includes('calendario agricolo')) return 'fa-calendar-days';
        if (title.includes('irrigazione')) return 'fa-tint'; // Water drop
        if (title.includes('concimazione')) return 'fa-leaf'; // Leaf
        if (title.includes('parassiti') || title.includes('malattie')) return 'fa-bug'; // Bug
        if (title.includes('cura') || title.includes('potatura') || title.includes('tutoraggio')) return 'fa-cut'; // Scissors
        if (title.includes('infestanti')) return 'fa-skull-crossbones'; // Warning/danger
        if (title.includes('raccolta') || title.includes('conservazione')) return 'fa-shopping-basket';
        if (title.includes('sicurezza')) return 'fa-hard-hat'; // Safety helmet
        if (title.includes('approfondimenti')) return 'fa-lightbulb'; // Idea/insight
        if (title.includes('alberi') || title.includes('frutto')) return 'fa-apple-alt'; // Fruit
        if (title.includes('innesto')) return 'fa-link'; // Grafting/linking
        if (title.includes('risoluzione') || title.includes('problemi') || title.includes('faq')) return 'fa-question-circle';
        return 'fa-book-open'; // Default fallback
    }

    function sanitizeHtml(str) {
        // Basic sanitization: convert string to text content then back to HTML
        // This escapes HTML tags (<, >) and ampersands (&).
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    function renderSanitized(str) {
        // Sanitizes and replaces newlines with <br> for display in HTML
        return str ? sanitizeHtml(str).replace(/\n/g, '<br>') : '';
    }

    // --- Caricamento e Indicizzazione Dati ---
    async function loadAppData() {
        if (appData) return appData; // Return cached data if already loaded
        console.log("Caricamento dati guida...");
        showSpinner(true);
        try {
            const response = await fetch(guideDataFilePath);
            if (!response.ok) throw new Error(`Errore HTTP ${response.status} caricando ${guideDataFilePath}`);
            const data = await response.json();
            // Basic validation of the data structure
            if (!Array.isArray(data)) throw new Error("Formato JSON guida non valido (non è un array).");
            appData = data;
            // Create a map for quick lookup by section ID
            guideDataMap = appData.reduce((map, section) => {
                if (section && section.id) { // Ensure section and id exist
                    map[section.id] = section;
                }
                return map;
            }, {});
            buildSearchableIndex(); // Build the search index after data is loaded
            console.log(`Dati guida caricati: ${appData.length} sezioni.`);
            populateSidebarGuideLinks(); // Update the sidebar links
            return appData;
        } catch (error) {
            console.error("Errore CARICAMENTO/INDICIZZAZIONE dati:", error);
            showMessage('error', `Impossibile caricare i dati della guida:<br>${error.message}. Controlla il file JSON e il percorso.`);
            appData = null; guideDataMap = {}; searchableIndex = []; // Reset state on error
            if (mainContent) mainContent.innerHTML = `<div class="alert alert-danger text-center">Errore critico: Dati applicazione non caricati. Per favore ricarica la pagina o contatta l'assistenza.</div>`;
            return null;
        } finally {
            showSpinner(false); // Hide spinner regardless of success or failure
        }
    }

    async function fetchLunarData(year) {
        // Fetch lunar phase data, potentially via a proxy
        // Cache results for the same year to avoid redundant requests
        if (yearlyLunarData && yearlyLunarData.year === year) return yearlyLunarData.phases;
        console.log(`Caricamento dati lunari per ${year}...`);
        try {
            // Use a proxy script (PHP in this case) to fetch external API data if needed
            // Ensure the path 'proxy_lunar.php' is correct relative to the HTML file
            const response = await fetch(`proxy_lunar.php?year=${year}`);
            if (!response.ok) throw new Error(`Errore server ${response.status} durante la richiesta dei dati lunari.`);
            const data = await response.json();
            // Validate the structure of the response from the proxy/API
            if (data.status !== 'success' || !data.phases) throw new Error(data.message || 'Risposta API fasi lunari non valida o incompleta.');
            yearlyLunarData = { year: data.year, phases: data.phases }; // Cache the data
            console.log("Dati lunari caricati con successo.");
            return yearlyLunarData.phases;
        } catch (error) {
            console.error("Errore fetchLunarData:", error);
            const lunarContent = document.getElementById('lunar-calendar-content');
            if (lunarContent) lunarContent.innerHTML = `<p class="text-danger text-center fw-bold">Errore nel caricamento dei dati lunari. Riprova più tardi.</p>`;
            yearlyLunarData = null; // Clear cache on error
            return null;
        }
    }

    function buildSearchableIndex() {
        // Creates an index of searchable content from the guide data
        searchableIndex = [];
        if (!appData) return; // Need data to build index
        console.time("BuildIndex"); // Start timing the index build process

        appData.forEach(section => {
            // Basic check for valid section structure
            if (!section?.id || !section.title) return;

            const sectionTitleLower = section.title.toLowerCase();
            // Index the main section title
            searchableIndex.push({
                id: `section-${section.id}`, // Unique ID for this index item
                sectionId: section.id,      // Reference to the parent section
                type: 'section_title',      // Type of content
                title: section.title,       // Original title
                keywords: extractKeywords(sectionTitleLower), // Extracted keywords
                text: sectionTitleLower,    // Lowercase text content for searching
                path: ['title'],            // Path within the section structure (conceptual)
                element: section            // Reference to the original section object
            });

            // Recursive function to process nested elements within a section's content
            function processElements(elements, path = [], parentElement = null) {
                if (!Array.isArray(elements)) return; // Stop if 'elements' is not an array

                elements.forEach((element, index) => {
                    if (!element?.type) return; // Skip elements without a type

                    const currentPath = [...path, element.type, index]; // Track the path to this element
                    let textContent = '', elementTitle = element.title || element.name || '', elementType = element.type;

                    // Aggregate text content from various potential fields
                    if (element.text) textContent += element.text + ' ';
                    if (element.definition) textContent += element.definition + ' ';
                    if (Array.isArray(element.details)) {
                        element.details.forEach(d => textContent += (d.term ? d.term + ': ' : '') + d.definition + ' ');
                    }
                    if (Array.isArray(element.items)) {
                        // Handle lists of strings or objects with definitions
                        if (element.items.length > 0) {
                            if (typeof element.items[0] === 'string') {
                                textContent += element.items.join(' ') + ' ';
                            } else if (typeof element.items[0] === 'object' && element.items[0]?.definition !== undefined) {
                                element.items.forEach(i => textContent += (i.term ? i.term + ': ' : '') + i.definition + ' ');
                            }
                        }
                    }

                    // Special handling for specific element types
                    if (elementType === 'plant_calendar' && Array.isArray(element.plants)) {
                        // Index each plant within a plant calendar separately
                        element.plants.forEach(p => {
                            if (!p?.name) return; // Skip plants without names
                            const plantText = `${p.name} ${p.semina || ''} ${p.trapianto || ''} ${p.raccolto || ''}`;
                            const plantKeywords = extractKeywords(plantText.toLowerCase());
                            searchableIndex.push({
                                id: `plant-${section.id}-${p.name.replace(/\s+/g, '-')}`, // Generate unique ID
                                sectionId: section.id,
                                type: 'plant_info',
                                title: `Info: ${p.name}`,
                                keywords: plantKeywords,
                                text: plantText.toLowerCase(),
                                plantData: p, // Store original plant data
                                path: [...currentPath, 'plants', p.name],
                                element: p // Reference original plant object
                            });
                        });
                        elementType = null; // Don't index the container element itself after indexing plants
                    } else if (elementType === 'monthly_calendar_details') {
                        // Create a meaningful title and aggregate text for monthly details
                        elementTitle = `Calendario: ${element.month}`;
                        textContent = `Semine: ${element.semine_protette || element.semine || ''}. Trapianti: ${element.trapianti_terreno || ''}. Raccolto: ${element.raccolto || ''}. Innesti: ${element.innesti || ''}. Cure: ${element.cure_terreno || element.cure_messa_a_riposo || ''}.`;
                        elementType = 'month_details'; // Assign a specific type for search
                    }

                    textContent = textContent.trim().toLowerCase(); // Normalize text
                    elementTitle = elementTitle.trim();

                    // Add to index if it has content or a title and meets criteria
                    if (elementType && (textContent || elementTitle)) {
                        const keywords = extractKeywords(elementTitle.toLowerCase() + ' ' + textContent);
                        // Only index if it has keywords or a title to avoid empty entries
                        if (keywords.length > 0 || elementTitle) {
                            searchableIndex.push({
                                id: `element-${section.id}-${currentPath.join('-')}`, // Unique ID
                                sectionId: section.id,
                                type: elementType,
                                title: elementTitle,
                                keywords: keywords,
                                text: textContent,
                                path: currentPath,
                                element: element // Reference original element object
                            });
                        }
                    }

                    // Recursively process nested 'elements' arrays
                    if (Array.isArray(element.elements)) {
                        processElements(element.elements, currentPath, element);
                    }
                });
            } // End of processElements function

            // Start processing the main content array of the section
            if (Array.isArray(section.content)) {
                processElements(section.content, ['content'], section);
            }
        }); // End of appData.forEach

        console.timeEnd("BuildIndex"); // Stop timing
        console.log(`Indice costruito: ${searchableIndex.length} elementi.`);
    }

    function extractKeywords(text) {
        // Extracts potentially meaningful keywords from a text string
        if (!text) return [];

        // 1. Normalize: lowercase, remove accents
        // 2. Sanitize: remove punctuation
        // 3. Tokenize: split into words
        // 4. Filter: remove short words, numbers, common stop words, and specific project-related terms
        const words = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[.,;:!?()\[\]{}"'“”‘’]/g, ' ') // Replace punctuation with space
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim()
            .split(' ');

        // Extensive list of common Italian stop words and potentially less useful terms from the data structure
        const stopWords = new Set([
            'e', 'è', 'é', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
            'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
            'che', 'chi', 'cui', 'non', 'si', 'se', 'ma', 'o', 'come', 'cosa',
            'del', 'della', 'dello', 'dei', 'degli', 'delle',
            'al', 'alla', 'allo', 'ai', 'agli', 'alle',
            'dal', 'dalla', 'dallo', 'dai', 'dagli', 'dalle',
            'nel', 'nella', 'nello', 'nei', 'negli', 'nelle',
            'col', 'coi', 'sul', 'sulla', 'sullo', 'sui', 'sugli', 'sulle',
            'sono', 'essere', 'avere', 'fare', 'perché', 'quando', 'dove', 'può', 'più',
            'tipo', 'es', 'ad', 'null', 'term', 'definition', 'title', 'elements', 'items', 'id',
            'content', 'type', 'name', 'details', 'subsection', 'subsubsection', 'paragraph',
            'list', 'note', 'conclusion', 'text', 'plants', 'semina', 'trapianto', 'raccolto',
            'mese', 'anno', 'giorno', 'esempio', 'dettaglio', 'descrizione', 'utilizzo', 'utilizzi',
            'vantaggi', 'vantaggio', 'svantaggi', 'svantaggio', 'contro', 'come', 'uso', 'usare',
            'fare', 'deve', 'possono', 'possa', 'utile', 'utili', 'modo', 'altro', 'altri',
            'stesso', 'stessa', 'quale', 'quali', 'questo', 'questa', 'questi', 'queste',
            'perche', 'cosi', 'cioè', 'cioe', 'ogni', 'alcuni', 'alcune', 'anche', 'quindi',
            'poi', 'infatti', 'soprattutto', 'generalmente', 'particolare', 'necessario',
            'necessaria', 'importante', 'molto', 'solo', 'sempre', 'bene', 'male'
            // Add more domain-specific stop words if needed
        ]);

        const keywords = words.filter(word =>
            word.length > 2 &&           // Keep words longer than 2 chars
            !stopWords.has(word) &&      // Exclude stop words
            !/^\d+$/.test(word) &&       // Exclude pure numbers
            !/&[a-z]+;/.test(word)       // Exclude HTML entities like  
        );

        // Return unique keywords
        return [...new Set(keywords)];
    }

    // --- Popolamento Sidebar ---
    function populateSidebarGuideLinks() {
        // Populates the sidebar navigation with links to guide sections
        if (!sidebarGuideLinksContainer || !appData) {
            console.warn("Contenitore link sidebar o dati app non disponibili.");
            return;
        }
        sidebarGuideLinksContainer.innerHTML = ''; // Clear existing links
        let linksHtml = '';
        // Sort section IDs numerically (assuming they are numbers or string numbers)
        const sortedKeys = Object.keys(guideDataMap).sort((a, b) => parseInt(a) - parseInt(b));

        sortedKeys.forEach(sectionId => {
            const section = guideDataMap[sectionId];
            if (section?.title) { // Only add links for sections with titles
                linksHtml += `<a href="#guide-${section.id}" class="list-group-item list-group-item-action bg-transparent second-text" data-view="guide" data-section-id="${section.id}">
                                 <i class="fas ${getIconForSection(section.title)} fa-fw me-2"></i>${section.id}. ${sanitizeHtml(section.title)}
                              </a>`;
            }
        });
        sidebarGuideLinksContainer.innerHTML = linksHtml;
        // Add event listeners to the newly created links for SPA navigation
        addNavigationListeners(sidebarGuideLinksContainer);
    }

    // --- Rendering Contenuto Guida (Funzioni render*) ---
    function renderSectionContent(contentArray) {
        // Renders an array of content elements for a section
        if (!Array.isArray(contentArray)) {
            return '<p class="text-warning">Contenuto della sezione non disponibile o in formato non valido.</p>';
        }
        if (contentArray.length === 0) {
            return '<p class="text-muted">Questa sezione non ha ancora contenuti.</p>';
        }
        // Map each element to its HTML representation and join them
        return contentArray.map(element => renderElement(element)).join('');
    }

    function renderElement(element) {
        // Renders a single content element based on its type
        if (!element || !element.type) return ''; // Skip if element or type is missing

        try {
            switch (element.type) {
                case 'subsection':
                    return `<div class="subsection mt-4">
                                <h3>${sanitizeHtml(element.title) || 'Sottosezione'}</h3>
                                ${renderSectionContent(element.elements)}
                            </div>`;
                case 'subsubsection':
                    return `<div class="subsubsection mt-3">
                                <h4>${sanitizeHtml(element.title) || 'Paragrafo'}</h4>
                                ${renderSectionContent(element.elements)}
                            </div>`;
                case 'paragraph':
                    return `<p>${renderSanitized(element.text)}</p>`; // Use renderSanitized for text
                case 'list':
                    const listItems = (element.items || [])
                        .map(item => `<li>${renderSanitized(item)}</li>`).join('');
                    return `<ul>${listItems}</ul>`;
                case 'definition_list':
                    const dtddItems = (element.items || [])
                        .map(item => `${item.term ? `<dt>${sanitizeHtml(item.term)}</dt>` : ''}<dd>${renderSanitized(item.definition)}</dd>`)
                        .join('');
                    return `${element.title ? `<h5>${sanitizeHtml(element.title)}</h5>` : ''}
                            <dl class="definition_list">${dtddItems}</dl>`;
                case 'item_description':
                    const detailsHtml = (element.details || [])
                        .map(detail => `${detail.term ? `<dt>${sanitizeHtml(detail.term)}</dt>` : ''}<dd>${renderSanitized(detail.definition)}</dd>`)
                        .join('');
                    return `<div class="item_description my-3">
                                <strong>${sanitizeHtml(element.name) || 'Elemento'}</strong>
                                <dl>${detailsHtml}</dl>
                            </div>`;
                case 'note':
                    return `<p class="text-muted fst-italic border-start border-3 border-secondary ps-3 my-3"><small>${renderSanitized(element.text)}</small></p>`;
                case 'conclusion':
                    return `<hr><p class="fw-bold mt-3">${renderSanitized(element.text)}</p>`;
                case 'plant_calendar':
                    // Special rendering function for plant calendars
                    return renderPlantCalendarTable(element);
                case 'monthly_calendar_details':
                    // This type is handled during indexing, might not need direct rendering here
                    // Or could be rendered if needed, e.g., within a specific calendar view
                    return ''; // Return empty string if not rendered directly
                default:
                    // Warn about unhandled types, but don't break the page
                    console.warn(`Tipo elemento non gestito: ${element.type}`, element);
                    return `<p class="text-danger small"><em>Contenuto di tipo '${sanitizeHtml(element.type)}' non visualizzabile.</em></p>`;
            }
        } catch (e) {
            console.error("Errore durante il rendering dell'elemento:", e, element);
            return `<p class="text-danger small"><em>Errore nella visualizzazione di questo contenuto.</em></p>`;
        }
    }

    function renderPlantCalendarTable(element) {
        // Renders a table for the plant calendar data
        const plants = element?.plants;
        if (!plants || !Array.isArray(plants) || plants.length === 0) {
            return '<p class="text-muted">Dati del calendario piante non disponibili.</p>';
        }

        let tableHtml = `
            <h4 class="mt-4">${sanitizeHtml(element.title) || 'Calendario Indicativo Colture'}</h4>
            <div class="table-responsive">
                <table class="table table-sm table-striped table-bordered table-hover caption-top">
                 <caption>${sanitizeHtml(element.caption) || 'Periodi indicativi. Fare riferimento alle condizioni locali.'}</caption>
                    <thead class="table-light">
                        <tr>
                            <th>Pianta</th>
                            <th>Semina</th>
                            <th>Trapianto</th>
                            <th>Raccolto</th>
                        </tr>
                    </thead>
                    <tbody>`;

        plants.forEach(plant => {
            const plantName = plant.name || 'N/D';
            // Create a link for the plant name to trigger a search in the 'home' view
            const plantLink = `<a href="#home" data-view="home" data-query="${encodeURIComponent(plantName)}">${sanitizeHtml(plantName)}</a>`;
            tableHtml += `<tr>
                             <td>${plantLink}</td>
                             <td>${sanitizeHtml(plant.semina) || '-'}</td>
                             <td>${sanitizeHtml(plant.trapianto) || '-'}</td>
                             <td>${sanitizeHtml(plant.raccolto) || '-'}</td>
                          </tr>`;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>`;
        return tableHtml;
    }

    // --- Gestione Viste ---
    function switchView(viewId, params = null) {
        console.log(`Switching view to: ${viewId}`, params || {});
        if (!appData && viewId !== 'home') { // Allow home view even if data loading failed initially
            showMessage('error', "Dati dell'applicazione non ancora pronti. Riprova tra poco.");
            if (viewId !== 'home') return; // Prevent switching to other views
        }
        if (!mainContent) {
            console.error("Elemento #main-content non trovato nel DOM!");
            return;
        }

        showSpinner(true); // Show spinner during view transition
        mainContent.innerHTML = ''; // Clear previous content

        // Update active state in sidebar navigation
        const activeLink = sidebarNav.querySelector('.list-group-item.active');
        if (activeLink) activeLink.classList.remove('active');

        let newActiveSelector = `.list-group-item[data-view="${viewId}"]`;
        let pageTitle = 'Assistente Coltivazione'; // Default title

        if (viewId === 'guide' && params?.sectionId) {
            newActiveSelector += `[data-section-id="${params.sectionId}"]`;
            const section = guideDataMap[params.sectionId];
            pageTitle = section ? `${section.id}. ${section.title}` : `Guida - Sezione ${params.sectionId}`;
        } else {
            // For views without sectionId, select the generic link
            newActiveSelector += `:not([data-section-id])`;
            const linkElement = sidebarNav.querySelector(newActiveSelector);
            if (linkElement) pageTitle = linkElement.innerText.trim();
            if (viewId === 'home' && params?.query) {
                pageTitle = `Risposta per: "${params.query}"`; // Title for search results
            } else if (viewId === 'home') {
                pageTitle = "Chiedi all'Assistente"; // Title for the main query page
            }
            // Update page title for other views if needed
            else if (viewId === 'index') pageTitle = "Indice Guida";
            else if (viewId === 'plant-calendar') pageTitle = "Calendario Colture";
            else if (viewId === 'lunar-calendar') pageTitle = `Calendario Lunare ${currentYear}`;
        }

        if (viewTitle) viewTitle.textContent = pageTitle; // Update the main title display
        document.title = pageTitle + " - Coltivazione"; // Update browser tab title

        const newActiveLink = sidebarNav.querySelector(newActiveSelector);
        if (newActiveLink) newActiveLink.classList.add('active');

        // Render the content for the selected view
        try {
            switch (viewId) {
                case 'home':
                    renderHomeView(params?.query); // Pass query if available
                    break;
                case 'index':
                    renderIndexView();
                    break;
                case 'plant-calendar':
                    renderPlantCalendarView();
                    break;
                case 'lunar-calendar':
                    renderLunarCalendarView(); // This is async, spinner handled inside
                    break;
                case 'guide':
                    if (params?.sectionId && guideDataMap[params.sectionId]) {
                        renderGuideSectionView(params.sectionId);
                    } else {
                        console.warn(`Tentativo di accesso a sezione guida non valida: ${params?.sectionId}`);
                        showMessage('warning', `Sezione guida ID '${params?.sectionId || 'mancante'}' non trovata.`);
                        renderHomeView(); // Fallback to home view
                    }
                    break;
                default:
                    console.warn(`Vista non riconosciuta: ${viewId}. Reindirizzamento a home.`);
                    renderHomeView(); // Default fallback view
            }
        } catch (e) {
            console.error(`Errore durante il rendering della vista ${viewId}:`, e);
            showMessage('error', `Errore durante il caricamento della vista '${pageTitle}'.`);
            if (mainContent) mainContent.innerHTML = `<div class="alert alert-danger text-center">Si è verificato un errore nel caricamento di questa sezione.</div>`;
            showSpinner(false); // Ensure spinner is hidden on error
        } finally {
            window.scrollTo(0, 0); // Scroll to top on view change
            // Spinner is hidden within async functions or here for sync ones
            if (viewId !== 'lunar-calendar') { // lunar calendar handles its own spinner
                showSpinner(false);
            }
        }
    }


    // --- Rendering Viste Specifiche ---
    function renderHomeView(initialQuery = null) {
        // Renders the main 'Ask the Assistant' view
        mainContent.innerHTML = `
             <div class="container my-container">
                 <div class="header text-center mb-4">
                     <h1><i class="fas fa-comments me-2"></i> Chiedi all'Assistente</h1>
                     <p class="lead">Fai una domanda sulla coltivazione, il giardinaggio o le piante.</p>
                     <p class="small text-muted">Esempi: "terreno ideale per pomodori", "rimedi naturali afidi", "quando potare il melo", "cura orchidee"</p>
                 </div>

                 <div id="query-section" class="mb-4 card p-3 shadow-sm">
                     <div class="card-body">
                          <label for="queryInput" class="form-label fw-bold">La tua domanda:</label>
                         <div class="input-group">
                             <textarea class="form-control" id="queryInput" rows="3" placeholder="Scrivi qui la tua domanda o le parole chiave..." aria-label="Domanda sulla coltivazione">${initialQuery ? sanitizeHtml(initialQuery) : ''}</textarea>
                             <button class="btn btn-primary" id="queryBtn" type="button" style="padding: 0.5rem 1.2rem;" title="Cerca informazioni nella guida">
                                 <i class="fas fa-search me-1"></i> Cerca Info
                             </button>
                         </div>
                     </div>
                 </div>

                  <div id="query-results-area" class="mt-4">
                      <!-- Query results will be loaded here -->
                       ${initialQuery
                ? `<div class="text-center my-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> <span class="ms-2">Cerco informazioni per: "${sanitizeHtml(initialQuery)}"...</span></div>`
                : '<p class="text-center text-muted">I risultati della ricerca appariranno qui.</p>'
            }
                  </div>
             </div>`;

        const queryInput = document.getElementById('queryInput');
        const queryBtn = document.getElementById('queryBtn');
        const resultsArea = document.getElementById('query-results-area');

        if (queryInput && queryBtn && resultsArea) {
            const performQuery = () => {
                const term = queryInput.value.trim();
                if (term) {
                    // Update hash to reflect search (optional, could also just display results)
                    // window.location.hash = `#home?query=${encodeURIComponent(term)}`; // Example if using query params in hash
                    handleQuery(term, resultsArea); // Process the query
                } else {
                    showMessage('info', 'Per favore, scrivi una domanda o delle parole chiave nel campo di ricerca.');
                    resultsArea.innerHTML = '<p class="text-center text-muted">I risultati della ricerca appariranno qui.</p>'; // Reset results area
                }
            };

            queryBtn.addEventListener('click', performQuery);

            // Allow submitting with Enter key (but not Shift+Enter for newlines)
            queryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent default newline insertion
                    performQuery();
                }
            });

            // If an initial query was passed (e.g., from a link click), run it immediately
            if (initialQuery) {
                handleQuery(initialQuery, resultsArea);
            }

            queryInput.focus(); // Set focus to the input field
        } else {
            console.error("Elementi dell'interfaccia di query (input, button, results area) non trovati.");
            mainContent.innerHTML += `<p class="text-danger">Errore: Impossibile inizializzare la funzione di ricerca.</p>`;
        }
    }

    function renderIndexView() {
        // Renders the index of all guide sections
        if (!appData || Object.keys(guideDataMap).length === 0) {
            mainContent.innerHTML = `<div class="alert alert-warning">L'indice della guida non è al momento disponibile. Assicurati che il file <code class="user-select-all">${guideDataFilePath}</code> sia caricato correttamente.</div>`;
            return;
        }

        let html = '<h2 class="mb-4"><i class="fas fa-list me-2"></i>Indice Guida Completa</h2><div class="list-group list-group-flush shadow-sm">';
        const keys = Object.keys(guideDataMap).sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically

        keys.forEach(id => {
            const s = guideDataMap[id];
            if (s?.title) { // Check if section and title exist
                html += `<a href="#guide-${id}" class="list-group-item list-group-item-action" data-view="guide" data-section-id="${id}">
                            <i class="fas ${getIconForSection(s.title)} fa-fw me-2"></i> ${id}. ${sanitizeHtml(s.title)}
                         </a>`;
            }
        });

        html += '</div>';
        mainContent.innerHTML = html;
        // Add navigation listeners to the newly created links
        addNavigationListeners(mainContent);
    }

    function renderPlantCalendarView() {
        // Renders the specific view for the plant cultivation calendar
        const sectionIdForCalendar = '5'; // Assuming section 5 contains the main plant calendar
        const section = guideDataMap[sectionIdForCalendar];
        // Find the specific element of type 'plant_calendar' within that section
        const calendarElement = section?.content?.find(el => el.type === 'plant_calendar');

        let html = `
            <div class="card shadow-sm">
                <div class="card-header">
                    <h2><i class="fas fa-calendar-days me-2"></i>Calendario Indicativo delle Colture</h2>
                 </div>
                 <div class="card-body">`;

        if (calendarElement) {
            html += renderPlantCalendarTable(calendarElement); // Reuse the table rendering function
        } else {
            html += `<p class="text-warning">Dati del calendario delle colture non trovati nella sezione ${sectionIdForCalendar}.</p>`;
            // Optional: Search for plant_calendar in other sections if not found in the expected one
            let foundElsewhere = false;
            for (const id in guideDataMap) {
                const altSection = guideDataMap[id];
                const altElement = altSection?.content?.find(el => el.type === 'plant_calendar');
                if (altElement && id !== sectionIdForCalendar) {
                    html += `<hr><h4 class="mt-3">Trovato anche in Sezione ${id}:</h4>`;
                    html += renderPlantCalendarTable(altElement);
                    foundElsewhere = true;
                    break; // Render only the first alternative found
                }
            }
            if (!foundElsewhere && !calendarElement) {
                html += `<p class="text-muted">Controlla la struttura del file <code class="user-select-all">${guideDataFilePath}</code>.</p>`;
            }
        }

        // Add a note about the source and interactivity
        html += `<hr>
                 <p class="mt-3 text-muted small">
                     <i class="fas fa-info-circle me-1"></i> Clicca sul nome di una pianta nella tabella per cercare informazioni specifiche su di essa.
                     Il calendario è fornito a titolo indicativo e proviene principalmente dalla
                     <a href="#guide-${sectionIdForCalendar}" data-view="guide" data-section-id="${sectionIdForCalendar}">Sezione ${sectionIdForCalendar}</a> della guida.
                     Adatta le pratiche alle tue condizioni climatiche locali.
                 </p>`;

        html += `</div></div>`; // Close card-body and card
        mainContent.innerHTML = html;
        // Add navigation listeners for the links (e.g., plant names, section link)
        addNavigationListeners(mainContent);
    }

    async function renderLunarCalendarView() {
        // Renders the view for the Lunar Calendar, fetching data if necessary
        showSpinner(true); // Show spinner immediately

        const container = document.createElement('div');
        // Basic structure of the lunar calendar view
        container.innerHTML = `
             <div class="card shadow-sm">
                 <div class="card-header"><h2><i class="far fa-calendar-alt me-2"></i>Calendario Lunare ${currentYear}</h2></div>
                 <div class="card-body">
                     <div id="current-lunar-phase-info" class="mb-4 p-3 rounded bg-light text-center shadow-sm">
                         <span class="text-muted">Caricamento fase lunare corrente...</span>
                     </div>
                     <div id="lunar-calendar-content" class="mb-4">
                         <p class="text-center text-muted">Caricamento calendario delle fasi principali...</p>
                     </div>
                     <hr>
                     <div id="lunar-guidance">
                          <h5 class="mb-3">Influenza Tradizionale della Luna (Non Scientificamente Provata)</h5>
                          <div class="alert alert-warning small"><i class="fas fa-exclamation-triangle me-2"></i>Queste sono indicazioni basate sulla tradizione agricola popolare, non su prove scientifiche rigorose.</div>
                          <div class="row">
                              <div class="col-md-6 mb-3">
                                  <div class="card h-100">
                                      <div class="card-body phase-first-quarter-bg">
                                          <p class="fw-bold"><i class="fas fa-arrow-up lunar-phase-icon"></i> Luna Crescente (da Nuova a Piena)</p>
                                          <ul class="small">
                                              <li>Favorisce lo sviluppo della parte aerea delle piante (foglie, fiori, frutti).</li>
                                              <li>Periodo ideale per semina e trapianto di ortaggi da foglia, fiore o frutto (es. insalate, pomodori, zucchine).</li>
                                              <li>Raccolta di frutta e verdura destinata al consumo fresco (più succosa).</li>
                                               <li>Taglio di legna da ardere (si dice bruci meglio).</li>
                                          </ul>
                                      </div>
                                  </div>
                              </div>
                              <div class="col-md-6 mb-3">
                                   <div class="card h-100">
                                       <div class="card-body phase-third-quarter-bg">
                                            <p class="fw-bold"><i class="fas fa-arrow-down lunar-phase-icon"></i> Luna Calante (da Piena a Nuova)</p>
                                            <ul class="small">
                                                <li>Favorisce lo sviluppo radicale e la parte sotterranea.</li>
                                                <li>Periodo ideale per semina e trapianto di ortaggi da radice o tubero (es. carote, patate, cipolle).</li>
                                                <li>Potature, innesti, lavori sul terreno (aratura, zappatura), concimazione organica.</li>
                                                <li>Raccolta di prodotti destinati alla conservazione (si conservano meglio).</li>
                                                <li>Controllo delle erbe infestanti (crescono meno vigorosamente).</li>
                                                <li>Taglio di legna da costruzione (meno soggetta a tarli).</li>
                                                <li>Imbottigliamento di vino e aceto.</li>
                                           </ul>
                                       </div>
                                   </div>
                              </div>
                          </div>
                          <p class="text-muted small mt-2">Queste indicazioni sono spesso menzionate nella <a href="#guide-5" data-view="guide" data-section-id="5">Sezione 5</a> della guida.</p>
                     </div>
                 </div>
             </div>`;

        if (mainContent) {
            mainContent.appendChild(container);
        } else {
            console.error("Elemento #main-content non trovato, impossibile renderizzare il calendario lunare.");
            showSpinner(false);
            return;
        }

        // Get references to the content areas within the newly added HTML
        const calendarDiv = document.getElementById('lunar-calendar-content');
        const phaseDiv = document.getElementById('current-lunar-phase-info');
        const guidanceDiv = document.getElementById('lunar-guidance'); // For adding listeners to links inside

        try {
            // Fetch the lunar data for the current year
            const phases = await fetchLunarData(currentYear);
            showSpinner(false); // Hide spinner AFTER data is fetched (or fetch failed)

            if (!phases) {
                // Error message is already shown by fetchLunarData if it fails
                if (phaseDiv) phaseDiv.innerHTML = '<span class="text-danger fw-bold">Impossibile caricare i dati lunari.</span>';
                if (calendarDiv) calendarDiv.innerHTML = ''; // Clear loading message
                return; // Stop rendering if data is unavailable
            }

            // --- Render the Lunar Phases Table ---
            try {
                const weeks = {};
                // Ensure moment.js is loaded and locale is set (requires moment.js library)
                if (typeof moment === 'undefined') {
                    throw new Error("La libreria Moment.js è necessaria per il calendario lunare ma non è stata caricata.");
                }
                moment.locale('it'); // Set locale to Italian for date formatting

                phases.forEach(p => {
                    const d = moment(p.date); // Parse the date using moment
                    if (!d.isValid()) return; // Skip invalid dates

                    // Group phases by ISO week number
                    const weekKey = `${d.year()}-W${String(d.isoWeek()).padStart(2, '0')}`;
                    if (!weeks[weekKey]) {
                        // Create entry for the week if it doesn't exist
                        const startOfWeek = d.clone().startOf('isoWeek');
                        const endOfWeek = d.clone().endOf('isoWeek');
                        weeks[weekKey] = {
                            label: `Sett. ${d.isoWeek()} (${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM YYYY')})`,
                            phases: []
                        };
                    }
                    // Add the phase details to the correct week
                    weeks[weekKey].phases.push({
                        date: d.format('ddd D MMM'), // Format: 'Lun 15 Gen'
                        name: p.phase_name // e.g., 'Nuova', 'Piena'
                    });
                });

                // Build the HTML table
                let table = `<h5 class="mb-3 text-center">Fasi Lunari Principali Settimanali (${currentYear})</h5>
                             <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
                                <table class="table table-sm table-striped table-hover border lunar-calendar-table">
                                    <thead class="table-light sticky-top">
                                        <tr><th>Settimana</th><th>Fasi Principali</th></tr>
                                    </thead>
                                    <tbody>`;

                const sortedWeekKeys = Object.keys(weeks).sort(); // Sort weeks chronologically

                if (sortedWeekKeys.length === 0) {
                    table += '<tr><td colspan="2" class="text-center text-muted">Nessuna fase lunare trovata per quest\'anno.</td></tr>';
                } else {
                    sortedWeekKeys.forEach(wk => {
                        // Format the phases for display within the cell
                        const phasesHtml = weeks[wk].phases
                            .map(p => `<span class="badge ${getLunarPhaseClass(p.name)} m-1 p-1"><i class="fas ${getLunarPhaseIcon(p.name)} fa-fw"></i> ${p.date}: ${p.name}</span>`)
                            .join(' '); // Join phase badges with spaces
                        table += `<tr>
                                     <td>${weeks[wk].label}</td>
                                     <td>${phasesHtml || '-'}</td>
                                  </tr>`;
                    });
                }

                table += `   </tbody>
                             </table>
                             </div>
                             <small class="d-block text-center mt-2 text-muted">Le date delle fasi lunari sono approssimative e possono variare leggermente.</small>`;

                if (calendarDiv) calendarDiv.innerHTML = table; // Inject the table HTML

            } catch (e) {
                console.error("Errore durante la creazione della tabella delle fasi lunari:", e);
                if (calendarDiv) calendarDiv.innerHTML = `<p class="text-danger text-center fw-bold">Errore nella visualizzazione della tabella delle fasi lunari.</p><p class="text-danger text-center"><small>${e.message}</small></p>`;
                // If moment.js is missing, phaseDiv might also fail, so handle it here too
                if (phaseDiv && typeof moment === 'undefined') {
                    phaseDiv.innerHTML = '<span class="text-danger fw-bold">Errore: libreria Moment.js mancante.</span>';
                }
            }

            // --- Render the Current Lunar Phase ---
            // Ensure moment.js is available before calling this function
            if (typeof moment !== 'undefined') {
                if (phaseDiv) renderCurrentLunarPhase(phases, phaseDiv);
            } else {
                if (phaseDiv) phaseDiv.innerHTML = '<span class="text-danger fw-bold">Errore: libreria Moment.js mancante per determinare la fase attuale.</span>';
            }


            // --- Add Listeners ---
            // Add navigation listeners to any links inside the guidance section
            if (guidanceDiv) addNavigationListeners(guidanceDiv);

        } catch (e) {
            // Catch errors from fetchLunarData or other async operations here
            showSpinner(false); // Ensure spinner is hidden on error
            console.error("Errore generale nel rendering della vista Calendario Lunare:", e);
            if (mainContent) mainContent.innerHTML = `<div class="alert alert-danger">Si è verificato un errore imprevisto nel caricamento del calendario lunare.</div>`; // Overwrite content on critical failure
        }
    } // <-- This closing brace was likely the missing one causing the original syntax error

    function renderCurrentLunarPhase(phases, container) {
        // Determines and renders the current lunar phase based on the fetched data
        // Requires moment.js library
        if (typeof moment === 'undefined') {
            container.innerHTML = '<span class="text-danger small">Errore: Moment.js non caricato.</span>';
            return;
        }
        if (!phases || phases.length === 0) {
            container.innerHTML = '<span class="text-warning small">Dati fasi lunari non disponibili.</span>';
            return;
        }

        const now = moment(); // Current date and time
        let lastKnownPhase = null;
        let nextUpcomingPhase = null;

        // Find the most recent past phase and the next future phase
        for (let i = 0; i < phases.length; i++) {
            const phaseDate = moment(phases[i].date);
            if (phaseDate.isValid()) {
                if (phaseDate.isSameOrBefore(now)) {
                    // This is a past or current phase, keep track of the latest one
                    lastKnownPhase = { ...phases[i], dateObject: phaseDate };
                } else {
                    // This is the first future phase found, store it and stop searching
                    nextUpcomingPhase = { ...phases[i], dateObject: phaseDate };
                    break;
                }
            }
        }

        if (lastKnownPhase) {
            const phaseName = lastKnownPhase.name;
            const phaseType = getPhaseType(phaseName); // 'crescente' or 'calante'
            const phaseIcon = getLunarPhaseIcon(phaseName);
            const phaseClass = getLunarPhaseClass(phaseName);

            let displayString = `<i class="fas ${phaseIcon} ${phaseClass} fa-fw me-2"></i> Ultima fase principale: <strong>${phaseName}</strong> (${lastKnownPhase.dateObject.format('D MMM')})`;
            let trendString = phaseType === 'crescente' ? ' (Luna Crescente)' : (phaseType === 'calante' ? ' (Luna Calante)' : '');

            let htmlContent = `<span class="current-lunar-phase">${displayString}${trendString}</span>`;

            if (nextUpcomingPhase) {
                htmlContent += `<br><small class="text-muted">Prossima fase: ${nextUpcomingPhase.name} il ${nextUpcomingPhase.dateObject.format('D MMM')}</small>`;
            } else {
                htmlContent += `<br><small class="text-muted">Questa è l'ultima fase registrata per l'anno.</small>`;
            }
            container.innerHTML = htmlContent;
        } else {
            // This might happen if 'now' is before the very first phase of the year
            container.innerHTML = '<span class="current-lunar-phase">Fase lunare attuale non determinata dai dati.</span>';
            if (nextUpcomingPhase) {
                // Still show the next upcoming phase if known
                container.innerHTML += `<br><small class="text-muted">Prossima fase: ${nextUpcomingPhase.name} il ${nextUpcomingPhase.dateObject.format('D MMM')}</small>`;
            }
        }
    }

    function renderGuideSectionView(sectionId) {
        // Renders the content of a specific guide section
        const section = guideDataMap?.[sectionId]; // Safely access the section data

        if (!section) {
            console.error(`Tentativo di renderizzare sezione ID ${sectionId} non trovata.`);
            showMessage('error', `La sezione della guida con ID ${sectionId} non è stata trovata.`);
            renderHomeView(); // Fallback to home view
            return;
        }

        // Generate the HTML for the section card
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="card shadow-sm mb-4 guide-section-card">
                    <div class="card-header bg-light">
                         <h2 class="h4 mb-0"><i class="fas ${getIconForSection(section.title)} me-2"></i>${section.id}. ${sanitizeHtml(section.title)}</h2>
                    </div>
                    <div class="card-body">
                        ${renderSectionContent(section.content)} 
                    </div>
                    <div class="card-footer text-end bg-light">
                         <a href="#index" data-view="index" class="btn btn-sm btn-outline-secondary">
                             <i class="fas fa-list me-1"></i> Vai all'Indice
                         </a>
                        <a href="#home" data-view="home" class="btn btn-sm btn-outline-primary ms-2">
                            <i class="fas fa-comments me-1"></i> Chiedi all'Assistente
                        </a>
                    </div>
                </div>`;

            // Add navigation listeners to any links within the rendered content (e.g., cross-references)
            addNavigationListeners(mainContent);
        } else {
            console.error("Elemento #main-content non trovato, impossibile renderizzare la sezione guida.");
        }
    }


    // --- Query Processing ---
    async function handleQuery(queryTerm, containerElement) {
        // Handles the search query input by the user
        if (!queryTerm || !containerElement) return;

        queryTerm = queryTerm.trim();
        const queryLower = queryTerm.toLowerCase();
        if (queryLower.length < 2) { // Basic validation for query length
            showMessage('info', 'Per favore, inserisci un termine di ricerca più lungo (almeno 2 caratteri).');
            containerElement.innerHTML = '<p class="text-center text-muted">Inserisci la tua domanda o le parole chiave sopra.</p>';
            return;
        }

        // Display loading indicator in the results area
        containerElement.innerHTML = `
            <div class="text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Caricamento...</span>
                 </div>
                <p class="mt-2 text-muted">Ricerca informazioni per "${sanitizeHtml(queryTerm)}"...</p>
            </div>`;

        try {
            // Ensure data and index are loaded (load if necessary)
            if (!searchableIndex || searchableIndex.length === 0) {
                console.log("Indice di ricerca non pronto, tentativo di caricamento dati...");
                await loadAppData(); // Wait for data loading and index building
                if (!searchableIndex || searchableIndex.length === 0) {
                    throw new Error("L'indice di ricerca non è disponibile anche dopo il tentativo di caricamento.");
                }
                console.log("Indice pronto, procedo con la ricerca.");
            }

            const queryKeywords = extractKeywords(queryLower);
            console.log("Parole chiave estratte dalla query:", queryKeywords);

            let results = [];

            // --- Scoring Logic ---
            // This is a simple scoring mechanism. More sophisticated NLP techniques could be used.
            if (queryKeywords.length === 0 && queryLower.length >= 2) {
                // Fallback for queries without extracted keywords (e.g., very short queries or only stop words)
                // Search for exact or partial matches in title or text
                results = searchableIndex
                    .filter(item =>
                        (item.text && item.text.includes(queryLower)) ||
                        (item.title && item.title.toLowerCase().includes(queryLower))
                    )
                    .map(item => ({
                        ...item,
                        // Basic score: higher if title matches
                        score: item.title?.toLowerCase().includes(queryLower) ? 3 : 1
                    }))
                    .sort((a, b) => b.score - a.score); // Sort by score descending
            } else if (queryKeywords.length > 0) {
                // Main search logic based on keywords
                results = searchableIndex.map(item => {
                    let score = 0;
                    const itemTextLower = item.text + ' ' + (item.title || '').toLowerCase();
                    const itemKeywords = item.keywords || [];
                    const itemTitleLower = (item.title || '').toLowerCase();
                    let keywordMatches = 0;

                    // Calculate score based on keyword matches and context
                    queryKeywords.forEach(qk => {
                        const keywordFoundInIndex = itemKeywords.includes(qk);
                        const keywordFoundInTitle = itemTitleLower.includes(qk);
                        const keywordFoundInText = itemTextLower.includes(qk); // Check full text

                        if (keywordFoundInIndex) {
                            score += 5; // Strong boost for matching pre-extracted keywords
                            keywordMatches++;
                        }
                        if (keywordFoundInTitle) {
                            // Boost if keyword is in the title (more relevant)
                            score += keywordFoundInIndex ? 2 : 4; // Extra boost if also an index keyword
                        }
                        // Lesser boost for just appearing in the text body if not in title/keywords
                        if (!keywordFoundInIndex && !keywordFoundInTitle && keywordFoundInText) {
                            score += 1;
                        }
                    });

                    // Boost score based on the number of query keywords matched
                    if (keywordMatches > 1) {
                        score += keywordMatches * 2;
                    }

                    // Significant boost if the item title contains *all* query keywords
                    if (itemTitleLower && queryKeywords.length > 0 && queryKeywords.every(q => itemTitleLower.includes(q))) {
                        score += 10;
                    }

                    // Specific boost for plant info if the query likely refers to that plant
                    if (item.type === 'plant_info' && item.plantData?.name) {
                        const plantNameLower = item.plantData.name.toLowerCase();
                        // Check if query contains plant name or plant name contains query keyword
                        if (queryLower.includes(plantNameLower) || queryKeywords.some(qk => plantNameLower.includes(qk))) {
                            score += 15; // High boost for direct plant matches
                        }
                    }

                    // Adjust score based on element type (prefer specific elements over section titles)
                    if (item.type !== 'section_title') {
                        score *= 1.3; // Slightly prefer content elements
                    }
                    // Penalize section titles slightly if they only match keywords but not the full query context in the title
                    if (item.type === 'section_title' && keywordMatches > 0 && !queryKeywords.some(q => itemTitleLower.includes(q))) {
                        score *= 0.7;
                    }


                    return { ...item, score: score }; // Return item with calculated score
                })
                    .filter(item => item.score > 1.5) // Filter out results with very low scores
                    .sort((a, b) => b.score - a.score); // Sort by score descending
            }
            // --- End Scoring Logic ---

            console.log(`Trovati ${results.length} risultati pertinenti per "${queryTerm}"`);
            // Render the results in the specified container
            renderQueryResults(queryTerm, results, containerElement);

        } catch (error) {
            console.error("Errore durante l'esecuzione della query:", error);
            showMessage('error', `Si è verificato un errore durante la ricerca:<br>${error.message}`);
            containerElement.innerHTML = `<p class="text-danger text-center fw-bold">Errore durante la ricerca. Riprova.</p>`;
        }
    }

    // Renderizza i risultati della query
    function renderQueryResults(queryTerm, results, containerElement) {

        // Helper function to safely highlight search terms within HTML content
        function highlightTerms(htmlString, termsToHighlight) {
            if (!termsToHighlight || termsToHighlight.length === 0 || !htmlString) {
                return htmlString; // Return original if no terms or no html
            }

            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;

            // Use TreeWalker to find all text nodes
            const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
            let node;
            const nodesToReplace = []; // Store nodes that need replacement

            while (node = walker.nextNode()) {
                let nodeContent = node.nodeValue; // Text content of the node
                let newHtmlContent = nodeContent; // Start with original content
                let hasHighlight = false;

                termsToHighlight.forEach(term => {
                    if (!term) return; // Skip empty terms
                    try {
                        // Escape special regex characters in the search term
                        const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        // Create a regex to find the term as a whole word (\b), case-insensitive (i), globally (g)
                        const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');

                        // Replace matches with <mark> tag only if the term is found
                        if (regex.test(newHtmlContent)) {
                            newHtmlContent = newHtmlContent.replace(regex, `<mark class="bg-warning p-0">$1</mark>`);
                            hasHighlight = true;
                        }
                    } catch (e) {
                        // Log regex errors but don't break highlighting for other terms
                        console.warn(`Errore nella creazione della Regex per il termine "${term}":`, e);
                    }
                });

                // If any term was highlighted in this node, mark it for replacement
                if (hasHighlight) {
                    // Create a temporary span to hold the new HTML with highlights
                    const span = document.createElement('span');
                    span.innerHTML = newHtmlContent; // Use innerHTML to parse the <mark> tags
                    nodesToReplace.push({ original: node, replacement: span });
                }
            } // End while loop through text nodes

            // Perform the replacements after iterating through all nodes
            nodesToReplace.forEach(item => {
                // Check if the original node still has a parent (it might have been removed by a previous replacement)
                if (item.original.parentNode) {
                    item.original.parentNode.replaceChild(item.replacement, item.original);
                }
            });

            // Return the modified HTML from the temporary container
            return tempDiv.innerHTML;
        } // --- End of highlightTerms ---


        let html = `<h3 class="mb-3">Risultati per: "${sanitizeHtml(queryTerm)}"</h3>`;
        const maxResultsToShow = 7; // Limit the number of displayed results
        const queryKeywords = extractKeywords(queryTerm.toLowerCase()); // Get keywords for highlighting

        if (results.length === 0) {
            // Display a message if no results were found
            html += `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle me-2"></i>Nessuna informazione specifica trovata per "${sanitizeHtml(queryTerm)}".
                     Prova a usare parole chiave diverse o consulta l'<a href="#index" data-view="index">indice completo</a> della guida.
                 </div>`;
        } else {
            // Display the top results
            html += `<p class="text-muted small">Mostrando i ${Math.min(results.length, maxResultsToShow)} risultati più pertinenti (ordinati per rilevanza):</p>`;

            results.slice(0, maxResultsToShow).forEach((result, index) => {
                const originalElement = result.element; // The original data object from JSON
                let renderedContent = '';
                let resultTitle = '';
                let resultIcon = 'fa-info-circle'; // Default icon
                const sourceSection = guideDataMap[result.sectionId]; // Get the source section info

                // Determine title and icon based on result type
                if (result.type === 'plant_info' && result.plantData?.name) {
                    resultTitle = `Informazioni Pianta: ${result.plantData.name}`;
                    resultIcon = 'fa-seedling'; // More specific than fa-leaf
                } else if (result.title) {
                    resultTitle = result.title;
                    resultIcon = getIconForSection(resultTitle); // Use specific icon if available
                } else if (sourceSection?.title) {
                    // Fallback title if element itself has no title
                    resultTitle = `Contenuto da Sez. ${result.sectionId}: ${sourceSection.title}`;
                    resultIcon = getIconForSection(sourceSection.title);
                } else {
                    resultTitle = `Contenuto dalla Sezione ${result.sectionId}`; // Generic fallback
                    resultIcon = 'fa-book-open';
                }

                // Generate the content snippet
                if (originalElement && typeof originalElement === 'object') {
                    // Render the specific element if possible (gives context)
                    // Avoid rendering huge elements directly in results if they are complex
                    if (result.type === 'subsection' || result.type === 'subsubsection') {
                        // For sections/subsections, maybe just show the text snippet
                        const snippet = result.text.length > 250 ? result.text.substring(0, 250) + '...' : result.text;
                        renderedContent = `<p><em>(Estratto da ${result.type === 'subsection' ? 'sottosezione' : 'paragrafo'})</em> ${renderSanitized(snippet)}</p>`;
                    } else {
                        renderedContent = renderElement(originalElement);
                    }
                } else if (result.text) {
                    // If direct rendering isn't feasible, show a text snippet
                    const snippet = result.text.length > 300 ? result.text.substring(0, 300) + '...' : result.text;
                    renderedContent = `<p>${renderSanitized(snippet)}</p>`;
                } else {
                    // Fallback if no content can be rendered
                    renderedContent = `<p class="text-muted small">Nessun dettaglio disponibile per l'anteprima.</p>`;
                }

                // Highlight the search terms in the rendered content
                const highlightedRenderedContent = highlightTerms(renderedContent, queryKeywords);

                // Build the HTML for this result card
                html += `
                    <div class="card query-result-card shadow-sm mb-3">
                        <div class="card-header small">
                            <i class="fas ${resultIcon} me-2"></i>
                            ${sanitizeHtml(resultTitle)}
                             <span class="float-end badge bg-light text-dark ms-2" title="Punteggio di rilevanza">Rilevanza: ${result.score.toFixed(1)}</span>
                        </div>
                        <div class="card-body small">
                            ${highlightedRenderedContent}
                            <p class="result-link-source mt-2 mb-0 border-top pt-2">
                                 <strong>Fonte:</strong> <a href="#guide-${result.sectionId}" data-view="guide" data-section-id="${result.sectionId}">Sezione ${result.sectionId} - ${sanitizeHtml(sourceSection?.title || 'Guida')}</a>
                             </p>
                        </div>
                    </div>`;
            }); // End loop through results

            // Add a note if there were more results than shown
            if (results.length > maxResultsToShow) {
                html += `<p class="text-center text-muted small mt-3">Sono disponibili altri ${results.length - maxResultsToShow} risultati. Prova a rendere la ricerca più specifica se non hai trovato quello che cerchi.</p>`;
            }
        } // End else (results found)

        containerElement.innerHTML = html; // Update the container with the results HTML
        // Add navigation listeners to the links within the results (e.g., source links)
        addNavigationListeners(containerElement);
    }


    // --- Gestione Navigazione ---
    function addNavigationListeners(container) {
        // Adds click listeners to internal navigation links (data-view attribute)
        if (!container) return; // Ensure container exists

        // Find all anchors with a 'data-view' attribute within the container
        container.querySelectorAll('a[data-view]').forEach(link => {
            // Remove any existing listener first to prevent duplicates if called multiple times
            link.removeEventListener('click', handleInternalLinkClick);
            // Add the event listener
            link.addEventListener('click', handleInternalLinkClick);
        });
    }

    function handleInternalLinkClick(event) {
        // Handles clicks on internal links (<a> tags with data-view) for SPA navigation
        const link = event.currentTarget;
        const view = link.dataset.view;         // e.g., 'home', 'guide', 'index'
        const sectionId = link.dataset.sectionId; // e.g., '5' (for guide sections)
        const query = link.dataset.query;       // e.g., 'pomodori' (for search links)
        const href = link.getAttribute('href'); // The actual href value (e.g., '#guide-5')

        // Only handle links that are intended for internal navigation (start with #)
        if (view && href && href.startsWith('#')) {
            event.preventDefault(); // Prevent the browser's default hash jump behavior

            let targetHash = `#${view}`;
            let params = {}; // Parameters to pass to switchView

            // Build parameters and target hash based on link data
            if (view === 'guide' && sectionId) {
                targetHash += `-${sectionId}`;
                params = { sectionId: sectionId };
                window.location.hash = targetHash; // Update browser hash, triggers handleHashChange
            } else if (view === 'home' && query) {
                // For search links (e.g., plant names in calendar)
                params = { query: query };
                // Don't set hash here, just switch view directly to show results
                switchView(view, params);
                // Optionally update hash to reflect the search state if desired:
                // window.location.hash = `#home?query=${encodeURIComponent(query)}`;
            } else {
                // For simple view links like #index, #home (without query)
                window.location.hash = targetHash; // Update browser hash, triggers handleHashChange
            }
            // Note: switchView is called indirectly via the 'hashchange' event listener,
            // except for the special case of data-query links.
        }
        // Let external links or links without data-view behave normally
    }

    function handleHashChange(hash = null) {
        // Handles changes in the browser's URL hash (#) to navigate between views
        hash = hash || window.location.hash || '#home'; // Get current hash or default to #home
        console.log("Hash changed to:", hash);

        // Remove the '#' and split by '-' and potential query params '?'
        const hashBase = hash.split('?')[0];
        const hashParts = hashBase.substring(1).split('-'); // Example: '#guide-5' -> ['guide', '5']

        let view = hashParts[0] || 'home'; // Default to 'home' view if hash is empty or invalid
        let params = null;

        // --- Determine View and Parameters from Hash ---
        if (view === 'guide' && hashParts.length > 1) {
            // Guide section: #guide-SECTION_ID
            params = { sectionId: hashParts[1] };
        } else if (view === 'plant' && hashParts[1] === 'calendar') {
            // Legacy or alternative hash for plant calendar: #plant-calendar
            view = 'plant-calendar';
        } else if (view === 'lunar' && hashParts[1] === 'calendar') {
            // Legacy or alternative hash for lunar calendar: #lunar-calendar
            view = 'lunar-calendar';
        }
        // Handle potential query parameters in hash (less common now, usually handled by internal links)
        // Example: #home?query=term -> would need parsing location.search part of hash if used
        /*
        const queryParams = new URLSearchParams(hash.split('?')[1]);
        if (view === 'home' && queryParams.has('query')) {
            params = params || {};
            params.query = queryParams.get('query');
        }
        */

        // --- Validate View ---
        const validViews = ['home', 'index', 'plant-calendar', 'lunar-calendar', 'guide'];
        if (!validViews.includes(view)) {
            // Handle old '#search-' links or other invalid hashes
            if (hash.startsWith('#search-')) {
                // Redirect old search format to home view with query parameter
                const queryTerm = decodeURIComponent(hash.substring('#search-'.length));
                console.log("Vecchio formato #search- rilevato, eseguo query:", queryTerm);
                view = 'home';
                params = { query: queryTerm };
                // Call switchView directly instead of resetting hash to avoid loop if search fails
                switchView(view, params);
                return; // Exit after handling the old format
            } else {
                console.warn(`Hash non valido: '${hash}'. Reindirizzamento a #home.`);
                view = 'home';
                params = null;
                // Reset hash only if it's not already #home to prevent loops
                if (window.location.hash !== '#home') {
                    window.location.hash = '#home';
                    // Let the subsequent hashchange event handle the #home view
                    return;
                }
            }
        }

        // Call switchView with the determined view and parameters
        switchView(view, params);
    }


    // --- Inizializzazione App ---
    async function initializeApp() {
        console.log("Inizializzazione applicazione Assistente Coltivazione...");
        showSpinner(true); // Show spinner during init

        if (!mainContent) {
            console.error("ERRORE CRITICO: Elemento #main-content non trovato. L'applicazione non può avviarsi.");
            document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-weight: bold;">Errore critico: Impossibile trovare l\'area contenuti principale (#main-content).</div>';
            showSpinner(false);
            return;
        }
        mainContent.innerHTML = ''; // Clear any static content

        // Load application data (JSON guide) and build search index
        await loadAppData();

        if (!appData) {
            console.error("Inizializzazione fallita: dati guida non caricati.");
            // Error message is already shown by loadAppData
            showSpinner(false);
            return; // Stop initialization if data loading failed
        }

        // Listen for hash changes to handle navigation
        window.addEventListener('hashchange', () => handleHashChange());

        // Add listeners to main sidebar links (those without section-id)
        sidebarNav.querySelectorAll('.list-group-item[data-view]:not([data-section-id])').forEach(link => {
            link.removeEventListener('click', handleInternalLinkClick); // Prevent duplicates
            link.addEventListener('click', handleInternalLinkClick);
        });

        // Handle the initial state based on the URL hash present when the page loads
        handleHashChange();

        showSpinner(false); // Hide spinner after initialization is complete
        console.log("Applicazione Assistente Coltivazione pronta.");
    }

    // --- Avvio ---
    initializeApp(); // Start the application initialization process

}); // --- Fine DOMContentLoaded ---