"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Box,
  Compass,
  Layers3,
  LoaderCircle,
  MapPin,
  Maximize,
  MousePointer2,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { districts } from "@/data/districts";
import { districtLocations } from "@/data/map";
import { CityIllustration } from "@/components/ui/CityIllustration";
import MapDistrictInfo from "./MapDistrictInfo";
import { useAstanaMap } from "./useAstanaMap";

export default function AstanaMap({
  selectedDistrictId,
  onDistrictSelect,
}: {
  selectedDistrictId?: string;
  onDistrictSelect?: (id: string) => void;
}) {
  const [localId, setLocalId] = useState("esil");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectedId = selectedDistrictId ?? localId;
  const previousId = useRef(selectedId);
  const selectDistrict = (id: string) => {
    setLocalId(id);
    onDistrictSelect?.(id);
  };
  const map = useAstanaMap(selectedId, selectDistrict, setHoveredId);
  const displayDistrict =
    districts.find((d) => d.id === (hoveredId ?? selectedId)) ?? districts[0];
  useEffect(() => {
    if (previousId.current !== selectedId) {
      map.focusDistrict(selectedId);
      previousId.current = selectedId;
    }
  }, [selectedId, map]);

  return (
    <section
      className="city-explorer"
      aria-label="Astana interactive city explorer"
    >
      <div className="explorer-heading">
        <div className="explorer-title">
          <span className="explorer-logo">
            <Layers3 size={23} />
          </span>
          <div>
            <span className="eyebrow">A NEW PERSPECTIVE</span>
            <h2>
              Explore Astana<span>.</span>
            </h2>
          </div>
        </div>
        <div className="explorer-heading-meta">
          <span className="map-live-badge">
            <span />
            INTERACTIVE CITY MAP
          </span>
          <span className="map-coordinates">51.128° N &nbsp; 71.430° E</span>
        </div>
      </div>
      <div className="explorer-body">
        <div className="map-viewport">
          <div
            ref={map.containerRef}
            className="map-canvas"
            data-testid="astana-map"
          />
          <div className="map-top-label">
            <span className="map-city-label">
              <MapPin size={13} /> ASTANA, KAZAKHSTAN
            </span>
            <span className="map-view-label">
              {map.flat ? "2D" : "3D"} VIEW
            </span>
          </div>
          <div className="map-tools" aria-label="Map view controls">
            <button
              onClick={map.togglePerspective}
              disabled={map.status !== "ready"}
              title="Toggle 2D / 3D view"
              aria-label="Toggle 2D / 3D view"
              aria-pressed={!map.flat}
            >
              <Box size={17} />
              <span>{map.flat ? "3D" : "2D"}</span>
            </button>
            <button
              onClick={map.overview}
              disabled={map.status !== "ready"}
              title="Show all five districts"
              aria-label="Show all five districts"
            >
              <Maximize size={17} />
            </button>
            <button
              onClick={map.resetView}
              disabled={map.status !== "ready"}
              title="Reset map view"
              aria-label="Reset map view"
            >
              <RotateCcw size={17} />
            </button>
          </div>
          {map.status === "loading" && (
            <div className="map-loading" role="status">
              <LoaderCircle size={24} className="spin" />
              <strong>Bringing Astana into focus</strong>
              <span>Loading streets and 3D buildings…</span>
            </div>
          )}
          {map.status === "unavailable" && (
            <div className="map-fallback">
              <div className="fallback-illustration">
                <CityIllustration />
              </div>
              <div className="map-fallback-message" role="status">
                <WifiOff size={22} />
                <strong>The city map couldn’t load</strong>
                <p>
                  Check your connection and WebGL support. You can still explore
                  every district below.
                </p>
                <button onClick={map.retry} className="button button-primary">
                  Try map again <RotateCcw size={14} />
                </button>
              </div>
            </div>
          )}
          {map.building && map.status === "ready" && (
            <div
              className="building-tooltip"
              role="status"
              style={{
                left: Math.max(
                  8,
                  Math.min(
                    map.building.x + 15,
                    (map.containerRef.current?.clientWidth ?? 400) - 218,
                  ),
                ),
                top: Math.max(
                  60,
                  Math.min(
                    map.building.y - 70,
                    (map.containerRef.current?.clientHeight ?? 480) - 100,
                  ),
                ),
              }}
            >
              <span>BUILDING DETAILS</span>
              <strong>{map.building.name}</strong>
              <p>
                {map.building.height
                  ? `${map.building.height.toFixed(0)} m mapped height`
                  : "Height not available"}
              </p>
              <small>OpenStreetMap building data</small>
            </div>
          )}
          <div className="map-instructions">
            <MousePointer2 size={13} />
            <span>
              Drag to explore <i>·</i> Scroll to zoom <i>·</i> Right-drag to
              rotate
            </span>
          </div>
        </div>
        <MapDistrictInfo
          district={displayDistrict}
          previewing={!!hoveredId && hoveredId !== selectedId}
          onFocus={() => {
            selectDistrict(displayDistrict.id);
            map.focusDistrict(displayDistrict.id);
          }}
        />
      </div>
      <div
        className="map-district-dock"
        role="group"
        aria-label="Explore a district"
      >
        {districts.map((district) => (
          <button
            key={district.id}
            onClick={() => {
              selectDistrict(district.id);
              map.focusDistrict(district.id);
            }}
            onMouseEnter={() => setHoveredId(district.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(district.id)}
            onBlur={() => setHoveredId(null)}
            aria-pressed={selectedId === district.id}
            style={
              {
                "--pin-color": districtLocations[district.id].color,
              } as CSSProperties
            }
          >
            <span className="dock-dot" />
            <span>{district.name}</span>
            <strong>{district.score.toFixed(1)}</strong>
          </button>
        ))}
      </div>
      <div className="map-caption">
        <span>
          <Compass size={13} /> Hover over buildings or district pins to
          discover more.
        </span>
        <span>
          District pins are approximate demo focus points, not boundaries.
        </span>
      </div>
    </section>
  );
}
