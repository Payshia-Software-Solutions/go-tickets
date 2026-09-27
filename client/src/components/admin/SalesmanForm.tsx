"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Salesman, SalesmanFormData } from "@/lib/types";
import { SalesmanFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SalesmanFormProps {
  initialData?: Salesman | null;
  onSubmit: (data: SalesmanFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

export default function SalesmanForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = "Save Salesman",
  onCancel,
}: SalesmanFormProps) {
  const form = useForm<SalesmanFormData>({
    resolver: zodResolver(SalesmanFormSchema),
    defaultValues: {
      name: "",
      code: "",
      phone: "",
      email: "",
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        code: initialData.code || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        status: initialData.status || "active",
        notes: initialData.notes || "",
      });
    } else {
      form.reset({
        name: "",
        code: "",
        phone: "",
        email: "",
        status: "active",
        notes: "",
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Kasun Perera" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salesman Code / ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. SLS-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 0771234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. kasun@gotickets.lk" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes / Details</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes about commission, branch, or performance..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
