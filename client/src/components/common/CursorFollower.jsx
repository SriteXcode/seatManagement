import React, { useEffect, useState } from "react";

export default function CursorFollower() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsOnScreen(true);
    };

    const handleMouseLeave = () => {
      setIsOnScreen(false);
    };

    const handleMouseEnter = () => {
      setIsOnScreen(true);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;
      
      const isClickable = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('a') || 
        target.closest('button') ||
        target.tagName === 'SELECT' ||
        target.tagName === 'INPUT' ||
        (target.classList && (
          target.classList.contains('cursor-pointer') ||
          target.classList.contains('cursor-grab') ||
          target.classList.contains('cursor-grabbing')
        ));
      
      setIsHovered(!!isClickable);
    };

    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  if (!isOnScreen) return null;

  return (
    <>
      {/* Outer Glow Ring (Transitions size, color, shadows, and transform - NOT position properties) */}
      <div
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9999] transform -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color,border-color,transform,box-shadow] duration-200 ease-out hidden md:block ${
          isHovered 
            ? "w-10 h-10 bg-red-500/10 border border-red-500/40 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
            : "w-6 h-6 bg-red-500/5 border border-red-500/20"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      />
      {/* Inner Dot */}
      <div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-red-600 rounded-full pointer-events-none z-[9999] transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 hidden md:block"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      />
    </>
  );
}
