"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker, MapMouseEvent } from "maplibre-gl";
import { districts } from "@/data/districts";
import { ASTANA_CAMERA, districtLocations, MAP_STYLES } from "@/data/map";
import { addCityLayers, BUILDING_LAYER } from "@/lib/map/layers";
import { useTheme } from "@/components/theme/ThemeProvider";

export type BuildingInfo = {
  name: string;
  height: number | null;
  x: number;
  y: number;
};
type MapStatus = "loading" | "ready" | "unavailable";

export function useAstanaMap(
  selectedId: string,
  onSelect: (id: string) => void,
  onPreview: (id: string | null) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const { theme } = useTheme();
  const callbacks = useRef({ onSelect, onPreview });
  const themeRef = useRef(theme);
  const selectedRef = useRef(selectedId);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [building, setBuilding] = useState<BuildingInfo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [flat, setFlat] = useState(false);
  useEffect(() => {
    callbacks.current = { onSelect, onPreview };
  }, [onSelect, onPreview]);
  useEffect(() => {
    selectedRef.current = selectedId;
    markersRef.current.forEach((marker) => {
      const button = marker.getElement();
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.district === selectedId),
      );
    });
  }, [selectedId]);

  useEffect(() => {
    let disposed = false;
    let map: MapLibreMap | null = null;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatus("loading");
    setBuilding(null);
    setFlat(false);

    async function initialize() {
      try {
        const {
          Map,
          Marker,
          NavigationControl,
          AttributionControl,
          setWorkerUrl,
        } = await import("maplibre-gl");
        if (disposed || !containerRef.current) return;
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const activeTheme =
          document.documentElement.dataset.theme === "dark" ? "dark" : "light";
        themeRef.current = activeTheme;
        map = new Map({
          container: containerRef.current,
          style: MAP_STYLES[activeTheme],
          ...ASTANA_CAMERA,
          minZoom: 10,
          maxZoom: 18.5,
          maxPitch: 70,
          maxBounds: [
            [71.1, 50.98],
            [71.8, 51.35],
          ],
          canvasContextAttributes: { antialias: true },
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(
          new NavigationControl({ visualizePitch: true }),
          "top-right",
        );
        map.addControl(
          new AttributionControl({ compact: true }),
          "bottom-right",
        );
        map
          .getCanvas()
          .setAttribute(
            "aria-label",
            "3D map of Astana. Drag to pan, scroll to zoom, right-drag to rotate. Use district buttons to select a district.",
          );
        // Scroll deliberately over the map; the page remains scrollable around it.
        map.on("style.load", () => {
          if (!map || disposed) return;
          addCityLayers(map, themeRef.current === "dark");
        });
        map.on("idle", () => {
          if (!disposed) {
            setStatus("ready");
            if (timer) clearTimeout(timer);
          }
        });
        map.on("error", () => {
          // Transient tile errors may recover. The timeout below handles persistent failures.
        });
        map.on("webglcontextlost", () => {
          if (!disposed) setStatus("unavailable");
        });
        timer = setTimeout(() => {
          if (!disposed)
            setStatus((current) =>
              current === "loading" ? "unavailable" : current,
            );
        }, 18000);

        markersRef.current = districts.map((district) => {
          const point = districtLocations[district.id];
          const button = document.createElement("button");
          button.type = "button";
          button.className = "district-map-pin";
          button.dataset.district = district.id;
          button.style.setProperty("--pin-color", point.color);
          button.setAttribute(
            "aria-label",
            `Explore ${district.name} district`,
          );
          button.setAttribute(
            "aria-pressed",
            String(district.id === selectedRef.current),
          );
          const dot = document.createElement("span");
          dot.className = "pin-dot";
          const name = document.createElement("span");
          name.textContent = district.name;
          const score = document.createElement("strong");
          score.textContent = district.score.toFixed(1);
          button.append(dot, name, score);
          button.onmouseenter = () => callbacks.current.onPreview(district.id);
          button.onmouseleave = () => callbacks.current.onPreview(null);
          button.onfocus = () => callbacks.current.onPreview(district.id);
          button.onblur = () => callbacks.current.onPreview(null);
          button.onclick = (event) => {
            event.stopPropagation();
            callbacks.current.onSelect(district.id);
          };
          return new Marker({ element: button, anchor: "bottom" })
            .setLngLat(point.center)
            .addTo(map!);
        });
        const onMove = (event: MapMouseEvent) => {
          if (!map?.getLayer(BUILDING_LAYER) || map.isMoving()) return;
          const feature = map.queryRenderedFeatures(event.point, {
            layers: [BUILDING_LAYER],
          })[0];
          if (!feature) {
            setBuilding(null);
            map.getCanvas().style.cursor = "";
            return;
          }
          const properties = feature.properties ?? {};
          const height = Number(properties.render_height);
          setBuilding({
            name: String(
              properties["name:en"] || properties.name || "City building",
            ),
            height: Number.isFinite(height) && height > 0 ? height : null,
            x: event.point.x,
            y: event.point.y,
          });
          map.getCanvas().style.cursor = "pointer";
        };
        map.on("mousemove", onMove);
        map.on("mouseout", () => setBuilding(null));
        map.on("movestart", () => setBuilding(null));
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(containerRef.current);
      } catch {
        if (!disposed) setStatus("unavailable");
      }
    }
    void initialize();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    themeRef.current = theme;
    const map = mapRef.current;
    if (map) {
      setBuilding(null);
      setStatus("loading");
      map.setStyle(MAP_STYLES[theme]);
      const timeout = setTimeout(
        () =>
          setStatus((current) =>
            current === "loading" ? "unavailable" : current,
          ),
        18000,
      );
      return () => clearTimeout(timeout);
    }
  }, [theme]);

  function focusDistrict(id: string) {
    const point = districtLocations[id];
    if (point && mapRef.current)
      mapRef.current.flyTo({
        center: point.center,
        zoom: 15.2,
        pitch: flat ? 0 : 58,
        duration: 1300,
      });
  }
  function togglePerspective() {
    const next = !flat;
    setFlat(next);
    mapRef.current?.easeTo({
      pitch: next ? 0 : 58,
      bearing: next ? 0 : -28,
      duration: 700,
    });
  }
  function resetView() {
    setFlat(false);
    mapRef.current?.flyTo({ ...ASTANA_CAMERA, duration: 1200 });
  }
  function overview() {
    mapRef.current?.fitBounds(
      [
        [71.385, 51.117],
        [71.493, 51.197],
      ],
      { padding: 60, pitch: 30, bearing: 0, duration: 1100 },
    );
    setFlat(false);
  }
  return {
    containerRef,
    status,
    building,
    flat,
    focusDistrict,
    togglePerspective,
    resetView,
    overview,
    retry: () => setAttempt((value) => value + 1),
  };
}
