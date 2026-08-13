"use client";

interface ProgressBarProps {
  activeIndex: number;
}

export function ProgressBar({ activeIndex }: ProgressBarProps) {
  return (
    <div
      className="flex gap-1.5 w-full max-w-lg mx-auto"
      role="progressbar"
      aria-valuenow={Math.min(activeIndex + 1, 5)}
      aria-valuemin={1}
      aria-valuemax={5}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800"
        >
          <div
            className={`h-full bg-sky-500 rounded-full transition-all duration-300 ease-out ${
              i <= activeIndex ? "w-full" : "w-0"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
