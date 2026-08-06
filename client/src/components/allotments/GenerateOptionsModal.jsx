import React, { useState } from "react";

export default function GenerateOptionsModal({
  show,
  setShow,
  onConfirm,
  initialArrangementMode = "loose",
  initialPatternMode = "scrambled",
  title,
  submitText
}) {
  const [arrangementMode, setArrangementMode] = useState(initialArrangementMode);
  const [patternMode, setPatternMode] = useState(initialPatternMode);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ arrangementMode, patternMode });
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full p-6 animate-scaleIn text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <i className="las la-cogs text-xl text-red-700"></i>
              {title || "Select Allotment Generation Strategy"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Choose seating arrangement density and distribution pattern before proceeding.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-all focus:outline-none cursor-pointer flex items-center justify-center"
          >
            <i className="las la-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto flex-1 pr-1">
          {/* Section 1: Arrangement Density */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
              1. Arrangement Density (Empty Seat Policy)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Loose Option */}
              <div
                onClick={() => setArrangementMode("loose")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  arrangementMode === "loose"
                    ? "border-red-600 bg-red-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <i className="las la-compress-arrows-alt text-base text-red-700"></i>
                    Loose Arrangement
                  </span>
                  <input
                    type="radio"
                    name="arrangementMode"
                    value="loose"
                    checked={arrangementMode === "loose"}
                    onChange={() => setArrangementMode("loose")}
                    className="text-red-700 focus:ring-red-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  <strong>Does NOT leave empty spaces unnecessarily.</strong> Fills seats continuously while maintaining maximum possible distance between students of the same class/subject.
                </p>
                <span className="inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-green-100 text-green-800">
                  Full Capacity
                </span>
              </div>

              {/* Strict Option */}
              <div
                onClick={() => setArrangementMode("strict")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  arrangementMode === "strict"
                    ? "border-red-600 bg-red-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <i className="las la-shield-alt text-base text-red-700"></i>
                    Strict Arrangement
                  </span>
                  <input
                    type="radio"
                    name="arrangementMode"
                    value="strict"
                    checked={arrangementMode === "strict"}
                    onChange={() => setArrangementMode("strict")}
                    className="text-red-700 focus:ring-red-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  <strong>Leaves empty spaces / seats IF required.</strong> If students of the same class or subject would get together, empty seats are left to strictly enforce separation.
                </p>
                <span className="inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Strict Distance Gaps
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Placement Pattern */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
              2. Distribution Pattern
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Scrambled Option */}
              <div
                onClick={() => setPatternMode("scrambled")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  patternMode === "scrambled"
                    ? "border-red-600 bg-red-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <i className="las la-chess-king text-base text-red-700"></i>
                    Scrambled (King's Move)
                  </span>
                  <input
                    type="radio"
                    name="patternMode"
                    value="scrambled"
                    checked={patternMode === "scrambled"}
                    onChange={() => setPatternMode("scrambled")}
                    className="text-red-700 focus:ring-red-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  Students are <strong>randomly spread</strong> across seats. Enforces a <strong>1-cell distance in all 8 directions</strong> (like a King in Chess) so no same-class student comes near.
                </p>
                <span className="inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  8-Direction Chess Spread
                </span>
              </div>

              {/* Linear Option */}
              <div
                onClick={() => setPatternMode("linear")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  patternMode === "linear"
                    ? "border-red-600 bg-red-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <i className="las la-stream text-base text-red-700"></i>
                    Linear (Column-by-Column)
                  </span>
                  <input
                    type="radio"
                    name="patternMode"
                    value="linear"
                    checked={patternMode === "linear"}
                    onChange={() => setPatternMode("linear")}
                    className="text-red-700 focus:ring-red-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  Fills room <strong>column by column</strong>. Each column is assigned one class. Two consecutive columns will <strong>never contain students of the same class/subject</strong>.
                </p>
                <span className="inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Column Interleaved
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-150 pt-4 mt-2 shrink-0">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <i className="las la-play text-sm"></i>
              {submitText || "Generate Allotment Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
