import React, { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function AiAssistantModal({
  show,
  setShow,
  deptSemCombinations = [],
  examType = "College",
  rooms = [],
  token,
  onApplyStrategy
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState("");
  
  // Feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Learned rules state
  const [learnedRules, setLearnedRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);

  useEffect(() => {
    if (show) {
      fetchAiSuggestions();
      fetchLearnedRules();
    }
  }, [show]);

  const fetchAiSuggestions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAiSuggestions({
        deptSemCombinations,
        examType,
        selectedRoomIds: rooms.map(r => r._id)
      }, token);
      setSuggestions(data);
    } catch (err) {
      setError(err.message || "Failed to fetch AI seating suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLearnedRules = async () => {
    setLoadingRules(true);
    try {
      const rules = await api.getLearnedRules(token);
      setLearnedRules(rules || []);
    } catch (err) {
      console.error("Failed to load learned rules:", err);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackComment.trim() && !rating) return;
    setSubmittingFeedback(true);
    setFeedbackSuccess("");
    try {
      await api.submitAiFeedback({
        rating,
        comment: feedbackComment.trim()
      }, token);
      setFeedbackSuccess("Thank you! Your feedback has been saved to the AI global memory.");
      setFeedbackComment("");
      // Refresh learned rules and AI recommendations with new feedback incorporated!
      await fetchLearnedRules();
      await fetchAiSuggestions();
    } catch (err) {
      setError(err.message || "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.deleteLearnedRule(ruleId, token);
      setLearnedRules(prev => prev.filter(r => r._id !== ruleId));
      fetchAiSuggestions();
    } catch (err) {
      alert("Failed to delete rule: " + err.message);
    }
  };

  const handleApply = () => {
    if (!suggestions || !suggestions.recommendations) return;
    onApplyStrategy(suggestions.recommendations);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 max-w-3xl w-full p-6 sm:p-8 animate-scaleIn text-left flex flex-col my-8 max-h-[90vh]">
        
        {/* Header with AI gradient background */}
        <div className="relative rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-800 to-red-800 text-white p-5 mb-6 shadow-md overflow-hidden shrink-0">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-inner border border-white/20">
                <i className="las la-robot"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  AI Allotment & Space Optimization Advisor
                  <span className="text-[10px] uppercase font-bold bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full shadow-sm">
                    Global Learning Enabled
                  </span>
                </h3>
                <p className="text-xs text-purple-100 mt-0.5 font-medium">
                  Analyzes seating capacity, student density & persistent user feedback to maximize room utility.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer border border-white/10 flex items-center justify-center"
            >
              <i className="las la-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-700">Analyzing room capacities & global learning memory...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={fetchAiSuggestions}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : suggestions ? (
            <>
              {/* Space Optimization Metrics Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="las la-chart-pie text-base text-purple-600"></i>
                    Space Efficiency & Capacity Analysis
                  </h4>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                    {suggestions.spaceMetrics.spaceEfficiencyScore}% Capacity Efficiency
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-purple-600 mb-0.5">Students To Seat</div>
                    <div className="text-xl font-extrabold text-purple-950">{suggestions.spaceMetrics.totalStudents}</div>
                  </div>
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Allocated Capacity</div>
                    <div className="text-xl font-extrabold text-blue-950">{suggestions.spaceMetrics.allocatedSeats}</div>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Rooms Selected</div>
                    <div className="text-xl font-extrabold text-emerald-950">
                      {suggestions.spaceMetrics.selectedRoomCount} / {suggestions.spaceMetrics.totalRoomCount}
                    </div>
                  </div>
                  <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5 text-center">
                    <div className="text-[10px] uppercase font-bold text-amber-600 mb-0.5">Unused Empty Seats</div>
                    <div className="text-xl font-extrabold text-amber-950">{suggestions.spaceMetrics.wastedSeatCount}</div>
                  </div>
                </div>
              </div>

              {/* Recommended Strategy Details */}
              <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 border border-purple-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="las la-magic text-base text-purple-600"></i>
                    AI Recommended Seating Strategy
                  </h4>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-purple-100 text-purple-800">
                    {suggestions.isAiGenerated ? "Gemini LLM Optimized" : "Smart Rule Engine"}
                  </span>
                </div>

                {/* Strategy Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Density Policy</div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-gray-800 capitalize">
                        {suggestions.recommendations.arrangementMode} Mode
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        suggestions.recommendations.arrangementMode === "loose" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {suggestions.recommendations.arrangementMode === "loose" ? "Max Capacity" : "Empty Distance Gaps"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Distribution Pattern</div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-gray-800 capitalize">
                        {suggestions.recommendations.patternMode} Pattern
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        suggestions.recommendations.patternMode === "linear" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {suggestions.recommendations.patternMode === "linear" ? "Column Interleaved" : "Left/Right Separation"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning Narrative */}
                <div className="bg-white/80 border border-purple-100 rounded-xl p-3.5 text-xs text-gray-700 whitespace-pre-line leading-relaxed font-medium">
                  {suggestions.aiReasoning}
                </div>

                {/* Applied Learned Rules Banner */}
                {suggestions.learnedRulesApplied && suggestions.learnedRulesApplied.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 font-semibold space-y-1">
                    {suggestions.learnedRulesApplied.map((ruleText, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <i className="las la-check-circle text-amber-700 text-sm"></i>
                        <span>{ruleText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button: Apply AI Strategy */}
              <button
                type="button"
                onClick={handleApply}
                className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-red-700 hover:from-purple-800 hover:to-red-800 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <i className="las la-rocket text-lg"></i>
                Apply AI Strategy & Generate Allotment Now
              </button>

              {/* Section: Global Learning & User Feedback */}
              <div className="border-t border-gray-150 pt-5 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="las la-brain text-base text-purple-600"></i>
                      Global Learning & Feedback Loop
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Train the AI by giving suggestions. Approved rules apply globally across future runs!
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {learnedRules.length} Active Global Rule(s)
                  </span>
                </div>

                {/* Feedback Submission Form */}
                <form onSubmit={handleSubmitFeedback} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 mb-4">
                  {feedbackSuccess && (
                    <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <i className="las la-check-circle text-base text-green-700"></i>
                      {feedbackSuccess}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Rate AI Recommendation:</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`text-lg transition-transform hover:scale-110 cursor-pointer ${
                            star <= rating ? "text-amber-400" : "text-gray-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Give a suggestion or preference (e.g., 'Prefer linear pattern for CS subjects', 'Use strict mode for large exams', 'Always put Commerce in Room 101')..."
                      className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingFeedback || (!feedbackComment.trim() && !rating)}
                      className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="las la-paper-plane text-sm"></i>
                      {submittingFeedback ? "Saving to AI Memory..." : "Save Preference to AI Memory"}
                    </button>
                  </div>
                </form>

                {/* Currently Active Learned Rules List */}
                {learnedRules.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                      Active Global Preference Rules:
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {learnedRules.map((rule) => (
                        <div
                          key={rule._id}
                          className="p-3 bg-white border border-purple-100 rounded-xl flex items-center justify-between text-xs shadow-2xs hover:border-purple-300 transition-all"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-gray-800 truncate">
                              {rule.description}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Rule Key: <span className="font-mono text-purple-700">{rule.ruleKey}</span> • Added {new Date(rule.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule._id)}
                            className="text-gray-400 hover:text-red-600 bg-gray-100 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                            title="Remove this global rule"
                          >
                            <i className="las la-trash text-base"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-150 pt-4 mt-4 shrink-0">
          <span className="text-[11px] font-semibold text-gray-500">
            Powered by Antigravity AI Engine
          </span>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
