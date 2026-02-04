import { useState } from 'react';
import PropTypes from 'prop-types';

export default function NoteViewer({ note, onClose }) {
    const [zoom, setZoom] = useState(1);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = note.canvas_data;
        link.download = `${note.title}.png`;
        link.click();
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.2, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.2, 0.5));
    };

    return (
        <div className="note-viewer-backdrop" onClick={onClose}>
            <div className="note-viewer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="viewer-header">
                    <div className="viewer-title">
                        <h3>{note.title}</h3>
                        <p>📚 Room: {note.room_code} • 🕒 {new Date(note.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <button className="btn-close-viewer" onClick={onClose}>✕</button>
                </div>

                <div className="viewer-toolbar">
                    <button onClick={handleZoomOut} disabled={zoom <= 0.5}>🔍−</button>
                    <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} disabled={zoom >= 3}>🔍+</button>
                    <button onClick={handleDownload} className="btn-download">💾 Download</button>
                </div>

                <div className="viewer-content">
                    <div className="viewer-image-container">
                        <img
                            src={note.canvas_data}
                            alt={note.title}
                            style={{ transform: `scale(${zoom})` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

NoteViewer.propTypes = {
    note: PropTypes.shape({
        id: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
        room_code: PropTypes.string.isRequired,
        canvas_data: PropTypes.string.isRequired,
        created_at: PropTypes.string.isRequired
    }).isRequired,
    onClose: PropTypes.func.isRequired
};
