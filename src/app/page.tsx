import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to the AI Client Care dashboard
  redirect('/dashboard');
}
