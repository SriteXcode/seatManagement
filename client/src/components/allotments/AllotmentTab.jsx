import React from "react";
import FilterControls from "./FilterControls";
import { getDeptColor, getSeatLabel, decodeToken } from "../../utils/helpers";
import CustomSelect from "../common/CustomSelect";

export default function AllotmentTab({
  userRole,
  selectedExamType,
  setSelectedExamType,
  uniqueExamTypes,
  date,
  setDate,
  time,
  setTime,
  shift,
  setShift,
  seed,
  setSeed,
  useDistancing,
  setUseDistancing,
  isLayoutSettingsLocked,
  setIsLayoutSettingsLocked,
  setShowDistancingModal,
  selectedDept,
  setSelectedDept,
  selectedSem,
  setSelectedSem,
  selectedComboSubject,
  setSelectedComboSubject,
  meta,
  addDeptSemCombination,
  removeDeptSemCombination,
  deptSemCombinations,
  generate,
  downloadCSV,
  downloadRoomGrid,
  schedules,
  examConfigs,
  activeConfig,
  selectedScheduleCombos,
  saveToLibrary,
  regenerateSchedule,
  comments,
  newCommentText,
  setNewCommentText,
  addComment,
  isSaving,
  showBucketSidebar,
  setShowBucketSidebar,
  bucket,
  filters,
  setFilters,
  rooms,
  allotments,
  invigAssignments,
  gridForRoom,
  getFieldLabel,
  isDraggingStudent,
  dragOverSeatKey,
  setDragOverSeatKey,
  handleDragStartSeat,
  handleDropOnSeat,
  token,
  rowGrouping,
  colGrouping,
  gapType,
  gapAction,
  showToast,
  selectedStudentForMove,
  handleTapStudent,
  handleTapEmptySeat,
}) {
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const decoded = decodeToken(token);
  const isLoggedIn = Boolean(token);
  const [showComments, setShowComments] = React.useState(false);
  const activeSavedSchedule = schedules.find(s => s.date === date && s.shift === shift);
  const activeSavedConfig = activeSavedSchedule 
    ? (examConfigs.find(c => c.examType === (activeSavedSchedule.examType || 'College')) || activeConfig)
    : activeConfig;
    
  const label1 = activeSavedConfig?.fields.find(f => f.type === 'constraint_1')?.label || 'Dept';

  const plural = (word) => {
    const wl = (word || "").toLowerCase();
    if (wl === 'class') return 'Classes';
    if (wl === 'sem') return 'Sems';
    if (wl === 'semester') return 'Semesters';
    if (wl === 'dept') return 'Depts';
    if (wl === 'department') return 'Departments';
    if (wl === 'section') return 'Sections';
    if (wl === 'stream') return 'Streams';
    if (wl === 'subject') return 'Subjects';
    return `${word}s`;
  };

  return (
    <div id="Allotment" className="space-y-6">
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-semibold text-red-700">3) Generate</h3>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3 select-none">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Exam Type</label>
              <CustomSelect
                value={selectedExamType}
                onChange={(val) => {
                  setSelectedExamType(val);
                  localStorage.setItem("selectedExamType", val);
                }}
                options={uniqueExamTypes}
                placeholder="Select Exam Type"
                className="w-40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-0.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-250 rounded px-2.5 py-1 text-xs text-black" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-0.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border border-gray-250 rounded px-2.5 py-1 text-xs text-black" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-1">Shift</label>
              <CustomSelect
                value={shift}
                onChange={(val) => setShift(Number(val))}
                options={[
                  { value: 1, label: "1 — 10:00–13:00" },
                  { value: 2, label: "2 — 14:00–17:00" }
                ]}
                placeholder="Select Shift"
                className="w-48"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-0.5">Seed</label>
              <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} className="border border-gray-250 rounded px-2.5 py-1 text-xs w-20 text-black" />
            </div>
          </div>

          {/* Single Class Distancing Layout Settings */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="useDistancing" 
                  checked={useDistancing} 
                  disabled={isLayoutSettingsLocked && allotments.length > 0}
                  onChange={e => {
                    const checked = e.target.checked;
                    setUseDistancing(checked);
                    if (checked) {
                      setShowDistancingModal(true);
                    }
                  }} 
                  className={`rounded text-red-700 w-4 h-4 ${isLayoutSettingsLocked && allotments.length > 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                />
                <label htmlFor="useDistancing" className={`text-sm font-semibold text-gray-700 ${isLayoutSettingsLocked && allotments.length > 0 ? 'cursor-not-allowed text-gray-550' : 'cursor-pointer'}`}>
                  Single Class Distancing Layout (Empty seats/gaps between columns/rows) {isLayoutSettingsLocked && allotments.length > 0 && <span className="text-xs text-red-700 font-bold ml-1.5">(Locked)</span>}
                </label>
              </div>
              {useDistancing && (
                <button
                  type="button"
                  onClick={() => setShowDistancingModal(true)}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Configure & Preview Layout
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 border-t pt-3">
            <div className="w-full">
              <h4 className="font-semibold text-sm">Select {getFieldLabel('constraint_1')}-{getFieldLabel('constraint_2')} Combinations</h4>
              <div className="flex flex-col sm:flex-row gap-2 mt-2 select-none">
                <CustomSelect
                  value={selectedDept}
                  onChange={(val) => setSelectedDept(val)}
                  options={meta.depts}
                  placeholder={`Select ${getFieldLabel('constraint_1')}`}
                  className="flex-1 min-w-[130px]"
                />
                <CustomSelect
                  value={selectedSem}
                  onChange={(val) => setSelectedSem(val)}
                  options={meta.sems}
                  placeholder={`Select ${getFieldLabel('constraint_2')}`}
                  className="flex-1 min-w-[130px]"
                />
                {(selectedExamType === "College" || selectedExamType === "School") && (
                  <CustomSelect
                    value={selectedComboSubject}
                    onChange={(val) => setSelectedComboSubject(val)}
                    options={meta.subjects || []}
                    placeholder="Select Subject"
                    className="flex-1 min-w-[130px]"
                  />
                )}
                {userRole === "admin" && (
                  <button
                    onClick={addDeptSemCombination}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:py-1 rounded font-semibold text-xs transition-colors cursor-pointer shrink-0"
                    disabled={!selectedDept || !selectedSem || ((selectedExamType === "College" || selectedExamType === "School") && !selectedComboSubject)}
                  >
                    Add
                  </button>
                )}
              </div>
              <div className="mt-3 max-h-40 overflow-y-auto border p-2 rounded bg-gray-50/50">
                {deptSemCombinations.length === 0 ? (
                  <p className="text-gray-500 text-xs italic p-1">No combinations added yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {deptSemCombinations.map((combo, index) => (
                      <li key={`${combo.dept}-${combo.sem}-${index}`} className="flex justify-between items-center bg-white border p-2 rounded shadow-2xs text-xs">
                        <span>
                          {getFieldLabel('constraint_1')}: {combo.dept} — {getFieldLabel('constraint_2')}: {combo.sem}
                          {combo.subject && ` — Subject: ${combo.subject}`}
                        </span>
                        {userRole === "admin" && (
                          <button
                            onClick={() => removeDeptSemCombination(index)}
                            className="text-red-500 hover:text-red-750 font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2.5 border-t pt-3.5 select-none">
            {userRole === "admin" && (
              <button
                onClick={generate}
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors shadow cursor-pointer"
              >
                Generate Allotment
              </button>
            )}
            <button
              onClick={downloadCSV}
              className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Download CSV
            </button>
            <button
              onClick={() => downloadRoomGrid(rooms[0]?._id, 'csv')}
              className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Grid CSV
            </button>
            <button
              onClick={() => downloadRoomGrid(rooms[0]?._id, 'json')}
              className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Grid JSON
            </button>
          </div>
        </div>
      </section>

      {schedules.length > 0 && (
        <section className="bg-white shadow rounded-lg p-6 mt-6">
          <h3 className="text-md font-semibold text-red-700">Saved Schedules</h3>
          <div className="flex flex-row overflow-x-auto gap-3 mt-3 pb-2.5 scrollbar-thin">
            {schedules.map((s, i) => (
              <button
                key={i}
                onClick={() => { 
                  setDate(s.date); 
                  setShift(s.shift); 
                  if (s.time) setTime(s.time); 
                  if (s.subject) setSubject(s.subject); 
                  if (s.examType) {
                    setSelectedExamType(s.examType);
                    localStorage.setItem("selectedExamType", s.examType);
                  }
                  setIsLayoutSettingsLocked(true);
                }}
                className={`p-4 rounded-xl border text-left text-sm transition-all duration-200 hover:shadow-md max-w-xs w-full flex flex-col justify-between cursor-pointer shrink-0 ${
                  date === s.date && shift === s.shift 
                    ? 'bg-red-50/50 border-red-500 ring-2 ring-red-500/10' 
                    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-bold text-gray-800 text-xs shrink-0">{s.date}</span>
                    <span className="text-[9px] bg-red-105 text-red-700 border border-red-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      {s.examType || 'College'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    Shift {s.shift} {s.time ? `(${s.time})` : ''}
                  </div>

                  <div className="text-[11px] text-gray-500 mt-2 space-y-1 border-t border-gray-100 pt-2 w-full text-left select-none">
                    {(() => {
                      const cardConfig = examConfigs.find(c => c.examType === (s.examType || 'College'));
                      const label1 = cardConfig?.fields.find(f => f.type === 'constraint_1')?.label || 'Dept';
                      const label2 = cardConfig?.fields.find(f => f.type === 'constraint_2')?.label || 'Sem';
                      
                      if (s.combinations && s.combinations.length > 0) {
                        const formattedCombos = s.combinations.map(combo => {
                          const parts = [];
                          if (combo.dept) {
                            parts.push(`${label1} ${combo.dept}`);
                          }
                          if (combo.sem) {
                            parts.push(`${label2} ${combo.sem}`);
                          }
                          const mainText = parts.join(" ");
                          return combo.subject ? `${mainText} (${combo.subject})` : mainText;
                        });

                        return (
                          <div className="space-y-1 mt-1">
                            {formattedCombos.map((comboText, idx) => (
                              <div key={idx} className="text-gray-700 font-semibold truncate block w-full text-left select-none" title={comboText}>
                                • {comboText}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <>
                          {s.depts && s.depts.length > 0 && (
                            <div className="flex items-start gap-1">
                              <span className="font-bold text-gray-600 shrink-0">{plural(label1)}:</span> 
                              <span className="text-gray-800 truncate block w-full text-left" title={s.depts.join(', ')}>{s.depts.join(', ')}</span>
                            </div>
                          )}
                          {s.sems && s.sems.length > 0 && (
                            <div className="flex items-start gap-1">
                              <span className="font-bold text-gray-600 shrink-0">{plural(label2)}:</span> 
                              <span className="text-gray-800 text-left">{s.sems.join(', ')}</span>
                            </div>
                          )}
                          {s.sections && s.sections.length > 0 && s.examType !== "School" && (
                            <div className="flex items-start gap-1">
                              <span className="font-bold text-gray-600 shrink-0">Sec:</span> 
                              <span className="text-gray-800 truncate block w-full text-left" title={s.sections.join(', ')}>{s.sections.join(', ')}</span>
                            </div>
                          )}
                          {s.subjects && s.subjects.length > 0 && (
                            <div className="flex items-start gap-1">
                              <span className="font-bold text-gray-600 shrink-0">Subs:</span> 
                              <span className="text-gray-800 truncate block w-full text-left" title={s.subjects.join(', ')}>{s.subjects.join(', ')}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Saved Schedule Details */}
          {schedules.some(s => s.date === date && s.shift === shift) && (
            <div className="mt-5 p-4 border border-red-200 bg-red-50/10 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-red-700 text-sm flex items-center gap-1.5 select-none">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    Selected saved arrangement details
                  </h4>
                  <div className="text-xs text-black mt-1.5 space-y-1 select-none">
                    <div>
                      <strong className="text-gray-600">Date:</strong> {date} &nbsp;|&nbsp; 
                      <strong className="text-gray-600">Shift:</strong> {shift} {time ? `(${time})` : ''} &nbsp;|&nbsp;
                      <strong className="text-gray-600">Type:</strong> <span className="bg-red-105 text-red-700 px-2 py-0.5 rounded font-bold uppercase text-[9px]">{activeSavedSchedule?.examType || 'College'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-600">{plural(label1)}:</strong>{' '}
                      {selectedScheduleCombos.length > 0 ? (
                        <span className="text-black font-semibold">{selectedScheduleCombos.join(', ')}</span>
                      ) : (
                        <span className="text-gray-400 italic">No allotments found for this slot.</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-3 flex-wrap select-none">
                  <button
                    type="button"
                    onClick={() => saveToLibrary(activeSavedSchedule)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5 animate-fadeIn"
                    title="Save this arrangement to your library"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save to Library
                  </button>
                  
                  {userRole === "admin" && (
                    <>
                      {isLayoutSettingsLocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsLayoutSettingsLocked(false);
                            if (showToast) showToast("Spacing settings unlocked for editing.", "success");
                          }}
                          className="bg-yellow-600 hover:bg-yellow-755 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Unlock Spacing Settings
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsLayoutSettingsLocked(true);
                            if (showToast) showToast("Spacing settings locked.", "info");
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Lock Spacing Settings
                        </button>
                      )}
                    </>
                  )}

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Regeneration Seed</label>
                    <input
                      type="number"
                      value={seed}
                      disabled={userRole !== "admin"}
                      onChange={e => setSeed(Number(e.target.value))}
                      className={`border rounded px-3 py-1.5 w-24 text-xs font-bold ${userRole !== "admin" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-black"}`}
                      placeholder="Seed"
                    />
                  </div>

                  {userRole === "admin" && (
                    <button
                      onClick={regenerateSchedule}
                      className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-sm h-[38px] cursor-pointer"
                    >
                      Regenerate Arrangement
                    </button>
                  )}
                </div>
              </div>

              {/* Comments/Discussion Section */}
              <div className="mt-5 border-t border-red-200/40 pt-4 text-left animate-fadeIn">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="w-full flex items-center justify-between font-bold text-gray-700 text-xs py-2.5 px-4 border border-gray-150 rounded-xl bg-gray-50/50 hover:bg-red-50 hover:text-red-750 transition-all select-none cursor-pointer mb-2 shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <i className="las la-comments text-lg text-red-750"></i>
                    <span>Discussion & Comments</span>
                    {comments.length > 0 && (
                      <span className="bg-red-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {comments.length}
                      </span>
                    )}
                  </span>
                  <i className={`las la-angle-down text-sm transition-transform ${showComments ? 'rotate-180' : ''}`}></i>
                </button>

                {showComments && (
                  <div className="border border-gray-150 rounded-2xl p-4 bg-white shadow-2xs space-y-4 animate-scaleIn">
                    {comments.length === 0 ? (
                      <p className="text-xs italic text-gray-500 pl-1 select-none">No comments on this arrangement yet. Feel free to start the discussion!</p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {comments.map((comment) => {
                          const fullName = comment.user?.name || comment.user?.username || "Staff User";
                          const firstName = fullName.split(" ")[0];
                          const initials = getInitials(fullName);
                          const formattedTime = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={comment._id} className="flex gap-3 p-3 bg-gray-50/50 border border-gray-150 rounded-xl text-xs shadow-2xs hover:shadow-xs transition-shadow">
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-gray-700 bg-white shrink-0 select-none ${
                                comment.user?.role === "admin"
                                  ? "border-red-500 text-red-700"
                                  : "border-blue-500 text-blue-700"
                              }`}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1 select-none">
                                  <span className="font-bold text-gray-800 flex items-center gap-1">
                                    {firstName}
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                      comment.user?.role === "admin" 
                                        ? "bg-red-50 border-red-100 text-red-700" 
                                        : "bg-blue-50 border-blue-100 text-blue-700"
                                    }`}>
                                      {comment.user?.role || "Staff"}
                                    </span>
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    {formattedTime}
                                  </span>
                                </div>
                                <p className="text-gray-700 font-medium leading-relaxed break-words">{comment.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a comment or note about this arrangement..."
                        className="flex-1 border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl px-3 py-1.5 text-xs bg-white text-black font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addComment();
                          }
                        }}
                      />
                      <button
                        onClick={addComment}
                        disabled={!newCommentText.trim()}
                        className="bg-red-700 hover:bg-red-800 disabled:bg-gray-200 disabled:text-gray-400 text-white p-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center shrink-0"
                        title="Send Comment"
                      >
                        <i className="las la-paper-plane"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="bg-white shadow rounded-lg p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 mb-3 gap-2 select-none">
          <h3 className="text-md font-semibold text-red-700">4) View rooms (grid)</h3>
          <div className="flex items-center gap-3">
            {isSaving && (
              <div className="text-xs text-red-650 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                Saving changes...
              </div>
            )}
            {isLoggedIn && (
              <button
                onClick={() => setShowBucketSidebar(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-xs animate-fadeIn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {showBucketSidebar ? 'Hide Staging Bucket' : `Show Staging Bucket (${bucket.length})`}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 space-y-2 select-none">
          <FilterControls allotments={allotments} onFilterChange={setFilters} getFieldLabel={getFieldLabel} />
        </div>
        <div className="mt-3 space-y-6">
          {rooms.map(room => {
            const g = gridForRoom(room);
            const roomAllotments = allotments.filter(a => String(a.room._id) === String(room._id));
            const roomSubject = roomAllotments[0]?.subject || "";

            const isBringTogether = useDistancing && gapType === 'physical-gap' && gapAction === 'bring-together';

            const colTracks = [];
            for (let c = 1; c <= g.cols; c++) {
              colTracks.push({ type: 'seat', originalCol: c });
              if (isBringTogether && colGrouping > 0 && c % colGrouping === 0 && c !== g.cols) {
                colTracks.push({ type: 'spacer' });
              }
            }

            const rowTracks = [];
            for (let r = 1; r <= g.rows; r++) {
              rowTracks.push({ type: 'seat', originalRow: r });
              if (isBringTogether && rowGrouping > 0 && r % rowGrouping === 0 && r !== g.rows) {
                rowTracks.push({ type: 'spacer' });
              }
            }

            const gridColsTemplate = isBringTogether
              ? colTracks.map(t => t.type === 'seat' ? '64px' : '16px').join(' ')
              : `repeat(${g.cols}, max-content)`;

            const gridRowsTemplate = isBringTogether
              ? rowTracks.map(t => t.type === 'seat' ? '56px' : '16px').join(' ')
              : undefined;

            return (
              <div key={room._id} className="animate-fadeIn">
                <div className="flex items-center justify-between mb-2 select-none">
                  <h4 className="font-bold text-gray-800 text-sm">
                    {room.name} — {room.rows}×{room.cols}
                    {roomSubject && <span className="text-xs bg-red-100 text-red-750 px-2 py-0.5 rounded-full font-semibold ml-2">{roomSubject}</span>}
                    <span className="font-normal text-xs text-gray-500 ml-2">
                      ({invigAssignments.find(a => a.room._id === room._id)?.invigilator.name || "Not Assigned"})
                    </span>
                  </h4>
                  <div className="text-[10px] text-gray-400 font-semibold">Hover a seat for details</div>
                </div>
                <div className="overflow-auto border rounded p-2 select-none">
                  <div 
                    className="inline-grid select-none" 
                    style={{ 
                      gridTemplateColumns: gridColsTemplate,
                      gridTemplateRows: gridRowsTemplate,
                      gap: 8 
                    }}
                  >
                    {rowTracks.flatMap((rTrack, ri) =>
                      colTracks.map((cTrack, ci) => {
                        if (rTrack.type === 'spacer' || cTrack.type === 'spacer') {
                          return (
                            <div 
                              key={`spacer-${room._id}-${ri}-${ci}`} 
                              className="w-full h-full bg-transparent pointer-events-none select-none" 
                            />
                          );
                        }

                        const row = rTrack.originalRow;
                        const col = cTrack.originalCol;
                        const key = `${row},${col}`;
                        const entry = g.map[key];
                        const roll = entry?.student?.roll;
                        const seatCode = entry?.seatCode || getSeatLabel(row - 1, col);
                        const isVisible = !filters || (entry && filters.depts.includes(entry.student.dept) && filters.sems.includes(entry.student.sem));
                        
                        const isRowGap = useDistancing && gapAction !== 'bring-together' && rowGrouping > 0 && ((row - 1) % (rowGrouping + 1)) === rowGrouping;
                        const isColGap = useDistancing && gapAction !== 'bring-together' && colGrouping > 0 && ((col - 1) % (colGrouping + 1)) === colGrouping;
                        const isLayoutGap = isRowGap || isColGap;
                        const isHidden = !isDraggingStudent && isLayoutGap && gapType === 'physical-gap' && !entry;

                        const isSeatDragOver = dragOverSeatKey === `${room._id}-${row}-${col}`;
                        const isSelected = entry && isVisible && selectedStudentForMove && selectedStudentForMove.studentId === entry.student._id;

                        return (
                          <div
                            key={key}
                            onDragOver={(e) => {
                              if (userRole === "admin" && !isHidden) e.preventDefault();
                            }}
                            onDragEnter={() => {
                              if (userRole === "admin" && !isHidden) setDragOverSeatKey(`${room._id}-${row}-${col}`);
                            }}
                            onDragLeave={() => {
                              if (userRole === "admin") setDragOverSeatKey(null);
                            }}
                            onDrop={(e) => {
                              if (userRole === "admin") {
                                setDragOverSeatKey(null);
                                if (!isHidden) handleDropOnSeat(e, room, row, col);
                              }
                            }}
                            onClick={() => {
                              if (userRole !== "admin" || isHidden) return;
                              if (entry && isVisible) {
                                handleTapStudent(entry.student, 'seat', room._id, row, col);
                              } else {
                                handleTapEmptySeat(room, row, col);
                              }
                            }}
                            className={`w-16 h-14 flex items-center justify-center text-[10px] text-center p-1 transition-all rounded-lg border select-none ${
                              isHidden
                                ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                                : entry && isVisible
                                  ? `${getDeptColor(entry.student.dept, entry.student.sem)} border-gray-400 shadow-sm cursor-pointer`
                                  : isLayoutGap
                                    ? 'border-2 border-dashed border-gray-300 bg-gray-100/70 text-gray-500'
                                    : `border-gray-250 bg-white hover:bg-gray-50/50 ${selectedStudentForMove ? 'cursor-pointer' : ''}`
                              } ${
                                isSeatDragOver ? 'border-2 border-dashed border-red-500 scale-105 bg-red-50/40 z-10' : ''
                              } ${
                                isSelected ? 'ring-2 ring-red-500 scale-105 z-20 bg-red-50/40' : ''
                              }`}
                            title={entry ? [
                              `Name: ${entry.student.name}`,
                              `${getFieldLabel('constraint_1')}: ${entry.student.dept}`,
                              `${getFieldLabel('constraint_2')}: ${entry.student.sem}`,
                              entry.student.metadata ? Object.entries(entry.student.metadata).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
                            ].filter(Boolean).join('\n') : isHidden ? '' : isLayoutGap ? 'Distancing Layout Gap' : 'Empty Seat'}
                          >
                            {isVisible && entry ? (
                              <div
                                draggable={userRole === "admin"}
                                onDragStart={(e) => handleDragStartSeat(e, entry.student, room, row, col)}
                                className={`w-full h-full flex flex-col justify-center select-none transition-transform ${userRole === "admin" ? "cursor-grab active:cursor-grabbing hover:scale-[1.03] active:scale-95" : ""}`}
                              >
                                <div className="font-bold text-gray-900 text-[10px] tracking-tight select-none">{roll ? roll : '-'}</div>
                                <div className="text-[8px] font-extrabold text-gray-500 mt-0.5 select-none">{roll ? seatCode : ''}</div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col justify-center text-gray-400 select-none">
                                {isHidden ? '' : (
                                  <>
                                    <span className="text-[9px] font-extrabold text-gray-400 select-none">{seatCode}</span>
                                    {isLayoutGap && <span className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider mt-0.5 select-none">GAP</span>}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
