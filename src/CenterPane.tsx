import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import type { MenuItem } from "./Master";

interface CenterPaneProps {
  addToCart: (item: MenuItem) => void;
}

// slugify helper → makes category URL safe
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/&/g, "and")       // replace &
    .replace(/\s+/g, "-")       // replace spaces
    .replace(/[^\w-]+/g, "");   // remove non-word chars

export const menuItems: MenuItem[] = [
  // ☕ Coffee & Hot Beverages
  { id: 1, name: "Cappuccino (m)", price: 50, category: "Coffee & Hot Beverages" },
  { id: 2, name: "Coffee Mocha (m)", price: 50, category: "Coffee & Hot Beverages" },
  { id: 3, name: "Coffee Latte (m)", price: 50, category: "Coffee & Hot Beverages" },
  { id: 4, name: "Hot Chocolate (m)", price: 50, category: "Coffee & Hot Beverages" },
  { id: 5, name: "Masala Tea", price: 20, category: "Coffee & Hot Beverages" },
  { id: 6, name: "Ginger Green Tea", price: 30, category: "Coffee & Hot Beverages" },
  { id: 24, name: "WATER HALF", price: 10, category: "Coffee & Hot Beverages" },
  { id: 25, name: "WATER FULL", price: 20, category: "Coffee & Hot Beverages" },

  // 🧋 Cold Beverages
  { id: 7, name: "Coconut Coffee Mocha", price: 130, category: "Cold Beverages" },
  { id: 8, name: "Cold Coffee", price: 80, category: "Cold Beverages" },

  // 🍹 Fresh Juices & Smoothies
  { id: 9, name: "Pineapple Smoothie", price: 80, category: "Fresh Juices & Smoothies" },
  { id: 10, name: "Dragon Fruit Smoothie", price: 100, category: "Fresh Juices & Smoothies" },
  { id: 11, name: "Watermelon Smoothie", price: 80, category: "Fresh Juices & Smoothies" },
  { id: 12, name: "Fresh Lime Juice", price: 50, category: "Fresh Juices & Smoothies" },

  // 🌯 Wraps & Rolls
  { id: 13, name: "Burrito (myco SPECIAL)", price: 150, category: "Wraps & Rolls" },
  { id: 14, name: "Sandwich", price: 60, category: "Wraps & Rolls" },

  // 🍜 Maggi & Noodles
  { id: 15, name: "Veg Chowmein", price: 120, category: "Maggi & Noodles" },
  { id: 16, name: "Chicken Chowmein", price: 160, category: "Maggi & Noodles" },
  { id: 17, name: "Chicken Chilli", price: 170, category: "Maggi & Noodles" },
  { id: 18, name: "Chicken Fried Rice", price: 160, category: "Maggi & Noodles" },
  { id: 19, name: "Viral Maggi", price: 60, category: "Maggi & Noodles" },

  // 🍴 Quick Bites
  { id: 20, name: "Veg Momos (Fried/Half)", price: 100, category: "Quick Bites" },
  { id: 21, name: "Chicken Momos (Fried/Half)", price: 120, category: "Quick Bites" },
  { id: 22, name: "French Fries", price: 80, category: "Quick Bites" },
  { id: 23, name: "Jhol Momo (Fried/Half)", price: 150, category: "Quick Bites" },
];

function CenterPane({ addToCart }: CenterPaneProps) {
  const categories = Array.from(new Set(menuItems.map((item) => item.category)));

  return (
    <div className="center-pane">
      <h2>Menu</h2>

      {/* Navigation */}
      <nav className="menu-nav">
  {categories.map((cat) => {
    const slug = slugify(cat);
    return (
      <NavLink
        key={cat}
        to={`/menu/${slug}`}  // Absolute path is fine
        className={({ isActive }) => `menu-link ${isActive ? "active" : ""}`}
      >
        {cat}
      </NavLink>
    );
  })}
</nav>


      {/* Routes */}
      <Routes>
  {/* Redirect /menu → Maggi & Noodles */}
  <Route index element={<Navigate to={slugify("Maggi & Noodles")} replace />} />

  {categories.map((cat) => {
    const slug = slugify(cat);
    const items = menuItems.filter((i) => i.category === cat);

    return (
      <Route
        key={cat}
        path={slug} // RELATIVE path
        element={
          <div className="menu-grid">
            {items.map((item) => (
              <div key={item.id} className="menu-card">
                <h4>{item.name}</h4>
                <p>₹{item.price}</p>
                <button onClick={() => addToCart(item)}>Add to Cart</button>
              </div>
            ))}
          </div>
        }
      />
    );
  })}
</Routes>

    </div>
  );
}

export default CenterPane;
