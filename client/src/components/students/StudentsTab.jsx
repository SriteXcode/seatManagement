import React from "react";
import FieldsConfig from "./FieldsConfig";

export default function StudentsTab({
  userRole,
  selectedExamType,
  setSelectedExamType,
  uniqueExamTypes,
  activeConfig,
  updateFieldLabel,
  updateFieldSampleValue,
  removeCustomField,
  addCustomField,
  createNewExamType,
  deleteActiveExamType,
  saveExamConfig,
  downloadTemplate,
  csvText,
  setCsvText,
  importCSV,
  selectedFile,
  isDragging,
  parsedCount,
  parsedCsvText,
  clearSelectedFile,
  importParsedData,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileSelect,
  fileInputRef,
  showManualPaste,
  setShowManualPaste,
  getPreviewRows,
  studentSearchQuery,
  setStudentSearchQuery,
  studentFilterDept,
  setStudentFilterDept,
  studentFilterSem,
  setStudentFilterSem,
  studentFilterExamType,
  setStudentFilterExamType,
  studentFilterSubject,
  setStudentFilterSubject,
  uniqueDepts,
  uniqueSems,
  uniqueSubjects,
  filteredStudents,
  studentPage,
  setStudentPage,
  openStudentModal,
  handleDeleteStudent,
  handleExportStudentsCSV,
  getFieldLabel,
  getHeaderLabel,
  loading,
}) {
  const [viewingStudent, setViewingStudent] = React.useState(null);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = React.useMemo(() => {
    const start = (studentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, studentPage]);

  React.useEffect(() => {
    if (selectedFile) {
      const timer = setTimeout(() => {
        const previewElement = document.getElementById("uploaded-data-preview");
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedFile]);

  const preview = getPreviewRows();

  return (
    <div id="Students">
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-semibold text-red-700 mb-2">1) Import Students</h3>
        
        {userRole === "admin" ? (
          <>
            <FieldsConfig
              selectedExamType={selectedExamType}
              setSelectedExamType={setSelectedExamType}
              uniqueExamTypes={uniqueExamTypes}
              activeConfig={activeConfig}
              updateFieldLabel={updateFieldLabel}
              updateFieldSampleValue={updateFieldSampleValue}
              removeCustomField={removeCustomField}
              addCustomField={addCustomField}
              createNewExamType={createNewExamType}
              deleteActiveExamType={deleteActiveExamType}
              saveExamConfig={saveExamConfig}
              userRole={userRole}
            />

            {/* Drag and Drop Box */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                    isDragging
                      ? "border-red-500 bg-red-50/20 scale-[1.01]"
                      : "border-gray-250 hover:border-red-400 hover:bg-gray-50/30"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                  />
                  <div className="p-3 bg-red-50 rounded-full text-red-700 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    Drag and drop your CSV or Excel file here, or <span className="text-red-700 hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">Supports CSV, XLSX, XLS format</p>
                </div>
              </div>

              {/* Template Download Guide */}
              <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/20 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Download Template Document</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    Ensure columns match configured settings exactly. Click buttons below to get matching templates.
                  </p>
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={() => downloadTemplate("xlsx")}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 border border-gray-250 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    Excel Template
                  </button>
                  <button
                    onClick={() => downloadTemplate("csv")}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-3 border border-gray-250 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    CSV Template
                  </button>
                </div>
              </div>
            </div>

            {/* Parsed File Preview Section */}
            {selectedFile && (
              <div id="uploaded-data-preview" className="mb-6 border border-gray-200 rounded-2xl p-5 bg-white animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-green-50 text-green-700 rounded-xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{selectedFile.name}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Parsed {parsedCount} student entries from uploaded file.</p>
                    </div>
                  </div>
                  <button
                    onClick={clearSelectedFile}
                    className="text-gray-400 hover:text-gray-600 p-1 border border-gray-150 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Spreadsheet Grid Preview */}
                <div className="overflow-x-auto border border-gray-150 rounded-xl max-h-56">
                  <table className="min-w-full divide-y divide-gray-150 text-xs">
                    <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-xs">
                      <tr>
                        {preview.headers.map((h, i) => (
                          <th key={i} className="px-4 py-2 text-left font-bold text-gray-600 uppercase tracking-wider border-r border-gray-150/70 last:border-r-0">
                            {getHeaderLabel(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {preview.rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2 font-medium text-gray-700 border-r border-gray-100 last:border-r-0 max-w-[200px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 5 && (
                  <p className="text-[9px] text-gray-400 mt-2 italic font-semibold">Showing top 5 preview rows out of {preview.rows.length} total entries.</p>
                )}

                <div className="flex justify-end gap-2.5 mt-5 border-t border-gray-100 pt-3.5">
                  <button
                    onClick={clearSelectedFile}
                    className="border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-1.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={importParsedData}
                    disabled={loading}
                    className="bg-red-700 hover:bg-red-800 disabled:bg-gray-300 text-white font-bold py-1.5 px-5 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                  >
                    {loading ? "Importing..." : "Confirm & Import Roster"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 italic mb-4">File imports are restricted to Administrator accounts.</p>
        )}

        {/* Manual Paste Section */}
        {userRole === "admin" && (
          <div className="border-t border-gray-100 pt-4 mt-2">
            <button
              onClick={() => setShowManualPaste(!showManualPaste)}
              className="text-xs text-red-700 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showManualPaste ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Or manually paste raw CSV data
            </button>
            
            {showManualPaste && (
              <div className="mt-4 p-4 border border-gray-200 bg-gray-50/50 rounded-xl space-y-3 animate-fadeIn">
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  Provide comma-separated values matching fields. Headers should be: 
                  <strong className="text-gray-700 ml-1">
                    {activeConfig.fields.map(f => f.label).join(", ")}
                  </strong>
                </p>
                <textarea
                  className="w-full h-32 border rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono text-black"
                  placeholder="233001,John Doe,CSE,5&#10;233002,Jane Smith,ECE,5"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={importCSV}
                    disabled={loading}
                    className="bg-red-700 hover:bg-red-800 disabled:bg-gray-300 text-white font-bold py-1.5 px-4 rounded-xl text-xs cursor-pointer shadow-sm"
                  >
                    {loading ? "Importing..." : "Import CSV Text"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Student Roster Section */}
      <section className="bg-white shadow rounded-lg p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between border-b border-gray-150 pb-2 mb-4 gap-4 select-none">
          <h3 className="text-md font-semibold text-red-700">Student Directory / Roster</h3>
          <div className="flex flex-wrap gap-2.5 items-center">
            {userRole === "admin" && (
              <button
                onClick={() => openStudentModal(null)}
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer"
              >
                + Add Student
              </button>
            )}
            <button
              onClick={handleExportStudentsCSV}
              disabled={filteredStudents.length === 0}
              className="border border-gray-250 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 mb-5 select-none">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder={`Search ${getFieldLabel('identifier')} or Name...`}
              value={studentSearchQuery}
              onChange={e => setStudentSearchQuery(e.target.value)}
              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 text-xs bg-white text-black"
            />
          </div>
          <div>
            <select
              value={studentFilterDept}
              onChange={e => setStudentFilterDept(e.target.value)}
              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black cursor-pointer font-medium"
            >
              <option value="">Filter {getFieldLabel('constraint_1') || "Dept"}</option>
              {uniqueDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={studentFilterSem}
              onChange={e => setStudentFilterSem(e.target.value)}
              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black cursor-pointer font-medium"
            >
              <option value="">Filter {getFieldLabel('constraint_2') || "Sem"}</option>
              {uniqueSems.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={studentFilterSubject}
              onChange={e => setStudentFilterSubject(e.target.value)}
              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black cursor-pointer font-medium"
            >
              <option value="">Filter Subject</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto border border-gray-150 rounded-xl">
          <table className="min-w-full divide-y divide-gray-150 text-xs">
            <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-xs select-none">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">{getFieldLabel('identifier') || "Roll No"}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">{getFieldLabel('name') || "Student Name"}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Exam Type</th>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">{getFieldLabel('constraint_1') || "Dept"}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">{getFieldLabel('constraint_2') || "Sem"}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Subjects</th>
                <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 bg-white">
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                    No students matching criteria found in directory.
                  </td>
                </tr>
              ) : (
                currentStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-bold text-gray-900">{student.roll}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{student.name || "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className="bg-red-50 text-red-700 border border-red-100 font-extrabold uppercase px-2 py-0.5 rounded text-[9px]">
                        {student.examType || "College"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-750">{student.dept || "-"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-750">{student.sem || "-"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-600">
                      {Array.isArray(student.subject) ? student.subject.join(", ") : (student.subject || "-")}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setViewingStudent(student)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        Details
                      </button>
                      {userRole === "admin" && (
                        <>
                          <button
                            onClick={() => openStudentModal(student)}
                            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student._id)}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 border-t border-gray-100 pt-3 select-none">
            <div className="text-xs font-semibold text-gray-500">
              Showing page {studentPage} of {totalPages} ({filteredStudents.length} students)
            </div>
            <div className="flex gap-2">
              <button
                disabled={studentPage === 1}
                onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={studentPage === totalPages}
                onClick={() => setStudentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Student Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 animate-scaleIn mx-4 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="p-1.5 bg-red-50 text-red-700 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Student Profile & Submitted Details
              </h3>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-gray-400 hover:text-gray-600 p-1 border border-gray-150 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1 text-black">
              {/* Primary Fields Grid */}
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getFieldLabel('identifier') || "Roll No"}</span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">{viewingStudent.roll}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getFieldLabel('name') || "Student Name"}</span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">{viewingStudent.name || "-"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getFieldLabel('constraint_1') || "Department/Section"}</span>
                  <span className="text-xs font-semibold text-gray-700 mt-0.5 block">{viewingStudent.dept || "-"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{getFieldLabel('constraint_2') || "Semester/Class"}</span>
                  <span className="text-xs font-semibold text-gray-700 mt-0.5 block">{viewingStudent.sem || "-"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Exam Type</span>
                  <span className="mt-1 inline-block bg-red-50 text-red-700 border border-red-100 font-extrabold uppercase px-2 py-0.5 rounded text-[9px]">
                    {viewingStudent.examType || "College"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shift</span>
                  <span className="text-xs font-semibold text-gray-700 mt-0.5 block">Shift {viewingStudent.shift || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subjects</span>
                  <span className="text-xs font-medium text-gray-700 mt-0.5 block">
                    {Array.isArray(viewingStudent.subject) ? viewingStudent.subject.join(", ") : (viewingStudent.subject || "-")}
                  </span>
                </div>
              </div>

              {/* Dynamic Metadata Fields Section */}
              <div>
                <h4 className="text-[11px] font-extrabold text-red-700 uppercase tracking-wider border-b border-red-100 pb-1.5 mb-3 flex items-center gap-1.5 select-none">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Custom Form / CSV Submission Details
                </h4>
                {viewingStudent.metadata && Object.keys(viewingStudent.metadata).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(viewingStudent.metadata).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50/20 hover:bg-gray-50/55 border border-gray-150/70 rounded-xl transition-all">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{key}</span>
                        <span className="text-xs font-bold text-gray-800 text-right max-w-[65%] break-words">{val || "-"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-gray-50/25 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-400 italic">No custom fields or metadata submitted for this student.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
