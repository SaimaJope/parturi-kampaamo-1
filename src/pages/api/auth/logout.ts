/** Admin logout. Clears session cookies and returns to the login page. */
import type { APIRoute } from 'astro';
import { clearAuthCookies } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  clearAuthCookies(cookies);
  return redirect('/admin/login', 303);
};
