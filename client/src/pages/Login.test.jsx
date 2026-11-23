import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders.jsx';
import Login from './Login.jsx';
import { loginUser } from '../api/auth.js';
import { getDemoStatus, enableDemo } from '../api/demo.js';

vi.mock('../api/auth.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  fetchMe: vi.fn(),
  updateMe: vi.fn(),
}));

vi.mock('../api/demo.js', () => ({
  getDemoStatus: vi.fn(),
  enableDemo: vi.fn(),
  disableDemo: vi.fn(),
}));

const demoOn = { enabled: true, toggle: 'public', counts: { users: 11, listings: 26, orders: 108, reports: 22 } };
const demoOff = { enabled: false, toggle: 'public', counts: { users: 0, listings: 0, orders: 0, reports: 0 } };

const user = { id: 1, name: 'Ravi Kumar', email: 'farmer@demo.com', role: 'farmer' };

describe('Login page', () => {
  // Braces matter: returning the mock would make Vitest call it as a teardown hook.
  beforeEach(() => {
    vi.mocked(loginUser).mockReset();
    vi.mocked(getDemoStatus).mockResolvedValue(demoOn);
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

    fireEvent.click(await screen.findByRole('button', { name: /buyer/i }));
    await waitFor(() => expect(loginUser).toHaveBeenCalledWith({ email: 'buyer@demo.com', password: 'demo1234' }));
  });

  test('hides demo logins and offers Load sample data when demo data is off', async () => {
    vi.mocked(getDemoStatus).mockResolvedValue(demoOff);
    vi.mocked(enableDemo).mockResolvedValue(demoOn);
    renderWithProviders(<Login />, { path: '/login' });

    const loadBtn = await screen.findByRole('button', { name: /load sample data/i });
    expect(screen.queryByRole('button', { name: /^buyer$/i })).not.toBeInTheDocument();

    fireEvent.click(loadBtn);
    expect(await screen.findByRole('button', { name: /buyer/i })).toBeInTheDocument();
    expect(enableDemo).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /remove sample data/i })).toBeInTheDocument();
  });

  test('no toggle on the login page when the server restricts it to admins', async () => {
    vi.mocked(getDemoStatus).mockResolvedValue({ ...demoOn, toggle: 'admin' });
    renderWithProviders(<Login />, { path: '/login' });
    await screen.findByRole('button', { name: /buyer/i });
    expect(screen.queryByRole('button', { name: /sample data/i })).not.toBeInTheDocument();
  });
});
