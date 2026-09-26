
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { User, AdminUserFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, UserCog, Users, ShieldCheck } from 'lucide-react';
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
import { adminGetAllUsers, adminCreateUser, updateUser, deleteUser } from '@/lib/services/user.service';
import UserForm from '@/components/admin/UserForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUserForEdit, setCurrentUserForEdit] = useState<User | null>(null);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await adminGetAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error Fetching Users",
        description: "Could not load users from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Users | GoTickets.lk Admin';
    }
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
      toast({
        title: "User Deleted",
        description: `User "${userToDelete.name || userToDelete.email}" has been successfully deleted.`,
      });
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error Deleting User",
        description: (error instanceof Error ? error.message : "Could not delete the user."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };
  
  const handleOpenCreateModal = () => {
    setCurrentUserForEdit(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setCurrentUserForEdit(user);
    setShowEditModal(true);
  };

  const handleCreateUserSubmit = async (data: AdminUserFormData) => {
    setIsSubmitting(true);
    try {
      const newUser = await adminCreateUser(data);
      toast({
        title: "User Created",
        description: `User "${newUser.name}" has been successfully created.`,
      });
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Failed to create user:", error);
      toast({
        title: "Error Creating User",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUserSubmit = async (data: AdminUserFormData) => {
    if (!currentUserForEdit) return;
    setIsSubmitting(true);
    
    const dataToUpdate: Partial<AdminUserFormData> = {
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        isAdmin: data.isAdmin,
    };
    if (data.password) {
        dataToUpdate.password = data.password;
    }

    try {
      const updatedUser = await updateUser(currentUserForEdit.id, dataToUpdate);
      toast({
        title: "User Updated",
        description: `User "${updatedUser?.name}" has been successfully updated.`,
      });
      setShowEditModal(false);
      setCurrentUserForEdit(null);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Failed to update user:", error);
      toast({
        title: "Error Updating User",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminUsers = users.filter(u => u.isAdmin);
  const normalUsers = users.filter(u => !u.isAdmin);

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  const renderUserTable = (userList: User[], title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {userList.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No users in this category.</p>
        ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userList.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "-"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${user.id}/privileges`)}>
                          <ShieldCheck className="h-4 w-4 mr-2" /> Privileges
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(user)} title="Edit User">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(user)} title="Delete User">
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
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <Users className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage Users
          </h1>
          <p className="text-muted-foreground">View, create, edit, or delete user accounts.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>

      <Tabs defaultValue="normal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="normal">
             <Users className="mr-2 h-4 w-4" /> Normal Users ({normalUsers.length})
          </TabsTrigger>
          <TabsTrigger value="admin">
            <UserCog className="mr-2 h-4 w-4" /> Administrators ({adminUsers.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="normal" className="mt-4">
          {renderUserTable(normalUsers, "All Normal Users", "Standard users without admin access.")}
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          {renderUserTable(adminUsers, "All Administrators", "Users with administrative privileges.")}
        </TabsContent>
      </Tabs>
      
      {/* Create User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Enter the details for the new user account.</DialogDescription>
          </DialogHeader>
          <UserForm
            onSubmit={handleCreateUserSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      {currentUserForEdit && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => {
            if (!isOpen) setCurrentUserForEdit(null);
            setShowEditModal(isOpen);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Modify the details for {currentUserForEdit.name || currentUserForEdit.email}.</DialogDescription>
            </DialogHeader>
            <UserForm
              initialData={currentUserForEdit}
              onSubmit={handleUpdateUserSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => {
                  setShowEditModal(false);
                  setCurrentUserForEdit(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              <span className="font-semibold"> {userToDelete?.name || userToDelete?.email}</span> and all associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
