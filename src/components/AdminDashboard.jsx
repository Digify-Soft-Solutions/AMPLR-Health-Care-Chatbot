import React, { useState, useEffect } from 'react';
import { Activity, Users, Calendar, AlertTriangle, CheckCircle, Clock, Truck, ShieldAlert, FileText, Download, Phone, RefreshCw, MessageSquare, Send, CheckCheck, Sparkles, Stethoscope, UserCheck, HeartPulse, FlaskConical, Filter } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [staff, setStaff] = useState([]);
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, bookingsRes, staffRes, emergencyRes] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/bookings'),
                fetch('/api/staff'),
                fetch('/api/emergency')
            ]);

            const statsData = await statsRes.json();
            const bookingsData = await bookingsRes.json();
            const staffData = await staffRes.json();
            const emergencyData = await emergencyRes.json();

            setStats(statsData.stats);
            setBookings(bookingsData.bookings || []);
            setStaff(staffData.staff || []);
            setEmergencyAlerts(emergencyData.alerts || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 4000); // Live poll every 4s
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (bookingId, newStatus, staffId = null) => {
        try {
            await fetch(`/api/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, staffId })
            });
            fetchData();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const filteredBookings = filterStatus === 'ALL'
        ? bookings
        : bookings.filter(b => b.status === filterStatus);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header Bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Health Saathi Chatbot
                            <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-teal-200">
                                by AutomateX.co.in
                            </span>
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                            Real-Time WhatsApp Bookings • Automated Patient Allocation • Staff Roster • Invoices
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                        <RefreshCw className={`w-4 h-4 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Live Data</span>
                    </button>
                </div>
            </div>

            {/* Emergency Escalation Alert Banner */}
            {emergencyAlerts.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                        <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1">
                            <h3 className="text-rose-900 font-bold text-sm flex items-center justify-between">
                                <span>🚨 CLINICAL EMERGENCY ALERTS ({emergencyAlerts.length})</span>
                                <span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-mono font-semibold">
                                    108 Advisory Triggered
                                </span>
                            </h3>
                            <div className="mt-2 space-y-2">
                                {emergencyAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white p-3 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                        <div>
                                            <span className="font-bold text-slate-900">{alert.patientName}</span>
                                            <span className="text-slate-500 ml-2 font-mono">{alert.phone}</span>
                                            <span className="text-rose-700 font-medium ml-2 bg-rose-100 px-2 py-0.5 rounded">
                                                Triggered: "{alert.triggerKeyword}"
                                            </span>
                                        </div>
                                        <a
                                            href={`tel:${alert.phone}`}
                                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1 transition shrink-0"
                                        >
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>Call Patient Immediately</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metric KPI Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-teal-300 transition">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <span>Total WhatsApp Bookings</span>
                            <Calendar className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">{stats.todaysBookings}</div>
                        <div className="text-xs text-teal-600 font-medium mt-1">Confirmed Patient Bookings</div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-amber-300 transition">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <span>Pending Allocation</span>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pendingAssignment}</div>
                        <div className="text-xs text-amber-700 font-medium mt-1">Awaiting Nurse / Specialist</div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-blue-300 transition">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <span>Assigned Staff</span>
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-3xl font-extrabold text-blue-600 mt-2">{stats.assigned + stats.onTheWay}</div>
                        <div className="text-xs text-blue-600 font-medium mt-1">Active Professionals</div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-emerald-300 transition">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <span>Total Booking Value</span>
                            <Activity className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2">₹{stats.totalRevenue}</div>
                        <div className="text-xs text-emerald-600 font-medium mt-1">Total Healthcare Volume</div>
                    </div>
                </div>
            )}

            {/* FULL WIDTH MEDICAL BOOKINGS MANAGEMENT PIPELINE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-lg">Patient Bookings & Allocation Pipeline</h2>
                            <p className="text-xs text-slate-500">Real-Time Patient Bookings received via WhatsApp Cloud API</p>
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        {['ALL', 'Pending Assignment', 'Assigned', 'On the way', 'Completed'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap text-xs ${filterStatus === st
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bookings Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-700">
                        <thead className="text-[11px] font-bold uppercase bg-slate-100 text-slate-600 border-b border-slate-200">
                            <tr>
                                <th className="p-3.5">Booking ID</th>
                                <th className="p-3.5">Service & Patient Details</th>
                                <th className="p-3.5">Scheduled Date & Slot</th>
                                <th className="p-3.5">Assigned Staff</th>
                                <th className="p-3.5">Pipeline Status</th>
                                <th className="p-3.5 text-right">PDF Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Calendar className="w-10 h-10 text-slate-300" />
                                            <p className="font-bold text-slate-700 text-sm">No Bookings Match Selected Filter</p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                When a patient completes a booking on WhatsApp (selecting a service, date, slot, and details), it will automatically appear here in real time!
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3.5 font-mono font-bold text-teal-700 text-sm">{b.id}</td>
                                        <td className="p-3.5">
                                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                <span>{b.serviceName}</span>
                                                {b.amount && (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                                        ₹{b.amount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                                                👤 {b.patientName} • <span className="font-mono text-slate-500">{b.phone}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1">
                                                <span>🏠 {b.address || b.location || 'Address not specified'}</span>
                                                {b.landmark && <span className="text-slate-400">({b.landmark})</span>}
                                            </div>
                                            <div className="text-[11px] text-teal-700 font-mono font-semibold mt-0.5">
                                                📮 PIN: {b.pincode || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-xs">
                                            <div className="font-bold text-slate-800 flex items-center gap-1">
                                                <span>📅</span>
                                                <span>{b.date || (b.dateTime ? b.dateTime.split('(')[0].trim() : 'Scheduled')}</span>
                                            </div>
                                            <div className="text-teal-600 font-mono font-bold mt-1 bg-teal-50 px-2 py-0.5 rounded-md inline-block border border-teal-200">
                                                ⏰ {b.slot || (b.dateTime && b.dateTime.includes('(') ? b.dateTime.split('(')[1].replace(')', '').trim() : 'IST Slot')}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-xs">
                                            {b.assignedStaff ? (
                                                <div>
                                                    <div className="font-bold text-emerald-700">{b.assignedStaff.name}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{b.assignedStaff.phone}</div>
                                                </div>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleUpdateStatus(b.id, 'Assigned', e.target.value)}
                                                    defaultValue=""
                                                    className="bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300 rounded-lg px-2.5 py-1 focus:outline-none"
                                                >
                                                    <option value="" disabled>Assign Staff...</option>
                                                    {staff.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            <select
                                                value={b.status}
                                                onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500 shadow-sm"
                                            >
                                                <option value="Pending Assignment">🟡 Pending Assignment</option>
                                                <option value="Assigned">🟢 Assigned</option>
                                                <option value="On the way">🚗 On the way</option>
                                                <option value="In Progress">🏥 In Progress</option>
                                                <option value="Completed">✅ Completed</option>
                                            </select>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <a
                                                href={`/api/bookings/${b.id}/invoice`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-teal-700 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-300 transition"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Preview PDF</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FULL WIDTH VERIFIED HEALTHCARE STAFF DIRECTORY ROSTER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-600" />
                        Verified Healthcare Staff Roster
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-semibold">
                        {staff.length} Active Professionals
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {staff.map(s => (
                        <div key={s.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs hover:border-teal-300 transition">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[11px] text-teal-700 font-semibold">{s.role}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{s.phone} • Coverage: {s.location}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
