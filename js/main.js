import { MapManager } from './mapManager.js';
import { PlacesService } from './placesService.js';

let mapManager = null;
let placesService = null;

async function initializeApp(apiKey) {
    // Inizializza i servizi
    placesService = new PlacesService(apiKey);
    await placesService.initialize();
    
    mapManager = new MapManager();
    await mapManager.initialize();

    // Gestisci gli eventi di disegno
    mapManager.map.on('draw:created', handleDrawCreated);
    mapManager.map.on('draw:deleted', handleDrawDeleted);
    mapManager.map.on('draw:edited', handleDrawEdited);
    mapManager.map.on('rectangleEdited', searchPlaces);

    // Nascondi il modal
    document.getElementById('apiKeyModal').style.display = 'none';

    // Aggiungi listener per il cambio di tipo
    document.querySelectorAll('#placeTypes input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', searchPlaces);
    });
}

async function searchPlaces() {
    const bounds = mapManager.getDrawnRectangleBounds();
    if (!bounds) {
        alert('Disegna prima un rettangolo sulla mappa');
        return;
    }

    const selectedTypes = Array.from(document.querySelectorAll('#placeTypes input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedTypes.length === 0) {
        alert('Seleziona almeno un tipo di luogo');
        return;
    }

    try {
        mapManager.clearMarkers();
        document.getElementById('placesList').innerHTML = '';

        const allPlaces = await Promise.all(
            selectedTypes.map(type => placesService.searchPlaces(bounds, type))
        );

        const places = allPlaces.flat();
        
        if (places.length === 0) {
            document.getElementById('placesList').innerHTML = `
                <div class="no-results">
                    <p>Nessun risultato trovato nella zona selezionata.</p>
                    <p>Prova ad allargare l'area di ricerca o seleziona altri tipi di luoghi.</p>
                </div>`;
        } else {
            mapManager.addMarkers(places);
            updatePlacesList(places);
        }
    } catch (error) {
        console.error('Errore nella ricerca:', error);
        alert('Si è verificato un errore durante la ricerca dei luoghi');
    }
}

function updatePlacesList(places) {
    const placesList = document.getElementById('placesList');
    const downloadButton = document.getElementById('downloadCSV');
    placesList.innerHTML = '';
    
    if (places.length > 0) {
        places.forEach(place => {
            const placeItem = document.createElement('div');
            placeItem.className = 'place-item';
            placeItem.innerHTML = `
                <h3>${place.name}</h3>
                <p>${place.vicinity}</p>
                <p>Rating: ${place.rating || 'N/A'}</p>
                <p>Coordinate: ${place.geometry.location.lat().toFixed(6)}, ${place.geometry.location.lng().toFixed(6)}</p>
            `;
            placesList.appendChild(placeItem);
        });
        
        downloadButton.style.display = 'block';
        downloadButton.onclick = () => downloadCSV(places);
    } else {
        downloadButton.style.display = 'none';
    }
}

function handleDrawCreated(e) {
    mapManager.drawnItems.clearLayers();
    mapManager.drawnItems.addLayer(e.layer);
    searchPlaces();
}

function handleDrawDeleted() {
    mapManager.clearMarkers();
    document.getElementById('placesList').innerHTML = '';
    document.getElementById('downloadCSV').style.display = 'none';
}

function handleDrawEdited(e) {
    searchPlaces();
}

// Aggiungi questa funzione per verificare che l'API key sia valida e i servizi siano attivi
async function validateApiKey(apiKey) {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.error_message) {
            alert(`Errore API: ${data.error_message}`);
            return false;
        }
        return true;
    } catch (error) {
        alert('Errore nella validazione dell\'API key');
        return false;
    }
}

// Modifica la funzione che gestisce la conferma dell'API key
document.getElementById('confirmApiKey').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        alert('Inserisci una API key valida');
        return;
    }

    // Valida l'API key prima di inizializzare l'app
    if (await validateApiKey(apiKey)) {
        initializeApp(apiKey);
    } else {
        alert(`
            Per utilizzare questa applicazione, assicurati di aver attivato i seguenti servizi nella Google Cloud Console:
            1. Maps JavaScript API
            2. Places API
            3. Geocoding API
            
            Vai su: https://console.cloud.google.com/apis/library
            e attiva i servizi necessari per il tuo progetto.
        `);
    }
}); 

function convertToCSV(places) {
    const headers = ['Nome', 'Indirizzo', 'Valutazione', 'Latitudine', 'Longitudine', 'Tipo'];
    const rows = places.map(place => [
        place.name,
        place.vicinity,
        place.rating || 'N/A',
        place.geometry.location.lat(),
        place.geometry.location.lng(),
        place.types[0]
    ].map(value => `"${value}"`).join(','));
    
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(places) {
    const csv = convertToCSV(places);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'luoghi_trovati.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 