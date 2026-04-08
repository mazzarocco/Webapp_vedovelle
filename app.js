// =====================
// CONFIGURAZIONE
// =====================

// Se apri la pagina come file locale (file://), il browser non passa dal backend Flask.
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
// In file locale usiamo dati mock, altrimenti usiamo API reali.
const USE_MOCK = IS_FILE_PROTOCOL;
// BASE_URL vuoto = stessa origine della pagina (utile in Codespaces/porte forwardate).
const BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';
// Raggio di default per le ricerche "vicino a un punto".
const RADIUS = 500;
// Metodo geospaziale backend: 'near' oppure 'geowithin'.
const GEO_QUERY_METHOD = 'near';
// Centro iniziale della mappa (Milano).
const MILANO_CENTER = [45.4642, 9.1900]; // [lat, lng]

// =====================
// DATI MOCK
// =====================

// NIL reali di Milano
const MOCK_NIL = [
    { id: 1, idnil: 1, name: 'DUOMO' },
    { id: 2, idnil: 2, name: 'NAVIGLI' },
    { id: 3, idnil: 3, name: 'BRERA' },
    { id: 4, idnil: 4, name: 'ISOLA' },
    { id: 5, idnil: 5, name: 'MONFORTE' },
    { id: 6, idnil: 6, name: 'GRECO' },
    { id: 7, idnil: 7, name: 'STAMBERIA' },
    { id: 8, idnil: 8, name: 'GARIBALDI' },
    { id: 9, idnil: 9, name: 'SEMPIONE' },
    { id: 10, idnil: 10, name: 'MAGENTA' },
    { id: 11, idnil: 11, name: 'PAGANO' },
    { id: 12, idnil: 12, name: 'LOTTO' }
];

// Fontanelle con coordinate reali a Milano
const MOCK_FONTANELLE = [
    // DUOMO
    { objectID: 1, NIL: 'DUOMO', IDNIL: 1, geometry: { coordinates: [9.1863, 45.4642] } },
    { objectID: 2, NIL: 'DUOMO', IDNIL: 1, geometry: { coordinates: [9.1875, 45.4635] } },
    { objectID: 3, NIL: 'DUOMO', IDNIL: 1, geometry: { coordinates: [9.1880, 45.4650] } },
    { objectID: 4, NIL: 'DUOMO', IDNIL: 1, geometry: { coordinates: [9.1855, 45.4658] } },
    
    // NAVIGLI
    { objectID: 5, NIL: 'NAVIGLI', IDNIL: 2, geometry: { coordinates: [9.1750, 45.4550] } },
    { objectID: 6, NIL: 'NAVIGLI', IDNIL: 2, geometry: { coordinates: [9.1770, 45.4560] } },
    { objectID: 7, NIL: 'NAVIGLI', IDNIL: 2, geometry: { coordinates: [9.1745, 45.4575] } },
    { objectID: 8, NIL: 'NAVIGLI', IDNIL: 2, geometry: { coordinates: [9.1755, 45.4590] } },
    
    // BRERA
    { objectID: 9, NIL: 'BRERA', IDNIL: 3, geometry: { coordinates: [9.1910, 45.4720] } },
    { objectID: 10, NIL: 'BRERA', IDNIL: 3, geometry: { coordinates: [9.1920, 45.4730] } },
    { objectID: 11, NIL: 'BRERA', IDNIL: 3, geometry: { coordinates: [9.1900, 45.4710] } },
    
    // ISOLA
    { objectID: 12, NIL: 'ISOLA', IDNIL: 4, geometry: { coordinates: [9.2050, 45.4800] } },
    { objectID: 13, NIL: 'ISOLA', IDNIL: 4, geometry: { coordinates: [9.2040, 45.4810] } },
    { objectID: 14, NIL: 'ISOLA', IDNIL: 4, geometry: { coordinates: [9.2060, 45.4820] } },
    
    // MONFORTE
    { objectID: 15, NIL: 'MONFORTE', IDNIL: 5, geometry: { coordinates: [9.1820, 45.4700] } },
    
    // GRECO
    { objectID: 16, NIL: 'GRECO', IDNIL: 6, geometry: { coordinates: [9.2250, 45.4650] } },
    
    // STAMBERIA
    { objectID: 17, NIL: 'STAMBERIA', IDNIL: 7, geometry: { coordinates: [9.1650, 45.4480] } },
    
    // GARIBALDI
    { objectID: 18, NIL: 'GARIBALDI', IDNIL: 8, geometry: { coordinates: [9.1920, 45.4900] } },
    { objectID: 19, NIL: 'GARIBALDI', IDNIL: 8, geometry: { coordinates: [9.1935, 45.4910] } },
    
    // SEMPIONE
    { objectID: 20, NIL: 'SEMPIONE', IDNIL: 9, geometry: { coordinates: [9.1650, 45.4800] } },
];

