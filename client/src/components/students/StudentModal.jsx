import React from "react";

export default function StudentModal({
  show,
  editingStudent,
  studentForm,
  setStudentForm,
  uniqueExamTypes,
  getFieldLabel,
  onClose,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-scaleIn mx-4">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
          {editingStudent ? "Edit Student Details" : "Add New Student"}
        </h3>
        
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">
              {getFieldLabel('identifier') || "Roll No"} *
            </label>
            <input
              type="text"
              required
              value={studentForm.roll}
              onChange={e => setStudentForm({ ...studentForm, roll: e.target.value })}
              placeholder="e.g. 233001"
              className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">
              {getFieldLabel('name') || "Student Name"}
            </label>
            <input
              type="text"
              value={studentForm.name}
              onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                {getFieldLabel('constraint_1') || "Dept/Sec/Stream"}
              </label>
              <input
                type="text"
                value={studentForm.dept}
                onChange={e => setStudentForm({ ...studentForm, dept: e.target.value })}
                placeholder="e.g. CSE"
                className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                {getFieldLabel('constraint_2') || "Sem/Class"} *
              </label>
              <input
                type="text"
                required
                value={studentForm.sem}
                onChange={e => setStudentForm({ ...studentForm, sem: e.target.value })}
                placeholder="e.g. 5"
                className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">
              Exam Type *
            </label>
            <select
              required
              value={studentForm.examType}
              onChange={e => setStudentForm({ ...studentForm, examType: e.target.value })}
              className="w-full mt-1 border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black cursor-pointer"
            >
              {uniqueExamTypes.map(et => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">
              Subjects (comma separated)
            </label>
            <input
              type="text"
              value={studentForm.subject}
              onChange={e => setStudentForm({ ...studentForm, subject: e.target.value })}
              placeholder="e.g. Mathematics, Physics, Chemistry"
              className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white text-black"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
