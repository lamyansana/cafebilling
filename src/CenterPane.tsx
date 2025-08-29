import type { MenuItem } from './App'

interface CenterPaneProps {
  addToCart: (item: MenuItem) => void
}

const menuItems: MenuItem[] = [
  { id: 1, name: "Cappuccino", price: 50 },
  { id: 2, name: "Coffee Mocha", price: 50 },
  { id: 3, name: "Coffee Latte", price: 50 },
  { id: 4, name: "Hot Chocolate", price: 50 },
  { id: 5, name: "Masala Tea", price: 20 },
  { id: 6, name: "Ginger Green Tea", price: 30 },
  { id: 7, name: "Cold Coffee", price: 80 },
  { id: 8, name: "Burrito (myco SPECIAL)", price: 140 },
  { id: 9, name: "Sandwich", price: 60 },
  { id: 10, name: "Viral Maggi", price: 60 },
  { id: 11, name: "Chicken Fried Rice", price: 160 },
]

function CenterPane({ addToCart }: CenterPaneProps) {
  return (
    <div className="center-pane">
      <h2>Menu</h2>
      <div className="menu-grid">
        {menuItems.map(item => (
          <div key={item.id} className="menu-card">
            <h4>{item.name}</h4>
            <p>₹{item.price}</p>
            <button onClick={() => addToCart(item)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CenterPane
