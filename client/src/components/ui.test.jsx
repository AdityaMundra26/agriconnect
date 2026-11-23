import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge, Modal, ConfirmDialog, EmptyState, FormError, Avatar } from './ui.jsx';

describe('StatusBadge', () => {
  test('renders a readable label with the right tone', () => {
    render(<StatusBadge kind="report" value="in_progress" />);
    const badge = screen.getByText('in progress');
    expect(badge).toHaveClass('badge', 'tone-amber');
  });
  test('renders nothing without a value', () => {
    const { container } = render(<StatusBadge kind="order" value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Modal', () => {
  test('is hidden when closed', () => {
    render(<Modal open={false} title="Hidden">body</Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
  test('closes on Escape and on the close button', () => {
    const onClose = vi.fn();
    render(<Modal open title="Edit plot" onClose={onClose}><input aria-label="name" /></Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ConfirmDialog', () => {
  test('confirm and cancel call the right handlers', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete plot?" message="Gone forever" confirmLabel="Delete" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByText('Gone forever')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
  test('disables buttons while busy', () => {
    render(<ConfirmDialog open title="x" message="y" busy onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});

describe('small components', () => {
  test('EmptyState shows title, text and action', () => {
    render(<EmptyState title="No orders yet" action={<button>Browse</button>}>Place one</EmptyState>);
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Place one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse' })).toBeInTheDocument();
  });
  test('FormError renders an alert only with content', () => {
    const { rerender } = render(<FormError>{''}</FormError>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(<FormError>Bad input</FormError>);
    expect(screen.getByRole('alert')).toHaveTextContent('Bad input');
  });
  test('Avatar shows initials', () => {
    render(<Avatar name="Lakshmi Devi" />);
    expect(screen.getByText('LD')).toBeInTheDocument();
  });
});
