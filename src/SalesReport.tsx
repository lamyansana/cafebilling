import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

interface SalesReportProps {
  //session: any;
  cafeId: number | null;
}



type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_mode: string;
  order_items: { item_name: string; quantity: number; price:number}[];
}

type Expenditure = {
  amount: number;
  expense_date: string;
  payment_mode: "Cash" | "UPI";
}

const SalesReport: React.FC<SalesReportProps> = ({ cafeId }) => {
 
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "range">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (!cafeId) return; // Avoid fetching if cafeId is null

    const fetchData = async () => {
      // Menu items
    

      // Orders with items
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total_amount,
          payment_mode,
          order_items (
            item_name,
            quantity,
            price
          )
        `)
        .eq("cafe_id", cafeId)
        .order("created_at", { ascending: false });

      if (!ordersError && ordersData) {
        setOrders(
          ordersData.map((o: any) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            payment_mode: o.payment_mode,
            order_items: o.order_items || [],
          }))
        );
      }

      // Expenditures
      const { data: expData, error: expError } = await supabase
        .from("expenditures")
        .select("amount, date, payment_mode")
        .eq("cafe_id", cafeId)
        .order("date", { ascending: false });

      if (!expError && expData) {
        setExpenditures(
          expData.map((e: any) => ({
            amount: parseFloat(e.amount),
            expense_date: e.date,
            payment_mode: e.payment_mode,
          }))
        );
      }
    };

    fetchData();
  }, [cafeId]);

  

  // Date filter
  const filterByDate = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);

    switch (filter) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "week": {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return d >= startOfWeek && d <= endOfWeek;
      }
      case "month":
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case "year":
        return d.getFullYear() === now.getFullYear();
      case "range":
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      default:
        return true;
    }
  };

  // Filtered data
  const filteredOrders = orders.filter((o) => filterByDate(o.created_at));
  const filteredExpenditures = expenditures.filter((e) => filterByDate(e.expense_date));

  // Aggregate item-wise sales
  const itemSales = filteredOrders
    .flatMap((o) =>
      o.order_items.map((it) => ({
        name: it.item_name,
        quantity: it.quantity,
        amount: it.quantity * it.price,
      }))
    )
    .reduce((acc, cur) => {
      const existing = acc.find((a) => a.name === cur.name);
      if (existing) {
        existing.quantity += cur.quantity;
        existing.amount += cur.amount;
      } else {
        acc.push({ ...cur });
      }
      return acc;
    }, [] as { name: string; quantity: number; amount: number }[]);

  const revenue = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const expenses = filteredExpenditures.reduce((sum, e) => sum + e.amount, 0);
  const profit = revenue - expenses;

  // Breakdown by payment mode
  const salesByCash = filteredOrders
    .filter((o) => o.payment_mode === "Cash")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const salesByUPI = filteredOrders
    .filter((o) => o.payment_mode === "UPI")
    .reduce((sum, o) => sum + o.total_amount, 0);

    const expensesByCash = filteredExpenditures
  .filter((e) => e.payment_mode === "Cash")
  .reduce((sum, e) => sum + e.amount, 0);

const expensesByUPI = filteredExpenditures
  .filter((e) => e.payment_mode === "UPI")
  .reduce((sum, e) => sum + e.amount, 0);


  // CSV download
  const downloadCSV = () => {
    const rows: string[][] = [
      ["Item", "Quantity Sold", "Amount"],
      ...itemSales.map((i) => [i.name, i.quantity.toString(), i.amount.toString()]),
      [],
      ["Expenditure Amount", "Expense Date"],
      ...filteredExpenditures.map((e) => [e.amount.toString(), new Date(e.expense_date).toLocaleDateString()]),
      [],
      ["Revenue", revenue.toString()],
      ["Expenses", expenses.toString()],
      ["Profit", profit.toString()],
    ];
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sales_report.csv");
  };

  // PDF download
  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const leftMargin = 14;
    const rowHeight = 10;
    const colWidths = [80, 40, 40];

    doc.setFontSize(14);
    doc.text("Sales Report", leftMargin, y);
    y += 10;

    let dateText = "Date: ";
    if (filter === "range" && customStart && customEnd) {
      dateText += `${customStart} to ${customEnd}`;
    } else {
      dateText += filter.charAt(0).toUpperCase() + filter.slice(1);
    }
    doc.setFontSize(11);
    doc.text(dateText, leftMargin, y);
    y += 8;

    const drawTable = (title: string, headers: string[], data: (string | number)[][]) => {
      doc.setFontSize(12);
      doc.text(title, leftMargin, y);
      y += 6;

      let x = leftMargin;
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], rowHeight);
        doc.text(h.toString(), x + 2, y + 7);
        x += colWidths[i];
      });
      y += rowHeight;

      data.forEach((row) => {
        let x = leftMargin;
        row.forEach((cell, i) => {
          doc.rect(x, y, colWidths[i], rowHeight);
          doc.text(cell.toString(), x + 2, y + 7);
          x += colWidths[i];
        });
        y += rowHeight;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      y += 6;
    };

    drawTable(
      "Items Sold",
      ["Item", "Quantity Sold", "Amount (₹)"],
      itemSales.map((i) => [i.name, i.quantity, i.amount])
    );

    drawTable(
      "Expenditures",
      ["Expenditure Amount", "Expense Date"],
      filteredExpenditures.map((e) => [e.amount, new Date(e.expense_date).toLocaleDateString()])
    );

    y += 10;
    doc.setFontSize(14);
    doc.text(`Revenue: ₹${revenue.toFixed(2)}`, 14, y);
    y += 8;
    doc.text(`Cash: ₹${salesByCash.toFixed(2)}`, 14, y);
    y += 8;
    doc.text(`UPI: ₹${salesByUPI.toFixed(2)}`, 14, y);
    y += 8;
    doc.text(`Expenses (Cash): ₹${expensesByCash.toFixed(2)}`, 14, y); 
    y += 8;
    doc.text(`Expenses (UPI): ₹${expensesByUPI.toFixed(2)}`, 14, y); 
    y += 8;
    doc.text(`Total Expenses: ₹${expenses.toFixed(2)}`, 14, y);
    y += 8;
    doc.text(`Net Profit: ₹${profit.toFixed(2)}`, 14, y);

    doc.save("sales_report.pdf");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>📊 Sales Report</h2>

      {/* Date Filters */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="range">Custom Range</option>
        </select>

        {filter === "range" && (
          <span style={{ marginLeft: "1rem" }}>
            From: <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            To: <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </span>
        )}
      </div>

      {/* Item-wise Table */}
      <h3>Item-wise Sales</h3>
      <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity Sold</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {itemSales.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Expenditures Table */}
      <h3>Expenditures</h3>
      <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenditures.map((e, idx) => (
            <tr key={idx}>
              <td>{e.amount}</td>
              <td>{new Date(e.expense_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <h3>Summary</h3>
      <p>Revenue: ₹{revenue.toFixed(2)}</p>
      <p>Cash: ₹{salesByCash.toFixed(2)}</p>
      <p>UPI: ₹{salesByUPI.toFixed(2)}</p>
      <p>Total Expenses: ₹{expenses.toFixed(2)}</p>
      <p>Expenses (Cash): ₹{expensesByCash.toFixed(2)}</p>
      <p>Expenses (UPI): ₹{expensesByUPI.toFixed(2)}</p>
      <p>Net Profit: ₹{profit.toFixed(2)}</p>

      {/* Downloads */}
      <button onClick={downloadCSV}>⬇ Download CSV</button>
      <button onClick={downloadPDF} style={{ marginLeft: "1rem" }}>
        ⬇ Download PDF
      </button>
    </div>
  );
}
export default SalesReport;
