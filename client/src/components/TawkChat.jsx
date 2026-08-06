import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * TawkChat Component
 * Integrates Tawk.to live chat widget dynamically.
 * Supports configuration via:
 * 1. Props (customPropertyId and customWidgetId - e.g. for public student registration pages)
 * 2. Backend database configuration (fetched via API when logged in)
 * 3. Environment variables ('VITE_TAWK_PROPERTY_ID' and 'VITE_TAWK_WIDGET_ID')
 */
export default function TawkChat({ customPropertyId = "", customWidgetId = "", customDepartment = "" }) {
  const { token, decoded, isLoggedIn } = useAuth();
  const [propertyId, setPropertyId] = useState(customPropertyId);
  const [widgetId, setWidgetId] = useState(customWidgetId || "default");
  const [department, setDepartment] = useState(customDepartment);

  // Sync state if props change
  useEffect(() => {
    if (customPropertyId) {
      setPropertyId(customPropertyId);
      setWidgetId(customWidgetId || "default");
      setDepartment(customDepartment);
    }
  }, [customPropertyId, customWidgetId, customDepartment]);

  // Fetch configuration from the database if logged in and no prop override is present
  useEffect(() => {
    if (isLoggedIn && token && !customPropertyId) {
      const apiBase = import.meta.env.VITE_API || "http://localhost:4000";
      fetch(`${apiBase}/auth/tawk-config`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch tawk config");
          return res.json();
        })
        .then(data => {
          if (data.tawkPropertyId) {
            setPropertyId(data.tawkPropertyId);
            setWidgetId(data.tawkWidgetId || "default");
            setDepartment(data.tawkDepartment || "");
          } else {
            // Fall back to environment variables if no database config exists
            setPropertyId(import.meta.env.VITE_TAWK_PROPERTY_ID || "");
            setWidgetId(import.meta.env.VITE_TAWK_WIDGET_ID || "default");
            setDepartment("");
          }
        })
        .catch(err => {
          console.error("Error fetching backend tawk config:", err);
          // Fall back to environment variables on error
          setPropertyId(import.meta.env.VITE_TAWK_PROPERTY_ID || "");
          setWidgetId(import.meta.env.VITE_TAWK_WIDGET_ID || "default");
          setDepartment("");
        });
    } else if (!isLoggedIn && !customPropertyId) {
      // Fetch public configuration from the database (for superadmin support before login)
      const apiBase = import.meta.env.VITE_API || "http://localhost:4000";
      fetch(`${apiBase}/auth/tawk-config/public`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch public tawk config");
          return res.json();
        })
        .then(data => {
          if (data.tawkPropertyId) {
            setPropertyId(data.tawkPropertyId);
            setWidgetId(data.tawkWidgetId || "default");
            setDepartment(data.tawkDepartment || "");
          } else {
            // Fall back to environment variables
            setPropertyId(import.meta.env.VITE_TAWK_PROPERTY_ID || "");
            setWidgetId(import.meta.env.VITE_TAWK_WIDGET_ID || "default");
            setDepartment("");
          }
        })
        .catch(err => {
          console.error("Error fetching public tawk config:", err);
          // Fall back to environment variables
          setPropertyId(import.meta.env.VITE_TAWK_PROPERTY_ID || "");
          setWidgetId(import.meta.env.VITE_TAWK_WIDGET_ID || "default");
          setDepartment("");
        });
    }
  }, [isLoggedIn, token, customPropertyId]);

  useEffect(() => {
    // If no property ID is defined, do not load the widget
    if (!propertyId || propertyId === "YOUR_PROPERTY_ID") {
      return;
    }

    // Initialize/reset Tawk global API object
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Ensure the chat widget is visible (especially if hidden by clean-up elsewhere)
    if (typeof window.Tawk_API.show === "function") {
      try {
        window.Tawk_API.show();
      } catch (e) {}
    } else {
      const originalOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = function () {
        if (typeof originalOnLoad === "function") {
          originalOnLoad();
        }
        if (typeof window.Tawk_API.show === "function") {
          try {
            window.Tawk_API.show();
          } catch (e) {}
        }
      };
    }

    // Bind logged-in user details to the chat session
    if (isLoggedIn && decoded) {
      const email = decoded.email || "";
      const name = decoded.name || decoded.username || decoded.email || "Authenticated User";

      window.Tawk_API.visitor = {
        name: name,
        email: email,
      };

      // Set attributes if API is already loaded
      if (typeof window.Tawk_API.setAttributes === "function") {
        window.Tawk_API.setAttributes({
          name: name,
          email: email,
          adminCode: decoded.adminCode || "Public",
          role: decoded.role || "Student",
          department: department || "Default"
        }, function(error) {});
      }
    } else {
      window.Tawk_API.visitor = undefined;
      // Set default attributes for public/non-authenticated visitors
      if (typeof window.Tawk_API.setAttributes === "function") {
        window.Tawk_API.setAttributes({
          adminCode: customPropertyId ? "Public Form" : "Public",
          role: "Public Visitor"
        }, function(error) {});
      }
    }

    // Set department if configured
    if (department) {
      if (typeof window.Tawk_API.setDepartment === "function") {
        window.Tawk_API.setDepartment(department, function(error) {});
      } else {
        // Queue it for when the widget loads
        window.Tawk_API.onLoad = function() {
          if (typeof window.Tawk_API.setDepartment === "function") {
            window.Tawk_API.setDepartment(department, function(error) {});
          }
        };
      }
    }

    // Check if the script is already added to prevent duplicate injections
    const scriptId = "tawk-to-chat-script";
    let s1 = document.getElementById(scriptId);
    const expectedSrc = `https://embed.tawk.to/${propertyId}/${widgetId}`;

    if (s1 && s1.getAttribute("src") !== expectedSrc) {
      // If the property ID or widget ID changed, remove the script to reload it
      s1.remove();
      s1 = null;
    }

    if (!s1) {
      s1 = document.createElement("script");
      s1.id = scriptId;
      s1.async = true;
      s1.src = expectedSrc;
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");

      const s0 = document.getElementsByTagName("script")[0];
      if (s0 && s0.parentNode) {
        s0.parentNode.insertBefore(s1, s0);
      } else {
        document.head.appendChild(s1);
      }
    }

    // Clean up: Hide the widget if the component is unmounted
    return () => {
      if (window.Tawk_API && typeof window.Tawk_API.hide === "function") {
        try {
          window.Tawk_API.hide();
        } catch (e) {
          // Ignore clean-up error if widget wasn't fully initialized
        }
      }
    };
  }, [propertyId, widgetId, department, isLoggedIn, decoded]);

  return null;
}
