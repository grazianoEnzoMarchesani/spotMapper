export class MapManager {
    constructor() {
        this.map = null;
        this.drawnItems = null;
        this.markers = [];
    }

    async initialize() {
        // Inizializza la mappa Leaflet
        this.map = L.map('map').setView([41.902782, 12.496366], 13);
        
        // Aggiungi il layer di OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Inizializza il layer per gli elementi disegnati
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Configura gli strumenti di disegno
        const drawControl = new L.Control.Draw({
            draw: {
                polygon: false,
                marker: false,
                circle: false,
                polyline: false,
                circlemarker: false,
                rectangle: {
                    shapeOptions: {
                        color: '#0000ff',
                        weight: 2
                    }
                }
            },
            edit: {
                featureGroup: this.drawnItems
            }
        });

        this.map.addControl(drawControl);

        // Aggiungi listener per gli eventi di disegno
        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers();
            this.drawnItems.addLayer(e.layer);
            this.map.fire('rectangleDrawn', { bounds: e.layer.getBounds() });
        });

        this.map.on(L.Draw.Event.EDITED, (e) => {
            this.map.fire('rectangleEdited', { bounds: e.layers.getLayers()[0].getBounds() });
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    addMarkers(places) {
        this.clearMarkers();
        places.forEach(place => {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const marker = L.marker([lat, lng]).addTo(this.map);

            marker.bindPopup(`
                <h3>${place.name}</h3>
                <p>${place.vicinity}</p>
                <p>Rating: ${place.rating || 'N/A'}</p>
                <p>Coordinate: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            `);

            this.markers.push(marker);
        });
    }

    getDrawnRectangleBounds() {
        let bounds = null;
        this.drawnItems.eachLayer(layer => {
            if (layer instanceof L.Rectangle) {
                bounds = layer.getBounds();
            }
        });
        return bounds;
    }
} 