// Analytics.tsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsProps {
  cafeId: number | null;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  payment_mode: string;
  order_items: { item_name: string; quantity: number; price: number }[];
}

interface Expenditure {
  amount: number;
  date: string;
  payment_mode: "Cash" | "UPI";
  item: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ cafeId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [filter, setFilter] = useState<
    | "today"
    | "yesterday"
    | "week"
    | "month"
    | "year"
    | "range"
    | "7days"
    | "30days"
    | "quarter"
    | "ytd"
  >("today");
  const today = new Date().toISOString().split("T")[0];
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const [showAllExpenditures, setShowAllExpenditures] = useState(false);
  const [drilldownItem, setDrilldownItem] = useState<string | null>(null);
  const [selectedExpItem, setSelectedExpItem] = useState<string | null>(null);
  const [balances, setBalances] = useState({ cash: 0, upi: 0 });

  useEffect(() => {
    if (!cafeId) return;

    const fetchData = async () => {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          total_amount,
          payment_mode,
          order_items (
            item_name,
            quantity,
            price
          )
        `
        )
        .eq("cafe_id", cafeId)
        .order("created_at", { ascending: true });

      setOrders(ordersData || []);

      const { data: expData } = await supabase
        .from("expenditures")
        .select("amount, date, payment_mode, item")
        .eq("cafe_id", cafeId)
        .order("date", { ascending: true });

      setExpenditures(expData || []);
    };

    fetchData();
  }, [cafeId]);

  useEffect(() => {
    const fetchBalances = async () => {
      const { data, error } = await supabase
        .from("balances")
        .select("cash_balance, upi_balance")
        .single();

      if (!error && data) {
        setBalances({
          cash: data.cash_balance || 0,
          upi: data.upi_balance || 0,
        });
      } else {
        console.error("Error fetching balances:", error?.message);
      }
    };

    fetchBalances();
  }, []);

  // --- Filter by date ---
  const filterByDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfQuarter = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1
    );
    const start7 = new Date(now);
    start7.setDate(now.getDate() - 6);
    start7.setHours(0, 0, 0, 0);
    const start30 = new Date(now);
    start30.setDate(now.getDate() - 29);
    start30.setHours(0, 0, 0, 0);

    switch (filter) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
      }
      case "week":
        return d >= startOfWeek && d <= now;
      case "month":
        return d >= startOfMonth && d <= now;
      case "year":
        return d >= startOfYear && d <= now;
      case "7days":
        return d >= start7 && d <= now;
      case "30days":
        return d >= start30 && d <= now;
      case "quarter":
        return d >= startOfQuarter && d <= now;
      case "ytd":
        return d >= startOfYear && d <= now;
      case "range": {
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  };

  const filteredOrders = orders.filter((o) => filterByDate(o.created_at));
  const filteredExpenditures = expenditures.filter((e) => filterByDate(e.date));

  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // --- KPIs ---
  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + o.total_amount,
    0
  );
  const totalExpenses = filteredExpenditures.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const totalProfit = totalRevenue - totalExpenses;

  const expensePercent =
    totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
  const profitPercent =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // --- Daily Trend (Revenue, Expenses, Profit) ---
  const dateMap = new Map<string, { revenue: number; expenses: number }>();
  filteredOrders.forEach((o) => {
    const date = new Date(o.created_at).toLocaleDateString();
    if (!dateMap.has(date)) dateMap.set(date, { revenue: 0, expenses: 0 });
    dateMap.get(date)!.revenue += o.total_amount;
  });
  filteredExpenditures.forEach((e) => {
    const date = new Date(e.date).toLocaleDateString();
    if (!dateMap.has(date)) dateMap.set(date, { revenue: 0, expenses: 0 });
    dateMap.get(date)!.expenses += e.amount;
  });

  const dailyLabels: string[] = [];
  const dailyRevenue: number[] = [];
  const dailyExpenses: number[] = [];
  const dailyProfit: number[] = [];
  Array.from(dateMap.keys())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .forEach((date) => {
      dailyLabels.push(date);
      const data = dateMap.get(date)!;
      dailyRevenue.push(data.revenue);
      dailyExpenses.push(data.expenses);
      dailyProfit.push(data.revenue - data.expenses);
    });

  // 7-day moving average
  const movingAverage = (arr: number[], window: number) =>
    arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const subset = arr.slice(start, i + 1);
      return subset.reduce((a, b) => a + b, 0) / subset.length;
    });

  const dailyTrendData = {
    labels: dailyLabels,
    datasets: [
      {
        label: "Revenue",
        data: dailyRevenue,
        borderColor: "green",
        backgroundColor: "rgba(0,128,0,0.3)",
      },
      {
        label: "Expenses",
        data: dailyExpenses,
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.3)",
      },
      {
        label: "Profit",
        data: dailyProfit,
        borderColor: "blue",
        backgroundColor: "rgba(0,0,255,0.3)",
      },
      {
        label: "Revenue (7d Avg)",
        data: movingAverage(dailyRevenue, 7),
        borderColor: "darkgreen",
        borderDash: [5, 5],
      },
    ],
  };

  // --- Revenue vs Expenditure Comparison ---
  const revenueVsExpenditureData = {
    labels: dailyLabels,
    datasets: [
      {
        label: "Revenue",
        data: dailyRevenue,
        backgroundColor: "rgba(0,128,0,0.7)",
      },
      {
        label: "Expenditure",
        data: dailyExpenses,
        backgroundColor: "rgba(255,0,0,0.7)",
      },
    ],
  };
  const revenueVsExpenditureOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Revenue vs Expenditure (Comparison)" },
    },
  };

  // --- Top Items ---
  const itemSalesMap = new Map<string, number>();
  filteredOrders.forEach((o) =>
    o.order_items.forEach((it) => {
      itemSalesMap.set(
        it.item_name,
        (itemSalesMap.get(it.item_name) || 0) + it.quantity
      );
    })
  );
  const sortedItems = Array.from(itemSalesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topItemsData = {
    labels: sortedItems.map(([name]) => name),
    datasets: [
      {
        label: "Quantity Sold",
        data: sortedItems.map(([_, qty]) => qty),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  // Drill-down for top item
  const drilldownData = drilldownItem
    ? {
        labels: dailyLabels,
        datasets: [
          {
            label: `${drilldownItem} Daily Sales`,
            data: dailyLabels.map((date) => {
              const dayOrders = filteredOrders.filter(
                (o) => new Date(o.created_at).toLocaleDateString() === date
              );
              return dayOrders.reduce((sum, o) => {
                const item = o.order_items.find(
                  (it) => it.item_name === drilldownItem
                );
                return sum + (item?.quantity || 0);
              }, 0);
            }),
            borderColor: "orange",
            backgroundColor: "rgba(255,165,0,0.3)",
          },
        ],
      }
    : null;

  // --- Payment Mode Split ---
  const paymentCounts: { [key: string]: number } = { Cash: 0, UPI: 0 };
  filteredOrders.forEach((o) => {
    paymentCounts[o.payment_mode] = (paymentCounts[o.payment_mode] || 0) + 1;
  });

  const paymentAmounts: { [key: string]: number } = { Cash: 0, UPI: 0 };
  filteredOrders.forEach((o) => {
    paymentAmounts[o.payment_mode] =
      (paymentAmounts[o.payment_mode] || 0) + o.total_amount;
  });

  const paymentModeData = {
    labels: ["Cash", "UPI"],
    datasets: [
      {
        label: "Orders",
        data: [paymentCounts.Cash, paymentCounts.UPI],
        backgroundColor: ["#36A2EB", "#FF6384"],
      },
    ],
  };

  const paymentModeOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label; // Cash or UPI
            const orders = paymentCounts[label];
            const amount = paymentAmounts[label];
            return `${label}: ${orders} orders, ₹${amount}`;
          },
        },
      },
      legend: { position: "top" as const },
      title: { display: true, text: "Payment Mode Split" },
    },
  };

  // --- Expenditure Breakdown ---
  const TOP_EXP_COUNT = 15;
  const expenditureMap = new Map<string, number>();
  filteredExpenditures.forEach((e) => {
    expenditureMap.set(e.item, (expenditureMap.get(e.item) || 0) + e.amount);
  });

  // Item -> array of { date, amount }
  const expenditureDetailsMap = new Map<
    string,
    { date: string; amount: number }[]
  >();

  filteredExpenditures.forEach((e) => {
    if (!expenditureDetailsMap.has(e.item)) {
      expenditureDetailsMap.set(e.item, []);
    }
    expenditureDetailsMap.get(e.item)!.push({ date: e.date, amount: e.amount });
  });

  const sortedExpenditures = Array.from(expenditureMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const displayedExpenditures = showAllExpenditures
    ? sortedExpenditures
    : sortedExpenditures.slice(0, TOP_EXP_COUNT);
  const expenditureData = {
    labels: displayedExpenditures.map(([item]) => item),
    datasets: [
      {
        label: "Expenditure Amount",
        data: displayedExpenditures.map(([_, amount]) => amount),
        backgroundColor: displayedExpenditures.map(
          (_, i) => `hsl(${(i * 45) % 360},70%,60%)`
        ),
      },
    ],
  };

  // --- Selected Item Expenditure Trend ---
  const selectedItemData = selectedExpItem
    ? {
        labels: filteredExpenditures
          .filter((e) => e.item === selectedExpItem)
          .map((e) => new Date(e.date).toLocaleDateString()),
        datasets: [
          {
            label: `${selectedExpItem} Amount`,
            data: filteredExpenditures
              .filter((e) => e.item === selectedExpItem)
              .map((e) => e.amount),
            borderColor: "purple",
            backgroundColor: "rgba(128,0,128,0.3)",
          },
        ],
      }
    : null;

  const filteredItems = Array.from(expenditureMap.keys()).filter((item) =>
    item.toLowerCase().includes((selectedExpItem || "").toLowerCase())
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = Math.min(prev + 1, filteredItems.length - 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[highlightIndex]) {
        setSelectedExpItem(filteredItems[highlightIndex]);
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const scrollIntoView = (index: number) => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;
    const item = dropdown.children[index] as HTMLElement;
    if (item) {
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      if (itemTop < dropdown.scrollTop) {
        dropdown.scrollTop = itemTop;
      } else if (itemBottom > dropdown.scrollTop + dropdown.offsetHeight) {
        dropdown.scrollTop = itemBottom - dropdown.offsetHeight;
      }
    }
  };

  return (
    <div className="analytics-container">
      <h2>📊 Analytics</h2>

      {/* Date Filter */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Filter: </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="quarter">This Quarter</option>
          <option value="ytd">Year-to-Date</option>
          <option value="range">Custom Range</option>
        </select>
        {filter === "range" && (
          <>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-container">
        <div className="kpi-card kpi-revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value">₹{totalRevenue.toLocaleString()}</div>
        </div>

        <div className="kpi-card kpi-expenses">
          <div className="kpi-icon">💸</div>
          <div className="kpi-label">Expenses</div>
          <div
            className="kpi-value"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>₹{totalExpenses.toLocaleString()}</span>
            <span>({expensePercent.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="kpi-card kpi-profit">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Profit</div>
          <div
            className="kpi-value"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>₹{totalProfit.toLocaleString()}</span>
            <span>({profitPercent.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="kpi-card kpi-orders">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Orders</div>
          <div className="kpi-value">{filteredOrders.length}</div>
        </div>
      </div>

      <div className="balance-summary">
        <h2>💰 Current Balances</h2>
        <div className="kpi-container" style={{ marginTop: "1rem" }}>
          <div className="kpi-card kpi-cash">
            <div className="kpi-icon">💵</div>
            <div className="kpi-label">Cash Balance</div>
            <div className="kpi-value">₹{balances.cash.toFixed(2)}</div>
          </div>

          <div className="kpi-card kpi-upi">
            <div className="kpi-icon">📲</div>
            <div className="kpi-label">UPI Balance</div>
            <div className="kpi-value">₹{balances.upi.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ marginBottom: "2rem" }}>
        <h3>Revenue vs Expenses vs Profit</h3>
        <Line data={dailyTrendData} options={{ responsive: true }} />
      </div>
      <div style={{ marginBottom: "2rem" }}>
        <h3>Revenue vs Expenditure Comparison</h3>
        <Bar
          data={revenueVsExpenditureData}
          options={revenueVsExpenditureOptions}
        />
      </div>
      <div style={{ marginBottom: "2rem" }}>
        <h3>Top Selling Items</h3>
        <Bar
          data={topItemsData}
          options={{
            responsive: true,
            indexAxis: "y",
            onClick: (_evt, elements) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                setDrilldownItem(sortedItems[index][0]);
              }
            },
          }}
        />
      </div>

      {drilldownItem && (
        <div style={{ marginBottom: "2rem" }}>
          <h4>Daily Sales: {drilldownItem}</h4>
          <Line data={drilldownData!} options={{ responsive: true }} />
        </div>
      )}

      <div style={{ marginBottom: "2rem", maxWidth: "500px" }}>
        <h3>Expenditure Breakdown</h3>
        <Pie data={expenditureData} options={{ responsive: true }} />
        {sortedExpenditures.length > TOP_EXP_COUNT && (
          <button
            style={{ marginTop: "0.5rem" }}
            onClick={() => setShowAllExpenditures(!showAllExpenditures)}
          >
            {showAllExpenditures ? "Show Top 15 Only" : "Show All Items"}
          </button>
        )}
      </div>

      <div
        style={{
          marginBottom: "2rem",
          maxWidth: "400px",
          position: "relative",
        }}
      >
        <h3>Expenditure Item Trend</h3>

        <input
          type="text"
          placeholder="Search expenditure item..."
          value={selectedExpItem || ""}
          onChange={(e) => {
            setSelectedExpItem(e.target.value);
            setShowDropdown(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
          className="exp-search-input"
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            style={{
              border: "1px solid #ccc",
              maxHeight: "150px",
              overflowY: "auto",
              marginTop: "0.2rem",
              position: "absolute",
              backgroundColor: "white",
              zIndex: 10,
              width: "100%",
            }}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <div
                  key={item}
                  style={{
                    padding: "0.3rem 0.5rem",
                    cursor: "pointer",
                    backgroundColor:
                      index === highlightIndex ? "lightblue" : "transparent",
                  }}
                  onMouseDown={() => {
                    setSelectedExpItem(item);
                    setShowDropdown(false);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  {item}
                </div>
              ))
            ) : (
              <div style={{ padding: "0.3rem 0.5rem" }}>No items found</div>
            )}
          </div>
        )}

        {selectedItemData && selectedExpItem && (
          <div style={{ marginTop: "1rem" }}>
            <Line data={selectedItemData} options={{ responsive: true }} />
          </div>
        )}
      </div>

      <div style={{ marginBottom: "2rem", maxWidth: "400px" }}>
        <h3>Payment Mode Split</h3>
        <Pie data={paymentModeData} options={paymentModeOptions} />
      </div>
    </div>
  );
};

export default Analytics;
