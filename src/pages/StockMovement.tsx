import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Loader2, Trash2, Pencil, ChevronDown, ChevronRight, User, Building2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isLocalMode, stockApi as stockApiLocal } from '@/lib/api';
import { useMaterialCategories } from '@/hooks/useDatabase';
import * as XLSX from 'xlsx';

type StockItem = {
  id: string;
  date: string;
  item: string;
  description: string;
  qty: number;
  unit: string;
  category: string;
  request_id?: string | null;
};

type UploadRow = {
  id: string;
  item: string;
  description: string;
  qty: number;
  unit: string;
  category: string;
};

async function stockApiFetch(method: 'GET' | 'POST', body?: any) {
  if (isLocalMode) {
    if (method === 'GET') {
      const items = await stockApiLocal.list();
      return { items };
    }
    const action = body?.action;
    if (action === 'deduct') {
      const items = await stockApiLocal.deduct(body.items);
      return { items };
    }
    const items = await stockApiLocal.add(body.items);
    return { items };
  }

  const { supabase } = await import('@/integrations/supabase/client');
  const res = await supabase.functions.invoke('stock-api', {
    method,
    body: method === 'POST' ? body : undefined,
  });
  if (res.error) throw new Error(res.error.message || 'Stock API error');
  return res.data;
}

