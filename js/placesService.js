export class PlacesService {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        this.placesService = null;
    }

    async initialize() {
        await this.loadGooglePlacesScript();
    }

    loadGooglePlacesScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,drawing`;
            script.defer = true;
            script.async = true;
            script.onload = () => {
                this.placesService = new google.maps.places.PlacesService(document.createElement('div'));
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    searchPlaces(bounds, type) {
        return new Promise((resolve) => {
            const request = {
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(bounds._southWest.lat, bounds._southWest.lng),
                    new google.maps.LatLng(bounds._northEast.lat, bounds._northEast.lng)
                ),
                type: type
            };

            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    resolve([]);
                } else {
                    console.warn(`Nessun risultato trovato per il tipo: ${type}`);
                    resolve([]);
                }
            });
        });
    }
} 