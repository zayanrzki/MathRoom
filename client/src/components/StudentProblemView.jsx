import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { API_URL } from '../config/api';


export default function StudentProblemView({ roomId, studentEmail, studentName }) {
    const [problems, setProblems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [answeredIds, setAnsweredIds] = useState(new Set());
    const [scores, setScores] = useState({ correct: 0, total: 0 });
    const [showResult, setShowResult] = useState(null); // { isCorrect, correctAnswer }

    useEffect(() => {
        fetchProblems();
    }, [roomId]);

    const fetchProblems = async () => {
        try {
            const response = await fetch(`${API_URL}/api/problems/${roomId}`);
            const data = await response.json();
            if (data.success) {
                setProblems(data.problems);
            }
        } catch (err) {
            console.error("Error fetching problems:", err);
        } finally {
            setLoading(false);
        }
    };

    const currentProblem = problems[currentIndex];

    const handleSubmit = async () => {
        if (!selectedAnswer || answeredIds.has(currentProblem.id)) return;

        try {
            const response = await fetch(`${API_URL}/api/problems/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    problemId: currentProblem.id,
                    studentEmail,
                    studentName,
                    selectedAnswer,
                    scratchCanvas: "" // Kita bisa kirim screenshot canvas jika perlu
                })
            });

            const data = await response.json();
            if (data.success) {
                setAnsweredIds(new Set([...answeredIds, currentProblem.id]));
                setShowResult({ isCorrect: data.isCorrect, correctAnswer: data.correctAnswer });
                setScores(prev => ({
                    total: prev.total + 1,
                    correct: prev.correct + (data.isCorrect ? 1 : 0)
                }));

                // Emit ke socket agar guru tahu secara real-time
                socket.emit('answer_submitted', {
                    roomCode: roomId,
                    studentName,
                    studentEmail,
                    isCorrect: data.isCorrect,
                    problemNumber: currentIndex + 1
                });
            }
        } catch (err) {
            console.error("Error submitting answer:", err);
        }
    };

    if (loading) return <div className="problem-loading">Memuat soal...</div>;
    if (problems.length === 0) return <div className="no-problems">Tidak ada soal yang ditugaskan di ruangan ini.</div>;

    return (
        <div className="student-problem-container">
            <div className="problem-card">
                <div className="problem-header">
                    <span className="problem-number">Soal {currentIndex + 1} dari {problems.length}</span>
                    <span className="problem-topic">{currentProblem.topic}</span>
                </div>

                <div className="problem-body">
                    <p className="question-text">{currentProblem.question_text}</p>

                    <div className="options-grid">
                        {['A', 'B', 'C', 'D'].map((opt) => (
                            <button
                                key={opt}
                                className={`option-btn ${selectedAnswer === opt ? 'selected' : ''} 
                                    ${answeredIds.has(currentProblem.id) ? 'disabled' : ''}
                                    ${showResult && opt === showResult.correctAnswer ? 'correct-highlight' : ''}
                                    ${showResult && !showResult.isCorrect && selectedAnswer === opt ? 'wrong-highlight' : ''}
                                `}
                                onClick={() => !answeredIds.has(currentProblem.id) && setSelectedAnswer(opt)}
                                disabled={answeredIds.has(currentProblem.id)}
                            >
                                <span className="opt-letter">{opt}</span>
                                <span className="opt-content">{currentProblem[`option_${opt.toLowerCase()}`]}</span>
                            </button>
                        ))}
                    </div>

                    {showResult && (
                        <div className={`result-feedback ${showResult.isCorrect ? 'correct' : 'wrong'}`}>
                            {showResult.isCorrect ? '✅ Jawaban Kamu Benar!' : `❌ Jawaban Kurang Tepat. (Kunci: ${showResult.correctAnswer})`}
                            <p className="explanation"><b>Penjelasan:</b> {currentProblem.explanation}</p>
                        </div>
                    )}

                    {!answeredIds.has(currentProblem.id) ? (
                        <button
                            className="submit-answer-btn"
                            disabled={!selectedAnswer}
                            onClick={handleSubmit}
                        >
                            🚀 Kirim Jawaban
                        </button>
                    ) : (
                        <div className="nav-buttons">
                            {currentIndex < problems.length - 1 && (
                                <button
                                    className="next-prob-btn"
                                    onClick={() => {
                                        setCurrentIndex(currentIndex + 1);
                                        setSelectedAnswer(null);
                                        setShowResult(null);
                                    }}
                                >
                                    Soal Berikutnya ➡️
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="student-score-summary">
                Skor: <b>{scores.correct} / {problems.length}</b>
            </div>
        </div>
    );
}
