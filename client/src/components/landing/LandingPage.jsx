import React, { useState } from "react";

const Register = React.lazy(() => import("../Register"));

export default function LandingPage({
  isLoggedIn,
  onViewDashboard,
  doLogin,
  doRegister,
  loginForm,
  setLoginForm,
  showRegister,
  setShowRegister,
  showToast,
  showInstallButton,
  onInstall,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDirection, setAuthDirection] = useState("right");
  const [activeModalPage, setActiveModalPage] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
      {/* 1. Header Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white font-extrabold shadow-md">
              E
            </div>
            <span className="font-extrabold  text-gray-800 text-sm sm:text-base tracking-tight">ExamSeat Allotment</span>
          </div>

          {/* <nav className=" md:flex items-center gap-6">
            <a href="#features" className="text-xs font-bold text-gray-500 hover:text-red-750 transition-colors">Features</a>
            <a href="#about" className="text-xs font-bold text-gray-500 hover:text-red-750 transition-colors">About App</a>
            <a href="#statistics" className="text-xs font-bold text-gray-500 hover:text-red-750 transition-colors">Statistics</a>
          </nav> */}

          <div className="flex items-center gap-2">
            {showInstallButton && (
              <button
                onClick={onInstall}
                className="border border-red-700 text-red-700 hover:bg-red-50 text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 hover:scale-[1.02] active:scale-98"
              >
                <i className="las la-download text-xs animate-bounce"></i>
                Install App
              </button>
            )}
            {isLoggedIn ? (
              <button
                onClick={onViewDashboard}
                className="bg-red-750 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-98"
              >
                <i className="las la-columns text-sm"></i>
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowRegister(false);
                    setShowAuthModal(true);
                  }}
                  className="text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-250 px-3.5 py-1.5 rounded-lg bg-white transition-colors cursor-pointer"
                >
                  SignIn
                </button>
                <button
                  onClick={() => {
                    setShowRegister(true);
                    setShowAuthModal(true);
                  }}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="bg-white pt-6 pb-8 sm:pt-20 sm:pb-12 border-b border-gray-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-2 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
          <div className="lg:col-span-6 space-y-6">
            <h1 className="font-Montserrat text-3xl sm:text-5xl font-Montserrat font-black text-gray-900 leading-tight">
              Automate Exam seating charts in <span className="text-red-700">Seconds</span>.
            </h1>
            <p className="font-Inter text-sm sm:text-base text-gray-500 leading-relaxed font-medium">
              auto-generate student exam arrangements with distancing logic, assign invigilators, and download clean templates and reports. No manual calculations needed.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            {/* Seating Arrangement visual demo asset */}
            <div className="border border-gray-150 rounded-2xl p-4 sm:p-5 bg-gray-50 shadow-lg w-full max-w-lg select-none">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-3.5">
                <div>
                  <div className="font-bold text-gray-800 text-xs">Visual Scheduler</div>
                  <div className="text-[10px] text-gray-400 font-medium">Auto-distancing model active</div>
                </div>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider">
                  Operational
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3.5 text-center">
                <div className="p-2 border rounded-lg bg-red-100 border-red-200 text-red-700 font-bold text-xs flex flex-col justify-center h-10">
                  A1
                </div>
                <div className="p-2 border border-dashed rounded-lg bg-gray-100 border-gray-300 text-gray-400 font-extrabold text-[9px] flex flex-col justify-center h-10">
                  GAP
                </div>
                <div className="p-2 border rounded-lg bg-yellow-100 border-yellow-200 text-yellow-700 font-bold text-xs flex flex-col justify-center h-10">
                  A2
                </div>
                <div className="p-2 border border-dashed rounded-lg bg-gray-100 border-gray-300 text-gray-400 font-extrabold text-[9px] flex flex-col justify-center h-10">
                  GAP
                </div>
                <div className="p-2 border border-dashed rounded-lg bg-gray-100 border-gray-300 text-gray-400 font-extrabold text-[9px] flex flex-col justify-center h-10">
                  GAP
                </div>
                <div className="p-2 border rounded-lg bg-blue-100 border-blue-200 text-blue-700 font-bold text-xs flex flex-col justify-center h-10">
                  B1
                </div>
                <div className="p-2 border border-dashed rounded-lg bg-gray-100 border-gray-300 text-gray-400 font-extrabold text-[9px] flex flex-col justify-center h-10">
                  GAP
                </div>
                <div className="p-2 border rounded-lg bg-green-100 border-green-200 text-green-700 font-bold text-xs flex flex-col justify-center h-10">
                  B2
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold border-t border-gray-150 pt-2.5">
                <span>Demo Room 101</span>
                <span>Capacity: 4/8 seated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="pt-8 pb-16 sm:pt-12 sm:pb-24 bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-red-750 font-extrabold uppercase text-[10px] tracking-wider">Features</span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900">
            Powered by modern exam logistics
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto font-medium">
            Everything you need to automate schedules, handle spacing guidelines, approve staff registration, and generate reports.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left select-none">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <i className="las la-th text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Automated Allotments</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Auto-generate student exam layouts across multiple exam rooms with seed parameters and randomizer controls.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center">
                <i className="las la-mouse-pointer text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Drag & Drop visualizer</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Easily rearrange students between rooms or seats with live staging buckets for unallocated records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <i className="las la-arrows-alt-h text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Flexible Spacing Rules</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Configure row grouping, column spacing, and blank gap styles to satisfy distance rules.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <i className="las la-user-shield text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Staff & Invigilators</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Manage invigilator rosters, assign distributors, and track comments/discussions on layout charts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <i className="las la-file-pdf text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Print-ready Reports</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Download student rosters and grid assignments in Excel spreadsheets or print-ready PDF formats.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-2xs hover:shadow-sm transition-shadow space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
                <i className="las la-sliders-h text-xl"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Exam Customization</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Create new templates (College, School, Boards), define custom fields, and customize Excel template designs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. About App Section */}
      <section id="about" className="py-2 sm:py-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-red-750 font-extrabold uppercase text-[10px] tracking-wider">About the App</span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight">
              A simplified scheduler for academic operations
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-medium">
              Manually plotting seating arrangements for midterms, finals, or competitive exams can take hours and often results in double-booking or compliance errors.
            </p>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-medium">
              This portal acts as a unified coordinator. You can build layouts, set spacing models, configure templates, and invite staff members. It guarantees error-free distribution and prints student charts instantly.
            </p>
          </div>

          {/* Statistics Grid */}
          <div id="statistics" className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
            <div className="bg-red-50/40 p-6 border border-red-100/70 rounded-2xl">
              <div className="text-3xl font-black text-red-700">95%</div>
              <div className="text-xs font-bold text-gray-800 mt-1">Time Saved</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Compared to spreadsheet scheduling.</div>
            </div>
            <div className="bg-yellow-50/40 p-6 border border-yellow-100/70 rounded-2xl">
              <div className="text-3xl font-black text-yellow-700">0%</div>
              <div className="text-xs font-bold text-gray-800 mt-1">Allocation Errors</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">No double-seatings or missing records.</div>
            </div>
            <div className="bg-blue-50/40 p-6 border border-blue-100/70 rounded-2xl">
              <div className="text-3xl font-black text-blue-700">10k+</div>
              <div className="text-xs font-bold text-gray-800 mt-1">Students Scheduled</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Successfully alloted across exams.</div>
            </div>
            <div className="bg-green-50/40 p-6 border border-green-100/70 rounded-2xl">
              <div className="text-3xl font-black text-green-700">Instant</div>
              <div className="text-xs font-bold text-gray-800 mt-1">PDF Reporting</div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Downloads are ready for exam hall boards.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="bg-white py-8 border-t border-gray-100 mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-750 flex items-center justify-center text-white font-black text-xs shadow-sm">
              E
            </div>
            <span className="font-bold text-gray-800 text-xs tracking-tight">ExamSeat Allotment</span>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-gray-500">
            <button onClick={() => setActiveModalPage("feedback")} className="hover:text-red-700 cursor-pointer bg-transparent border-none font-bold">Report & Feedback</button>
            <button onClick={() => setActiveModalPage("contact")} className="hover:text-red-700 cursor-pointer bg-transparent border-none font-bold">Contact Us</button>
            <button onClick={() => setActiveModalPage("terms")} className="hover:text-red-700 cursor-pointer bg-transparent border-none font-bold">Terms & Conditions</button>
          </div>
          <p className="text-[10px] text-gray-400 font-semibold">&copy; {new Date().getFullYear()} ExamSeat Allotment portal. All rights reserved.</p>
        </div>
      </footer>

      {activeModalPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 animate-scaleIn mx-4 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveModalPage(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 text-2xl font-bold cursor-pointer bg-transparent border-none"
            >
              &times;
            </button>

            {activeModalPage === "feedback" && (
              <div className="space-y-4 text-left">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Report & Feedback</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Feedback submitted successfully. Thank you!", "success");
                  setActiveModalPage(null);
                }} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Feedback Type</label>
                    <select className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black font-semibold">
                      <option>Bug Report</option>
                      <option>Feature Request</option>
                      <option>General Feedback</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Your Email</label>
                    <input required type="email" placeholder="email@example.com" className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Message / Details</label>
                    <textarea required placeholder="Please describe the bug or feature request in detail..." rows="4" className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black resize-none"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow cursor-pointer">
                    Submit Feedback
                  </button>
                </form>
              </div>
            )}

            {activeModalPage === "contact" && (
              <div className="space-y-4 text-left">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Contact Us</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Have questions or need custom deployment support for your institution? Get in touch with our operations team.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700 bg-gray-50 p-4 border border-gray-150 rounded-xl">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Support Email</div>
                    <div>contact@examseatallotment.org</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase">Call Center</div>
                    <div>+1 (555) 019-2834</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[10px] text-gray-400 uppercase">Office Location</div>
                    <div>123 University Ave, Suite 400, NY 10001</div>
                  </div>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Your inquiry has been received. We will respond shortly.", "success");
                  setActiveModalPage(null);
                }} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Your Name</label>
                    <input required type="text" placeholder="Name" className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Message</label>
                    <textarea required placeholder="Write your message here..." rows="3" className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white text-black resize-none"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow cursor-pointer">
                    Send Message
                  </button>
                </form>
              </div>
            )}

            {activeModalPage === "terms" && (
              <div className="space-y-4 text-left">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Terms & Conditions</h3>
                <div className="text-[11px] text-gray-650 font-semibold space-y-3 leading-relaxed max-h-[50vh] overflow-y-auto pr-2">
                  <p><strong>1. Acceptance of Terms:</strong> By creating an account or using the ExamSeat Allotment portal, you agree to comply with all rules and layout guidelines specified in this document.</p>
                  <p><strong>2. Accuracy of Schedules:</strong> While our scheduling models calculate seat distributions based on user parameters, institutions are responsible for validating the physical validity of the layouts and distancing rules prior to administering exams.</p>
                  <p><strong>3. Data Privacy:</strong> Student information uploaded via CSV/Excel rosters is processed securely. We do not sell, distribute, or share student records or invigilator assignments with outside third parties.</p>
                  <p><strong>4. Platform Limitations:</strong> The service is provided "as is". We are not responsible for scheduling conflicts, hardware issues, or server disruptions during exam periods.</p>
                  <p><strong>5. Amendments:</strong> We reserve the right to modify these terms or update spacing parameters at any time. Continued use implies acceptance of modifications.</p>
                </div>
                <button onClick={() => setActiveModalPage(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl text-xs transition-colors border border-gray-200 mt-2 cursor-pointer">
                  Close Terms
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Centered Slide-in Auth Overlay Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-2 animate-scaleIn mx-4 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute z-150 top-[-12px] right-[-2px] rounded-[0px_0px_14px_18px] bg-red-700 text-white hover:text-gray-800 font-bold p-1 cursor-pointer text-2xl"
            >
              &times;
            </button>

            {showRegister ? (
              <div
    key="register"
    className={
      authDirection === "left"
        ? "animate-[slideInLeft_0.45s_cubic-bezier(0.16,1,0.3,1)]"
        : "animate-[slideInRight_0.45s_cubic-bezier(0.16,1,0.3,1)]"
    }
  >
              <React.Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-gray-500 animate-pulse">Loading registration system...</div>}>
                <Register
                  onRegister={(formData) => {
                    doRegister(formData);
                    setShowAuthModal(false);
                  }}
                  onToggle={() => {
                    setAuthDirection("right");
                    setShowRegister(false)}}
                  showToast={showToast}
                />
              </React.Suspense></div>
            ) : (
              <div
    key="login"
    className={
      authDirection === "right"
        ? "animate-[slideInRight_1.2s_cubic-bezier(0.16,1,0.3,1)]"
        : "animate-[slideInLeft_1.2s_cubic-bezier(0.16,1,0.3,1)]"
    }
  >
    <div className="bg-white text-left">
   
                  <div className="flex items-center justify-around mb-2 rounded-full p-2 bg-gray-50">
  <button
    onClick={() => {
      setAuthDirection("left");
      setShowRegister(true);
    }}
    className="flex-1 text-center text-xl text-gray-800 font-bold bg-transparent border-none cursor-pointer"
  >
    Register
  </button>
  <h2 className="flex-1 text-center bg-red-600 text-white py-2 rounded-full font-bold text-xl">
    Login
  </h2>

</div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-650 uppercase mb-1">Username</label>
                    <input
                      className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black bg-white"
                      placeholder="Username"
                      value={loginForm.username}
                      onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-650 uppercase mb-1">Password</label>
                    <input
                      className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-black bg-white"
                      placeholder="••••••••"
                      type="password"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          doLogin();
                          setShowAuthModal(false);
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      doLogin();
                      setShowAuthModal(false);
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-md mt-2 cursor-pointer text-center text-sm"
                  >
                    Login
                  </button>
                </div>
                <p className="text-xs text-center mt-5 font-semibold text-gray-550">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthDirection("left");
                      setShowRegister(true);
                    }}
                    className="text-red-700 font-bold hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Register
                  </button>
                </p>
              </div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
