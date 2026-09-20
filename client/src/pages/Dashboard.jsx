import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>
      <p>
        This is the dashboard shell. Farm profile summaries, crop advisory,
        and analytics widgets will be wired up here as those API modules
        are implemented.
      </p>
    </div>
  );
}
