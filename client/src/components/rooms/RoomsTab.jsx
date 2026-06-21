import React from "react";
import RoomPreview from "../RoomPreview";
import CustomSelect from "../common/CustomSelect";

export default function RoomsTab({
  userRole,
  rooms,
  invigAssignments,
  movieRoomPreview,
  setMovieRoomPreview,
  openMoviePreview,
  downloadRoomPDF,
  roomSchedules,
  setDate,
  setShift,
  schedules,
  setTime,
  setSubject,
  setSelectedExamType,
  uniqueExamTypes,
  editRoom,
  deleteRoom,
  addRoom,
  date,
  shift,
  time,
  subject,
  selectedExamType,
  allotments,
  getStudentCounts,
  getFieldLabel,
  useDistancing,
  rowGrouping,
  colGrouping,
  gapType,
  gapAction,
  handleDragStartSeat,
  handleDropOnSeat,
}) {
  const [downloadingRooms, setDownloadingRooms] = React.useState({});

  React.useEffect(() => {
    if (movieRoomPreview) {
      const timer = setTimeout(() => {
        const previewElement = document.getElementById("active-room-preview");
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [movieRoomPreview]);

  return (
    <div id="Rooms" className="space-y-6">
      {/* Rooms Listing */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between border-b border-gray-150 pb-2 mb-3">
          <h3 className="text-md font-semibold text-red-700">2) Rooms</h3>
          {userRole === "admin" && (
            <button
              onClick={addRoom}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer"
            >
              + Add Room
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-row flex-nowrap overflow-x-auto gap-4 pb-4 select-none">
          {rooms.length === 0 ? (
            <div className="text-sm text-gray-500 italic py-4">No rooms defined yet. Click "+ Add Room" to create one.</div>
          ) : (
            rooms.map(r => {
              const assignment = invigAssignments.find(a => a.room._id === r._id);
              const invigilatorName = assignment ? assignment.invigilator.name : "Not Assigned";
              const isActivePreview = movieRoomPreview && movieRoomPreview._id === r._id;
              
              return (
                <div
                  key={r._id}
                  className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all shrink-0 w-80 ${
                    isActivePreview
                      ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/10'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{r.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.rows} rows × {r.cols} cols</div>
                        <div className="text-xs text-gray-500">Invigilator: {invigilatorName}</div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (isActivePreview) {
                              setMovieRoomPreview(null);
                            } else {
                              openMoviePreview(r);
                            }
                          }}
                          className={`text-xs border rounded-lg px-2.5 py-1 transition-colors text-center font-semibold cursor-pointer ${
                            isActivePreview
                              ? 'bg-red-700 text-white border-red-700 hover:bg-red-800'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-255'
                          }`}
                        >
                          {isActivePreview ? 'Close Preview' : 'Preview'}
                        </button>
                        <button
                          onClick={async () => {
                            setDownloadingRooms(prev => ({ ...prev, [r._id]: true }));
                            try {
                              await downloadRoomPDF(r);
                            } catch (err) {
                              console.error("Failed to download room PDF:", err);
                            } finally {
                              setDownloadingRooms(prev => ({ ...prev, [r._id]: false }));
                            }
                          }}
                          disabled={downloadingRooms[r._id]}
                          className="text-xs border border-gray-250 bg-white disabled:bg-gray-150 hover:bg-gray-50 text-gray-700 disabled:text-gray-400 rounded-lg px-2.5 py-1 transition-colors text-center font-semibold cursor-pointer flex items-center justify-center gap-1.5 min-w-[94px]"
                        >
                          {downloadingRooms[r._id] ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Loading...
                            </>
                          ) : (
                            'Download PDF'
                          )}
                        </button>
                      </div>
                    </div>
                    {roomSchedules[r._id] && roomSchedules[r._id].length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 max-h-32 overflow-y-auto">
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Allocated Schedules (Click to Preview):</div>
                        {roomSchedules[r._id].map((sch, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              openMoviePreview(r);
                              setDate(sch.date);
                              setShift(Number(sch.shift));
                              const matchedSched = schedules.find(s => s.date === sch.date && Number(s.shift) === Number(sch.shift));
                              if (matchedSched) {
                                if (matchedSched.time) setTime(matchedSched.time);
                                if (matchedSched.subject) setSubject(matchedSched.subject);
                                if (matchedSched.examType) {
                                  setSelectedExamType(matchedSched.examType);
                                  localStorage.setItem("selectedExamType", matchedSched.examType);
                                }
                              }
                            }}
                            className="text-[10px] text-gray-700 bg-gray-50/50 hover:bg-red-50 hover:border-red-200 p-2 rounded-lg border border-gray-100/70 flex items-center justify-between cursor-pointer transition-all select-none"
                            title="Click to view preview for this schedule"
                          >
                            <div className="truncate pr-1">
                              <span className="font-bold text-gray-800">{sch.date}</span> <span className="text-gray-500 font-semibold">(S{sch.shift})</span>
                              {sch.subjects.length > 0 && <span className="text-[9px] text-gray-550 ml-1 block truncate">[{sch.subjects.join(', ')}]</span>}
                            </div>
                            <span className="text-[9px] bg-red-550/10 text-red-700 px-1.5 py-0.5 rounded font-bold shrink-0">{sch.studentCount} seats</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 italic mt-3 pt-3 border-t border-gray-100">No schedules allocated.</div>
                    )}
                  </div>
                  
                  {userRole === "admin" && (
                    <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-gray-100">
                      <button
                        onClick={() => editRoom(r)}
                        className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-2.5 py-1.5 flex-1 font-bold text-center transition-colors shadow-xs cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRoom(r)}
                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 flex-1 font-bold text-center transition-colors shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Active Room Preview Visualizer */}
      {movieRoomPreview && (
        <div id="active-room-preview" className="w-full animate-fadeIn">
          <RoomPreview
            room={movieRoomPreview}
            allotments={allotments}
            invigilatorName={(() => {
              const teacher = invigAssignments.find(a => a.room._id === movieRoomPreview._id)?.invigilator;
              if (!teacher) return "Not Assigned";
              const firstName = teacher.name.trim().split(/\s+/)[0];
              return `${firstName} Sir`;
            })()}
            shift={shift}
            date={date}
            getStudentCounts={getStudentCounts}
            getFieldLabel={getFieldLabel}
            useDistancing={useDistancing}
            rowGrouping={rowGrouping}
            colGrouping={colGrouping}
            gapType={gapType}
            gapAction={gapAction}
            onDragStart={handleDragStartSeat}
            onDropOnSeat={handleDropOnSeat}
            userRole={userRole}
            selectedExamType={selectedExamType}
            onClose={() => setMovieRoomPreview(null)}
            slotSelect={
              <div className="flex flex-col select-none">
                <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Quick Select Slot</label>
                <CustomSelect
                  value={`${date}_${shift}`}
                  onChange={(val) => {
                    if (!val) return;
                    const [newDate, newShift] = val.split("_");
                    const s = schedules.find(sched => sched.date === newDate && Number(sched.shift) === Number(newShift));
                    if (s) {
                      setDate(s.date);
                      setShift(Number(s.shift));
                      if (s.time) setTime(s.time);
                      if (s.subject) setSubject(s.subject);
                      if (s.examType) {
                        setSelectedExamType(s.examType);
                        localStorage.setItem("selectedExamType", s.examType);
                      }
                    }
                  }}
                  placeholder="Select a slot..."
                  className="w-48"
                  options={(() => {
                    const roomAllocated = roomSchedules[movieRoomPreview._id] || [];
                    const allocatedKeys = new Set(roomAllocated.map(sch => `${sch.date}_${sch.shift}`));
                    const otherSchedules = schedules.filter(s => !allocatedKeys.has(`${s.date}_${s.shift}`));

                    return [
                      ...roomAllocated.map(sch => ({
                        value: `${sch.date}_${sch.shift}`,
                        label: `🟢 ${sch.date} — S${sch.shift} (${sch.subjects.join(', ') || 'No subject'})`
                      })),
                      ...otherSchedules.map(sch => ({
                        value: `${sch.date}_${sch.shift}`,
                        label: `📅 ${sch.date} — S${sch.shift} (${sch.subject || 'No subject'})`
                      }))
                    ];
                  })()}
                />
              </div>
            }
            dateInput={
              <div className="flex flex-col select-none">
                <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 pr-8 text-xs bg-white text-gray-800 font-bold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 shadow-3xs transition-all cursor-pointer w-32"
                  />
                  <i className="las la-calendar absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                </div>
              </div>
            }
            shiftInput={
              <div className="flex flex-col select-none">
                <label className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Shift</label>
                <CustomSelect
                  value={shift}
                  onChange={(val) => setShift(Number(val))}
                  placeholder="Shift"
                  className="w-24"
                  options={[
                    { value: 1, label: "Shift 1" },
                    { value: 2, label: "Shift 2" }
                  ]}
                />
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
