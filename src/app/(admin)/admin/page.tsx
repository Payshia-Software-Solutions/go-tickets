
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard');
  // This component will not render anything as redirect happens server-side
  // or client-side before rendering.
  // return null; // Or some minimal JSX if redirect doesn't happen immediately on server
}
