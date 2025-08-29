import './App.css'
import CenterPane from './CenterPane'
import LeftPane from './LeftPane'
import RightPane from './RightPane'
import { useState } from 'react'

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

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existing = prevCart.find(ci => ci.id === item.id)
      if (existing) {
        return prevCart.map(ci =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      }
      return [...prevCart, { ...item, quantity: 1 }]
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
    <div className='container'>
      <LeftPane />
      <CenterPane addToCart={addToCart} />
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
