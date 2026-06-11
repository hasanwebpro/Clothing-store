import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

const inventoryApi = {
  getInventory: (params) => apiClient.get('/inventory/', { params }),
  restock: (variantId, data) => apiClient.post('/inventory/movements/', { variant_id: variantId, ...data }),
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editNote, setEditNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => inventoryApi.getInventory({ search, page_size: 50 }).then((r) => r.data?.results || r.data || []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, qty, note }) =>
      inventoryApi.restock(variantId, { movement: parseInt(qty) >= 0 ? 'restock' : 'adjustment', quantity: parseInt(qty), note }),
    onSuccess: () => { queryClient.invalidateQueries(['inventory']); toast.success('Stock updated'); setEditingId(null); setEditQty(''); setEditNote(''); },
    onError: (err) => toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Could not update stock'),
  });

  const inventory = data || [];
  const filtered = search
    ? inventory.filter((i) => i.sku?.toLowerCase().includes(search.toLowerCase()) || i.product_name?.toLowerCase().includes(search.toLowerCase()))
    : inventory;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-white/90">Inventory</h1>
        <p className="text-sm mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>Monitor and adjust stock levels</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'rgba(255,255,255,0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="SKU or product…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 pr-4 py-2 rounded-lg text-sm w-56" />
        </div>
        {!isLoading && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)' }}>
            {filtered.length} variant{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-medium" style={{ color:'rgba(255,255,255,0.4)' }}>No inventory items found</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
                {['Product / SKU','Variant','Stock','Reserved','Threshold',''].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3.5 text-[10px] font-bold tracking-[0.15em] uppercase ${i===1?'hidden md:table-cell':i===3||i===4?'hidden sm:table-cell':''}`}
                    style={{ color:'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const isLow = item.quantity_on_hand <= item.reorder_threshold;
                const isEditing = editingId === item.variant_id;
                return (
                  <tr key={item.variant_id} className="group transition-colors"
                    style={{ borderBottom: idx < filtered.length-1 ? '1px solid rgba(255,255,255,0.04)' : undefined, background: isLow ? 'rgba(251,146,60,0.05)' : undefined }}
                    onMouseEnter={e => { if (!isLow) e.currentTarget.style.background='rgba(255,255,255,0.025)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isLow ? 'rgba(251,146,60,0.05)' : 'transparent'; }}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold" style={{ color:'rgba(255,255,255,0.85)' }}>{item.product_name}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>{item.sku}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs hidden md:table-cell" style={{ color:'rgba(255,255,255,0.45)' }}>{item.variant_attributes || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold tabular-nums ${isLow ? 'text-amber-400' : ''}`} style={!isLow ? { color:'rgba(255,255,255,0.85)' } : undefined}>
                          {item.quantity_on_hand}
                        </span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell tabular-nums" style={{ color:'rgba(255,255,255,0.4)' }}>{item.quantity_reserved}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell tabular-nums" style={{ color:'rgba(255,255,255,0.4)' }}>{item.reorder_threshold}</td>
                    <td className="px-5 py-3.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input type="number" className="input-dark py-1 text-xs w-16 rounded-lg" placeholder="±qty"
                            value={editQty} onChange={(e) => setEditQty(e.target.value)} autoFocus />
                          <input type="text" className="input-dark py-1 text-xs w-20 rounded-lg" placeholder="Note"
                            value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                          <button onClick={() => updateMutation.mutate({ variantId: item.variant_id, qty: editQty, note: editNote })}
                            disabled={!editQty || updateMutation.isLoading}
                            className="text-xs font-semibold px-2 py-1 rounded cursor-pointer" style={{ color:'rgba(52,211,153,0.9)' }}>
                            Save
                          </button>
                          <button onClick={() => { setEditingId(null); setEditQty(''); }}
                            className="text-xs cursor-pointer" style={{ color:'rgba(255,255,255,0.35)' }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(item.variant_id); setEditQty(''); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background:'rgba(255,0,110,0.10)', color:'#ff75bb', border:'1px solid rgba(255,0,110,0.20)' }}>
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
