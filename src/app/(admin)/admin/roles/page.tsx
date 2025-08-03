
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCog, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminGetAllUsers, updateUser } from '@/lib/services/user.service';
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


const permissionStructure = {
    pages: ["Dashboard", "Events", "Organizers", "Users", "Categories", "Bookings", "Reports", "Verification"],
    crud: {
        events: ["Create", "Update", "Delete"],
        users: ["Create", "Update", "Delete"],
        bookings: ["Update", "Delete"],
    }
};

const UserRolesPage = () => {
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
      document.title = 'Manage User Roles | GoTickets.lk Admin';
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

  const renderPermissions = (userIsAdmin: boolean) => {
    const allPermissions = [
        ...permissionStructure.pages,
        ...permissionStructure.crud.events,
        ...permissionStructure.crud.users,
        ...permissionStructure.crud.bookings
    ];

    return (
        <div className="pl-4 mt-2">
            <p className="text-xs text-muted-foreground mb-3">
                The detailed permissions below are for display purposes to illustrate a full role-based system. Currently, the backend only supports a single "Administrator" role. Toggling the main switch will grant or revoke all permissions.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                {allPermissions.map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                            id={`${permission}-${userIsAdmin}`}
                            checked={userIsAdmin}
                            disabled={true} // Disabled as it's for display
                        />
                        <label
                            htmlFor={`${permission}-${userIsAdmin}`}
                            className={cn("text-sm font-medium leading-none", userIsAdmin ? "text-foreground" : "text-muted-foreground", "peer-disabled:cursor-not-allowed peer-disabled:opacity-70")}
                        >
                            {permission}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
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
          <UserCog className="mr-3 h-7 w-7 sm:h-8 sm:w-8" /> Manage User Roles
        </h1>
        <p className="text-muted-foreground">Grant or revoke administrator access and view detailed permissions for each user.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All System Users</CardTitle>
          <CardDescription>A list of all users and their assigned permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {users.map((user) => (
              <AccordionItem value={`user-${user.id}`} key={user.id}>
                <AccordionTrigger className={cn("hover:no-underline", user.id === currentUser?.id ? 'bg-muted/50 rounded-md px-4' : 'px-4')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="text-left">
                        <p className="font-medium text-foreground">{user.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-4 pr-4">
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>
                           {user.isAdmin ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : null}
                           {user.isAdmin ? 'Administrator' : 'User'}
                        </Badge>
                         <div className="flex items-center gap-2">
                            {updatingUserId === user.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <Switch
                                id={`admin-switch-${user.id}`}
                                checked={!!user.isAdmin}
                                onCheckedChange={(checked) => handlePrivilegeChange(user, checked)}
                                disabled={updatingUserId === user.id || currentUser?.id === user.id}
                                aria-label={`Administrator status for ${user.name}`}
                                onClick={(e) => e.stopPropagation()} // Prevent trigger from firing on switch click
                            />
                       </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                    {renderPermissions(!!user.isAdmin)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
                    Granting administrator privileges gives a user full access to the admin panel. Please assign this role with care. The detailed permissions are for future implementation and are currently all controlled by the master "Administrator" switch.
                </CardDescription>
            </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default UserRolesPage;
