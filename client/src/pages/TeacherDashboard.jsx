import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { API_URL } from '../config/api';
import MiniCanvas from '../components/MiniCanvas';
import { TeacherVideoView, TeacherAudioPlayer } from '../components/VideoStream';
import '../components/VideoStream.css';

export default function TeacherDashboard() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [students, setStudents] = useState([]);
    const [studentScores, setStudentScores] = useState({});
    const [activeTab, setActiveTab] = useState('whiteboard'); // 'whiteboard' or 'scores'
    const [drawings, setDrawings] = useState({}); // Track student drawings
    const [viewMode, setViewMode] = useState('canvas'); // 'canvas' or 'camera'
    const [studentCameraStatus, setStudentCameraStatus] = useState({}); // Track who has camera on // Track student drawings

    // Get room settings from navigation state
    const roomSettings = location.state || {};
    const { topic = '', difficulty = '', maxStudents = 30, enableProblems = false, problemCount = 0 } = roomSettings;

    const leaveSession = async () => {
        if (confirm("Are you sure you want to end the session?")) {
            try {
                const response = await fetch(`${API_URL}/api/sessions/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomCode: roomId,
                        totalStudents: students.length
                    }),
                });
            } catch (error) {
                console.error('Error ending session:', error);
            }

            socket.disconnect();
            navigate('/');
        }
    };

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const joinRoom = () => {
            socket.emit('join_room', {
                roomCode: roomId,
                isTeacher: true,
                maxStudents: parseInt(maxStudents),
                topic,
                difficulty
            });
            console.log('📢 Teacher joining room:', roomId);
        };

        // Setup listeners
        socket.on('connect', joinRoom);

        // Join immediately if already connected
        if (socket.connected) {
            joinRoom();
        }

        socket.on('user_joined', (data) => {
            setStudents((prev) => {
                if (prev.some(s => s.id === data.id)) return prev;
                return [...prev, data];
            });
        });

        socket.on('user_left', (data) => {
            setStudents((prev) => prev.filter(s => s.id !== data.id));
        });

        socket.on('existing_students', (studentsArray) => {
            setStudents(studentsArray);
        });

        socket.on('score_updated', (data) => {
            setStudentScores(prev => {
                const current = prev[data.studentEmail] || {
                    correct: 0,
                    total: 0,
                    answeredProblems: new Set(),
                    name: data.studentName
                };

                if (!current.answeredProblems.has(data.problemNumber)) {
                    const newAnsweredProblems = new Set(current.answeredProblems);
                    newAnsweredProblems.add(data.problemNumber);

                    return {
                        ...prev,
                        [data.studentEmail]: {
                            name: data.studentName,
                            correct: current.correct + (data.isCorrect ? 1 : 0),
                            total: current.total + 1,
                            answeredProblems: newAnsweredProblems
                        }
                    };
                }
                return prev;
            });
        });

        // Listen for drawing updates from students
        socket.on('drawing_UPDATE', (data) => {
            console.log("Teacher received drawing from", data.userId, data);
            // Accumulate strokes in array per student
            setDrawings(prev => ({
                ...prev,
                [data.userId]: [...(prev[data.userId] || []), data.path]
            }));
        });

        // Join room
        socket.emit('join_room', {
            roomCode: roomId,
            isTeacher: true,
            maxStudents: parseInt(maxStudents),
            topic,
            difficulty
        });

        // Listen for camera status changes
        socket.on('student_camera_status', (data) => {
            setStudentCameraStatus(prev => ({
                ...prev,
                [data.studentId]: data.isEnabled
            }));
        });

        return () => {
            socket.off('user_joined');
            socket.off('user_left');
            socket.off('existing_students');
            socket.off('score_updated');
            socket.off('drawing_UPDATE');
            socket.off('connect');
            socket.off('student_camera_status');
        };
    }, [roomId, maxStudents, topic, difficulty]);

    return (
        <div className="dashboard-container">
            {/* Dynamic Theme Background */}
            <div className="math-bg-decoration dashboard-bg">
                <span className="math-symbol tan">∑</span>
                <span className="math-symbol cotan">∫</span>
                <span className="math-symbol cos">π</span>
                <span className="math-symbol secot">∞</span>
                <span className="math-symbol tan" style={{ top: '60%', left: '80%' }}>√</span>
                <span className="math-symbol cos" style={{ top: '30%', left: '70%' }}>∂</span>
                <div className="math-x-pattern"></div>
            </div>

            <div className="dashboard-content">
                <div className="header-actions">
                    <div>
                        <h2>Teacher Dashboard: {roomId}</h2>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <span>📚 {topic || 'General'}</span>
                            <span className={students.length >= maxStudents ? 'capacity-full' : 'capacity-ok'}>
                                👥 {students.length}/{maxStudents} students
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {enableProblems && (
                            <div className="tab-switcher" style={{ marginBottom: 0 }}>
                                <button
                                    className={`tab-btn ${activeTab === 'whiteboard' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('whiteboard')}
                                >
                                    🖼️ Whiteboard
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'scores' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('scores')}
                                >
                                    🏆 Skor Siswa
                                </button>
                            </div>
                        )}
                        <button onClick={leaveSession} className="leave-btn">Current Session: End</button>
                    </div>
                </div>

                <div className={`grid-container ${activeTab === 'scores' ? 'score-view' : ''}`}>
                    {activeTab === 'whiteboard' ? (
                        students.length === 0 ? (
                            <p>Waiting for students to join...</p>
                        ) : (
                            students.map((student) => (
                                <div
                                    key={student.id}
                                    className="student-card"
                                    onClick={() => {
                                        navigate(`/student/${roomId}?viewer=true&studentName=${encodeURIComponent(student.username)}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="student-info">
                                        <h4>{student.username}</h4>
                                        <div className="status-indicator">
                                            <span className="status-dot online"></span>
                                            <span className="status-text">Online</span>
                                            {studentCameraStatus[student.id] && (
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>📹</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View Mode Toggle */}
                                    <div className="view-mode-toggle">
                                        <button
                                            className={`view-mode-btn ${viewMode === 'canvas' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); setViewMode('canvas'); }}
                                        >
                                            ✏️ Canvas
                                        </button>
                                        <button
                                            className={`view-mode-btn ${viewMode === 'camera' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); setViewMode('camera'); }}
                                        >
                                            📹 Camera
                                        </button>
                                    </div>

                                    <div className="mini-canvas-wrapper">
                                        {viewMode === 'canvas' ? (
                                            <MiniCanvas strokes={drawings[student.id]} />
                                        ) : (
                                            <TeacherVideoView
                                                studentId={student.id}
                                                studentName={student.username}
                                            />
                                        )}
                                    </div>

                                    {/* Audio Player for this student */}
                                    <TeacherAudioPlayer
                                        studentId={student.id}
                                        studentName={student.username}
                                    />

                                    <div className="card-hover-hint">👁️ Click to view canvas</div>
                                </div>
                            ))
                        )
                    ) : (
                        <div className="score-dashboard" style={{ width: '100%', maxWidth: '1000px', margin: '2rem auto' }}>
                            <div className="score-summary-header">
                                <h3>📊 Live Score Leaderboard</h3>
                                <p>Total Soal: {problemCount}</p>
                            </div>

                            <div className="scores-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                                {students.length === 0 ? (
                                    <p>Belum ada siswa yang join.</p>
                                ) : (
                                    students.map((student) => {
                                        const score = Object.values(studentScores).find(s => s.name === student.username) || { correct: 0, total: 0 };
                                        const progress = (score.total / problemCount) * 100;
                                        const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

                                        return (
                                            <div key={student.id} className="score-row">
                                                <div className="score-user-info">
                                                    <div className="user-avatar">{student.username[0].toUpperCase()}</div>
                                                    <div className="user-details">
                                                        <h4>{student.username}</h4>
                                                        <span>Online</span>
                                                    </div>
                                                </div>

                                                <div className="score-stats">
                                                    <div className="stat-item">
                                                        <span className="stat-label">Progress</span>
                                                        <span className="stat-value">{score.total} / {problemCount}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Benar</span>
                                                        <span className="stat-value" style={{ color: 'var(--primary-green)' }}>{score.correct}</span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-label">Akurasi</span>
                                                        <span className="stat-value">{accuracy}%</span>
                                                    </div>
                                                </div>

                                                <div className="score-progress-bar">
                                                    <div className="progress-bg">
                                                        <div
                                                            className="progress-fill"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
