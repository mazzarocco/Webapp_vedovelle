// =====================
// CONFIGURAZIONE
// =====================

// BASE_URL vuoto = stessa origine della pagina (utile in Codespaces/porte forwardate).
const BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';
// Raggio di default per le ricerche "vicino a un punto".
const RADIUS = 500;
// Metodo geospaziale backend: 'near' oppure 'geowithin'.
const GEO_QUERY_METHOD = 'near';
// Centro iniziale della mappa (Milano).
const MILANO_CENTER = [45.4642, 9.1900]; // [lat, lng]

// =====================
// STATO APPLICAZIONE
// =====================

const AppState = {
    // Lista NIL caricata dal backend.
    nilList: [],
    // Ultimo risultato mostrato in mappa.
    results: [],
    // Dati statistici per la tabella.
    stats: [],
    // Istanza Leaflet della mappa principale.
    mapInstance: null,
    // Istanza Leaflet della mappa choropleth.
    choroplethMapInstance: null,
    // Marker attivi attualmente in mappa.
    markers: [],
    // Layer GeoJSON della choropleth.
    choroplethLayer: null,
    // Geometrie NIL indicizzate per nome (riuso veloce su mappa principale).
    nilGeometryByName: new Map(),
    // Layer del perimetro NIL mostrato in ricerca per zona.
    selectedNilLayer: null,
    // Marker speciale della posizione utente.
    userMarker: null,
    // Cerchio che rappresenta il raggio della ricerca utente.
    userRadiusCircle: null
};

// Evita di mostrare ripetutamente lo stesso alert quando il backend non risponde.
let backendOfflineShown = false;

// =====================
// FUNZIONI API
// =====================

/**
 * Fetch JSON con controllo esplicito dello stato HTTP.
 */
async function fetchJson(path) {
    let response;
    try {
        // Esegue la chiamata HTTP all'endpoint richiesto.
        response = await fetch(`${BASE_URL}${path}`);
    } catch (error) {
        const offlineError = new Error(`BACKEND_UNREACHABLE:${path}`);
        offlineError.cause = error;
        throw offlineError;
    }

    if (!response.ok) {
        // Se il server risponde con errore (4xx/5xx), generiamo un errore leggibile.
        throw new Error(`HTTP ${response.status} su ${path}`);
    }
    // Converte la risposta in JSON.
    return response.json();
}

function showBackendUnavailableMessage() {
    if (backendOfflineShown) return;

    const backendUrl = BASE_URL || window.location.origin;
    const message = `Backend non raggiungibile. Avvia Flask e verifica l'URL API (${backendUrl}).`;

    showMessage('feedback-nil', message, 'danger');
    showMessage('feedback-distance', message, 'danger');
    backendOfflineShown = true;
}

//Gestisce in modo uniforme gli errori API.
function handleApiError(context, error) {
    if (String(error?.message || '').startsWith('BACKEND_UNREACHABLE:')) {
        showBackendUnavailableMessage();
    }

    console.error(`Errore API (${context}):`, error);
}

/**
 * Ottiene la lista di tutti i NIL
 */
async function getNilList() {
    try {
        // Chiama il backend reale.
        return await fetchJson('/api/nil');
    } catch (error) {
        handleApiError('recupero lista NIL', error);
        return [];
    }
}

/**
 * Ottiene fontanelle per un NIL specifico
 */
async function getFountainsByNil(nilValue) {
    try {
        // Passa NIL in query string.
        return await fetchJson(`/api/fontanelle/by-nil?nil=${encodeURIComponent(nilValue)}`);
    } catch (error) {
        handleApiError('recupero fontanelle per NIL', error);
        return [];
    }
}

/**
 * Ottiene fontanelle entro un raggio da coordinate
 */
async function getFountainsNearPoint(lat, lng, radius = RADIUS) {
    try {
        // Endpoint con parametri lat/lng/r.
        return await fetchJson(
            `/api/fontanelle/near?lat=${lat}&lng=${lng}&r=${radius}&method=${encodeURIComponent(GEO_QUERY_METHOD)}`
        );
    } catch (error) {
        handleApiError('recupero fontanelle prossime', error);
        return [];
    }
}

/**
 * Ottiene statistiche fontanelle per NIL
 */
