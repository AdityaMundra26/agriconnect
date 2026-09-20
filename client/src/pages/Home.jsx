import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page hero">
      <h1>AgriConnect</h1>
      <p>Smart crop advisory and a farm-to-market marketplace, in one platform.</p>
      <div className="cta">
        <Link to="/register" className="button">Get started</Link>
        <Link to="/login" className="button secondary">Log in</Link>
      </div>
    </div>
  );
}
