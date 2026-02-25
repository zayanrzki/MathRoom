import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!email || !password) {
            setError('Email dan password harus diisi');
            return;
        }

        if (!validateEmail(email)) {
            setError('Format email tidak valid');
            return;
        }

        setLoading(true);

        if (!supabase) {
            setError('Supabase tidak terhubung. Periksa konfigurasi .env');
            setLoading(false);
            return;
        }

        try {
            // 1. Sign in with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Fetch profile info
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (profileError) throw profileError;

                // Save to localStorage (Keeping legacy support for now)
                localStorage.setItem('userEmail', authData.user.email);
                localStorage.setItem('userName', profileData.name);
                localStorage.setItem('userId', authData.user.id);

                // Redirect to home
                navigate('/');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login gagal. Cek kembali email dan password kamu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Decorative Math Symbols */}
            <div className="math-bg-decoration">
                <span className="math-symbol tan">TAN</span>
                <span className="math-symbol cotan">COTAN</span>
                <span className="math-symbol cos">COS</span>
                <span className="math-symbol secot">SECOT</span>
                <div className="math-x-pattern"></div>
            </div>

            <div className="login-container">
                <div className="login-header">
                    <h1>📐 Math-Room</h1>
                    <p>Silakan login untuk melanjutkan</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="contoh@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? '⏳ Memproses...' : '🚀 Masuk'}
                    </button>
                </form>

                <div className="register-link">
                    Belum punya akun?{' '}
                    <button
                        onClick={() => navigate('/register')}
                        className="link-btn"
                        disabled={loading}
                    >
                        Daftar di sini
                    </button>
                </div>

                <div className="login-footer">
                    <p>💡 Gunakan email yang sama untuk melihat catatan Anda</p>
                </div>
            </div>
        </div>
    );
}
