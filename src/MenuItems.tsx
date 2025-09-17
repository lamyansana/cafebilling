import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

interface MenuItemsProps {
  //session: any;
  cafeId: number | null;
  role: "admin" | "staff" | "viewer";
}

interface MenuItem {
  id: number
  name: string
  price: number
  category?: string
}

const MenuItems: React.FC<MenuItemsProps> = ({ cafeId }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // New item fields
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newCategory, setNewCategory] = useState("")

  // Editing fields
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editCategory, setEditCategory] = useState("")


  // Fetch menu items
  const fetchMenuItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("id", { ascending: true })

    if (error) {
      console.error("Error fetching menu:", error.message)
    } else {
      setMenuItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMenuItems()
  }, [])

  // Add new item
  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from("menu_items").insert([
      {
        cafe_id: cafeId,
        name: newName,
        price: parseFloat(newPrice),
        category: newCategory || null,
      },
    ]).select()

    if (error) {
      alert("Error adding item: " + error.message)
    } else {
      setMenuItems(prev => [...prev, ...(data || [])])
      setNewName("")
      setNewPrice("")
      setNewCategory("")
    }
  }

  // Delete item
  const deleteMenuItem = async (id: number) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id)
    if (error) {
      alert("Error deleting item: " + error.message)
    } else {
      setMenuItems(prev => prev.filter(item => item.id !== id))
    }
  }

  // Start editing
  const startEditing = (item: MenuItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.price.toString())
    setEditCategory(item.category || "")
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
    setEditName("")
    setEditPrice("")
    setEditCategory("")
  }

  // Save edit
  const saveEdit = async (id: number) => {
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: editName,
        price: parseFloat(editPrice),
        category: editCategory || null,
      })
      .eq("id", id)
      .select()

    if (error) {
      alert("Error updating item: " + error.message)
    } else {
      setMenuItems(prev =>
        prev.map(item => (item.id === id ? (data ? data[0] : item) : item))
      )
      cancelEditing()
    }
  }

  if (loading) return <p>Loading menu...</p>

  return (
    <div style={{ padding: "1rem" }}>
      <h2>🍴 Menu Items</h2>

      {/* Add new item form */}
      <form onSubmit={addMenuItem} style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Item name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <input
          placeholder="Price"
          type="number"
          step="0.01"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          required
        />
        <input
          placeholder="Category"
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
        />
        <button type="submit">➕ Add Item</button>
      </form>

      {/* Menu Table */}
      <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price (₹)</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {menuItems.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>
                {editingId === item.id ? (
                  <input value={editName} onChange={e => setEditName(e.target.value)} />
                ) : (
                  item.name
                )}
              </td>
              <td>
                {editingId === item.id ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                  />
                ) : (
                  item.price.toFixed(2)
                )}
              </td>
              <td>
                {editingId === item.id ? (
                  <input value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                ) : (
                  item.category || "-"
                )}
              </td>
              <td>
                {editingId === item.id ? (
                  <>
                    <button onClick={() => saveEdit(item.id)}>💾 Save</button>
                    <button onClick={cancelEditing}>❌ Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditing(item)}>✏️ Edit</button>
                    <button onClick={() => deleteMenuItem(item.id)}>🗑️ Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MenuItems
