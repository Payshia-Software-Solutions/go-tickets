
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";

const permissionStructure = [
    { feature: "Dashboard", read: true, create: false, update: false, delete: false },
    { feature: "Events", read: true, create: true, update: true, delete: true },
    { feature: "Organizers", read: true, create: true, update: true, delete: true },
    { feature: "Categories", read: true, create: true, update: true, delete: true },
    { feature: "Users", read: true, create: true, update: true, delete: true },
    { feature: "Bookings", read: true, create: false, update: true, delete: true },
    { feature: "Reports", read: true, create: false, update: false, delete: false },
    { feature: "Verification", read: true, create: false, update: false, delete: false },
    { feature: "User Roles", read: true, create: true, update: true, delete: true },
];

const RoleFormSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  description: z.string().optional(),
  permissions: z.record(z.object({
    create: z.boolean().default(false),
    read: z.boolean().default(false),
    update: z.boolean().default(false),
    delete: z.boolean().default(false),
  })),
});

type RoleFormData = z.infer<typeof RoleFormSchema>;

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; }>;
}

interface RoleFormProps {
  initialData?: Role | null;
  onSubmit: (data: RoleFormData) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
}

const getDefaultPermissions = () => {
    const perms: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean; }> = {};
    permissionStructure.forEach(p => {
        perms[p.feature] = { create: false, read: false, update: false, delete: false };
    });
    return perms;
};

export default function RoleForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
}: RoleFormProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: initialData 
      ? { name: initialData.name, description: initialData.description, permissions: initialData.permissions }
      : { name: "", description: "", permissions: getDefaultPermissions() },
  });

  useEffect(() => {
    form.reset(initialData 
      ? { name: initialData.name, description: initialData.description, permissions: initialData.permissions }
      : { name: "", description: "", permissions: getDefaultPermissions() });
  }, [initialData, form]);

  const handleSelectAllForRow = (feature: string, isChecked: boolean) => {
    const currentPerms = form.getValues(`permissions.${feature}`);
    const featureConfig = permissionStructure.find(p => p.feature === feature);
    if (!featureConfig) return;

    form.setValue(`permissions.${feature}`, {
      create: featureConfig.create ? isChecked : currentPerms.create,
      read: featureConfig.read ? isChecked : currentPerms.read,
      update: featureConfig.update ? isChecked : currentPerms.update,
      delete: featureConfig.delete ? isChecked : currentPerms.delete,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Content Editor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe what users with this role can do." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium mb-2">Permissions</h3>
            <p className="text-sm text-muted-foreground mb-4">Select the permissions for this role. The "Administrator" role will automatically have all permissions enabled.</p>
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Feature</TableHead>
                            <TableHead className="text-center">Read</TableHead>
                            <TableHead className="text-center">Create</TableHead>
                            <TableHead className="text-center">Update</TableHead>
                            <TableHead className="text-center">Delete</TableHead>
                            <TableHead className="text-center font-bold">Full Access</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissionStructure.map(({ feature, ...availablePerms }) => {
                             const rowPermissions = form.watch(`permissions.${feature}`);
                             const canHaveFullAccess = availablePerms.create && availablePerms.read && availablePerms.update && availablePerms.delete;
                             const hasFullAccess = canHaveFullAccess && rowPermissions.create && rowPermissions.read && rowPermissions.update && rowPermissions.delete;

                            return (
                                <TableRow key={feature}>
                                    <TableCell className="font-medium">{feature}</TableCell>
                                    {['read', 'create', 'update', 'delete'].map(perm => (
                                        <TableCell key={perm} className="text-center">
                                            {(availablePerms as any)[perm] ? (
                                                <FormField
                                                    control={form.control}
                                                    name={`permissions.${feature}.${perm as 'create' | 'read' | 'update' | 'delete'}`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex justify-center">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : null}
                                        </TableCell>
                                    ))}
                                     <TableCell className="text-center">
                                        {canHaveFullAccess && (
                                            <Checkbox
                                                checked={hasFullAccess}
                                                onCheckedChange={(checked) => handleSelectAllForRow(feature, Boolean(checked))}
                                            />
                                        )}
                                     </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
