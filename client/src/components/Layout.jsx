import React, { useState } from "react";

export default function Layout({ children, logout, activeTab: propActiveTab, setActiveTab: propSetActiveTab }) {
  const [localActiveTab, setLocalActiveTab] = useState("Students");

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

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-red-700 text-white sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-white">Exam Seat Allotment</h1>
        </div>
        <nav>
          <ul>
            {React.Children.map(children, child => {
              if (!React.isValidElement(child)) return null;
              return (
                <li key={child.props.id}>
                  <a
                    href="#"
                    className={`block p-4 ${activeTab === child.props.id ? "bg-red-900" : "hover:bg-red-800"}`}
                    onClick={() => setActiveTab(child.props.id)}
                  >
                    {child.props.id}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-white text-black min-w-0 overflow-hidden">
        {renderChildren()}
      </main>
    </div>
  );
}
