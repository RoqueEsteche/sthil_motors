import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ClipboardList, 
  Wrench, 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    inRepair: 0,
    totalCustomers: 0,
    lowStock: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    // Stats listeners
    const unsubOrders = onSnapshot(collection(db, 'serviceOrders'), (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        activeOrders: docs.filter(d => d.status !== 'delivered').length,
        inRepair: docs.filter(d => d.status === 'in-repair').length
      }));
    });

    const unsubParts = onSnapshot(collection(db, 'parts'), (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        lowStock: docs.filter((d: any) => d.stock <= d.minStock).length
      }));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomers: snapshot.size }));
    });

    const qRecent = query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'), limit(5));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubParts();
      unsubCustomers();
      unsubRecent();
    };
  }, []);

  const chartData = [
    { name: 'Pendientes', value: stats.activeOrders - stats.inRepair, color: '#94a3b8' },
    { name: 'En Reparación', value: stats.inRepair, color: '#f97316' }, // Orange for Stihl
    { name: 'Clientes', value: stats.totalCustomers, color: '#3b82f6' },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control - Stihl Motors</h1>
        <p className="text-slate-500 text-sm">Resumen operativo del taller central.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={ClipboardList} 
          label="Órdenes Activas" 
          value={stats.activeOrders} 
          color="orange" 
          trend="En curso" 
        />
        <StatCard 
          icon={Wrench} 
          label="En Reparación" 
          value={stats.inRepair} 
          color="blue" 
          trend="Taller" 
        />
        <StatCard 
          icon={AlertCircle} 
          label="Stock Bajo" 
          value={stats.lowStock} 
          color="red" 
          trend="Repuestos" 
        />
        <StatCard 
          icon={Users} 
          label="Clientes" 
          value={stats.totalCustomers} 
          color="indigo" 
          trend="Base datos" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Estado de Órdenes
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Actividad Reciente
          </h2>
          <div className="space-y-6">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex gap-4 group cursor-pointer">
                <div className={cn(
                  "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center",
                  order.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                )}>
                  {order.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 border-b border-slate-50 pb-4 group-last:border-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{order.description}</p>
                  <p className="text-xs text-slate-500 mt-1">Estado: <span className="font-medium capitalize">{order.status.replace('-', ' ')}</span></p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors mt-1" />
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                No hay actividad reciente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, trend }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    amber: "bg-amber-50 text-amber-600 shadow-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black text-slate-900">{value}</div>
        <div className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-500 rounded-full">
          {trend}
        </div>
      </div>
    </div>
  );
}
