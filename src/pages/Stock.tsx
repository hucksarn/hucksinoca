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
import { Plus } from 'lucide-react';

type StockItem = {
  id: string;
  date: string;
  description: string;
  qty: number;
  unit: string;
};

export default function Stock() {
  const stockItems: StockItem[] = [];

  return (
    <MainLayout title="Stock" subtitle="Store items inventory">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">Stock Items</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Record incoming items (GRN) and current stock.</p>
        </div>
        <Button variant="accent" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add GRN
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 md:p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No stock items yet.
                </TableCell>
              </TableRow>
            ) : (
              stockItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}
