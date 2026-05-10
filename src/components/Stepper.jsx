import React from "react";

export default function Stepper({ currentStep }) {
  const stepIndex = { welcome: 0, code: 1, login: 2, success: 3 }[currentStep];

  return (
    <div className="flex justify-center items-center gap-2 mb-10 flex-wrap">
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <div
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all",
              stepIndex === i
                ? "bg-pcamp-pink border-pcamp-pink text-white shadow-[0_0_20px_var(--accent-glow)]"
                : stepIndex > i
                  ? "bg-transparent border-pcamp-pink text-pcamp-pink"
                  : "bg-transparent border-white/20 text-white/45",
            ].join(" ")}
          >
            {stepIndex > i ? "✓" : i + 1}
          </div>
          {i < 3 && (
            <div
              className={[
                "w-8 h-[2px] transition-colors",
                stepIndex > i ? "bg-pcamp-pink" : "bg-white/20",
              ].join(" ")}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