export default function StockMovement() {
  const { toast } = useToast();
  const { data: categories = [] } = useMaterialCategories();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [manualRows, setManualRows] = useState<UploadRow[]>([
    { id: `manual_${Date.now()}`, item: '', description: '', qty: 0, unit: '', category: '' },
  ]);
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');

  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState({ item: '', description: '', qty: 0, unit: '', category: '' });
  const [saving, setSaving] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [requestDetails, setRequestDetails] = useState<Record<string, { request_number: string; requester_name: string; project_name: string; remarks: string | null; request_type: string }>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const loadStock = async () => {
    try {
      const data = await stockApiFetch('GET');
      const items = Array.isArray(data.items) ? data.items : [];
      setStockItems(items);
      // Fetch request details for outgoing items
      const requestIds = items.filter((i: StockItem) => i.qty < 0 && i.request_id).map((i: StockItem) => i.request_id as string).filter((v, i, a) => a.indexOf(v) === i);
      if (requestIds.length > 0 && !isLocalMode) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: requests } = await supabase
          .from('material_requests')
          .select('id, request_number, requester_id, project_id, remarks, request_type')
          .in('id', requestIds);
        if (requests) {
          const projectIds = [...new Set(requests.map(r => r.project_id))];
          const requesterIds = [...new Set(requests.map(r => r.requester_id))];
          const [{ data: projects }, { data: profiles }] = await Promise.all([
            supabase.from('projects').select('id, name').in('id', projectIds),
            supabase.from('profiles').select('user_id, full_name').in('user_id', requesterIds),
          ]);
          const projectMap = Object.fromEntries((projects || []).map(p => [p.id, p.name]));
          const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
          const details: typeof requestDetails = {};
          for (const r of requests) {
            details[r.id] = {
              request_number: r.request_number,
              requester_name: profileMap[r.requester_id] || 'Unknown',
              project_name: projectMap[r.project_id] || 'Unknown',
              remarks: r.remarks,
              request_type: r.request_type,
            };
          }
          setRequestDetails(details);
        }
      }
    } catch (error) {
      console.error('[Stock] Load error:', error);
      toast({ title: 'Error', description: 'Failed to load stock items', variant: 'destructive' });
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => { void loadStock(); }, []);

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

    const normalized = rows
      .map((row, index) => {
        const item = row.Item || row.item || row.ITEM || '';
        const description = row.Description || row.description || row.DESC || row.desc || '';
        const qty = row.Qty ?? row.qty ?? row.QTY ?? row.Quantity ?? row.quantity ?? '';
        const unit = row.Unit || row.unit || row.UOM || row.uom || '';
        if (!description) return null;
        return {
          id: `upload_${Date.now()}_${index}`,
          item: String(item).trim(),
          description: String(description).trim(),
          qty: Number(qty) || 0,
          unit: String(unit).trim(),
          category: String(row.Category || row.category || row.CATEGORY || '').trim(),
        };
      })
      .filter(Boolean) as UploadRow[];

    setUploadRows(normalized);
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await parseExcel(file);
    } catch (error) {
      console.error('[Stock] Excel parse error:', error);
      toast({ title: 'Upload Failed', description: 'Could not read Excel file.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleImportRows = async (rows: UploadRow[]) => {
    if (rows.length === 0) {
      toast({ title: 'No Data', description: 'Add at least one stock row.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const data = await stockApiFetch('POST', { items: rows });
      setStockItems(Array.isArray(data.items) ? data.items : []);
      setUploadRows([]);
      setManualRows([{ id: `manual_${Date.now()}`, item: '', description: '', qty: 0, unit: '', category: '' }]);
      toast({ title: 'Stock Imported', description: `${rows.length} rows added to stock.` });
      setShowDialog(false);
    } catch (error) {
      console.error('[Stock] Import error:', error);
      toast({ title: 'Error', description: 'Failed to import stock rows.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddManualRow = () => {
    setManualRows((prev) => [
      ...prev,
      { id: `manual_${Date.now()}_${prev.length}`, item: '', description: '', qty: 0, unit: '', category: '' },
    ]);
  };

  const handleRemoveManualRow = (id: string) => {
    setManualRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSaveManual = () => {
    const cleaned = manualRows
      .map((row) => ({ ...row, item: row.item.trim(), description: row.description.trim(), unit: row.unit.trim() }))
      .filter((row) => row.description.length > 0);
    void handleImportRows(cleaned);
  };

  const hasManualRows = manualRows.some((row) => row.description.trim().length > 0);

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setEditForm({
      item: item.item || '',
      description: item.description || '',
      qty: item.qty,
      unit: item.unit || '',
      category: item.category || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      if (isLocalMode) {
        toast({ title: 'Not supported', description: 'Edit is not supported in local mode.', variant: 'destructive' });
        return;
      }
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('stock_items')
        .update({
          item: editForm.item,
          description: editForm.description,
          qty: editForm.qty,
          unit: editForm.unit,
          category: editForm.category,
        })
        .eq('id', editItem.id);
      if (error) throw error;
      toast({ title: 'Updated', description: 'Stock item updated successfully.' });
      setEditItem(null);
      await loadStock();
    } catch (error: any) {
      console.error('[Stock] Edit error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update stock item.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Stock Movement" subtitle="All stock transactions (inward &amp; outward)">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">Stock Transactions</h2>
          <p className="text-xs md:text-sm text-muted-foreground">View all stock movements including GRN entries and deductions.</p>
        </div>
        <Button variant="accent" size="sm" className="gap-2" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Add GRN
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 md:p-6">
        {loadingStock ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No stock transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                stockItems.map((item, index) => {
                  const isOutgoing = item.qty < 0;
                  const hasDetails = isOutgoing && item.request_id && requestDetails[item.request_id];
                  const details = item.request_id ? requestDetails[item.request_id] : null;
                  const isExpanded = expandedRows.has(item.id);

                  return (
                    <>
                      <TableRow key={item.id} className={isOutgoing ? 'bg-destructive/5' : ''}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="text-xs">{item.date || '—'}</TableCell>
                        <TableCell>{item.item || `Item ${index + 1}`}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-xs">{item.category || '—'}</TableCell>
                        <TableCell className={isOutgoing ? 'text-destructive font-medium' : ''}>{item.qty}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {hasDetails && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRow(item.id)} title="Details">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && details && (
                        <TableRow key={`${item.id}-details`} className="bg-muted/30">
                          <TableCell colSpan={8} className="py-2 px-6">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                              <span className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Req:</span> <span className="font-medium">{details.request_number}</span></span>
                              <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">By:</span> {details.requester_name}</span>
                              <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Site:</span> {details.project_name}</span>
                              {details.remarks && <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Remarks:</span> {details.remarks}</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock Item</DialogTitle>
            <DialogDescription>Update the details for this stock item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Item</label>
              <Input value={editForm.item} onChange={(e) => setEditForm({ ...editForm, item: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                <option value="">Select</option>
                {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty</label>
                <Input type="number" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit</label>
                <Input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add GRN Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] !flex !flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add GRN</DialogTitle>
            <DialogDescription>Add stock items manually or import via Excel.</DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'manual' | 'excel')}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
              <TabsTrigger value="excel" className="flex-1">Upload Excel</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              <TabsContent value="manual" className="space-y-4 mt-0">
                <div className="border rounded-lg p-3">
                  <Table>
                    <TableHeader>
                     <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualRows.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Input value={row.item} onChange={(e) => { const next = [...manualRows]; next[index] = { ...row, item: e.target.value }; setManualRows(next); }} />
                          </TableCell>
                          <TableCell>
                            <Input value={row.description} onChange={(e) => { const next = [...manualRows]; next[index] = { ...row, description: e.target.value }; setManualRows(next); }} />
                          </TableCell>
                          <TableCell className="w-40">
                            <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={row.category} onChange={(e) => { const next = [...manualRows]; next[index] = { ...row, category: e.target.value }; setManualRows(next); }}>
                              <option value="">Select</option>
                              {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name}</option>)}
                            </select>
                          </TableCell>
                          <TableCell className="w-28">
                            <Input value={row.qty} onChange={(e) => { const next = [...manualRows]; next[index] = { ...row, qty: Number(e.target.value) || 0 }; setManualRows(next); }} />
                          </TableCell>
                          <TableCell className="w-32">
                            <Input value={row.unit} onChange={(e) => { const next = [...manualRows]; next[index] = { ...row, unit: e.target.value }; setManualRows(next); }} />
                          </TableCell>
                          <TableCell className="w-10 text-right">
                            {manualRows.length > 1 && (
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveManualRow(row.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" onClick={handleAddManualRow} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
              </TabsContent>

              <TabsContent value="excel" className="space-y-4 mt-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} />
                  <Button variant="outline" className="gap-2" disabled={uploading}>
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                  <a href="/stock_sample.csv" className="text-xs text-primary underline underline-offset-4" download>
                    Download sample CSV
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Required columns: <span className="font-medium">Item, Description, Qty, Unit</span>
                </p>

                {uploadRows.length > 0 ? (
                  <div className="border rounded-lg p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.item}</TableCell>
                            <TableCell>{row.description}</TableCell>
                            <TableCell>{row.qty}</TableCell>
                            <TableCell>{row.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </TabsContent>
            </div>

            {/* Pinned action buttons */}
            <div className="shrink-0 border-t border-border pt-4 mt-4 flex justify-end gap-2">
              {activeTab === 'manual' ? (
                <Button variant="accent" onClick={handleSaveManual} disabled={uploading || !hasManualRows} className="gap-2">
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Stock
                </Button>
              ) : (
                <Button variant="accent" onClick={() => handleImportRows(uploadRows)} disabled={uploading || uploadRows.length === 0} className="gap-2">
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {uploadRows.length} Rows
                </Button>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
