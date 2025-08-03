
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserCog, Users, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminGetAllUsers, updateUser } from '@/lib/services/user.service';
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';


export default function AdminUserPrivilegesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
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
      document.title = 'Manage User Privileges | GoTickets.lk Admin';
    }
    fetchUsers();
  }, [fetchUsers]);

  const handlePrivilegeChange = async (targetUser: User, isAdmin: boolean) => {
    if (currentUser?.id === targetUser.id) {
        toast({
            title: "Action Not Allowed",
            description: "You cannot change your own administrator privileges.",
            variant: "destructive",
        });
        return;
    }
    
    setUpdatingUserId(targetUser.id);
    try {
        await updateUser(targetUser.id, { isAdmin });
        toast({
            title: "Privileges Updated",
            description: `${targetUser.name || targetUser.email} is now ${isAdmin ? 'an administrator' : 'a normal user'}.`,
        });
        // Update local state to reflect change immediately
        setUsers(currentUsers => 
            currentUsers.map(u => 
                u.id === targetUser.id ? { ...u, isAdmin } : u
            )
        );
    } catch(error: unknown) {
        toast({
            title: "Update Failed",
            description: (error instanceof Error) ? error.message : "Could not update user privileges.",
            variant: "destructive",
        });
    } finally {
        setUpdatingUserId(null);
    }
  };


  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
          <UserCog className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage User Privileges
        </h1>
        <p className="text-muted-foreground">Directly grant or revoke administrator access for any user.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All System Users</CardTitle>
          <CardDescription>A list of all users and their current role. Toggle the switch to change their privileges.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead className="text-right">Administrator Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={user.id === currentUser?.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                          Admin
                        </Badge>
                      ) : (
                         <Badge variant="outline">
                           <Users className="mr-1.5 h-3.5 w-3.5" />
                           User
                         </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                            {updatingUserId === user.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <Switch
                                id={`admin-switch-${user.id}`}
                                checked={!!user.isAdmin}
                                onCheckedChange={(checked) => handlePrivilegeChange(user, checked)}
                                disabled={updatingUserId === user.id || currentUser?.id === user.id}
                                aria-label={`Administrator status for ${user.name}`}
                            />
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {users.length === 0 && !isLoading && (
            <p className="text-center py-10 text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="flex flex-row items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-1"/>
            <div>
                <CardTitle className="text-amber-900 dark:text-amber-200">A Word of Caution</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-300">
                    Granting administrator privileges gives a user full access to the admin panel, including the ability to manage events, view all bookings, and change other users' roles. Please assign this role with care.
                </CardDescription>
            </div>
        </CardHeader>
      </Card>
    </div>
  );
}
