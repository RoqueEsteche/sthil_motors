/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  ClipboardList, 
  LogOut, 
  LogIn,
  Settings,
  Menu,
  X,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  Truck
} from 'lucide-react';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Views
import Dashboard from './components/Dashboard';
import OrderView from './components/OrderView';
import MachineView from './components/MachineView';
import CustomerView from './components/CustomerView';
import InventoryView from './components/InventoryView';
import SupplierView from './components/SupplierView';
import MechanicView from './components/MechanicView';
import { ShoppingCart, Hammer } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">CleanFix Workshop</h1>
          <p className="text-slate-500 mb-8">Gestión profesional para talleres de maquinaria de limpieza.</p>
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Acceder con Google
          </button>
          <p className="mt-6 text-xs text-slate-400">
            Solo personal autorizado puede acceder al sistema.
          </p>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mechanic', label: 'Taller (Diagnóstico)', icon: Hammer },
    { id: 'orders', label: 'Órdenes (OT)', icon: ClipboardList },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'machines', label: 'Maquinaria', icon: Wrench },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 sticky top-0 h-screen",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="min-w-[40px] h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg truncate tracking-tight">Stihl Motors</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                activeView === item.id 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-6 h-6", activeView === item.id ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600")} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* ... (user profile section) */}
        <div className="p-4 border-t border-slate-100">
          <div className={cn("flex items-center gap-3 px-2 py-2", !isSidebarOpen && "justify-center")}>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-slate-100"
              referrerPolicy="no-referrer"
            />
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-6 h-6" />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar en Stihl Motors..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-orange-500 rounded-xl text-sm w-64 transition-all outline-none"
              />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'mechanic' && <MechanicView />}
              {activeView === 'orders' && <OrderView />}
              {activeView === 'inventory' && <InventoryView />}
              {activeView === 'machines' && <MachineView />}
              {activeView === 'customers' && <CustomerView />}
              {activeView === 'suppliers' && <SupplierView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