async function getStats() {
    try {
        const data = await fetchJson('/api/stats/fontanelle-per-nil');
        // Calcola il totale per trasformare i count in percentuali.
        const total = data.reduce((sum, s) => sum + Number(s.count || 0), 0);

        return data.map(s => ({
            ...s,
            percentage: total > 0 ? ((Number(s.count || 0) / total) * 100).toFixed(1) : '0'
        }));
    } catch (error) {
        handleApiError('recupero statistiche', error);
        return [];
    }
}

/**
 * Ottiene dati per la mappa choropleth
 */
async function getChoroplethData() {
    try {
        const data = await fetchJson('/api/choropleth');

        // Normalizza campi diversi tra backend reale e mock.
        // In questo modo il rendering usa sempre lo stesso formato.
        return data
            .filter(item => item.geometry)
            .map(item => ({
                name: item.name || item.NIL || 'NIL',
                count: Number(item.count || 0),
                geometry: item.geometry
            }));
    } catch (error) {
        handleApiError('recupero dati choropleth', error);
        return [];
    }
}

// =====================
// FUNZIONI UTILITÀ
// =====================

/**
 * Valida se una stringa è un numero valido
 */
function isValidNumber(value) {
    // True se il valore è numerico e non è una stringa vuota.
    return !isNaN(value) && value !== '';
}

/**
 * Ottiene il colore blu basato sul conteggio
 */
function getChoroplethColor(count, minCount, maxCount) {
    // Se tutti i valori sono uguali, usa un colore medio.
    if (maxCount === minCount) {
        return '#1f77b4';
    }
    const ratio = (count - minCount) / (maxCount - minCount);
    
    // Scala di blu: da celeste (#cfe2ff) a blu scuro (#0d47a1)
    if (ratio < 0.2) return '#cfe2ff';
    if (ratio < 0.4) return '#84c5ff';
    if (ratio < 0.6) return '#4a9eff';
    if (ratio < 0.8) return '#0d5fbf';
    return '#0d47a1';
}

// =====================
// FUNZIONI MAPPA
// =====================

/**
 * Inizializza la mappa principale
 */
function initMap() {
    // Crea la mappa principale centrata su Milano.
    AppState.mapInstance = L.map('map').setView(MILANO_CENTER, 13);

    // Aggiunge il layer OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        referrerPolicy: 'no-referrer-when-downgrade'
    }).addTo(AppState.mapInstance);

    return AppState.mapInstance;
}

/**
 * Inizializza la mappa choropleth
 */
function initChoroplethMap() {
    // Crea la seconda mappa per la visualizzazione choropleth.
    AppState.choroplethMapInstance = L.map('map-choropleth').setView(MILANO_CENTER, 13);

    // Usa lo stesso provider mappe della mappa principale.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        referrerPolicy: 'no-referrer-when-downgrade'
    }).addTo(AppState.choroplethMapInstance);

    return AppState.choroplethMapInstance;
}

/**
 * Rimuove tutti i marker dalla mappa principale
 */
function clearMarkers() {
    // Rimuove tutti i marker standard presenti in stato.
    AppState.markers.forEach(marker => AppState.mapInstance.removeLayer(marker));
    AppState.markers = [];

    if (AppState.userMarker) {
        // Rimuove anche il marker della posizione utente, se presente.
        AppState.mapInstance.removeLayer(AppState.userMarker);
        AppState.userMarker = null;
    }

    if (AppState.userRadiusCircle) {
        // Rimuove il cerchio del raggio precedente, se presente.
        AppState.mapInstance.removeLayer(AppState.userRadiusCircle);
        AppState.userRadiusCircle = null;
    }

    if (AppState.selectedNilLayer) {
        // Rimuove anche il perimetro NIL della ricerca precedente.
        AppState.mapInstance.removeLayer(AppState.selectedNilLayer);
        AppState.selectedNilLayer = null;
    }
}

/**
 * Aggiunge marker per le fontanelle sulla mappa
 */
