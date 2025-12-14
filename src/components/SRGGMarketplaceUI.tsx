'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Users, Package, Shield, TrendingUp, Coins, Map,
  FileCheck, Truck, Building2, Leaf, Globe, ChevronRight,
  Search, Bell, Settings, Menu, X, ArrowUpRight, ArrowDownRight,
  Activity, Wallet, Lock, Eye, Filter, Plus, Download, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, ChevronDown, Layers,
  Database, Zap, Ship, Factory, Home, LayoutDashboard, Store,
  FileText, CreditCard, PieChart, UserCircle, LogOut, HelpCircle,
  Anchor, Boxes, Scale, LineChart, Target, Award, Landmark,
  ShieldCheck, Fingerprint, QrCode, MapPin, Calendar, Upload,
  ClipboardCheck, Microscope, Container, Wheat, Gem, Music,
  TreePine, Sun, Moon, Loader2
} from 'lucide-react';
import ProducerRegistrationFlow from './ProducerRegistration';
import {
  useDashboardStats,
  useProducers,
  useListings,
  useTokens,
  useValidations,
  useInsurancePolicies,
  useHedgePositions,
  useShipments,
  useAnalytics,
  useSettings,
  useUpdateSettings,
  useCommodities,
  useCreateCommodity,
  useNotifications,
  useCreateHedgePosition,
  useCreateShipment,
  useCreateInsurancePolicy,
  useMintToken,
  useCreateValidation,
  useCreateOrder,
} from '@/hooks/useApi';

// User type for localStorage
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ============================================
// SRGG MARKETPLACE PLATFORM - COMPLETE UI/UX
// ============================================

// Color System
const colors = {
  primary: {
    900: '#0c1929',
    800: '#0f2744',
    700: '#14365f',
    600: '#1a4a80',
    500: '#2563eb',
    400: '#4f8ff7',
    300: '#93bbfc',
  },
  accent: {
    gold: '#d4a853',
    goldLight: '#e8c778',
    goldDark: '#b8923f',
    emerald: '#10b981',
    ruby: '#ef4444',
    amber: '#f59e0b',
  },
  neutral: {
    900: '#111827',
    800: '#1f2937',
    700: '#374151',
    600: '#4b5563',
    500: '#6b7280',
    400: '#9ca3af',
    300: '#d1d5db',
    200: '#e5e7eb',
    100: '#f3f4f6',
    50: '#f9fafb',
  }
};

// Loading Spinner Component
const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin mb-3" />
    <p className="text-sm">{message}</p>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 text-red-400">
    <AlertTriangle className="w-8 h-8 mb-3" />
    <p className="text-sm mb-3">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="px-4 py-2 bg-red-500/10 rounded-lg text-sm hover:bg-red-500/20">
        Try Again
      </button>
    )}
  </div>
);

// Format currency helper
const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};

// Format number helper
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Navigation Items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'producers', label: 'Producers', icon: Users },
  { id: 'commodities', label: 'Commodities', icon: Package },
  { id: 'tokenization', label: 'Tokenization', icon: Coins },
  { id: 'validation', label: 'Validation', icon: ClipboardCheck },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'hedging', label: 'Hedging', icon: TrendingUp },
  { id: 'logistics', label: 'Logistics', icon: Ship },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================
interface SidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar = ({ activeScreen, setActiveScreen, collapsed, setCollapsed, user, onLogout }: SidebarProps) => {
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
        border-r border-slate-800/50 transition-all duration-300 z-50
        ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600
              flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">SRGG</h1>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">Marketplace</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600
            flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-10rem)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent text-amber-400 border-l-2 border-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }
                ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800/50 space-y-2">
        <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50
          cursor-pointer transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600
            flex items-center justify-center text-white font-semibold text-sm">
            {user ? getUserInitials(user.name) : 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role || 'Role'}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
            text-slate-400 hover:text-red-400 hover:bg-red-500/10 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

// ============================================
// HEADER COMPONENT
// ============================================
interface HeaderProps {
  title: string;
  subtitle: string;
  userName?: string;
  onNewListing?: () => void;
}

const Header = ({ title, subtitle, userName, onNewListing }: HeaderProps) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50
      flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}{userName ? `, ${userName}` : ''}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchFocused ? 'w-80' : 'w-64'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search commodities, producers..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl
              text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50
              focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px]
            text-slate-500 bg-slate-700/50 rounded">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-400
          hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full
            ring-2 ring-slate-900"></span>
        </button>

        {/* Quick Actions */}
        <button
          onClick={onNewListing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500
            to-amber-600 rounded-xl text-sm font-medium text-white hover:from-amber-400
            hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          New Listing
        </button>
      </div>
    </header>
  );
};

// ============================================
// STAT CARD COMPONENT
// ============================================
type StatCardColor = 'amber' | 'emerald' | 'blue' | 'purple' | 'red';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down';
  color?: StatCardColor;
}

