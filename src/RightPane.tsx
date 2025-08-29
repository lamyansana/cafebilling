import { useState } from 'react'
import type { CartItem } from './Master'

interface RightPaneProps {
  cart: CartItem[]
  incrementQuantity: (id: number) => void
  decrementQuantity: (id: number) => void
  submitOrder: (paymentMode: string) => void
}

function RightPane({ cart, incrementQuantity, decrementQuantity, submitOrder }: RightPaneProps) {
  const [showOrders, setShowOrders] = useState(false)
  const [paymentMode, setPaymentMode] = useState("Cash") // default Cash

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const getPastOrders = () => {
    const csv = localStorage.getItem('ordersCSV')
    if (!csv) return []

    const rows = csv.trim().split('\n')
    const headers = rows[0].split(',')
    const dataRows = rows.slice(1)

    return dataRows.map(row => {
      const cols = row.split(/,(.+),/) // smart split for 3 cols
      return {
        DateTime: cols[0]?.trim(),
        Items: cols[1]?.replace(/"/g, '').trim(),
        Total: cols[2]?.trim(),
        PaymentMode: cols[3]?.trim(),
      }
    })
  }

  const pastOrders = getPastOrders()

  return (
    <div className="right-pane">
      <h2>Cart</h2>
      {cart.length === 0 ? (
        <p>No items yet</p>
      ) : (
        <>
          <ul>
            {cart.map(item => (
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
            <label>
              <input
                type="radio"
                name="payment"
                value="Cash"
                checked={paymentMode === "Cash"}
                onChange={(e) => setPaymentMode(e.target.value)}
              />
              Cash
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="UPI"
                checked={paymentMode === "UPI"}
                onChange={(e) => setPaymentMode(e.target.value)}
              />
              UPI
            </label>
          </div>

          <button className="submit-btn" onClick={() => submitOrder(paymentMode)}>
            Submit Order
          </button>
        </>
      )}

      <hr />

      {/* <button className="view-btn" onClick={() => setShowOrders(!showOrders)}>
        {showOrders ? 'Hide Past Orders' : 'View Past Orders'}
      </button>

      {showOrders && pastOrders.length > 0 && (
        <table className="orders-table">
          <thead>
            <tr>
              <th>DateTime</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            {pastOrders.map((order, idx) => (
              <tr key={idx}>
                <td>{order.DateTime}</td>
                <td>{order.Items}</td>
                <td>₹{order.Total}</td>
                <td>{order.PaymentMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showOrders && pastOrders.length === 0 && <p>No past orders</p>} */}
    </div>
  )
}

export default RightPane
