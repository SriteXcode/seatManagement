import React from "react";

export default function AiCompareLearnModal({
  show,
  setShow,
  learnData
}) {
  if (!show || !learnData) return null;

  const { metrics, summary, learnedRules } = learnData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-2xl w-full p-6 sm:p-8 animate-scaleIn text-left flex flex-col my-8">
        
        {/* Header */}
        <div className="relative rounded-2xl bg-gradient-to-r from-indigo-800 via-purple-800 to-red-800 text-white p-5 mb-6 shadow-md overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-inner border border-white/20">
                <i className="las la-brain"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  AI Layout Learning & Comparison
                </h3>
                <p className="text-xs text-purple-100 mt-0.5 font-medium">
                  Analyzed your manual reorganization vs generated layout & updated global memory!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer flex items-center justify-center"
            >
              <i className="las la-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Diff Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-purple-600 mb-0.5">Seat Swaps / Moves</div>
              <div className="text-xl font-extrabold text-purple-950">{metrics.totalMoved}</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Room Transfers</div>
              <div className="text-xl font-extrabold text-blue-950">{metrics.roomSwaps}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Seat Adjustments</div>
              <div className="text-xl font-extrabold text-emerald-950">{metrics.seatSwaps}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-600 mb-0.5">From Staging Bucket</div>
              <div className="text-xl font-extrabold text-amber-950">{metrics.unplacedToPlaced}</div>
            </div>
          </div>
        )}

        {/* Natural Language Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5 text-xs text-gray-700 leading-relaxed font-medium">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
            <i className="las la-search text-sm text-indigo-600"></i>
            Reorganization Comparison Summary
          </div>
          {summary}
        </div>

        {/* Learned Rules Extracted */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-100 rounded-2xl p-4 mb-6">
          <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i className="las la-check-double text-base text-purple-700"></i>
            Rules Learned & Applied to Global Memory ({learnedRules?.length || 0})
          </div>
          <div className="space-y-2">
            {learnedRules && learnedRules.length > 0 ? (
              learnedRules.map((ruleText, idx) => (
                <div key={idx} className="bg-white border border-purple-200/70 rounded-xl p-3 text-xs font-semibold text-gray-800 flex items-start gap-2 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{ruleText}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 font-medium">No specific rules were extracted from this minor adjustment.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-150 pt-4 mt-2">
          <span className="text-[11px] font-semibold text-gray-500">
            Rules are saved and will automatically optimize future seating runs.
          </span>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Done - Continue Work
          </button>
        </div>

      </div>
    </div>
  );
}
