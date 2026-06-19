import React from "react";

export default function DistancingModal({
  show,
  setShow,
  isLayoutSettingsLocked,
  allotments,
  colGrouping,
  setColGrouping,
  rowGrouping,
  setRowGrouping,
  gapType,
  setGapType,
  gapAction,
  setGapAction,
  previewRoomId,
  setPreviewRoomId,
  rooms,
}) {
  if (!show) return null;

  const getCombinedGapVal = () => {
    if (gapType === 'empty-seat') return 'empty-seat';
    if (gapType === 'physical-gap' && gapAction === 'bring-together') return 'physical-gap-together';
    return 'physical-gap-remove';
  };

  const handleCombinedGapChange = (val) => {
    if (val === 'empty-seat') {
      setGapType('empty-seat');
      setGapAction('remove-seats');
    } else if (val === 'physical-gap-together') {
      setGapType('physical-gap');
      setGapAction('bring-together');
    } else {
      setGapType('physical-gap');
      setGapAction('remove-seats');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-6xl w-full p-6 animate-scaleIn mx-4 max-h-[90vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <i className="las la-sliders-h text-xl text-red-700 animate-pulse"></i>
              Class Distancing Layout Settings & Preview
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Configure row/column spacing and view live room capacity updates.</p>
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-all focus:outline-none cursor-pointer flex items-center justify-center"
            title="Close settings"
          >
            <i className="las la-times text-lg"></i>
          </button>
        </div>

        {/* Parallel layout body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
          {/* Left Column - Options */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 select-none">Layout Configuration</h4>
              
              {isLayoutSettingsLocked && allotments.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-250 text-yellow-800 p-3 rounded-xl text-[11px] flex items-start gap-2 font-semibold leading-normal animate-fadeIn">
                  <i className="las la-lock text-yellow-600 text-sm shrink-0 mt-0.5"></i>
                  <span>Spacing settings are currently locked for this saved arrangement. Use the Unlock button in the details panel to edit.</span>
                </div>
              )}

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700 mb-1">
                  Column Grouping (Consecutive occupied columns)
                </label>
                <input 
                  type="number" 
                  value={colGrouping} 
                  disabled={isLayoutSettingsLocked && allotments.length > 0}
                  onChange={e => setColGrouping(Number(e.target.value))} 
                  className={`border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs font-semibold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                  min="1"
                />
                <span className="text-[10px] text-gray-450 mt-1 font-medium">e.g. 2 columns together then a gap column</span>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700 mb-1">
                  Row Grouping (Consecutive occupied rows)
                </label>
                <input 
                  type="number" 
                  value={rowGrouping} 
                  disabled={isLayoutSettingsLocked && allotments.length > 0}
                  onChange={e => setRowGrouping(Number(e.target.value))} 
                  className={`border border-gray-255 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs font-semibold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                  min="0"
                />
                <span className="text-[10px] text-gray-450 mt-1 font-medium">0 or empty for no row gap</span>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700 mb-1">
                  Gap Layout Representation
                </label>
                <select
                  value={getCombinedGapVal()}
                  disabled={isLayoutSettingsLocked && allotments.length > 0}
                  onChange={e => handleCombinedGapChange(e.target.value)}
                  className={`border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs font-bold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black cursor-pointer'}`}
                >
                  <option value="empty-seat">Empty Seat Box</option>
                  <option value="physical-gap-remove">Blank Gap Space (Remove Seats)</option>
                  <option value="physical-gap-together">Blank Gap Space (Bring Seats Together)</option>
                </select>
                <span className="text-[10px] text-gray-450 mt-1 font-medium">Choose how empty spacing looks in the grid</span>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700 mb-1">Select Room to Visualize</label>
                <select
                  value={previewRoomId}
                  onChange={e => setPreviewRoomId(e.target.value)}
                  className="border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs bg-white text-black font-bold cursor-pointer"
                >
                  <option value="">Select a Room</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>{r.name} ({r.rows}x{r.cols})</option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-450 mt-1 font-medium">Choose which room layout to preview on the right</span>
              </div>
            </div>

            <div className="w-full text-[11px] text-gray-650 bg-yellow-50/50 p-3.5 rounded-xl border border-yellow-100 leading-relaxed font-medium">
              <strong>Layout Guide:</strong> For a 10x8 room, setting Column Grouping to 2 results in 2 adjacent active columns followed by a gap column (e.g. 10 x 2*4 format). Setting Row Grouping to 2 results in pairs of active rows with a gap row (e.g. 2*5 x 2*4 format).
            </div>
          </div>

          {/* Right Column - Live Visualizer Preview */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-gray-50 border border-gray-150 rounded-2xl p-4">
            {(() => {
              const selectedRoom = rooms.find(r => r._id === previewRoomId);
              if (!selectedRoom) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-xs font-bold text-gray-500">Please select a room to see the layout preview</p>
                  </div>
                );
              }

              const rCount = Number(selectedRoom.rows);
              const cCount = Number(selectedRoom.cols);
              
              let totalSeats = rCount * cCount;
              let activeSeats = 0;
              const isSkippingGaps = gapType === 'empty-seat' || (gapType === 'physical-gap' && gapAction === 'remove-seats');
              
              for (let r = 1; r <= rCount; r++) {
                const isRowGap = rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
                if (isRowGap && isSkippingGaps) continue;
                for (let c = 1; c <= cCount; c++) {
                  const isColGap = colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
                  if (isColGap && isSkippingGaps) continue;
                  activeSeats++;
                }
              }
              const utilPercent = ((activeSeats / totalSeats) * 100).toFixed(1);

              return (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                      Live Seating Preview — {selectedRoom.name}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-bold uppercase bg-gray-200 px-2 py-0.5 rounded">
                      {selectedRoom.rows} Rows x {selectedRoom.cols} Cols
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 text-left select-none">
                    <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100">
                      <span className="text-[9px] font-bold text-red-800 uppercase block tracking-wider">Active Capacity</span>
                      <span className="text-xs font-extrabold">{activeSeats} / {totalSeats} seats</span>
                    </div>
                    <div className="bg-blue-50 text-blue-700 p-2.5 rounded-xl border border-blue-100">
                      <span className="text-[9px] font-bold text-blue-800 uppercase block tracking-wider">Seating Rate</span>
                      <span className="text-xs font-extrabold">{utilPercent}%</span>
                    </div>
                    <div className="bg-gray-150 text-gray-700 p-2.5 rounded-xl border border-gray-200">
                      <span className="text-[9px] font-bold text-gray-650 uppercase block tracking-wider">Gap Seats</span>
                      <span className="text-xs font-extrabold">{totalSeats - activeSeats} seats</span>
                    </div>
                  </div>

                  {/* Room Grid Preview Container */}
                  <div className="flex-1 border border-gray-200 rounded-xl p-3 bg-white overflow-auto flex items-center justify-center min-h-[220px]">
                    {(() => {
                      const isBringTogether = gapType === 'physical-gap' && gapAction === 'bring-together';

                      const colTracks = [];
                      for (let c = 1; c <= cCount; c++) {
                        colTracks.push({ type: 'seat', originalCol: c });
                        if (isBringTogether && colGrouping > 0 && c % colGrouping === 0 && c !== cCount) {
                          colTracks.push({ type: 'spacer' });
                        }
                      }

                      const rowTracks = [];
                      for (let r = 1; r <= rCount; r++) {
                        rowTracks.push({ type: 'seat', originalRow: r });
                        if (isBringTogether && rowGrouping > 0 && r % rowGrouping === 0 && r !== rCount) {
                          rowTracks.push({ type: 'spacer' });
                        }
                      }

                      const gridColsTemplate = isBringTogether
                        ? colTracks.map(t => t.type === 'seat' ? '36px' : '10px').join(' ')
                        : `repeat(${cCount}, minmax(36px, 1fr))`;

                      const gridRowsTemplate = isBringTogether
                        ? rowTracks.map(t => t.type === 'seat' ? '36px' : '10px').join(' ')
                        : undefined;

                      return (
                        <div 
                          className="inline-grid gap-1.5 border p-2 bg-white rounded-lg shadow-sm"
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
                              const isRowGap = rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
                              const isColGap = colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
                              const isActive = !isRowGap && !isColGap;
                              const isHidden = !isActive && gapType === 'physical-gap';

                              return (
                                <div
                                  key={`${r}-${c}`}
                                  className={`w-9 h-9 rounded text-[9px] font-bold flex flex-col items-center justify-center transition-all ${
                                    (isActive || isBringTogether) 
                                      ? 'bg-red-50 border border-red-200 text-red-750' 
                                      : isHidden
                                        ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                                        : 'bg-gray-55 border border-gray-150 border-dashed text-gray-400'
                                  }`}
                                  title={(isActive || isBringTogether) ? `Seat ${r}-${c} (Active)` : `Seat ${r}-${c} (Empty Gap)`}
                                >
                                  {isHidden && !isBringTogether ? '' : (
                                    <>
                                      <span>{String.fromCharCode(65 + (r - 1) % 26)}{c}</span>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 text-[10px] border-t border-gray-200 pt-2 font-medium text-gray-500 shrink-0 select-none">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                      <span>Active Seat</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-50 border border-gray-150 border-dashed rounded"></div>
                      <span>Empty Gap</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-150 pt-3 mt-4 shrink-0">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
