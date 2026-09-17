'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Calendar, AlertTriangle, CheckCircle, Clock, Truck, 
  ShieldAlert, FileText, Download, Phone, RefreshCw, MessageSquare, Send, 
  CheckCheck, Sparkles, Stethoscope, UserCheck, HeartPulse, FlaskConical, 
  Filter, MessageCircle, ArrowUpRight, Search, ArrowRight, ExternalLink,
  MapPin, Check, Trash2
} from 'lucide-react';

const API_BASE = '';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [staff, setStaff] = useState([]);
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [inboundTab, setInboundTab] = useState('PATIENT'); // 'PATIENT' | 'PARTNER' | 'ALL'
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

    const handleSendReminder = async (bookingId, type = '24h') => {
        try {
            await fetch(`${API_BASE}/api/bookings/${bookingId}/remind`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            fetchData();
        } catch (err) {
            console.error('Reminder dispatch failed:', err);
        }
    };

    const handleDismissEmergency = async (id = 'all') => {
        try {
            await fetch(`${API_BASE}/api/emergency/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            fetchData();
        } catch (err) {
            console.error('Dismiss emergency failed:', err);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!confirm(`Are you sure you want to permanently delete booking ${bookingId}?`)) return;
        try {
            await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
                method: 'DELETE'
            });
            fetchData();
        } catch (err) {
            console.error('Delete booking failed:', err);
        }
    };

    const filteredBookings = filterStatus === 'ALL'
        ? bookings
        : bookings.filter(b => b.status === filterStatus);

    const patientMessages = messages.filter(m => m.leadType !== 'PARTNER');
    const partnerMessages = messages.filter(m => m.leadType === 'PARTNER');
    const displayedMessages = inboundTab === 'PATIENT'
        ? patientMessages
        : inboundTab === 'PARTNER'
            ? partnerMessages
            : messages;

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
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
                                        108 Advisory Triggered
                                    </span>
                                    <button
                                        onClick={() => handleDismissEmergency('all')}
                                        className="text-[11px] bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer shadow-2xs"
                                        title="Clear all emergency notices"
                                    >
                                        ✕ Dismiss All
                                    </button>
                                </div>
                            </div>
                            <p className="text-rose-800 text-xs mt-1">
                                Patient reported severe clinical keywords. Immediate doctor escalation recommended:
                            </p>
                            <div className="mt-3 space-y-2">
                                {emergencyAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white p-3 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                                        <div>
                                            <span className="font-bold text-slate-900 text-sm">{alert.patientName || 'Emergency Patient'}</span>
                                            <span className="text-slate-500 ml-2 font-mono">+{alert.phone}</span>
                                            <span className="text-rose-700 font-semibold ml-2 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                                                Triggered: "{alert.triggerKeyword}"
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`tel:${alert.phone}`}
                                                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition shrink-0 shadow-sm"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>Call Patient Immediately</span>
                                            </a>
                                            <button
                                                onClick={() => handleDismissEmergency(alert.id)}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer"
                                                title="Mark this notice resolved"
                                            >
                                                ✓ Resolve
                                            </button>
                                        </div>
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
                    <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{patientMessages.length} Patients</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-indigo-600 font-bold">{partnerMessages.length} Partners</span>
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
                                <th className="py-3 px-4 w-32">Booking ID</th>
                                <th className="py-3 px-4 min-w-[280px]">Service & Patient Details</th>
                                <th className="py-3 px-4 w-44">Date & Slot</th>
                                <th className="py-3 px-4 w-56">Assigned Specialist</th>
                                <th className="py-3 px-4 w-40">Pipeline Status</th>
                                <th className="py-3 px-4 w-32">WhatsApp Reminders</th>
                                <th className="py-3 px-4 w-28 text-right">Invoice & Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-14 text-center text-slate-400">
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
                                        <td className="py-3 px-4 whitespace-nowrap align-top">
                                            <div className="font-mono font-black text-xs text-teal-900 bg-teal-50 border border-teal-200/90 px-2.5 py-1 rounded-md tracking-wide whitespace-nowrap shadow-2xs inline-block">
                                                {b.id}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-semibold mt-1 ml-0.5">
                                                Home Visit
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 align-top">
                                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                                <span>{(b.serviceName || 'Healthcare Service').replace(/\s*\([₹\d\s,/-]+\)/g, '').trim()}</span>
                                                {b.amount && (
                                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 shadow-2xs">
                                                        ₹{b.amount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                <span>👤 {(b.patientName || 'Patient').replace(/\s+and\s+(\d{1,3})/i, ' (Age: $1)').trim()}</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-mono text-slate-500">
                                                    +{(b.patientPhone || b.phone || '91').toString().replace(/\D/g, '')}
                                                </span>
                                            </div>
                                            {(() => {
                                                const rawAddr = b.address || b.location || '';
                                                const mapMatch = rawAddr.match(/https?:\/\/(?:maps\.google\.com|goo\.gl|maps\.app\.goo\.gl)[^\s)]+/i);
                                                const gpsUrl = mapMatch ? mapMatch[0] : null;
                                                const hasPinMention = rawAddr.includes('Location Pin') || rawAddr.includes('[LOCATION MESSAGE]');

                                                let cleanTextAddr = rawAddr
                                                    .replace(/^[+\-\s]+/, '')
                                                    .replace(/[*_~`]/g, '')
                                                    .replace(/https?:\/\/[^\s)]+/g, '')
                                                    .replace(/\[LOCATION MESSAGE\]/g, '')
                                                    .replace(/\s*Landmark:\s*[^,]+/i, '')
                                                    .replace(/\s*PIN:\s*\d{6}/i, '')
                                                    .trim();

                                                const pin = b.pincode || (rawAddr.match(/\b[1-9][0-9]{5}\b/)?.[0]) || null;
                                                const landmark = b.landmark || (rawAddr.match(/Landmark:\s*([^,*\n]+)/i)?.[1]?.trim()) || null;
                                                const searchLoc = [cleanTextAddr, landmark, pin].filter(Boolean).join(', ');
                                                const mapUrl = gpsUrl || (searchLoc ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchLoc)}` : null);

                                                return (
                                                    <div className="mt-1 space-y-1">
                                                        <div className="text-[11px] text-slate-700 font-medium flex items-start gap-1">
                                                            <span className="shrink-0 text-slate-400">🏠</span>
                                                            <span className="line-clamp-2">{cleanTextAddr || 'Doorstep address on file'}</span>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                            {landmark && (
                                                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    Near: {landmark}
                                                                </span>
                                                            )}
                                                            {pin && (
                                                                <span className="text-[10px] font-mono font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80">
                                                                    PIN: {pin}
                                                                </span>
                                                            )}
                                                            {hasPinMention && (
                                                                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-200 inline-flex items-center gap-0.5">
                                                                    📍 GPS Attached
                                                                </span>
                                                            )}
                                                            {mapUrl && (
                                                                <a
                                                                    href={mapUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition shadow-2xs"
                                                                >
                                                                    <span>Maps ↗</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-xs align-top">
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                                <span>{b.date || (b.dateTime ? b.dateTime.split('(')[0].trim() : 'Scheduled')}</span>
                                            </div>
                                            <div className="mt-1 inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-mono font-semibold text-[11px] px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                                                <Clock className="w-3 h-3 text-teal-600" />
                                                <span>{b.slot || (b.dateTime && b.dateTime.includes('(') ? b.dateTime.split('(')[1].replace(')', '').trim() : 'Scheduled Slot')}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 min-w-[210px] align-top">
                                            {b.assignedStaff ? (
                                                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-2 shadow-2xs">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                                                {b.assignedStaff.name.charAt(0) || '🩺'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-slate-900 text-xs truncate">
                                                                    {b.assignedStaff.name}
                                                                </div>
                                                                <div className="text-[10px] text-emerald-700 font-mono font-medium">
                                                                    +{(b.assignedStaff.phone || '').toString().replace(/^\++/, '')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="shrink-0">
                                                            <select
                                                                onChange={(e) => handleUpdateStatus(b.id, 'Assigned', e.target.value)}
                                                                defaultValue=""
                                                                title="Reassign specialist"
                                                                className="bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-300 rounded-lg px-2 py-1 cursor-pointer transition shadow-2xs focus:outline-none"
                                                            >
                                                                <option value="" disabled>Change</option>
                                                                {staff.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleUpdateStatus(b.id, 'Assigned', e.target.value)}
                                                    defaultValue=""
                                                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 rounded-xl px-2.5 py-1.5 cursor-pointer transition shadow-2xs focus:outline-none"
                                                >
                                                    <option value="" disabled>⚡ Assign Specialist...</option>
                                                    {staff.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap align-top">
                                            <select
                                                value={b.status}
                                                onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                                className={`text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none shadow-2xs cursor-pointer border transition ${
                                                    b.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                        : b.status === 'Assigned'
                                                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                                                            : b.status === 'On the way'
                                                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                                                : 'bg-amber-50 text-amber-800 border-amber-300'
                                                }`}
                                            >
                                                <option value="Pending Assignment">🟡 Pending Assignment</option>
                                                <option value="Assigned">🟢 Assigned</option>
                                                <option value="On the way">🚗 On the way</option>
                                                <option value="In Progress">🏥 In Progress</option>
                                                <option value="Completed">✅ Completed</option>
                                            </select>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-xs align-top">
                                            <div className="flex flex-col gap-1">
                                                {b.reminder24hSent ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                                        ✓ 24h Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendReminder(b.id, '24h')}
                                                        title="Send 24-Hour WhatsApp Reminder"
                                                        className="inline-flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer shadow-2xs"
                                                    >
                                                        ⏰ Send 24h
                                                    </button>
                                                )}
                                                {b.reminder2hSent ? (
                                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                                        ✓ 2h Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendReminder(b.id, '2h')}
                                                        title="Send 2-Hour WhatsApp Reminder"
                                                        className="inline-flex items-center justify-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer shadow-2xs"
                                                    >
                                                        🚗 Send 2h
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-right align-top">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={`${API_BASE}/api/bookings/${b.id}/invoice`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-teal-800 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition shadow-2xs"
                                                >
                                                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                                                    <span>PDF</span>
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteBooking(b.id)}
                                                    title={`Permanently delete booking ${b.id}`}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WHATSAPP INBOUND COMMUNICATIONS & LEADS PIPELINE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden mt-6">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 to-white">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md transition ${
                            inboundTab === 'PARTNER' 
                                ? 'bg-indigo-600 shadow-indigo-600/20' 
                                : 'bg-emerald-600 shadow-emerald-600/20'
                        }`}>
                            {inboundTab === 'PARTNER' ? <Users className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-slate-900 text-lg sm:text-xl">
                                    {inboundTab === 'PATIENT' && 'WhatsApp Patient Inquiries & Booking Leads'}
                                    {inboundTab === 'PARTNER' && 'Healthcare Partner Onboarding Leads'}
                                    {inboundTab === 'ALL' && 'All WhatsApp Inbound Communications'}
                                </h2>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                                    inboundTab === 'PARTNER'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {displayedMessages.length} Leads
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {inboundTab === 'PATIENT' && 'Live prospective patients, consultation queries, and service booking requests'}
                                {inboundTab === 'PARTNER' && 'Doctors, Nurses, Caregivers, Phlebotomists & Clinics registered via WhatsApp'}
                                {inboundTab === 'ALL' && 'Combined feed of patient inquiries, service requests, and partner applications'}
                            </p>
                        </div>
                    </div>

                    {/* Tab Selector Buttons */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
                        <button
                            onClick={() => setInboundTab('PATIENT')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                inboundTab === 'PATIENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Patient Inquiries ({patientMessages.length})</span>
                        </button>

                        <button
                            onClick={() => setInboundTab('PARTNER')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                inboundTab === 'PARTNER'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Partner Leads ({partnerMessages.length})</span>
                        </button>

                        <button
                            onClick={() => setInboundTab('ALL')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                                inboundTab === 'ALL'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <span>All ({messages.length})</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                        <thead className="text-[11px] font-bold uppercase bg-slate-50/90 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 w-32">
                                    {inboundTab === 'PARTNER' ? 'Partner ID' : 'Inquiry ID'}
                                </th>
                                <th className="py-3 px-4 w-48">
                                    {inboundTab === 'PARTNER' ? 'Healthcare Applicant' : 'Patient / Sender'}
                                </th>
                                <th className="py-3 px-4 w-44">
                                    {inboundTab === 'PARTNER' ? 'Profession & Specialty' : 'Status / Stage'}
                                </th>
                                <th className="py-3 px-4">
                                    {inboundTab === 'PARTNER' ? 'Application Details & Experience' : 'Latest Interaction / Request'}
                                </th>
                                <th className="py-3 px-4 w-28">Time</th>
                                <th className="py-3 px-4 w-32 text-right">Quick Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedMessages.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                {inboundTab === 'PARTNER' ? <Users className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                                            </div>
                                            <p className="font-bold text-slate-700 text-sm">
                                                {inboundTab === 'PARTNER'
                                                    ? 'No Partner Applications Yet'
                                                    : 'No WhatsApp Patient Inquiries Yet'}
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                {inboundTab === 'PARTNER'
                                                    ? 'When doctors, nurses, or caregivers register via option 6 on WhatsApp, their partner applications will appear here.'
                                                    : 'When patients message the WhatsApp bot for healthcare services or queries, their inquiry appears here.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayedMessages.map((m) => {
                                    const isPartner = m.leadType === 'PARTNER';
                                    const isBooking = (m.status && m.status.toLowerCase().includes('booking'));
                                    const cleanPhone = (m.phone || '').toString().replace(/\D/g, '');

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/70 transition">
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                                                    isPartner 
                                                        ? 'bg-indigo-50 text-indigo-900 border-indigo-200' 
                                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                                }`}>
                                                    {m.id}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                    <span>{m.senderName || (isPartner ? 'Partner Applicant' : 'WhatsApp Patient')}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                    +{cleanPhone}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                                                {isPartner ? (
                                                    <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                                        🤝 {m.status || 'Partner Applicant'}
                                                    </span>
                                                ) : isBooking ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                                                        ✅ {m.status}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                                        💬 {m.status || 'Active Inquiry'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-xs max-w-xs">
                                                <div className="font-medium text-slate-800 truncate" title={m.userMessage}>
                                                    {m.userMessage}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                                                {m.timestamp || 'Just now'}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <a
                                                    href={`https://wa.me/${cleanPhone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 transition shadow-2xs"
                                                >
                                                    <Send className="w-3 h-3 text-emerald-600" />
                                                    <span>WhatsApp</span>
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
