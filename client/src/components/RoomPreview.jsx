import React from "react";
// Removed html2pdf from here, as it's no longer needed in this component.

function getDeptColor(dept, sem) {
  const colors = [
    "bg-red-200", "bg-yellow-200", "bg-green-200", "bg-blue-200",
    "bg-indigo-200", "bg-purple-200", "bg-pink-200", "bg-red-300",
    "bg-yellow-300", "bg-green-300", "bg-blue-300", "bg-indigo-300",
    "bg-purple-300", "bg-pink-300",
  ];
  if (!dept || !sem) return "";
  const str = `${dept}-${sem}`;
  const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getSeatLabel(rowIndex, colIndex) {
  let n = rowIndex + 1; // 1-based row
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${colIndex}`;
}

export default function RoomPreview({ 
  room, 
  allotments, 
  invigilatorName, 
  shift, 
  date,
  getStudentCounts, 
  getFieldLabel,
  useDistancing,
  rowGrouping,
  colGrouping,
  gapType,
  gapAction,
  onDragStart,
  onDropOnSeat,
  userRole,
  onClose,
  slotSelect,
  dateInput,
  shiftInput,
  selectedExamType
}) {
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

  function buildSeatMap(room) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const map = {};
    allotments.filter(a => String(a.room._id || a.room) === String(room._id)).forEach(a => {
      map[`${a.row},${a.col}`] = a;
    });
    return { rows, cols, map };
  }

  const map = buildSeatMap(room);
  const counts = getStudentCounts(room, allotments);
  const roomAllotments = allotments.filter(a => String(a.room._id || a.room) === String(room._id));
  const roomSubject = roomAllotments[0]?.subject || "";

  const isBringTogether = useDistancing && gapType === 'physical-gap' && gapAction === 'bring-together';

  const colTracks = [];
  for (let c = 1; c <= map.cols; c++) {
    colTracks.push({ type: 'seat', originalCol: c });
    if (isBringTogether && colGrouping > 0 && c % colGrouping === 0 && c !== map.cols) {
      colTracks.push({ type: 'spacer' });
    }
  }

  const rowTracks = [];
  for (let r = 1; r <= map.rows; r++) {
    rowTracks.push({ type: 'seat', originalRow: r });
    if (isBringTogether && rowGrouping > 0 && r % rowGrouping === 0 && r !== map.rows) {
      rowTracks.push({ type: 'spacer' });
    }
  }

  const gridColsTemplate = isBringTogether
    ? colTracks.map(t => t.type === 'seat' ? '96px' : '16px').join(' ')
    : `repeat(${map.cols}, 96px)`;

  const gridRowsTemplate = isBringTogether
    ? rowTracks.map(t => t.type === 'seat' ? '72px' : '16px').join(' ')
    : undefined;

  return (
    <div id="movieRoomPreview" className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 max-w-6xl w-full select-none relative animate-fadeIn">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 border border-gray-150 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer z-10"
          title="Close Preview"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* 1. Header Information Grid */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-100 pb-5 mb-5 gap-4 pr-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs">
            <i className="las la-school text-2xl"></i>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-805 tracking-tight leading-tight flex items-center gap-2">
              {room.name}
              {roomSubject && (
                <span className="text-[10px] bg-red-50/50 text-red-700 border border-red-150 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                  {roomSubject}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Room Dimensions: {room.rows} Rows × {room.cols} Columns ({room.rows * room.cols} Seats)
            </p>
          </div>
        </div>

        {slotSelect || dateInput || shiftInput ? (
          <div className="flex flex-wrap items-end gap-3.5 select-none">
            {slotSelect}
            {dateInput}
            {shiftInput}
          </div>
        ) : (
          <div className="flex items-center gap-6 select-none bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 shadow-3xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-red-50 text-red-700 rounded-lg flex items-center justify-center shrink-0">
                <i className="las la-calendar-day text-base"></i>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Date</span>
                <span className="text-xs font-bold text-gray-800">{date}</span>
              </div>
            </div>
            <div className="border-l border-gray-200 h-8"></div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center shrink-0">
                <i className="las la-clock text-base"></i>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Shift & Time</span>
                <span className="text-xs font-bold text-gray-800">{shift === 1 ? '1 — 10:00–13:00' : '2 — 14:00–17:00'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Invigilator & Counts Sub-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Invigilator Info Box */}
        <div className="flex items-center gap-3 bg-gray-50/30 p-3.5 rounded-2xl border border-gray-100 shadow-3xs hover:bg-gray-50/60 transition-colors">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
            <i className="las la-user-tie text-xl"></i>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Invigilator Assigned</span>
            <span className="text-xs font-extrabold text-gray-800 mt-0.5 block">{invigilatorName}</span>
          </div>
        </div>

        {/* Total Seat Allotted Counts */}
        <div className="flex items-center gap-3 bg-gray-50/30 p-3.5 rounded-2xl border border-gray-100 shadow-3xs hover:bg-gray-50/60 transition-colors">
          <div className="p-2.5 bg-green-50 text-green-700 rounded-xl flex items-center justify-center shrink-0">
            <i className="las la-chair text-xl"></i>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Total Allocated</span>
            <span className="text-xs font-extrabold text-gray-800 mt-0.5 block">
              {roomAllotments.length} / {room.rows * room.cols} Seats ({Math.round((roomAllotments.length / (room.rows * room.cols)) * 100)}%)
            </span>
          </div>
        </div>

        {/* Student Count Badge Row */}
        <div className="flex flex-col bg-gray-50/30 p-3.5 rounded-2xl border border-gray-100 shadow-3xs justify-center hover:bg-gray-50/60 transition-colors col-span-1 md:col-span-1">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <i className="las la-graduation-cap text-gray-500"></i>
            Roster Distribution
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-[44px] overflow-y-auto pr-1">
            {Object.entries(counts).length > 0 ? (
              Object.entries(counts).map(([key, value]) => {
                const [dept, sem] = key.split(' - ');
                return (
                  <span 
                    key={key} 
                    className={`px-2 py-0.5 rounded font-bold text-[9px] shadow-3xs ${getDeptColor(dept, sem)}`}
                  >
                    {selectedExamType === "School" ? `Class ${sem} — Sec ${dept}` : key}: {value}
                  </span>
                );
              })
            ) : (
              <span className="text-gray-450 italic text-[10px]">No students allotted.</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Seating Grid Layout Container */}
      <div className={`overflow-auto border border-gray-200 rounded-2xl bg-gray-50/50 min-h-[220px] ${selectedExamType === "School" ? 'p-2' : 'p-4'}`}>
        <div className="flex items-center justify-center min-w-max">
          <div 
            className={`inline-grid gap-3 border border-gray-100 bg-white rounded-2xl shadow-xs ${selectedExamType === "School" ? 'p-2 my-0 mx-0' : 'p-4 my-4 mx-2'}`}
            style={{ 
              gridTemplateColumns: gridColsTemplate,
              gridTemplateRows: gridRowsTemplate
            }}
          >
          {rowTracks.flatMap((rTrack, ri) =>
            colTracks.map((cTrack, ci) => {
              if (rTrack.type === 'spacer' || cTrack.type === 'spacer') {
                return (
                  <div 
                    key={`spacer-preview-${ri}-${ci}`} 
                    className="w-full h-full bg-transparent pointer-events-none" 
                  />
                );
              }

              const r = rTrack.originalRow;
              const c = cTrack.originalCol;
              const key = `${r},${c}`;
              const a = map.map[key];
              const seatCode = a?.seatCode || getSeatLabel(r - 1, c);
              const roll = a?.student?.roll;

              const isRowGap = useDistancing && gapAction !== 'bring-together' && rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
              const isColGap = useDistancing && gapAction !== 'bring-together' && colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
              const isLayoutGap = isRowGap || isColGap;
              const isHidden = isLayoutGap && gapType === 'physical-gap' && !a;

              return (
                <div
                  key={key}
                  draggable={userRole === "admin"}
                  onDragStart={e => {
                    if(onDragStart && a) onDragStart(e, a, room, r, c);
                    else e.preventDefault();
                  }}
                  onDragOver={e => {
                    if(userRole === "admin" && !isHidden && (!isLayoutGap || gapAction === "bring-together")) e.preventDefault();
                  }}
                  onDrop={e => {
                    if(onDropOnSeat && !isHidden && (!isLayoutGap || gapAction === "bring-together")) onDropOnSeat(e, room, r, c);
                  }}
                  onMouseMove={(e) => {
                    if (isHidden) return;
                    setHoveredSeat({
                      a,
                      seatCode,
                      isLayoutGap,
                      roomName: room.name,
                      row: r,
                      col: c,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredSeat(null);
                  }}
                  className={`w-24 h-18 rounded-lg flex flex-col items-center justify-center text-[10px] text-center p-1.5 transition-all border ${
                    isHidden
                      ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                      : a 
                        ? `${getDeptColor(a.student.dept, a.student.sem)} border-gray-400 shadow-xs hover:scale-[1.03] ${userRole === "admin" ? "cursor-grab active:cursor-grabbing" : ""}` 
                        : isLayoutGap
                          ? 'border-2 border-dashed border-gray-300 bg-gray-100/70 text-gray-500'
                          : `border-gray-250 bg-white hover:bg-gray-50/50 hover:scale-[1.03] ${userRole === "admin" ? "cursor-pointer" : ""}`
                  }`}
                >
                  {isHidden ? '' : (
                    <>
                      <div className="text-[10px] font-bold text-gray-900">{seatCode}</div>
                      <div className="text-[9px] font-bold text-gray-600 mt-0.5">{roll ? `(${roll})` : '-'}</div>
                      {isLayoutGap && !a && <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider mt-0.5">GAP</span>}
                      {a && (
                        <div className="text-[8px] leading-tight text-gray-650 truncate w-full mt-0.5">
                          <div className="truncate font-bold text-gray-850">{a.student.name}</div>
                          {selectedExamType === "School" ? (
                            <div className="truncate text-red-700 font-bold">Class {a.student.sem} — {a.student.dept}</div>
                          ) : (
                            <div className="truncate text-red-700 font-bold">
                              {getFieldLabel ? getFieldLabel('constraint_1') : 'Dept'}: {a.student.dept}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          {selectedExamType === "School" 
            ? "Format: Roomno. — Seat Code — Student Roll Number (Name / Class — Sec)" 
            : "Format: Roomno. — Seat Code — Student Roll Number (Name / Dept)"}
        </div>
      </div>

      {/* Styled hover tooltip for preview grid */}
      {hoveredSeat && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/50 shadow-2xl rounded-2xl p-4 w-64 select-none flex flex-col gap-3 transition-all duration-150 ease-out"
          style={{ 
            top: 0,
            left: 0,
            transform: `translate3d(${Math.max(10, Math.min(windowSize.width - 270, hoveredSeat.x + 15))}px, ${Math.max(10, Math.min(windowSize.height - 220, hoveredSeat.y + 15))}px, 0)`
          }}
        >
          <button
            onClick={() => setHoveredSeat(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer pointer-events-auto z-10"
            title="Close Tooltip"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {hoveredSeat.a ? (
            <>
              {/* Header with Student Name */}
              <div className="border-b border-slate-800 pb-2 pr-7">
                <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-0.5">Student Details</div>
                <div className="font-extrabold text-sm text-white tracking-tight leading-tight">
                  {hoveredSeat.a.student.name}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Roll No</span>
                  <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                    <i className="las la-id-badge text-red-400"></i>
                    {hoveredSeat.a.student.roll}
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
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">
                    {selectedExamType === "School" ? "Class & Section" : "Department & Sem"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {selectedExamType === "School" ? (
                      <>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md font-bold text-[10px] border border-red-500/30">
                          Class {hoveredSeat.a.student.sem}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md font-bold text-[10px] border border-blue-500/30">
                          Section {hoveredSeat.a.student.dept}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md font-bold text-[10px] border border-red-500/30">
                          {hoveredSeat.a.student.dept}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md font-bold text-[10px] border border-blue-500/30">
                          Sem {hoveredSeat.a.student.sem}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata section if it exists */}
              {hoveredSeat.a.student.metadata && Object.keys(hoveredSeat.a.student.metadata).length > 0 && (
                <div className="border-t border-slate-800 pt-2 text-[10px] space-y-1">
                  {Object.entries(hoveredSeat.a.student.metadata).map(([k, v]) => (
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
              <div className="border-b border-slate-800 pb-2 mb-2 pr-7">
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
    </div>
  );
}