// Statistiche (ordinate per numero di fontanelle decrescente)
const MOCK_STATS = [
    { NIL: 'DUOMO', IDNIL: 1, count: 4 },
    { NIL: 'NAVIGLI', IDNIL: 2, count: 4 },
    { NIL: 'GARIBALDI', IDNIL: 8, count: 2 },
    { NIL: 'BRERA', IDNIL: 3, count: 3 },
    { NIL: 'ISOLA', IDNIL: 4, count: 3 },
    { NIL: 'MONFORTE', IDNIL: 5, count: 1 },
    { NIL: 'GRECO', IDNIL: 6, count: 1 },
    { NIL: 'STAMBERIA', IDNIL: 7, count: 1 },
    { NIL: 'SEMPIONE', IDNIL: 9, count: 1 },
    { NIL: 'MAGENTA', IDNIL: 10, count: 0 },
    { NIL: 'PAGANO', IDNIL: 11, count: 0 },
    { NIL: 'LOTTO', IDNIL: 12, count: 0 },
];

// Poligoni semplificati (rettangoli approssimati) per la choropleth
const MOCK_CHOROPLETH = [
    {
        name: 'DUOMO',
        count: 4,
        geometry: {
            type: 'Polygon',
            coordinates: [[[9.1800, 45.4600], [9.1900, 45.4600], [9.1900, 45.4700], [9.1800, 45.4700], [9.1800, 45.4600]]]
        }
    },
    {
        name: 'NAVIGLI',
        count: 4,
        geometry: {
            type: 'Polygon',
            coordinates: [[[9.1700, 45.4500], [9.1800, 45.4500], [9.1800, 45.4600], [9.1700, 45.4600], [9.1700, 45.4500]]]
        }
    },
    {
        name: 'BRERA',
        count: 3,
        geometry: {
            type: 'Polygon',
            coordinates: [[[9.1850, 45.4700], [9.1950, 45.4700], [9.1950, 45.4800], [9.1850, 45.4800], [9.1850, 45.4700]]]
        }
    },
    {
        name: 'ISOLA',
        count: 3,
        geometry: {
            type: 'Polygon',
            coordinates: [[[9.1950, 45.4750], [9.2150, 45.4750], [9.2150, 45.4850], [9.1950, 45.4850], [9.1950, 45.4750]]]
        }
    },
    {
        name: 'SEMPIONE',
        count: 1,
        geometry: {
            type: 'Polygon',
            coordinates: [[[9.1600, 45.4750], [9.1700, 45.4750], [9.1700, 45.4850], [9.1600, 45.4850], [9.1600, 45.4750]]]
        }
    }
];

// =====================
// STATO APPLICAZIONE
// =====================

const AppState = {
    // Lista NIL caricata dal backend o dai dati mock.
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
    // Marker speciale della posizione utente.
    userMarker: null
};

// =====================
// FUNZIONI API
// =====================

/**
 * Fetch JSON con controllo esplicito dello stato HTTP.
 */
async function fetchJson(path) {
    // Esegue la chiamata HTTP all'endpoint richiesto.
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
        // Se il server risponde con errore (4xx/5xx), generiamo un errore leggibile.
        throw new Error(`HTTP ${response.status} su ${path}`);
    }
    // Converte la risposta in JSON.
    return response.json();
}

/**
 * Ottiene la lista di tutti i NIL
 */
async function getNilList() {
    if (USE_MOCK) {
        // Simula una chiamata API con piccolo ritardo.
        return new Promise(resolve => {
            setTimeout(() => resolve(MOCK_NIL), 100);
        });
    }
    try {
        // Chiama il backend reale.
        return await fetchJson('/api/nil');
    } catch (error) {
        console.error('Errore nel recupero lista NIL:', error);
        return [];
    }
}

/**
 * Ottiene fontanelle per un NIL specifico
 */
async function getFountainsByNil(nilValue) {
    if (USE_MOCK) {
        return new Promise(resolve => {
            // Match parziale (case-insensitive) sul nome NIL.
            const filtered = MOCK_FONTANELLE.filter(f =>
                f.NIL.toUpperCase().includes(nilValue.toUpperCase())
            );
            setTimeout(() => resolve(filtered), 100);
        });
    }
    try {
        // Passa NIL in query string.
        return await fetchJson(`/api/fontanelle/by-nil?nil=${encodeURIComponent(nilValue)}`);
    } catch (error) {
        console.error('Errore nel recupero fontanelle:', error);
        return [];
    }
}

