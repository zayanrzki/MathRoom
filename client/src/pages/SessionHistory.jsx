import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';


export default function SessionHistory() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        totalStudents: 0,
        totalDuration: 0
    });

    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    useEffect(() => {
        if (!userEmail) {
            navigate('/login');
            return;
        }

        fetchHistory();
    }, [userEmail, navigate]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/sessions/history/${userEmail}`);
            const data = await response.json();

            if (response.ok) {
                setSessions(data.sessions);

                // Calculate stats
                const totalStudents = data.sessions.reduce((sum, s) => sum + (s.total_students || 0), 0);
                const totalDuration = data.sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

                setStats({
                    total: data.total,
                    totalStudents,
                    totalDuration
                });
            } else {
                setError(data.error || 'Failed to fetch history');
            }
        } catch (err) {
            console.error('Fetch history error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusBadge = (status) => {
        if (status === 'active') {
            return <span className="status-badge status-active">🟢 Active</span>;
        }
        return <span className="status-badge status-ended">⚫ Ended</span>;
    };

    return (
        <div className="login-page history-page">
            {/* Decorative Math Symbols */}
            <div className="math-bg-decoration">
                <span className="math-symbol tan">📊</span>
                <span className="math-symbol cotan">📈</span>
                <span className="math-symbol cos">∑</span>
                <span className="math-symbol secot">∫</span>
                <div className="math-x-pattern"></div>
            </div>

            <div className="login-container history-container">
                <div className="login-header history-header-anim">
                    <h1>📊 Riwayat Sesi</h1>
                    <p>Guru: {userName}</p>
                </div>

                <button onClick={() => navigate('/')} className="back-btn-animated">
                    ← Kembali ke Beranda
                </button>

                {/* Stats Cards */}
                <div className="stats-grid-animated">
                    <div className="stat-card-glass" style={{ animationDelay: '0.1s' }}>
                        <div className="stat-icon-glow">📚</div>
                        <div className="stat-content">
                            <div className="stat-value-animated">{stats.total}</div>
                            <div className="stat-label">Total Sesi</div>
                        </div>
                    </div>
                    <div className="stat-card-glass" style={{ animationDelay: '0.2s' }}>
                        <div className="stat-icon-glow">👥</div>
                        <div className="stat-content">
                            <div className="stat-value-animated">{stats.totalStudents}</div>
                            <div className="stat-label">Total Siswa</div>
                        </div>
                    </div>
                    <div className="stat-card-glass" style={{ animationDelay: '0.3s' }}>
                        <div className="stat-icon-glow">⏱️</div>
                        <div className="stat-content">
                            <div className="stat-value-animated">{formatDuration(stats.totalDuration)}</div>
                            <div className="stat-label">Total Durasi</div>
                        </div>
                    </div>
                </div>

                {/* Sessions Table */}
                <div className="sessions-section-glass">
                    <h2>📋 Sesi Terbaru</h2>

                    {loading && (
                        <div className="loading-state-animated">
                            <div className="spinner-pulse"></div>
                            <p>Memuat riwayat...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    {!loading && !error && sessions.length === 0 && (
                        <div className="empty-state-animated">
                            <div className="empty-icon-bounce">📭</div>
                            <h3>Belum Ada Sesi</h3>
                            <p>Buat sesi pertama Anda untuk melihatnya di sini!</p>
                            <button onClick={() => navigate('/')} className="login-btn">
                                🚀 Buat Sesi Baru
                            </button>
                        </div>
                    )}

                    {!loading && !error && sessions.length > 0 && (
                        <div className="sessions-table-glass">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Topik</th>
                                        <th>Level</th>
                                        <th>Siswa</th>
                                        <th>Durasi</th>
                                        <th>Mulai</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session, index) => (
                                        <tr key={session.id} className="table-row-slide" style={{ animationDelay: `${0.05 * index}s` }}>
                                            <td className="room-code-glow">{session.room_code}</td>
                                            <td>{session.topic || '-'}</td>
                                            <td>
                                                <span className={`difficulty-badge difficulty-${session.difficulty?.toLowerCase()}`}>
                                                    {session.difficulty || 'Medium'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="student-count-badge">
                                                    {session.total_students || 0}/{session.max_students}
                                                </span>
                                            </td>
                                            <td>{formatDuration(session.duration_minutes)}</td>
                                            <td className="date-cell">{formatDate(session.started_at)}</td>
                                            <td>{getStatusBadge(session.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
