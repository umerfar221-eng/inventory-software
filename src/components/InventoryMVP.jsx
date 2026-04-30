import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import API from "../api";
import html2canvas from "html2canvas";

export default function InventoryMVP() {

  // ================= STATE =================
const [products, setProducts] = useState([]);
const [sales, setSales] = useState([]);
const [expenses, setExpenses] = useState([]);

const safeProducts = Array.isArray(products) ? products : [];
const Sales = Array.isArray(sales) ? sales : [];
const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const [form, setForm] = useState({ name: "", category: "", stock: "", price: "" });
  const [saleForm, setSaleForm] = useState({ product: "", quantity: "", client: "", paid: "" });
  const [expenseForm, setExpenseForm] = useState({ title: "", amount: "" });

  const [editingSaleIndex, setEditingSaleIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterType, setFilterType] = useState("all");

  // ================= SAVE =================
useEffect(() => {
  API.get("/products")
    .then(res => {
      console.log("PRODUCT API:", res.data);
      setProducts(Array.isArray(res.data) ? res.data : []);
    })
    .catch(err => {
      console.log("ERROR:", err);
      setProducts([]);
    });
}, []);

  useEffect(() => {
  API.get("/expenses")
    .then(res => setExpenses(res.data))
    .catch(err => console.log(err));
  }, []);
  
  useEffect(() => {
  API.get("/sales")
    .then(res => setSales(res.data))
    .catch(err => console.log(err));
  }, []);

  console.log("PRODUCTS:", products);

  // ================= HANDLERS =================
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSaleChange = (e) => setSaleForm({ ...saleForm, [e.target.name]: e.target.value });
  const handleExpenseChange = (e) => setExpenseForm({ ...expenseForm, [e.target.name]: e.target.value });

  // ================= PRODUCT =================
const addProduct = () => {
  if (!form.name || !form.stock || !form.price) return alert("Fill all fields");

  API.post("/products", {
    ...form,
    stock: Number(form.stock),
    price: Number(form.price)
  })
  .then(() => API.get("/products"))
  .then(res => {
    console.log("UPDATED PRODUCTS:", res.data); // 👈 CHECK THIS
    setProducts(res.data);
  })
  .catch(err => console.log(err));

  setForm({ name: "", category: "", stock: "", price: "" });
};

  const deleteProduct = (id) => {
  API.delete(`/products/${id}`)
    .then(() => API.get("/products"))
    .then(res => setProducts(res.data));
};

const filteredProducts = safeProducts.filter(p =>
  p.name.toLowerCase().includes(search.toLowerCase())
);

  // ================= SALES =================
const sellProduct = async () => {
  try {
  
    const product = safeProducts.find(p => p.name === saleForm.product);
    if (!product) return alert("Select product");

    const qty = Number(saleForm.quantity);
    const paid = Number(saleForm.paid) || 0;
    const total = qty * product.price;

    await API.post("/sales", {
      product: saleForm.product,
      quantity: qty,
      client: saleForm.client,
      paid: paid,
      pending: total - paid,
    });

    const res = await API.get("/sales");
    setSales(res.data);

    const updatedProducts = await API.get("/products");
    setProducts(updatedProducts.data);

    setSaleForm({ product: "", quantity: "", client: "", paid: "" });

  } catch (err) {
    console.log("ERROR:", err);
  }
};
const handleDelete = async (id) => {
  console.log("DELETE CLICKED ID:", id);

  try {
    const res = await API.delete(`/sales/${id}`);
    console.log("RESPONSE:", res.data);

    const updated = await API.get("/sales");
    setSales(updated.data);

  } catch (err) {
    console.log("ERROR:", err);
  }
};
 console.log("HANDLE DELETE EXISTS:", typeof handleDelete);

  const updateSale = () => {
    const updated = [...Sales];
    const product = products.find(p => p.name === saleForm.product);
    if (!product) return;

    const qty = Number(saleForm.quantity);
    const total = qty * product.price;
    const paid = Number(saleForm.paid) || 0;

    updated[editingSaleIndex] = {
      ...saleForm,
      quantity: qty,
      paid,
      pending: total - paid,
      date: new Date().toISOString(),
    };

    setSales(updated);
    setEditingSaleIndex(null);
    setSaleForm({ product: "", quantity: "", client: "", paid: "" });
  };

  const deleteSale = (i) =>
    setSales(Sales.filter((_, index) => index !== i));

  // ================= EXPENSE =================
const addExpense = () => {
  API.post("/expenses", {
    ...expenseForm,
    amount: Number(expenseForm.amount),
    date: new Date().toISOString(),
  })
  .then(() => {
    return API.get("/expenses");
  })
  .then(res => {
    setExpenses(res.data);
    setExpenseForm({ title: "", amount: "" });
  })
  .catch(err => console.log(err));
};

  const deleteExpense = (i) =>
    setExpenses(expenses.filter((_, index) => index !== i));

  // ================= PDF =================
  const generateSingleInvoice = (s) => {
    const pdf = new jsPDF();
    pdf.text("Invoice Receipt", 20, 20);
    pdf.text(`Product: ${s.product}`, 20, 40);
    pdf.text(`Client: ${s.client}`, 20, 50);
    pdf.text(`Paid: ${s.paid}`, 20, 60);
    pdf.save(`${s.product}.pdf`);
  };

  const generateInvoice = async () => {
    const canvas = await html2canvas(document.getElementById("invoice"));
    const pdf = new jsPDF();
    pdf.addImage(canvas.toDataURL(), "PNG", 10, 10, 180, 0);
    pdf.save("all.pdf");
  };

  // ================= STATS =================
  const totalProducts = products.length;
  const totalStock = safeProducts.reduce((s, p) => s + p.stock, 0);
  const totalRevenue = Sales.reduce((s, p) => s + Number(p.paid || 0), 0);
  const totalExpenses = safeExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const today = new Date().toDateString();
  const dailySales = Sales
  .filter(s => new Date(s.date).toDateString() === today)
  .reduce((sum, s) => sum + Number(s.paid || 0), 0);

  const monthlySales = Sales
  .filter(s => new Date(s.date).getMonth() === new Date().getMonth())
  .reduce((sum, s) => sum + Number(s.paid || 0), 0);

const chartData = Sales.map((s) => ({
  name: s.date ? new Date(s.date).toLocaleString() : "",
  revenue: Number(s.paid || 0),
}));

const profitChartData = Sales.map((s) => ({
  name: s.date ? new Date(s.date).toLocaleDateString() : "",
  profit: s.paid,
}));

  const isLoss = netProfit < 0;
  // ================= FILTER LOGIC (FIX) =================
const now = new Date();

  const filteredSales = Sales.filter((s) => {
  const saleDate = new Date(s.date);

  if (filterType === "daily") return saleDate.toDateString() === now.toDateString();

  if (filterType === "weekly") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return saleDate >= weekAgo;
  }

  if (filterType === "monthly") return saleDate.getMonth() === now.getMonth();

  return true;
});

