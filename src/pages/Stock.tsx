import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isLocalMode, stockApi as stockApiLocal } from '@/lib/api';

type StockItem = {
  id: string;
  item: string;
  description: string;
  qty: number;
  unit: string;
  category: string;
};

type AggregatedItem = {
  item: string;
  description: string;
  unit: string;
  category: string;
  totalQty: number;
};

async function fetchStock() {
  if (isLocalMode) {
    const items = await stockApiLocal.list();
    return items;
  }
  const { supabase } = await import('@/integrations/supabase/client');
  const res = await supabase.functions.invoke('stock-api', { method: 'GET' });
  if (res.error) throw new Error(res.error.message || 'Stock API error');
  return res.data?.items || [];
}

export default function Stock() {
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStock()
      .then((items) => setStockItems(Array.isArray(items) ? items : []))
      .catch((err) => {
        console.error('[Stock] Load error:', err);
        toast({ title: 'Error', description: 'Failed to load stock items', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const si of stockItems) {
      const name = si.item || si.description;
      if (!name) continue;
      const unitKey = (si.unit || '').toLowerCase();
      const key = `${name}__${unitKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalQty += si.qty;
      } else {
        map.set(key, {
          item: si.item,
          description: si.description,
          unit: si.unit,
          category: si.category || '',
          totalQty: si.qty,
        });
      }
    }
    return Array.from(map.values())
      .filter((entry) => entry.totalQty > 0)
      .sort((a, b) => (a.item || a.description).localeCompare(b.item || b.description));
  }, [stockItems]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return aggregated;
    return aggregated.filter((entry) => {
      const name = (entry.item || '').toLowerCase();
      const desc = (entry.description || '').toLowerCase();
      const unit = (entry.unit || '').toLowerCase();
      const category = (entry.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || unit.includes(q) || category.includes(q);
    });
  }, [aggregated, searchQuery]);

  return (
    <MainLayout title="Stock" subtitle="Current stock balances">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">Stock Balances</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Aggregated view of available stock (net positive quantities).</p>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock..."
            className="h-9 w-full md:w-64 rounded-md border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No stock available.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry, index) => (
                  <TableRow key={`${entry.item}_${entry.unit}_${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.item || '—'}</TableCell>
                    <TableCell className="font-medium">{entry.description}</TableCell>
                    <TableCell className="text-xs">{entry.category || '—'}</TableCell>
                    <TableCell className="font-semibold">{entry.totalQty}</TableCell>
                    <TableCell>{entry.unit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </MainLayout>
  );
}
