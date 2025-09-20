import React from "react";
import { NavLink } from "react-router-dom";
import "./App.css";

interface LeftPaneProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  role: "admin" | "staff" | "viewer";
  handleLogout: () => void;
}

const LeftPane: React.FC<LeftPaneProps> = ({
  isOpen,
  setIsOpen,
  role,
  handleLogout,
}) => {
  return (
    <div className={`left-pane ${isOpen ? "open" : "collapsed"}`}>
      {/* ✅ Toggle button - always visible */}
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "«" : "☰"}
      </button>

      {isOpen && (
        <>
          <h2>📋 Options</h2>
          <nav>
            <NavLink
              to="/menu/maggi-and-noodles"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
              onClick={() => {
                if (window.innerWidth <= 768) setIsOpen(false);
              }}
            >
              Menu
            </NavLink>
            <NavLink
              to="/past-orders"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
              onClick={() => {
                if (window.innerWidth <= 768) setIsOpen(false);
              }}
            >
              View Past Orders
            </NavLink>

            {/* Only show for admin */}
            {(role === "admin" || role === "viewer") && (
              <NavLink
                to="/sales-report"
                className={({ isActive }) =>
                  isActive ? "active-link" : "inactive-link"
                }
                onClick={() => {
                  if (window.innerWidth <= 768) setIsOpen(false);
                }}
              >
                Sales Report
              </NavLink>
            )}

            <NavLink
              to="/expenditure"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
              onClick={() => {
                if (window.innerWidth <= 768) setIsOpen(false);
              }}
            >
              Expenditure
            </NavLink>

            {role === "admin" && (
              <NavLink
                to="/menu-items"
                className={({ isActive }) =>
                  isActive ? "active-link" : "inactive-link"
                }
                onClick={() => {
                  if (window.innerWidth <= 768) setIsOpen(false);
                }}
              >
                🍽️ Menu Items
              </NavLink>
            )}
            
            {role === "admin" && (
  <NavLink
    to="/analytics"
    className={({ isActive }) =>
      isActive ? "active-link" : "inactive-link"
    }
    onClick={() => {
      if (window.innerWidth <= 768) setIsOpen(false);
    }}
  >
    📊 Analytics
  </NavLink>
)}

            <button className="disabled-btn" disabled>
              Orders (coming soon)
            </button>
          </nav>
          <div style={{ marginTop: "auto", padding: "1rem 0" }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LeftPane;
