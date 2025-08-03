// This page has been replaced by the new /admin/users/[userId]/privileges page.
// This file can be safely deleted.
import { redirect } from 'next/navigation';

export default function DeprecatedUserRolesPage() {
  redirect('/admin/users');
  return null;
}
