import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import type { MenuItem } from "./Master";
import { supabase } from "./supabaseClient";

// Helper to convert category names into URL-friendly slugs
const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

interface CenterPaneProps {
  addToCart: (item: MenuItem) => void;
}

function CenterPane({ addToCart }: CenterPaneProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState({ name: "", price: "", category: "" });

  const cafeId = 1; // replace with your cafe ID

  // Fetch menu items from Supabase
  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching menu items:", error.message);
      return;
    }

    const items: MenuItem[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
    }));

    setMenuItems(items);

    const uniqueCategories = Array.from(new Set(items.map(i => i.category)));
    setCategories(uniqueCategories);
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Add a custom item to cart and Supabase
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name || !customItem.price) {
      alert("Please enter item name and price");
      return;
    }

    const newItem: MenuItem = {
      id: Date.now(), // temporary frontend ID
      name: customItem.name,
      price: parseFloat(customItem.price),
      category: customItem.category || "Custom",
    };

    // Add directly to cart
    addToCart(newItem);

    // Save to Supabase
    const { error } = await supabase.from("menu_items").insert([
      {
        name: newItem.name,
        price: newItem.price,
        category: newItem.category,
        cafe_id: cafeId,
      },
    ]);

    if (error) console.error("Failed to add custom item:", error.message);
    else fetchMenuItems(); // refresh menu

    setCustomItem({ name: "", price: "", category: "" });
  };

  return (
    <div className="center-pane">
      <h2>Menu</h2>

      {/* Category Navigation */}
      <nav className="menu-nav">
        {categories.map(cat => {
          const slug = slugify(cat);
          return (
            <NavLink
              key={cat}
              to={`/menu/${slug}`}
              className={({ isActive }) => `menu-link ${isActive ? "active" : ""}`}
            >
              {cat}
            </NavLink>
          );
        })}
        <NavLink
          to="/menu/custom"
          className={({ isActive }) => `menu-link ${isActive ? "active" : ""}`}
        >
          ➕ Custom Item
        </NavLink>
      </nav>

      {/* Routes */}
      <Routes>
        {/* Redirect /menu → first category */}
        <Route index element={<Navigate to={`/menu/${slugify(categories[0] || "Custom")}`} replace />} />

        {/* Category Routes */}
        {categories.map(cat => {
          const slug = slugify(cat);
          const itemsInCategory = menuItems.filter(i => i.category === cat);

          return (
            <Route
              key={cat}
              path={slug}
              element={
                <div className="menu-grid">
                  {itemsInCategory.map(item => (
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

        {/* Custom Item Route */}
        <Route
          path="custom"
          element={
            <form className="custom-item-form" onSubmit={handleCustomSubmit}>
              <h3>Add Custom Item</h3>
              <input
                type="text"
                placeholder="Item Name"
                value={customItem.name}
                onChange={e => setCustomItem({ ...customItem, name: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={customItem.price}
                onChange={e => setCustomItem({ ...customItem, price: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={customItem.category}
                onChange={e => setCustomItem({ ...customItem, category: e.target.value })}
              />
              <button type="submit">Add to Cart</button>
            </form>
          }
        />
      </Routes>
    </div>
  );
}

export default CenterPane;
