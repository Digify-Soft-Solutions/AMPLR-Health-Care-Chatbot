'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Calendar, AlertTriangle, CheckCircle, Clock, Truck, 
  ShieldAlert, FileText, Download, Phone, RefreshCw, MessageSquare, Send, 
  CheckCheck, Sparkles, Stethoscope, UserCheck, HeartPulse, FlaskConical, 
  Filter, MessageCircle, ArrowUpRight, Search, ArrowRight, ExternalLink,
  MapPin, Check
} from 'lucide-react';

const API_BASE = '';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [staff, setStaff] = useState([]);
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, bookingsRes, staffRes, emergencyRes, messagesRes] = await Promise.all([
                fetch(`${API_BASE}/api/stats`).catch(() => fetch('/api/stats')),
                fetch(`${API_BASE}/api/bookings`).catch(() => fetch('/api/bookings')),
                fetch(`${API_BASE}/api/staff`).catch(() => fetch('/api/staff')),
                fetch(`${API_BASE}/api/emergency`).catch(() => fetch('/api/emergency')),
                fetch(`${API_BASE}/api/messages`).catch(() => fetch('/api/messages'))
            ]);

            const [statsData, bookingsData, staffData, emergencyData, messagesData] = await Promise.all([
                statsRes.json().catch(() => ({ stats: null })),
                bookingsRes.json().catch(() => ({ bookings: [] })),
                staffRes.json().catch(() => ({ staff: [] })),
                emergencyRes.json().catch(() => ({ alerts: [] })),
                messagesRes.json().catch(() => ({ messages: [] }))
            ]);

            if (statsData?.stats) setStats(statsData.stats);
            if (bookingsData?.bookings) setBookings(bookingsData.bookings);
            if (staffData?.staff) setStaff(staffData.staff);
            if (emergencyData?.alerts) setEmergencyAlerts(emergencyData.alerts);
            if (messagesData?.messages) setMessages(messagesData.messages);
            setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
            await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
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

    const totalEnquiriesCount = stats?.totalEnquiries || messages.length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Title & Quick Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                            WhatsApp Live Sync Active
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                        Inquiry Management Dashboard
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                        Centralized WhatsApp inquiries, client consultation leads, and automated booking allocations for <strong className="text-slate-700 font-semibold">AMPLR Health</strong>.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {lastUpdated && (
                        <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
                            Synced: {lastUpdated}
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm hover:shadow cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Data</span>
                    </button>
                </div>
            </div>

            {/* Emergency Escalation Alert Banner */}
            {emergencyAlerts.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <ShieldAlert className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-rose-950 font-bold text-sm tracking-wide">
                                    🚨 CLINICAL EMERGENCY NOTICES ({emergencyAlerts.length})
                                </h3>
                                <span className="text-[11px] bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
                                    108 Advisory Triggered
                                </span>
                            </div>
                            <p className="text-rose-800 text-xs mt-1">
                                Patient reported severe clinical keywords. Immediate doctor escalation recommended:
                            </p>
                            <div className="mt-3 space-y-2">
                                {emergencyAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white p-3 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                                        <div>
                                            <span className="font-bold text-slate-900 text-sm">{alert.patientName}</span>
                                            <span className="text-slate-500 ml-2 font-mono">+{alert.phone}</span>
                                            <span className="text-rose-700 font-semibold ml-2 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                                                Triggered: "{alert.triggerKeyword}"
                                            </span>
                                        </div>
                                        <a
                                            href={`tel:${alert.phone}`}
                                            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition shrink-0 shadow-sm"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total WhatsApp Inquiries */}
                <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition group">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>WhatsApp Inquiries</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                            <MessageCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                        {totalEnquiriesCount}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Real-time Inbound Leads
                    </div>
                </div>

                {/* Confirmed Bookings */}
                <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-300 transition group">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Confirmed Bookings</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                        {stats ? stats.todaysBookings : bookings.length}
                    </div>
                    <div className="text-[11px] text-teal-700 font-semibold mt-1">
                        Home Healthcare Visits
                    </div>
                </div>

                {/* Pending Allocation */}
                <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-300 transition group">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Pending Allocation</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-amber-600 mt-2 tracking-tight">
                        {stats ? stats.pendingAssignment : 0}
                    </div>
                    <div className="text-[11px] text-amber-700 font-semibold mt-1">
                        Awaiting Specialist Assignment
                    </div>
                </div>

                {/* Active Healthcare Staff */}
                <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition group">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Staff On Roster</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-blue-700 mt-2 tracking-tight">
                        {staff.length}
                    </div>
                    <div className="text-[11px] text-blue-600 font-semibold mt-1">
                        Verified Nurses & Specialists
                    </div>
                </div>
            </div>

            {/* PATIENT BOOKINGS & ALLOCATION PIPELINE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 to-white">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-slate-900 text-lg sm:text-xl">
                                    Patient Bookings & Allocation Pipeline
                                </h2>
                                <span className="bg-teal-100 text-teal-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                                    {bookings.length} Bookings
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Scheduled doctor visits, nursing procedures, and diagnostic sessions confirmed via WhatsApp
                            </p>
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        {['ALL', 'Pending Assignment', 'Assigned', 'On the way', 'Completed'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap text-xs cursor-pointer ${
                                    filterStatus === st
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                        <thead className="text-[11px] font-bold uppercase bg-slate-50/90 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="p-4">Booking ID</th>
                                <th className="p-4">Service & Patient Details</th>
                                <th className="p-4">Date & Slot</th>
                                <th className="p-4">Assigned Healthcare Staff</th>
                                <th className="p-4">Pipeline Status</th>
                                <th className="p-4 text-right">PDF Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-14 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <p className="font-bold text-slate-700 text-sm">No Bookings Match Selected Filter</p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                When patients complete their booking on WhatsApp (choosing service, date, slot, address), it appears here in real time.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                                        <td className="p-4 font-mono font-bold text-teal-700 text-sm">
                                            {b.id}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                <span>{b.serviceName}</span>
                                                {b.amount && (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                                        ₹{b.amount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                                                👤 {b.patientName} • <span className="font-mono text-slate-500">+{b.patientPhone || b.phone || '91'}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1">
                                                <span>🏠 {b.address?.replace(/\[LOCATION MESSAGE\]/g, '📍 Shared Location Pin') || b.location || 'Address on file'}</span>
                                                {b.landmark && <span className="text-slate-400">({b.landmark})</span>}
                                            </div>
                                            <div className="text-[11px] text-teal-700 font-mono font-semibold mt-0.5">
                                                📮 PIN: {b.pincode || (b.address?.match(/\b[1-9][0-9]{5}\b/)?.[0]) || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs">
                                            <div className="font-bold text-slate-800 flex items-center gap-1">
                                                <span>📅</span>
                                                <span>{b.date || (b.dateTime ? b.dateTime.split('(')[0].trim() : 'Scheduled')}</span>
                                            </div>
                                            <div className="text-teal-700 font-mono font-bold mt-1 bg-teal-50 px-2.5 py-0.5 rounded-md inline-block border border-teal-200">
                                                ⏰ {b.slot || (b.dateTime && b.dateTime.includes('(') ? b.dateTime.split('(')[1].replace(')', '').trim() : 'IST Slot')}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs">
                                            {b.assignedStaff ? (
                                                <div className="bg-emerald-50/80 border border-emerald-200/80 p-2 rounded-xl">
                                                    <div className="font-bold text-emerald-800">{b.assignedStaff.name}</div>
                                                    <div className="text-[10px] text-emerald-600 font-mono">+{b.assignedStaff.phone}</div>
                                                </div>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleUpdateStatus(b.id, 'Assigned', e.target.value)}
                                                    defaultValue=""
                                                    className="bg-amber-50 text-amber-900 text-xs font-bold border border-amber-300 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-2xs"
                                                >
                                                    <option value="" disabled>Assign Staff...</option>
                                                    {staff.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={b.status}
                                                onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                                className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
                                            >
                                                <option value="Pending Assignment">🟡 Pending Assignment</option>
                                                <option value="Assigned">🟢 Assigned</option>
                                                <option value="On the way">🚗 On the way</option>
                                                <option value="In Progress">🏥 In Progress</option>
                                                <option value="Completed">✅ Completed</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a
                                                href={`${API_BASE}/api/bookings/${b.id}/invoice`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 transition shadow-2xs"
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
        </div>
    );
}
