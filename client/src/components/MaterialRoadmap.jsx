import { useState } from 'react';
import PropTypes from 'prop-types';
import { materialsData } from '../utils/materialsData';
import './MaterialRoadmap.css';

export default function MaterialRoadmap({ topic }) {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const data = materialsData[topic];

    if (!data) return (
        <div className="roadmap-placeholder">
            <p>Pilih kategori materi untuk melihat roadmap pembelajaran.</p>
        </div>
    );

    const levels = [
        { id: 'fundamental', label: 'Fundamental', icon: '🌱' },
        { id: 'menengah', label: 'Menengah', icon: '🌿' },
        { id: 'pematangan', label: 'Pematangan', icon: '🌳' }
    ];

    return (
        <div className="material-roadmap-container">
            <h3 className="roadmap-title">🗺️ Roadmap: {topic}</h3>

            <div className="roadmap-visual">
                {levels.map((level, index) => (
                    <div key={level.id} className="roadmap-step-wrapper">
                        <button
                            className={`roadmap-step ${selectedLevel === level.id ? 'active' : ''}`}
                            onClick={() => setSelectedLevel(selectedLevel === level.id ? null : level.id)}
                        >
                            <span className="step-icon">{level.icon}</span>
                            <span className="step-label">{level.label}</span>
                        </button>
                        {index < levels.length - 1 && <div className="roadmap-connector"></div>}
                    </div>
                ))}
            </div>

            {selectedLevel && data[selectedLevel] && (
                <div className="level-detail-card animate-fade-in">
                    <div className="detail-header">
                        <h4>{data[selectedLevel].title}</h4>
                        <span className="badge">{selectedLevel.toUpperCase()}</span>
                    </div>
                    <div className="detail-body">
                        <div className="detail-section">
                            <label>📖 Penjelasan</label>
                            <p>{data[selectedLevel].explanation}</p>
                        </div>
                        <div className="detail-grid">
                            <div className="detail-section">
                                <label>📐 Bentuk Umum</label>
                                <code>{data[selectedLevel].generalForm}</code>
                            </div>
                            <div className="detail-section">
                                <label>🧪 Rumus / Konsep</label>
                                <code className="formula">{data[selectedLevel].formula}</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

MaterialRoadmap.propTypes = {
    topic: PropTypes.string
};
