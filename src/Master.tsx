import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LeftPane from "./LeftPane";
import CenterPane from "./CenterPane";
import RightPane from "./RightPane";
import ViewPastOrders from "./ViewPastOrders";
import SalesReport from "./SalesReport";
import Toast from "./Toast";
import ConfirmModal from "./ConfirmModal";
import Expenditure from "./Expenditure";
import "./App.css";
import MenuItems from "./MenuItems";
import Analytics from "./Analytics";

interface MasterProps {
  cafeId: number | null;
  role: "admin" | "staff" | "viewer";
  handleLogout: () => void;
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
  paymentMode: "Cash" | "UPI" | "Cash&UPI"; // include split option
  cashAmount?: number; // for split payment
  upiAmount?: number; // for split payment
  isSubmitted: boolean;
}

function Master({ cafeId, role, handleLogout }: MasterProps) {
  const location = useLocation(); // 👈 get current route
  const isMenuPage = location.pathname.startsWith("/menu/");

  // 🔹 Helper to create a new empty order
  const createNewOrder = (orders: PendingOrder[]): PendingOrder => {
    const nextNumber = getNextOrderNumber(orders);
    return {
      id: Date.now(),
      name: `Order ${nextNumber}`,
      cart: [],
      paymentMode: "Cash", // default single payment
      cashAmount: 0, // for split payment
      upiAmount: 0, // for split payment
      isSubmitted: false,
    };
  };

  // Load pending orders from localStorage or fallback to one new order
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(() => {
    const stored = localStorage.getItem("pendingOrders");
    return stored ? JSON.parse(stored) : [createNewOrder([])];
  });

  // Load active order from localStorage or fallback to first order
  const [activeOrderId, setActiveOrderId] = useState<number | null>(() => {
    const storedActive = localStorage.getItem("activeOrderId");
    if (storedActive) return JSON.parse(storedActive);

    const storedOrders = localStorage.getItem("pendingOrders");
    if (storedOrders) {
      const parsed: PendingOrder[] = JSON.parse(storedOrders);
      return parsed.length > 0 ? parsed[0].id : null;
    }
    return null;
  });

  const [toast, setToast] = useState<string | null>(null);
  const [isLeftOpen, setIsLeftOpen] = useState(() => window.innerWidth > 768);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    orderId: number | null;
  }>({
    isOpen: false,
    orderId: null,
  });

  // 🔹 Find the lowest missing order number for display

  const getNextOrderNumber = (orders: PendingOrder[]) => {
    if (orders.length === 0) return 1;

    const existing = orders.map((o) => parseInt(o.name.replace("Order ", "")));
    for (let i = 1; i <= existing.length; i++) {
      if (!existing.includes(i)) return i; // fill gap
    }
    return Math.max(...existing) + 1; // continue
  };

  // Keep pendingOrders in sync with localStorage
  useEffect(() => {
    localStorage.setItem("pendingOrders", JSON.stringify(pendingOrders));
  }, [pendingOrders]);

  // Keep activeOrderId in sync with localStorage
  useEffect(() => {
    if (activeOrderId !== null) {
      localStorage.setItem("activeOrderId", JSON.stringify(activeOrderId));
    } else {
      localStorage.removeItem("activeOrderId");
    }
  }, [activeOrderId]);

  // ➕ Create new order tab
  const addNewOrder = () => {
    setPendingOrders((prev) => {
      const newOrder = createNewOrder(prev);
      setActiveOrderId(newOrder.id);
      return [...prev, newOrder];
    });
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
        if (updatedOrders.length > 0) {
          setActiveOrderId(updatedOrders[0].id);
        } else {
          const newOrder = createNewOrder([]);
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
    if (!activeOrderId) {
      setToast("⚠️ No active order. Please create one first!");
      return;
    }

    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart.find((c) => c.id === item.id)
                ? order.cart.map((c) =>
                    c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                  )
                : [...order.cart, { ...item, quantity: 1 }],
            }
          : order
      )
    );

    setToast(`${item.name} added to cart! ✅`);
  };

  const incrementQuantity = (id: number) => {
    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId
          ? {
              ...order,
              cart: order.cart.map((ci) =>
                ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci
              ),
            }
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
                .map((ci) =>
                  ci.id === id ? { ...ci, quantity: ci.quantity - 1 } : ci
                )
                .filter((ci) => ci.quantity > 0),
            }
          : order
      )
    );
  };

  const setPaymentMode = (mode: "Cash" | "UPI" | "Cash&UPI") => {
    setPendingOrders((prev) =>
      prev.map((order) =>
        order.id === activeOrderId ? { ...order, paymentMode: mode } : order
      )
    );
  };

  // ✅ Submit order
  const submitOrder = async (orderId: number) => {
    if (cafeId === null) return;

    const order = pendingOrders.find((o) => o.id === orderId);
    if (!order || order.cart.length === 0) return;

    try {
      const total = order.cart.reduce(
        (sum, ci) => sum + ci.price * ci.quantity,
        0
      );

      const itemsArray = order.cart.map((ci) => ({
        menu_item_id: ci.isCustom ? null : ci.id,
        item_name: ci.name,
        quantity: ci.quantity,
        price: ci.price,
      }));

      if (order.paymentMode === "Cash&UPI") {
        const cashAmount = order.cashAmount ?? 0;
        const upiAmount = order.upiAmount ?? 0;

        if (cashAmount <= 0 || upiAmount <= 0) {
          setToast("Both Cash and UPI amounts must be greater than 0 ❌");
          return;
        }

        if (cashAmount + upiAmount !== total) {
          setToast("Cash + UPI must equal total amount ❌");
          return;
        }

        // Determine which is larger
        const primaryPaymentMode = cashAmount >= upiAmount ? "Cash" : "UPI";
        const secondaryPaymentMode = cashAmount >= upiAmount ? "UPI" : "Cash";
        const primaryAmount = Math.max(cashAmount, upiAmount);
        const secondaryAmount = Math.min(cashAmount, upiAmount);

        // Submit primary payment with all items
        const { error: primaryError } = await supabase.rpc(
          "insert_order_with_items",
          {
            cafe: cafeId,
            items: itemsArray,
            payment_mode: primaryPaymentMode,
            total_amount: primaryAmount,
          }
        );
        if (primaryError) throw primaryError;

        // Submit secondary payment as **single item** with parent order number + mode
        const secondaryItem = [
          {
            menu_item_id: null,
            item_name: `${order.name}_${secondaryPaymentMode.toLowerCase()}`,
            quantity: 1,
            price: secondaryAmount,
          },
        ];

        const { error: secondaryError } = await supabase.rpc(
          "insert_order_with_items",
          {
            cafe: cafeId,
            items: secondaryItem,
            payment_mode: secondaryPaymentMode,
            total_amount: secondaryAmount,
          }
        );
        if (secondaryError) throw secondaryError;

        setToast(
          `Order submitted successfully split: ${primaryPaymentMode} ₹${primaryAmount}, ${secondaryPaymentMode} ₹${secondaryAmount}! ✅`
        );
      } else {
        // Normal single payment
        const { error } = await supabase.rpc("insert_order_with_items", {
          cafe: cafeId,
          items: itemsArray,
          payment_mode: order.paymentMode,
          total_amount: total,
        });
        if (error) throw error;

        setToast(
          `Order submitted successfully with ${order.paymentMode} payment! ✅`
        );
      }

      // Remove submitted order and reset active order
      setPendingOrders((prev) => {
        const remaining = prev.filter((o) => o.id !== orderId);
        if (remaining.length === 0) {
          const newOrder = createNewOrder([]);
          setActiveOrderId(newOrder.id);
          return [newOrder];
        } else {
          setActiveOrderId(remaining[0].id);
          return remaining;
        }
      });
    } catch (err) {
      console.error("Transaction failed:", err);
      setToast("Failed to submit order ❌");
    }
  };

  return (
    <>
      <div className="container">
        {/* Left Pane + Backdrop */}
        {isLeftOpen && (
          <div
            className="backdrop"
            onClick={() => setIsLeftOpen(false)} // close on outside click
          />
        )}
        <LeftPane
          isOpen={isLeftOpen}
          setIsOpen={setIsLeftOpen}
          role={role}
          handleLogout={handleLogout}
        />

        <div
          className="center-right"
          style={{ display: "flex", flexGrow: 1, transition: "all 0.3s" }}
        >
          <div className="center-pane-wrapper" style={{ flexGrow: 1 }}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/menu/maggi-and-noodles" replace />}
              />
              <Route
                path="/menu/*"
                element={<CenterPane addToCart={addToCart} />}
              />
              <Route
                path="/past-orders"
                element={
                  <div className="centered-content">
                    <ViewPastOrders role={role} />
                  </div>
                }
              />
              {(role === "admin" || role === "viewer") && (
                <Route
                  path="/sales-report"
                  element={
                    <div className="centered-content">
                      <SalesReport cafeId={cafeId} />
                    </div>
                  }
                />
              )}
              <Route
                path="/expenditure"
                element={
                  <div className="centered-content">
                    <Expenditure cafeId={cafeId} role={role} />
                  </div>
                }
              />

              {role === "admin" && (
                <Route
                  path="/menu-items"
                  element={
                    <div className="centered-content">
                      <MenuItems cafeId={cafeId} role={role} />
                    </div>
                  }
                />
              )}

              {(role === "admin" || role === "viewer") && (
                <Route
                  path="/analytics"
                  element={
                    <div className="centered-content">
                      <Analytics cafeId={cafeId} />
                    </div>
                  }
                />
              )}
            </Routes>
          </div>

          {isMenuPage && (
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
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message="This order has items. Are you sure you want to delete it?"
        onConfirm={() =>
          confirmModal.orderId && actuallyDeleteOrder(confirmModal.orderId)
        }
        onCancel={() => setConfirmModal({ isOpen: false, orderId: null })}
      />
    </>
  );
}

export default Master;
