import { useState } from 'react';
import PropTypes from 'prop-types';
import './MathTools.css';

// Math Tools Configuration
const MATH_TOOLS = [
    {
        id: 'ruler',
        name: 'Penggaris',
        icon: '📏',
        desc: 'Mengukur panjang garis (cm)',
        color: '#fbbf24'
    },
    {
        id: 'protractor',
        name: 'Busur Derajat',
        icon: '📐',
        desc: 'Mengukur sudut (0°-180°)',
        color: '#60a5fa'
    },
    {
        id: 'compass',
        name: 'Jangka',
        icon: '⭕',
        desc: 'Menggambar lingkaran dengan radius tertentu',
        color: '#34d399'
    },
    {
        id: 'setSquare45',
        name: 'Penggaris Segitiga 45°',
        icon: '🔺',
        desc: 'Sudut 45-45-90 derajat',
        color: '#f472b6'
    },
    {
        id: 'setSquare30',
        name: 'Penggaris Segitiga 30°',
        icon: '🔻',
        desc: 'Sudut 30-60-90 derajat',
        color: '#a78bfa'
    },
];

export default function MathTools({ onSelectTool, onRemoveTool, activeTools = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToolClick = (tool) => {
        if (activeTools.includes(tool.id)) {
            onRemoveTool(tool.id);
        } else {
            onSelectTool(tool.id);
        }
    };

    const isToolActive = (toolId) => activeTools.includes(toolId);

    return (
        <div className="math-tools">
            <button
                className={`math-tools-toggle ${isExpanded ? 'active' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                🧮 Math Tools {isExpanded ? '▲' : '▼'}
            </button>

            {isExpanded && (
                <div className="math-tools-content">
                    <p className="math-tools-desc">
                        Alat ukur matematika interaktif
                    </p>

                    <div className="math-tools-grid">
                        {MATH_TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                className={`math-tool-item ${isToolActive(tool.id) ? 'active' : ''}`}
                                onClick={() => handleToolClick(tool)}
                                title={tool.desc}
                                style={{
                                    '--tool-color': tool.color,
                                    borderColor: isToolActive(tool.id) ? tool.color : undefined
                                }}
                            >
                                <span className="tool-icon">{tool.icon}</span>
                                <span className="tool-name">{tool.name}</span>
                                {isToolActive(tool.id) && (
                                    <span className="tool-active-badge">✓</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="math-tools-hint">
                        <p>💡 Klik untuk menambah/hapus alat dari canvas</p>
                        <p>🔄 Drag untuk memindahkan, scroll corner untuk rotate</p>
                    </div>

                    {activeTools.length > 0 && (
                        <button
                            className="clear-tools-btn"
                            onClick={() => activeTools.forEach(id => onRemoveTool(id))}
                        >
                            🗑️ Hapus Semua Alat
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

MathTools.propTypes = {
    onSelectTool: PropTypes.func.isRequired,
    onRemoveTool: PropTypes.func.isRequired,
    activeTools: PropTypes.arrayOf(PropTypes.string)
};
