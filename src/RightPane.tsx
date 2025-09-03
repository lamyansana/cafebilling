import type { PendingOrder } from "./Master"

interface RightPaneProps {
  orders: PendingOrder[]
  switchOrder: (id: number) => void
  addNewOrder: () => void
  incrementQuantity: (id: number) => void
  decrementQuantity: (id: number) => void
  setPaymentMode: (mode: string) => void
  submitOrder: (id: number) => void
  deleteOrder: (id: number) => void
  activeOrderId: number | null // ✅ allow null
  setActiveOrderId: React.Dispatch<React.SetStateAction<number | null>>
}

function RightPane({
  orders,
  activeOrderId,
  switchOrder,
  addNewOrder,
  incrementQuantity,
  decrementQuantity,
  setPaymentMode,
  submitOrder,
  deleteOrder,
  setActiveOrderId,
}: RightPaneProps) {
  const activeOrder = orders.find(o => o.id === activeOrderId) || null
  const total = activeOrder
    ? activeOrder.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0

  return (
    <div className="right-pane">
      {/* 🔹 Order Tabs */}
      <div className="order-tabs">
        {orders.map(order => (
          <div
            key={order.id}
            className={`tab-btn ${order.id === activeOrderId ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "6px",
              color: "#ffffffff",
              border:
                activeOrderId === order.id
                  ? "2px solid #007bff"
                  : "1px solid #d8dbcfff",
              background:
                activeOrderId === order.id ? "#06595eff" : "#6d6777ff",
            }}
          >
            {/* Order Name - switch when clicked */}
            <span
              onClick={() => switchOrder(order.id)}
              style={{ cursor: "pointer" }}
            >
              {order.name}
            </span>

            {/* ❌ Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteOrder(order.id)
                if (activeOrderId === order.id) {
                  // auto-select next available order or null
                  const remaining = orders.filter(o => o.id !== order.id)
                  setActiveOrderId(remaining.length > 0 ? remaining[0].id : null)
                }
              }}
              style={{
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "0 6px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="add-order-btn" onClick={addNewOrder}>
          + New
        </button>
      </div>

      {/* 🔹 Active Order Content */}
      {activeOrder ? (
        <>
          <h2>{activeOrder.name}</h2>

          {activeOrder.cart.length === 0 ? (
            <p>No items yet</p>
          ) : (
            <>
              <ul>
                {activeOrder.cart.map(item => (
                  <li key={item.id} className="cart-item">
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                    <div className="cart-controls">
                      <button onClick={() => decrementQuantity(item.id)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => incrementQuantity(item.id)}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
              <h3>Total: ₹{total}</h3>

              {/* 🔹 Payment Mode Selection */}
              <div className="payment-modes">
                <h4>Select Payment Mode:</h4>
                <label
                  className={`payment-option ${
                    activeOrder.paymentMode === "Cash" ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`payment-${activeOrder.id}`}
                    value="Cash"
                    checked={activeOrder.paymentMode === "Cash"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  <span>Cash</span>
                </label>
                <label
                  className={`payment-option ${
                    activeOrder.paymentMode === "UPI" ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`payment-${activeOrder.id}`}
                    value="UPI"
                    checked={activeOrder.paymentMode === "UPI"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  <span>UPI</span>
                </label>
              </div>

              {!activeOrder.isSubmitted && (
                <button
                  className="submit-btn"
                  onClick={() => submitOrder(activeOrder.id)}
                >
                  Submit Order
                </button>
              )}
            </>
          )}
        </>
      ) : (
        <p>No active order selected</p>
      )}
    </div>
  )
}

export default RightPane
