"use client";

/**
 * Composant carte Leaflet isolé — AUCUN hook partagé avec le parent.
 * Doit toujours être importé via dynamic(() => import("./BaladeMap"), { ssr: false })
 * car Leaflet accède `window` et plante côté serveur.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Coordinate {
  lat: number;
  lng: number;
}

interface Props {
  coordinates: Coordinate[];
  currentPosition?: Coordinate | null;
  interactive?: boolean;
  height?: string;
  className?: string;
}

export default function BaladeMap({
  coordinates,
  currentPosition,
  interactive = true,
  height = "100%",
  className = "",
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: false,
    }).setView([46.6, 2.5], 6); // France center

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Update polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    if (coordinates.length >= 2) {
      const latlngs = coordinates.map((c) => [c.lat, c.lng] as L.LatLngTuple);
      polylineRef.current = L.polyline(latlngs, {
        color: "#E8670A",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      // En mode non-interactif (résumé/preview) : fit bounds sur tout le tracé
      // En mode interactif (tracking) : ne pas fitBounds car panTo gère déjà le suivi
      if (!interactive) {
        map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      }
    } else if (coordinates.length === 1) {
      map.setView([coordinates[0].lat, coordinates[0].lng], 15);
    }
  }, [coordinates]);

  // Update current position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (currentPosition) {
      markerRef.current = L.circleMarker([currentPosition.lat, currentPosition.lng], {
        radius: 8,
        color: "#3B82F6",
        fillColor: "#3B82F6",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map);

      // Pan to current position during tracking
      if (interactive) {
        map.panTo([currentPosition.lat, currentPosition.lng]);
      }
    }
  }, [currentPosition, interactive]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
