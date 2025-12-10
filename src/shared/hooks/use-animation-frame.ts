import { useEffect, useRef } from "react";

function useAnimationFrame(callback: (delta: number) => void) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  function animate(time: number) {
    if (previousTimeRef.current) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }

  const stop = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      stop();
    };
  }, []);

  return { stop };
}

export { useAnimationFrame };
