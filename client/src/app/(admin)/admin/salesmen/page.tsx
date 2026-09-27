"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Salesman, SalesmanFormData } from '@/lib/types';
import { getAllSalesmen, createSalesman, updateSalesman, deleteSalesman } from '@/lib/services/salesman.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Loader2, Briefcase, Search, Phone, Mail, CheckCircle2, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import SalesmanForm from '@/components/admin/SalesmanForm';

export default function AdminSalesmenPage() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [salesmanToDelete, setSalesmanToDelete] = useState<Salesman | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSalesmanForEdit, setCurrentSalesmanForEdit] = useState<Salesman | null>(null);

  const { toast } = useToast();

  const fetchSalesmenList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllSalesmen();
      setSalesmen(data);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
      toast({
        title: "Error Fetching Salesmen",
        description: "Could not load salesmen list from server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Salesmen Management | Admin';
    }
    fetchSalesmenList();
  }, [fetchSalesmenList]);

  const filteredSalesmen = useMemo(() => {
    if (!searchQuery.trim()) return salesmen;
    const q = searchQuery.toLowerCase();
    return salesmen.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [salesmen, searchQuery]);

  const activeCount = useMemo(() => salesmen.filter(s => s.status === 'active').length, [salesmen]);
  const inactiveCount = salesmen.length - activeCount;

  const handleCreateSubmit = async (data: SalesmanFormData) => {
    setIsSubmitting(true);
    try {
      await createSalesman(data);
      toast({
        title: "Salesman Created",
        description: `"${data.name}" has been registered successfully.`,
      });
      setShowCreateModal(false);
      fetchSalesmenList();
    } catch (error: any) {
      toast({
        title: "Failed to Create",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: SalesmanFormData) => {
    if (!currentSalesmanForEdit) return;
    setIsSubmitting(true);
    try {
      await updateSalesman(currentSalesmanForEdit.id, data);
      toast({
        title: "Salesman Updated",
        description: `Details for "${data.name}" have been updated.`,
      });
      setShowEditModal(false);
      setCurrentSalesmanForEdit(null);
      fetchSalesmenList();
    } catch (error: any) {
      toast({
        title: "Failed to Update",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (salesman: Salesman) => {
    setSalesmanToDelete(salesman);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!salesmanToDelete) return;
    setIsLoading(true);
    try {
      await deleteSalesman(salesmanToDelete.id);
      toast({
        title: "Salesman Deleted",
        description: `"${salesmanToDelete.name}" has been removed.`,
      });
      fetchSalesmenList();
    } catch (error: any) {
      toast({
        title: "Failed to Delete",
        description: error.message || "Could not delete salesman.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    setShowDeleteDialog(false);
    setSalesmanToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salesmen & Agents</h1>
          <p className="text-muted-foreground text-sm">
            Manage registered salesmen for manual bookings and sales performance tracking.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Add Salesman
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Salesmen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesmen.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" /> {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground flex items-center gap-1.5">
              <XCircle className="h-5 w-5" /> {inactiveCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Registered Salesmen</CardTitle>
              <CardDescription>
                Salesmen selected here can be assigned to offline/manual bookings.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search salesmen..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading salesmen...</span>
            </div>
          ) : filteredSalesmen.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-semibold text-lg">No Salesmen Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                {searchQuery ? "No salesmen match your search query." : "No salesmen have been registered yet. Add your first salesman to start assigning manual bookings."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Salesman
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalesmen.map((salesman) => (
                    <TableRow key={salesman.id}>
                      <TableCell className="font-mono text-xs">
                        {salesman.code ? (
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">
                            {salesman.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                            {salesman.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{salesman.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {salesman.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {salesman.phone}
                            </div>
                          )}
                          {salesman.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {salesman.email}
                            </div>
                          )}
                          {!salesman.phone && !salesman.email && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {salesman.status === 'active' ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {salesman.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentSalesmanForEdit(salesman);
                            setShowEditModal(true);
                          }}
                          title="Edit Salesman"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(salesman)}
                          title="Delete Salesman"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Register New Salesman</DialogTitle>
            <DialogDescription>
              Add a salesman or sales representative to assign to manual offline bookings.
            </DialogDescription>
          </DialogHeader>
          <SalesmanForm
            onSubmit={handleCreateSubmit}
            isSubmitting={isSubmitting}
            submitButtonText="Register Salesman"
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Salesman</DialogTitle>
            <DialogDescription>
              Update details or change status for {currentSalesmanForEdit?.name}.
            </DialogDescription>
          </DialogHeader>
          {currentSalesmanForEdit && (
            <SalesmanForm
              initialData={currentSalesmanForEdit}
              onSubmit={handleEditSubmit}
              isSubmitting={isSubmitting}
              submitButtonText="Update Salesman"
              onCancel={() => {
                setShowEditModal(false);
                setCurrentSalesmanForEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete salesman &ldquo;{salesmanToDelete?.name}&rdquo;.
              Past bookings already recorded with this salesman will keep their record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSalesmanToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
