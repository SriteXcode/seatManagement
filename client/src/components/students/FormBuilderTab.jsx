import React, { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function FormBuilderTab({ token, decoded, showToast }) {
  const [selectedExamType, setSelectedExamType] = useState("College");
  const [activeFormId, setActiveFormId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [orgName, setOrgName] = useState("Your Institution");

  const [formConfig, setFormConfig] = useState({
    title: "Student Registration Form",
    description: "Please enter your details carefully to register.",
    isActive: false,
    dueDate: "",
    fields: []
  });

  const [allConfigs, setAllConfigs] = useState([]);

  const getDefaultFields = (examType) => {
    if (examType === "School") {
      return [
        { key: "roll", label: "Roll No", required: true, visible: true, placeholder: "e.g. 25", formatHelp: "Enter digits only" },
        { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. Alex Johnson", formatHelp: "" },
        { key: "dept", label: "Section", required: true, visible: true, placeholder: "e.g. A or B", formatHelp: "" },
        { key: "sem", label: "Class", required: true, visible: true, placeholder: "e.g. 10", formatHelp: "Grade number" },
        { key: "subject", label: "Subject", required: true, visible: true, placeholder: "e.g. Math, Science", formatHelp: "Comma separated" }
      ];
    } else if (examType === "Competitive") {
      return [
        { key: "roll", label: "Registration No", required: true, visible: true, placeholder: "e.g. COMP-2026-987", formatHelp: "Unique candidate ID" },
        { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. Sarah Smith", formatHelp: "" },
        { key: "dept", label: "Stream", required: true, visible: true, placeholder: "e.g. Engineering", formatHelp: "" },
        { key: "sem", label: "Subject", required: true, visible: true, placeholder: "e.g. Physics", formatHelp: "" }
      ];
    } else if (examType === "Invigilator") {
      return [
        { key: "name", label: "Full Name", required: true, visible: true, placeholder: "e.g. John Doe", formatHelp: "" },
        { key: "empId", label: "Employee ID", required: true, visible: true, placeholder: "e.g. EMP-101", formatHelp: "Unique ID" },
        { key: "dept", label: "Department", required: false, visible: true, placeholder: "e.g. Computer Science", formatHelp: "" },
        { key: "phone", label: "Phone", required: false, visible: true, placeholder: "e.g. +91 9876543210", formatHelp: "" },
        { key: "email", label: "Email Address", required: false, visible: true, placeholder: "e.g. professor@college.edu", formatHelp: "" }
      ];
    } else {
      return [
        { key: "roll", label: "Roll No", required: true, visible: true, placeholder: "e.g. 2023-CS-101", formatHelp: "Format: YYYY-DEPT-ID" },
        { key: "name", label: "Student Name", required: true, visible: true, placeholder: "e.g. John Doe", formatHelp: "" },
        { key: "dept", label: "Department", required: true, visible: true, placeholder: "e.g. CSE", formatHelp: "Use uppercase code" },
        { key: "sem", label: "Semester", required: true, visible: true, placeholder: "e.g. V", formatHelp: "Roman numerals" },
        { key: "subject", label: "Subject", required: true, visible: true, placeholder: "e.g. Computer Networks", formatHelp: "" }
      ];
    }
  };

  const fetchConfig = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch all configurations from the database
      const configs = await api.listFormConfigs(token);
      setAllConfigs(configs);

      // 2. Fetch public configuration to get institution name
      if (decoded?.adminCode) {
        const publicData = await api.getPublicFormConfig(decoded.adminCode, selectedExamType);
        if (publicData?.orgName) {
          setOrgName(publicData.orgName);
        }
      }

      // 3. Select active configuration under selected exam type
      const matched = configs.filter(c => c.examType === selectedExamType);
      if (matched.length > 0) {
        // Use currently activeFormId if it exists in matched, otherwise default to first form
        const target = activeFormId 
          ? (matched.find(m => m._id === activeFormId) || matched[0])
          : matched[0];

        setActiveFormId(target._id);
        
        let formattedDueDate = "";
        if (target.dueDate) {
          const dateObj = new Date(target.dueDate);
          const offset = dateObj.getTimezoneOffset();
          const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
          formattedDueDate = localDate.toISOString().slice(0, 16);
        }

        setFormConfig({
          title: target.title || `${selectedExamType} Registration Form`,
          description: target.description || "",
          isActive: target.isActive || false,
          dueDate: formattedDueDate,
          fields: target.fields || []
        });
      } else {
        // No configurations found: default to empty/unsaved setup
        setActiveFormId(null);
        setFormConfig({
          title: `${selectedExamType} Registration Form`,
          description: "Please enter your details carefully to register.",
          isActive: false,
          dueDate: "",
          fields: getDefaultFields(selectedExamType)
        });
      }
    } catch (err) {
      showToast(err.message || "Failed to load form configurations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [selectedExamType, token]);

  const handleSelectConfig = (config) => {
    setActiveFormId(config._id);
    let formattedDueDate = "";
    if (config.dueDate) {
      const dateObj = new Date(config.dueDate);
      const offset = dateObj.getTimezoneOffset();
      const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
      formattedDueDate = localDate.toISOString().slice(0, 16);
    }

    setFormConfig({
      title: config.title || `${selectedExamType} Registration Form`,
      description: config.description || "",
      isActive: config.isActive || false,
      dueDate: formattedDueDate,
      fields: config.fields || []
    });
  };

  const handleCreateNewForm = () => {
    setActiveFormId(null);
    setFormConfig({
      title: `New ${selectedExamType} Registration Form`,
      description: "Please fill out this form to register your details.",
      isActive: false,
      dueDate: "",
      fields: getDefaultFields(selectedExamType)
    });
  };

  const handleFieldChange = (key, property, value) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.key === key) {
          return { ...f, [property]: value };
        }
        return f;
      })
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const payload = {
        ...formConfig,
        examType: selectedExamType,
        _id: activeFormId
      };
      const saved = await api.saveFormConfigById(payload, token);
      
      let formattedDueDate = "";
      if (saved.dueDate) {
        const dateObj = new Date(saved.dueDate);
        const offset = dateObj.getTimezoneOffset();
        const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
        formattedDueDate = localDate.toISOString().slice(0, 16);
      }

      setFormConfig({
        title: saved.title,
        description: saved.description,
        isActive: saved.isActive,
        dueDate: formattedDueDate,
        fields: saved.fields
      });
      setActiveFormId(saved._id);
      showToast("Registration form saved successfully!", "success");

      // Reload config list
      const configs = await api.listFormConfigs(token);
      setAllConfigs(configs);
    } catch (err) {
      showToast(err.message || "Failed to save configuration", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!window.confirm("Are you sure you want to delete this registration form? This cannot be undone.")) return;
    try {
      await api.deleteFormConfigById(activeFormId, token);
      showToast("Registration form deleted successfully!", "success");
      
      setActiveFormId(null);
      
      const configs = await api.listFormConfigs(token);
      setAllConfigs(configs);
      const matched = configs.filter(c => c.examType === selectedExamType);
      if (matched.length > 0) {
        handleSelectConfig(matched[0]);
      } else {
        handleCreateNewForm();
      }
    } catch (err) {
      showToast(err.message || "Failed to delete form", "error");
    }
  };

  // Generate public registration URL using form ID (query string to work reliably on SPA deployment platforms like Render)
  const orgCode = decoded?.adminCode || "100000";
  const publicURL = activeFormId
    ? `${window.location.protocol}//${window.location.host}/?view=register&orgCode=${orgCode}&formId=${activeFormId}`
    : "";
  const qrCodeURL = publicURL 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicURL)}`
    : "";

  const copyToClipboard = () => {
    if (!publicURL) return;
    navigator.clipboard.writeText(publicURL);
    showToast("Registration link copied to clipboard!", "success");
  };

  const isCriticalField = (key) => {
    return key === "roll" || key === "sem" || key === "empId" || key === "name";
  };

  return (
    <div className="space-y-6">
      {/* Header and Exam Type Selector */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-905">Self-Registration Link & Form Builder</h2>
            <p className="text-xs text-gray-555 font-semibold mt-0.5 font-sans">
              Configure multiple custom registration forms and share links or QR codes for students or invigilators.
            </p>
          </div>

          {/* Dropdown Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <label className="text-xs font-bold text-gray-600">Exam Type:</label>
            <div className="relative">
              <select
                value={selectedExamType}
                onChange={(e) => {
                  setSelectedExamType(e.target.value);
                  setActiveFormId(null);
                }}
                className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-black cursor-pointer h-8 shadow-3xs"
              >
                <option value="College">College</option>
                <option value="School">School</option>
                <option value="Competitive">Competitive</option>
                <option value="Invigilator">Invigilator</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              </div>
            </div>
          </div>
        </div>

        {/* Available Forms Selection Panel */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none mr-2">Available Forms:</span>
          {allConfigs
            .filter(c => c.examType === selectedExamType)
            .map(config => (
              <button
                key={config._id}
                onClick={() => handleSelectConfig(config)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeFormId === config._id 
                    ? "bg-red-700 border-red-750 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {config.title || "Untitled Form"}
              </button>
            ))
          }
          <button
            onClick={handleCreateNewForm}
            className="px-3 py-1.5 rounded-xl border border-dashed border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 bg-transparent"
          >
            + Create New {selectedExamType} Form
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-gray-50/20 border border-gray-100 rounded-2xl min-h-[40vh]">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-700 animate-spin"></div>
          </div>
          <div className="text-center">
            <h3 className="text-xs font-bold text-gray-800">Loading Form Setup</h3>
            <p className="text-[10px] font-semibold text-gray-400">Fetching current config layouts...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Forms Status Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allConfigs.map((config) => {
              const configURL = `${window.location.protocol}//${window.location.host}/?view=register&orgCode=${orgCode}&formId=${config._id}`;
              const isExpired = config.dueDate && new Date() > new Date(config.dueDate);
              const statusText = config.isActive 
                ? (isExpired ? "Expired" : "Live") 
                : "Inactive";
              const statusColor = config.isActive
                ? (isExpired ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" : "bg-green-50 text-green-700 border-green-100")
                : "bg-gray-100 text-gray-500 border-gray-150";

              return (
                <div key={config._id} className={`bg-white border rounded-2xl shadow-3xs p-4 flex flex-col justify-between hover:shadow-xs transition-all ${
                  activeFormId === config._id ? "border-red-300 ring-2 ring-red-500/10" : "border-gray-100"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-50/50 px-2 py-0.5 rounded-lg">
                        {config.examType} Form
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 border rounded-full ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-805 line-clamp-1">{config.title}</h4>
                    <div className="text-[10px] text-gray-400 font-semibold space-y-1">
                      <div className="flex items-center gap-1">
                        <i className="las la-clock text-xs text-gray-400"></i>
                        <span>
                          {config.dueDate 
                            ? `Due: ${new Date(config.dueDate).toLocaleString()}` 
                            : "No deadline set"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-2.5">
                    <button
                      onClick={() => {
                        setSelectedExamType(config.examType);
                        handleSelectConfig(config);
                      }}
                      className="text-[10px] text-red-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5 bg-transparent border-0"
                    >
                      <i className="las la-edit"></i> Configure
                    </button>
                    {config.isActive && !isExpired && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(configURL);
                          showToast(`"${config.title}" copied!`, "success");
                        }}
                        className="text-[10px] text-gray-505 font-bold hover:text-gray-850 cursor-pointer flex items-center gap-0.5 bg-transparent border-0"
                      >
                        <i className="las la-copy"></i> Copy Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Configuration Options (7 cols on large screens) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Status & General Configuration */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-855 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <i className="las la-cog text-sm text-red-700"></i> General Configuration
                </h3>
                
                {/* Form Active Switch */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-gray-850">Form Registration Status</h4>
                    <p className="text-[10px] text-gray-455 font-semibold">
                      Toggle whether the public registration URL is active and accepting registrations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formConfig.isActive ? "bg-red-700" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formConfig.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Title and description */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Form Title</label>
                    <input
                      type="text"
                      value={formConfig.title}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Annual Semester Examinations Registration"
                      className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium text-black shadow-3xs"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Form Description / Instructions</label>
                    <textarea
                      rows="3"
                      value={formConfig.description}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={selectedExamType === "Invigilator" ? "Instructions shown to staff at the top of the form..." : "Instructions shown to students at the top of the form..."}
                      className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium text-black shadow-3xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase">Registration Due Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formConfig.dueDate || ""}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium text-black shadow-3xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Field Configuration Editor */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-805 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <i className="las la-list-ul text-sm text-red-700"></i> Field Settings & Helper Formats
                </h3>

                <div className="space-y-4 divide-y divide-gray-100">
                  {formConfig.fields.map((field, idx) => (
                    <div key={field.key} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{field.label}</span>
                          <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                            {field.key}
                          </span>
                        </div>
                        
                        {/* Checkboxes */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.visible}
                              disabled={isCriticalField(field.key)}
                              onChange={(e) => handleFieldChange(field.key, "visible", e.target.checked)}
                              className="rounded border-gray-300 text-red-700 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer accent-red-700"
                            />
                            Visible
                          </label>

                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={isCriticalField(field.key)}
                              onChange={(e) => handleFieldChange(field.key, "required", e.target.checked)}
                              className="rounded border-gray-300 text-red-700 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer accent-red-700"
                            />
                            Required
                          </label>
                        </div>
                      </div>

                      {field.visible && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-3 border-l-2 border-red-500/20">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-505 uppercase">Sample Value (Placeholder)</label>
                            <input
                              type="text"
                              value={field.placeholder}
                              onChange={(e) => handleFieldChange(field.key, "placeholder", e.target.value)}
                              placeholder={`e.g. Enter ${field.label}`}
                              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white text-black font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-505 uppercase">Format Helper Instructions</label>
                            <input
                              type="text"
                              value={field.formatHelp}
                              onChange={(e) => handleFieldChange(field.key, "formatHelp", e.target.value)}
                              placeholder="Explain the format to remove confusion..."
                              className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white text-black font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Buttons & Sharing */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-gray-400 font-semibold italic select-none">
                  * Note: Changes will go live instantly on the registration link.
                </span>
                <div className="flex items-center gap-2">
                  {activeFormId && (
                    <button
                      onClick={handleDeleteForm}
                      className="border border-red-200 hover:bg-red-55 text-red-750 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer bg-white"
                    >
                      Delete Form
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {saveLoading ? (
                      <>
                        <i className="las la-spinner animate-spin"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="las la-save"></i> Save Form Settings
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Live Form Preview & URL Share (5 cols on large screens) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Live Form Preview Visualizer */}
              <div className="bg-gray-100/60 border border-gray-200 rounded-2xl p-4 shadow-3xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-805 flex items-center gap-1">
                    <i className="las la-eye text-red-700"></i> Real-time Live Preview
                  </h4>
                  <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full animate-pulse">
                    Mockup Screen
                  </span>
                </div>

                {/* Mock Student Phone Screen */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden max-w-sm mx-auto text-left flex flex-col font-sans select-none">
                  
                  {/* Mock Institution Header */}
                  <div className="bg-red-750 text-white p-4 text-center shrink-0 border-b border-red-850">
                    <div className="text-[10px] font-extrabold tracking-wide uppercase opacity-75">{orgName}</div>
                    <h3 className="text-xs font-bold mt-1 line-clamp-1">{formConfig.title || "Registration Form"}</h3>
                  </div>

                  {/* Mock Form Content */}
                  <div className="p-4 space-y-3 overflow-y-auto max-h-[360px]">
                    
                    {/* Status indicator */}
                    {!formConfig.isActive && (
                      <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[10px] font-bold flex items-start gap-1.5">
                        <i className="las la-exclamation-triangle mt-0.5 shrink-0"></i>
                        <span>Registration form is currently CLOSED to students. Toggle status to open.</span>
                      </div>
                    )}

                    {formConfig.description && (
                      <p className="text-[10px] text-gray-550 font-semibold leading-relaxed bg-gray-50/50 p-2.5 border border-gray-100 rounded-xl">
                        {formConfig.description}
                      </p>
                    )}

                    {/* Due Date Indicator */}
                    {formConfig.dueDate && (
                      <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-805 text-[10px] font-bold flex items-start gap-1.5 animate-fadeIn">
                        <i className="las la-clock mt-0.5 shrink-0 text-blue-700"></i>
                        <div className="flex-1">
                          <span className="block">Deadline: {new Date(formConfig.dueDate).toLocaleString()}</span>
                          {new Date() > new Date(formConfig.dueDate) && (
                            <span className="text-red-700 font-extrabold uppercase text-[9px] block mt-0.5">
                              (Registration Closed)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mock Dynamic Fields */}
                    <div className="space-y-3">
                      {formConfig.fields
                        .filter(f => f.visible)
                        .map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-600">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type="text"
                              placeholder={field.placeholder || `Enter ${field.label}`}
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/30 text-gray-400 font-medium"
                              disabled
                            />
                            {field.formatHelp && (
                              <p className="text-[9px] text-gray-400 font-semibold flex items-center gap-1 pl-1">
                                <i className="las la-info-circle text-red-500/70"></i> {field.formatHelp}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Mock Submit Action */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled
                        className="w-full bg-red-750 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                      >
                        <i className="las la-check-circle"></i> Verify Details
                      </button>
                    </div>

                  </div>

                </div>
              </div>

              {/* Registration URL and QR Code Card */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-850 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <i className="las la-share-alt text-sm text-red-700"></i> Shareable Registration Link
                </h3>

                {/* Copyable input group */}
                {!activeFormId ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-150 rounded-xl text-yellow-855 text-xs font-bold text-center select-none leading-relaxed">
                    <i className="las la-exclamation-circle mr-1"></i>
                    Please save this new form first to generate its shareable link and QR code.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Registration Link</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={publicURL}
                          readOnly
                          onClick={(e) => e.target.select()}
                          className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 select-all"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-150 p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                          title="Copy Link"
                        >
                          <i className="las la-copy text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="text-[10px] font-bold text-gray-600">Scan QR Code to Register</div>
                      <div className="bg-white p-2.5 border border-gray-200 rounded-2xl shadow-xs">
                        <img
                          src={qrCodeURL}
                          alt="QR Code for Registration"
                          className="w-40 h-40 object-contain animate-fadeIn"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <a
                        href={qrCodeURL}
                        target="_blank"
                        rel="noreferrer"
                        download={`registration-qr-${formConfig.title}.png`}
                        className="text-[10px] font-bold text-red-755 hover:text-red-900 flex items-center gap-1 cursor-pointer"
                      >
                        <i className="las la-download"></i> View Full QR Code
                      </a>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
