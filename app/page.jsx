'use client';

import React, { useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import StaffManagement from '../components/StaffManagement';
import PricingManagement from '../components/PricingManagement';
import { LayoutDashboard, Users, Tag } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('inquiries');

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans selection:bg-teal-600 selection:text-white">
      {/* Enterprise Top Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand & Logo */}
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-teal-500/20">
                🏥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    AMPLR <span className="text-teal-400 font-semibold">Health</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    WhatsApp Cloud API Connected
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  AMPLR WhatsApp Inquiry Management System
                </span>
              </div>
            </div>

            {/* 3 Focused Tabs: Inquiry Dashboard, Staff Management, Services & Pricing */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('inquiries')}
                className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'inquiries'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Inquiry Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Management</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'pricing'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Services & Pricing</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 lg:p-8 transition-all duration-200">
        {activeTab === 'inquiries' && <AdminDashboard />}
        {activeTab === 'staff' && <StaffManagement />}
        {activeTab === 'pricing' && <PricingManagement />}
      </main>
    </div>
  );
}
