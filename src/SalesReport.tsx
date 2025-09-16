import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { formatDate } from "./formatDate";
import "./App.css"

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
  item: string;
}

// --- Helper function for formatting date ---

const SalesReport: React.FC<SalesReportProps> = ({ cafeId }) => {
 
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "date" | "range">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);


  /////Dark Mode
  const [isDark, setIsDark] = useState(false);

useEffect(() => {
  const updateDark = () => {
    setIsDark(document.body.classList.contains("dark"));
  };

  // run once on mount
  updateDark();

  // observe class changes on body
  const observer = new MutationObserver(updateDark);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  return () => observer.disconnect();
}, []);


  // Dark/light styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: isDark ? "#121212" : "#ffffff",
    color: isDark ? "#f1f1f1" : "#000000",
    padding: "1rem",
    minHeight: "100vh",
  };

  const headingStyle: React.CSSProperties = {
    color: isDark ? "#ffffff" : "#222222",
  };

  ////////////////////


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
        .select("amount, date, payment_mode, item")
        .eq("cafe_id", cafeId)
        .order("date", { ascending: false });

      if (!expError && expData) {
        setExpenditures(
          expData.map((e: any) => ({
            amount: parseFloat(e.amount),
            expense_date: e.date,
            payment_mode: e.payment_mode,
            item: e.item,
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
      case "date":
        return d.toDateString() === new Date(selectedDate).toDateString();
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

  const netProfitByCash = salesByCash - expensesByCash;
  const netProfitByUPI = salesByUPI - expensesByUPI;

  // CSV download
  const downloadCSV = () => {
    const rows: string[][] = [
      ["Item", "Quantity Sold", "Amount"],
      ...itemSales.map((i) => [i.name, i.quantity.toString(), i.amount.toString()]),
      [],
      ["Expenditures"],
      ["Item", "Amount", "Date", "Payment Mode"],
      ...filteredExpenditures.map((e) => [
        e.item,
        e.amount.toString(),
        formatDate(e.expense_date),
        e.payment_mode,
      ]),
      [],
      ["Revenue", revenue.toString()],
      ["Expenses", expenses.toString()],
      ["Profit", profit.toString()],
      ["Net Profit (Cash)", netProfitByCash.toString()],
      ["Net Profit (UPI)", netProfitByUPI.toString()],

    ];
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sales_report.csv");
  };

  // PDF download
const downloadPDF = async () => {
  // Fetch cafe name
  let cafeName = "Cafe"; // fallback
  if (cafeId) {
    const { data, error } = await supabase
      .from("cafes")
      .select("name")
      .eq("id", cafeId)
      .single();
    if (!error && data) cafeName = data.name;
  }

  // Create jsPDF instance
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 40;
  const rightMargin = 40;
  const tableWidth = pageWidth - leftMargin - rightMargin; // auto scale to page
  const reservedHeaderSpace = 80;  // enough for cafe name + report title
  const reservedFooterSpace = 50;

  const totalPagesExp = "{total_pages_count_string}";
  let y = 60;

  // --- Header ---
  const addHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(cafeName, pageWidth / 2, 40, { align: "center" });
    doc.setFontSize(14);
    doc.text("Sales Report", pageWidth / 2, 60, { align: "center" });
    // Reset cursor after header
    y = reservedHeaderSpace; 
  };

  // --- Footer ---
 const addFooter = (pageNum: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 20;

  // Line above footer
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.line(40, footerY - 10, pageWidth - 40, footerY - 10);

  // Footer text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const footerText = `Page ${pageNum} of ${totalPagesExp}`;

  doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
};


  // --- Page break check ---
  const checkPageBreak = (neededSpace = 0) => {
    if (y + neededSpace > pageHeight - reservedFooterSpace) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      addHeader();
      y = reservedHeaderSpace; //reset header space

       doc.setFont("helvetica", "normal");
    }
  };

  addHeader();

  // --- Date Text ---
  checkPageBreak(30);
let dateText = "Date: ";
if (filter === "range" && customStart && customEnd) {
  const start = formatDate(customStart).replace(/ /g, "-");
  const end = formatDate(customEnd).replace(/ /g, "-");
  dateText += start === end ? start : `${start} to ${end}`;
} else if (filter === "today") {
  dateText += formatDate(customStart || new Date());
} else if (filter === "week") {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  dateText += `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`;
} else if (filter === "month") {
  const now = new Date();
  dateText += `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
} else if (filter === "year") {
  dateText += new Date().getFullYear().toString();
}
else if (filter === "date") {
  dateText += formatDate(selectedDate);
}



  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  checkPageBreak(20);
  doc.text(dateText, leftMargin, y);
  y += 30;

  // --- Table Function ---
const drawTable = (title: string, headers: string[], data: (string | number)[][]) => {
  const lineHeight = 14;
  const cellPadding = 4;

  checkPageBreak(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, leftMargin, y);
  y += 20;

  const colCount = headers.length;
  const colWidths = headers.map(() => tableWidth / colCount); // auto scale

  // --- Header row ---
  let x = leftMargin;
  const headerHeight = lineHeight + cellPadding * 2;
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], headerHeight);
    doc.setFont("helvetica", "bold");
    const headerY = y + headerHeight / 2 + lineHeight / 2 - 2;
    doc.text(String(h), x + cellPadding, headerY);
    x += colWidths[i];
  });
  y += headerHeight;

  doc.setFont("helvetica", "normal");

  // --- Data rows ---
  data.forEach((row) => {
    // 🔹 Handle page break BEFORE calculating wrapped text
    if (y + lineHeight + cellPadding * 2 > pageHeight - reservedFooterSpace) {
      addFooter(doc.internal.getNumberOfPages());
      doc.addPage();
      addHeader();

      // redraw headers
      let x = leftMargin;
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], headerHeight);
        doc.setFont("helvetica", "bold");
        const headerY = y + headerHeight / 2 + lineHeight / 2 - 2;
        doc.text(String(h), x + cellPadding, headerY);
        x += colWidths[i];
      });
      y += headerHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
    }

    // 🔹 Now wrap text after page context is stable
    const wrappedTexts: string[][] = [];
    let maxRowHeight = lineHeight + cellPadding * 2;

    row.forEach((cell, i) => {
      const wrapped = doc.splitTextToSize(String(cell ?? "-"), colWidths[i] - cellPadding * 2);
      wrappedTexts.push(wrapped);
      const cellHeight = wrapped.length * lineHeight + cellPadding * 2;
      if (cellHeight > maxRowHeight) maxRowHeight = cellHeight;
    });

    // draw row
    let x = leftMargin;
    wrappedTexts.forEach((lines, i) => {
      doc.rect(x, y, colWidths[i], maxRowHeight);
      const totalTextHeight = lines.length * lineHeight;
      const startY = y + (maxRowHeight - totalTextHeight) / 2 + lineHeight / 2;

      lines.forEach((line, j) => {
        doc.text(line, x + cellPadding, startY + j * lineHeight);
      });
      x += colWidths[i];
    });

    y += maxRowHeight;
  });

  y += 20;
};



  // --- Tables ---
  drawTable(
    "Items Sold",
    ["Item", "Quantity Sold", "Amount (Rs)"],
    itemSales.map((i) => [i.name, i.quantity, ` ${i.amount}`])
  );

  drawTable(
    "Expenditures",
    ["Item", "Amount (Rs)", "Date", "Payment Mode"], // added Payment Mode
    filteredExpenditures.map((e) => [
      e.item ?? "-",
      `${e.amount}`,
      formatDate(e.expense_date),
      e.payment_mode ?? "-", // ensure value exists
    ])
  );

  drawTable("Summary", ["Label", "Value"], [
    ["Total Orders", filteredOrders.length],
    ["Revenue", revenue.toFixed(2)],
    ["Cash Sales", salesByCash.toFixed(2)],
    ["UPI Sales", salesByUPI.toFixed(2)],
    ["Expenses (Cash)", expensesByCash.toFixed(2)],
    ["Expenses (UPI)", expensesByUPI.toFixed(2)],
    ["Total Expenses", expenses.toFixed(2)],
    ["Net Bal (Cash)", (salesByCash - expensesByCash).toFixed(2)],
    ["Net Bal (UPI)", (salesByUPI - expensesByUPI).toFixed(2)],
    ["Net Balance (Total)", profit.toFixed(2)],
  ]);

  // --- Footer for all pages ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }
  doc.putTotalPages(totalPagesExp);

  // --- Dynamic filename ---
let fileDatePart = "";
if (filter === "range" && customStart && customEnd) {
  const start = formatDate(customStart).replace(/ /g, "-");
  const end = formatDate(customEnd).replace(/ /g, "-");
  fileDatePart = start === end ? start : `${start}_to_${end}`;
} else if (filter === "today") {
  fileDatePart = formatDate(customStart || new Date()).replace(/ /g, "-");
} else if (filter === "week") {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  fileDatePart = `${formatDate(startOfWeek).replace(/ /g, "-")}_to_${formatDate(endOfWeek).replace(/ /g, "-")}`;
} else if (filter === "month") {
  const now = new Date();
  fileDatePart = `${now.toLocaleString("default", { month: "long" })}_${now.getFullYear()}`;
} else if (filter === "year") {
  fileDatePart = new Date().getFullYear().toString();
}
else if (filter === "date") {
  fileDatePart = formatDate(selectedDate).replace(/ /g, "-");
}


const fileName = `sales_report_${fileDatePart}.pdf`;
doc.save(fileName);

};



  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>📊 Sales Report</h2>

      {/* Date Filters */}
      <div style={headingStyle}>
        <label style={headingStyle}>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="date">Select Date</option> 
          <option value="range">Custom Range</option>
        </select>

        {filter === "date" && (
          <span style={{ marginLeft: "1rem" }}>
            Date:{" "}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </span>
        )}


        {filter === "range" && (
          <span style={{ marginLeft: "1rem" }}>
            From: <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            To: <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </span>
        )}
      </div>

      {/* Item-wise Table */}
      <h3 style={headingStyle}>Item-wise Sales</h3>
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
      <h3  style={headingStyle} >Expenditures</h3>
      <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Payment Mode</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenditures.map((e, idx) => (
            <tr key={idx}>
              <td>{e.item}</td>
              <td>{e.amount}</td>
              <td>{formatDate(e.expense_date)}</td>
              <td>{e.payment_mode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ color: isDark ? "#e0e0e0" : "#333" }}>
      <h3 style={headingStyle}>Summary</h3>
      <p  style={headingStyle}>Revenue: ₹{revenue.toFixed(2)}</p>
      <p  style={headingStyle}>Cash: ₹{salesByCash.toFixed(2)}</p>
      <p  style={headingStyle}>UPI: ₹{salesByUPI.toFixed(2)}</p>
      <p  style={headingStyle}>Total Expenses: ₹{expenses.toFixed(2)}</p>
      <p  style={headingStyle}>Expenses (Cash): ₹{expensesByCash.toFixed(2)}</p>
      <p  style={headingStyle}>Expenses (UPI): ₹{expensesByUPI.toFixed(2)}</p>
      <p  style={headingStyle}>Net Profit: ₹{profit.toFixed(2)}</p>
      <p  style={headingStyle}>Net Bal (Cash): ₹{netProfitByCash.toFixed(2)}</p>
      <p  style={headingStyle}>Net Bal (UPI): ₹{netProfitByUPI.toFixed(2)}</p>
      </div>

      {/* Downloads */}
      <button onClick={downloadCSV}>⬇ Download CSV</button>
      <button onClick={downloadPDF} style={{ marginLeft: "1rem" }}>
        ⬇ Download PDF
      </button>
    </div>
  );
}
export default SalesReport;
