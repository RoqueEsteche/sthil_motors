import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Wrench, ClipboardCheck, Search, Clock, AlertTriangle, 
  CheckCircle2, DollarSign, X, Send, Package, User, Info
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
  createdAt: any;
}

interface Part {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

export default function MechanicView() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [labor, setLabor] = useState(0);
  const [selectedParts, setSelectedParts] = useState<{ partId: string; quantity: number; price: number; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Only show orders that need mechanic attention
    const q = query(
      collection(db, 'serviceOrders'), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
    });

    onSnapshot(collection(db, 'parts'), (snapshot) => {
      setParts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part)));
    });

    onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => unsubscribe();
  }, []);

  const handleStartDiagnosis = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'serviceOrders', orderId), {
        status: 'diagnosing',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'serviceOrders');
    }
  };

  const addPartToBudget = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    const existing = selectedParts.find(p => p.partId === partId);
    if (existing) {
      setSelectedParts(selectedParts.map(p => p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedParts([...selectedParts, { partId, quantity: 1, price: part.price, name: part.name }]);
    }
  };

  const handleSubmitDiagnosis = async () => {
    if (!selectedOrder) return;
    const total = labor + selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    try {
      await updateDoc(doc(db, 'serviceOrders', selectedOrder.id), {
        diagnosis,
        budget: {
          labor,
          parts: selectedParts,
          total
        },
        status: 'budget-pending',
        budgetStatus: 'pending',
        updatedAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setSelectedOrder(null);
      setDiagnosis('');
      setLabor(0);
      setSelectedParts([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'serviceOrders');
    }
  };

  const sendBudgetEmail = async (order: ServiceOrder) => {
    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) return;

    // Simulate sending email
    console.log(`Sending email to ${customer.email} with budget for ${order.machineSnapshot.brand} ${order.machineSnapshot.model}`);
    
    try {
      await updateDoc(doc(db, 'serviceOrders', order.id), {
        status: 'waiting-approval',
        emailSent: true,
        updatedAt: Timestamp.now()
      });
      alert(`Presupuesto enviado por correo a ${customer.name} (${customer.email})`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'serviceOrders');
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Cargando...';

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Portal del Mecánico</h1>
        <p className="text-slate-500 text-sm">Realiza diagnósticos y elabora presupuestos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Diagnosis Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Pendientes de Diagnóstico
          </h2>
          {orders.filter(o => o.status === 'pending' || o.status === 'diagnosing').map(order => (
            <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2 inline-block",
                    order.status === 'pending' ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {order.status === 'pending' ? 'Por Iniciar' : 'En Proceso'}
                  </span>
                  <h3 className="font-bold text-slate-900">{order.machineSnapshot.brand} {order.machineSnapshot.model}</h3>
                  <p className="text-xs text-slate-500">S/N: {order.machineSnapshot.serialNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400">{format(order.createdAt.toDate(), "d MMM, HH:mm", { locale: es })}</p>
                  <p className="text-sm font-bold text-slate-700">{getCustomerName(order.customerId)}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl mb-4">
                <p className="text-sm text-slate-600 italic">"{order.description}"</p>
              </div>
              {order.status === 'pending' ? (
                <button 
                  onClick={() => handleStartDiagnosis(order.id)}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  Iniciar Diagnóstico
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setSelectedOrder(order);
                    setDiagnosis(order.diagnosis || '');
                    setLabor(order.budget?.labor || 0);
                    setSelectedParts(order.budget?.parts || []);
                    setIsModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Completar Informe Técnico
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Budget Pending Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Presupuestos por Enviar
          </h2>
          {orders.filter(o => o.status === 'budget-pending' || o.status === 'waiting-approval').map(order => (
            <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">{order.machineSnapshot.brand} {order.machineSnapshot.model}</h3>
                  <p className="text-xs text-slate-500">Cliente: {getCustomerName(order.customerId)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600">${order.budget?.total.toFixed(2)}</p>
                  {order.emailSent && (
                    <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" />
                      Enviado
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800 mb-1">Diagnóstico:</p>
                <p className="text-sm text-emerald-700 line-clamp-2">{order.diagnosis}</p>
              </div>
              <button 
                onClick={() => sendBudgetEmail(order)}
                disabled={order.status === 'waiting-approval'}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {order.status === 'waiting-approval' ? 'Esperando Respuesta Cliente' : 'Enviar Presupuesto al Cliente'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnosis Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-600 text-white">
              <div>
                <h2 className="text-xl font-bold">Informe Técnico y Presupuesto</h2>
                <p className="text-orange-100 text-xs">{selectedOrder.machineSnapshot.brand} {selectedOrder.machineSnapshot.model} - S/N: {selectedOrder.machineSnapshot.serialNumber}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Diagnóstico Técnico *</label>
                <textarea 
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-2xl outline-none transition-all resize-none h-32"
                  placeholder="Describe detalladamente el problema encontrado y la solución propuesta..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Selección de Repuestos</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    onChange={(e) => {
                      if (e.target.value) {
                        addPartToBudget(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Añadir repuesto al presupuesto...</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} (${p.price})
                      </option>
                    ))}
                  </select>

                  <div className="space-y-2">
                    {selectedParts.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">${p.price} x {p.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700">${(p.price * p.quantity).toFixed(2)}</span>
                          <button 
                            onClick={() => setSelectedParts(selectedParts.filter((_, i) => i !== idx))}
                            className="text-red-500 p-1 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mano de Obra ($)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="number" 
                        value={labor}
                        onChange={(e) => setLabor(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-2xl text-white">
                    <div className="flex justify-between text-slate-400 text-sm mb-1">
                      <span>Repuestos</span>
                      <span>${selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-sm mb-4">
                      <span>Mano de Obra</span>
                      <span>${labor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="font-bold">Total Estimado</span>
                      <span className="text-2xl font-black text-orange-500">
                        ${(labor + selectedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitDiagnosis}
                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all"
              >
                Guardar Informe y Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
