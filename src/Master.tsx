import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./App.css"
import LeftPane from "./LeftPane"
import CenterPane from "./CenterPane"
import RightPane from "./RightPane"
import ViewPastOrders from "./ViewPastOrders"
import SalesReport from "./SalesReport"
import { menuItems } from "./CenterPane"
import Toast from "./toast"
import ConfirmModal from "./ConfirmModal"

export interface MenuItem {
  id: number
  category: string
  name: string
  price: number
}

export interface CartItem extends MenuItem {
  quantity: number
}

export interface PendingOrder {
  id: number
  name: string
  cart: CartItem[]
  paymentMode: string
  isSubmitted: boolean
}

function Master() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([
    { id: Date.now(), name: "Order 1", cart: [], paymentMode: "Cash", isSubmitted: false }
  ])
  const [activeOrderId, setActiveOrderId] = useState<number | null>(
    pendingOrders.length > 0 ? pendingOrders[0].id : null
  )
  
  const [toast, setToast] = useState<string | null>(null)
  const [isLeftOpen, setIsLeftOpen] = useState(true)

  // ✅ New state for confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    orderId: number | null
  }>({ isOpen: false, orderId: null })

  // ➕ Create new order tab
  const addNewOrder = () => {
    const newOrder = {
      id: Date.now(),
      name: `Order ${pendingOrders.length + 1}`,
      cart: [],
      paymentMode: "Cash",
      isSubmitted: false,
    }
    setPendingOrders(prev => [...prev, newOrder])
    setActiveOrderId(newOrder.id)
  }

  // ❌ Delete order with confirmation if it has items
  const deleteOrder = (id: number) => {
    const order = pendingOrders.find(o => o.id === id)

    if (order && order.cart.length > 0) {
      // open confirmation modal
      setConfirmModal({ isOpen: true, orderId: id })
      return
    }

    // otherwise delete directly
    actuallyDeleteOrder(id)
  }

  const actuallyDeleteOrder = (id: number) => {
    setPendingOrders(prevOrders => {
      const updatedOrders = prevOrders.filter(order => order.id !== id)

      // If the deleted order was active
      if (activeOrderId === id) {
        if (updatedOrders.length > 0) {
          setActiveOrderId(updatedOrders[0].id)
        } else {
          // no orders left → always create new one
          const newOrder = {
            id: Date.now(),
            name: "Order 1",
            cart: [],
            paymentMode: "Cash",
            isSubmitted: false,
          }
          setActiveOrderId(newOrder.id)
          return [newOrder]
        }
      }

      return updatedOrders
    })

    setConfirmModal({ isOpen: false, orderId: null })
    setToast("Order deleted successfully ✅")
  }

  const switchOrder = (id: number) => setActiveOrderId(id)

  // 🔹 Cart operations
  const addToCart = (item: MenuItem) => {
    setPendingOrders(prev =>
      prev.map(order =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart.find(c => c.id === item.id)
                ? order.cart.map(c =>
                    c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                  )
                : [...order.cart, { ...item, quantity: 1 }],
            }
          : order
      )
    )
  }

  const incrementQuantity = (id: number) => {
    setPendingOrders(prev =>
      prev.map(order =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart.map(ci =>
                ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci
              ),
            }
          : order
      )
    )
  }

  const decrementQuantity = (id: number) => {
    setPendingOrders(prev =>
      prev.map(order =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart
                .map(ci =>
                  ci.id === id ? { ...ci, quantity: ci.quantity - 1 } : ci
                )
                .filter(ci => ci.quantity > 0),
            }
          : order
      )
    )
  }

  const setPaymentMode = (mode: string) => {
    setPendingOrders(prev =>
      prev.map(order =>
        order.id === activeOrderId ? { ...order, paymentMode: mode } : order
      )
    )
  }

  // ✅ Submit individual order
  const submitOrder = (orderId: number) => {
    const order = pendingOrders.find(o => o.id === orderId)
    if (!order || order.cart.length === 0) return

    if (typeof window === "undefined") return

    const existingCSV = localStorage.getItem("ordersCSV")
    let orderNumber = 1

    if (existingCSV) {
      const rows = existingCSV.trim().split("\n").slice(1)
      const todayStr = new Date().toISOString().split("T")[0]

      const todaysOrders = rows.filter(row => {
        const cols = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        if (cols.length < 2) return false
        const dateStr = cols[1].replace(/"/g, "").trim()
        if (!dateStr) return false

        const rowDate = new Date(dateStr)
        if (isNaN(rowDate.getTime())) return false

        return rowDate.toISOString().split("T")[0] === todayStr
      })

      orderNumber = todaysOrders.length + 1
    }

    const timestamp = new Date().toISOString()
    const itemsString = order.cart.map(ci => `${ci.name} x${ci.quantity}`).join("; ")
    const total = order.cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0)

    const newRow = `${orderNumber}, "${timestamp}", "${itemsString}", ${total}, ${order.paymentMode}\n`

    let updatedCSV = ""
    if (!existingCSV) {
      updatedCSV = "OrderNumber, DateTime, Items, Total, PaymentMode\n" + newRow
    } else {
      updatedCSV = existingCSV + newRow
    }

    localStorage.setItem("ordersCSV", updatedCSV)

    setPendingOrders(prev => {
      const remaining = prev.filter(o => o.id !== orderId)

      if (remaining.length === 0) {
        const newOrder = {
          id: Date.now(),
          name: "Order 1",
          cart: [],
          paymentMode: "Cash",
          isSubmitted: false,
        }
        setActiveOrderId(newOrder.id)
        return [newOrder]
      } else {
        setActiveOrderId(remaining[0].id)
        return remaining
      }
    })

    setToast(`Order #${orderNumber} submitted successfully with ${order.paymentMode} payment!`)
  }

  return (
    <BrowserRouter>
      <div className="container">
        {/* Left Pane */}
        <LeftPane isOpen={isLeftOpen} setIsOpen={setIsLeftOpen} />

        {/* Center + Right */}
        <div className="center-right" style={{ display: "flex", flexGrow: 1, transition: "all 0.3s" }}>
          <div className="center-pane-wrapper" style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/menu/maggi-and-noodles" replace />} />
              <Route path="/menu/*" element={<CenterPane addToCart={addToCart} />} />
              <Route path="/past-orders" element={<ViewPastOrders />} />
              <Route path="/sales-report" element={<SalesReport menuItems={menuItems} />} />
            </Routes>
          </div>

          {/* Right Pane */}
          <RightPane
            orders={pendingOrders}
            activeOrderId={activeOrderId}
            setActiveOrderId={setActiveOrderId}
            switchOrder={switchOrder}
            addNewOrder={addNewOrder}
            incrementQuantity={incrementQuantity}
            decrementQuantity={decrementQuantity}
            setPaymentMode={setPaymentMode}
            submitOrder={submitOrder}
            deleteOrder={deleteOrder}
          />
        </div>
      </div>

      {/* ✅ Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ✅ Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message="This order has items. Are you sure you want to delete it?"
        onConfirm={() => confirmModal.orderId && actuallyDeleteOrder(confirmModal.orderId)}
        onCancel={() => setConfirmModal({ isOpen: false, orderId: null })}
      />
    </BrowserRouter>
  )
}

export default Master
