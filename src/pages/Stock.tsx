import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type StockItem = {
  id: string;
  date?: string;
  description: string;
  qty: number;
  unit: string;
};

type UploadRow = {
  id: string;
  description: string;
  qty: number;
  unit: string;
};

export default function Stock() {
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [manualRows, setManualRows] = useState<UploadRow[]>([
    { id: `manual_${Date.now()}`, description: '', qty: 0, unit: '' },
  ]);

  const loadStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      setStockItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load stock items',
        variant: 'destructive',
      });
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    void loadStock();
  }, []);

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

    const normalized = rows
      .map((row, index) => {
        const description = row.Description || row.description || row.DESC || row.desc || '';
        const qty = row.Qty ?? row.qty ?? row.QTY ?? row.Quantity ?? row.quantity ?? '';
        const unit = row.Unit || row.unit || row.UOM || row.uom || '';

        if (!description) return null;

        return {
          id: `upload_${Date.now()}_${index}`,
          description: String(description).trim(),
          qty: Number(qty) || 0,
          unit: String(unit).trim(),
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
      toast({
        title: 'Upload Failed',
        description: 'Could not read Excel file.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImportRows = async (rows: UploadRow[]) => {
    if (rows.length === 0) {
      toast({
        title: 'No Data',
        description: 'Add at least one stock row.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      });
      if (!response.ok) {
        throw new Error('Failed to import stock');
      }
      const data = await response.json();
      setStockItems(Array.isArray(data.items) ? data.items : []);
      setUploadRows([]);
      setManualRows([{ id: `manual_${Date.now()}`, description: '', qty: 0, unit: '' }]);
      toast({ title: 'Stock Imported', description: 'Excel rows added to stock.' });
      setShowDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import stock rows.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddManualRow = () => {
    setManualRows((prev) => [
      ...prev,
      { id: `manual_${Date.now()}_${prev.length}`, description: '', qty: 0, unit: '' },
    ]);
  };

  const handleRemoveManualRow = (id: string) => {
    setManualRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSaveManual = () => {
    const cleaned = manualRows
      .map((row) => ({
        ...row,
        description: row.description.trim(),
        unit: row.unit.trim(),
      }))
      .filter((row) => row.description.length > 0);

    void handleImportRows(cleaned);
  };

  return (
    <MainLayout title="Stock" subtitle="Store items inventory">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">Stock Items</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Record incoming items (GRN) and current stock.</p>
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
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No stock items yet.
                  </TableCell>
                </TableRow>
              ) : (
                stockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add GRN</DialogTitle>
            <DialogDescription>
              Add stock items manually or import via Excel.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
              <TabsTrigger value="excel" className="flex-1">Upload Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="border rounded-lg p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualRows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.description}
                            onChange={(event) => {
                              const next = [...manualRows];
                              next[index] = { ...row, description: event.target.value };
                              setManualRows(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="w-28">
                          <Input
                            value={row.qty}
                            onChange={(event) => {
                              const next = [...manualRows];
                              next[index] = { ...row, qty: Number(event.target.value) || 0 };
                              setManualRows(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="w-32">
                          <Input
                            value={row.unit}
                            onChange={(event) => {
                              const next = [...manualRows];
                              next[index] = { ...row, unit: event.target.value };
                              setManualRows(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="w-10 text-right">
                          {manualRows.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveManualRow(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={handleAddManualRow} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
                <Button variant="accent" onClick={handleSaveManual} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Save to Stock
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="excel" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
                <Button variant="outline" className="gap-2" disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>

              {uploadRows.length > 0 ? (
                <div className="border rounded-lg p-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadRows.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Input
                              value={row.description}
                              onChange={(event) => {
                                const next = [...uploadRows];
                                next[index] = { ...row, description: event.target.value };
                                setUploadRows(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="w-28">
                            <Input
                              value={row.qty}
                              onChange={(event) => {
                                const next = [...uploadRows];
                                next[index] = { ...row, qty: Number(event.target.value) || 0 };
                                setUploadRows(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="w-32">
                            <Input
                              value={row.unit}
                              onChange={(event) => {
                                const next = [...uploadRows];
                                next[index] = { ...row, unit: event.target.value };
                                setUploadRows(next);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Upload an Excel file to preview rows.</p>
              )}

              <Button
                variant="accent"
                onClick={() => handleImportRows(uploadRows)}
                disabled={uploading || uploadRows.length === 0}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Import to Stock
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
