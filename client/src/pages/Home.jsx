import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import SavedNotesList from '../components/SavedNotesList';
import MaterialRoadmap from '../components/MaterialRoadmap';
import { getMaterialTopics } from '../utils/materialsData';

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
        console.log(`Creating Session: ${topic} - ${difficulty} (${maxStudents} Students)`);

        try {
            // Save session to database
            const response = await fetch(`http://${window.location.hostname}:3001/api/sessions/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomCode: newRoomId,
                    teacherEmail: userEmail,
                    teacherName: userName,
                    topic,
                    difficulty,
                    maxStudents: parseInt(maxStudents),
                    // Problem bank settings
                    enableProblems,
                    problemCount: enableProblems ? parseInt(problemCount) : 0,
                    problemTopics: enableProblems ? problemTopics : [],
                    problemDifficulty: enableProblems ? problemDifficulty : 'Medium'
                }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Session saved to database:', data);

                // Generate problems if enabled
                if (enableProblems) {
                    console.log('🎲 Generating problems...');
                    try {
                        const problemsResponse = await fetch(`http://${window.location.hostname}:3001/api/problems/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: data.sessionId,
                                roomCode: newRoomId,
                                topics: problemTopics,
                                difficulty: problemDifficulty,
                                count: parseInt(problemCount)
                            })
                        });

                        const problemsData = await problemsResponse.json();
                        console.log('✅ Problems generated:', problemsData);
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
            } else {
                console.error('Failed to save session:', data.error);
                // Still navigate even if save fails
                navigate(`/teacher/${newRoomId}`, {
                    state: { topic, difficulty, maxStudents }
                });
            }
        } catch (error) {
            console.error('Error creating session:', error);
            // Still navigate even if API fails
            navigate(`/teacher/${newRoomId}`, {
                state: { topic, difficulty, maxStudents }
            });
        }
    };

    const joinSession = (e) => {
        e.preventDefault();
        console.log("Join Session Clicked", { roomCode, userName });

        if (!roomCode) {
            alert('Please enter room code.');
            return;
        }

        console.log("Connecting socket...");
        socket.connect();

        socket.on('connect', () => {
            console.log("Socket connected:", socket.id);
        });

        console.log("Emitting join_room...");
        socket.emit('join_room', { roomCode, username: userName }, (response) => {
            console.log("Received response from server:", response);
            if (response.status === 'ok') {
                navigate(`/student/${roomCode}`, { state: { username: userName, email: userEmail } });
            } else {
                alert(response.message);
            }
        });
    };

    return (
        <>
            <div className="home-page">
                {/* Decorative Math Symbols */}
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




                                {/* Problem Bank Settings */}
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
                            </form>
                        </div>
                    </div>
                </div>

                {/* Floating Sidebar Toggle Button */}
                <button className="floating-notes-btn home-float-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Buka Panel User">
                    👤
                </button>

                {/* User Sidebar */}
                <div className={`notes-sidebar home-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="notes-sidebar-header">
                        <div className="sidebar-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                                onClick={() => setActiveTab('notes')}
                            >
                                📝 Catatan
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                👤 Profil
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'app' ? 'active' : ''}`}
                                onClick={() => setActiveTab('app')}
                            >
                                📱 App
                            </button>
                        </div>
                        <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>✕</button>
                    </div>

                    <div className="notes-sidebar-content">
                        {activeTab === 'notes' ? (
                            <div className="tab-pane">
                                <h3>📚 Catatan Tersimpan</h3>
                                {userEmail ? (
                                    <SavedNotesList studentEmail={userEmail} />
                                ) : (
                                    <p className="no-student">Silakan login untuk melihat catatan</p>
                                )}
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
                                <div className="app-download-card">
                                    <div className="app-icon-preview">📐</div>
                                    <h4>Aplikasi Math-Room</h4>
                                    <p>Instal aplikasi untuk akses lebih cepat, mode fullscreen, dan pengalaman belajar yang lebih mantap di HP.</p>

                                    <button className="create-btn" onClick={handleInstallApp} style={{ marginTop: '1rem' }}>
                                        📥 Unduh & Instal App
                                    </button>

                                    <div className="app-steps" style={{ marginTop: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                        <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'white' }}>Cara Manual Jika Tombol Tidak Jalan:</p>
                                        <p>1. Klik Titik Tiga (⋮) di pojok Chrome</p>
                                        <p>2. Pilih "Add to Home Screen"</p>
                                        <p>3. Aplikasi siap di menu HP Anda!</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
