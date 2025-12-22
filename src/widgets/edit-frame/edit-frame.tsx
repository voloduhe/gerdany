import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import type { ColorMap, PaintedCells, PanOffset } from "../../shared/types";
import { SchemePreview } from "../../entities/scheme-preview";
import { ColorTextInput } from "../../entities/color-text-input";

const W = window.innerWidth - 1;
const H = window.innerHeight - 1;
const BASE_CELL_SIZE = 40;

const X_SCALE_FACTOR = 0.5;

const LOCAL_STORAGE_KEY = "infiniteCanvasPaintedCells";
const COLOR_STORAGE_KEY = "infiniteCanvasBrushColor";
const BG_COLOR_STORAGE_KEY = "infiniteCanvasBgColor";

const DEFAULT_EMPTY_COLOR = "#bfbfbf";

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [bgColor, setBgColor] = useState(() => {
    return localStorage.getItem(BG_COLOR_STORAGE_KEY) || "#1a1a1a";
  });

  const [rangeValue, setRangeValue] = useState(1);

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
  const [color, setColor] = useState(() => {
    return localStorage.getItem(COLOR_STORAGE_KEY) || "#ff0000";
  });

  const uniqueColors = useMemo(() => {
    return Array.from(new Set(Object.values(paintedCells)));
  }, [paintedCells]);

  const [colorMap, setColorMap] = useState<ColorMap>({});

  useEffect(() => {
    localStorage.setItem(COLOR_STORAGE_KEY, color);
  }, [color]);

  useEffect(() => {
    localStorage.setItem(BG_COLOR_STORAGE_KEY, bgColor);
  }, [bgColor]);

  useEffect(() => {
    setColorMap((prev) => {
      const next = { ...prev };
      uniqueColors.forEach((c) => {
        if (!next[c]) next[c] = c;
      });
      return next;
    });
  }, [uniqueColors]);

  const updateColor = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "#ffffff") {
      setColor("#fcfcfc");
    } else {
      setColor(e.target.value);
    }
  };

  const getCellKey = (col: number, row: number) => `${col},${row}`;

  const loadPointsFromJson = useCallback(
    async (jsonUrl: string) => {
      try {
        const response = await fetch(jsonUrl);

        if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        const initialPoints: PaintedCells =
          (await response.json()) as PaintedCells;
        let allPoints: PaintedCells = { ...initialPoints };

        const NUM_COPIES = rangeValue;
        const SHIFT_AMOUNT = 4;

        for (let i = 0; i < NUM_COPIES; i++) {
          const totalShift = SHIFT_AMOUNT * (i + 1);
          const shiftedPoints: PaintedCells = {};

          for (const key in initialPoints) {
            if (Object.prototype.hasOwnProperty.call(initialPoints, key)) {
              const [xStr, yStr] = key.split(",");
              const x = Number(xStr);
              const y = Number(yStr);
              const newKey = `${x + totalShift},${y}`;
              shiftedPoints[newKey] = initialPoints[key];
            }
          }

          allPoints = { ...allPoints, ...shiftedPoints };
        }
        setPaintedCells(allPoints);
      } catch (error) {
        console.error(error);
      }
    },
    [rangeValue],
  );

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
        if (!prevCells[key]) {
          return prevCells;
        }

        if (normalizedColor === "#ffffff") {
          const { [key]: deleted, ...cellsWithoutKey } = prevCells;
          window.console.log(deleted);
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
        return { ...prevCells, [key]: DEFAULT_EMPTY_COLOR };
      }
      return prevCells;
    });
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      if (event.button === 1) {
        setIsPanning(true);
        lastMousePos.current = { x: event.clientX, y: event.clientY };
        return;
      }

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
      if (isPanning) {
        const dx = event.clientX - lastMousePos.current.x;
        const dy = event.clientY - lastMousePos.current.y;
        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: event.clientX, y: event.clientY };
        return;
      }

      const cellKey = getCellCoordinates(event.clientX, event.clientY);
      if (!cellKey) return;

      if (isPainting) {
        paintCell(cellKey);
      } else if (isErasing) {
        eraseCell(cellKey);
      }
    },
    [
      isPainting,
      isErasing,
      isPanning,
      getCellCoordinates,
      paintCell,
      eraseCell,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    setIsErasing(false);
    setIsPanning(false);
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
      currentMap: ColorMap,
    ) => {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(currentOffset.x, currentOffset.y);

      const CELL_HEIGHT = BASE_CELL_SIZE * currentZoom;
      const CELL_WIDTH = CELL_HEIGHT * X_SCALE_FACTOR;
      const offset = CELL_HEIGHT / 2;
      const radius = CELL_HEIGHT * 0.3;
      const drawStroke = currentZoom > 0.4;

      for (const key in cells) {
        const [col, row] = key.split(",").map(Number);
        const x = col * CELL_WIDTH;
        const yOffset = col % 2 === 0 ? offset : 0;
        const y = row * CELL_HEIGHT + yOffset;

        const centerX = x + CELL_WIDTH / 2;
        const centerY = y + CELL_HEIGHT / 2;

        const cellColor = cells[key];

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

        ctx.fillStyle = currentMap[cellColor] || cellColor;
        ctx.fill();

        if (drawStroke) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
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
    drawGrid(ctx, zoomLevel, paintedCells, panOffset, colorMap);
  }, [zoomLevel, paintedCells, panOffset, drawGrid, colorMap]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(paintedCells));
    } catch (error) {
      console.error("Ошибка при сохранении в Local Storage:", error);
    }
  }, [paintedCells]);

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
      const newZoom = Math.max(
        0.1,
        Math.min(oldZoom + direction * scaleFactor, 5.0),
      );
      const ratio = newZoom / oldZoom;

      setPanOffset((prev) => ({
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
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

  const SCHEMES = [
    { id: "scheme1", name: "Схема 1", url: "/patterns/scheme1.json" },
    { id: "scheme2", name: "Схема 2", url: "/patterns/scheme1.json" },
    { id: "scheme3", name: "Схема 3", url: "/patterns/scheme1.json" },
    { id: "scheme4", name: "Схема 4", url: "/patterns/scheme1.json" },
    { id: "scheme5", name: "Схема 5", url: "/patterns/scheme1.json" },
    { id: "scheme63", name: "Схема 6", url: "/patterns/scheme1.json" },
    { id: "scheme32", name: "Схема 3", url: "/patterns/scheme1.json" },
    { id: "scheme45", name: "Схема 4", url: "/patterns/scheme1.json" },
    { id: "scheme56", name: "Схема 5", url: "/patterns/scheme1.json" },
    { id: "scheme67", name: "Схема 6", url: "/patterns/scheme1.json" },
  ];

  return (
    <>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: "block",
          background: bgColor,
          userSelect: "none",
          touchAction: "none",
          cursor: isPanning ? "grabbing" : isPainting ? "crosshair" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      <div className="absolute top-5 right-5 flex flex-col w-56 border border-black/10 backdrop-blur-[2px] bg-white/10 rounded-2xl shadow-[0_0_16px_rgba(0,0,0,0.1)] text-white overflow-hidden">
        <div className="p-3 border-b border-white/10 bg-white/5">
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
            Доступные схемы
          </p>
        </div>
        {/*схемы*/}
        <div
          className="flex flex-col overflow-y-auto max-h-[200px] p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-700 [&::-webkit-scrollbar-thumb]:bg-neutral-500
          "
        >
          {SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              className="flex items-center justify-between p-3 mb-1 text-left transition-all rounded-xl hover:bg-white/20 active:scale-[0.98] group border border-transparent hover:border-white/10"
              onClick={() => {
                const confirmLoad = window.confirm(
                  `Загрузить "${scheme.name}"? Текущий рисунок будет удален.`,
                );
                if (confirmLoad) {
                  loadPointsFromJson(scheme.url);
                }
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{scheme.name}</span>
                <span className="text-[9px] opacity-40 font-mono italic">
                  .json
                </span>
              </div>
              <SchemePreview url={scheme.url} />
            </button>
          ))}
        </div>
      </div>
      <div className="absolute top-5 left-5 flex flex-col space-y-3 p-3 border border-black/10 backdrop-blur-[2px] bg-white/10 rounded-2xl shadow-[0_0_16px_rgba(0,0,0,0.1)] text-white">
        <div className="flex space-x-3 items-center">
          <div className="flex items-start flex-col">
            <p className="text-[10px] ml-[3px] opacity-60">кисть</p>
            <input
              type="color"
              value={color}
              onChange={updateColor}
              className="border-white/10 rounded-lg cursor-pointer size-8"
            />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] opacity-60 mb-4">копии: {rangeValue}</p>
            <input
              type="range"
              value={rangeValue}
              onChange={(e) => setRangeValue(Number(e.target.value))}
              min={0}
              max={40}
            />
          </div>
        </div>
        {uniqueColors.length > 0 && (
          <div className="flex flex-col border-t border-black/5 pt-2">
            <p className="text-[10px] font-bold opacity-60 mb-2 uppercase tracking-wider">
              Цвета в проекте:
            </p>
            <div className="flex flex-wrap gap-2 max-w-[300px]">
              {uniqueColors.map((uColor) => (
                <div
                  onMouseUp={() => {
                    if ((colorMap[uColor] || uColor) === "#ffffff") {
                      setColor("#fcfcfc");
                    } else {
                      setColor(colorMap[uColor] || uColor);
                    }
                  }}
                  key={uColor}
                  className="flex flex-col items-center bg-white/10 p-1 rounded-lg border border-white/20"
                >
                  <input
                    type="color"
                    value={colorMap[uColor] || uColor}
                    onChange={(e) =>
                      setColorMap((prev) => ({
                        ...prev,
                        [uColor]: e.target.value,
                      }))
                    }
                    className="size-6 cursor-pointer rounded-md border-none"
                  />
                  <ColorTextInput
                    initialValue={colorMap[uColor] || uColor}
                    onConfirm={(newColor) => {
                      setColorMap((prev) => ({
                        ...prev,
                        [uColor]: newColor,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-start flex-col">
          <p className="text-[10px] ml-[3px] opacity-60">фон</p>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="border-white/10 rounded-lg cursor-pointer size-8"
          />
        </div>
      </div>
    </>
  );
}
