import React from "react"

interface LeftPaneProps {
  setActiveView: (view: "menu" | "pastOrders") => void
}

const LeftPane: React.FC<LeftPaneProps> = ({ setActiveView }) => {
  return (
    <div className="left-pane">
      <h2>📋 Options</h2>
      <button onClick={() => setActiveView("menu")}>Menu</button>
      <button onClick={() => setActiveView("pastOrders")}>View Past Orders</button>
      <button disabled>Orders (coming soon)</button>
    </div>
  )
}

export default LeftPane