const StatCard = ({ icon: Icon, label, value, change, changeType, color = 'amber' }: StatCardProps) => {
  const colorClasses: Record<StatCardColor, string> = {
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5
      hover:border-slate-600/50 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} border`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium
            ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD SCREEN
// ============================================
const DashboardScreen = () => {
  const { data: stats, loading, error, refetch } = useDashboardStats();

  // Derive market data from top commodities
  const marketData = stats?.topCommodities?.slice(0, 4).map((item, i) => ({
    commodity: item.commodity.name,
    price: formatCurrency(item.totalValue / (item.listingCount || 1)),
    change: ['+3.2%', '+0.8%', '-1.2%', '+2.1%'][i] || '+0.0%',
    trend: i !== 2 ? 'up' : 'down',
  })) || [];

  // Map recent orders to transactions format
  const recentTransactions = stats?.recentOrders?.map(order => ({
    id: order.orderNumber,
    type: 'Trade',
    commodity: order.commodity,
    qty: `${order.quantity} units`,
    value: formatCurrency(order.totalPrice),
    status: order.status.toLowerCase(),
    time: new Date(order.createdAt).toLocaleDateString(),
  })) || [];

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Coins} label="Total Tokenized Assets" value={formatCurrency(stats?.tokens?.minted ? stats.tokens.minted * 1000 : 0)} change="+12.5%" changeType="up" color="amber" />
        <StatCard icon={Users} label="Active Producers" value={formatNumber(stats?.producers?.total || 0)} change="+8.3%" changeType="up" color="emerald" />
        <StatCard icon={Shield} label="Listings Value" value={formatCurrency(stats?.listings?.totalValue || 0)} change="+15.2%" changeType="up" color="blue" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.orders?.revenue || 0)} change="+5.7%" changeType="up" color="purple" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Market Overview Chart */}
        <div className="col-span-2 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Market Overview</h3>
              <p className="text-sm text-slate-500">Real-time commodity trading volume</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white 
                hover:bg-slate-700/50 rounded-lg transition-colors">24H</button>
              <button className="px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 
                rounded-lg">7D</button>
              <button className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white 
                hover:bg-slate-700/50 rounded-lg transition-colors">30D</button>
            </div>
          </div>
          
          {/* Simulated Chart */}
          <div className="h-64 flex items-end gap-2 px-4">
            {[65, 45, 78, 52, 88, 42, 95, 68, 72, 85, 58, 92, 48, 76, 82, 55, 90, 62, 78, 88].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-gradient-to-t from-amber-500/80 to-amber-400/40 rounded-t-sm 
                    hover:from-amber-400 hover:to-amber-300/60 transition-all cursor-pointer"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 mt-2 text-xs text-slate-500">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
            <span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Live Market Prices */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Prices</h3>
            <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
          </div>
          <div className="space-y-3">
            {marketData.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 
                rounded-xl hover:bg-slate-900/70 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${item.trend === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <LineChart className={`w-5 h-5 ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.commodity}</p>
                    <p className="text-xs text-slate-500">{item.price}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <p className="text-sm text-slate-500">Latest marketplace activity</p>
          </div>
          <button className="text-sm text-amber-400 hover:text-amber-300 font-medium">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Commodity</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((txn) => (
                <tr key={txn.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-amber-400">{txn.id}</td>
                  <td className="py-3 px-4 text-sm text-white">{txn.type}</td>
                  <td className="py-3 px-4 text-sm text-white">{txn.commodity}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{txn.qty}</td>
                  <td className="py-3 px-4 text-sm font-medium text-white">{txn.value}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                      ${txn.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                        txn.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 
                        'bg-blue-500/10 text-blue-400'}`}>
                      {txn.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                       txn.status === 'pending' ? <Clock className="w-3 h-3" /> :
                       <RefreshCw className="w-3 h-3" />}
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">{txn.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Hubs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm 
          rounded-2xl border border-emerald-500/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ghana Hub</h3>
              <p className="text-sm text-emerald-400">West Africa Gateway</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">1,247</p>
              <p className="text-xs text-slate-500">Producers</p>
            </div>
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">$2.8M</p>
              <p className="text-xs text-slate-500">Volume</p>
            </div>
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">89%</p>
              <p className="text-xs text-slate-500">Verified</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm 
          rounded-2xl border border-blue-500/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Dominican Republic Hub</h3>
              <p className="text-sm text-blue-400">Caribbean Gateway</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">892</p>
              <p className="text-xs text-slate-500">Producers</p>
            </div>
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">$1.4M</p>
              <p className="text-xs text-slate-500">Volume</p>
            </div>
            <div className="text-center p-3 bg-slate-900/30 rounded-xl">
              <p className="text-xl font-bold text-white">94%</p>
              <p className="text-xs text-slate-500">Verified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MARKETPLACE SCREEN
// ============================================
interface ListingItem {
  id: string;
  name: string;
  category: string;
  origin: string;
  qty: string;
  price: string;
  verified: boolean;
  insurance: boolean;
  image: string;
  description?: string;
  pricePerUnit?: number;
  quantity?: number;
  unit?: string;
  producerName?: string;
  rawId?: string;
}

const MarketplaceScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<ListingItem | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const { data: listingData, loading, error, refetch } = useListings({ status: 'ACTIVE' });
  const { mutate: createOrder } = useCreateOrder();

  const categories = [
    { id: 'all', label: 'All Assets', icon: Layers },
    { id: 'AGRICULTURE', label: 'Agriculture', icon: Wheat },
    { id: 'MINERALS', label: 'Minerals', icon: Gem },
    { id: 'ENVIRONMENTAL', label: 'Carbon Credits', icon: TreePine },
    { id: 'CULTURAL', label: 'Cultural IP', icon: Music },
  ];

  // Map API data to UI format with category icons
  const categoryIcons: Record<string, string> = {
    'AGRICULTURE': '🌾',
    'MINERALS': '💎',
    'ENVIRONMENTAL': '🌳',
    'CULTURAL': '🎨',
  };

  const listingsArray = Array.isArray(listingData) ? listingData : listingData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings: ListingItem[] = listingsArray.map((l: any) => {
    const commodityCategory = String((l.commodity as Record<string, unknown>)?.category || 'AGRICULTURE');
    const producerName = String((l.producer as Record<string, unknown>)?.name || 'SRGG Producer');
    return {
      id: (l.id as string).slice(0, 8).toUpperCase(),
      rawId: l.id,
      name: l.title,
      category: commodityCategory,
      origin: l.origin || 'Ghana',
      qty: `${l.quantity} ${l.unit}`,
      price: `${formatCurrency(l.pricePerUnit as number)}/${l.unit}`,
      verified: l.isVerified,
      insurance: l.isInsured,
      image: categoryIcons[commodityCategory] || '📦',
      description: l.description || 'Premium quality commodity from verified producer.',
      pricePerUnit: l.pricePerUnit,
      quantity: l.quantity,
      unit: l.unit,
      producerName,
    };
  });

  const handleProductClick = (listing: ListingItem) => {
    setSelectedProduct(listing);
  };

  const handleTradeClick = (listing: ListingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(listing);
    setShowTradeModal(true);
    setTradeQuantity(1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct?.rawId) return;

    setIsOrdering(true);
    try {
      const result = await createOrder({
        listingId: selectedProduct.rawId,
        quantity: tradeQuantity,
      });

      if (result.success) {
        setShowTradeModal(false);
        setSelectedProduct(null);
        alert('Order placed successfully!');
        refetch();
      } else {
        alert(result.error?.message || 'Failed to place order');
      }
    } catch (err) {
      alert('Error placing order');
    } finally {
      setIsOrdering(false);
    }
  };

  const filteredListings = selectedCategory === 'all'
    ? listings
    : listings.filter(l => l.category === selectedCategory);

  if (loading) return <LoadingSpinner message="Loading marketplace..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Category Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredListings.map((listing) => (
          <div
            key={listing.id}
            onClick={() => handleProductClick(listing)}
            className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border
              border-slate-700/30 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer"
          >
            {/* Image Area */}
            <div className="h-40 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center
              justify-center text-6xl">
              {listing.image}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono">{listing.id}</p>
                  <h4 className="text-base font-semibold text-white mt-1">{listing.name}</h4>
                </div>
                <div className="flex gap-1">
                  {listing.verified && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
                      title="Verified">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}
                  {listing.insurance && (
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center"
                      title="Insured">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-xs text-slate-400">
                  {listing.origin}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-xs text-slate-400">
                  {listing.qty}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/30">
                <div>
                  <p className="text-xs text-slate-500">Price</p>
                  <p className="text-lg font-bold text-amber-400">{listing.price}</p>
                </div>
                <button
                  onClick={(e) => handleTradeClick(listing, e)}
                  className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm
                    font-medium hover:bg-amber-500/20 transition-colors"
                >
                  Trade
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && !showTradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 w-full max-w-2xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="relative h-48 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center">
              <span className="text-8xl">{selectedProduct.image}</span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-1">{selectedProduct.id}</p>
                  <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">by {selectedProduct.producerName}</p>
                </div>
                <div className="flex gap-2">
                  {selectedProduct.verified && (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  )}
                  {selectedProduct.insurance && (
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm flex items-center gap-1">
                      <Shield className="w-4 h-4" /> Insured
                    </span>
                  )}
                </div>
              </div>

              <p className="text-slate-400 mb-6">{selectedProduct.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Origin</p>
                  <p className="text-white font-medium">{selectedProduct.origin}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Available Quantity</p>
                  <p className="text-white font-medium">{selectedProduct.qty}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="text-white font-medium capitalize">{selectedProduct.category.toLowerCase()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                <div>
                  <p className="text-sm text-slate-500">Price per unit</p>
                  <p className="text-2xl font-bold text-amber-400">{selectedProduct.price}</p>
                </div>
                <button
                  onClick={() => setShowTradeModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl
                    font-medium hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
                >
                  Trade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Place Order</h3>
              <button
                onClick={() => { setShowTradeModal(false); setSelectedProduct(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl">
                <span className="text-4xl">{selectedProduct.image}</span>
                <div>
                  <h4 className="text-white font-medium">{selectedProduct.name}</h4>
                  <p className="text-sm text-slate-400">{selectedProduct.price}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Quantity ({selectedProduct.unit})</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.quantity || 100}
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Unit Price</span>
                  <span className="text-white">{formatCurrency(selectedProduct.pricePerUnit || 0)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Quantity</span>
                  <span className="text-white">{tradeQuantity} {selectedProduct.unit}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-xl font-bold text-amber-400">
                    {formatCurrency((selectedProduct.pricePerUnit || 0) * tradeQuantity)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowTradeModal(false); setSelectedProduct(null); }}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl
                    font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl
                    font-medium hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  {isOrdering ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </span>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PRODUCERS SCREEN
// ============================================
interface ProducersScreenProps {
  onStartRegistration?: () => void;
}

const ProducersScreen = ({ onStartRegistration }: ProducersScreenProps) => {
  const { data: producerData, loading, error, refetch } = useProducers();

  // Map API data to UI format
  const producersArray = Array.isArray(producerData) ? producerData : producerData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const producers = producersArray.map((p: any) => ({
    id: p.srggEid,
    name: p.name,
    type: p.type,
    location: `${p.city || p.region || ''}, ${p.country}`,
    commodities: (p.commodities as string[]) || ['General'],
    verified: p.verificationStatus === 'VERIFIED',
    rating: p.rating as number,
    volume: formatCurrency((p.totalVolume as number) || 0),
  }));

  const totalProducers = producerData?.meta?.total || producersArray.length;
  const verifiedCount = producers.filter(p => p.verified).length;

  if (loading) return <LoadingSpinner message="Loading producers..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Producers" value={formatNumber(totalProducers)} change="+12 this month" changeType="up" color="amber" />
        <StatCard icon={CheckCircle2} label="Verified" value={formatNumber(verifiedCount)} change={`${totalProducers ? Math.round((verifiedCount / totalProducers) * 100) : 0}%`} changeType="up" color="emerald" />
        <StatCard icon={Globe} label="Countries" value="2" color="blue" />
        <StatCard icon={Wallet} label="Total Volume" value={formatCurrency(producers.reduce((sum, p) => sum + (parseFloat(p.volume.replace(/[^0-9.-]+/g, '')) || 0), 0))} change="+22%" changeType="up" color="purple" />
      </div>

      {/* Producer Registration CTA */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent rounded-2xl 
        border border-amber-500/20 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Register New Producer</h3>
            <p className="text-sm text-slate-400">Onboard farmers, miners, artisans, and cooperatives to the SRGG ecosystem</p>
          </div>
        </div>
        <button
          onClick={onStartRegistration}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500
            to-amber-600 rounded-xl text-sm font-medium text-white hover:from-amber-400
            hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Start Registration
        </button>
      </div>

      {/* Producers Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 overflow-hidden">
        <div className="p-5 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Producer Registry</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search producers..."
                  className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button className="p-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/30">
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Producer</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Location</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Commodities</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Rating</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Volume</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {producers.map((producer) => (
              <tr key={producer.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 
                      flex items-center justify-center text-white font-semibold text-sm">
                      {producer.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{producer.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{producer.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5">
                  <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-xs text-slate-300">
                    {producer.type}
                  </span>
                </td>
                <td className="py-4 px-5 text-sm text-slate-400">{producer.location}</td>
                <td className="py-4 px-5">
                  <div className="flex gap-1 flex-wrap">
                    {producer.commodities.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-xs text-amber-400">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-white">{producer.rating}</span>
                    <span className="text-amber-400">★</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-sm font-medium text-white">{producer.volume}</td>
                <td className="py-4 px-5">
                  {producer.verified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                      bg-emerald-500/10 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </td>
                <td className="py-4 px-5 text-right">
                  <button className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// TOKENIZATION SCREEN
// ============================================
const TokenizationScreen = () => {
  const { data: tokenData, loading, error, refetch } = useTokens();
  const { mutate: mintToken, loading: minting } = useMintToken();
  const { data: listings } = useListings({ status: 'ACTIVE' });
  const [showMintModal, setShowMintModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');
  const [tokenType, setTokenType] = useState('NFT');
  const [mintError, setMintError] = useState('');

  const handleMintToken = async () => {
    if (!selectedListing) {
      setMintError('Please select a listing to tokenize');
      return;
    }
    setMintError('');
    const result = await mintToken({ listingId: selectedListing, tokenType });
    if (result.success) {
      setShowMintModal(false);
      setSelectedListing('');
      refetch();
    } else {
      setMintError(result.error?.message || 'Failed to mint token');
    }
  };

  const steps = [
    { id: 1, label: 'Asset Selection', status: 'completed' },
    { id: 2, label: 'Validation', status: 'current' },
    { id: 3, label: 'Insurance', status: 'pending' },
    { id: 4, label: 'Tokenization', status: 'pending' },
    { id: 5, label: 'Marketplace', status: 'pending' },
  ];

  // Map API data to UI format
  const tokensArray = Array.isArray(tokenData) ? tokenData : tokenData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens = tokensArray.map((t: any) => ({
    id: (t.id as string).slice(0, 8).toUpperCase(),
    asset: t.asset,
    value: t.value,
    tokens: t.tokens,
    status: (t.status as string).toLowerCase(),
    blockchain: t.blockchain,
  }));

  const totalTokens = tokenData?.meta?.total || tokensArray.length;
  const mintedTokens = tokens.filter(t => t.status === 'minted').length;

  if (loading) return <LoadingSpinner message="Loading tokens..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Coins} label="Total Tokens" value={formatNumber(totalTokens)} change="+12" changeType="up" color="amber" />
        <StatCard icon={Database} label="Minted" value={formatNumber(mintedTokens)} change="+5" changeType="up" color="emerald" />
        <StatCard icon={Lock} label="Pending" value={formatNumber(totalTokens - mintedTokens)} color="blue" />
        <StatCard icon={Activity} label="Blockchain" value="Polygon" color="purple" />
      </div>

      {/* Tokenization Workflow */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Tokenization Workflow</h3>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm
                  ${step.status === 'completed' ? 'bg-emerald-500 text-white' :
                    step.status === 'current' ? 'bg-amber-500 text-white ring-4 ring-amber-500/20' :
                    'bg-slate-700 text-slate-400'}`}>
                  {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                </div>
                <p className={`text-xs mt-2 font-medium
                  ${step.status === 'current' ? 'text-amber-400' : 
                    step.status === 'completed' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  step.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="bg-slate-900/50 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Validation in Progress</h4>
              <p className="text-sm text-slate-400">Asset: Premium Cocoa Beans - Lot #2847</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Quality Test</span>
              </div>
              <p className="text-xs text-slate-500">Grade A - 98% purity</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Origin Verified</span>
              </div>
              <p className="text-xs text-slate-500">Kumasi, Ghana - GPS confirmed</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Lab Analysis</span>
              </div>
              <p className="text-xs text-slate-500">In progress - Est. 2 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Registry */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Token Registry</h3>
          <button
            onClick={() => setShowMintModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400
            rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            Mint Token
          </button>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Token ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Asset</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Value</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total Tokens</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Blockchain</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-amber-400">{token.id}</td>
                <td className="py-3 px-4 text-sm text-white">{token.asset}</td>
                <td className="py-3 px-4 text-sm font-medium text-white">{token.value}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{token.tokens}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{token.blockchain}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${token.status === 'minted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {token.status === 'minted' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mint Token Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Mint New Token</h3>
              <button onClick={() => setShowMintModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {mintError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {mintError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Listing *</label>
                <select
                  value={selectedListing}
                  onChange={(e) => setSelectedListing(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Choose a listing...</option>
                  {(Array.isArray(listings) ? listings : listings?.data || []).map((listing: { id: string; title: string }) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Token Type</label>
                <select
                  value={tokenType}
                  onChange={(e) => setTokenType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="NFT">NFT (Non-Fungible)</option>
                  <option value="FUNGIBLE">Fungible Token</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMintModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMintToken}
                  disabled={minting}
                  className="flex-1 px-4 py-3 bg-amber-500 text-slate-900 rounded-xl font-medium hover:bg-amber-400 disabled:opacity-50"
                >
                  {minting ? 'Minting...' : 'Mint Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// VALIDATION SCREEN
// ============================================
const ValidationScreen = () => {
  const { data: validationData, loading, error, refetch } = useValidations();
  const { mutate: createValidation, loading: creating } = useCreateValidation();
  const { data: listings } = useListings({ status: 'ACTIVE' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'LAB_ANALYSIS',
    listingId: '',
    priority: 'MEDIUM',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const handleCreateValidation = async () => {
    if (!formData.listingId) {
      setFormError('Please select a listing');
      return;
    }
    setFormError('');
    const result = await createValidation(formData);
    if (result.success) {
      setShowAddModal(false);
      setFormData({ type: 'LAB_ANALYSIS', listingId: '', priority: 'MEDIUM', notes: '' });
      refetch();
    } else {
      setFormError(result.error?.message || 'Failed to create validation');
    }
  };

  // Map API data to UI format
  const validationsArray = Array.isArray(validationData) ? validationData : validationData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validationQueue = validationsArray.map((v: any) => ({
    id: v.validationId,
    type: (v.type as string).replace('_', ' '),
    asset: v.assetName,
    producer: String((v.producer as Record<string, unknown>)?.name || 'Unknown'),
    priority: (v.priority as string).toLowerCase(),
    status: (v.status as string).toLowerCase().replace('_', ' '),
    eta: v.eta || '-',
  }));

  const totalValidations = validationData?.meta?.total || validationsArray.length;
  const pendingCount = validationQueue.filter(v => v.status === 'pending' || v.status === 'in progress').length;
  const completedCount = validationQueue.filter(v => v.status === 'completed').length;

  if (loading) return <LoadingSpinner message="Loading validations..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={ClipboardCheck} label="Total Validations" value={formatNumber(totalValidations)} color="amber" />
        <StatCard icon={Microscope} label="Pending" value={formatNumber(pendingCount)} changeType="up" color="emerald" />
        <StatCard icon={Ship} label="In Progress" value={formatNumber(validationQueue.filter(v => v.status === 'in progress').length)} color="blue" />
        <StatCard icon={CheckCircle2} label="Completed" value={formatNumber(completedCount)} change="+15%" changeType="up" color="purple" />
      </div>

      {/* Validation Types */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Microscope, label: 'Lab Analysis', count: 15, color: 'emerald' },
          { icon: Ship, label: 'Port Inspection', count: 8, color: 'blue' },
          { icon: MapPin, label: 'Origin Verification', count: 12, color: 'amber' },
          { icon: TreePine, label: 'Carbon Audit', count: 6, color: 'purple' },
        ].map((type, i) => {
          const Icon = type.icon;
          return (
            <button key={i} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 
              p-5 hover:border-amber-500/30 transition-all text-left group">
              <Icon className={`w-8 h-8 text-${type.color}-400 mb-3`} />
              <h4 className="text-base font-semibold text-white">{type.label}</h4>
              <p className="text-2xl font-bold text-white mt-2">{type.count}</p>
              <p className="text-xs text-slate-500">pending</p>
            </button>
          );
        })}
      </div>

      {/* Validation Queue */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Validation Queue</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400
            rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            New Validation
          </button>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Asset</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Producer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">ETA</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {validationQueue.map((item) => (
              <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-amber-400">{item.id}</td>
                <td className="py-3 px-4 text-sm text-white">{item.type}</td>
                <td className="py-3 px-4 text-sm text-white">{item.asset}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{item.producer}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium
                    ${item.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                      item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-700/50 text-slate-400'}`}>
                    {item.priority.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-700/50 text-slate-400'}`}>
                    {item.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                     item.status === 'in_progress' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                     <Clock className="w-3 h-3" />}
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-400">{item.eta}</td>
                <td className="py-3 px-4 text-right">
                  <button className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Validation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Request New Validation</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Validation Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="LAB_ANALYSIS">Lab Analysis</option>
                  <option value="PORT_INSPECTION">Port Inspection</option>
                  <option value="ORIGIN_VERIFICATION">Origin Verification</option>
                  <option value="CARBON_AUDIT">Carbon Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Listing *</label>
                <select
                  value={formData.listingId}
                  onChange={(e) => setFormData({ ...formData, listingId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Choose a listing...</option>
                  {(Array.isArray(listings) ? listings : listings?.data || []).map((listing: { id: string; title: string }) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateValidation}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-amber-500 text-slate-900 rounded-xl font-medium hover:bg-amber-400 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// INSURANCE SCREEN
// ============================================
const InsuranceScreen = () => {
  const { data: insuranceData, loading, error, refetch } = useInsurancePolicies();
  const { mutate: createPolicy, loading: creating } = useCreateInsurancePolicy();
  const { data: listings } = useListings({ status: 'ACTIVE' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CROP',
    listingId: '',
    coverageAmount: '',
    startDate: '',
    endDate: '',
  });
  const [formError, setFormError] = useState('');

  const handleCreatePolicy = async () => {
    if (!formData.listingId || !formData.coverageAmount) {
      setFormError('Please fill in all required fields');
      return;
    }
    setFormError('');
    const result = await createPolicy({
      type: formData.type,
      assetId: formData.listingId,
      assetType: 'LISTING',
      coverageAmount: parseFloat(formData.coverageAmount),
      startDate: formData.startDate || new Date().toISOString(),
      endDate: formData.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (result.success) {
      setShowAddModal(false);
      setFormData({ type: 'CROP', listingId: '', coverageAmount: '', startDate: '', endDate: '' });
      refetch();
    } else {
      setFormError(result.error?.message || 'Failed to create policy');
    }
  };

  // Map API data to UI format
  const insuranceArray = Array.isArray(insuranceData) ? insuranceData : insuranceData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const policies = insuranceArray.map((p: any) => ({
    id: (p.id as string).slice(0, 8).toUpperCase(),
    type: p.type,
    asset: p.asset,
    coverage: p.coverage,
    premium: p.premium,
    provider: p.provider,
    status: (p.status as string).toLowerCase(),
  }));

  const totalPolicies = insuranceData?.meta?.total || insuranceArray.length;
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const totalCoverage = policies.reduce((sum, p) => {
    const value = parseFloat(p.coverage.replace(/[^0-9.-]+/g, '')) || 0;
    return sum + value;
  }, 0);

  if (loading) return <LoadingSpinner message="Loading insurance policies..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Total Coverage" value={formatCurrency(totalCoverage)} change="+$2.1M" changeType="up" color="amber" />
        <StatCard icon={FileText} label="Active Policies" value={formatNumber(activePolicies)} change="+2" changeType="up" color="emerald" />
        <StatCard icon={AlertTriangle} label="Pending" value={formatNumber(totalPolicies - activePolicies)} color="red" />
        <StatCard icon={Landmark} label="Total Policies" value={formatNumber(totalPolicies)} color="blue" />
      </div>

      {/* Lloyd's Integration Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-blue-600/5 to-transparent rounded-2xl 
        border border-blue-500/20 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <Landmark className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Lloyd's of London Integration</h3>
            <p className="text-sm text-slate-400">Enterprise-grade insurance coverage for all SRGG assets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
            ✓ Connected
          </span>
        </div>
      </div>

      {/* Insurance Types */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Wheat, label: 'Crop Insurance', desc: 'Parametric coverage' },
          { icon: Ship, label: 'Maritime', desc: 'Shipping & cargo' },
          { icon: Factory, label: 'Supply Chain', desc: 'Delay coverage' },
          { icon: TreePine, label: 'Carbon Credits', desc: 'Authenticity protection' },
        ].map((type, i) => {
          const Icon = type.icon;
          return (
            <div key={i} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 
              p-5 hover:border-blue-500/30 transition-all cursor-pointer group">
              <Icon className="w-8 h-8 text-blue-400 mb-3" />
              <h4 className="text-base font-semibold text-white">{type.label}</h4>
              <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
              <button className="mt-4 text-sm text-blue-400 font-medium group-hover:text-blue-300">
                Get Quote →
              </button>
            </div>
          );
        })}
      </div>

      {/* Policies Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Policies</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400
            rounded-xl text-sm font-medium hover:bg-blue-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Policy ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Asset</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Coverage</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Premium</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Provider</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-blue-400">{policy.id}</td>
                <td className="py-3 px-4 text-sm text-white">{policy.type}</td>
                <td className="py-3 px-4 text-sm text-white">{policy.asset}</td>
                <td className="py-3 px-4 text-sm font-medium text-white">{policy.coverage}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{policy.premium}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{policy.provider}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${policy.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {policy.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Policy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create Insurance Policy</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Insurance Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="CROP">Crop Insurance</option>
                  <option value="SHIPPING">Maritime/Shipping</option>
                  <option value="MINERAL">Mineral Coverage</option>
                  <option value="CARBON">Carbon Credits</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Asset *</label>
                <select
                  value={formData.listingId}
                  onChange={(e) => setFormData({ ...formData, listingId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Choose a listing...</option>
                  {(Array.isArray(listings) ? listings : listings?.data || []).map((listing: { id: string; title: string }) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Coverage Amount (USD) *</label>
                <input
                  type="number"
                  value={formData.coverageAmount}
                  onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., 100000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePolicy}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// HEDGING SCREEN
// ============================================
const HedgingScreen = () => {
  const { data: hedgeData, loading, error, refetch } = useHedgePositions();
  const { mutate: createHedge, loading: creating } = useCreateHedgePosition();
  const [formData, setFormData] = useState({
    commodity: 'Cocoa Futures',
    type: 'FUTURES',
    quantity: '',
    strikePrice: '',
    direction: 'LONG',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleExecuteHedge = async () => {
    if (!formData.quantity || !formData.strikePrice) {
      setFormError('Please fill in quantity and strike price');
      return;
    }
    setFormError('');
    setFormSuccess('');
    const result = await createHedge({
      type: formData.type,
      commodity: formData.commodity,
      quantity: parseFloat(formData.quantity),
      unit: 'MT',
      strikePrice: parseFloat(formData.strikePrice),
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      direction: formData.direction,
    });
    if (result.success) {
      setFormSuccess('Hedge position created successfully!');
      setFormData({ commodity: 'Cocoa Futures', type: 'FUTURES', quantity: '', strikePrice: '', direction: 'LONG' });
      refetch();
      setTimeout(() => setFormSuccess(''), 3000);
    } else {
      setFormError(result.error?.message || 'Failed to create hedge position');
    }
  };

  // Map API data to UI format
  const hedgeArray = Array.isArray(hedgeData) ? hedgeData : hedgeData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positions = hedgeArray.map((h: any) => ({
    id: (h.id as string).slice(0, 8).toUpperCase(),
    commodity: h.commodity,
    type: h.type,
    qty: h.qty,
    strike: h.strike,
    expiry: h.expiry,
    pnl: h.pnl,
    status: (h.status as string).toLowerCase(),
  }));

  const totalPositions = hedgeData?.meta?.total || hedgeArray.length;
  const openPositions = positions.filter(p => p.status === 'open').length;
  const totalPnl = positions.reduce((sum, p) => {
    const value = parseFloat(p.pnl.replace(/[^0-9.-]+/g, '')) || 0;
    return sum + value;
  }, 0);

  if (loading) return <LoadingSpinner message="Loading hedge positions..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Positions" value={formatNumber(totalPositions)} change="+3" changeType="up" color="amber" />
        <StatCard icon={Target} label="Open Positions" value={formatNumber(openPositions)} change="+2" changeType="up" color="emerald" />
        <StatCard icon={Activity} label="Total P&L" value={`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`} change={totalPnl >= 0 ? "+12%" : "-5%"} changeType={totalPnl >= 0 ? "up" : "down"} color="blue" />
        <StatCard icon={Scale} label="Exchange" value="CME" color="purple" />
      </div>

      {/* CME Integration */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-transparent rounded-2xl 
        border border-emerald-500/20 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">CME Integration</h3>
            <p className="text-sm text-slate-400">Chicago Mercantile Exchange - Live futures & options</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
            ✓ Live Feed
          </span>
          <button className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm 
            font-medium hover:bg-emerald-500/20 transition-colors">
            Open Terminal
          </button>
        </div>
      </div>

      {/* Quick Trade Panel */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Hedge</h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              {formSuccess}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Commodity</label>
              <select
                value={formData.commodity}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                text-white focus:outline-none focus:border-amber-500/50">
                <option value="Cocoa Futures">Cocoa Futures</option>
                <option value="Gold Options">Gold Options</option>
                <option value="Maize Futures">Maize Futures</option>
                <option value="Coffee Futures">Coffee Futures</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Position Type</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                text-white focus:outline-none focus:border-amber-500/50">
                <option value="LONG">Long (Buy)</option>
                <option value="SHORT">Short (Sell)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Quantity (MT)</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g., 100"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                  text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Strike Price ($/MT)</label>
              <input
                type="number"
                value={formData.strikePrice}
                onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
                placeholder="e.g., 2400"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                  text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <button
            onClick={handleExecuteHedge}
            disabled={creating}
            className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600
            rounded-xl text-sm font-medium text-white hover:from-amber-400 hover:to-amber-500
            transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
            {creating ? 'Executing...' : 'Execute Hedge Position'}
          </button>
        </div>

        {/* Risk Metrics */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <p className="text-xs text-slate-500">Value at Risk (VaR)</p>
              <p className="text-xl font-bold text-white mt-1">$125,000</p>
              <p className="text-xs text-slate-500 mt-1">95% confidence, 1-day</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <p className="text-xs text-slate-500">Portfolio Beta</p>
              <p className="text-xl font-bold text-white mt-1">0.85</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <p className="text-xs text-slate-500">Sharpe Ratio</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">1.42</p>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Open Positions</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Position ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Commodity</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Quantity</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Strike</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Expiry</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">P&L</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-amber-400">{pos.id}</td>
                <td className="py-3 px-4 text-sm text-white">{pos.commodity}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium
                    ${pos.type === 'Long' ? 'bg-emerald-500/10 text-emerald-400' :
                      pos.type === 'Short' ? 'bg-red-500/10 text-red-400' :
                      'bg-blue-500/10 text-blue-400'}`}>
                    {pos.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-400">{pos.qty}</td>
                <td className="py-3 px-4 text-sm text-white">{pos.strike}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{pos.expiry}</td>
                <td className={`py-3 px-4 text-sm font-medium ${pos.pnl.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pos.pnl}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${pos.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                    {pos.status === 'open' ? <Activity className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {pos.status.charAt(0).toUpperCase() + pos.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// LOGISTICS SCREEN
// ============================================
const LogisticsScreen = () => {
  const { data: shipmentData, loading, error, refetch } = useShipments();
  const { mutate: createShipment, loading: creating } = useCreateShipment();
  const { data: listings } = useListings({ status: 'ACTIVE' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    listingId: '',
    origin: 'Port of Tema, Ghana',
    destination: 'Rotterdam, Netherlands',
    vessel: '',
    eta: '',
  });
  const [formError, setFormError] = useState('');

  const handleCreateShipment = async () => {
    if (!formData.listingId || !formData.vessel) {
      setFormError('Please fill in all required fields');
      return;
    }
    setFormError('');
    const result = await createShipment({
      listingId: formData.listingId,
      origin: formData.origin,
      destination: formData.destination,
      vessel: formData.vessel,
      eta: formData.eta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (result.success) {
      setShowAddModal(false);
      setFormData({ listingId: '', origin: 'Port of Tema, Ghana', destination: 'Rotterdam, Netherlands', vessel: '', eta: '' });
      refetch();
    } else {
      setFormError(result.error?.message || 'Failed to create shipment');
    }
  };

  // Map API data to UI format
  const shipmentArray = Array.isArray(shipmentData) ? shipmentData : shipmentData?.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shipments = shipmentArray.map((s: any) => ({
    id: (s.id as string).slice(0, 8).toUpperCase(),
    cargo: s.cargo,
    origin: s.origin,
    dest: s.dest,
    vessel: s.vessel,
    status: (s.status as string).toLowerCase().replace('_', ' '),
    eta: s.eta,
  }));

  const totalShipments = shipmentData?.meta?.total || shipmentArray.length;
  const inTransit = shipments.filter(s => s.status === 'in transit').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;

  if (loading) return <LoadingSpinner message="Loading shipments..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Ship} label="Total Shipments" value={formatNumber(totalShipments)} change="+3" changeType="up" color="amber" />
        <StatCard icon={Container} label="In Transit" value={formatNumber(inTransit)} color="emerald" />
        <StatCard icon={Truck} label="Loading" value={formatNumber(shipments.filter(s => s.status === 'loading').length)} color="blue" />
        <StatCard icon={CheckCircle2} label="Delivered" value={formatNumber(delivered)} change="+10%" changeType="up" color="purple" />
      </div>

      {/* Port Gateways */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Port of Tema', location: 'Ghana', status: 'operational', containers: 145, congestion: 'low' },
          { name: 'Santo Domingo Port', location: 'Dominican Republic', status: 'operational', containers: 89, congestion: 'medium' },
          { name: 'Takoradi Port', location: 'Ghana', status: 'operational', containers: 62, congestion: 'low' },
        ].map((port, i) => (
          <div key={i} className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Anchor className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">{port.name}</h4>
                  <p className="text-xs text-slate-500">{port.location}</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">
                {port.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-slate-900/50 rounded-xl">
                <p className="text-xs text-slate-500">Containers</p>
                <p className="text-lg font-bold text-white">{port.containers}</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl">
                <p className="text-xs text-slate-500">Congestion</p>
                <p className={`text-lg font-bold ${port.congestion === 'low' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {port.congestion.charAt(0).toUpperCase() + port.congestion.slice(1)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shipments Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Shipments</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400
            rounded-xl text-sm font-medium hover:bg-blue-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            New Shipment
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Shipment ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Cargo</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Origin</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Destination</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Vessel</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">ETA</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((ship) => (
              <tr key={ship.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-blue-400">{ship.id}</td>
                <td className="py-3 px-4 text-sm text-white">{ship.cargo}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{ship.origin}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{ship.dest}</td>
                <td className="py-3 px-4 text-sm text-white">{ship.vessel}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                    ${ship.status === 'in_transit' ? 'bg-blue-500/10 text-blue-400' :
                      ship.status === 'loading' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-purple-500/10 text-purple-400'}`}>
                    {ship.status === 'in_transit' ? <Ship className="w-3 h-3" /> :
                     ship.status === 'loading' ? <Boxes className="w-3 h-3" /> :
                     <FileCheck className="w-3 h-3" />}
                    {ship.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-400">{ship.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Shipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Shipment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Cargo (Listing) *</label>
                <select
                  value={formData.listingId}
                  onChange={(e) => setFormData({ ...formData, listingId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Choose a listing...</option>
                  {(Array.isArray(listings) ? listings : listings?.data || []).map((listing: { id: string; title: string }) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Origin Port</label>
                <select
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Port of Tema, Ghana">Port of Tema, Ghana</option>
                  <option value="Takoradi Port, Ghana">Takoradi Port, Ghana</option>
                  <option value="Santo Domingo Port, DR">Santo Domingo Port, DR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Destination</label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., Rotterdam, Netherlands"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Vessel Name *</label>
                <input
                  type="text"
                  value={formData.vessel}
                  onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., MV Atlantic Star"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Estimated Arrival</label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateShipment}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ANALYTICS SCREEN
// ============================================
const AnalyticsScreen = () => {
  const { data: analyticsData, loading, error, refetch } = useAnalytics();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisComplete(false);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetch();
    setAnalyzing(false);
    setAnalysisComplete(true);
    setTimeout(() => setAnalysisComplete(false), 3000);
  };

  if (loading) return <LoadingSpinner message="Loading analytics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const overview = analyticsData?.overview;
  const aiInsights = analyticsData?.aiInsights || [];
  const riskMetrics = analyticsData?.riskMetrics;

  return (
    <div className="p-6 space-y-6">
      {/* AI Integration Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-transparent rounded-2xl 
        border border-purple-500/20 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Quantum AI Analytics</h3>
            <p className="text-sm text-slate-400">AI-powered market predictions and risk analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analysisComplete && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
              Analysis Complete
            </span>
          )}
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl text-sm
            font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 flex items-center gap-2">
            {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Active Producers" value={formatNumber(overview?.producers?.total || 0)} change={`${overview?.producers?.verified || 0} verified`} changeType="up" color="purple" />
        <StatCard icon={Activity} label="Active Listings" value={formatNumber(overview?.listings?.active || 0)} change={`of ${overview?.listings?.total || 0}`} changeType="up" color="amber" />
        <StatCard icon={Target} label="Open Positions" value={formatNumber(overview?.hedging?.openPositions || 0)} color="red" />
        <StatCard icon={Award} label="Revenue" value={formatCurrency(overview?.revenue || 0)} color="emerald" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Commodity Flow */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Commodity Flow Analysis</h3>
          <div className="h-64 flex items-end justify-around gap-4 px-4">
            {[
              { label: 'Cocoa', value: 85, color: 'amber' },
              { label: 'Gold', value: 72, color: 'yellow' },
              { label: 'Coffee', value: 58, color: 'emerald' },
              { label: 'Maize', value: 45, color: 'blue' },
              { label: 'Carbon', value: 38, color: 'purple' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className={`w-full bg-gradient-to-t from-${item.color}-500/80 to-${item.color}-400/40 
                    rounded-t-lg hover:from-${item.color}-400 transition-all cursor-pointer`}
                  style={{ height: `${item.value}%` }}
                />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Heatmap */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Heatmap by Region</h3>
          <div className="grid grid-cols-4 gap-2">
            {(riskMetrics?.regions || [
              { region: 'Ghana', weather: 'low', market: 'medium', supply: 'low', logistics: 'low' },
              { region: 'DR', weather: 'medium', market: 'low', supply: 'low', logistics: 'medium' },
              { region: 'Nigeria', weather: 'high', market: 'medium', supply: 'medium', logistics: 'high' },
              { region: 'Kenya', weather: 'low', market: 'low', supply: 'low', logistics: 'medium' },
            ]).map((row, i) => (
              <React.Fragment key={i}>
                <div className="text-sm text-white font-medium py-2">{row.region}</div>
                {(['weather', 'market', 'supply', 'logistics'] as const).map((key) => (
                  <div
                    key={key}
                    className={`p-2 rounded-lg text-center text-xs font-medium
                      ${row[key] === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
                        row[key] === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'}`}
                  >
                    {row[key].toUpperCase()}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/50"></span> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/50"></span> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/50"></span> High</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">AI-Generated Insights</h3>
        <div className="grid grid-cols-3 gap-4">
          {(aiInsights.length > 0 ? aiInsights : [
            { title: 'Cocoa Price Prediction', insight: 'Expected 8% increase in Q1 2025 due to supply constraints in Ivory Coast', confidence: 92, type: 'bullish' },
            { title: 'Weather Alert - Ghana', insight: 'Dry season may affect maize yields in Northern region. Consider hedging positions.', confidence: 87, type: 'warning' },
            { title: 'Carbon Credit Opportunity', insight: 'Mangrove restoration projects showing 2.3x ROI. High demand from EU buyers.', confidence: 95, type: 'opportunity' },
          ]).map((item, i) => (
            <div key={i} className={`p-4 rounded-xl border
              ${item.type === 'bullish' ? 'bg-emerald-500/5 border-emerald-500/20' :
                item.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-blue-500/5 border-blue-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${item.type === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'}`}>
                  {item.confidence}% confidence
                </span>
              </div>
              <p className="text-sm text-slate-400">{item.insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SETTINGS SCREEN
// ============================================
const SettingsScreen = () => {
  const { data: userSettings, loading, error, refetch } = useSettings();
  const { mutate: updateSettings, loading: updating } = useUpdateSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (userSettings) {
      setName(userSettings.name || '');
      setPhone(userSettings.phone || '');
    }
  }, [userSettings]);

  const handleSave = async () => {
    await updateSettings({ name, phone });
    refetch();
  };

  if (loading) return <LoadingSpinner message="Loading settings..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Profile Settings */}
        <div className="col-span-2 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Profile Settings</h3>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 
              flex items-center justify-center text-white font-bold text-2xl">
              SP
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                      text-white focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
                  <input type="email" value={userSettings?.email || ''} disabled
                    className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl
                      text-slate-400" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Role</label>
                  <input type="text" value={userSettings?.role || 'User'} disabled
                    className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl
                      text-slate-400" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Tenant</label>
                  <input type="text" value={userSettings?.tenant?.name || 'SRGG'} disabled
                    className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl
                      text-slate-400" />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={updating}
                className="px-6 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm
                font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
          <div className="space-y-4">
            <button className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl
              hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-white">Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl
              hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-white">Biometric Login</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">Enabled</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl
              hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-white">Two-Factor Auth</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">Enabled</span>
            </button>
          </div>
        </div>
      </div>

      {/* Integration Settings */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">External Integrations</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: "Lloyd's of London", status: 'connected', icon: Landmark },
            { name: 'CME Exchange', status: 'connected', icon: BarChart3 },
            { name: 'Blockchain Node', status: 'connected', icon: Database },
            { name: 'IoT Gateway', status: 'connected', icon: Zap },
          ].map((integration, i) => {
            const Icon = integration.icon;
            return (
              <div key={i} className="p-4 bg-slate-900/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-6 h-6 text-slate-400" />
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                    {integration.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-white">{integration.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMMODITIES SCREEN
// ============================================
const CommoditiesScreen = () => {
  const { data: commodityData, loading, error, refetch } = useCommodities();
  const { mutate: createCommodity, loading: creating } = useCreateCommodity();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'AGRICULTURE',
    unit: 'kg',
    hsCode: '',
    description: '',
  });
  const [formError, setFormError] = useState('');

  // Map API data to UI format
  const commodities = commodityData?.map((c, i) => ({
    id: c.id.slice(0, 8).toUpperCase(),
    name: c.name,
    category: c.category,
    hsCode: c.hsCode || 'N/A',
    origin: 'Ghana/DR',
    totalVolume: '-',
    avgPrice: '-',
  })) || [];

  const totalCommodities = commodities.length;
  const agricultureCount = commodities.filter(c => c.category === 'AGRICULTURE').length;
  const mineralsCount = commodities.filter(c => c.category === 'MINERALS').length;
  const environmentalCount = commodities.filter(c => c.category === 'ENVIRONMENTAL').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Commodity name is required');
      return;
    }

    const result = await createCommodity(formData);
    if (result.success) {
      setShowAddModal(false);
      setFormData({ name: '', category: 'AGRICULTURE', unit: 'kg', hsCode: '', description: '' });
      refetch();
    } else {
      setFormError(result.error?.message || 'Failed to create commodity');
    }
  };

  if (loading) return <LoadingSpinner message="Loading commodities..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Commodities" value={formatNumber(totalCommodities)} change="+2" changeType="up" color="amber" />
        <StatCard icon={Wheat} label="Agriculture" value={formatNumber(agricultureCount)} color="emerald" />
        <StatCard icon={Gem} label="Minerals" value={formatNumber(mineralsCount)} color="blue" />
        <StatCard icon={TreePine} label="Environmental" value={formatNumber(environmentalCount)} color="purple" />
      </div>

      {/* Commodity Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Commodity Registry</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400
            rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            Add Commodity
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Category</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">HS Code</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Origin</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total Volume</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {commodities.map((com) => (
              <tr key={com.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-sm font-mono text-amber-400">{com.id}</td>
                <td className="py-3 px-4 text-sm text-white">{com.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium
                    ${com.category === 'AGRICULTURE' ? 'bg-emerald-500/10 text-emerald-400' :
                      com.category === 'MINERALS' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-purple-500/10 text-purple-400'}`}>
                    {com.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-mono text-slate-400">{com.hsCode}</td>
                <td className="py-3 px-4 text-sm text-slate-400">{com.origin}</td>
                <td className="py-3 px-4 text-sm text-white">{com.totalVolume}</td>
                <td className="py-3 px-4 text-sm font-medium text-white">{com.avgPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Commodity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Add New Commodity</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  placeholder="e.g., Cocoa Beans"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="AGRICULTURE">Agriculture</option>
                  <option value="MINERALS">Minerals</option>
                  <option value="ENVIRONMENTAL">Environmental</option>
                  <option value="CULTURAL">Cultural</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Unit *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="tonnes">Tonnes</option>
                  <option value="lbs">Pounds (lbs)</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="bags">Bags</option>
                  <option value="units">Units</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">HS Code</label>
                <input
                  type="text"
                  value={formData.hsCode}
                  onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  placeholder="e.g., 1801.00"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl
                    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 text-slate-300 rounded-xl
                    font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-amber-500 text-slate-900 rounded-xl
                    font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Add Commodity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function SRGGMarketplace() {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProducerRegistration, setShowProducerRegistration] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Invalid user data, redirect to login
        router.push('/login');
      }
    }
  }, [router]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Handle opening producer registration
  const handleStartRegistration = () => {
    setShowProducerRegistration(true);
  };

  const screenTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Welcome back' },
    marketplace: { title: 'Marketplace', subtitle: 'Browse and trade tokenized assets' },
    producers: { title: 'Producer Registry', subtitle: 'Manage farmers, miners, and artisans' },
    commodities: { title: 'Commodities', subtitle: 'Commodity master data management' },
    tokenization: { title: 'Tokenization', subtitle: 'Asset tokenization and blockchain registry' },
    validation: { title: 'Validation Center', subtitle: 'Lab tests, inspections, and certifications' },
    insurance: { title: 'Insurance', subtitle: "Lloyd's integrated coverage" },
    hedging: { title: 'Hedging & Futures', subtitle: 'CME integration and risk management' },
    logistics: { title: 'Logistics', subtitle: 'Port operations and shipment tracking' },
    analytics: { title: 'Analytics', subtitle: 'Quantum AI insights and reporting' },
    settings: { title: 'Settings', subtitle: 'Platform configuration' },
  };

  const { title, subtitle } = screenTitles[activeScreen] || screenTitles.dashboard;

  // Render the active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'marketplace':
        return <MarketplaceScreen />;
      case 'producers':
        return <ProducersScreen onStartRegistration={handleStartRegistration} />;
      case 'commodities':
        return <CommoditiesScreen />;
      case 'tokenization':
        return <TokenizationScreen />;
      case 'validation':
        return <ValidationScreen />;
      case 'insurance':
        return <InsuranceScreen />;
      case 'hedging':
        return <HedgingScreen />;
      case 'logistics':
        return <LogisticsScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(212, 168, 83, 0.03) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(37, 99, 235, 0.03) 0%, transparent 50%)`
        }} />
      </div>

      <Sidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        onLogout={handleLogout}
      />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header
          title={title}
          subtitle={subtitle}
          userName={user?.name?.split(' ')[0]}
          onNewListing={handleStartRegistration}
        />
        {renderScreen()}
      </main>

      {/* Producer Registration Modal */}
      {showProducerRegistration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProducerRegistration(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-800 text-slate-400
                hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <ProducerRegistrationFlow />
          </div>
        </div>
      )}
    </div>
  );
}
