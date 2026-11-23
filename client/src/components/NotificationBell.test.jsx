import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import { listNotifications, markAllNotificationsRead } from '../api/notifications.js';

vi.mock('../api/notifications.js', () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}));

// Fake EventSource so the test can push server events.
class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.closed = false;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  emit(type, data) {
    (this.listeners[type] || []).forEach((fn) => fn({ data: JSON.stringify(data) }));
  }
  close() {
    this.closed = true;
  }
}

function renderBell() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <NotificationBell />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    localStorage.setItem('agriconnect_token', 'tok en');
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [{ id: 1, message: 'Order #1 shipped', type: 'order', is_read: false, created_at: new Date().toISOString() }],
      unread: 1,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('shows the unread count from the API', async () => {
    renderBell();
    expect(await screen.findByLabelText('Notifications (1 unread)')).toBeInTheDocument();
  });

  test('opens a live stream with the encoded token and closes it on unmount', async () => {
    const { unmount } = renderBell();
    await screen.findByLabelText(/Notifications/);
    expect(FakeEventSource.instances[0].url).toMatch(/\/notifications\/stream\?token=tok%20en$/);
    unmount();
    expect(FakeEventSource.instances[0].closed).toBe(true);
  });

  test('a pushed notification bumps the badge, shows a toast and appears in the list', async () => {
    renderBell();
    await screen.findByLabelText('Notifications (1 unread)');

    act(() => {
      FakeEventSource.instances[0].emit('notification', {
        id: 2, message: 'New order #7: 10 kg Tomato', type: 'order', is_read: false, created_at: new Date().toISOString(),
      });
    });

    expect(screen.getByLabelText('Notifications (2 unread)')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('New order #7');

    fireEvent.click(screen.getByLabelText('Notifications (2 unread)'));
    expect(screen.getAllByText('New order #7: 10 kg Tomato').length).toBeGreaterThan(0);
  });

  test('a live event for a notification already loaded is not double-counted', async () => {
    renderBell();
    await screen.findByLabelText('Notifications (1 unread)');
    act(() => {
      FakeEventSource.instances[0].emit('notification', {
        id: 1, message: 'Order #1 shipped', type: 'order', is_read: false, created_at: new Date().toISOString(),
      });
    });
    expect(screen.getByLabelText('Notifications (1 unread)')).toBeInTheDocument();
  });

  test('mark all read clears the badge', async () => {
    renderBell();
    fireEvent.click(await screen.findByLabelText('Notifications (1 unread)'));
    // Opening the popover refreshes from the API; let that settle first.
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2));
    vi.mocked(listNotifications).mockResolvedValue({ notifications: [], unread: 0 });
    fireEvent.click(await screen.findByText(/Mark all read/));
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
    expect(await screen.findByLabelText('Notifications')).toBeInTheDocument();
  });
});