/**
 * Ottiene fontanelle entro un raggio da coordinate
 */
async function getFountainsNearPoint(lat, lng, radius = RADIUS) {
    if (USE_MOCK) {
        return new Promise(resolve => {
            // Filtra solo i punti entro il raggio richiesto.
            const filtered = MOCK_FONTANELLE.filter(f => {
                const distance = calculateDistance(lat, lng, f.geometry.coordinates[1], f.geometry.coordinates[0]);
                return distance <= radius;
            });
            setTimeout(() => resolve(filtered), 100);
        });
    }
    try {
        // Endpoint con parametri lat/lng/r.
        return await fetchJson(
            `/api/fontanelle/near?lat=${lat}&lng=${lng}&r=${radius}&method=${encodeURIComponent(GEO_QUERY_METHOD)}`
        );
    } catch (error) {
        console.error('Errore nel recupero fontanelle prossime:', error);
        return [];
    }
}

/**
 * Ottiene statistiche fontanelle per NIL
 */
async function getStats() {
    if (USE_MOCK) {
        return new Promise(resolve => {
            // Totale usato per calcolare la percentuale per ogni riga.
            const total = MOCK_STATS.reduce((sum, s) => sum + s.count, 0);
            const withPercentage = MOCK_STATS.map(s => ({
                ...s,
                percentage: total > 0 ? ((s.count / total) * 100).toFixed(1) : '0'
            }));
            setTimeout(() => resolve(withPercentage), 100);
        });
    }
    try {
        const data = await fetchJson('/api/stats/fontanelle-per-nil');
        // Calcola il totale per trasformare i count in percentuali.
        const total = data.reduce((sum, s) => sum + Number(s.count || 0), 0);

        return data.map(s => ({
            ...s,
            percentage: total > 0 ? ((Number(s.count || 0) / total) * 100).toFixed(1) : '0'
        }));
    } catch (error) {
        console.error('Errore nel recupero statistiche:', error);
        return [];
    }
}

/**
 * Ottiene dati per la mappa choropleth
 */
async function getChoroplethData() {
    if (USE_MOCK) {
        return new Promise(resolve => {
            setTimeout(() => resolve(MOCK_CHOROPLETH), 100);
        });
    }
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
        console.error('Errore nel recupero dati choropleth:', error);
        return [];
    }
}

// =====================
// FUNZIONI UTILITÀ
// =====================

/**
 * Calcola la distanza tra due coordinate (formula Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Formula Haversine: distanza tra due coordinate geografiche.
    const R = 6371000; // Raggio della Terra in metri
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
}

/**
 * Aggiunge marker per le fontanelle sulla mappa
 */
function addMarkers(fontanelle) {
    // Prima puliamo i marker vecchi per evitare sovrapposizioni.
    clearMarkers();

    fontanelle.forEach(fountain => {
        // Il backend passa coordinate in formato [lng, lat].
        const [lng, lat] = fountain.geometry.coordinates;
        const marker = L.circleMarker([lat, lng], {
            // Marker più visibile: colore forte + bordo scuro + dimensione maggiore.
            radius: 8,
            fillColor: '#ff2d55',
            color: '#3d0012',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.95
        });

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
function showUserMarker(lat, lng) {
    if (AppState.userMarker) {
        // Evita di avere più marker utente contemporaneamente.
        AppState.mapInstance.removeLayer(AppState.userMarker);
    }

    AppState.userMarker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#28a745',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    });

    AppState.userMarker.bindPopup('La tua posizione').openPopup();
    AppState.userMarker.addTo(AppState.mapInstance);

    // Aggiungi anche un cerchio di 500m
    L.circle([lat, lng], {
        radius: RADIUS,
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
            updateResultCount(0);
        } else {
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
            updateResultCount(0);
        } else {
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

        if (results.length === 0) {
            showMessage('feedback-distance', 'Nessuna fontanella trovata entro il raggio specificato', 'warning');
            clearMarkers();
            updateResultCount(0);
        } else {
            clearMarkers();
            showUserMarker(latNum, lngNum);
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

                if (results.length === 0) {
                    showMessage('feedback-distance', 'Nessuna fontanella trovata entro il raggio', 'warning');
                    clearMarkers();
                    updateResultCount(0);
                } else {
                    clearMarkers();
                    showUserMarker(lat, lng);
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

    if (IS_FILE_PROTOCOL) {
        // Messaggio informativo quando la pagina è aperta come file locale.
        showMessage(
            'feedback-nil',
            'Pagina aperta da file locale: uso dati mock. Per usare MongoDB apri la web app dalla porta del backend Flask.',
            'info'
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