function addMarkers(fontanelle) {
    // La pulizia marker viene fatta dal chiamante per non cancellare marker/cerchio utente.
    fontanelle.forEach(fountain => {
        // Il backend passa coordinate in formato [lng, lat].
        const [lng, lat] = fountain.geometry.coordinates;
        const marker = L.marker([lat, lng]);

        // Popup con le info principali della fontanella.
        marker.bindPopup(`
            <strong>${fountain.NIL}</strong><br>
            ID: ${fountain.objectID}<br>
            Lat: ${lat.toFixed(4)}<br>
            Lng: ${lng.toFixed(4)}
        `);

        // Aggiunge marker sia in mappa sia nello stato interno.
        marker.addTo(AppState.mapInstance);
        AppState.markers.push(marker);
    });
}

/**
 * Disegna il perimetro di uno o più NIL sulla mappa principale.
 */
function showNilPerimeter(nilNames) {
    if (AppState.selectedNilLayer) {
        AppState.mapInstance.removeLayer(AppState.selectedNilLayer);
        AppState.selectedNilLayer = null;
    }

    const features = nilNames
        .map(name => {
            const normalizedName = String(name || '').toUpperCase();
            const geometry = AppState.nilGeometryByName.get(normalizedName);

            if (!geometry) return null;

            return {
                type: 'Feature',
                properties: { name: normalizedName },
                geometry
            };
        })
        .filter(Boolean);

    if (features.length === 0) return;

    AppState.selectedNilLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: {
            color: '#ff7a00',
            weight: 3,
            opacity: 0.95,
            fillOpacity: 0.05,
            dashArray: '6, 4'
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`<strong>Perimetro NIL:</strong> ${feature.properties.name}`);
        }
    }).addTo(AppState.mapInstance);
}

/**
 * Restituisce i NIL che matchano il testo inserito (supporta match parziale).
 */
function getNilNamesFromText(nilValue) {
    const query = String(nilValue || '').trim().toUpperCase();
    if (!query) return [];

    const names = AppState.nilList
        .map(nil => String(nil.name || nil.NIL || '').toUpperCase())
        .filter(Boolean)
        .filter(name => name.includes(query));

    return [...new Set(names)];
}

/**
 * Fa zoom per mostrare tutti i marker
 */
function zoomToMarkers() {
    // Se non ci sono marker, non facciamo nulla.
    if (AppState.markers.length === 0) return;

    // Crea un gruppo Leaflet e adatta il bounding box.
    const group = new L.featureGroup(AppState.markers);
    AppState.mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
}

/**
 * Aggiunge un marker speciale per la posizione utente
 */
function showUserMarker(lat, lng, radius = RADIUS) {
    if (AppState.userMarker) {
        // Evita di avere più marker utente contemporaneamente.
        AppState.mapInstance.removeLayer(AppState.userMarker);
    }

    if (AppState.userRadiusCircle) {
        // Aggiorna sempre il cerchio rimuovendo prima quello precedente.
        AppState.mapInstance.removeLayer(AppState.userRadiusCircle);
    }

    AppState.userMarker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: '#0059ff',
        color: '#000000',
        weight: 1,
        opacity: 1,
        fillOpacity: 1
    });

    AppState.userMarker.bindPopup('La tua posizione').openPopup();
    AppState.userMarker.addTo(AppState.mapInstance);

    // Aggiungi anche un cerchio di 500m
    AppState.userRadiusCircle = L.circle([lat, lng], {
        radius: radius,
        color: '#28a745',
        fill: false,
        weight: 2,
        opacity: 0.5,
        dashArray: '5, 5'
    }).addTo(AppState.mapInstance);
}

/**
 * Renderizza la choropleth
 */
