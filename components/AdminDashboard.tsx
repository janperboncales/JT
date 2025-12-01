
import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Employee, Branch, Position, Schedule, DailyRecord, PayrollConfig, SalarySlip } from '../types';
import { Search, Monitor, UserPlus, Edit, Trash2, Calendar, X, Filter, QrCode, Upload, Printer, FileText, Settings, DollarSign, ChevronLeft, ChevronRight, Mail, Phone, MapPin, Grid, List } from 'lucide-react';
import { calculateDailyRecord, formatDate, formatTime, calculatePayroll } from '../services/attendanceLogic';

type Tab = 'EMPLOYEES' | 'DTR' | 'PAYROLL';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('EMPLOYEES');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Employee Tab States
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('LIST');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<Branch | 'All'>('All');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [idEmployee, setIdEmployee] = useState<Employee | null>(null);

  // DTR Tab States
  const [dtrMonth, setDtrMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dtrEmployeeId, setDtrEmployeeId] = useState<string>('');
  const [dtrRecords, setDtrRecords] = useState<DailyRecord[]>([]);
  const [salarySlip, setSalarySlip] = useState<SalarySlip | null>(null);

  // Payroll States
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig | null>(null);
  
  // Form States
  const initialForm = {
    id: '', firstName: '', middleName: '', lastName: '', birthday: '', 
    hiredDate: '', phone: '', email: '', password: '', confirmPassword: '',
    branch: 'Cabanatuan' as Branch, position: 'Regular Staff' as Position,
    avatarUrl: ''
  };
  const [form, setForm] = useState(initialForm);
  const [age, setAge] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(formatDate(new Date()));
  const [scheduleTime, setScheduleTime] = useState('08:00');

  const loadData = async () => {
    setLoading(true);
    const data = await db.employees.list();
    setEmployees(data);
    if(data.length > 0 && !dtrEmployeeId) setDtrEmployeeId(data[0].id);
    const config = await db.payroll.getConfig();
    setPayrollConfig(config);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeTab === 'DTR' && dtrEmployeeId) {
        fetchDTR();
    }
  }, [activeTab, dtrEmployeeId, dtrMonth]);

  const fetchDTR = async () => {
      const emp = employees.find(e => e.id === dtrEmployeeId);
      if(!emp) return;

      const allLogs = await db.logs.list();
      const empLogs = allLogs.filter(l => l.employeeId === dtrEmployeeId && l.date.startsWith(dtrMonth));
      const scheds = await db.schedules.get(dtrEmployeeId, dtrMonth);
      
      const [y, m] = dtrMonth.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      
      const records: DailyRecord[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
          const dayString = `${dtrMonth}-${i.toString().padStart(2, '0')}`;
          const daySched = scheds.find(s => s.date === dayString);
          records.push(calculateDailyRecord(dayString, empLogs, daySched));
      }
      setDtrRecords(records); // Do not reverse for calendar view

      if(payrollConfig) {
          const slip = calculatePayroll(emp, records, payrollConfig);
          setSalarySlip(slip);
      }
  };

  useEffect(() => {
    if (form.birthday) {
      const birth = new Date(form.birthday);
      const now = new Date();
      let ageCalc = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) ageCalc--;
      setAge(ageCalc);
    }
  }, [form.birthday]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, avatarUrl: reader.result as string });
      reader.readAsDataURL(file);
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
          await db.employees.update(form.id, {
            ...form,
            age,
            middleName: form.middleName || '',
            phone: form.phone || '',
            avatarUrl: form.avatarUrl
          });
      } else {
          if (form.password !== form.confirmPassword) return alert("Passwords do not match");
          await db.employees.create({ ...form, age, middleName: form.middleName || '', phone: form.phone || '', password: form.password });
      }
      closeModal();
      loadData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleEdit = (emp: Employee) => {
      setForm({
          id: emp.id, firstName: emp.firstName, middleName: emp.middleName, lastName: emp.lastName,
          birthday: emp.birthday, hiredDate: emp.hiredDate, phone: emp.phone, email: emp.email,
          password: '', confirmPassword: '', branch: emp.branch, position: emp.position,
          avatarUrl: emp.avatarUrl || ''
      });
      setIsEditing(true);
      setShowAddModal(true);
  };

  const handleViewId = (emp: Employee) => { setIdEmployee(emp); setShowIdModal(true); };

  const handlePrintId = () => {
    if (!idEmployee) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Please allow popups to print ID");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${idEmployee.id}`;
    printWindow.document.write(`
        <html><head><title>ID Card - ${idEmployee.lastName}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; } .card { width: 320px; height: 500px; border: 1px solid #ccc; border-radius: 16px; overflow: hidden; position: relative; text-align: center; } .header { height: 140px; width: 100%; overflow: hidden; } .banner { width: 100%; height: 100%; object-fit: cover; } .avatar { width: 100px; height: 100px; border-radius: 50%; margin: -50px auto 10px; border: 4px solid white; background: #eee; object-fit: cover; position: relative; z-index: 10; } </style></head>
        <body><div class="card"><div class="header"><img src="https://i.imgur.com/8Qw2Dcn.png" class="banner"/></div><img src="${idEmployee.avatarUrl || ''}" class="avatar"/><h3>${idEmployee.firstName} ${idEmployee.lastName}</h3><p>${idEmployee.position}</p><img src="${qrUrl}" width="120" style="margin-top:20px;"/><br/><strong>${idEmployee.id}</strong></div><script>window.print();</script></body></html>
    `);
    printWindow.document.close();
  };

  const handlePrintDTR = () => {
      const emp = employees.find(e => e.id === dtrEmployeeId);
      if(!emp) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const rows = dtrRecords.map(r => `
        <tr>
            <td>${r.date}</td>
            <td>${formatTime(r.amIn)}</td>
            <td>${formatTime(r.amOut)}</td>
            <td>${formatTime(r.pmIn)}</td>
            <td>${formatTime(r.pmOut)}</td>
            <td>${r.lateMinutes > 0 ? r.lateMinutes + 'm' : '-'}</td>
            <td>${r.undertimeMinutes > 0 ? r.undertimeMinutes + 'm' : '-'}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html><head><title>DTR - ${emp.lastName}</title><style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #000; padding: 8px; text-align: center; } h2 { margin-bottom: 5px; } .summary { margin-top: 20px; font-weight: bold; }</style></head>
        <body>
            <h2>Jelene Trading - Daily Time Record</h2>
            <p>Employee: <strong>${emp.lastName}, ${emp.firstName}</strong> | Month: <strong>${dtrMonth}</strong></p>
            <table>
                <thead><tr><th>Date</th><th>AM IN</th><th>AM OUT</th><th>PM IN</th><th>PM OUT</th><th>Late</th><th>Undertime</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${salarySlip ? `<div class="summary">Estimated Net Pay: ₱${salarySlip.netPay.toLocaleString()}</div>` : ''}
            <br/><br/><p>Signature: ______________________</p>
            <script>window.print();</script>
        </body></html>
      `);
      printWindow.document.close();
  };

  const closeModal = () => { setShowAddModal(false); setForm(initialForm); setIsEditing(false); };
  const handleDeactivate = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this employee?`)) return;
    await db.employees.update(id, { isActive: !currentStatus });
    loadData();
  };

  const handleSetSchedule = async () => {
    if (selectedEmployees.length === 0) return alert("Select employees first");
    const [h, m] = scheduleTime.split(':').map(Number);
    const endH = h + 9; 
    const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    try {
      await db.schedules.set(selectedEmployees.map(id => ({ employeeId: id, date: scheduleDate, startTime: scheduleTime, endTime })));
      setShowScheduleModal(false);
      setSelectedEmployees([]);
    } catch (err: any) { alert("Error setting schedule: " + err.message); }
  };
  const launchKiosk = () => window.open(`${window.location.pathname}?mode=kiosk`, '_blank');

  const filtered = employees
    .filter(e => e.id !== 'ADMIN')
    .filter(e => branchFilter === 'All' || e.branch === branchFilter)
    .filter(e => e.firstName.toLowerCase().includes(search.toLowerCase()) || e.lastName.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortAsc ? a.lastName.localeCompare(b.lastName) : b.lastName.localeCompare(a.lastName));

  const savePayrollConfig = async () => {
      if(!payrollConfig) return;
      try {
          await db.payroll.updateConfig(payrollConfig);
          alert("Configuration Saved");
      } catch(e) { alert("Error saving config"); }
  };

  return (
    <div className="space-y-6">
      
      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
          <button onClick={() => setActiveTab('EMPLOYEES')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'EMPLOYEES' ? 'bg-violet-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>Employees</button>
          <button onClick={() => setActiveTab('DTR')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'DTR' ? 'bg-violet-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>DTR Management</button>
          <button onClick={() => setActiveTab('PAYROLL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'PAYROLL' ? 'bg-violet-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>Payroll Config</button>
      </div>

      {activeTab === 'EMPLOYEES' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Employees</h2>
                    <p className="text-zinc-400 mt-1">Manage your team members and their access.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsEditing(false); setForm(initialForm); setShowAddModal(true); }}
                        className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 shadow-lg shadow-violet-900/20 transition-all flex items-center gap-2"
                    >
                        <UserPlus size={18} /> Add Employee
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                    <input 
                        type="text" placeholder="Search by name or ID..." 
                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0 items-center">
                    <select 
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-violet-500 min-w-[140px]"
                        value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as any)}
                    >
                        <option value="All">All Branches</option>
                        <option value="Cabanatuan">Cabanatuan</option>
                        <option value="Solano">Solano</option>
                    </select>
                    
                    {/* View Toggle */}
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1 h-full shrink-0">
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Grid View"
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2.5 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    
                    {/* Bulk Actions */}
                     {selectedEmployees.length > 0 && (
                        <button 
                            onClick={() => setShowScheduleModal(true)}
                            className="flex items-center gap-2 px-4 py-3 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl font-medium text-sm hover:bg-zinc-700 hover:text-white transition-colors whitespace-nowrap"
                        >
                            <Calendar size={16} /> Set Schedule ({selectedEmployees.length})
                        </button>
                    )}

                    <button 
                        onClick={launchKiosk}
                        className="flex items-center gap-2 px-4 py-3 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl font-medium text-sm hover:bg-zinc-700 hover:text-emerald-400 transition-colors whitespace-nowrap ml-auto xl:ml-0"
                    >
                         <Monitor size={16} /> Kiosk
                    </button>
                </div>
            </div>

            {/* Employee Views */}
            {viewMode === 'GRID' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(emp => (
                        <div key={emp.id} className={`group bg-zinc-900 rounded-2xl border ${selectedEmployees.includes(emp.id) ? 'border-violet-500 ring-1 ring-violet-500' : 'border-zinc-800'} p-6 relative hover:border-violet-500/30 transition-all duration-300 flex flex-col`}>
                            
                            {/* Selection Checkbox (Absolute Top Right) */}
                            <div className="absolute top-4 right-4">
                                <input type="checkbox" className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-violet-600 focus:ring-violet-600 focus:ring-offset-zinc-900 cursor-pointer"
                                        checked={selectedEmployees.includes(emp.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                            else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                        }}
                                    />
                            </div>

                            {/* Card Header: Avatar & Status */}
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700 p-1 mb-4 group-hover:scale-105 transition-transform duration-300 overflow-hidden relative">
                                    {emp.avatarUrl ? (
                                        <img src={emp.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 font-bold text-2xl">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900 ${emp.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-100 text-center leading-tight">{emp.firstName} {emp.lastName}</h3>
                                <p className="text-sm text-zinc-500 font-medium text-center mt-1">{emp.position}</p>
                            </div>

                            {/* Details Badges */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
                                        {emp.id}
                                    </span>
                                    <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400 flex items-center gap-1">
                                        <MapPin size={10} /> {emp.branch}
                                    </span>
                                </div>
                                
                                {/* Contact Shortcuts */}
                                <div className="flex justify-center gap-3">
                                    {emp.email && (
                                        <a href={`mailto:${emp.email}`} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors" title={emp.email}>
                                            <Mail size={14} />
                                        </a>
                                    )}
                                    {emp.phone && (
                                        <a href={`tel:${emp.phone}`} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors" title={emp.phone}>
                                            <Phone size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="mt-auto pt-4 border-t border-zinc-800 flex justify-between gap-2">
                                <button onClick={() => handleDeactivate(emp.id, emp.isActive)} className="flex-1 py-2 rounded-lg bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors flex items-center justify-center" title={emp.isActive ? "Deactivate" : "Activate"}>
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={() => handleEdit(emp)} className="flex-1 py-2 rounded-lg bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400 transition-colors flex items-center justify-center" title="Edit">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleViewId(emp)} className="flex-1 py-2 rounded-lg bg-violet-500/5 text-violet-500 hover:bg-violet-500/10 hover:text-violet-400 transition-colors flex items-center justify-center" title="View ID">
                                    <QrCode size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-in fade-in duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-950/50 text-zinc-500 font-bold uppercase text-xs border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                         <span className="sr-only">Select</span>
                                    </th>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Role & Email</th>
                                    <th className="px-6 py-4">Branch</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filtered.map(emp => (
                                    <tr key={emp.id} className={`group hover:bg-zinc-800/30 transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-violet-500/5' : ''}`}>
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-violet-600 focus:ring-violet-600 focus:ring-offset-zinc-900 cursor-pointer"
                                                checked={selectedEmployees.includes(emp.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                                                    else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                 <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                                                    {emp.avatarUrl ? <img src={emp.avatarUrl} alt="" className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-xs font-bold text-zinc-500">{emp.firstName[0]}{emp.lastName[0]}</div>}
                                                 </div>
                                                 <div>
                                                     <div className="font-bold text-zinc-200">{emp.firstName} {emp.lastName}</div>
                                                     <div className="text-xs text-zinc-500 font-mono">{emp.id}</div>
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-zinc-300 font-medium">{emp.position}</div>
                                            <div className="text-xs text-zinc-500">{emp.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
                                                <MapPin size={10} /> {emp.branch}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${emp.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                {emp.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                 <button onClick={() => handleViewId(emp)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-violet-400 transition-colors" title="View ID"><QrCode size={16}/></button>
                                                 <button onClick={() => handleEdit(emp)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-blue-400 transition-colors" title="Edit"><Edit size={16}/></button>
                                                 <button onClick={() => handleDeactivate(emp.id, emp.isActive)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors" title={emp.isActive ? 'Deactivate' : 'Activate'}><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === 'DTR' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h2 className="text-xl font-bold text-zinc-100">Daily Time Record Management</h2>
                      <p className="text-zinc-500 text-sm">Review logs, deductions, and print monthly reports.</p>
                  </div>
                  <div className="flex gap-3">
                      <select className="input-field max-w-[200px]" value={dtrEmployeeId} onChange={(e) => setDtrEmployeeId(e.target.value)}>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>)}
                      </select>
                      <input type="month" className="input-field max-w-[180px]" value={dtrMonth} onChange={(e) => setDtrMonth(e.target.value)} />
                      <button onClick={handlePrintDTR} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center gap-2 border border-zinc-700">
                          <Printer size={16} /> Print DTR
                      </button>
                  </div>
              </div>

              {/* DTR Table View */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-950 text-zinc-500 text-xs font-bold uppercase">
                          <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">AM IN</th>
                              <th className="px-4 py-3">AM OUT</th>
                              <th className="px-4 py-3">PM IN</th>
                              <th className="px-4 py-3">PM OUT</th>
                              <th className="px-4 py-3">Hours</th>
                              <th className="px-4 py-3">Late (m)</th>
                              <th className="px-4 py-3">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                          {dtrRecords.map((r, i) => (
                              <tr key={i} className="hover:bg-zinc-800/50">
                                  <td className="px-4 py-3 font-mono text-zinc-400">{r.date.slice(5)}</td>
                                  <td className="px-4 py-3">{TimeCell(r.amIn, r.arrivalStatus)}</td>
                                  <td className="px-4 py-3 font-mono text-zinc-400">{formatTime(r.amOut)}</td>
                                  <td className="px-4 py-3 font-mono text-zinc-400">{formatTime(r.pmIn)}</td>
                                  <td className="px-4 py-3">{TimeCell(r.pmOut, r.departureStatus)}</td>
                                  <td className="px-4 py-3 font-mono text-zinc-300">{r.hoursWorked.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-rose-400 font-mono">{r.lateMinutes > 0 ? r.lateMinutes : ''}</td>
                                  <td className="px-4 py-3"><span className={`text-xs font-bold ${r.status === 'PRESENT' ? 'text-emerald-400' : 'text-zinc-600'}`}>{r.status}</span></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Live Salary Computation */}
              {salarySlip && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <div className="text-zinc-500 text-xs uppercase font-bold">Base Pay</div>
                          <div className="text-2xl font-mono text-zinc-100">₱{salarySlip.basePay.toLocaleString()}</div>
                          <div className="text-xs text-zinc-600 mt-1">{salarySlip.daysPresent} Days Present</div>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <div className="text-zinc-500 text-xs uppercase font-bold">Deductions (Late/UT)</div>
                          <div className="text-2xl font-mono text-rose-400">-₱{(salarySlip.totalLateDeduction + salarySlip.totalUndertimeDeduction).toLocaleString()}</div>
                          <div className="text-xs text-zinc-600 mt-1">Strict Policy</div>
                      </div>
                      <div className="bg-violet-900/20 p-4 rounded-xl border border-violet-500/30">
                          <div className="text-violet-400 text-xs uppercase font-bold">Est. Net Pay</div>
                          <div className="text-2xl font-mono text-violet-300">₱{salarySlip.netPay.toLocaleString()}</div>
                          <div className="text-xs text-violet-400/60 mt-1">Includes Allowances</div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'PAYROLL' && payrollConfig && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-zinc-100 mb-6">Payroll Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Daily Rate (PHP)" type="number" value={payrollConfig.dailyRate} onChange={v => setPayrollConfig({...payrollConfig, dailyRate: Number(v)})} />
                  <Input label="Meal Allowance (Per Day)" type="number" value={payrollConfig.mealAllowance} onChange={v => setPayrollConfig({...payrollConfig, mealAllowance: Number(v)})} />
                  <Input label="Grace Period (Minutes)" type="number" value={payrollConfig.gracePeriodMinutes} onChange={v => setPayrollConfig({...payrollConfig, gracePeriodMinutes: Number(v)})} />
                  <Input label="Late Deduction (Per Minute PHP)" type="number" value={payrollConfig.lateDeductionPerMinute} onChange={v => setPayrollConfig({...payrollConfig, lateDeductionPerMinute: Number(v)})} />
                  <div className="md:col-span-2">
                      <Input label="Birth Month Bonus (PHP)" type="number" value={payrollConfig.birthMonthBonus} onChange={v => setPayrollConfig({...payrollConfig, birthMonthBonus: Number(v)})} />
                      <p className="text-xs text-zinc-500 mt-2">Bonus is automatically applied if the DTR month matches the employee's birth month.</p>
                  </div>
              </div>
              <button onClick={savePayrollConfig} className="mt-8 w-full bg-violet-600 text-white py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors">
                  Save Configuration
              </button>
          </div>
      )}

      {/* Modals remain mostly the same, ensuring schedule modal uses date picker properly */}
      <Modal isOpen={showAddModal} onClose={closeModal} title={isEditing ? 'Edit Employee' : 'New Employee'}>
        <form onSubmit={handleSubmitEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <h4 className="md:col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-2">Personal Information</h4>
            <div className="md:col-span-2 flex justify-center mb-2">
                <div className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-zinc-700 hover:border-violet-500 transition-colors bg-zinc-950">
                    {form.avatarUrl ? <img src={form.avatarUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-zinc-500"><Upload size={20} /><span className="text-[10px] mt-1">Upload</span></div>}
                    <input type="file" accept=".jpg,.jpeg,.png,.heic,.tiff,image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>
            <Input label="Employee ID" value={form.id} onChange={v => setForm({...form, id: v})} disabled={isEditing} placeholder="EMP-000" />
            <div className="hidden md:block"></div>
            <Input label="First Name" value={form.firstName} onChange={v => setForm({...form, firstName: v})} />
            <Input label="Last Name" value={form.lastName} onChange={v => setForm({...form, lastName: v})} />
            <Input label="Birthday" type="date" value={form.birthday} onChange={v => setForm({...form, birthday: v})} />
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 opacity-70">
                <label className="block text-xs font-bold text-zinc-500 mb-1">Age</label>
                <div className="text-zinc-300 font-mono">{age || '--'}</div>
            </div>
            <h4 className="md:col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-2 mt-2">Job Details</h4>
            <Input label="Date Hired" type="date" value={form.hiredDate} onChange={v => setForm({...form, hiredDate: v})} />
            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">Branch</label><select className="input-field" value={form.branch} onChange={e => setForm({...form, branch: e.target.value as Branch})}><option value="Cabanatuan">Cabanatuan</option><option value="Solano">Solano</option></select></div>
            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">Position</label><select className="input-field" value={form.position} onChange={e => setForm({...form, position: e.target.value as Position})}><option value="Regular Staff">Regular Staff</option><option value="Team Leader">Team Leader</option><option value="Branch Manager">Branch Manager</option></select></div>
            <h4 className="md:col-span-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-2 mt-2">Account</h4>
            <Input label="Email" type="email" value={form.email} onChange={v => setForm({...form, email: v})} />
            <Input label="Phone" type="tel" value={form.phone} onChange={v => setForm({...form, phone: v})} />
            {!isEditing && (<><Input label="Password" type="password" value={form.password} onChange={v => setForm({...form, password: v})} /><Input label="Confirm" type="password" value={form.confirmPassword} onChange={v => setForm({...form, confirmPassword: v})} /></>)}
            <button type="submit" className="md:col-span-2 mt-4 w-full bg-violet-600 text-white py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-900/20">{isEditing ? 'Save Changes' : 'Create Account'}</button>
        </form>
      </Modal>

      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Set Schedule" maxWidth="max-w-md">
           <div className="space-y-5">
              <p className="text-zinc-400 text-sm bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  Assigning schedule to <strong className="text-white">{selectedEmployees.length}</strong> selected employee(s).
              </p>
              <Input label="Date" type="date" value={scheduleDate} onChange={v => setScheduleDate(v)} />
              <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Shift Start</label>
                  <select className="input-field" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}>
                      <option value="08:00">8:00 AM (Break 12-1)</option>
                      <option value="09:00">9:00 AM (Break 1-2)</option>
                      <option value="09:30">9:30 AM (Break 1:30-2:30)</option>
                  </select>
              </div>
              <button onClick={handleSetSchedule} className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold hover:bg-violet-700">Confirm Schedule</button>
           </div>
      </Modal>

      <Modal isOpen={showIdModal} onClose={() => setShowIdModal(false)} title="Employee ID" maxWidth="max-w-sm">
        {idEmployee && (
            <div className="flex flex-col items-center">
                <div className="bg-white rounded-2xl overflow-hidden w-[300px] shadow-2xl relative mb-6 border border-zinc-700">
                    <div className="h-32 w-full relative">
                        <img src="https://i.imgur.com/8Qw2Dcn.png" alt="Banner" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-28 h-28 bg-white rounded-full p-1 mx-auto -mt-14 relative z-10 shadow-md">
                        {idEmployee.avatarUrl ? <img src={idEmployee.avatarUrl} className="w-full h-full object-cover rounded-full border-2 border-zinc-100" /> : <div className="w-full h-full bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 font-bold text-2xl">{idEmployee.firstName[0]}{idEmployee.lastName[0]}</div>}
                    </div>
                    <div className="text-center p-6 pb-8">
                        <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{idEmployee.firstName} {idEmployee.lastName}</h2>
                        <p className="text-violet-600 font-bold text-xs uppercase tracking-wide mt-1">{idEmployee.position}</p>
                        <div className="flex justify-center gap-2 mt-4"><span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold border border-zinc-200">{idEmployee.branch}</span></div>
                        <div className="mt-6 flex flex-col items-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${idEmployee.id}`} className="w-32 h-32 mix-blend-multiply" /><p className="font-mono text-zinc-500 font-bold mt-2 text-sm tracking-widest">{idEmployee.id}</p></div>
                    </div>
                    <div className="h-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600"></div>
                </div>
                <button onClick={handlePrintId} className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-bold hover:bg-white transition-colors flex items-center justify-center gap-2"><Printer size={18} /> Print ID Card</button>
            </div>
        )}
      </Modal>

      <style>{`
        .input-field { width: 100%; padding: 0.75rem; background-color: #09090b; border: 1px solid #27272a; border-radius: 0.75rem; color: #f4f4f5; font-size: 0.875rem; outline: none; transition: all 0.2s; }
        .input-field:focus { border-color: #7c3aed; ring: 1px solid #7c3aed; }
        .input-field:disabled { background-color: #18181b; color: #52525b; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

// UI Components
const ActionBtn = ({ onClick, icon: Icon, label, color }: any) => (<button onClick={onClick} className={`p-2 rounded-lg transition-colors ${color}`} title={label}><Icon size={18} /></button>);
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className={`bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
            </div>
        </div>
    );
};
const Input = ({ label, type = "text", value, onChange, disabled, placeholder }: any) => (<div className="space-y-1"><label className="text-xs font-bold text-zinc-500 ml-1">{label}</label><input type={type} className="input-field" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} /></div>);
const TimeCell = (time: string | null, status?: string) => (
    <div className="flex flex-col">
        <span className="font-mono text-zinc-300">{formatTime(time)}</span>
        {status && <span className={`text-[9px] uppercase font-bold tracking-wider ${status === 'LATE' || status === 'UNDER_TIME' ? 'text-rose-400' : status === 'EARLY' ? 'text-blue-400' : 'text-emerald-400'}`}>{status.replace('_', ' ')}</span>}
    </div>
);
