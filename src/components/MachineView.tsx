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
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Wrench, Settings, MoreVertical, Edit2, Trash2, X, Tag, User, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { where } from 'firebase/firestore';

interface Machine {
  id: string;
  brand: string;
  model: string;
  serialNumber: string;
  type: 'scrubber' | 'vacuum' | 'pressure-washer' | 'sweeper' | 'other';
  customerId: string;
  createdAt: any;
}

interface Customer {
  id: string;
  name: string;
}

export default function MachineView() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    serialNumber: '',
    type: 'scrubber' as Machine['type'],
    customerId: ''
  });

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineHistory, setMachineHistory] = useState<any[]>([]);

  useEffect(() => {
    if (selectedMachine) {
      const q = query(
        collection(db, 'serviceOrders'), 
        where('machineId', '==', selectedMachine.id),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMachineHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'serviceOrders');
      });
      return () => unsubscribe();
    }
  }, [selectedMachine]);

  useEffect(() => {
    const q = query(collection(db, 'machines'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Machine[];
      setMachines(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'machines');
    });

    const qCust = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Customer[];
      setCustomers(docs);
    });

    return () => {
      unsubscribe();
      unsubscribeCust();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        await updateDoc(doc(db, 'machines', editingMachine.id), {
          ...formData,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'machines'), {
          ...formData,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingMachine(null);
      setFormData({ brand: '', model: '', serialNumber: '', type: 'scrubber', customerId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'machines');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta máquina?')) {
      try {
        await deleteDoc(doc(db, 'machines', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'machines');
      }
    }
  };

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.name || 'Desconocido';
  };

  const filteredMachines = machines.filter(m => 
    m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(m.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeLabels: Record<Machine['type'], string> = {
    'scrubber': 'Fregadora',
    'vacuum': 'Aspiradora',
    'pressure-washer': 'Hidrolimpiadora',
    'sweeper': 'Barredora',
    'other': 'Otro'
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maquinaria</h1>
          <p className="text-slate-500 text-sm">Gestiona los equipos registrados en el taller.</p>
        </div>
        <button 
          onClick={() => {
            setEditingMachine(null);
            setFormData({ brand: '', model: '', serialNumber: '', type: 'scrubber', customerId: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-100 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Máquina
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por marca, modelo, serie o cliente..." 
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
                <th className="px-6 py-4 font-semibold">Equipo</th>
                <th className="px-6 py-4 font-semibold">Serie</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Propietario</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMachines.map((machine) => (
                <tr key={machine.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{machine.brand}</span>
                      <span className="text-sm text-slate-500">{machine.model}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {machine.serialNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                      {typeLabels[machine.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {getCustomerName(machine.customerId)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedMachine(machine)}
                        className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                        title="Ver Historial Clínico"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingMachine(machine);
                          setFormData({
                            brand: machine.brand,
                            model: machine.model,
                            serialNumber: machine.serialNumber,
                            type: machine.type,
                            customerId: machine.customerId
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(machine.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMachines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron máquinas.
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMachine ? 'Editar Máquina' : 'Nueva Máquina'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marca *</label>
                  <input 
                    required
                    type="text" 
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                    placeholder="Ej. Karcher"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
                  <input 
                    required
                    type="text" 
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                    placeholder="Ej. BD 50/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Serie *</label>
                <input 
                  required
                  type="text" 
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  placeholder="S/N: 123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Máquina *</label>
                <select 
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as Machine['type']})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                >
                  <option value="scrubber">Fregadora</option>
                  <option value="vacuum">Aspiradora</option>
                  <option value="pressure-washer">Hidrolimpiadora</option>
                  <option value="sweeper">Barredora</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Propietario (Cliente) *</label>
                <select 
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                >
                  <option value="">Seleccionar Cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
                  {editingMachine ? 'Guardar Cambios' : 'Registrar Máquina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* History Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Historial Clínico</h2>
                <p className="text-sm text-slate-500">{selectedMachine.brand} {selectedMachine.model} - S/N: {selectedMachine.serialNumber}</p>
              </div>
              <button 
                onClick={() => setSelectedMachine(null)}
                className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {machineHistory.length > 0 ? (
                machineHistory.map((order) => (
                  <div key={order.id} className="p-4 border border-slate-100 rounded-2xl hover:border-orange-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-400">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        order.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">{order.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{order.createdAt?.toDate().toLocaleDateString()}</span>
                      <span className="font-bold text-slate-900">${order.cost?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No hay órdenes de servicio registradas para esta máquina.
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setSelectedMachine(null)}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-all"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
