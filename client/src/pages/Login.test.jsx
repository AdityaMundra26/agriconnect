import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders.jsx';
import Login from './Login.jsx';
import { loginUser } from '../api/auth.js';

vi.mock('../api/auth.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  fetchMe: vi.fn(),
  updateMe: vi.fn(),
}));

const user = { id: 1, name: 'Ravi Kumar', email: 'farmer@demo.com', role: 'farmer' };

describe('Login page', () => {
  // Braces matter: returning the mock would make Vitest call it as a teardown hook.
  beforeEach(() => {
    vi.mocked(loginUser).mockReset();
  });

  test('logs in, stores the token and navigates to the dashboard', async () => {
    vi.mocked(loginUser).mockResolvedValue({ user, token: 'jwt-123' });
    renderWithProviders(<Login />, { path: '/login', extraRoutes: { '/dashboard': <p>Dashboard page</p> } });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'farmer@demo.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'demo1234' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(loginUser).toHaveBeenCalledWith({ email: 'farmer@demo.com', password: 'demo1234' });
    expect(localStorage.getItem('agriconnect_token')).toBe('jwt-123');
  });

  test('shows the server error on bad credentials', async () => {
    // Shaped like an AxiosError: an Error carrying the HTTP response.
    const axiosError = Object.assign(new Error('Request failed with status code 401'), {
      response: { status: 401, data: { error: 'Invalid email or password' } },
    });
    vi.mocked(loginUser).mockRejectedValue(axiosError);
    renderWithProviders(<Login />, { path: '/login' });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(localStorage.getItem('agriconnect_token')).toBeNull();
  });

  test('demo buttons log in with the demo credentials', async () => {
    vi.mocked(loginUser).mockResolvedValue({ user: { ...user, role: 'buyer' }, token: 't' });
    renderWithProviders(<Login />, { path: '/login', extraRoutes: { '/dashboard': <p>Dashboard page</p> } });

    fireEvent.click(screen.getByRole('button', { name: /buyer/i }));
    await waitFor(() => expect(loginUser).toHaveBeenCalledWith({ email: 'buyer@demo.com', password: 'demo1234' }));
  });
});
