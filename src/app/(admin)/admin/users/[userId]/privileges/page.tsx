
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCog, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserById, updateUser } from '@/lib/services/user.service';
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const permissionStructure = {
    pages: ["Dashboard", "Events", "Organizers", "Users", "Categories", "Bookings", "Reports", "Verification"],
    crud: {
        events: ["Create Events", "Update Events", "Delete Events"],
        users: ["Create Users", "Update Users", "Delete Users"],
        bookings: ["Update Bookings", "Delete Bookings"],
    }
};

const getInitials = (name?: string | null, email: string = '') => {
  if (name) {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 1).toUpperCase();
};

const UserPrivilegesPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { userId } = useParams();
  const router = useRouter();

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const fetchUser = useCallback(async () => {
    if (typeof userId !== 'string') return;
    setIsLoading(true);
    try {
      const fetchedUser = await getUserById(userId);
      setUser(fetchedUser);
      if(fetchedUser){
        document.title = `Privileges for ${fetchedUser.name || fetchedUser.email} | GoTickets.lk Admin`;
      } else {
        document.title = 'User Not Found | GoTickets.lk Admin';
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        title: "Error Fetching User",
        description: "Could not load user data from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handlePrivilegeChange = async (isAdmin: boolean) => {
    if (!user) return;
    if (currentUser?.id === user.id) {
        toast({
            title: "Action Not Allowed",
            description: "You cannot change your own administrator privileges.",
            variant: "destructive",
        });
        return;
    }
    
    setIsUpdating(true);
    try {
        const updatedUser = await updateUser(user.id, { isAdmin });
        if (updatedUser) {
            setUser(updatedUser);
        }
        toast({
            title: "Privileges Updated",
            description: `${user.name || user.email} is now ${isAdmin ? 'an administrator' : 'a normal user'}.`,
        });
    } catch(error: unknown) {
        toast({
            title: "Update Failed",
            description: (error instanceof Error) ? error.message : "Could not update user privileges.",
            variant: "destructive",
        });
    } finally {
        setIsUpdating(false);
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
        <div className="mt-4">
            <h4 className="font-semibold mb-2">Detailed Permissions</h4>
            <p className="text-xs text-muted-foreground mb-4">
                The permissions below are for display purposes to illustrate a full role-based system. Currently, the backend only supports a single "Administrator" role. Toggling the main switch will grant or revoke all permissions.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
                {allPermissions.map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                            id={`${permission}-${userIsAdmin}`}
                            checked={userIsAdmin}
                            disabled={true}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
       <Card>
            <CardHeader>
                <CardTitle>User Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">The user you are trying to manage does not exist.</p>
                 <Button onClick={() => router.push('/admin/users')} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </CardContent>
       </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Button onClick={() => router.push('/admin/users')} variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Users
        </Button>
        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name || user.email} />
                <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">
                    Manage Privileges
                </h1>
                <p className="text-muted-foreground">{user.name} ({user.email})</p>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Administrator Role</CardTitle>
          <CardDescription>Grant or revoke full administrative access for this user.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <label htmlFor="admin-switch" className="text-base font-medium">
                        Administrator Access
                    </label>
                    <p className="text-sm text-muted-foreground">
                        Grants full control over all aspects of the admin panel.
                    </p>
                </div>
                 <div className="flex items-center gap-4">
                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : null}
                        {user.isAdmin ? 'Administrator' : 'Standard User'}
                    </Badge>
                    {isUpdating && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    <Switch
                        id="admin-switch"
                        checked={!!user.isAdmin}
                        onCheckedChange={handlePrivilegeChange}
                        disabled={isUpdating || currentUser?.id === user.id}
                        aria-label="Administrator status toggle"
                    />
                 </div>
            </div>

            <Separator className="my-6" />

            {renderPermissions(!!user.isAdmin)}
        </CardContent>
      </Card>
      
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="flex flex-row items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-1"/>
            <div>
                <CardTitle className="text-amber-900 dark:text-amber-200">A Word of Caution</CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-300">
                    Granting administrator privileges gives a user full access to create, modify, and delete any data in the system. Please assign this role with care.
                </CardDescription>
            </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default UserPrivilegesPage;
