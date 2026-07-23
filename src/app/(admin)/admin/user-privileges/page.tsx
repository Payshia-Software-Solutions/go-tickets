// This page has been replaced by the new /admin/users/[userId]/privileges page.
// This file can be safely deleted.
import { redirect } from 'next/navigation';

export default function DeprecatedUserPrivilegesPage() {
  redirect('/admin/roles');
  return null;
}
