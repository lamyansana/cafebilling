import React, { useState, useEffect } from "react";
import type { PendingOrder, CartItem } from "./Master";

interface RightPaneProps {
  orders: PendingOrder[];
  switchOrder: (id: number) => void;
  addNewOrder: () => void;
  incrementQuantity: (id: number) => void;
  decrementQuantity: (id: number) => void;
  setPaymentMode: (mode: "Cash" | "UPI" | "Cash&UPI") => void;
  submitOrder: (id: number) => void;
  deleteOrder: (id: number) => void;
  activeOrderId: number | null;
  setActiveOrderId: React.Dispatch<React.SetStateAction<number | null>>;
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
  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;
  const total = activeOrder
    ? activeOrder.cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    : 0;

  // Local state for split payment amounts
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(total);

  // Update split inputs when active order changes
  useEffect(() => {
    if (!activeOrder) return;

    if (activeOrder.paymentMode === "Cash&UPI") {
      setCashAmount(activeOrder.cashAmount ?? 0);
      setUpiAmount(total - (activeOrder.cashAmount ?? 0));
    } else {
      setCashAmount(0);
      setUpiAmount(total); // full total for non-split payment
    }
  }, [activeOrder, total]);

  // Sync inputs to order
  useEffect(() => {
    if (!activeOrder) return;
    activeOrder.cashAmount = cashAmount;
    activeOrder.upiAmount = upiAmount;
  }, [cashAmount, upiAmount, activeOrder]);

  // Auto-calculate the other field
  const handleCashChange = (val: number) => {
    const clamped = Math.min(Math.max(val, 0), total);
    setCashAmount(clamped);
    setUpiAmount(total - clamped);
  };

  const handleUpiChange = (val: number) => {
    const clamped = Math.min(Math.max(val, 0), total);
    setUpiAmount(clamped);
    setCashAmount(total - clamped);
  };

  return (
    <div className="right-pane">
      <h2 style={{ textAlign: "center", margin: 0 }}>🛒CART</h2>

      {/* Order Tabs */}
      <div className="order-tabs">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`tab-btn ${order.id === activeOrderId ? "active" : ""}`}
            style={{
              display: "flex",
              cursor: "pointer",
              justifyContent: "space-between",
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
            onClick={() => switchOrder(order.id)}
          >
            <span>{order.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteOrder(order.id);
                if (activeOrderId === order.id) {
                  const remaining = orders.filter((o) => o.id !== order.id);
                  setActiveOrderId(
                    remaining.length > 0 ? remaining[0].id : null
                  );
                }
              }}
              style={{
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "2px 8px",
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

      {/* Active Order */}
      {activeOrder ? (
        <>
          <h3>{activeOrder.name}</h3>
          {activeOrder.cart.length === 0 ? (
            <p>No items yet</p>
          ) : (
            <>
              <ul>
                {activeOrder.cart.map((item: CartItem) => (
                  <li key={item.id} className="cart-item">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">₹{item.price}</span>
                    </div>
                    <div className="cart-controls">
                      <button onClick={() => decrementQuantity(item.id)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => incrementQuantity(item.id)}>
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <h3>Total: ₹{total}</h3>

              {/* Payment Mode */}
              <div className="payment-modes">
                <h4>Select Payment Mode:</h4>
                <div
                  className="payment-modes-row"
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  {["Cash", "UPI", "Cash&UPI"].map((mode) => (
                    <label
                      key={mode}
                      className={`payment-option ${
                        activeOrder.paymentMode === mode ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`payment-${activeOrder.id}`}
                        value={mode}
                        checked={activeOrder.paymentMode === mode}
                        onChange={() =>
                          setPaymentMode(mode as "Cash" | "UPI" | "Cash&UPI")
                        }
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>

                {/* Split Payment Inputs */}
                {activeOrder.paymentMode === "Cash&UPI" && (
                  <div
                    className="split-payment-inputs"
                    style={{ display: "flex", gap: "10px", marginTop: "10px" }}
                  >
                    <div>
                      <label>Cash: </label>
                      <input
                        type="number"
                        value={cashAmount}
                        min={0}
                        max={total}
                        onChange={(e) =>
                          handleCashChange(Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label>UPI: </label>
                      <input
                        type="number"
                        value={upiAmount}
                        min={0}
                        max={total}
                        onChange={(e) =>
                          handleUpiChange(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                )}
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
  );
}

export default RightPane;
