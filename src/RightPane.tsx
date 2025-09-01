import type { PendingOrder } from "./Master"

interface RightPaneProps {
  orders: PendingOrder[]
  activeOrderId: number
  switchOrder: (id: number) => void
  addNewOrder: () => void
  incrementQuantity: (id: number) => void
  decrementQuantity: (id: number) => void
  setPaymentMode: (mode: string) => void
  submitOrder: (id: number) => void
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
}: RightPaneProps) {
  const activeOrder = orders.find(o => o.id === activeOrderId)!
  const total = activeOrder.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="right-pane">
      {/* 🔹 Order Tabs */}
      <div className="order-tabs">
        {orders.map(order => (
          <button
            key={order.id}
            onClick={() => switchOrder(order.id)}
            className={`tab-btn ${order.id === activeOrderId ? "active" : ""}`}
          >
            {order.name} 
          </button>
        ))}
        <button className="add-order-btn" onClick={addNewOrder}>+ New</button>
      </div>

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
            <label className={`payment-option ${activeOrder.paymentMode === "Cash" ? "active" : ""}`}>
              <input
                type="radio"
                name={`payment-${activeOrder.id}`}
                value="Cash"
                checked={activeOrder.paymentMode === "Cash"}
                onChange={(e) => setPaymentMode(e.target.value)}
              />
              <span>Cash</span>
            </label>
            <label className={`payment-option ${activeOrder.paymentMode === "UPI" ? "active" : ""}`}>
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
            <button className="submit-btn" onClick={() => submitOrder(activeOrder.id)}>
              Submit Order
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default RightPane
