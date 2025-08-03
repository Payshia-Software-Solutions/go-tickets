
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Shield, UserCog } from 'lucide-react';
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
import RoleForm from '@/components/admin/RoleForm';

// Mock data for roles until backend is ready
interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; }>;
    userCount: number;
}

const mockRoles: Role[] = [
    { 
        id: '1', 
        name: 'Administrator', 
        description: 'Has full access to all features.',
        permissions: {}, // In this case, we'd just check the 'isAdmin' flag
        userCount: 1, 
    },
    { 
        id: '2', 
        name: 'Content Editor', 
        description: 'Can manage events, organizers, and categories.', 
        permissions: {},
        userCount: 0,
    },
    { 
        id: '3', 
        name: 'Support Staff', 
        description: 'Can view bookings and user information.',
        permissions: {},
        userCount: 0,
    }
];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRoleForEdit, setCurrentRoleForEdit] = useState<Role | null>(null);

  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    // In a real app, this would be an API call, e.g., `await getRoles()`
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    setRoles(mockRoles);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Manage User Roles | GoTickets.lk Admin';
    fetchRoles();
  }, [fetchRoles]);

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setIsSubmitting(true);
    toast({
        title: "Deletion Simulated",
        description: `Role "${roleToDelete.name}" would be deleted. This is a mock action.`,
    });
    // In real app: await deleteRole(roleToDelete.id);
    await new Promise(resolve => setTimeout(resolve, 500));
    // MOCK: filter out the role
    setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));

    setIsSubmitting(false);
    setShowDeleteDialog(false);
    setRoleToDelete(null);
  };

  const handleOpenCreateModal = () => {
    setCurrentRoleForEdit(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (role: Role) => {
    setCurrentRoleForEdit(role);
    setShowEditModal(true);
  };

  const handleSubmitRole = async (data: any) => {
    setIsSubmitting(true);
    const isEditing = !!currentRoleForEdit;
    
    // In a real app, you'd call createRole(data) or updateRole(currentRoleForEdit.id, data)
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
        title: `Role ${isEditing ? 'Updated' : 'Created'} (Simulated)`,
        description: `The role "${data.name}" has been saved. This is a mock action.`,
    });

    // MOCK: Update state
    if (isEditing) {
        setRoles(prev => prev.map(r => r.id === currentRoleForEdit!.id ? { ...currentRoleForEdit!, ...data } : r));
    } else {
        const newRole: Role = { id: String(Date.now()), ...data, userCount: 0 };
        setRoles(prev => [...prev, newRole]);
    }
    
    setIsSubmitting(false);
    setShowCreateModal(false);
    setShowEditModal(false);
    setCurrentRoleForEdit(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <UserCog className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage User Roles
          </h1>
          <p className="text-muted-foreground">Define role groups to assign permissions to users.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Role
        </Button>
      </div>

       <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Developer Note</AlertTitle>
          <AlertDescription>
            This page demonstrates the UI for a role-based access control (RBAC) system. Currently, the backend only supports a simple "Administrator" vs. "Standard User" distinction via the `isAdmin` flag. The permissions configured here are for demonstration purposes and are not yet enforced.
          </AlertDescription>
        </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Defined Roles</CardTitle>
          <CardDescription>A list of all user roles in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium whitespace-nowrap">{role.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{role.description}</TableCell>
                    <TableCell className="text-center">{role.userCount}</TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(role)} title="Edit Role">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(role)} title="Delete Role" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setShowCreateModal(false);
            setShowEditModal(false);
            setCurrentRoleForEdit(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
           <DialogHeader>
            <DialogTitle>{currentRoleForEdit ? `Edit Role: ${currentRoleForEdit.name}` : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {currentRoleForEdit ? 'Modify the details and permissions for this role.' : 'Define a new role and assign its permissions.'}
            </DialogDescription>
          </DialogHeader>
           <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <RoleForm
              key={currentRoleForEdit?.id || 'new'}
              initialData={currentRoleForEdit}
              onSubmit={handleSubmitRole}
              isSubmitting={isSubmitting}
              onCancel={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setCurrentRoleForEdit(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              <span className="font-semibold"> {roleToDelete?.name}</span>.
              You will need to manually re-assign users from this role to another one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
