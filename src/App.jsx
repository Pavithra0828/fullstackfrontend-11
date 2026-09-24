import React, { useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";

const MONTHLY_KEY = "expenseTracker_monthlyExpenses";
const EXTRA_KEY = "expenseTracker_extraExpenses";

const categories = [
  { key:"food", name:"Food" }, { key:"transportation", name:"Transportation" },
  { key:"rent", name:"Rent" }, { key:"groceries", name:"Groceries" },
  { key:"internet", name:"Internet" }, { key:"gas", name:"Gas" }
];

const defaultMonthly = Object.fromEntries(categories.map(c => [c.key, 0]));

function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function safeNumber(value) { const n=Number(value); return Number.isFinite(n)&&n>=0?n:0; }
function money(amount) { return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(amount); }
function dateText(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function escapeText(value) { return String(value ?? ""); }

function useExpenseData() {
  const [monthly, setMonthly] = useState(() => ({...defaultMonthly, ...readJSON(MONTHLY_KEY,{})}));
  const [extra, setExtra] = useState(() => readJSON(EXTRA_KEY, []));
  const monthlyTotal = useMemo(() => categories.reduce((s,c)=>s+safeNumber(monthly[c.key]),0),[monthly]);
  const extraTotal = useMemo(() => extra.reduce((s,e)=>s+safeNumber(e.amount),0),[extra]);
  const overall = monthlyTotal + extraTotal;
  const updateMonthly = (key,value) => {
    const next={...monthly,[key]:safeNumber(value)}; setMonthly(next); localStorage.setItem(MONTHLY_KEY,JSON.stringify(next));
  };
  const addExtra = (expense) => { const next=[expense,...extra]; setExtra(next); localStorage.setItem(EXTRA_KEY,JSON.stringify(next)); };
  const deleteExtra = (id) => { const next=extra.filter(e=>e.id!==id); setExtra(next); localStorage.setItem(EXTRA_KEY,JSON.stringify(next)); };
  const replaceExtra = (id, expense) => { const next=extra.map(e=>e.id===id?{...expense,id}:e); setExtra(next); localStorage.setItem(EXTRA_KEY,JSON.stringify(next)); };
  return {monthly,extra,monthlyTotal,extraTotal,overall,updateMonthly,addExtra,deleteExtra,replaceExtra};
}

function Header() {
  return <header className="page-header"><div>
    <div className="brand"><div className="brand-icon">₹</div><span>Expense Tracker</span></div>
    <h1>Manage Your Expenses</h1><p>Plan your regular expenses and keep track of your daily spending.</p>
  </div></header>;
}

function ExpenseInputPage() {
  const data=useExpenseData();
  const navigate=useNavigate();
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [amount,setAmount]=useState("");
  const [note,setNote]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [errors,setErrors]=useState({});
  const totalMonthly=data.monthlyTotal, totalExtra=data.extraTotal;

  const submit=(e)=>{
    e.preventDefault();
    const nextErrors={};
    if(!date) nextErrors.date="Please select a date.";
    if(!safeNumber(amount)||safeNumber(amount)<=0) nextErrors.amount="Please enter a valid expense amount.";
    if(!note.trim()) nextErrors.note="Please enter an expense note.";
    setErrors(nextErrors); if(Object.keys(nextErrors).length) return;
    const item={id:editingId ?? Date.now(),date,amount:safeNumber(amount),note:note.trim()};
    if(editingId!==null) data.replaceExtra(editingId,item); else data.addExtra(item);
    setAmount(""); setNote(""); setEditingId(null); setErrors({});
  };
  const edit=(e)=>{setDate(e.date);setAmount(e.amount);setNote(e.note);setEditingId(e.id);window.scrollTo({top:0,behavior:"smooth"});};
  return <main className="app-container">
    <Header/>
    <section className="card"><div className="section-heading"><div><h2>Monthly Expenses</h2><p>Enter how much you expect to spend on each category every month.</p></div></div>
      <div className="monthly-grid">{categories.map(c=><div className="expense-input" key={c.key}><label htmlFor={c.key}>{c.name}</label><div className="amount-input"><span>₹</span><input id={c.key} type="number" min="0" step="0.01" placeholder="Enter amount" value={data.monthly[c.key]||""} onChange={e=>data.updateMonthly(c.key,e.target.value)}/></div></div>)}</div>
    </section>
    <section className="card"><div className="section-heading"><div><h2>Daily Extra Expenses</h2><p>Record unexpected or additional expenses.</p></div></div>
      <form onSubmit={submit}><div className="form-grid">
        <div className="form-group"><label htmlFor="expenseDate">Select Date</label><div className="input-with-icon"><span className="field-icon">📅</span><input id="expenseDate" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><small className="error-message">{errors.date}</small></div>
        <div className="form-group"><label htmlFor="extraAmount">Extra Expense Amount</label><div className="amount-input"><span>₹</span><input id="extraAmount" type="number" min="0" step="0.01" placeholder="Enter amount" value={amount} onChange={e=>setAmount(e.target.value)}/></div><small className="error-message">{errors.amount}</small></div>
      </div>
      <div className="form-group full-width"><label htmlFor="expenseNote">Expense Note</label><textarea id="expenseNote" rows="4" placeholder="What did you spend on?" value={note} onChange={e=>setNote(e.target.value)}/><small className="error-message">{errors.note}</small></div>
      <div className="form-actions"><button type="submit" className="primary-btn">{editingId!==null?"Update Expense":"+ Add Extra Expense"}</button>{editingId!==null&&<button type="button" className="secondary-btn" onClick={()=>{setEditingId(null);setAmount("");setNote("");setErrors({})}}>Cancel Edit</button>}</div>
      </form>
    </section>
    <section className="card"><div className="section-heading"><div><h2>Recent Extra Expenses</h2><p>Your latest daily expenses.</p></div></div>
      <div className="expenses-list">{data.extra.length===0?<div className="empty-state"><div className="empty-icon">₹</div><h3>No extra expenses added yet.</h3><p>Add your first daily expense above.</p></div>:
      data.extra.map(e=><div className="expense-item" key={e.id}><div className="expense-info"><div className="expense-note">{escapeText(e.note)}</div><div className="expense-date">{dateText(e.date)}</div></div><div className="expense-right"><div className="expense-amount">{money(safeNumber(e.amount))}</div><div className="expense-actions"><button className="edit-btn" onClick={()=>edit(e)}>Edit</button><button className="delete-btn" onClick={()=>{if(window.confirm("Are you sure you want to delete this expense?")) data.deleteExtra(e.id)}}>Delete</button></div></div></div>)}</div>
    </section>
    <section className="summary-section"><div className="section-heading"><div><h2>Expense Summary</h2><p>Your current expense overview.</p></div></div>
      <div className="summary-grid"><div className="summary-card"><div className="summary-icon">📊</div><div><p>Total Monthly Expenses</p><h3>{money(totalMonthly)}</h3></div></div><div className="summary-card"><div className="summary-icon">＋</div><div><p>Total Extra Expenses</p><h3>{money(totalExtra)}</h3></div></div><div className="summary-card highlight"><div className="summary-icon">₹</div><div><p>Overall Expenses</p><h3>{money(data.overall)}</h3></div></div></div>
    </section>
    <div className="dashboard-action"><button className="dashboard-btn" onClick={()=>navigate("/dashboard")}>Go to Dashboard <span>→</span></button></div>
  </main>;
}

function Dashboard() {
  const data=useExpenseData();
  const total=data.overall;
  const highest=categories.reduce((best,c)=>safeNumber(data.monthly[c.key])>best.amount?{name:c.name,amount:safeNumber(data.monthly[c.key])}:best,{name:null,amount:0});
  const sorted=[...data.extra].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const monthlyPct=total?data.monthlyTotal/total*100:0;
  return <div className="dashboard-container">
    <header className="dashboard-header"><div className="brand"><div className="brand-icon">₹</div><span>Expense Tracker</span></div><nav><NavLink to="/">Expense Input</NavLink><NavLink to="/dashboard" className="active">Dashboard</NavLink></nav></header>
    <section className="welcome-section"><div><p className="eyebrow">FINANCIAL OVERVIEW</p><h1>Your Expense Dashboard</h1><p className="welcome-text">Here's an overview of your planned and additional expenses.</p></div><Link to="/" className="add-expense-btn">+ Add Expense</Link></section>
    <section className="summary-grid">
      <DashCard label="Monthly Planned" value={money(data.monthlyTotal)} text="Regular monthly expenses" icon="📊"/>
      <DashCard label="Daily Extra" value={money(data.extraTotal)} text="Additional daily expenses" icon="＋"/>
      <DashCard label="Overall Expenses" value={money(total)} text="Total tracked expenses" icon="₹" highlight/>
      <DashCard label="Highest Category" value={highest.name||"No data"} text={money(highest.amount)} icon="↑" category/>
    </section>
    <section className="content-grid">
      <div className="panel"><div className="panel-header"><div><h2>Monthly Expense Breakdown</h2><p>Your regular spending categories</p></div></div><div className="category-list">{categories.map(c=>{const amount=safeNumber(data.monthly[c.key]);const pct=data.monthlyTotal?amount/data.monthlyTotal*100:0;return <div className="category-row" key={c.key}><div className="category-name">{c.name}</div><div className="category-bar"><div className="category-fill" style={{width:`${pct}%`}}/></div><div className="category-amount">{money(amount)}</div></div>})}</div></div>
      <div className="panel"><div className="panel-header"><div><h2>Expense Overview</h2><p>Monthly vs daily extra spending</p></div></div><div className="overview-chart"><div className="chart-circle" style={{background: total?`conic-gradient(#2563eb 0deg ${monthlyPct*3.6}deg,#60a5fa ${monthlyPct*3.6}deg 360deg)`:"#172033"}}><div className="chart-center"><span>Total</span><strong>{money(total)}</strong></div></div><div className="chart-legend"><div className="legend-item"><span className="legend-dot monthly-dot"/><div><strong>Monthly</strong><small>{money(data.monthlyTotal)}</small></div></div><div className="legend-item"><span className="legend-dot extra-dot"/><div><strong>Extra</strong><small>{money(data.extraTotal)}</small></div></div></div></div></div>
    </section>
    <section className="panel full-panel"><div className="panel-header"><div><h2>Spending Distribution</h2><p>Percentage of your monthly planned expenses</p></div></div><div className="distribution-list">{categories.map(c=>{const amount=safeNumber(data.monthly[c.key]);const pct=data.monthlyTotal?amount/data.monthlyTotal*100:0;return <div className="distribution-item" key={c.key}><div className="distribution-top"><span>{c.name}</span><span>{pct.toFixed(1)}%</span></div><div className="distribution-bar"><div className="distribution-fill" style={{width:`${pct}%`}}/></div></div>})}</div></section>
    <section className="panel full-panel"><div className="panel-header"><div><h2>Recent Extra Expenses</h2><p>Your latest additional spending</p></div><Link to="/">Manage Expenses →</Link></div><div className="recent-expenses">{sorted.length?sorted.slice(0,5).map(e=><div className="recent-item" key={e.id}><div className="recent-date">{dateText(e.date)}</div><div className="recent-note">{escapeText(e.note)}</div><div className="recent-amount">{money(safeNumber(e.amount))}</div></div>):<div className="empty-dashboard" style={{display:"block",margin:0}}><div className="empty-dashboard-icon">₹</div><h2>No extra expenses yet</h2><p>Add daily expenses from the Expense Input page.</p><Link to="/">Add Expense →</Link></div>}</div></section>
    <section className="empty-dashboard" style={{display: total===0?"block":"none"}}><div className="empty-dashboard-icon">₹</div><h2>Start tracking your expenses</h2><p>Add your monthly expenses and daily spending to see your financial overview here.</p><Link to="/">Add Your First Expense →</Link></section>
    <footer><span>Expense Tracker</span><span>Personal Expense Management</span></footer>
  </div>;
}
function DashCard({label,value,text,icon,highlight,category}) {return <div className={`summary-card ${highlight?"highlight":""}`}><div className="card-top"><span>{label}</span><div className="card-icon">{icon}</div></div><h2 className={category?"category-value":""}>{value}</h2><p>{text}</p></div>}

export default function App(){ return <Routes><Route path="/" element={<ExpenseInputPage/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="*" element={<ExpenseInputPage/>}/></Routes>; }
