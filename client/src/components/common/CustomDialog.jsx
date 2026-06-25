import React from "react";

export default function CustomDialog({ dialog, bucketLength, onClose }) {
  if (!dialog || !dialog.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-scaleIn mx-4">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">{dialog.title}</h3>
        
        <div className="mt-4">
          {dialog.message && (
            <p className="text-xs text-gray-600 mb-4 whitespace-pre-line leading-relaxed">
              {dialog.message}
            </p>
          )}
          
          {dialog.type === 'confirm-generation' && bucketLength > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-gray-50 border border-gray-150 rounded-xl">
              <input
                type="checkbox"
                id="dialog-include-bucket-checkbox"
                defaultChecked={true}
                className="rounded text-red-700 focus:ring-red-500 w-4 h-4 cursor-pointer"
              />
              <label 
                htmlFor="dialog-include-bucket-checkbox" 
                className="text-xs font-semibold text-gray-700 cursor-pointer select-none"
              >
                Include staging bucket students ({bucketLength} students)
              </label>
            </div>
          )}

          {dialog.type === 'import-conflict' && (
            <div className="mt-3 p-3.5 bg-red-50/50 border border-red-100 rounded-xl text-xs text-gray-700 leading-relaxed space-y-2 select-none">
              <p className="font-bold text-red-800">Duplicate {dialog.conflictEntity === 'invigilator' ? 'Employee IDs' : 'Roll Numbers'} Detected</p>
              <p>We found matching {dialog.conflictEntity === 'invigilator' ? 'invigilator employee IDs' : 'student roll numbers'} already saved in the database.</p>
              <p className="font-semibold text-gray-800">Please choose one of the following resolution strategies:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 font-semibold">
                <li><strong className="text-gray-800">Overwrite & Merge:</strong> Overwrites only the duplicate entries, keeping other existing {dialog.conflictEntity === 'invigilator' ? 'invigilators' : 'students'} intact.</li>
                <li><strong className="text-gray-800">Clear & Re-import:</strong> Deletes all existing {dialog.conflictEntity === 'invigilator' ? 'invigilators' : 'students'} first, performing a completely clean import.</li>
              </ul>
            </div>
          )}

          {/* Inputs for Prompt/Text Input dialogs */}
          {dialog.type === 'prompt-exam' && (
            <input
              type="text"
              placeholder={dialog.placeholder}
              defaultValue={dialog.defaultValue}
              id="dialog-input-val"
              autoFocus
              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm bg-white text-black"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  dialog.onConfirm(e.target.value);
                }
              }}
            />
          )}
          {dialog.type === 'prompt-field' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Field Label Name</label>
                <input
                  type="text"
                  placeholder="e.g. Contact No"
                  id="dialog-input-label"
                  autoFocus
                  className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium text-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const labelEl = document.getElementById("dialog-input-label");
                      const sampleEl = document.getElementById("dialog-input-sample");
                      dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Sample Value (for Excel/CSV Template)</label>
                <input
                  type="text"
                  placeholder="e.g. +1234567890"
                  id="dialog-input-sample"
                  className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium text-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const labelEl = document.getElementById("dialog-input-label");
                      const sampleEl = document.getElementById("dialog-input-sample");
                      dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Inputs for Select Class on Mobile */}
          {dialog.type === 'select-class' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                Select Class (Room)
              </label>
              <select
                id="dialog-room-select"
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 rounded-xl px-3 py-2 text-xs font-bold bg-white text-gray-800 cursor-pointer shadow-3xs transition-all"
              >
                {dialog.rooms?.map(room => (
                  <option key={room._id} value={room._id}>
                    {room.name} ({room.rows}x{room.cols})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input fields for Add/Edit Room modal */}
          {(dialog.type === 'add-room' || dialog.type === 'edit-room') && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Room Name (e.g. A1)</label>
                <input
                  type="text"
                  id="room-name-input"
                  placeholder="e.g. A1"
                  defaultValue={dialog.fields?.name || ""}
                  autoFocus
                  className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Rows</label>
                  <input
                    type="number"
                    id="room-rows-input"
                    defaultValue={dialog.fields?.rows || "10"}
                    min="1"
                    className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Columns</label>
                  <input
                    type="number"
                    id="room-cols-input"
                    defaultValue={dialog.fields?.cols || "10"}
                    min="1"
                    className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
          {dialog.type === 'import-conflict' ? (
            <>
              <button
                onClick={dialog.onCancel || onClose}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => dialog.onConfirm(false)}
                className="border border-red-200 hover:bg-red-55 text-red-700 font-bold py-2 px-3.5 rounded-lg text-xs transition-colors cursor-pointer animate-fadeIn"
              >
                Overwrite & Merge
              </button>
              <button
                onClick={() => dialog.onConfirm(true)}
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3.5 rounded-lg text-xs transition-colors shadow cursor-pointer animate-fadeIn"
              >
                Clear & Re-import
              </button>
            </>
          ) : (
            <>
              {dialog.type !== 'alert' && (
                <button
                  onClick={dialog.onCancel || onClose}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === 'prompt-exam') {
                    const el = document.getElementById("dialog-input-val");
                    dialog.onConfirm(el ? el.value : "");
                  } else if (dialog.type === 'prompt-field') {
                    const labelEl = document.getElementById("dialog-input-label");
                    const sampleEl = document.getElementById("dialog-input-sample");
                    dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                  } else if (dialog.type === 'add-room' || dialog.type === 'edit-room') {
                    const name = document.getElementById("room-name-input")?.value || "";
                    const rows = document.getElementById("room-rows-input")?.value || "10";
                    const cols = document.getElementById("room-cols-input")?.value || "10";
                    dialog.onConfirm({ name, rows, cols });
                  } else if (dialog.type === 'confirm-generation') {
                    const checkboxEl = document.getElementById("dialog-include-bucket-checkbox");
                    const includeBucket = checkboxEl ? checkboxEl.checked : true;
                    dialog.onConfirm(includeBucket);
                  } else if (dialog.type === 'select-class') {
                    const roomSelect = document.getElementById("dialog-room-select");
                    const selectedRoomId = roomSelect ? roomSelect.value : "";
                    dialog.onConfirm(selectedRoomId);
                  } else {
                    dialog.onConfirm();
                  }
                }}
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow cursor-pointer"
              >
                {dialog.type === 'alert' ? 'OK' : 'Confirm'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
