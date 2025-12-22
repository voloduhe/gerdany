// import {
//   useRef,
//   useEffect,
//   useState,
//   useCallback,
//   useMemo,
//   type ChangeEvent,
// } from "react";
// import type { ColorMap, PaintedCells, PanOffset } from "../../shared/types";
// import { SchemePreview } from "../../entities/scheme-preview";
// import { ColorTextInput } from "../../entities/color-text-input";

// const W = window.innerWidth - 1;
// const H = window.innerHeight - 1;
// const BASE_CELL_SIZE = 40;
// const X_SCALE_FACTOR = 0.5;
// const COLOR_STORAGE_KEY = "infiniteCanvasBrushColor";
// const BG_COLOR_STORAGE_KEY = "infiniteCanvasBgColor";
// const DEFAULT_EMPTY_COLOR = "#bfbfbf";

// export function InfiniteCanvas() {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [zoomLevel, setZoomLevel] = useState(1.0);
//   const [isPainting, setIsPainting] = useState(false);
//   const [isErasing, setIsErasing] = useState(false);
//   const [isPanning, setIsPanning] = useState(false);
//   const lastMousePos = useRef({ x: 0, y: 0 });
//   const [bgColor, setBgColor] = useState(
//     () => localStorage.getItem(BG_COLOR_STORAGE_KEY) || "#1a1a1a",
//   );

//   // --- НОВЫЕ СОСТОЯНИЯ ДЛЯ ШАГОВ ---
//   const [steps, setSteps] = useState<PaintedCells[]>([]); // Массив шагов [[dot], [dot]]
//   const [currentStepIndex, setCurrentStepIndex] = useState(0);

//   // Вычисляемые активные точки (сумма всех шагов до текущего)
//   const paintedCells = useMemo(() => {
//     const merged: PaintedCells = {};
//     for (let i = 0; i <= currentStepIndex; i++) {
//       if (steps[i]) {
//         Object.assign(merged, steps[i]);
//       }
//     }
//     return merged;
//   }, [steps, currentStepIndex]);

//   const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
//   const [color, setColor] = useState(
//     () => localStorage.getItem(COLOR_STORAGE_KEY) || "#ff0000",
//   );

//   const uniqueColors = useMemo(
//     () => Array.from(new Set(Object.values(paintedCells))),
//     [paintedCells],
//   );
//   const [colorMap, setColorMap] = useState<ColorMap>({});

//   // Загрузка JSON теперь ожидает формат [[{...}], [{...}]]
//   const loadPointsFromJson = useCallback(async (jsonUrl: string) => {
//     try {
//       const response = await fetch(jsonUrl);
//       if (!response.ok) throw new Error(`${response.status}`);

//       const data = await response.json();

//       // Проверяем, массив это или одиночный объект
//       const incomingSteps = Array.isArray(data) ? data : [data];

//       setSteps(incomingSteps);
//       setCurrentStepIndex(0); // Начинаем с первого шага
//     } catch (error) {
//       console.error("Ошибка загрузки схемы:", error);
//     }
//   }, []);

//   // Отрисовка (остается почти такой же, так как использует useMemo-переменную paintedCells)
//   const drawGrid = useCallback(
//     (
//       ctx: CanvasRenderingContext2D,
//       currentZoom: number,
//       cells: PaintedCells,
//       currentOffset: PanOffset,
//       currentMap: ColorMap,
//     ) => {
//       ctx.clearRect(0, 0, W, H);
//       ctx.save();
//       ctx.translate(currentOffset.x, currentOffset.y);

//       const CELL_HEIGHT = BASE_CELL_SIZE * currentZoom;
//       const CELL_WIDTH = CELL_HEIGHT * X_SCALE_FACTOR;
//       const offset = CELL_HEIGHT / 2;
//       const radius = CELL_HEIGHT * 0.3;

//       for (const key in cells) {
//         const [col, row] = key.split(",").map(Number);
//         const x = col * CELL_WIDTH;
//         const yOffset = col % 2 === 0 ? offset : 0;
//         const y = row * CELL_HEIGHT + yOffset;

//         ctx.beginPath();
//         ctx.arc(
//           x + CELL_WIDTH / 2,
//           y + CELL_HEIGHT / 2,
//           radius,
//           0,
//           2 * Math.PI,
//         );
//         ctx.fillStyle = currentMap[cells[key]] || cells[key];
//         ctx.fill();
//       }
//       ctx.restore();
//     },
//     [],
//   );

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const ctx = canvas?.getContext("2d");
//     if (ctx) drawGrid(ctx, zoomLevel, paintedCells, panOffset, colorMap);
//   }, [zoomLevel, paintedCells, panOffset, drawGrid, colorMap]);

//   // Управление шагами
//   const nextStep = () =>
//     setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
//   const prevStep = () => setCurrentStepIndex((prev) => Math.max(0, prev - 1));

//   return (
//     <>
//       <canvas
//         ref={canvasRef}
//         width={W}
//         height={H}
//         className="block touch-none"
//         style={{ background: bgColor }}
//       />

//       {/* ПАНЕЛЬ УПРАВЛЕНИЯ ШАГАМИ */}
//       {steps.length > 0 && (
//         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-2xl">
//           <button
//             onClick={prevStep}
//             disabled={currentStepIndex === 0}
//             className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-30 transition-all"
//           >
//             ← Назад
//           </button>

//           <div className="flex flex-col items-center min-w-[100px]">
//             <span className="text-xs opacity-60 uppercase font-bold tracking-tighter">
//               Шаг
//             </span>
//             <span className="text-xl font-mono">
//               {currentStepIndex + 1} / {steps.length}
//             </span>
//           </div>

//           <button
//             onClick={nextStep}
//             disabled={currentStepIndex === steps.length - 1}
//             className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-30 transition-all"
//           >
//             Вперед →
//           </button>
//         </div>
//       )}

//       {/* Твоя правая панель со списком схем */}
//       <div className="absolute top-5 right-5 flex flex-col w-56 border border-black/10 backdrop-blur-[2px] bg-white/10 rounded-2xl shadow-[0_0_16px_rgba(0,0,0,0.1)] text-white overflow-hidden">
//         <div className="p-3 border-b border-white/10 bg-white/5 uppercase text-[10px] font-bold opacity-60">
//           Схемы
//         </div>
//         <div className="flex flex-col overflow-y-auto max-h-[400px] p-2">
//           {/* Сюда можно добавить SCHEMES.map как в твоем коде */}
//           <button
//             className="p-3 text-sm hover:bg-white/10 rounded-xl transition-all"
//             onClick={() => loadPointsFromJson("/path-to-your-json.json")}
//           >
//             Загрузить пошаговую схему
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }

// TEST FORMAT FOR DOTS
// [
//   { "22,3": "#bfbfbf", "21,4": "#bfbfbf" },
//   { "20,4": "#bfbfbf", "19,5": "#bfbfbf" },
//   { "20,5": "#bfbfbf", "24,3": "#bfbfbf" }
// ]
