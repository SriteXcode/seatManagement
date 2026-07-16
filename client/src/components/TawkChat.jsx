import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * TawkChat Component
 * Integrates Tawk.to live chat widget dynamically.
 * Supports configuration via:
 * 1. localStorage ('tawk_property_id' and 'tawk_widget_id')
 * 2. Environment variables ('VITE_TAWK_PROPERTY_ID' and 'VITE_TAWK_WIDGET_ID')
 */
export default function TawkChat() {
  const { decoded, isLoggedIn } = useAuth();

  useEffect(() => {
    // Get credentials from localStorage or environment variables
    const propertyId = localStorage.getItem("tawk_property_id") || import.meta.env.VITE_TAWK_PROPERTY_ID;
    const widgetId = localStorage.getItem("tawk_widget_id") || import.meta.env.VITE_TAWK_WIDGET_ID || "default";

    // If no property ID is defined, do not load the widget
    if (!propertyId || propertyId === "YOUR_PROPERTY_ID") {
      return;
    }

    // Initialize/reset Tawk global API object
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

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
        }, function(error) {});
      }
    } else {
      window.Tawk_API.visitor = undefined;
    }

    // Check if the script is already added to prevent duplicate injections
    const scriptId = "tawk-to-chat-script";
    let s1 = document.getElementById(scriptId);

    if (!s1) {
      s1 = document.createElement("script");
      s1.id = scriptId;
      s1.async = true;
      s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
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
  }, [isLoggedIn, decoded]);

  return null;
}
