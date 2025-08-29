import React, { useState } from "react"
import { NavLink } from "react-router-dom"

const LeftPane: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`left-pane ${isOpen ? "open" : ""}`}>
      {/* Toggle button visible only on mobile */}
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>

      <h2>📋 Options</h2>
      <nav>
        <NavLink
          to="/menu/Coffee & Hot Beverages"
          className={({ isActive }) =>
            isActive ? "active-link" : "inactive-link"
          }
          onClick={() => setIsOpen(false)}
        >
          Menu
        </NavLink>
        <NavLink
          to="/past-orders"
          className={({ isActive }) =>
            isActive ? "active-link" : "inactive-link"
          }
          onClick={() => setIsOpen(false)}
        >
          View Past Orders
        </NavLink>
        <button className="disabled-btn" disabled>
          Orders (coming soon)
        </button>
      </nav>
    </div>
  )
}

export default LeftPane
