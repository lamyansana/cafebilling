import { useState } from "react"
import "./App.css"
import LeftPane from "./LeftPane"
import CenterPane from "./CenterPane"
import RightPane from "./RightPane"
import ViewPastOrders from "./ViewPastOrders"

export interface MenuItem {
  id: number
  name: string
  price: number
}

export interface CartItem extends MenuItem {
  quantity: number
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeView, setActiveView] = useState<"menu" | "pastOrders">("menu")

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      } else {
        return [...prev, { ...item, quantity: 1 }]
      }
    })
  }

  const incrementQuantity = (id: number) => {
    setCart(prevCart =>
      prevCart.map(ci =>
        ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci
      )
    )
  }

  const decrementQuantity = (id: number) => {
    setCart(prevCart =>
      prevCart
        .map(ci =>
          ci.id === id ? { ...ci, quantity: ci.quantity - 1 } : ci
        )
        .filter(ci => ci.quantity > 0)
    )
  }

  const submitOrder = () => {
    if (cart.length === 0) return

    const timestamp = new Date().toLocaleString()
    const itemsString = cart.map(ci => `${ci.name} x${ci.quantity}`).join('; ')
    const total = cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0)
    const newRow = `${timestamp}, "${itemsString}", ${total}\n`

    const existingCSV = localStorage.getItem('ordersCSV')
    let updatedCSV = ''
    if (!existingCSV) {
      updatedCSV = 'DateTime, Items, Total\n' + newRow
    } else {
      updatedCSV = existingCSV + newRow
    }

    localStorage.setItem('ordersCSV', updatedCSV)
    setCart([])
    alert('Order submitted!')
  }

  return (
    <div className="container">
      <LeftPane setActiveView={setActiveView} />
      {activeView === "menu" ? (
        <CenterPane addToCart={addToCart} />
      ) : (
        <ViewPastOrders />
      )}
      <RightPane
      cart={cart}
      incrementQuantity={incrementQuantity}
      decrementQuantity={decrementQuantity}
      submitOrder={submitOrder}
    />
    </div>
  )
}

export default App
