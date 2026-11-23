import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <EmptyState
        icon={MapPinOff}
        title="Page not found"
        action={<Link to="/" className="btn">Back to home</Link>}
      >
        The page you're looking for doesn't exist or has moved.
      </EmptyState>
    </div>
  );
}
