import { redirect } from 'next/navigation';

// This page redirects /calls to /calls/history
// to prevent 404 errors from breadcrumb prefetching
export default function CallsRedirect() {
  redirect('/calls/history');
}

