import { useRef, useEffect, useState, useCallback } from "react";

const W = window.innerWidth;
const H = window.innerHeight;
const BASE_CELL_SIZE = 40;

const X_SCALE_FACTOR = 0.5;

const LOCAL_STORAGE_KEY = "infiniteCanvasPaintedCells";

type PaintedCells = Record<string, string>;

interface PanOffset {
  x: number;
  y: number;
}

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const [paintedCells, setPaintedCells] = useState<PaintedCells>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as PaintedCells;
      }
    } catch (error) {
      console.error("Ошибка при загрузке из Local Storage:", error);
    }
    return {};
  });

  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [color, setColor] = useState("#ffffff");

  const getCellKey = (col: number, row: number) => `${col},${row}`;

  const handleClear = useCallback(() => {
    setPaintedCells({});
  }, []);

  const getCellCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const cellClickX = clientX - rect.left;
      const cellClickY = clientY - rect.top;

      const CELL_HEIGHT = BASE_CELL_SIZE * zoomLevel;
      const CELL_WIDTH = CELL_HEIGHT * X_SCALE_FACTOR;
      const offset = CELL_HEIGHT / 2;

      const clickX = cellClickX - panOffset.x;
      const clickY = cellClickY - panOffset.y;

      const col = Math.floor(clickX / CELL_WIDTH);

      const isEvenCol = col % 2 === 0;
      const yOffset = isEvenCol ? offset : 0;

      const adjustedY = clickY - yOffset;

      const row = Math.floor(adjustedY / CELL_HEIGHT);
      return getCellKey(col, row);
    },
    [zoomLevel, panOffset],
  );

  const paintCell = useCallback(
    (key: string) => {
      const normalizedColor = color.toLowerCase();

      setPaintedCells((prevCells) => {
        if (normalizedColor === "#ffffff") {
          const { [key]: deleted, ...cellsWithoutKey } = prevCells;
          console.log(deleted);
          return cellsWithoutKey;
        } else {
          return { ...prevCells, [key]: normalizedColor };
        }
      });
    },
    [color],
  );

  const eraseCell = useCallback((key: string) => {
    setPaintedCells((prevCells) => {
      if (prevCells[key]) {
        const { [key]: deleted, ...cellsWithoutKey } = prevCells;
        console.log(deleted);
        return cellsWithoutKey;
      }
      return prevCells;
    });
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      const cellKey = getCellCoordinates(event.clientX, event.clientY);
      if (!cellKey) return;

      if (event.button === 0) {
        setIsPainting(true);
        paintCell(cellKey);
      } else if (event.button === 2) {
        setIsErasing(true);
        eraseCell(cellKey);
      }
    },
    [getCellCoordinates, paintCell, eraseCell],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const cellKey = getCellCoordinates(event.clientX, event.clientY);
      if (!cellKey) return;

      if (isPainting) {
        paintCell(cellKey);
      } else if (isErasing) {
        eraseCell(cellKey);
      }
    },
    [isPainting, isErasing, getCellCoordinates, paintCell, eraseCell],
  );

  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    setIsErasing(false);
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
    },
    [],
  );

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

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLCanvasElement>) => {
      event.preventDefault();
    },
    [],
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
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [zoomLevel, handleMouseUp]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: "block",
          background: "#ffffff",
          userSelect: "none",
          touchAction: "none",
          cursor: isPainting
            ? `url('/brush.svg'), auto`
            : isErasing
              ? "crosshair"
              : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
      />
      <div className="absolute top-5 left-5 flex space-x-3 p-3 border border-black/10 backdrop-blur-[2px] bg-black/10 rounded-2xl shadow-[0_0_16px_rgba(0,0,0,0.1)] justify-center items-center">
        <div className="flex items-start flex-col">
          <p className="text-[12px] ml-[3px] translate-y-0.5">цвет</p>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border-black/10 rounded-2xl cursor-pointer"
          />
        </div>
        <button
          className="p-2 cursor-pointer rounded-2xl shadow-[0_0_6px_rgba(0,0,0,0.1)] font-bold border border-white/40 size-9"
          onClick={handleClear}
        >
          <img src="/clean.svg" className="size-full" />
        </button>
      </div>
    </>
  );
}
