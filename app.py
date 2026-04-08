"""
Backend Flask della web app "Fontanelle Milano".

Idea generale:
1) Legge i dati dal database MongoDB.
2) Espone endpoint REST che il front-end chiama con fetch.
3) Uniforma i dati (normalizzazione) perché nel DB possono esserci formati diversi.
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import math

# Crea l'app Flask.
app = Flask(__name__)
# Abilita CORS: serve per permettere al front-end di chiamare le API.
CORS(app)

# Percorso assoluto della cartella del progetto (utile per leggere .env e file statici).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Carica le variabili dal file .env locale (utile con "python app.py").
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Recupera la stringa di connessione MongoDB dall'ambiente.
MONGO_URI = os.environ.get("MONGO_URI")
if not MONGO_URI:
    # Se manca, fermiamo subito il server con un messaggio chiaro.
    raise RuntimeError(
        "MONGO_URI non trovata. Inseriscila nel file .env o esportala nella shell."
    )

# Apre la connessione a MongoDB con timeout breve.
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
# Ping immediato: se il DB non è raggiungibile lo scopriamo all'avvio.
client.admin.command("ping")
db = client["dbSpaziali"]

# Legge i nomi collection presenti per gestire differenze tra "NIL" e "nil".
collection_names = set(db.list_collection_names())
nil_collection_name = "NIL" if "NIL" in collection_names else "nil"

nil_collection = db[nil_collection_name]  # nome della tua collection NIL
fontanelle_collection = db["fontanelle"]  # nome della tua collection fontanelle
# Collection di supporto: un documento per fontanella (utile per query geospaziali Mongo).
fontanelle_points_collection = db["fontanelle_points"]

# Raggio terrestre in metri (usato sia da Haversine sia da $geoWithin).
EARTH_RADIUS_M = 6371000


def haversine_distance_m(lat1, lng1, lat2, lng2):
    """Distanza in metri tra due coordinate geografiche."""
    # Formula Haversine: distanza "in linea d'aria" sulla superficie terrestre.
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_M * c


def get_nil_records():
    """
    Normalizza i NIL in un formato uniforme:
    [{NIL, IDNIL, geometry}, ...]
    """
    # Prende un documento di esempio per capire il formato reale della collection.
    sample = nil_collection.find_one({}, {"_id": 0})
    if not sample:
        # Collection vuota: nessun NIL disponibile.
        return []

    # Caso GeoJSON con array features (dataset reale)
    if "features" in sample:
        # Usiamo un dizionario per evitare duplicati dello stesso NIL.
        unique = {}
        for feature in sample.get("features", []):
            props = feature.get("properties", {})
            nil_name = props.get("NIL")
            idnil = props.get("ID_NIL") or props.get("IDNIL")
            geometry = feature.get("geometry")

            if not nil_name:
                # Se il nome NIL manca, non possiamo usarlo nelle statistiche.
                continue

            key = (nil_name, str(idnil))
            if key not in unique:
                # Salviamo una sola volta ogni coppia NIL + IDNIL.
                unique[key] = {
                    "NIL": nil_name,
                    "IDNIL": idnil,
                    "geometry": geometry,
                }

        return list(unique.values())

    # Fallback: documenti già "piatti"
    return list(nil_collection.find({}, {"_id": 0, "NIL": 1, "IDNIL": 1, "geometry": 1}))


def get_fontanelle_records():
    """
    Normalizza le fontanelle in un formato uniforme:
    [{objectID, NIL, IDNIL, geometry:{type, coordinates}}, ...]
    """
    # Prende un documento di esempio per capire il formato della collection.
    sample = fontanelle_collection.find_one({}, {"_id": 0})
    if not sample:
        # Collection vuota: nessuna fontanella.
        return []

    # Caso GeoJSON con array features (dataset reale)
    if "features" in sample:
        rows = []
        for feature in sample.get("features", []):
            props = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            coords = geometry.get("coordinates")

            if not isinstance(coords, list) or len(coords) < 2:
                # Coordinate non valide: scartiamo il record.
                continue

            nil_name = props.get("NIL")
            if not nil_name:
                # Senza NIL non possiamo collegare il record alle aree di Milano.
                continue

            rows.append(
                {
                    "objectID": props.get("objectID") or props.get("OBJECTID"),
                    "NIL": nil_name,
                    "IDNIL": props.get("ID_NIL") or props.get("IDNIL"),
                    "geometry": {
                        "type": "Point",
                        "coordinates": [coords[0], coords[1]],
                    },
                }
            )

        return rows

    # Fallback: documenti già "piatti"
    return list(fontanelle_collection.find({}, {"_id": 0}))


def sync_fontanelle_points_cache():
    """
    Sincronizza una collection "piatta" con un documento per fontanella.

    Perché serve:
    - il dataset originale può essere annidato in GeoJSON (features[]);
    - con una collection piatta possiamo usare in modo diretto $near e $geoWithin.
    """
    rows = get_fontanelle_records()
    docs = []

    for row in rows:
        coords = row.get("geometry", {}).get("coordinates", [])
        if not isinstance(coords, list) or len(coords) < 2:
            continue

        docs.append(
            {
                "objectID": row.get("objectID"),
                "NIL": row.get("NIL"),
                "IDNIL": row.get("IDNIL"),
                "geometry": {
                    "type": "Point",
                    "coordinates": [coords[0], coords[1]],
                },
            }
        )

    # Ricrea il contenuto per avere cache coerente con la sorgente.
    fontanelle_points_collection.delete_many({})
    if docs:
        fontanelle_points_collection.insert_many(docs)

    # Indici utili per performance (soprattutto il 2dsphere).
    fontanelle_points_collection.create_index([("geometry", "2dsphere")])
    fontanelle_points_collection.create_index([("NIL", 1)])
    fontanelle_points_collection.create_index([("IDNIL", 1)])

    return len(docs)


def query_fontanelle_near(lat, lng, radius_m, method="near"):
    """
    Ricerca geospaziale MongoDB con due modalità:
    - method='near'      -> usa $near (ordinato per distanza)
    - method='geowithin' -> usa $geoWithin (punti entro cerchio)
    """
    if method == "geowithin":
        # $centerSphere vuole il raggio in radianti, non in metri.
        radius_radians = radius_m / EARTH_RADIUS_M
        query = {
            "geometry": {
                "$geoWithin": {
                    "$centerSphere": [[lng, lat], radius_radians],
                }
            }
        }
    else:
        query = {
            "geometry": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": radius_m,
                }
            }
        }

    return list(fontanelle_points_collection.find(query, {"_id": 0}))


# Prepara subito la collection geospaziale all'avvio dell'app.
sync_fontanelle_points_cache()


# --- Frontend SPA (index + asset locali) ---
@app.route("/")
def serve_index():
    # Serve la pagina principale quando si apre la root del server.
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def serve_frontend_assets(filename):
    # Lista estensioni consentite per i file statici.
    allowed_extensions = (
        ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".map"
    )
    if filename.endswith(allowed_extensions):
        # Se il file è valido, lo restituiamo.
        return send_from_directory(BASE_DIR, filename)
    # Altrimenti rispondiamo con 404 JSON.
    return jsonify({"error": "Not found"}), 404

# --- 1. Lista NIL per la dropdown ---
@app.route("/api/nil")
def get_nil_list():
    # Legge i NIL normalizzati.
    nils = get_nil_records()
    # Espone solo i campi utili al front-end.
    nils = [{"NIL": n.get("NIL"), "IDNIL": n.get("IDNIL")} for n in nils]
    # Ordina alfabeticamente per rendere più comoda la dropdown.
    nils.sort(key=lambda n: (n.get("NIL") or ""))
    return jsonify(nils)

# --- 2. Fontanelle per NIL ---
@app.route("/api/fontanelle/by-nil")
def get_by_nil():
    # Legge il parametro nil dalla query string e lo prepara per confronto case-insensitive.
    nil_value = request.args.get("nil", "").strip().lower()

    if nil_value:
        # Filtro testuale direttamente su Mongo (match parziale, case-insensitive).
        results = list(
            fontanelle_points_collection.find(
                {"NIL": {"$regex": nil_value, "$options": "i"}},
                {"_id": 0},
            )
        )
    else:
        # Se non è stato passato il filtro, restituisce tutte le fontanelle.
        results = list(fontanelle_points_collection.find({}, {"_id": 0}))

    return jsonify(results)

# --- 3. Fontanelle vicine a un punto (500m) ---
@app.route("/api/fontanelle/near")
def get_near():
    try:
        # Legge i parametri lat/lng/r dalla query string.
        lat = float(request.args.get("lat"))
        lng = float(request.args.get("lng"))
        r = int(request.args.get("r", 500))
    except (TypeError, ValueError):
        # Se i parametri non sono numeri validi, ritorna errore 400.
        return jsonify({"error": "Parametri lat/lng/r non validi"}), 400

    # Metodo geospaziale richiesto dal client (default: near).
    method = request.args.get("method", "near").strip().lower()
    if method not in {"near", "geowithin"}:
        return jsonify({"error": "Parametro method non valido. Usa 'near' o 'geowithin'."}), 400

    try:
        # Metodo principale: query geospaziale nativa MongoDB.
        results = query_fontanelle_near(lat, lng, r, method=method)
        return jsonify(results)
    except Exception:
        # Fallback di sicurezza: se qualcosa va storto con l'indice geospaziale,
        # mantiene il servizio disponibile usando il calcolo Haversine lato Python.
        results = []
        for row in get_fontanelle_records():
            coords = row.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue

            point_lng, point_lat = coords[0], coords[1]
            distance = haversine_distance_m(lat, lng, point_lat, point_lng)
            if distance <= r:
                results.append(row)

        return jsonify(results)

# --- 4. Statistiche fontanelle per NIL ---
@app.route("/api/stats/fontanelle-per-nil")
def get_stats():
    # Aggregazione direttamente su MongoDB (più veloce e pulita).
    pipeline = [
        {"$match": {"NIL": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$NIL", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"_id": 0, "NIL": "$_id", "count": 1}},
    ]
    stats = list(fontanelle_points_collection.aggregate(pipeline))
    return jsonify(stats)

# --- 5. Dati choropleth (NIL + conteggio) ---
@app.route("/api/choropleth")
def get_choropleth():
    # Primo passo: conta le fontanelle per IDNIL.
    pipeline = [
        {"$match": {"IDNIL": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$IDNIL", "count": {"$sum": 1}}},
    ]
    counts_by_idnil = {
        str(doc["_id"]): doc["count"]
        for doc in fontanelle_points_collection.aggregate(pipeline)
    }

    # Secondo passo: unisce geometria NIL + conteggio per costruire la choropleth.
    choropleth_rows = []
    for nil_row in get_nil_records():
        geometry = nil_row.get("geometry")
        if not geometry:
            continue

        idnil = nil_row.get("IDNIL")
        choropleth_rows.append(
            {
                "NIL": nil_row.get("NIL"),
                "IDNIL": idnil,
                "geometry": geometry,
                "count": counts_by_idnil.get(str(idnil), 0),
            }
        )

    return jsonify(choropleth_rows)

if __name__ == "__main__":
    # Avvia il server in debug per sviluppo locale.
    app.run(debug=True)