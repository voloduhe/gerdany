import cn from "classnames";
import s from "./index.module.css";

function XLines({ className }: { className?: string }) {
  const totalUnits = 900;
  const arr = Array.from(Array(totalUnits).keys());
  const step = 5;

  return (
    <div className={cn("flex flex-col space-y-3", s.goUpAnimation, className)}>
      {[...arr].reverse().map((item) => {
        const value = item + 1;

        const isMajorLine = value % step === 0;

        const lineWidth = isMajorLine ? "w-2" : "w-1";

        return (
          <div key={value} className="flex space-x-1 items-center justify-end">
            <p
              className={cn(
                "text-white text-xs",

                !isMajorLine && "opacity-0 text-[6px]",
              )}
            >
              {isMajorLine ? value : <>&nbsp;</>}
            </p>
            <div className={cn("h-px bg-white", lineWidth)} />
          </div>
        );
      })}
    </div>
  );
}

export { XLines };
