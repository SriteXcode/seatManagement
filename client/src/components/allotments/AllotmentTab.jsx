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
  deleteSchedule,
  updateSchedule,
  allStudents = [],
}) {
  const getStudentCountForCombo = (combo) => {
    if (!Array.isArray(allStudents)) return 0;
    const isSubjectCompulsory = selectedExamType === "College" || selectedExamType === "School";
    return allStudents.filter(s => {
      if (s.examType !== selectedExamType) return false;
      if (s.dept !== combo.dept) return false;
      if (String(s.sem) !== String(combo.sem)) return false;
      if (isSubjectCompulsory && combo.subject) {
        const studentSubjects = Array.isArray(s.subject) ? s.subject : (s.subject ? [s.subject] : []);
        if (studentSubjects.length > 0 && !studentSubjects.includes(combo.subject)) {
          return false;
        }
      }
      return true;
    }).length;
  };

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
  const [isEditingSchedule, setIsEditingSchedule] = React.useState(false);
  const [editDate, setEditDate] = React.useState("");
  const [editShift, setEditShift] = React.useState(1);
  const [editTime, setEditTime] = React.useState("");
  const [editSubject, setEditSubject] = React.useState("");
  const [editCombinations, setEditCombinations] = React.useState([]);

  const handleStartEditSchedule = () => {
    setEditDate(date);
    setEditShift(shift);
    setEditTime(time || "");
    setEditSubject(activeSavedSchedule?.subject || "");
    setEditCombinations(activeSavedSchedule?.combinations ? JSON.parse(JSON.stringify(activeSavedSchedule.combinations)) : []);
    setIsEditingSchedule(true);
  };

  const handleAddCombination = () => {
    setEditCombinations([...editCombinations, { dept: "", sem: "", subject: "" }]);
  };

  const handleRemoveCombination = (index) => {
    setEditCombinations(editCombinations.filter((_, idx) => idx !== index));
  };

  const handleCombinationChange = (index, field, value) => {
    const updated = editCombinations.map((c, idx) => {
      if (idx === index) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setEditCombinations(updated);
  };

  const handleSaveEditedSchedule = async (e) => {
    e.preventDefault();
    if (!editDate || !editShift) {
      if (showToast) showToast("Date and Shift are required.", "error");
      return;
    }
    const filteredCombinations = editCombinations.filter(c => c.dept.trim() || c.sem.trim() || c.subject.trim());
    await updateSchedule({
      date: editDate,
      shift: Number(editShift),
      time: editTime,
      subject: editSubject,
      combinations: filteredCombinations
    });
    setIsEditingSchedule(false);
  };
  const [hoveredSeat, setHoveredSeat] = React.useState(null);
  const [windowSize, setWindowSize] = React.useState({ width: 1200, height: 800 });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);
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
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-40 border border-gray-200 hover:border-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 rounded-lg pl-3 pr-8 py-1.5 text-xs bg-white text-black font-semibold cursor-pointer shadow-2xs min-h-[32px] transition-all" 
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-600">
                  <i className="las la-calendar text-sm"></i>
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Time</label>
              <div className="relative">
                <input 
                  type="time" 
                  value={time} 
                  onChange={e => setTime(e.target.value)} 
                  className="w-40 border border-gray-200 hover:border-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 rounded-lg pl-3 pr-8 py-1.5 text-xs bg-white text-black font-semibold cursor-pointer shadow-2xs min-h-[32px] transition-all" 
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-600">
                  <i className="las la-clock text-sm"></i>
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Shift</label>
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
              <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Seed</label>
              <input 
                type="number" 
                value={seed} 
                onChange={e => setSeed(Number(e.target.value))} 
                className="w-20 border border-gray-200 hover:border-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 rounded-lg px-3 py-1.5 text-xs bg-white text-black font-semibold shadow-2xs min-h-[32px] transition-all" 
              />
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
                          <span className="ml-1.5 font-bold text-gray-500">({getStudentCountForCombo(combo)} students)</span>
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
          {schedules.some(s => s.date === date && s.shift === shift) && (
            <div className="mt-5 p-5 border-l-4 border-l-red-700 border border-gray-200 bg-red-50/5 rounded-2xl shadow-xs select-none">
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
                
                {/* Details Section */}
                <div className="flex-1 space-y-4">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-650 animate-pulse shrink-0"></span>
                    Active Saved Schedule Configuration
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Date & Shift */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-3xs">
                      <div className="p-2 bg-red-50 text-red-700 rounded-lg flex items-center justify-center shrink-0">
                        <i className="las la-calendar-day text-lg"></i>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Slot Details</span>
                        <span className="text-xs font-bold text-gray-850">
                          {date} ({shift})
                        </span>
                      </div>
                    </div>

                    {/* Exam Type */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-3xs">
                      <div className="p-2 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center shrink-0">
                        <i className="las la-file-alt text-lg"></i>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Exam Type</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-bold uppercase text-[9px] inline-block mt-0.5">
                          {activeSavedSchedule?.examType || 'College'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 justify-center min-w-[240px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-5 lg:pt-0 lg:pl-5">
                  <div className="flex gap-2 flex-1 sm:flex-none">
                    <button
                      type="button"
                      onClick={() => saveToLibrary(activeSavedSchedule)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98"
                      title="Save this arrangement to your library"
                    >
                      <i className="las la-bookmark text-sm"></i>
                      Save to Library
                    </button>

                    {userRole === "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLayoutSettingsLocked(!isLayoutSettingsLocked);
                          if (showToast) {
                            showToast(
                              isLayoutSettingsLocked ? "Spacing settings unlocked for editing." : "Spacing settings locked.",
                              isLayoutSettingsLocked ? "success" : "info"
                            );
                          }
                        }}
                        className={`flex-1 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98 ${
                          isLayoutSettingsLocked 
                            ? 'bg-yellow-600 hover:bg-yellow-755' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <i className={`las ${isLayoutSettingsLocked ? 'la-unlock' : 'la-lock'} text-sm`}></i>
                        {isLayoutSettingsLocked ? 'Unlock Layout' : 'Lock Layout'}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2.5 items-end flex-1 sm:flex-none">
                    {/* Layout Seed Input */}
                    <div className="flex flex-col flex-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Layout Seed</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-450">
                          <i className="las la-random text-xs"></i>
                        </span>
                        <input
                          type="number"
                          value={seed}
                          disabled={userRole !== "admin"}
                          onChange={e => setSeed(Number(e.target.value))}
                          className={`border border-gray-200 rounded-xl pl-7 pr-2 py-1.5 w-full text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-500/50 ${
                            userRole !== "admin" ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-black"
                          }`}
                          placeholder="Seed"
                        />
                      </div>
                    </div>

                    {/* Regenerate Button */}
                    {userRole === "admin" && (
                      <button
                        onClick={regenerateSchedule}
                        className="flex-1 bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs h-[32px] cursor-pointer flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-98 shrink-0"
                      >
                        <i className="las la-sync"></i>
                        Regenerate
                      </button>
                    )}
                  </div>

                  {userRole === "admin" && (
                    <div className="flex gap-2 flex-1 sm:flex-none">
                      <button
                        type="button"
                        onClick={handleStartEditSchedule}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98"
                      >
                        <i className="las la-edit text-sm"></i>
                        Edit Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this saved schedule? All allotments and invigilator assignments for this slot will be permanently removed. This will also clean up students who only belong to this schedule.")) {
                            deleteSchedule();
                          }
                        }}
                        className="flex-1 bg-red-650 hover:bg-red-750 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98"
                      >
                        <i className="las la-trash text-sm"></i>
                        Delete Schedule
                      </button>
                    </div>
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
            {/* {isLoggedIn && (
              <button
                onClick={() => setShowBucketSidebar(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-xs animate-fadeIn"
              >
                <img 
                  src="https://img.icons8.com/?size=30&id=Anr2RtO0yx8e&format=png&color=B91C1C" 
                  alt="Staging Bucket" 
                  className="w-4 h-4 object-contain" 
                />
                {showBucketSidebar ? 'Hide Staging Bucket' : `Show Staging Bucket (${bucket.length})`}
              </button>
            )} */}
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
              <div key={room._id} className="animate-fadeIn" id={`room-container-${room._id}`}>
                <div className="flex items-center justify-between mb-2 select-none">
                  <h4 className="font-bold text-gray-800 text-sm">
                    {room.name} — {room.rows}×{room.cols}
                    {roomSubject && <span className="text-xs bg-red-100 text-red-750 px-2 py-0.5 rounded-full font-semibold ml-2">{roomSubject}</span>}
                    <span className="font-normal text-xs text-gray-500 ml-2">
                      ({(() => {
                        const teacher = invigAssignments.find(a => a.room._id === room._id)?.invigilator;
                        if (!teacher) return "Not Assigned";
                        const firstName = teacher.name.trim().split(/\s+/)[0];
                        return `${firstName} Sir`;
                      })()})
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
                            onMouseMove={(e) => {
                              if (isHidden) return;
                              setHoveredSeat({
                                entry: entry && isVisible ? entry : null,
                                seatCode,
                                isLayoutGap,
                                roomName: room.name,
                                row,
                                col,
                                x: e.clientX,
                                y: e.clientY
                              });
                            }}
                            onMouseLeave={() => {
                              setHoveredSeat(null);
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

      {/* Styled hover tooltip for seats */}
      {hoveredSeat && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/50 shadow-2xl rounded-2xl p-4 w-64 select-none flex flex-col gap-3 transition-all duration-150 ease-out"
          style={{ 
            top: 0,
            left: 0,
            transform: `translate3d(${Math.max(10, Math.min(windowSize.width - 270, hoveredSeat.x + 15))}px, ${Math.max(10, Math.min(windowSize.height - 220, hoveredSeat.y + 15))}px, 0)`
          }}
        >
          {hoveredSeat.entry ? (
            <>
              {/* Header with Student Name */}
              <div className="border-b border-slate-800 pb-2">
                <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-0.5">Student Details</div>
                <div className="font-extrabold text-sm text-white tracking-tight leading-tight">
                  {hoveredSeat.entry.student.name}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Roll No</span>
                  <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                    <i className="las la-id-badge text-red-400"></i>
                    {hoveredSeat.entry.student.roll}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Seat Code</span>
                  <span className="font-bold text-yellow-400 flex items-center gap-1 mt-0.5">
                    <i className="las la-chair"></i>
                    {hoveredSeat.seatCode}
                  </span>
                </div>
                <div className="flex flex-col col-span-2 bg-slate-800/40 rounded-lg p-1.5 border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Department & Sem</span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md font-bold text-[10px] border border-red-500/30">
                      {hoveredSeat.entry.student.dept}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md font-bold text-[10px] border border-blue-500/30">
                      Sem {hoveredSeat.entry.student.sem}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata section if it exists */}
              {hoveredSeat.entry.student.metadata && Object.keys(hoveredSeat.entry.student.metadata).length > 0 && (
                <div className="border-t border-slate-800 pt-2 text-[10px] space-y-1">
                  {Object.entries(hoveredSeat.entry.student.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-slate-300">
                      <span className="font-medium text-slate-400">{k}:</span>
                      <span className="font-bold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : hoveredSeat.isLayoutGap ? (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <i className="las la-arrows-alt-h text-xl"></i>
              </div>
              <span className="font-extrabold text-xs text-white">Distancing Gap</span>
              <span className="text-[9px] text-slate-400 mt-0.5">Physical space kept for exam distancing</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="border-b border-slate-800 pb-2 mb-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Seat Status</div>
                <div className="font-extrabold text-sm text-yellow-400 flex items-center gap-1.5 mt-0.5">
                  <i className="las la-chair text-lg"></i> Empty Seat
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Location</span>
                  <span className="font-bold text-white mt-0.5">{hoveredSeat.roomName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Position</span>
                  <span className="font-bold text-white mt-0.5">R{hoveredSeat.row} : C{hoveredSeat.col}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Edit saved schedule modal from allotment tab */}
      {isEditingSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-2xl w-full flex flex-col text-left">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i className="las la-edit text-red-700 text-xl"></i>
                Edit Saved Schedule
              </h3>
              <button 
                onClick={() => setIsEditingSchedule(false)}
                className="text-gray-400 hover:text-gray-650 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditedSchedule} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-650 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Shift *</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-medium"
                  >
                    <option value={1}>Shift 1</option>
                    <option value={2}>Shift 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00-13:00"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-650 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science Theory"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-650 font-medium"
                  />
                </div>
              </div>

              <div className="border-t border-gray-150 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Combinations</h4>
                  <button
                    type="button"
                    onClick={handleAddCombination}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1 px-3 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Combination
                  </button>
                </div>

                {editCombinations.length === 0 ? (
                  <p className="text-xs text-gray-550 italic py-2">No combinations added yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {editCombinations.map((comb, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50/50 p-2.5 rounded-xl border border-gray-200 animate-fadeIn">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Dept (e.g. CSE)"
                            value={comb.dept}
                            onChange={(e) => handleCombinationChange(index, "dept", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Sem (e.g. 5)"
                            value={comb.sem}
                            onChange={(e) => handleCombinationChange(index, "sem", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Subject (Optional)"
                            value={comb.subject}
                            onChange={(e) => handleCombinationChange(index, "subject", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCombination(index)}
                          className="text-red-650 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove combination"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
