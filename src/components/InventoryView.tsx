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
import { Plus, Search, Package, Tag, AlertTriangle, Edit2, Trash2, X, DollarSign, Truck } from 'lucide-react';
import { cn } from '../lib/utils';

interface Part {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
  supplierId: string;
  createdAt: any;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryView() {
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stock: 0,
    minStock: 5,
    price: 0,
    supplierId: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'parts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Part[];
      setParts(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'parts');
    });

    const qSupp = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribeSupp = onSnapshot(qSupp, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Supplier[];
      setSuppliers(docs);
    });

    return () => {
      unsubscribe();
      unsubscribeSupp();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPart) {
        await updateDoc(doc(db, 'parts', editingPart.id), {
          ...formData,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'parts'), {
          ...formData,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingPart(null);
      setFormData({ name: '', sku: '', stock: 0, minStock: 5, price: 0, supplierId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'parts');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este repuesto?')) {
      try {
        await deleteDoc(doc(db, 'parts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'parts');
      }
    }
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario de Repuestos</h1>
          <p className="text-slate-500 text-sm">Control de stock en tiempo real para Stihl Motors.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPart(null);
            setFormData({ name: '', sku: '', stock: 0, minStock: 5, price: 0, supplierId: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-100 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Repuesto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
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
                <th className="px-6 py-4 font-semibold">Repuesto</th>
                <th className="px-6 py-4 font-semibold">SKU / Código</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Precio</th>
                <th className="px-6 py-4 font-semibold">Proveedor</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((part) => (
                <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-900">{part.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {part.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        part.stock <= part.minStock ? "text-red-600" : "text-slate-900"
                      )}>
                        {part.stock}
                      </span>
                      {part.stock <= part.minStock && (
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" title="Stock Bajo" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">${part.price.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {getSupplierName(part.supplierId)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingPart(part);
                          setFormData({
                            name: part.name,
                            sku: part.sku,
                            stock: part.stock,
                            minStock: part.minStock,
                            price: part.price,
                            supplierId: part.supplierId
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(part.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron repuestos en el inventario.
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
                {editingPart ? 'Editar Repuesto' : 'Nuevo Repuesto'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Repuesto *</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  placeholder="Ej. Filtro de aire HEPA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Código *</label>
                <input 
                  required
                  type="text" 
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  placeholder="Ej. STIHL-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Inicial *</label>
                  <input 
                    required
                    type="number" 
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo *</label>
                  <input 
                    required
                    type="number" 
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
                <select 
                  value={formData.supplierId}
                  onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
                  {editingPart ? 'Guardar Cambios' : 'Registrar Repuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
