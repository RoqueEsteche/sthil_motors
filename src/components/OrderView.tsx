import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Plus, Search, ClipboardList, Clock, CheckCircle2, AlertTriangle, 
  Truck, MoreVertical, Edit2, Trash2, X, Info, DollarSign, Calendar, Wrench
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ServiceOrder {
  id: string;
  machineId: string;
  customerId: string;
  machineSnapshot: {
    brand: string;
    model: string;
    serialNumber: string;
    accessories: string;
    observations: string;
  };
  description: string;
  status: 'pending' | 'diagnosing' | 'budget-pending' | 'waiting-approval' | 'in-repair' | 'completed' | 'delivered';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  diagnosis?: string;
  budget?: {
    labor: number;
    parts: { partId: string; quantity: number; price: number; name: string }[];
    total: number;
  };
  budgetStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  emailSent?: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

interface Part {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface Machine {
  id: string;
  brand: string;
  model: string;
  serialNumber: string;
  customerId: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function OrderView() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [formData, setFormData] = useState({
    machineId: '',
    customerId: '',
    machineSnapshot: {
      brand: '',
      model: '',
      serialNumber: '',
      accessories: '',
      observations: ''
    },
    description: '',
    status: 'pending' as ServiceOrder['status'],
    priority: 'medium' as ServiceOrder['priority'],
    cost: 0,
    partsUsed: [] as { partId: string; quantity: number; price: number; name: string }[],
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceOrder[];
      setOrders(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'serviceOrders');
    });

    const qMach = query(collection(db, 'machines'), orderBy('brand', 'asc'));
    const unsubscribeMach = onSnapshot(qMach, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        brand: doc.data().brand,
        model: doc.data().model,
        serialNumber: doc.data().serialNumber,
        customerId: doc.data().customerId
      })) as Machine[];
      setMachines(docs);
    });

    const qCust = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Customer[];
      setCustomers(docs);
    });

    const qParts = query(collection(db, 'parts'), orderBy('name', 'asc'));
    const unsubscribeParts = onSnapshot(qParts, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        stock: doc.data().stock,
        price: doc.data().price
      })) as Part[];
      setParts(docs);
    });

    return () => {
      unsubscribe();
      unsubscribeMach();
      unsubscribeCust();
      unsubscribeParts();
    };
  }, []);

  const addPartToOrder = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    
    const existing = formData.partsUsed.find(p => p.partId === partId);
    if (existing) {
      setFormData({
        ...formData,
        partsUsed: formData.partsUsed.map(p => 
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
        )
      });
    } else {
      setFormData({
        ...formData,
        partsUsed: [...formData.partsUsed, { partId, quantity: 1, price: part.price, name: part.name }]
      });
    }
  };

  const removePartFromOrder = (partId: string) => {
    setFormData({
      ...formData,
      partsUsed: formData.partsUsed.filter(p => p.partId !== partId)
    });
  };

  const totalPartsCost = formData.partsUsed.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const totalOrderCost = formData.cost + totalPartsCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: Timestamp.now(),
        budgetStatus: 'none',
        emailSent: false
      };
      if (editingOrder) {
        await updateDoc(doc(db, 'serviceOrders', editingOrder.id), data);
      } else {
        await addDoc(collection(db, 'serviceOrders'), {
          ...data,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
      setFormData({ 
        machineId: '', customerId: '', 
        machineSnapshot: { brand: '', model: '', serialNumber: '', accessories: '', observations: '' },
        description: '', 
        status: 'pending', priority: 'medium', cost: 0, partsUsed: [], notes: '' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'serviceOrders');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta orden?')) {
      try {
        await deleteDoc(doc(db, 'serviceOrders', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'serviceOrders');
      }
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Desconocido';
  const getMachineInfo = (id: string) => {
    const m = machines.find(m => m.id === id);
    return m ? `${m.brand} ${m.model} (S/N: ${m.serialNumber})` : 'Desconocida';
  };

  const filteredOrders = orders.filter(o => 
    o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(o.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMachineInfo(o.machineId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusConfig: Record<ServiceOrder['status'], { label: string, color: string, icon: any }> = {
    'pending': { label: 'Pendiente', color: 'bg-slate-100 text-slate-700', icon: Clock },
    'diagnosing': { label: 'En Diagnóstico', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    'budget-pending': { label: 'Presupuesto Pendiente', color: 'bg-amber-100 text-amber-700', icon: DollarSign },
    'waiting-approval': { label: 'Esperando Aprobación', color: 'bg-indigo-100 text-indigo-700', icon: AlertTriangle },
    'in-repair': { label: 'En Reparación', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    'completed': { label: 'Completada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    'delivered': { label: 'Entregada', color: 'bg-purple-100 text-purple-700', icon: Truck }
  };

  const priorityConfig: Record<ServiceOrder['priority'], { label: string, color: string }> = {
    'low': { label: 'Baja', color: 'text-slate-500' },
    'medium': { label: 'Media', color: 'text-blue-500' },
    'high': { label: 'Alta', color: 'text-amber-500' },
    'urgent': { label: 'Urgente', color: 'text-red-500' }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Órdenes de Servicio</h1>
          <p className="text-slate-500 text-sm">Gestiona las reparaciones y mantenimientos.</p>
        </div>
        <button 
          onClick={() => {
            setEditingOrder(null);
            setFormData({ 
              machineId: '', customerId: '', description: '', 
              status: 'pending', priority: 'medium', cost: 0, notes: '' 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-100 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Orden
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por descripción, cliente o máquina..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Orden / Fecha</th>
                <th className="px-6 py-4 font-semibold">Cliente / Máquina</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Prioridad</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">{order.description}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {order.createdAt?.toDate ? format(order.createdAt.toDate(), "d 'de' MMM, HH:mm", { locale: es }) : 'Cargando...'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{getCustomerName(order.customerId)}</span>
                        <span className="text-xs text-slate-500">{getMachineInfo(order.machineId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider", statusConfig[order.status].color)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[order.status].label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-bold uppercase", priorityConfig[order.priority].color)}>
                        {priorityConfig[order.priority].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingOrder(order);
                            setFormData({
                              machineId: order.machineId,
                              customerId: order.customerId,
                              description: order.description,
                              status: order.status,
                              priority: order.priority,
                              cost: order.cost || 0,
                              notes: order.notes || ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(order.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron órdenes de servicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingOrder ? 'Editar Orden' : 'Nueva Orden de Servicio'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                  <select 
                    required
                    value={formData.customerId}
                    onChange={(e) => {
                      const custId = e.target.value;
                      setFormData({
                        ...formData, 
                        customerId: custId,
                        machineId: '' // Reset machine when customer changes
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  >
                    <option value="">Seleccionar Cliente...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Máquina *</label>
                  <select 
                    required
                    disabled={!formData.customerId}
                    value={formData.machineId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      const m = machines.find(mach => mach.id === mId);
                      setFormData({
                        ...formData, 
                        machineId: mId,
                        machineSnapshot: m ? {
                          brand: m.brand,
                          model: m.model,
                          serialNumber: m.serialNumber,
                          accessories: '',
                          observations: ''
                        } : formData.machineSnapshot
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Seleccionar Máquina...</option>
                    {machines
                      .filter(m => m.customerId === formData.customerId)
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.brand} {m.model} ({m.serialNumber})</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Machine Snapshot Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-600" />
                  Detalles de la Máquina al Ingreso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
                    <input 
                      readOnly
                      value={formData.machineSnapshot.brand}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Modelo</label>
                    <input 
                      readOnly
                      value={formData.machineSnapshot.model}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">S/N</label>
                    <input 
                      readOnly
                      value={formData.machineSnapshot.serialNumber}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Accesorios (Libre)</label>
                    <input 
                      value={formData.machineSnapshot.accessories}
                      onChange={(e) => setFormData({
                        ...formData, 
                        machineSnapshot: { ...formData.machineSnapshot, accessories: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-orange-500 rounded-lg text-sm outline-none transition-all"
                      placeholder="Ej. Espada, cadena, protector..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones de Ingreso</label>
                    <input 
                      value={formData.machineSnapshot.observations}
                      onChange={(e) => setFormData({
                        ...formData, 
                        machineSnapshot: { ...formData.machineSnapshot, observations: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-orange-500 rounded-lg text-sm outline-none transition-all"
                      placeholder="Ej. Sucia, sin combustible, golpe en carcasa..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del Problema *</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Detalla el fallo o servicio requerido..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                  <select 
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ServiceOrder['status']})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  >
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad *</label>
                  <select 
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as ServiceOrder['priority']})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  >
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mano de Obra ($)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number" 
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: Number(e.target.value)})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Repuestos Utilizados</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    onChange={(e) => {
                      if (e.target.value) {
                        addPartToOrder(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Añadir repuesto...</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} (${p.price}) - Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>
                
                {formData.partsUsed.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                    {formData.partsUsed.map((p) => (
                      <div key={p.partId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-slate-400">x{p.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700">${(p.price * p.quantity).toFixed(2)}</span>
                          <button 
                            type="button"
                            onClick={() => removePartFromOrder(p.partId)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Repuestos:</span>
                      <span>${totalPartsCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center">
                <span className="font-bold text-orange-900">Total de la Orden:</span>
                <span className="text-xl font-black text-orange-600">${totalOrderCost.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas Internas</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all resize-none"
                  rows={2}
                  placeholder="Notas para el taller..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  {editingOrder ? 'Guardar Cambios' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