const filteredChartData = filteredSales.map((s) => ({
  name: s.date ? new Date(s.date).toLocaleString() : "",
  revenue: Number(s.paid || 0),
}));

  // ================= UI =================
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">

      {/* SIDEBAR */}
      <div className="w-64 bg-[#0f172a] text-white p-6">
        <h1 className="text-xl font-bold mb-6">Saad Inventory Pro</h1>

        <button onClick={() => setActiveTab("dashboard")} className="bg-blue-600 w-full py-2 rounded mb-2">Dashboard</button>
        <button onClick={() => setActiveTab("expenses")} className="bg-gray-700 w-full py-2 rounded mb-2">Expenses</button>
        <button onClick={() => setActiveTab("profit")} className="bg-gray-700 w-full py-2 rounded mb-2">Profit</button>
        <button onClick={() => setActiveTab("accounting")} className="bg-gray-700 w-full py-2 rounded">Accounting</button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

            <div className="grid md:grid-cols-7 gap-4 mb-6">
              <Card title="Products" value={totalProducts} />
              <Card title="Stock" value={totalStock} />
              <Card title="Revenue" value={totalRevenue} />
              <Card title="Expenses" value={totalExpenses} />
              <Card title="Profit" value={netProfit} />
              <Card title="Daily" value={dailySales} />
              <Card title="Monthly" value={monthlySales} />
            </div>
              {/* FILTER BUTTONS */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setFilterType("daily")} className="bg-blue-500 text-white px-3 py-1 rounded">Daily</button>
                <button onClick={() => setFilterType("weekly")} className="bg-blue-500 text-white px-3 py-1 rounded">Weekly</button>
                <button onClick={() => setFilterType("monthly")} className="bg-blue-500 text-white px-3 py-1 rounded">Monthly</button>
                </div>
            {/* CHART */}
            <div className="bg-white p-6 rounded-xl border mb-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="revenue" stroke="#2563eb" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ADD PRODUCT */}
            <div className="bg-white p-6 rounded-xl border mb-6">
              <h3 className="font-semibold mb-4">Add Product</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2 rounded"/>
                <input name="category" value={form.category} onChange={handleChange} placeholder="Category" className="border p-2 rounded"/>
                <input name="stock" value={form.stock} onChange={handleChange} placeholder="Stock" className="border p-2 rounded"/>
                <input name="price" value={form.price} onChange={handleChange} placeholder="Price" className="border p-2 rounded"/>
              </div>
              <button onClick={addProduct} className="mt-4 bg-black text-white px-4 py-2 rounded">Add Product</button>
            </div>

            {/* INVENTORY */}
            <div className="bg-white p-6 rounded-xl border mb-6">
              <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 mb-4 rounded w-full"/>
            {filteredProducts.map((p, i) => (
  <div key={p.id} className="flex justify-between border-b py-2">
    {p.name} ({p.stock})
    <button onClick={() => deleteProduct(p.id)} className="bg-red-500 text-white px-2 rounded">
      Delete
    </button>
  </div>
))}
            </div>

            {/* SELL */}
            <div className="bg-white p-6 rounded-xl border mb-6">
              <div className="grid md:grid-cols-4 gap-4">
                <select name="product" value={saleForm.product} onChange={handleSaleChange} className="border p-2 rounded">
                  <option value="">Select Product</option>
                  {safeProducts.map((p) => (<option key={p._id || p.id} value={p.name}>{p.name}</option>))}
                </select>
                <input name="quantity" value={saleForm.quantity} onChange={handleSaleChange} placeholder="Qty" className="border p-2 rounded"/>
                <input name="client" value={saleForm.client} onChange={handleSaleChange} placeholder="Client" className="border p-2 rounded"/>
                <input name="paid" value={saleForm.paid} onChange={handleSaleChange} placeholder="Paid" className="border p-2 rounded"/>
              </div>
              <button onClick={editingSaleIndex !== null ? updateSale : sellProduct} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
                {editingSaleIndex !== null ? "Update Sale" : "Complete Sale"}
              </button>
            </div>

            {/* INVOICE */}
            <div className="bg-white p-6 rounded-xl border">
              <div id="invoice">
                {Sales.map((s, i) => (
                  <div key={i} className="flex justify-between border-b py-3">
                    <span>
                       {s.product} ({s.quantity}) - {s.client}
                       <br />
                      <small>{s.date ? new Date(s.date).toLocaleString() : ""}</small>
                       </span>
                    <div className="flex gap-2">
                      <button onClick={() => generateSingleInvoice(s)} className="bg-blue-600 text-white px-2 rounded">PDF</button>
                      <button onClick={() => { setSaleForm(s); setEditingSaleIndex(i); }} className="bg-yellow-500 text-white px-2 rounded">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white px-2 rounded">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={generateInvoice} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
                Download All PDF
              </button>
            </div>
          </>
        )}

        {/* EXPENSES */}
        {activeTab === "expenses" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Expenses</h2>

            <div className="bg-white p-6 rounded-xl border mb-6">
              <input name="title" value={expenseForm.title} onChange={handleExpenseChange} placeholder="Title" className="border p-2 mr-2"/>
              <input name="amount" value={expenseForm.amount} onChange={handleExpenseChange} placeholder="Amount" className="border p-2"/>
              <button onClick={addExpense} className="ml-2 bg-red-600 text-white px-4 py-2 rounded">Add</button>
            </div>

            {expenses.map((e, i) => (
              <div key={i} className="flex justify-between bg-white p-3 mb-2 rounded">
                <div>
                  {e.title} - {e.amount}
                  <br />
                  <small>{e.date ? new Date(e.date).toLocaleString() : ""}</small>
                  </div>
                <button onClick={() => deleteExpense(i)} className="bg-red-500 text-white px-2 rounded">Delete</button>
              </div>
            ))}
          </>
        )}

        {/* PROFIT */}
        {activeTab === "profit" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Profit Analytics</h2>

            <div className="bg-white p-6 rounded-xl border mb-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-30} 
                  textAnchor="end" 
                  />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="profit" stroke="#16a34a" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {isLoss && (
              <div className="bg-red-100 text-red-700 p-4 rounded">
                ⚠️ You are in LOSS
              </div>
            )}
          </>
        )}

        {/* ACCOUNTING */}
        {activeTab === "accounting" && (
          <>
            <h2 className="text-2xl font-bold mb-4">Accounting</h2>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card title="Revenue" value={totalRevenue} />
              <Card title="Expenses" value={totalExpenses} />
              <Card title="Profit" value={netProfit} />
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <p>Total Sales: {Sales.length}</p>
              <p>Total Products: {products.length}</p>
              <p>Total Expenses: {expenses.length}</p>

              <p className="mt-4 font-bold">
                Status: {netProfit > 0 ? "Profit 📈" : "Loss 📉"}
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-xl border">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-lg font-bold">{value}</h2>
    </div>
  );
}
