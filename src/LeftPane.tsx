import React from "react"
import { NavLink } from "react-router-dom"
import "./App.css"

interface LeftPaneProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const LeftPane: React.FC<LeftPaneProps> = ({ isOpen, setIsOpen }) => {
  return (
    <div className={`left-pane ${isOpen ? "open" : "collapsed"}`}>
      {/* ✅ Toggle button - always visible */}
      <button
        className="toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
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
            >
              Menu
            </NavLink>
            <NavLink
              to="/past-orders"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
            >
              View Past Orders
            </NavLink>
            <NavLink
              to="/sales-report"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
            >
              Sales Report
            </NavLink>
            <NavLink
              to="/expenditure"
              className={({ isActive }) =>
                isActive ? "active-link" : "inactive-link"
              }
            >
              Expenditure
            </NavLink>

            <button className="disabled-btn" disabled>
              Orders (coming soon)
            </button>
          </nav>
        </>
      )}
    </div>
  )
}

export default LeftPane
