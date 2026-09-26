
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Category, CategoryFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Tag } from 'lucide-react';
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
import CategoryForm from '@/components/admin/CategoryForm';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCategoryForEdit, setCurrentCategoryForEdit] = useState<Category | null>(null);

  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/categories`); 
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const allCategories: Category[] = await response.json();
      setCategories(allCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error Fetching Categories",
        description: "Could not load categories from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Categories | GoTickets.lk Admin';
    }
    fetchCategories();
  }, [fetchCategories]);

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true); 
    try {
      const response = await fetch(`/api/admin/categories/${categoryToDelete.id}`, { 
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({ message: 'Failed to parse error response from delete.' }));
        throw new Error(responseBody.message || 'Failed to delete category');
      }
      toast({
        title: "Category Deleted",
        description: `"${categoryToDelete.name}" has been successfully deleted.`,
      });
      fetchCategories(); 
    } catch (error: unknown) {
      toast({
        title: "Error Deleting Category",
        description: (error instanceof Error ? error.message : "Could not delete the category. It might be in use or an error occurred."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); 
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  const handleOpenCreateModal = () => {
    setCurrentCategoryForEdit(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setCurrentCategoryForEdit(category);
    setShowEditModal(true);
  };

  const handleCreateCategorySubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/categories`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'Failed to create category');
      }
      toast({
        title: "Category Created",
        description: `"${responseBody.name}" has been successfully created.`,
      });
      setShowCreateModal(false);
      fetchCategories();
    } catch (error: unknown) {
      console.error("Failed to create category:", error);
      toast({
        title: "Error Creating Category",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategorySubmit = async (data: CategoryFormData) => {
    if (!currentCategoryForEdit) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/categories/${currentCategoryForEdit.id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'Failed to update category');
      }
      toast({
        title: "Category Updated",
        description: `"${responseBody.name}" has been successfully updated.`,
      });
      setShowEditModal(false);
      setCurrentCategoryForEdit(null);
      fetchCategories();
    } catch (error: unknown) {
      console.error("Failed to update category:", error);
      toast({
        title: "Error Updating Category",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <Tag className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage Categories
          </h1>
          <p className="text-muted-foreground">View, create, edit, or delete event categories.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>A list of all event categories in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && categories.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Refreshing categories...</p>
            </div>
          )}
          {!isLoading && categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No categories found. Start by adding a new one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SVG Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono text-xs">{String(category.id)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{category.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{category.svg_name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(category)} title="Edit Category">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(category)} title="Delete Category" disabled={isSubmitting}>
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

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>Enter the details for the new category.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CategoryForm
              onSubmit={handleCreateCategorySubmit}
              isSubmitting={isSubmitting}
              submitButtonText="Create Category"
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {currentCategoryForEdit && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => {
            setShowEditModal(isOpen);
            if (!isOpen) setCurrentCategoryForEdit(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category: {currentCategoryForEdit.name}</DialogTitle>
              <DialogDescription>Modify the category details.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <CategoryForm
                initialData={currentCategoryForEdit}
                onSubmit={handleUpdateCategorySubmit}
                isSubmitting={isSubmitting}
                submitButtonText="Update Category"
                onCancel={() => {
                    setShowEditModal(false);
                    setCurrentCategoryForEdit(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              <span className="font-semibold"> {categoryToDelete?.name}</span>.
              If this category is in use by events, deletion might fail or you might need to update those events manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

