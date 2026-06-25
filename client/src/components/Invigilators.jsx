import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API || "http://localhost:4000";

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const getAvatarBg = (name) => {
  const colors = [
    "bg-red-50 text-red-700 border border-red-200/50",
    "bg-blue-50 text-blue-700 border border-blue-200/50",
    "bg-green-50 text-green-700 border border-green-200/50",
    "bg-yellow-50 text-yellow-700 border border-yellow-200/50",
    "bg-purple-50 text-purple-700 border border-purple-200/50",
    "bg-pink-50 text-pink-700 border border-pink-200/50",
    "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
  ];
  if (!name) return colors[0];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const Invigilators = ({ token, invigilators, onAdd, onEdit, onDelete, onAssign, onRefresh, triggerConfirm, showToast, userRole = 'admin', setDialog }) => {
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    empId: '',
    dept: '',
    phone: '',
    email: '',
  });
  const [editingInvigilatorId, setEditingInvigilatorId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const [parsedCsvText, setParsedCsvText] = useState("");
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  const downloadTemplate = async (format = "xlsx") => {
    const headers = ["Full Name", "Employee ID", "Department", "Phone", "Email"];
    const sampleRow = {
      "Full Name": "John Doe",
      "Employee ID": "EMP-101",
      "Department": "Computer Science",
      "Phone": "+91 9876543210",
      "Email": "professor@college.edu"
    };

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        headers.map(h => `"${sampleRow[h]}"`).join(",")
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invigilator_template.csv`;
      a.click();
    } else {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `invigilator_template.xlsx`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setParsedCount(0);
    setParsedCsvText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const mapColumnsToGeneric = (sheetRows) => {
    if (sheetRows.length === 0) return "";
    
    const uploadedHeaders = sheetRows[0].map(h => (h || "").toString().trim().toLowerCase());
    const mappedRows = [];

    const nameIdx = uploadedHeaders.findIndex(h => ["name", "full name", "invigilator name", "staff name"].includes(h));
    const empIdIdx = uploadedHeaders.findIndex(h => ["employee id", "empid", "emp id", "id"].includes(h));
    const deptIdx = uploadedHeaders.findIndex(h => ["department", "dept"].includes(h));
    const phoneIdx = uploadedHeaders.findIndex(h => ["phone", "phone number", "mobile", "contact"].includes(h));
    const emailIdx = uploadedHeaders.findIndex(h => ["email", "email address"].includes(h));

    if (nameIdx === -1 || empIdIdx === -1) {
      const missing = [];
      if (nameIdx === -1) missing.push('"Full Name"');
      if (empIdIdx === -1) missing.push('"Employee ID"');
      
      const errMsg = `The uploaded template is missing one or more required column headers: ${missing.join(" and ")}.\n\nHeaders Found in Your Upload:\n${uploadedHeaders.length > 0 ? uploadedHeaders.map(h => `• ${h}`).join("\n") : "• (No headers found)"}`;
      
      if (showToast) {
        showToast(`Missing required columns: ${missing.join(" and ")}`, "error");
      } else {
        alert(errMsg);
      }
      return null;
    }

    const outputHeaders = ["name", "empId", "dept", "phone", "email"];
    mappedRows.push(outputHeaders.join(","));

    for (let r = 1; r < sheetRows.length; r++) {
      const row = sheetRows[r];
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const getVal = (idx) => {
        if (idx === -1) return "";
        return row[idx] !== undefined ? row[idx].toString().replace(/"/g, '""').trim() : "";
      };

      const name = getVal(nameIdx);
      const empId = getVal(empIdIdx);
      const dept = getVal(deptIdx);
      const phone = getVal(phoneIdx);
      const email = getVal(emailIdx);

      if (!name && !empId) continue;

      const values = [
        `"${name}"`,
        `"${empId}"`,
        `"${dept}"`,
        `"${phone}"`,
        `"${email}"`
      ];
      mappedRows.push(values.join(","));
    }

    return mappedRows.join("\n");
  };

  const processFile = (file) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      if (showToast) {
        showToast("Unsupported format! Upload CSV or Excel.", "error");
      } else {
        alert("Unsupported format! Upload CSV or Excel.");
      }
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();

    if (fileExtension === ".csv") {
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const text = e.target.result;
          const workbook = XLSX.read(text, { type: "string" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const mappedCsv = mapColumnsToGeneric(sheetRows);
          if (mappedCsv === null) {
            clearSelectedFile();
            return;
          }
          setParsedCount(Math.max(0, sheetRows.length - 1));
          setParsedCsvText(mappedCsv);
        } catch (error) {
          if (showToast) {
            showToast("Failed to parse CSV file.", "error");
          } else {
            alert("Failed to parse CSV file: " + error.message);
          }
          clearSelectedFile();
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const mappedCsv = mapColumnsToGeneric(sheetRows);
          if (mappedCsv === null) {
            clearSelectedFile();
            return;
          }
          setParsedCount(Math.max(0, sheetRows.length - 1));
          setParsedCsvText(mappedCsv);
        } catch (error) {
          if (showToast) {
            showToast("Failed to parse Excel file.", "error");
          } else {
            alert("Failed to parse Excel file: " + error.message);
          }
          clearSelectedFile();
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const getPreviewRows = () => {
    if (!parsedCsvText) return { headers: [], rows: [] };
    const lines = parsedCsvText.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      if (line.startsWith('"') && line.endsWith('"')) {
        return line.slice(1, -1).split('","');
      }
      return line.split(",");
    });
    return { headers, rows };
  };

  const preview = getPreviewRows();

  const getEmpIdsFromRawCsv = (csv) => {
    const lines = csv.split("\n").filter(line => line.trim());
    if (lines.length <= 1) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const empIdIdx = headers.indexOf("empid");
    if (empIdIdx === -1) return [];
    
    return lines.slice(1).map(line => {
      let cells = [];
      if (line.startsWith('"') && line.endsWith('"')) {
        cells = line.slice(1, -1).split('","');
      } else {
        cells = line.split(",");
      }
      return (cells[empIdIdx] || "").toString().trim();
    }).filter(Boolean);
  };

  const executeImport = async (csvData, cleanImport) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/staff/invigilators/import-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ csv: csvData, cleanImport })
      });
      const data = await res.json();
      
      if (res.ok && data.ok) {
        const totalSaved = (data.upserted || 0) + (data.matched || 0);
        if (showToast) {
          showToast("Invigilator roster processed successfully.", "success");
        }
        
        if (setDialog) {
          setDialog({
            isOpen: true,
            type: "alert",
            title: "Import Roster Summary",
            message: `Roster upload complete!\n\n• Total Rows Uploaded: ${parsedCount || data.total}\n• New Staff Added: ${data.upserted || 0}\n• Existing Staff Updated: ${data.matched || 0}\n• Total Saved/Updated: ${totalSaved}\n\n${
              totalSaved < (parsedCount || data.total)
                ? `⚠️ Note: Only ${totalSaved} out of ${parsedCount || data.total} rows were saved. Check if there were duplicates or empty fields.`
                : `All ${parsedCount || data.total} invigilator entries were successfully saved.`
            }\n\n${
              cleanImport ? "All existing invigilators and their assignments were cleared before importing." : ""
            }`,
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        }
        clearSelectedFile();
        setCsvText("");
        setShowManualPaste(false);
        if (onRefresh) onRefresh();
      } else {
        const errorMsg = data.error || "Import error";
        if (showToast) showToast(errorMsg, "error");
        else alert(errorMsg);
      }
    } catch (e) {
      if (showToast) showToast("Import failed: " + e.message, "error");
      else alert("Import failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const importParsedData = async () => {
    if (!parsedCsvText.trim()) {
      if (showToast) showToast("No parsed data found.", "error");
      return;
    }
    
    const uploadedEmpIds = getEmpIdsFromRawCsv(parsedCsvText);
    const existingEmpIds = invigilators.map(i => (i.empId || "").toString().trim()).filter(Boolean);
    const duplicates = uploadedEmpIds.filter(id => existingEmpIds.includes(id));

    if (duplicates.length > 0 && setDialog) {
      setDialog({
        isOpen: true,
        type: "import-conflict",
        conflictEntity: "invigilator",
        title: "Import Conflict Resolution",
        onConfirm: async (cleanImport) => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          await executeImport(parsedCsvText, cleanImport);
        },
        onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } else {
      await executeImport(parsedCsvText, false);
    }
  };

  const importCSV = async () => {
    if (!csvText.trim()) {
      if (showToast) showToast("Paste CSV first (Full Name, Employee ID, Department, Phone, Email)", "warning");
      return;
    }

    const lines = csvText.split("\n").filter(line => line.trim());
    if (lines.length === 0) return;

    let hasHeader = false;
    let cleanHeaders = [];
    if (lines.length > 0) {
      cleanHeaders = lines[0].split(",").map(h => h.trim().toLowerCase());
      hasHeader = cleanHeaders.includes("employee id") || 
                  cleanHeaders.includes("empid") || 
                  cleanHeaders.includes("emp id") || 
                  cleanHeaders.includes("name") || 
                  cleanHeaders.includes("full name");
    }

    let empIdIdx = 1;
    if (hasHeader) {
      empIdIdx = cleanHeaders.findIndex(h => ["employee id", "empid", "emp id", "id"].includes(h));
      if (empIdIdx === -1) empIdIdx = 1;
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const uploadedEmpIds = dataLines.map(line => {
      const cells = line.split(",");
      return (cells[empIdIdx] || "").toString().trim();
    }).filter(Boolean);

    const existingEmpIds = invigilators.map(i => (i.empId || "").toString().trim()).filter(Boolean);
    const duplicates = uploadedEmpIds.filter(id => existingEmpIds.includes(id));

    if (duplicates.length > 0 && setDialog) {
      setDialog({
        isOpen: true,
        type: "import-conflict",
        conflictEntity: "invigilator",
        title: "Import Conflict Resolution",
        onConfirm: async (cleanImport) => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          await executeImport(csvText, cleanImport);
        },
        onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } else {
      await executeImport(csvText, false);
    }
  };
  const [showAllInvigilators, setShowAllInvigilators] = useState(false);
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [distributors, setDistributors] = useState(2);
  
  const [availableOptions, setAvailableOptions] = useState([]); // [{ id, date, shift, roomId, roomName, label }]
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInvigilator((prev) => ({ ...prev, [name]: value }));
  };

  const loadOptions = async () => {
    if (!token) return;
    setLoadingOptions(true);
    setAvailableOptions([]);
    setSelectedOptionIds([]);
    try {
        const schedRes = await fetch(`${API}/schedules`, { headers: { Authorization: `Bearer ${token}` } });
        const schedules = await schedRes.json();
        
        if (!Array.isArray(schedules)) throw new Error("Failed to load schedules");

        const options = [];
        let optId = 1;

        for (const s of schedules) {
            const allotRes = await fetch(`${API}/allotments?shift=${s.shift}&date=${s.date}`, { headers: { Authorization: `Bearer ${token}` } });
            const allotments = await allotRes.json();
            
            if (Array.isArray(allotments) && allotments.length > 0) {
                const distinctRooms = {};
                allotments.forEach(a => {
                    if (!a.room) return;
                    const rId = a.room._id || a.room;
                    const rName = a.room.name || "Unknown";
                    distinctRooms[rId] = rName;
                });

                for (const [rId, rName] of Object.entries(distinctRooms)) {
                    options.push({
                        id: `opt_${optId++}`,
                        date: s.date,
                        shift: s.shift,
                        roomId: rId,
                        roomName: rName,
                        label: `${s.date} (Shift ${s.shift}) — ${rName}`
                    });
                }
            }
        }
        setAvailableOptions(options);

    } catch (e) {
        console.error(e);
        if (showToast) {
            showToast("Error loading schedule options: " + e.message, "error");
        } else {
            alert("Error loading schedule options: " + e.message);
        }
    } finally {
        setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (token) loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleOption = (optId) => {
    setSelectedOptionIds(prev => 
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
    );
  };

  const toggleAllOptions = () => {
    if (selectedOptionIds.length === availableOptions.length) {
        setSelectedOptionIds([]);
    } else {
        setSelectedOptionIds(availableOptions.map(o => o.id));
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (newInvigilator.name.trim() && newInvigilator.empId.trim()) {
      if (editingInvigilatorId) {
        onEdit(editingInvigilatorId, newInvigilator);
        setEditingInvigilatorId(null);
      } else {
        onAdd(newInvigilator);
      }
      setNewInvigilator({ name: '', empId: '', dept: '', phone: '', email: '' });
    } else {
      if (showToast) {
        showToast('Name and Employee ID are required.', 'error');
      } else {
        alert('Name and Employee ID are required.');
      }
    }
  };

  const startEdit = (inv) => {
    setEditingInvigilatorId(inv._id);
    setNewInvigilator({
      name: inv.name || '',
      empId: inv.empId || '',
      dept: inv.dept || '',
      phone: inv.phone || '',
      email: inv.email || '',
    });
    setShowForm(true);
    setTimeout(() => {
      const formElement = document.getElementById("invigilator-form-card");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const cancelEdit = () => {
    setEditingInvigilatorId(null);
    setNewInvigilator({ name: '', empId: '', dept: '', phone: '', email: '' });
    setShowForm(false);
  };

  const handleAssign = () => {
    if (selectedOptionIds.length === 0) {
        if (showToast) {
            showToast("Please select at least one Room/Schedule combination.", "warning");
        } else {
            alert("Please select at least one Room/Schedule combination.");
        }
        return;
    }

    const grouped = {};
    const dateGroups = {};

    selectedOptionIds.forEach(optId => {
        const opt = availableOptions.find(o => o.id === optId);
        if (opt) {
            const key = `${opt.date}_${opt.shift}`;
            if (!grouped[key]) {
                grouped[key] = { date: opt.date, shift: opt.shift, roomIds: [] };
            }
            if (!grouped[key].roomIds.includes(opt.roomId)) {
                grouped[key].roomIds.push(opt.roomId);
            }

            if (!dateGroups[opt.date]) {
                dateGroups[opt.date] = {
                    roomsCount: 0,
                    shifts: new Set()
                };
            }
            dateGroups[opt.date].roomsCount += 1;
            dateGroups[opt.date].shifts.add(opt.shift);
        }
    });

    const targetSchedules = Object.values(grouped);
    const totalRoomsCount = selectedOptionIds.length;

    // Calculate maximum required invigilators on any single date
    let requiredInvigilators = 0;
    Object.keys(dateGroups).forEach(date => {
        const group = dateGroups[date];
        const reqForDate = group.roomsCount * invigilatorsPerRoom + (distributors * group.shifts.size);
        if (reqForDate > requiredInvigilators) {
            requiredInvigilators = reqForDate;
        }
    });
    
    if (invigilators.length < requiredInvigilators) {
      if (triggerConfirm) {
        triggerConfirm(
          "Shortage of Invigilators",
          `Potential shortage of invigilators.\nSelected Combinations: ${totalRoomsCount}\nRequired (approx): ${requiredInvigilators}\nAvailable: ${invigilators.length}\n\nDo you want to proceed anyway?`,
          () => onAssign(invigilatorsPerRoom, distributors, targetSchedules)
        );
      } else {
        if (showToast) {
          showToast(`Cannot proceed: potential shortage of invigilators. Required (approx): ${requiredInvigilators}, Available: ${invigilators.length}`, "error");
        } else {
          alert(`Potential shortage of invigilators. Required (approx): ${requiredInvigilators}, Available: ${invigilators.length}`);
        }
      }
    } else {
      onAssign(invigilatorsPerRoom, distributors, targetSchedules);
    }
  };

  const filteredInvigilators = invigilators.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.empId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (inv.dept && inv.dept.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section id="Invigilators" className="space-y-6 animate-fadeIn select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs">
            <i className="las la-user-tie text-2xl"></i>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-855 tracking-tight leading-tight">Invigilator Staff Management</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Manage available teachers, configure configurations, and trigger auto-assignments.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2 transition-colors text-center font-bold shadow-3xs cursor-pointer flex items-center gap-1.5 shrink-0 sm:self-center"
        >
          <i className="las la-sync-alt text-sm"></i> Refetch Staff List
        </button>
      </div>

      {/* Bulk Import Card */}
      {userRole === "admin" && (
        <section className="bg-white shadow rounded-lg p-6 border border-gray-150 animate-fadeIn">
          <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-1.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Invigilators via Excel/CSV
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
            <div className="lg:col-span-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
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
                <div className="p-2.5 bg-red-50 rounded-full text-red-700 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p className="text-[10px] text-gray-550 mt-1 leading-relaxed font-semibold">
                  Get pre-formatted spreadsheet templates with the required columns for invigilators.
                </p>
              </div>
              <div className="flex gap-2.5 mt-4">
                <button
                  onClick={() => downloadTemplate("xlsx")}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-750 font-bold py-2 px-3 border border-gray-250 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  Excel Template
                </button>
                <button
                  onClick={() => downloadTemplate("csv")}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-755 font-bold py-2 px-3 border border-gray-250 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  CSV Template
                </button>
              </div>
            </div>
          </div>

          {/* Parsed File Preview Section */}
          {selectedFile && (
            <div id="uploaded-invig-data-preview" className="mb-4 border border-gray-200 rounded-2xl p-5 bg-white animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-green-50 text-green-700 rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{selectedFile.name}</h4>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Parsed {parsedCount} staff entries from uploaded file.</p>
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
                          {h === "name" ? "Full Name" : h === "empId" ? "Employee ID" : h === "dept" ? "Department" : h === "phone" ? "Phone" : h === "email" ? "Email Address" : h}
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
                  {loading ? "Importing..." : "Confirm & Import Staff"}
                </button>
              </div>
            </div>
          )}

          {/* Manual Paste Section */}
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
                  Provide comma-separated values matching: <strong>Full Name, Employee ID, Department, Phone, Email</strong>
                </p>
                <textarea
                  className="w-full h-32 border rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono text-black"
                  placeholder="John Doe,EMP-101,Computer Science,+91 9876543210,professor@college.edu&#10;Jane Smith,EMP-102,Mathematics,+91 9876543211,janesmith@college.edu"
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
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Section (2 columns if form visible, 3 columns if form hidden) */}
        <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6`}>
          
          {/* Assignment Selection Area */}
          {userRole === "admin" && (
            <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl shadow-3xs">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Select Date/Shift/Room Combinations</h3>
                  <p className="text-[10px] text-red-700 font-semibold mt-0.5">Choose which active room arrangements require invigilators.</p>
                </div>
                <button 
                  onClick={loadOptions} 
                  className="text-[10px] bg-white border border-red-150 px-3 py-1.5 rounded-xl font-bold text-red-700 hover:bg-red-50/50 shadow-3xs cursor-pointer transition-colors"
                >
                  {loadingOptions ? (
                    <span className="flex items-center gap-1"><i className="las la-spinner animate-spin"></i> Loading...</span>
                  ) : "Refresh Options"}
                </button>
              </div>

              {loadingOptions ? (
                <div className="text-center py-8 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-400 italic">
                  <i className="las la-spinner animate-spin mr-1.5 text-red-700 text-sm"></i> Loading available exam arrangements...
                </div>
              ) : availableOptions.length === 0 ? (
                <div className="text-center py-8 bg-white border border-dashed border-gray-200 rounded-2xl text-xs font-semibold text-gray-400 italic">
                  No scheduled allotments found. Allocate students to rooms inside the Allotment tab first.
                </div>
              ) : (
                <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                  <div className="flex justify-end mb-3 border-b border-gray-100 pb-2">
                    <button 
                      onClick={toggleAllOptions} 
                      className="text-[10px] text-red-700 hover:underline font-bold"
                    >
                      {selectedOptionIds.length === availableOptions.length ? "Deselect All Rooms" : "Select All Rooms"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {availableOptions.map(opt => {
                      const isSelected = selectedOptionIds.includes(opt.id);
                      return (
                        <label 
                          key={opt.id} 
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all duration-150 ${
                            isSelected 
                              ? 'bg-red-50/60 border-red-500 shadow-3xs ring-1 ring-red-500/20' 
                              : 'bg-white border-gray-150 hover:bg-gray-50/50 shadow-4xs'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleOption(opt.id)}
                            className="mt-0.5 rounded text-red-750 focus:ring-red-500/20 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs text-gray-855 tracking-tight">{opt.date}</span>
                            <span className="text-[10px] text-gray-500 font-bold mt-0.5">Shift {opt.shift} — {opt.roomName}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignment Controls */}
              <div className="mt-5 flex flex-wrap items-center gap-4 justify-between pt-4 border-t border-red-100/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-white border border-gray-150 rounded-xl px-3 py-1.5 shadow-3xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invigilators / Room</span>
                    <input
                      type="number"
                      value={invigilatorsPerRoom}
                      onChange={(e) => setInvigilatorsPerRoom(Number(e.target.value))}
                      className="p-1 border border-gray-200 focus:outline-none focus:border-red-500 rounded-lg w-12 text-center text-xs font-bold bg-white text-gray-800"
                      min="1"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-gray-150 rounded-xl px-3 py-1.5 shadow-3xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Distributors</span>
                    <input
                      type="number"
                      value={distributors}
                      onChange={(e) => setDistributors(Number(e.target.value))}
                      className="p-1 border border-gray-200 focus:outline-none focus:border-red-500 rounded-lg w-12 text-center text-xs font-bold bg-white text-gray-800"
                      min="0"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={selectedOptionIds.length === 0}
                  className={`font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                    selectedOptionIds.length === 0 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' 
                      : 'bg-red-700 hover:bg-red-800 text-white'
                  }`}
                >
                  <i className="las la-user-cog text-sm"></i> Run Auto-Assignment
                </button>
              </div>
            </div>
          )}

          {/* Current Invigilators Directory Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-extrabold text-gray-855 uppercase tracking-wider">Staff Directory ({filteredInvigilators.length})</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">List of all registered invigilators</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {userRole === "admin" && (
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setTimeout(() => {
                        const formElement = document.getElementById("invigilator-form-card");
                        if (formElement) {
                          formElement.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 100);
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Invigilator
                  </button>
                )}
                <div className="relative w-full md:w-48">
                  <input
                    type="text"
                    placeholder="Search name, ID or dept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/15 focus:border-red-500 rounded-xl px-3 py-1.5 pl-8 text-xs bg-white text-gray-800 font-bold shadow-3xs transition-all"
                  />
                  <i className="las la-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                </div>
              </div>
            </div>

            {filteredInvigilators.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(showAllInvigilators ? filteredInvigilators : filteredInvigilators.slice(0, 4)).map((invigilator) => (
                    <div 
                      key={invigilator._id} 
                      className="flex items-center gap-3.5 p-3.5 bg-white border border-gray-150 rounded-2xl shadow-3xs hover:shadow-xs transition-all animate-fadeIn"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs shadow-3xs ${getAvatarBg(invigilator.name)}`}>
                        {getInitials(invigilator.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-gray-855 truncate">{invigilator.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 flex items-center gap-1.5">
                          <span>ID: {invigilator.empId}</span>
                          {invigilator.dept && (
                            <>
                              <span className="text-gray-300 font-extrabold">•</span>
                              <span className="text-red-750 font-extrabold">{invigilator.dept}</span>
                            </>
                          )}
                        </div>
                        {(invigilator.phone || invigilator.email) && (
                          <div className="flex flex-col gap-2.5 mt-2">
                            {invigilator.phone && (
                              <a 
                                href={`tel:${invigilator.phone}`} 
                                className="text-[9px] text-gray-550 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                                title={`Call ${invigilator.name}`}
                              >
                                <i className="las la-phone text-xs"></i> {invigilator.phone}
                              </a>
                            )}
                            {invigilator.email && (
                              <a 
                                href={`mailto:${invigilator.email}`} 
                                className="text-[9px] text-gray-550 hover:text-red-700 font-bold flex items-center gap-1 transition-colors truncate max-w-[130px]"
                                title={`Email ${invigilator.name}`}
                              >
                                <i className="las la-envelope text-xs"></i> {invigilator.email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => startEdit(invigilator)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-gray-150 cursor-pointer transition-colors"
                            title="Edit staff details"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              triggerConfirm(
                                "Delete Invigilator",
                                `Are you sure you want to delete "${invigilator.name}"? This deletes all their exam assignments.`,
                                () => onDelete(invigilator._id, invigilator.name)
                              );
                            }}
                            className="p-1.5 text-red-650 hover:text-red-700 hover:bg-red-50 rounded-lg border border-gray-150 cursor-pointer transition-colors"
                            title="Delete staff member"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredInvigilators.length > 4 && (
                  <div className="flex justify-center mt-5 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowAllInvigilators(!showAllInvigilators)}
                      className="text-xs border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-extrabold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-3xs"
                    >
                      {showAllInvigilators ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-500 transition-transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          See Less
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          See More ({filteredInvigilators.length - 4} more)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50/30 border border-dashed border-gray-250 rounded-2xl">
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="las la-user-slash text-2xl"></i>
                </div>
                <span className="font-extrabold text-xs text-gray-800 block">No staff members found</span>
                <span className="text-[10px] text-gray-550 mt-1 block font-bold">Try clearing your search query or add a new teacher.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section (1 column): Form Card (Sticky) */}
        {showForm && userRole === "admin" && (
          <div className="lg:sticky lg:top-4 space-y-4">
            <form onSubmit={handleSubmitForm} id="invigilator-form-card" className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs animate-fadeIn space-y-4 relative">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  cancelEdit();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-605 p-1 border border-gray-150 rounded-lg hover:bg-gray-55 cursor-pointer"
                title="Close form"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h3 className="text-xs font-extrabold text-gray-855 uppercase tracking-wider">
                  {editingInvigilatorId ? 'Edit Invigilator' : 'Add New Invigilator'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {editingInvigilatorId ? 'Modify credentials for this staff member' : 'Enter credentials for a new staff member'}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newInvigilator.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-805 font-bold shadow-3xs transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    name="empId"
                    value={newInvigilator.empId}
                    onChange={handleInputChange}
                    placeholder="e.g. EMP-101"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-805 font-bold shadow-3xs transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    name="dept"
                    value={newInvigilator.dept}
                    onChange={handleInputChange}
                    placeholder="e.g. Computer Science"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={newInvigilator.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 9876543210"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={newInvigilator.email}
                    onChange={handleInputChange}
                    placeholder="e.g. professor@college.edu"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  {editingInvigilatorId ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  ) : (
                    <>
                      <i className="las la-plus-circle text-sm mr-1"></i> Add Invigilator
                    </>
                  )}
                </button>
                {editingInvigilatorId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-full bg-white hover:bg-gray-50 border border-gray-250 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-3xs transition-all cursor-pointer text-xs"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};

export default Invigilators;