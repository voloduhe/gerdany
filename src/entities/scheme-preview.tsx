import { useEffect, useRef } from "react";
import type { PaintedCells } from "../shared/types";

const X_SCALE_FACTOR = 0.5;

const SchemePreview = ({ url }: { url: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const drawPreview = async () => {
      try {
        const response = await fetch(url);
        const data: PaintedCells = await response.json();
        const canvas = canvasRef.current;
        if (!canvas || !data) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const keys = Object.keys(data);
        if (keys.length === 0) return;

        const coords = keys.map((k) => k.split(",").map(Number));

        const physicalPoints = coords.map(([col, row]) => {
          const x = col * X_SCALE_FACTOR;
          const yOffset = col % 2 === 0 ? 0.5 : 0;
          const y = row + yOffset;
          return { x, y };
        });

        const minX = Math.min(...physicalPoints.map((p) => p.x));
        const maxX = Math.max(...physicalPoints.map((p) => p.x));
        const minY = Math.min(...physicalPoints.map((p) => p.y));
        const maxY = Math.max(...physicalPoints.map((p) => p.y));

        const contentW = maxX - minX;
        const contentH = maxY - minY;

        const size = 60;
        const padding = 6;
        const availableSize = size - padding * 2;

        const scale = availableSize / Math.max(contentW || 1, contentH || 1);

        ctx.clearRect(0, 0, size, size);

        keys.forEach((key) => {
          const [col, row] = key.split(",").map(Number);

          const xBase = col * X_SCALE_FACTOR;
          const yOffset = col % 2 === 0 ? 0.5 : 0;
          const yBase = row + yOffset;

          const drawX =
            padding +
            (xBase - minX) * scale +
            (availableSize - contentW * scale) / 2;
          const drawY =
            padding +
            (yBase - minY) * scale +
            (availableSize - contentH * scale) / 2;

          const radius = scale * 0.3;

          ctx.beginPath();
          ctx.arc(
            drawX + (X_SCALE_FACTOR * scale) / 2,
            drawY + scale / 2,
            radius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = data[key];
          ctx.fill();
        });
      } catch (e) {
        console.error("Preview error", e);
      }
    };
    drawPreview();
  }, [url]);

  return <canvas ref={canvasRef} width={60} height={60} />;
};

export { SchemePreview };
