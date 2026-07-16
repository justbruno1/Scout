"use client";

import { useMemo } from "react";

interface Point {
  key: string;
  rotY: number; // deg, longitude
  rotX: number; // deg, latitude
  size: number;
  opacity: number;
}

/**
 * Builds a latitude/longitude dot grid (fewer points per ring near the
 * poles, like a globe graticule) — the same structure as the reference
 * sphere image, just reproduced with real geometry instead of a raster
 * asset so it stays crisp and recolors cleanly.
 */
function useSpherePoints(latBands: number, maxPerRing: number): Point[] {
  return useMemo(() => {
    const points: Point[] = [];
    for (let i = 0; i <= latBands; i++) {
      const lat = -90 + (180 * i) / latBands; // -90..90
      const latRad = (lat * Math.PI) / 180;
      const ringScale = Math.cos(latRad); // fewer points near poles
      const count = Math.max(3, Math.round(maxPerRing * ringScale));
      for (let j = 0; j < count; j++) {
        const lon = (360 * j) / count;
        const distFromEquator = Math.abs(lat) / 90;
        points.push({
          key: `${i}-${j}`,
          rotY: lon,
          rotX: lat,
          size: 2.2 - distFromEquator * 0.8,
          opacity: 0.35 + ringScale * 0.55,
        });
      }
    }
    return points;
  }, [latBands, maxPerRing]);
}

export function NeuralSphere({ size = 150 }: { size?: number }) {
  const points = useSpherePoints(11, 26);
  const radius = size / 2;

  return (
    <div
      aria-hidden
      className="pointer-events-none select-none"
      style={{
        width: size,
        height: size,
        perspective: size * 5,
        opacity: 0.5,
        filter: "drop-shadow(0 0 14px rgba(200,255,61,0.25))",
      }}
    >
      <div
        className="scout-sphere"
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {points.map((p) => (
          <span
            key={p.key}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              borderRadius: "9999px",
              background: "#C8FF3D",
              opacity: p.opacity,
              transform: `rotateY(${p.rotY}deg) rotateX(${p.rotX}deg) translateZ(${radius}px)`,
              transformStyle: "preserve-3d",
            }}
          />
        ))}
      </div>
    </div>
  );
}
