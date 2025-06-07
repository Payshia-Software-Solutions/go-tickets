
"use client";

import { useEffect, useState } from 'react';
import type { Organizer, OrganizerFormData } from '@/lib/types';
// Removed direct imports: adminGetAllOrganizers, deleteOrganizer, createOrganizer, updateOrganizer
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Users } from 'lucide-react';
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
import OrganizerForm from '@/components/admin/OrganizerForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [organizerToDelete, setOrganizerToDelete] = useState<Organizer | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentOrganizerForEdit, setCurrentOrganizerForEdit] = useState<Organizer | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Organizers | Event Horizon Admin';
    }
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/organizers`);
      if (!response.ok) {
        throw new Error('Failed to fetch organizers');
      }
      const allOrganizers: Organizer[] = await response.json();
      setOrganizers(allOrganizers);
    } catch (error) {
      console.error("Error fetching organizers:", error);
      toast({
        title: "Error Fetching Organizers",
        description: "Could not load organizers from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (organizer: Organizer) => {
    setOrganizerToDelete(organizer);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!organizerToDelete) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/organizers/${organizerToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete organizer and parse error' }));
        throw new Error(errorData.message || 'Failed to delete organizer');
      }
      toast({
        title: "Organizer Deleted",
        description: `"${organizerToDelete.name}" has been successfully deleted.`,
      });
      fetchOrganizers();
    } catch (error: any) {
      toast({
        title: "Error Deleting Organizer",
        description: error.message || "Could not delete the organizer. It might be in use or an error occurred.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    setShowDeleteDialog(false);
    setOrganizerToDelete(null);
  };

  const handleOpenCreateModal = () => {
    setCurrentOrganizerForEdit(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (organizer: Organizer) => {
    // Unlike events, organizer data is likely complete in list view.
    // If not, fetch full data like in events page:
    // const response = await fetch(`${API_BASE_URL}/admin/organizers/${organizer.id}`);
    setCurrentOrganizerForEdit(organizer);
    setShowEditModal(true);
  };

  const handleCreateOrganizerSubmit = async (data: OrganizerFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/organizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create organizer and parse error' }));
        throw new Error(errorData.message || 'Failed to create organizer');
      }
      const newOrganizer = await response.json();
      toast({
        title: "Organizer Created",
        description: `"${newOrganizer.name}" has been successfully created.`,
      });
      setShowCreateModal(false);
      fetchOrganizers();
    } catch (error: any) {
      console.error("Failed to create organizer:", error);
      toast({
        title: "Error Creating Organizer",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrganizerSubmit = async (data: OrganizerFormData) => {
    if (!currentOrganizerForEdit) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/organizers/${currentOrganizerForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update organizer and parse error' }));
        throw new Error(errorData.message || 'Failed to update organizer');
      }
      const updatedOrganizer = await response.json();
      toast({
        title: "Organizer Updated",
        description: `"${updatedOrganizer.name}" has been successfully updated.`,
      });
      setShowEditModal(false);
      setCurrentOrganizerForEdit(null);
      fetchOrganizers();
    } catch (error: any) {
      console.error("Failed to update organizer:", error);
      toast({
        title: "Error Updating Organizer",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && organizers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading organizers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <Users className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage Organizers
          </h1>
          <p className="text-muted-foreground">View, create, edit, or delete event organizers.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Organizer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizers</CardTitle>
          <CardDescription>A list of all event organizers in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && organizers.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Refreshing organizers...</p>
            </div>
          )}
          {!isLoading && organizers.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No organizers found. Start by adding a new one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers.map((organizer) => (
                    <TableRow key={organizer.id}>
                      <TableCell className="font-medium whitespace-nowrap">{organizer.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{organizer.contactEmail}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {organizer.website ? (
                          <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {organizer.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(organizer)} title="Edit Organizer">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(organizer)} title="Delete Organizer">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Organizer</DialogTitle>
            <DialogDescription>Fill in the details for the new organizer.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <OrganizerForm
              onSubmit={handleCreateOrganizerSubmit}
              isSubmitting={isSubmitting}
              submitButtonText="Create Organizer"
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {currentOrganizerForEdit && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => {
            setShowEditModal(isOpen);
            if (!isOpen) setCurrentOrganizerForEdit(null);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Organizer: {currentOrganizerForEdit.name}</DialogTitle>
              <DialogDescription>Modify the details for this organizer.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
              <OrganizerForm
                initialData={currentOrganizerForEdit}
                onSubmit={handleUpdateOrganizerSubmit}
                isSubmitting={isSubmitting}
                submitButtonText="Update Organizer"
                onCancel={() => {
                    setShowEditModal(false);
                    setCurrentOrganizerForEdit(null);
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
              This action cannot be undone. This will permanently delete the organizer
              <span className="font-semibold"> {organizerToDelete?.name}</span>.
              Events associated with this organizer may need to be updated manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrganizerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Organizer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
