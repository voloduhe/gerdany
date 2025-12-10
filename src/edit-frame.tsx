import { useRef, useEffect, useState, useCallback } from "react";

const W = window.innerWidth;
const H = window.innerHeight;
const BASE_CELL_SIZE = 40;

const X_SCALE_FACTOR = 0.5;

// Определяем ключ, по которому данные будут храниться в Local Storage
const LOCAL_STORAGE_KEY = "infiniteCanvasPaintedCells";

type PaintedCells = Record<string, string>;

interface PanOffset {
  x: number;
  y: number;
}

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // 1. ЗАГРУЗКА ИЗ LOCAL STORAGE
  // Используем функцию-инициализатор в useState, чтобы загрузить сохраненные данные
  const [paintedCells, setPaintedCells] = useState<PaintedCells>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        // Парсим строку JSON обратно в объект
        return JSON.parse(saved) as PaintedCells;
      }
    } catch (error) {
      console.error("Ошибка при загрузке из Local Storage:", error);
      // Если Local Storage недоступен или данные повреждены, возвращаем пустой объект
    }
    return {};
  });

  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [color, setColor] = useState("#ffffff");

  const getCellKey = (col: number, row: number) => `${col},${row}`;

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      currentZoom: number,
      cells: PaintedCells,
      currentOffset: PanOffset,
    ) => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.lineCap = "square";

      ctx.save();
      ctx.translate(currentOffset.x, currentOffset.y);

      const CELL_HEIGHT = BASE_CELL_SIZE * currentZoom;
      const CELL_WIDTH = CELL_HEIGHT * X_SCALE_FACTOR;
      const offset = CELL_HEIGHT / 2;

      const radius = CELL_HEIGHT * 0.3;

      const drawStroke = currentZoom > 0.4;

      const startCol = Math.floor(-currentOffset.x / CELL_WIDTH);
      const startRow = Math.floor(-currentOffset.y / CELL_HEIGHT);

      const endCol = Math.ceil((W - currentOffset.x) / CELL_WIDTH) + 1;
      const endRow = Math.ceil((H - currentOffset.y) / CELL_HEIGHT) + 1;

      for (let col = startCol; col <= endCol; col++) {
        const x = col * CELL_WIDTH;

        const isEvenCol = col % 2 === 0;
        const yOffset = isEvenCol ? offset : 0;

        for (let row = startRow; row <= endRow; row++) {
          const y = row * CELL_HEIGHT;

          const centerX = x + CELL_WIDTH / 2;
          const centerY = y + yOffset + CELL_HEIGHT / 2;

          const key = getCellKey(col, row);
          const cellColor = cells[key];

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

          if (cellColor) {
            ctx.fillStyle = cellColor;
          } else {
            ctx.fillStyle = "white";
          }
          ctx.fill();

          if (drawStroke) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx, zoomLevel, paintedCells, panOffset);
  }, [zoomLevel, paintedCells, panOffset, drawGrid]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(paintedCells));
    } catch (error) {
      console.error("Ошибка при сохранении в Local Storage:", error);
    }
  }, [paintedCells]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      const CELL_HEIGHT = BASE_CELL_SIZE * zoomLevel;
      const CELL_WIDTH = CELL_HEIGHT * X_SCALE_FACTOR;
      const offset = CELL_HEIGHT / 2;

      const clickX = clientX - panOffset.x;
      const clickY = clientY - panOffset.y;

      const col = Math.floor(clickX / CELL_WIDTH);

      const isEvenCol = col % 2 === 0;
      const yOffset = isEvenCol ? offset : 0;

      const adjustedY = clickY - yOffset;

      const row = Math.floor(adjustedY / CELL_HEIGHT);

      const key = getCellKey(col, row);

      setPaintedCells((prevCells) => {
        const newCells = { ...prevCells };
        if (newCells[key]) {
          delete newCells[key];
        } else {
          newCells[key] = color;
        }
        return newCells;
      });
    },
    [zoomLevel, panOffset, color],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const oldZoom = zoomLevel;
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const scaleFactor = 0.1;
      const direction = event.deltaY < 0 ? 1 : -1;
      let newZoom = oldZoom + direction * scaleFactor;
      newZoom = Math.max(0.1, Math.min(newZoom, 5.0));

      const ratio = newZoom / oldZoom;

      setPanOffset((prevOffset) => ({
        x: mouseX - (mouseX - prevOffset.x) * ratio,
        y: mouseY - (mouseY - prevOffset.y) * ratio,
      }));

      setZoomLevel(newZoom);
    };

    canvas.addEventListener("wheel", handleWheel);
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [zoomLevel]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: "block", background: "#ffffff" }}
        onClick={handleCanvasClick}
      />
      <input
        className="absolute top-5 left-5"
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      ></input>
    </>
  );
}
