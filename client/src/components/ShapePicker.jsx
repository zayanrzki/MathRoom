import { useState } from 'react';
import PropTypes from 'prop-types';
import './ShapePicker.css';

// 2D Shapes (Bangun Datar)
const SHAPES_2D = [
    { id: 'square', name: 'Persegi', icon: '⬜', type: '2d' },
    { id: 'rectangle', name: 'Persegi Panjang', icon: '▬', type: '2d' },
    { id: 'circle', name: 'Lingkaran', icon: '⚪', type: '2d' },
    { id: 'triangle', name: 'Segitiga', icon: '△', type: '2d' },
    { id: 'ellipse', name: 'Elips', icon: '⬭', type: '2d' },
    { id: 'rhombus', name: 'Belah Ketupat', icon: '◇', type: '2d' },
    { id: 'trapezoid', name: 'Trapesium', icon: '⏢', type: '2d' },
    { id: 'pentagon', name: 'Segi Lima', icon: '⬠', type: '2d' },
    { id: 'hexagon', name: 'Segi Enam', icon: '⬡', type: '2d' },
];

// 3D Shapes (Bangun Ruang)
const SHAPES_3D = [
    { id: 'cube', name: 'Kubus', icon: '🧊', type: '3d' },
    { id: 'cuboid', name: 'Balok', icon: '📦', type: '3d' },
    { id: 'sphere', name: 'Bola', icon: '🔵', type: '3d' },
    { id: 'cylinder', name: 'Tabung', icon: '🛢️', type: '3d' },
    { id: 'cone', name: 'Kerucut', icon: '🔺', type: '3d' },
    { id: 'pyramid', name: 'Limas', icon: '🔻', type: '3d' },
    { id: 'prism', name: 'Prisma', icon: '📐', type: '3d' },
];

// Composite Shapes (Bangun Ruang + Bangun Datar Internal)
const SHAPES_COMPOSITE = [
    { id: 'cube_diagonal', name: 'Kubus + Diagonal', icon: '🔷', type: 'composite', desc: 'Kubus dengan bidang diagonal' },
    { id: 'cube_cross_section', name: 'Kubus + Irisan', icon: '✂️', type: 'composite', desc: 'Kubus dengan segitiga irisan' },
    { id: 'pyramid_base', name: 'Limas + Alas', icon: '🔺', type: 'composite', desc: 'Limas dengan persegi alas' },
    { id: 'cylinder_circle', name: 'Tabung + Lingkaran', icon: '⭕', type: 'composite', desc: 'Tabung dengan lingkaran internal' },
    { id: 'cone_triangle', name: 'Kerucut + Segitiga', icon: '📐', type: 'composite', desc: 'Kerucut dengan segitiga irisan' },
    { id: 'sphere_circle', name: 'Bola + Lingkaran', icon: '🌐', type: 'composite', desc: 'Bola dengan lingkaran besar' },
    { id: 'prism_triangle', name: 'Prisma + Segitiga', icon: '🔶', type: 'composite', desc: 'Prisma dengan segitiga alas' },
    { id: 'cuboid_rectangle', name: 'Balok + Persegi', icon: '📋', type: 'composite', desc: 'Balok dengan sisi persegi' },
];

export default function ShapePicker({ onSelectShape, brushColor }) {
    const [activeCategory, setActiveCategory] = useState('2d');
    const [isExpanded, setIsExpanded] = useState(false);

    const getShapes = () => {
        switch (activeCategory) {
            case '2d': return SHAPES_2D;
            case '3d': return SHAPES_3D;
            case 'composite': return SHAPES_COMPOSITE;
            default: return SHAPES_2D;
        }
    };

    const shapes = getShapes();

    const handleShapeClick = (shape) => {
        onSelectShape(shape.id, shape.type, brushColor);
    };

    return (
        <div className="shape-picker">
            <button
                className={`shape-toggle-btn ${isExpanded ? 'active' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                🔷 Insert Shape {isExpanded ? '▲' : '▼'}
            </button>

            {isExpanded && (
                <div className="shape-picker-content">
                    {/* Category Tabs */}
                    <div className="shape-category-tabs">
                        <button
                            className={`category-tab ${activeCategory === '2d' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('2d')}
                        >
                            📐 2D
                        </button>
                        <button
                            className={`category-tab ${activeCategory === '3d' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('3d')}
                        >
                            📦 3D
                        </button>
                        <button
                            className={`category-tab ${activeCategory === 'composite' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('composite')}
                        >
                            🔗 Kombinasi
                        </button>
                    </div>

                    {/* Category Description */}
                    <p className="category-desc">
                        {activeCategory === '2d' && 'Bangun Datar'}
                        {activeCategory === '3d' && 'Bangun Ruang'}
                        {activeCategory === 'composite' && 'Bangun Ruang + Bidang Internal'}
                    </p>

                    {/* Shape Grid */}
                    <div className="shape-grid">
                        {shapes.map(shape => (
                            <button
                                key={shape.id}
                                className="shape-item"
                                onClick={() => handleShapeClick(shape)}
                                title={shape.desc || shape.name}
                            >
                                <span className="shape-icon">{shape.icon}</span>
                                <span className="shape-name">{shape.name}</span>
                            </button>
                        ))}
                    </div>

                    <p className="shape-hint">
                        {activeCategory === 'composite'
                            ? 'Shape kombinasi: 3D dengan bidang 2D internal'
                            : 'Klik shape untuk menambahkan ke canvas'}
                    </p>
                </div>
            )}
        </div>
    );
}

ShapePicker.propTypes = {
    onSelectShape: PropTypes.func.isRequired,
    brushColor: PropTypes.string
};

