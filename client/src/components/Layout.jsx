import React, { useState } from "react";

export default function Layout({ 
  children, 
  logout, 
  activeTab: propActiveTab, 
  setActiveTab: propSetActiveTab,
  onViewLanding
}) {
  const [localActiveTab, setLocalActiveTab] = useState("Students");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTab = propActiveTab !== undefined ? propActiveTab : localActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setLocalActiveTab;

  const renderChildren = () => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child) && child.props.id === activeTab) {
        return child;
      }
      return null;
    });
  };

  const getTabIcon = (tabName) => {
    switch (tabName) {
      case "Students":
        return "las la-graduation-cap";
      case "Rooms":
        return "las la-school";
      case "Allotments":
      case "Allotment":
      case "AllotmentTab":
        return "las la-calendar-check";
      case "Invigilators":
        return "las la-user-tie";
      case "DutyChart":
      case "Duty Chart":
        return "las la-briefcase";
      case "Profile":
        return "las la-user-circle";
      default:
        return "las la-link";
    }
  };

  const navLinks = React.Children.map(children, child => {
    if (!React.isValidElement(child)) return null;
    const tabName = child.props.id;
    return (
      <li key={tabName}>
        <a
          href="#"
          className={`p-4 font-semibold text-sm flex items-center gap-2.5 transition-colors ${activeTab === tabName ? "bg-red-900" : "hover:bg-red-800"}`}
          onClick={() => {
            setActiveTab(tabName);
            setIsSidebarOpen(false);
          }}
        >
          <i className={`${getTabIcon(tabName)} text-lg shrink-0`}></i>
          <span>{tabName}</span>
        </a>
      </li>
    );
  });

  return (
    <div className="flex flex-col md:flex-row-reverse min-h-screen">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-red-700 text-white flex items-center justify-between px-4 h-16 shadow-md shrink-0 select-none">
        <h1 className="text-base font-extrabold">Exam Seat Allotment</h1>
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 text-white focus:outline-none cursor-pointer flex items-center justify-center"
          title="Open Menu"
        >
          <i className="las la-bars text-2xl"></i>
        </button>
      </header>

      {/* Desktop Sidebar (aside) */}
      <aside className="hidden md:block w-64 bg-red-700 text-white sticky top-0 h-screen select-none shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-extrabold text-white">Exam Seat Allotment</h1>
        </div>
        <nav className="flex flex-col justify-between h-[calc(100vh-88px)]">
          <ul className="flex-1 overflow-y-auto">
            {navLinks}
          </ul>
          <div className="border-t border-red-800 p-4 space-y-2 shrink-0">
            {onViewLanding && (
              <button
                onClick={() => onViewLanding()}
                className="w-full text-left p-3.5 font-semibold text-sm text-red-100 hover:bg-red-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <i className="las la-home text-lg shrink-0"></i>
                View Landing Page
              </button>
            )}
          </div>
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)}></div>
          
          {/* Drawer content */}
          <aside className="relative w-64 max-w-xs bg-red-700 text-white flex flex-col h-full z-10 shadow-2xl animate-slideIn">
            <div className="p-5 flex items-center justify-between border-b border-red-800 select-none">
              <h1 className="text-lg font-extrabold text-white">Seat Allotment</h1>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="text-white hover:text-red-200 p-1 cursor-pointer flex items-center justify-center"
              >
                <i className="las la-times text-xl"></i>
              </button>
            </div>
            <nav className="flex-1 mt-2 flex flex-col justify-between overflow-hidden">
              <ul className="flex-1 overflow-y-auto">
                {navLinks}
              </ul>
              <div className="border-t border-red-800 p-4 space-y-2 shrink-0">
                {onViewLanding && (
                  <button
                    onClick={() => {
                      onViewLanding();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-left p-3.5 font-semibold text-sm text-red-100 hover:bg-red-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <i className="las la-home text-lg shrink-0"></i>
                    View Landing Page
                  </button>
                )}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 bg-white text-black min-w-0 overflow-hidden">
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center p-12 space-y-6 min-h-[50vh] animate-fadeIn">
            {/* Rotating Gradient Spinner */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-700 border-r-red-800 animate-spin"></div>
            </div>
            
            {/* Loading descriptive subtitle */}
            <div className="text-center space-y-1">
              <h3 className="text-xs font-bold text-gray-850 animate-pulse">Loading Workspace</h3>
              <p className="text-[9px] font-semibold text-gray-400">Preparing seating engines and roster maps...</p>
            </div>

            {/* Table/Grid Skeleton representation */}
            <div className="w-full max-w-sm space-y-3 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl animate-pulse mt-4">
              <div className="h-3.5 bg-gray-200 rounded-lg w-1/3"></div>
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-150 rounded w-full"></div>
                <div className="h-2.5 bg-gray-150 rounded w-5/6"></div>
                <div className="h-2.5 bg-gray-150 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        }>
          {renderChildren()}
        </React.Suspense>
      </main>
    </div>
  );
}
