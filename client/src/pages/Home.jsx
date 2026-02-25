import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { socket } from '../socket';
import SavedNotesList from '../components/SavedNotesList';
import MaterialRoadmap from '../components/MaterialRoadmap';
import { getMaterialTopics } from '../utils/materialsData';
import { API_URL } from '../config/api';

export default function Home() {
    const [roomCode, setRoomCode] = useState('');
    const [maxStudents, setMaxStudents] = useState(42);
    const [topic, setTopic] = useState('Operasi Bilangan Real');
    const [difficulty] = useState('Roadmap');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('notes');
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    // Problem Bank Settings
    const [enableProblems, setEnableProblems] = useState(false);
    const [problemCount, setProblemCount] = useState(5);
    const [problemTopics, setProblemTopics] = useState(['Persamaan Kuadrat']);
    const [problemDifficulty, setProblemDifficulty] = useState('Medium');

    const navigate = useNavigate();

    // Get user info from localStorage
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    useEffect(() => {
        // Auto-open sidebar with user's notes
        if (userEmail) {
            setSidebarOpen(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, [userEmail]);

    const handleInstallApp = async () => {
        if (!deferredPrompt) {
            alert('Fitur instalasi otomatis tidak didukung oleh browser Anda saat ini. \n\nSilakan klik Titik Tiga (⋮) di pojok Chrome lalu pilih "Install App" atau "Tambahkan ke Layar Utama" (Add to Home Screen).');
            return;
        }

        if (confirm('Ingin mengunduh & menginstal aplikasi Math-Room di HP Anda?')) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            setDeferredPrompt(null);
        }
    };

    const handleLogout = () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            navigate('/login');
        }
    };

    const createSession = async (e) => {
        e.preventDefault();
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log(`Creating Session in Supabase: ${topic}`);

        try {
            if (!supabase) throw new Error('Supabase not connected');

            // 1. Save session to Supabase
            const { data, error: sessionError } = await supabase
                .from('sessions')
                .insert([
                    {
                        room_code: newRoomId,
                        teacher_email: userEmail,
                        teacher_name: userName,
                        topic,
                        difficulty,
                        max_students: parseInt(maxStudents),
                        status: 'active'
                    }
                ])
                .select()
                .single();

            if (sessionError) throw sessionError;

            // 2. Generate problems if enabled
            if (enableProblems) {
                console.log('🎲 Generating problems...');
                try {
                    await fetch(`${API_URL}/api/problems/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: data.id,
                            roomCode: newRoomId,
                            topics: problemTopics,
                            difficulty: problemDifficulty,
                            count: parseInt(problemCount)
                        })
                    });
                } catch (err) {
                    console.error('Failed to generate problems:', err);
                }
            }

            navigate(`/teacher/${newRoomId}`, {
                state: {
                    topic,
                    difficulty,
                    maxStudents,
                    enableProblems,
                    problemCount: enableProblems ? problemCount : 0
                }
            });

        } catch (error) {
            console.error('Error creating session:', error);
            // Fallback navigation
            navigate(`/teacher/${newRoomId}`, {
                state: { topic, difficulty, maxStudents }
            });
        }
    };

    const createSelfSession = async () => {
        const newRoomId = "ME-" + Math.random().toString(36).substring(2, 6).toUpperCase();
        console.log(`Creating Self Session in Supabase: ${newRoomId}`);

        try {
            if (!supabase) throw new Error('Supabase not connected');

            const { error: sessionError } = await supabase
                .from('sessions')
                .insert([
                    {
                        room_code: newRoomId,
                        teacher_email: userEmail,
                        teacher_name: userName,
                        topic: 'Latihan Mandiri',
                        difficulty: 'Personal',
                        max_students: 1,
                        status: 'active'
                    }
                ]);

            if (sessionError) throw sessionError;

            navigate(`/student/${newRoomId}`, { state: { username: userName, email: userEmail } });
        } catch (error) {
            console.error('Error creating self session:', error);
            navigate(`/student/${newRoomId}`, { state: { username: userName, email: userEmail } });
        }
    };

    const joinSession = (e) => {
        e.preventDefault();
        if (!roomCode) {
            alert('Please enter room code.');
            return;
        }

        socket.connect();
        socket.emit('join_room', { roomCode, username: userName }, (response) => {
            if (response.status === 'ok') {
                navigate(`/student/${roomCode}`, { state: { username: userName, email: userEmail } });
            } else {
                alert(response.message);
            }
        });
    };

    return (
        <div className="home-page">
            <div className="math-bg-decoration home-bg">
                <span className="math-symbol tan">π</span>
                <span className="math-symbol cotan">∞</span>
                <span className="math-symbol cos">√</span>
                <span className="math-symbol secot">Δ</span>
                <div className="math-x-pattern"></div>
            </div>

            <div className="home-content">
                <h1 className="home-title">📐 Math-Room</h1>
                <p className="home-subtitle">Platform Pembelajaran Matematika Interaktif</p>

                <div className="cards-wrapper">
                    <div className="home-card teacher-card">
                        <div className="card-header">
                            <span className="card-icon">👨‍🏫</span>
                            <h2>Guru</h2>
                        </div>
                        <form onSubmit={createSession} className="session-form">
                            <div className="form-group">
                                <label>📚 Kategori Materi</label>
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                >
                                    {getMaterialTopics().map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <MaterialRoadmap topic={topic} />

                            <div className="form-group">
                                <label>👥 Jumlah Siswa (Max 42)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="42"
                                    value={maxStudents}
                                    onChange={(e) => setMaxStudents(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={enableProblems}
                                        onChange={(e) => setEnableProblems(e.target.checked)}
                                    />
                                    <span>🎯 Aktifkan Bank Soal</span>
                                </label>
                            </div>

                            {enableProblems && (
                                <>
                                    <div className="form-group">
                                        <label>📚 Topik Soal</label>
                                        <select
                                            value={problemTopics[0]}
                                            onChange={(e) => setProblemTopics([e.target.value])}
                                        >
                                            <option value="Operasi Bilangan Real">Operasi Bilangan Real</option>
                                            <option value="Persamaan Kuadrat">Persamaan Kuadrat</option>
                                            <option value="SPLDV">Sistem Persamaan Linear 2 Variabel</option>
                                            <option value="SPLTV">Sistem Persamaan Linear 3 Variabel</option>
                                            <option value="Barisan dan Deret">Barisan dan Deret</option>
                                            <option value="Trigonometri">Trigonometri</option>
                                            <option value="Matriks">Matriks</option>
                                            <option value="Fungsi Invers">Fungsi Invers</option>
                                            <option value="Komposisi Fungsi">Komposisi Fungsi</option>
                                            <option value="Persamaan Lingkaran">Persamaan Lingkaran</option>
                                            <option value="Peluang">Peluang</option>
                                            <option value="Statistika">Statistika</option>
                                            <option value="Limit Fungsi">Limit Fungsi</option>
                                            <option value="Diferensial">Diferensial</option>
                                            <option value="Integral">Integral</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>📊 Tingkat Kesulitan Soal</label>
                                        <select
                                            value={problemDifficulty}
                                            onChange={(e) => setProblemDifficulty(e.target.value)}
                                        >
                                            <option value="Easy">Easy (Dasar)</option>
                                            <option value="Medium">Medium (Menengah)</option>
                                            <option value="Hard">Hard (Sulit)</option>
                                            <option value="Expert">Expert (Olimpiade)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>🔢 Jumlah Soal</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={problemCount}
                                            onChange={(e) => setProblemCount(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <button type="submit" className="create-btn">🚀 Buat Sesi Kelas</button>
                            <button
                                type="button"
                                onClick={() => navigate('/history')}
                                className="history-btn"
                            >
                                📊 Riwayat Sesi
                            </button>
                        </form>
                    </div>

                    <div className="home-card student-card">
                        <div className="card-header">
                            <span className="card-icon">🎓</span>
                            <h2>Siswa</h2>
                        </div>
                        <form onSubmit={joinSession} className="session-form">
                            <div className="form-group">
                                <label>🔑 Kode Ruangan</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan kode ruangan"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <button type="submit" className="join-btn">🚪 Gabung Sesi</button>
                            <div style={{ textAlign: 'center', margin: '1rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Atau</div>
                            <button
                                type="button"
                                className="create-btn"
                                onClick={createSelfSession}
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                                ✨ Buat Sesi Mandiri
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <button className="floating-notes-btn home-float-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                👤
            </button>

            <div className={`notes-sidebar home-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="notes-sidebar-header">
                    <div className="sidebar-tabs">
                        <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>📝 Catatan</button>
                        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profil</button>
                        <button className={`tab-btn ${activeTab === 'app' ? 'active' : ''}`} onClick={() => setActiveTab('app')}>📱 App</button>
                    </div>
                    <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                </div>

                <div className="notes-sidebar-content">
                    {activeTab === 'notes' ? (
                        <div className="tab-pane">
                            <h3>📚 Catatan Tersimpan</h3>
                            {userEmail ? <SavedNotesList studentEmail={userEmail} /> : <p className="no-student">Silakan login untuk melihat catatan</p>}
                        </div>
                    ) : activeTab === 'profile' ? (
                        <div className="tab-pane profile-pane">
                            <h3>👤 Profil Pengguna</h3>
                            <div className="profile-card">
                                <div className="profile-avatar">👤</div>
                                <div className="profile-info">
                                    <p className="profile-name">{userName}</p>
                                    <p className="profile-email">{userEmail}</p>
                                </div>
                                <button className="logout-btn-sidebar" onClick={handleLogout}>🚪 Logout</button>
                            </div>
                        </div>
                    ) : (
                        <div className="tab-pane app-pane">
                            <h3>📱 Mobile App</h3>
                            <button className="create-btn" onClick={handleInstallApp}>📥 Unduh & Instal App</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
