
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Исправление путей к иконкам маркеров (Leaflet + ESM issue)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GameMapProps {
  onGuess: (lat: number, lng: number) => void;
  actualLocation?: { lat: number; lng: number };
  guessedLocation?: { lat: number; lng: number } | null;
  interactive: boolean;
}

const GameMap: React.FC<GameMapProps> = ({ onGuess, actualLocation, guessedLocation, interactive }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      if (!interactive) return;
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng).addTo(mapRef.current!);
      }
      onGuess(lat, lng);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (layerGroupRef.current) {
      mapRef.current.removeLayer(layerGroupRef.current);
    }

    if (!interactive && actualLocation && guessedLocation) {
      const group = L.layerGroup().addTo(mapRef.current);
      layerGroupRef.current = group;

      const actualPos: [number, number] = [actualLocation.lat, actualLocation.lng];
      const guessedPos: [number, number] = [guessedLocation.lat, guessedLocation.lng];

      L.circleMarker(actualPos, { color: '#ef4444', radius: 10, fillOpacity: 0.8 }).addTo(group);
      L.marker(guessedPos).addTo(group);
      L.polyline([actualPos, guessedPos], { color: '#f59e0b', weight: 4, dashArray: '10, 10' }).addTo(group);

      const bounds = L.latLngBounds([actualPos, guessedPos]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [interactive, actualLocation, guessedLocation]);

  return (
    <div 
      ref={mapContainerRef} 
      className={`w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 ${interactive ? 'border-amber-500' : 'border-slate-700'}`}
    />
  );
};

export default GameMap;
