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
  gapAction
}) {
  // const previewRef = useRef(); // previewRef is no longer needed here

  function buildSeatMap(room) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const map = {};
    allotments.filter(a => String(a.room._id) === String(room._id)).forEach(a => {
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
    <div id="movieRoomPreview" className="bg-white rounded-lg p-6 max-w-6xl w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{room.name} — {date} — {shift === 1 ? '10:00-13:00' : '14:00-17:00'}</h3>
        {roomSubject && (
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
            {roomSubject}
          </span>
        )}
      </div>
      <div className="mt-4 bg-red-100 p-4 rounded">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-red-700">EXAM HALL</div>
            <div className="text-xs text-gray-700">{room.name}</div>
            <div className="text-xs text-gray-700">Invigilator: {invigilatorName}</div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-sm font-semibold text-gray-800">{date}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date</div>
            </div>
            <div className="border-l border-red-300 h-8"></div>
            <div>
              <div className="text-sm font-semibold text-gray-850">{shift === 1 ? '10:00 - 13:00' : '14:00 - 17:00'}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Shift</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-bold mb-1">Student Counts</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([key, value]) => {
              const [dept, sem] = key.split(' - ');
              return (
                <div key={key} className={`flex items-center text-xs p-1 rounded ${getDeptColor(dept, sem)}`}>
                  {key}: {value}
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-auto border border-red-200/50 rounded-xl p-6 bg-white/70 flex items-center justify-center min-h-[200px] mt-4">
          <div 
            className="inline-grid gap-3 border p-6 my-6 mx-8 bg-white rounded-lg shadow-sm"
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
                    title={a ? [
                      `Name: ${a.student.name}`,
                      `${getFieldLabel ? getFieldLabel('constraint_1') : 'Dept'}: ${a.student.dept}`,
                      `${getFieldLabel ? getFieldLabel('constraint_2') : 'Sem'}: ${a.student.sem}`,
                      a.student.metadata ? Object.entries(a.student.metadata).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
                    ].filter(Boolean).join('\n') : isHidden ? '' : isLayoutGap ? 'Distancing Layout Gap' : 'Empty Seat'}
                    className={`w-24 h-18 rounded-lg flex flex-col items-center justify-center text-[10px] text-center p-1 transition-all border ${
                      isHidden
                        ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                        : a 
                          ? `${getDeptColor(a.student.dept, a.student.sem)} border-gray-400 shadow-sm` 
                          : isLayoutGap
                            ? 'border-2 border-dashed border-gray-300 bg-gray-100/70 text-gray-500'
                            : 'border-gray-250 bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    {isHidden ? '' : (
                      <>
                        <div className="text-[10px] font-bold text-gray-900">{seatCode}</div>
                        <div className="text-[9px] font-bold text-gray-600 mt-0.5">{roll ? `(${roll})` : '-'}</div>
                        {isLayoutGap && !a && <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider mt-0.5">GAP</span>}
                        {a && (
                          <div className="text-[8px] leading-tight text-gray-655 truncate w-full mt-0.5">
                            <div className="truncate font-semibold text-gray-800">{a.student.name}</div>
                            <div className="truncate text-red-700">{getFieldLabel ? getFieldLabel('constraint_1') : 'Dept'}: {a.student.dept}</div>
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

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-700">Format: Roomno.-A1-StudentRollno(xxxxxx)</div>
          {/* Download PDF button is removed from here */}
        </div>
      </div>
    </div>
  );
}