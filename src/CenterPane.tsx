import { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import type { MenuItem } from "./Master";
import { supabase } from "./supabaseClient";

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
  const [customItem, setCustomItem] = useState({
    name: "",
    price: "",
    category: "",
  });

  const [searchQuery, setSearchQuery] = useState(""); // 🔎 search input
  const [suggestions, setSuggestions] = useState<MenuItem[]>([]); // auto-suggestions

  const location = useLocation();
  const cafeId = 1; // replace with your cafe ID

  // Fetch menu items
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

    const uniqueCategories = Array.from(
      new Set(items.map((i) => i.category))
    ).filter((cat) => cat.toLowerCase() !== "custom");

    setCategories(uniqueCategories);
  };

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchQuery(""); // reset input
        setSuggestions([]); // collapse suggestions
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Reset custom form when navigating to /menu/custom
  useEffect(() => {
    if (location.pathname.endsWith("/menu/custom")) {
      setCustomItem({ name: "", price: "", category: "" });
    }
  }, [location.pathname]);

  // Search suggestion logic
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSuggestions([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = menuItems.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
    setSuggestions(filtered.slice(0, 6)); // limit 6 results
  }, [searchQuery, menuItems]);

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    setSearchQuery(""); // clear search after selecting
    setSuggestions([]);
  };

  // Custom item submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name || !customItem.price) {
      alert("Please enter item name and price");
      return;
    }

    const newItem: MenuItem = {
      id: Date.now(),
      name: customItem.name,
      price: parseFloat(customItem.price),
      category: customItem.category || "Custom",
      isCustom: true,
    };

    handleAddToCart(newItem);
    setCustomItem({ name: "", price: "", category: "" });
  };

  return (
    <div className="center-pane">
      <h2>Menu</h2>

      {/* 🔎 Search Bar */}
      <div ref={searchRef} className="menu-search">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searchQuery && (
          <ul className="suggestions">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <li key={item.id} onClick={() => handleAddToCart(item)}>
                  <div>
                    {item.name} – ₹{item.price}
                  </div>
                  <div>{item.category}</div>
                </li>
              ))
            ) : (
              <li className="no-results">No items found</li>
            )}
          </ul>
        )}
      </div>

      {/* Category Navigation */}
      <nav className="menu-nav">
        {categories.map((cat) => {
          const slug = slugify(cat);
          return (
            <NavLink
              key={cat}
              to={`/menu/${slug}`}
              className={({ isActive }) =>
                `menu-link ${isActive ? "active" : ""}`
              }
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
        <Route
          index
          element={
            <Navigate
              to={`/menu/${slugify(categories[0] || "Custom")}`}
              replace
            />
          }
        />

        {categories.map((cat) => {
          const slug = slugify(cat);
          const itemsInCategory = menuItems.filter((i) => i.category === cat);

          return (
            <Route
              key={cat}
              path={slug}
              element={
                <div className="menu-grid">
                  {itemsInCategory.map((item) => (
                    <div key={item.id} className="menu-card">
                      <h4>{item.name}</h4>
                      <p>₹{item.price}</p>
                      <button onClick={() => handleAddToCart(item)}>
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              }
            />
          );
        })}

        <Route
          path="custom"
          element={
            <form className="custom-item-form" onSubmit={handleCustomSubmit}>
              <h3>Add Custom Item</h3>
              <input
                type="text"
                placeholder="Item Name"
                value={customItem.name}
                onChange={(e) =>
                  setCustomItem({ ...customItem, name: e.target.value })
                }
                required
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={customItem.price}
                onChange={(e) =>
                  setCustomItem({ ...customItem, price: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={customItem.category}
                onChange={(e) =>
                  setCustomItem({ ...customItem, category: e.target.value })
                }
              />
              <button type="submit" className="add-to-cart">
                Add to Cart
              </button>
            </form>
          }
        />
      </Routes>
    </div>
  );
}

export default CenterPane;
