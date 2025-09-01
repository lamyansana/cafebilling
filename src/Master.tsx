import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./App.css"
import LeftPane from "./LeftPane"
import CenterPane from "./CenterPane"
import RightPane from "./RightPane"
import ViewPastOrders from "./ViewPastOrders"
import SalesReport from "./SalesReport"
import { menuItems } from "./CenterPane"

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
  const [activeOrderId, setActiveOrderId] = useState(pendingOrders[0].id)

  //const activeOrder = pendingOrders.find(o => o.id === activeOrderId)!

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

  const existingCSV = localStorage.getItem("ordersCSV")
  let orderNumber = 1
  if (existingCSV) {
    const rows = existingCSV.trim().split("\n")
    orderNumber = rows.length // header + rows
  }

  const timestamp = new Date().toLocaleString()
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

  // ❌ Instead of marking submitted, REMOVE it
  setPendingOrders(prev => {
    const remaining = prev.filter(o => o.id !== orderId)

    // if no pending orders left, add a fresh empty order
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
      // Switch active to the first remaining order
      setActiveOrderId(remaining[0].id)
      return remaining
    }
  })

  alert(`Order #${orderNumber} submitted successfully with ${order.paymentMode} payment!`)
}


  return (
    <BrowserRouter>
      <div className="container">
        <LeftPane />
        <Routes>
          <Route path="/" element={<Navigate to="/menu/maggi-and-noodles" replace />} />
          <Route path="/menu/*" element={<CenterPane addToCart={addToCart} />} />
          <Route path="/past-orders" element={<ViewPastOrders />} />
          <Route path="/sales-report" element={<SalesReport menuItems={menuItems} />} />
        </Routes>
        <RightPane
          orders={pendingOrders}
          activeOrderId={activeOrderId}
          switchOrder={switchOrder}
          addNewOrder={addNewOrder}
          incrementQuantity={incrementQuantity}
          decrementQuantity={decrementQuantity}
          setPaymentMode={setPaymentMode}
          submitOrder={submitOrder}
        />
      </div>
    </BrowserRouter>
  )
}

export default Master