function renderChoropleth(data) {
    // Se non ci sono dati, la funzione esce.
    if (!data || data.length === 0) return;

    // Rimuovi layer precedente se esiste
    if (AppState.choroplethLayer) {
        AppState.choroplethMapInstance.removeLayer(AppState.choroplethLayer);
    }

    // Trova min e max per la scala di colore.
    const counts = data.map(d => d.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // Crea una FeatureCollection GeoJSON da passare a Leaflet.
    const features = data.map(item => ({
        type: 'Feature',
        properties: {
            name: item.name,
            count: item.count
        },
        geometry: item.geometry
    }));

    const geojson = {
        type: 'FeatureCollection',
        features: features
    };

    // Disegna i poligoni in mappa con stile e popup.
    AppState.choroplethLayer = L.geoJSON(geojson, {
        style: (feature) => {
            const count = feature.properties.count;
            return {
                fillColor: getChoroplethColor(count, minCount, maxCount),
                weight: 2,
                opacity: 1,
                color: '#666',
                dashArray: '3',
                fillOpacity: 0.7
            };
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
                <strong>${props.name}</strong><br>
                Fontanelle: ${props.count}
            `);
        }
    }).addTo(AppState.choroplethMapInstance);
}

// =====================
// FUNZIONI UI
// =====================

/**
 * Popola la select con la lista dei NIL
 */
async function populateNilDropdown() {
    // Recupera la select dal DOM.
    const select = document.getElementById('nil-select');
    // Carica i NIL via API/mock.
    AppState.nilList = await getNilList();

    AppState.nilList.forEach(nil => {
        // Supporta sia formato {name} sia formato {NIL}.
        const nilName = nil.name || nil.NIL || '';
        if (!nilName) return;

        // Crea e aggiunge una option alla dropdown.
        const option = document.createElement('option');
        option.value = nilName;
        option.textContent = nilName;
        select.appendChild(option);
    });
}

/**
 * Renderizza la tabella statistiche
 */
function renderStatsTable(stats) {
    // Seleziona il body della tabella e lo svuota prima del rendering.
    const tbody = document.querySelector('#stats-table tbody');
    tbody.innerHTML = '';

    stats.forEach((stat, index) => {
        const row = document.createElement('tr');
        if (index === 0) {
            // Evidenzia la prima riga (NIL con più fontanelle).
            row.classList.add('top-row');
        }

        row.innerHTML = `
            <td><strong>${stat.NIL}</strong></td>
            <td class="text-end">${stat.count}</td>
            <td class="text-center">
                <span class="badge bg-primary">${stat.percentage}%</span>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Mostra un messaggio di feedback in un elemento
 */
function showMessage(elementId, text, type = 'info') {
    // Crea un alert Bootstrap e lo inserisce nel contenitore richiesto.
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="alert alert-${type} show" role="alert">${text}</div>`;
    element.classList.add('show');
}

/**
 * Nascondi il messaggio di feedback
 */
function hideMessage(elementId) {
    // Rimuove contenuto e classe visibile dal box feedback.
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    element.classList.remove('show');
}

/**
 * Aggiorna il badge con il conteggio risultati
 */
function updateResultCount(n) {
    // Aggiorna il badge in alto nella card mappa.
    const badge = document.getElementById('result-count');
    const unit = n === 1 ? 'fontanella' : 'fontanelle';
    badge.textContent = `${n} ${unit}`;
}

/**
 * Aggiunge/rimuove una classe loading al bottone
 */
function setButtonLoading(btn, isLoading) {
    if (isLoading) {
        // Stato loading: disabilita bottone e mostra spinner.
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Caricamento...';
    } else {
        // Stato normale: ripristina testo originale del bottone.
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || btn.textContent;
    }
}

// =====================
// HANDLERS EVENTI
// =====================

/**
 * Gestisce la ricerca per testo NIL
 */
async function handleSearchByText() {
    // Legge i riferimenti DOM necessari.
    const input = document.getElementById('nil-input');
    const btn = document.getElementById('search-nil-btn');
    const nilValue = input.value.trim();

    if (!nilValue) {
        // Blocco input vuoto con messaggio chiaro.
        showMessage('feedback-nil', 'Per favore inserisci un nome di NIL', 'warning');
        return;
    }

    btn.dataset.originalText = btn.innerHTML;
    setButtonLoading(btn, true);

    try {
        // Chiamata API/mock con il valore scritto dall'utente.
        const results = await getFountainsByNil(nilValue);

        if (results.length === 0) {
            showMessage('feedback-nil', `Nessuna fontanella trovata per "${nilValue}"`, 'warning');
            clearMarkers();
            showNilPerimeter(getNilNamesFromText(nilValue));
            updateResultCount(0);
        } else {
            clearMarkers();
            const nilNames = [...new Set(results.map(r => String(r.NIL || '').toUpperCase()).filter(Boolean))];
            showNilPerimeter(nilNames);
            addMarkers(results);
            zoomToMarkers();
            updateResultCount(results.length);
            showMessage('feedback-nil', `Trovate ${results.length} fontanelle`, 'success');
        }

        AppState.results = results;
    } catch (error) {
        showMessage('feedback-nil', 'Errore nella ricerca', 'danger');
        console.error(error);
    } finally {
        setButtonLoading(btn, false);
    }
}

/**
 * Gestisce la ricerca per select
 */
async function handleSearchBySelect() {
    // Legge il NIL selezionato dalla tendina.
    const select = document.getElementById('nil-select');
    const btn = document.getElementById('search-select-btn');
    const nilValue = select.value;

    if (!nilValue) {
        // Impedisce ricerca senza selezione.
        showMessage('feedback-nil', 'Per favore seleziona un NIL', 'warning');
        return;
    }

    btn.dataset.originalText = btn.innerHTML;
    setButtonLoading(btn, true);

    try {
        const results = await getFountainsByNil(nilValue);

        if (results.length === 0) {
            showMessage('feedback-nil', `Nessuna fontanella trovata per ${nilValue}`, 'warning');
            clearMarkers();
            showNilPerimeter([String(nilValue).toUpperCase()]);
            updateResultCount(0);
        } else {
            clearMarkers();
            showNilPerimeter([String(nilValue).toUpperCase()]);
            addMarkers(results);
            zoomToMarkers();
            updateResultCount(results.length);
            showMessage('feedback-nil', `Trovate ${results.length} fontanelle`, 'success');
        }

        AppState.results = results;
    } catch (error) {
        showMessage('feedback-nil', 'Errore nella ricerca', 'danger');
        console.error(error);
    } finally {
        setButtonLoading(btn, false);
    }
}

/**
 * Gestisce la ricerca per distanza
 */
async function handleSearchNearPoint() {
    // Recupera input coordinate e raggio dal form.
    const latInput = document.getElementById('latitude-input');
    const lngInput = document.getElementById('longitude-input');
    const radiusInput = document.getElementById('distance-radius');
    const btn = document.getElementById('search-distance-btn');

    const lat = latInput.value.trim();
    const lng = lngInput.value.trim();
    const radius = radiusInput.value.trim() || RADIUS;

    // Validazione: lat/lng devono essere numeri.
    if (!lat || !lng || !isValidNumber(lat) || !isValidNumber(lng)) {
        showMessage('feedback-distance', 'Per favore inserisci coordinate numeriche valide', 'warning');
        return;
    }

    if (!isValidNumber(radius) || parseFloat(radius) <= 0) {
        showMessage('feedback-distance', 'Il raggio deve essere un numero positivo', 'warning');
        return;
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);

    // Validazione range coordinate Milano (controllo rapido lato UI).
    if (latNum < 45.2 || latNum > 45.7 || lngNum < 8.9 || lngNum > 9.3) {
        showMessage('feedback-distance', 'Coordinate fuori dall\'area di Milano', 'warning');
        return;
    }

    btn.dataset.originalText = btn.innerHTML;
    setButtonLoading(btn, true);

    try {
        // Cerca fontanelle entro il raggio dalla coppia lat/lng inserita.
        const results = await getFountainsNearPoint(latNum, lngNum, radiusNum);

        // Mostra sempre posizione e raggio della ricerca effettuata.
        clearMarkers();
        showUserMarker(latNum, lngNum, radiusNum);

        if (results.length === 0) {
            showMessage('feedback-distance', 'Nessuna fontanella trovata entro il raggio specificato', 'warning');
            updateResultCount(0);
            AppState.mapInstance.setView([latNum, lngNum], 15);
        } else {
            addMarkers(results);
            zoomToMarkers();
            updateResultCount(results.length);
            showMessage('feedback-distance', `Trovate ${results.length} fontanelle entro ${radiusNum}m`, 'success');
        }

        AppState.results = results;
    } catch (error) {
        showMessage('feedback-distance', 'Errore nella ricerca', 'danger');
        console.error(error);
    } finally {
        setButtonLoading(btn, false);
    }
}

/**
 * Gestisce il pulsante "Usa posizione GPS"
 */
async function handleUseMyPosition() {
    // Riferimenti DOM necessari.
    const btn = document.getElementById('use-position-btn');
    const radiusInput = document.getElementById('distance-radius');
    const radius = radiusInput.value.trim() || RADIUS;

    if (!navigator.geolocation) {
        // Browser vecchi/non compatibili.
        showMessage('feedback-distance', 'Geolocalizzazione non supportata dal browser', 'danger');
        return;
    }

    btn.dataset.originalText = btn.innerHTML;
    setButtonLoading(btn, true);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            // Coordinate GPS lette dal browser.
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const radiusNum = parseFloat(radius) || RADIUS;

            try {
                const results = await getFountainsNearPoint(lat, lng, radiusNum);

                // Mostra sempre posizione e raggio della ricerca effettuata.
                clearMarkers();
                showUserMarker(lat, lng, radiusNum);

                if (results.length === 0) {
                    showMessage('feedback-distance', 'Nessuna fontanella trovata entro il raggio', 'warning');
                    updateResultCount(0);
                    AppState.mapInstance.setView([lat, lng], 15);
                } else {
                    addMarkers(results);
                    zoomToMarkers();
                    updateResultCount(results.length);
                    showMessage('feedback-distance', `Trovate ${results.length} fontanelle entro ${radiusNum}m dalla tua posizione`, 'success');
                }

                AppState.results = results;
            } catch (error) {
                showMessage('feedback-distance', 'Errore nella ricerca', 'danger');
                console.error(error);
            } finally {
                setButtonLoading(btn, false);
            }
        },
        (error) => {
            // Traduzione codici errore in messaggi leggibili.
            const errorMessages = {
                1: 'Hai negato l\'accesso alla geolocalizzazione',
                2: 'Posizione non disponibile',
                3: 'Timeout nella richiesta'
            };
            showMessage('feedback-distance', errorMessages[error.code] || 'Errore nella geolocalizzazione', 'danger');
            setButtonLoading(btn, false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

/**
 * Gestisce il reset della mappa
 */
function handleReset() {
    // Pulisce mappa, badge, messaggi e input.
    clearMarkers();
    updateResultCount(0);
    hideMessage('feedback-nil');
    hideMessage('feedback-distance');
    document.getElementById('nil-input').value = '';
    document.getElementById('nil-select').value = '';
    document.getElementById('latitude-input').value = '';
    document.getElementById('longitude-input').value = '';
    document.getElementById('distance-radius').value = RADIUS;

    // Riporta la mappa al centro di Milano.
    AppState.mapInstance.setView(MILANO_CENTER, 13);

    showMessage('feedback-nil', 'Mappa e ricerca azzerati', 'info');
}

// =====================
// INIZIALIZZAZIONE
// =====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inizializzazione app...');

    if (window.location.protocol === 'file:') {
        // Con apertura locale la web app non può usare le API relative.
        showMessage(
            'feedback-nil',
            'Pagina aperta come file locale: questa versione usa solo API reali. Apri la web app dalla porta del backend Flask.',
            'warning'
        );
    }

    // 1) Inizializza mappe.
    initMap();
    initChoroplethMap();

    // 2) Carica NIL e popola la dropdown.
    await populateNilDropdown();

    // 3) Carica statistiche e renderizza tabella.
    const stats = await getStats();
    AppState.stats = stats;
    renderStatsTable(stats);

    // 4) Carica dati e disegna choropleth.
    const choroplethData = await getChoroplethData();
    AppState.nilGeometryByName = new Map(
        choroplethData
            .filter(item => item.geometry)
            .map(item => [String(item.name || '').toUpperCase(), item.geometry])
    );
    renderChoropleth(choroplethData);

    // 5) Collega i bottoni ai rispettivi handler.
    document.getElementById('search-nil-btn').addEventListener('click', handleSearchByText);
    document.getElementById('search-select-btn').addEventListener('click', handleSearchBySelect);
    document.getElementById('search-distance-btn').addEventListener('click', handleSearchNearPoint);
    document.getElementById('use-position-btn').addEventListener('click', handleUseMyPosition);
    document.getElementById('reset-map-btn').addEventListener('click', handleReset);

    // Permetti ricerca da invio nei campi input
    document.getElementById('nil-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchByText();
    });

    console.log('App inizializzata');
});
