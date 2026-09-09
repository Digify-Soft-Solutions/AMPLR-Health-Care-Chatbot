'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Edit3, Trash2, Plus, Check, RefreshCw, Sparkles, 
  Stethoscope, UserCheck, Activity, FlaskConical, HeartPulse, 
  Truck, ShieldCheck, Search, Clock, Tag, X, AlertCircle, Zap
} from 'lucide-react';

const API_BASE = '';

export default function PricingManagement() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [editingService, setEditingService] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        category: 'nursing',
        basePrice: '',
        priceDescription: '',
        description: '',
        slots: '',
        active: true
    });

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/services`).catch(() => fetch('/api/services'));
            const data = await res.json();
            if (data?.services) {
                setServices(data.services);
            }
        } catch (err) {
            console.error('Error fetching services:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const openEditModal = (service) => {
        setEditingService(service);
        setFormData({
            name: service.name || '',
            category: service.category || 'nursing',
            basePrice: service.basePrice || 0,
            priceDescription: service.priceDescription || '',
            description: service.description || '',
            slots: Array.isArray(service.slots) ? service.slots.join(', ') : (service.slots || ''),
            active: service.active !== false
        });
    };

    const openAddModal = () => {
        setFormData({
            name: '',
            category: 'nursing',
            basePrice: '',
            priceDescription: '',
            description: '',
            slots: '09:00 AM, 11:00 AM, 02:00 PM, 05:00 PM',
            active: true
        });
        setIsAddModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingService) return;

        const payload = {
            name: formData.name,
            category: formData.category,
            basePrice: Number(formData.basePrice) || 0,
            priceDescription: formData.priceDescription,
            description: formData.description,
            slots: formData.slots.split(',').map(s => s.trim()).filter(Boolean),
            active: formData.active
        };

        try {
            const res = await fetch(`${API_BASE}/api/services/${editingService.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setSaveMessage(`✅ "${formData.name}" price & details updated successfully! Live on WhatsApp.`);
                setTimeout(() => setSaveMessage(''), 4000);
                setEditingService(null);
                fetchServices();
            }
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleCreateService = async (e) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            category: formData.category,
            basePrice: Number(formData.basePrice) || 0,
            priceDescription: formData.priceDescription || `₹${formData.basePrice} per visit`,
            description: formData.description,
            slots: formData.slots.split(',').map(s => s.trim()).filter(Boolean),
            active: formData.active
        };

        try {
            const res = await fetch(`${API_BASE}/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setSaveMessage(`✅ New service "${formData.name}" added and synced with WhatsApp bot!`);
                setTimeout(() => setSaveMessage(''), 4000);
                setIsAddModalOpen(false);
                fetchServices();
            }
        } catch (err) {
            console.error('Create failed:', err);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete or deactivate "${name}"?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/services/${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
                setSaveMessage(`🗑️ Service "${name}" removed.`);
                setTimeout(() => setSaveMessage(''), 3000);
                fetchServices();
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const getIconForCategory = (category) => {
        switch (category) {
            case 'nursing': return <Stethoscope className="w-5 h-5" />;
            case 'caretaker': return <UserCheck className="w-5 h-5" />;
            case 'physio': return <Activity className="w-5 h-5" />;
            case 'lab': return <FlaskConical className="w-5 h-5" />;
            case 'ecg': return <HeartPulse className="w-5 h-5" />;
            case 'doctor': return <Stethoscope className="w-5 h-5" />;
            case 'ambulance': return <Truck className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const categories = [
        { id: 'ALL', label: 'All Services' },
        { id: 'nursing', label: 'Nursing' },
        { id: 'caretaker', label: 'Caretaker' },
        { id: 'physio', label: 'Physiotherapy' },
        { id: 'lab', label: 'Lab Tests' },
        { id: 'ecg', label: 'ECG' },
        { id: 'doctor', label: 'Doctor Consult' },
        { id: 'ambulance', label: 'Ambulance' }
    ];

    const filteredServices = services.filter(s => {
        const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
        const q = search.toLowerCase();
        const matchesSearch = !search.trim() || 
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.priceDescription && s.priceDescription.toLowerCase().includes(q));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto font-sans">
            {/* Success Toast */}
            {saveMessage && (
                <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs sm:text-sm font-semibold animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-100 animate-pulse" />
                        <span>{saveMessage}</span>
                    </div>
                    <button onClick={() => setSaveMessage('')} className="text-emerald-100 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header Banner */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                            Live WhatsApp Sync
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                        Services & Pricing Manager
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                        Live healthcare tariff and booking rates. <strong className="text-teal-700 font-semibold">Any changes made here immediately sync to Meta WhatsApp replies and patient invoices!</strong>
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={openAddModal}
                        className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add New Service</span>
                    </button>
                    <button
                        onClick={fetchServices}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Live WhatsApp Meta Sync Explainer Card */}
            <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-bold block mb-0.5">
                        💡 How Live Meta WhatsApp Sync Works:
                    </strong>
                    Jab aap yahan kisi bhi service ki price ya details change karenge, wo turant hamare engine me update ho jati hai. Jab koi patient WhatsApp par message bhejta hai, Meta Cloud API hamare server se updated price lekar patient ko instant WhatsApp message bhejti hai. <strong>Meta Developer Portal par jaakar price change karne ki zaroorat nahi hai.</strong>
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
                        placeholder="Search service name, tariff..."
                        className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 w-full"
                    />
                </div>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredServices.map((service) => (
                    <div 
                        key={service.id} 
                        className="bg-white border border-slate-200/90 hover:border-teal-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                    >
                        <div>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition">
                                        {getIconForCategory(service.category)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                            {service.name}
                                        </h3>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 mt-1">
                                            {service.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-2xl font-black text-slate-900">
                                        ₹{service.basePrice}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        Live Price
                                    </span>
                                </div>
                            </div>

                            {/* Price Description */}
                            <div className="mt-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800">
                                💵 {service.priceDescription || `₹${service.basePrice} per booking`}
                            </div>

                            {/* Service Description */}
                            {service.description && (
                                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                                    {service.description}
                                </p>
                            )}

                            {/* Available Slots */}
                            {service.slots && service.slots.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                        Available Booking Slots:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {service.slots.map((slot, idx) => (
                                            <span 
                                                key={idx}
                                                className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                                            >
                                                {slot}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                                onClick={() => openEditModal(service)}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                                <span>Edit Pricing & Details</span>
                            </button>
                            <button
                                onClick={() => handleDelete(service.id, service.name)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Delete Service"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* EDIT MODAL */}
            {editingService && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                    Edit Pricing & Service Details
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Updates immediately sync with Meta WhatsApp bot
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingService(null)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Service Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Base Price (₹ INR)</label>
                                    <input
                                        type="number"
                                        value={formData.basePrice}
                                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="nursing">Nursing</option>
                                        <option value="caretaker">Caretaker</option>
                                        <option value="physio">Physiotherapy</option>
                                        <option value="lab">Lab Test</option>
                                        <option value="ecg">ECG</option>
                                        <option value="doctor">Doctor Consultation</option>
                                        <option value="ambulance">Ambulance</option>
                                        <option value="hospital">Hospital Referral</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Price / Tariff Description (Shown on WhatsApp)
                                </label>
                                <input
                                    type="text"
                                    value={formData.priceDescription}
                                    onChange={(e) => setFormData({ ...formData, priceDescription: e.target.value })}
                                    placeholder="e.g. ₹950 per visit / ₹1,800 for 12-hr shift"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Service Procedures & Scope</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Procedures included in this service..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-teal-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Available Slots (Comma Separated)</label>
                                <input
                                    type="text"
                                    value={formData.slots}
                                    onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                                    placeholder="09:00 AM, 11:00 AM, 02:00 PM, 05:00 PM"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditingService(null)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span>Save & Sync to WhatsApp</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD NEW SERVICE MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                    Add New Healthcare Service
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Create a new bookable service for AMPLR Health
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateService} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Service Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Pediatric Nursing / Orthopedic Care"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Base Price (₹ INR)</label>
                                    <input
                                        type="number"
                                        value={formData.basePrice}
                                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                        placeholder="e.g. 750"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="nursing">Nursing</option>
                                        <option value="caretaker">Caretaker</option>
                                        <option value="physio">Physiotherapy</option>
                                        <option value="lab">Lab Test</option>
                                        <option value="ecg">ECG</option>
                                        <option value="doctor">Doctor Consultation</option>
                                        <option value="ambulance">Ambulance</option>
                                        <option value="hospital">Hospital Referral</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Price / Tariff Description (Shown on WhatsApp)
                                </label>
                                <input
                                    type="text"
                                    value={formData.priceDescription}
                                    onChange={(e) => setFormData({ ...formData, priceDescription: e.target.value })}
                                    placeholder="e.g. ₹750 per visit (Includes vitals check)"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Service Procedures & Scope</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Details of what is included in this home healthcare service..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-teal-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Available Slots (Comma Separated)</label>
                                <input
                                    type="text"
                                    value={formData.slots}
                                    onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
                                    placeholder="09:00 AM, 11:00 AM, 02:00 PM, 05:00 PM"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 text-emerald-400" />
                                    <span>Create & Sync to WhatsApp</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
