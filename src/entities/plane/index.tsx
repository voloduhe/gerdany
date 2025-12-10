import { useState } from "react";
import { useAnimationFrame } from "../../shared/hooks/use-animation-frame";
import s from "./index.module.css";
import cn from "classnames";

const SPEED = 0.01;

function Plane() {
  const [value, setValue] = useState(0);

  const START_Y = 100;
  const END_Y = 25;
  const MOVE_RANGE = START_Y - END_Y;

  const { stop } = useAnimationFrame((deltaTime) => {
    setValue((prev) => {
      const newValue = prev + deltaTime * SPEED;

      if (newValue >= 100) {
        stop();
        return 100;
      }

      return newValue;
    });
  });

  const currentTranslateY = START_Y - (MOVE_RANGE * value) / 100;

  return (
    <div className="w-full bg-black flex items-end relative h-[200px] overflow-hidden">
      <img
        src="/round.svg"
        className={cn(
          "absolute left-[-190px] bottom-[-190px] opacity-10 scale-[3]",
          s.rotateAnimation,
        )}
      />
      <div className="h-32 relative origin-bottom -translate-x-3">
        <div
          className="origin-bottom w-[250px] h-32 px-3"
          style={{
            transform: `scaleY(${value / 100})`,
          }}
        >
          <img src="/trace.svg" className="w-[250px] h-32 translate-y-6" />
        </div>
        <div
          className="size-8 absolute right-0 top-0"
          style={{ transform: `translateY(${currentTranslateY}px)` }}
        >
          <div className="relative w-[38px]">
            <img src="/star.svg" className="absolute animate-ping" />
            <img src="/star.svg" className="absolute" />
          </div>
        </div>
      </div>
    </div>
  );
}

export { Plane };
