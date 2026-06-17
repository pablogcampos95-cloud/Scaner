import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import Loading from '../components/Loading.jsx';
import { getCurrentProfile, signIn } from '../services/authService.js';
import { isSupabaseConfigured } from '../services/supabaseClient.js';
import { validateLogin } from '../utils/validations.js';

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    email: isSupabaseConfigured ? '' : 'supervisor@demo.com',
    password: isSupabaseConfigured ? '' : 'demo123',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ loading: true, submitting: false, message: '' });
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getCurrentProfile().then((currentProfile) => {
      setProfile(currentProfile);
      setStatus((prev) => ({ ...prev, loading: false }));
    });
  }, []);

  if (status.loading) return <Loading message="Preparando acceso..." />;
  if (profile) return <Navigate to={profile.role === 'admin' ? '/admin' : '/supervisor'} replace />;

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus({ loading: false, submitting: true, message: '' });
    try {
      const loggedProfile = await signIn(values.email, values.password);
      navigate(loggedProfile.role === 'admin' ? '/admin' : '/supervisor', { replace: true });
    } catch (error) {
      setStatus({ loading: false, submitting: false, message: error.message });
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-copy">
          <Logo size="lg" showText={false} className="login-hero-logo" />
          <span className="eyebrow">ASSESSMENT OPERATIVO CON IA</span>
          <h1>ScanerIA</h1>
          <h2>Evaluación inteligente para perfiles BPO.</h2>
          <p>Precisión, trazabilidad y diagnóstico en un solo entorno.</p>
        </div>

        <form className="form-card login-form" onSubmit={handleSubmit}>
          <div className="form-title centered">
            <span className="login-title-icon" aria-hidden="true">
              <LockKeyhole size={22} />
            </span>
            <div>
              <h2>Iniciar sesión</h2>
              <p>Acceso autorizado.</p>
            </div>
          </div>
          <label>
            Correo
            <input name="email" value={values.email} onChange={handleChange} placeholder="correo@empresa.com" />
            {errors.email ? <small className="field-error">{errors.email}</small> : null}
          </label>
          <label>
            Contraseña
            <input name="password" type="password" value={values.password} onChange={handleChange} placeholder="Contraseña" />
            {errors.password ? <small className="field-error">{errors.password}</small> : null}
          </label>
          {status.message ? <p className="alert error">{status.message}</p> : null}
          <button className="primary-button" type="submit" disabled={status.submitting}>
            {status.submitting ? 'Validando...' : 'Iniciar sesión'}
          </button>
          <p className="demo-note login-note">
            {isSupabaseConfigured
              ? 'Tus datos están protegidos y se usan solo para fines de evaluación.'
              : 'Tus datos están protegidos. Modo local: admin@demo.com o supervisor@demo.com.'}
          </p>
        </form>
      </section>
      <span className="brand-watermark">IA Learning Solutions</span>
    </main>
  );
}
