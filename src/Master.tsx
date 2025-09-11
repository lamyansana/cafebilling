import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import LeftPane from "./LeftPane";
import CenterPane from "./CenterPane";
import RightPane from "./RightPane";
import ViewPastOrders from "./ViewPastOrders";
import SalesReport from "./SalesReport";
import Toast from "./Toast";
import ConfirmModal from "./ConfirmModal";
import Expenditure from "./Expenditure";

interface MasterProps {
  //session: any;
  cafeId: number | null;
  role: "admin" | "staff";
}

export interface MenuItem {
  id: number;
  category: string;
  name: string;
  price: number;
  isCustom?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface PendingOrder {
  id: number;
  name: string;
  cart: CartItem[];
  paymentMode: "Cash" | "UPI";
  isSubmitted: boolean;
}

function Master({cafeId, role }: MasterProps) {
  
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([
    { id: Date.now(), name: "Order 1", cart: [], paymentMode: "Cash", isSubmitted: false }
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(
    pendingOrders.length > 0 ? pendingOrders[0].id : null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; orderId: number | null }>({
    isOpen: false,
    orderId: null
  });

  // Fetch menu items only if cafeId exists
  useEffect(() => {
    if (cafeId === null) return;

    const fetchMenu = async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("cafe_id", cafeId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to fetch menu items:", error);
        setToast("Failed to load menu ❌");
      } else if (data) {
        //setMenuItems(data as MenuItem[]);
      }
    };

    fetchMenu();
  }, [cafeId])

  // ➕ Create new order tab
  const addNewOrder = () => {
    const newOrder: PendingOrder = {
      id: Date.now(),
      name: `Order ${pendingOrders.length + 1}`,
      cart: [],
      paymentMode: "Cash",
      isSubmitted: false,
    };
    setPendingOrders((prev) => [...prev, newOrder]);
    setActiveOrderId(newOrder.id);
  };

  // ❌ Delete order
  const deleteOrder = (id: number) => {
    const order = pendingOrders.find((o) => o.id === id);
    if (order && order.cart.length > 0) {
      setConfirmModal({ isOpen: true, orderId: id });
      return;
    }
    actuallyDeleteOrder(id);
  };

  const actuallyDeleteOrder = (id: number) => {
    setPendingOrders((prevOrders) => {
      const updatedOrders = prevOrders.filter((order) => order.id !== id);

      if (activeOrderId === id) {
        if (updatedOrders.length > 0) setActiveOrderId(updatedOrders[0].id);
        else {
          const newOrder: PendingOrder = {
            id: Date.now(),
            name: "Order 1",
            cart: [],
            paymentMode: "Cash",
            isSubmitted: false,
          };
          setActiveOrderId(newOrder.id);
          return [newOrder];
        }
      }

      return updatedOrders;
    });

    setConfirmModal({ isOpen: false, orderId: null });
    setToast("Order deleted successfully ✅");
  };

  const switchOrder = (id: number) => setActiveOrderId(id);

  // 🔹 Cart operations
  const addToCart = (item: MenuItem) => {
    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart.find((c) => c.id === item.id)
                ? order.cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
                : [...order.cart, { ...item, quantity: 1 }],
            }
          : order
      )
    );
  };

  const incrementQuantity = (id: number) => {
    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId
          ? { ...order, cart: order.cart.map((ci) => (ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci)) }
          : order
      )
    );
  };

  const decrementQuantity = (id: number) => {
    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart
                .map((ci) => (ci.id === id ? { ...ci, quantity: ci.quantity - 1 } : ci))
                .filter((ci) => ci.quantity > 0),
            }
          : order
      )
    );
  };

  const setPaymentMode = (mode: "Cash" | "UPI") => {
    setPendingOrders((prev) =>
      prev.map((order) => (order.id === activeOrderId ? { ...order, paymentMode: mode } : order))
    );
  };

  // ✅ Submit order
  const submitOrder = async (orderId: number) => {
    if (cafeId === null) return;

    const order = pendingOrders.find((o) => o.id === orderId);
    if (!order || order.cart.length === 0 || !cafeId) return;

    try {
      const total = order.cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
      const itemsArray = order.cart.map((ci) => ({
        menu_item_id: ci.isCustom ? null : ci.id,
        item_name: ci.name,
        quantity: ci.quantity,
        price: ci.price,
      }));

      const { error } = await supabase.rpc("insert_order_with_items", {
        cafe: cafeId,
        items: itemsArray,
        payment_mode: order.paymentMode,
        total_amount: total,
      });

      if (error) throw error;

      setPendingOrders((prev) => {
        const remaining = prev.filter((o) => o.id !== orderId);
        if (remaining.length === 0) {
          const newOrder: PendingOrder = {
            id: Date.now(),
            name: "Order 1",
            cart: [],
            paymentMode: "Cash",
            isSubmitted: false,
          };
          setActiveOrderId(newOrder.id);
          return [newOrder];
        } else {
          setActiveOrderId(remaining[0].id);
          return remaining;
        }
      });

      setToast(`Order submitted successfully with ${order.paymentMode} payment! ✅`);
    } catch (err) {
      console.error("Transaction failed:", err);
      setToast("Failed to submit order ❌");
    }
  };

  return (
    <BrowserRouter>
      <div className="container">
        <LeftPane isOpen={isLeftOpen} setIsOpen={setIsLeftOpen} role={role}/>

        <div className="center-right" style={{ display: "flex", flexGrow: 1, transition: "all 0.3s" }}>
          <div className="center-pane-wrapper" style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/menu/maggi-and-noodles" replace />} />
              <Route path="/menu/*" element={<CenterPane addToCart={addToCart} />} />
              <Route path="/past-orders" element={<ViewPastOrders />} />
              {role === "admin" && (
  <Route path="/sales-report" element={<SalesReport cafeId={cafeId} />} />
)}

              <Route path="/expenditure" element={<Expenditure  cafeId={cafeId} />} />
            </Routes>
          </div>

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

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message="This order has items. Are you sure you want to delete it?"
        onConfirm={() => confirmModal.orderId && actuallyDeleteOrder(confirmModal.orderId)}
        onCancel={() => setConfirmModal({ isOpen: false, orderId: null })}
      />
    </BrowserRouter>
  );
}

export default Master;
