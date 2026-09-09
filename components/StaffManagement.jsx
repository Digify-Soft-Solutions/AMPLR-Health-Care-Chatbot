'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Star, Phone, MapPin, Activity, CheckCircle, ShieldCheck, Search, Stethoscope, Users, HeartPulse, FlaskConical, Filter } from 'lucide-react';

const API_BASE = '';

export default function StaffManagement() {
    const [staff, setStaff] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    useEffect(() => {
        fetch(`${API_BASE}/api/staff`)
            .catch(() => fetch('/api/staff'))
            .then(res => res.json())
            .then(data => setStaff(data.staff || []))
            .catch(err => console.error(err));
    }, []);

    const filteredStaff = staff.filter(m => {
        const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
        const q = search.toLowerCase();
        const matchesSearch = !search.trim() || 
            (m.name && m.name.toLowerCase().includes(q)) ||
            (m.role && m.role.toLowerCase().includes(q)) ||
            (m.location && m.location.includes(q)) ||
            (m.phone && m.phone.includes(q));
        return matchesCategory && matchesSearch;
    });

    const categories = [
        { id: 'ALL', label: 'All Staff' },
        { id: 'nursing', label: 'Nurses' },
        { id: 'physio', label: 'Physiotherapists' },
        { id: 'caretaker', label: 'Caretakers' },
        { id: 'lab', label: 'Phlebotomists' },
        { id: 'ecg', label: 'ECG Specialists' }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                            Medical Personnel Roster
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                        Staff Management Dashboard
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                        Verified healthcare roster of senior nurses, physiotherapists, lab technicians, and caretakers ready for home dispatch.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl shadow-sm whitespace-nowrap">
                        {staff.length} Active Professionals
                    </span>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs pb-1 md:pb-0">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                                selectedCategory === cat.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, pincode, role..."
                        className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 w-full"
                    />
                </div>
            </div>

            {/* Staff Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredStaff.map((member) => (
                    <div 
                        key={member.id} 
                        className="bg-white border border-slate-200/90 hover:border-teal-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:scale-105 transition">
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                        {member.name}
                                    </h3>
                                    <div className="text-xs text-teal-700 font-semibold mt-0.5">
                                        {member.role}
                                    </div>
                                </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-bold">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center space-x-1.5 text-slate-700 font-mono">
                                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                                    <span>{member.phone}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>{member.rating}</span>
                                </span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>Pincode Coverage: <strong className="text-slate-800 font-mono">{member.location}</strong></span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Available for Dispatch
                            </span>
                            <a
                                href={`tel:${member.phone}`}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5 rounded-xl transition font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                                <Phone className="w-3 h-3 text-teal-400" />
                                <span>Call Staff</span>
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
