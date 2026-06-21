import React, { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function PublicRegistration({ orgCode, formId, examType, showToast }) {
  const [step, setStep] = useState(1); // 1: Enter, 2: Verify, 3: Success
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [orgName, setOrgName] = useState("Institution");
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        setLoading(true);
        const data = formId 
          ? await api.getPublicFormConfigById(orgCode, formId)
          : await api.getPublicFormConfig(orgCode, examType);
        setFormConfig(data);
        setOrgName(data.orgName || "Institution");
        
        // Initialize form data fields
        if (data.fields) {
          const initData = {};
          data.fields.forEach(f => {
            if (f.visible) {
              initData[f.key] = "";
            }
          });
          setFormData(initData);
        }
      } catch (err) {
        showToast(err.message || "Failed to load registration details", "error");
      } finally {
        setLoading(false);
      }
    };

    if (orgCode && (formId || examType)) {
      fetchPublicConfig();
    }
  }, [orgCode, formId, examType]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formConfig || !formConfig.fields) return false;

    formConfig.fields.forEach(f => {
      if (f.visible && f.required) {
        const val = formData[f.key];
        if (val === undefined || val === null || val.toString().trim() === "") {
          newErrors[f.key] = `${f.label} is required.`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyStep = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showToast("Please fill in all required fields accurately.", "error");
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      if (formId) {
        await api.registerStudentPublicById(orgCode, formId, formData);
      } else {
        await api.registerStudentPublic(orgCode, examType, formData);
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Registration submitted successfully!", "success");
    } catch (err) {
      showToast(err.message || "Registration failed. Please try again.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-700 animate-spin"></div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-gray-805">Loading Registration Form</h3>
          <p className="text-[11px] font-semibold text-gray-400">Verifying secure database portal...</p>
        </div>
      </div>
    );
  }

  // If configuration is inactive, not found, or past due date
  const isPastDueDate = formConfig?.dueDate ? new Date() > new Date(formConfig.dueDate) : false;

  if (!formConfig || !formConfig.isActive || isPastDueDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="bg-white border border-gray-155 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-750 border border-red-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <i className="las la-ban text-3xl"></i>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-gray-900">{orgName}</h1>
            <h2 className="text-sm font-bold text-gray-650">{formConfig?.title || `${examType} Registration Form`}</h2>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-805 text-xs font-bold leading-relaxed">
            <i className="las la-exclamation-triangle mr-1"></i>
            {isPastDueDate 
              ? `Registration has closed. The deadline of ${new Date(formConfig.dueDate).toLocaleString()} has passed.`
              : "Registration form is currently closed or inactive. Please contact the administrator."
            }
          </div>
          <p className="text-[10px] text-gray-400 font-semibold">
            System Code: {orgCode} • Exam Type: {examType}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between py-12 px-4 sm:px-6 font-sans">
      
      <div className="max-w-xl w-full mx-auto space-y-6 print:py-0 print:my-0 print:shadow-none">
        
        {/* Registration Header */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-6 text-center space-y-3 print:border-none print:shadow-none">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-red-700 uppercase bg-red-50/70 px-3 py-1 rounded-full border border-red-100/50">
              {orgName}
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-905 mt-3 leading-tight">
              {formConfig.title}
            </h1>
          </div>
          
          {/* Stepper Progress Indicator (hide on print) */}
          {step < 3 && (
            <div className="pt-4 flex items-center justify-center gap-2 select-none print:hidden">
              <span className={`w-8 h-8 rounded-full border font-bold text-xs flex items-center justify-center transition-all ${
                step >= 1 ? "bg-red-700 border-red-700 text-white" : "bg-white border-gray-200 text-gray-400"
              }`}>1</span>
              <div className="w-10 h-0.5 bg-gray-200"></div>
              <span className={`w-8 h-8 rounded-full border font-bold text-xs flex items-center justify-center transition-all ${
                step >= 2 ? "bg-red-700 border-red-700 text-white" : "bg-white border-gray-200 text-gray-400"
              }`}>2</span>
            </div>
          )}
        </div>

        {/* STEP 1: Enter Details */}
        {step === 1 && (
          <form onSubmit={handleVerifyStep} className="bg-white border border-gray-100 rounded-2xl shadow-2xs p-6 space-y-5 print:hidden">
            <h3 className="text-xs font-bold text-gray-805 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
              <i className="las la-edit text-sm text-red-700"></i> Enter Information
            </h3>

            {formConfig.description && (
              <p className="text-xs text-gray-500 font-semibold leading-relaxed bg-gray-50/60 p-3.5 border border-gray-100 rounded-xl">
                {formConfig.description}
              </p>
            )}

            {formConfig.dueDate && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs font-bold flex items-center gap-2 animate-fadeIn select-none">
                <i className="las la-clock text-base text-blue-700"></i>
                <div>
                  <span className="block font-bold">Registration Deadline:</span>
                  <span className="text-[11px] font-extrabold text-blue-900">
                    {new Date(formConfig.dueDate).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {formConfig.fields
                .filter(f => f.visible)
                .map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                      {errors[field.key] && (
                        <span className="text-[10px] text-red-650 font-bold animate-pulse">
                          <i className="las la-exclamation-circle mr-0.5"></i> {errors[field.key]}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData[field.key] || ""}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      className={`w-full border rounded-xl px-3.5 py-2 text-xs bg-white text-black font-semibold shadow-3xs focus:outline-none focus:ring-2 ${
                        errors[field.key] 
                          ? "border-red-400 focus:ring-red-500/25" 
                          : "border-gray-200 focus:ring-red-700/10 focus:border-red-700"
                      }`}
                    />
                    {/* Helper text instructions to remove any confusion */}
                    {field.formatHelp && (
                      <p className="text-[10px] text-gray-400 font-semibold pl-1 flex items-center gap-1.5">
                        <i className="las la-info-circle text-red-700/60 shrink-0"></i>
                        <span>{field.formatHelp}</span>
                      </p>
                    )}
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                type="submit"
                className="w-full bg-red-750 hover:bg-red-800 text-white font-extrabold py-3.5 rounded-xl text-xs transition-transform active:scale-[0.99] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
              >
                <i className="las la-check-circle text-sm"></i> Verify & Continue
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Preview & Verify */}
        {step === 2 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs p-6 space-y-5 print:hidden">
            <div className="text-center space-y-1">
              <h3 className="text-xs font-bold text-gray-805 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <i className="las la-clipboard-check text-base text-red-700"></i> Double Check Details
              </h3>
              <p className="text-[10px] text-gray-400 font-bold">
                Please review all values carefully. Make sure there are no typos before submitting.
              </p>
            </div>

            {/* Review Box */}
            <div className="border border-gray-150 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {formConfig.fields
                .filter(f => f.visible)
                .map(field => (
                  <div key={field.key} className="flex justify-between p-3.5 text-xs">
                    <span className="font-bold text-gray-500">{field.label}</span>
                    <span className="font-extrabold text-gray-850 text-right select-all">
                      {formData[field.key] || "—"}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-250 hover:bg-gray-50 text-gray-700 font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Go Back (Edit)
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitLoading}
                className="flex-1 bg-red-750 hover:bg-red-800 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {submitLoading ? (
                  <>
                    <i className="las la-spinner animate-spin"></i> Submitting...
                  </>
                ) : (
                  <>
                    <i className="las la-check-circle"></i> Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmed Receipt */}
        {step === 3 && (
          <div className="space-y-6">
            
            {/* Success Animation Banner (hide on print) */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs p-6 text-center space-y-4 print:hidden">
              <div className="w-16 h-16 bg-green-50 text-green-705 border border-green-150 rounded-full flex items-center justify-center mx-auto shadow-sm animate-scaleIn">
                <i className="las la-check text-3xl font-extrabold animate-pulse"></i>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-gray-900">Registration Complete!</h2>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                  Your information has been verified and registered securely in the institution portal database.
                </p>
              </div>
            </div>

            {/* Printable Receipt Card */}
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 space-y-5 print:border-none print:shadow-none print:p-0">
              
              <div className="text-center space-y-1 pb-3 border-b border-gray-100">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{orgName}</div>
                <h3 className="text-xs font-bold text-gray-805 uppercase tracking-wider">{formConfig.title}</h3>
                <span className="inline-block text-[9px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full mt-1.5">
                  Registration Receipt
                </span>
              </div>

              {/* Data Table */}
              <div className="space-y-3">
                {formConfig.fields
                  .filter(f => f.visible)
                  .map(field => (
                    <div key={field.key} className="flex justify-between border-b border-gray-50 pb-2 text-xs">
                      <span className="font-bold text-gray-400">{field.label}</span>
                      <span className="font-extrabold text-gray-800 text-right select-all">
                        {formData[field.key]}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Receipt Footer stamp */}
              <div className="pt-2 text-center text-[9px] font-bold text-gray-400 space-y-1 border-t border-gray-100 flex flex-col items-center">
                <div>Registered Timestamp: {new Date().toLocaleString()}</div>
                <div>Institution Verification Code: {orgCode}</div>
                <div className="mt-2 text-[8px] italic">Please print or take a screenshot of this receipt for confirmation.</div>
              </div>
            </div>

            {/* Print Action Buttons (hide on print) */}
            <div className="flex gap-3 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-red-750 hover:bg-red-800 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="las la-print text-sm animate-pulse"></i> Print Registration Receipt
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Footer Branding (hide on print) */}
      <footer className="text-center text-[10px] text-gray-400 font-bold pt-12 print:hidden select-none">
        Exam Seating Management System • Secure Client Registration
      </footer>
    </div>
  );
}
