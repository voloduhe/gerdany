import { useEffect, useState } from "react";

const ColorTextInput = ({
  initialValue,
  onConfirm,
}: {
  initialValue: string;
  onConfirm: (val: string) => void;
}) => {
  const [localVal, setLocalVal] = useState(initialValue);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onConfirm(localVal);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onKeyDown={handleKeyDown}
      className="text-[9px] mt-1 font-mono uppercase bg-transparent border-none text-center focus:outline-none focus:bg-white/20 rounded w-20 text-white"
      placeholder="Название"
    />
  );
};

export { ColorTextInput };
