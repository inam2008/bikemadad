import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "customer" | "mechanic";
  label?: string;
};

type Props = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  className?: string;
  zoom?: number;
};

export function MapView({ center, markers, className, zoom = 15 }: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holderRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(holderRef.current, { zoomControl: false, attributionControl: true }).setView(
        [center?.lat ?? 31.5204, center?.lng ?? 74.3587],
        zoom,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom() ?? zoom);
  }, [center?.lat, center?.lng, zoom, center]);

  useEffect(() => {
    const L = LRef.current;
    if (!L || !layerRef.current) return;
    layerRef.current.clearLayers();

    for (const m of markers) {
      const isMechanic = m.kind === "mechanic";
      const marker = L.marker([m.lat, m.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;font-size:17px;box-shadow:0 4px 14px rgba(0,0,0,.35);background:${
            isMechanic ? "#FFC107" : "#FF5722"
          };color:${isMechanic ? "#1E2530" : "#fff"}">${isMechanic ? "🔧" : "🏍️"}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      });
      if (m.label) marker.bindTooltip(m.label, { direction: "top", offset: [0, -14] });
      marker.addTo(layerRef.current);
    }
  }, [markers]);

  return <div ref={holderRef} className={className} />;
}
