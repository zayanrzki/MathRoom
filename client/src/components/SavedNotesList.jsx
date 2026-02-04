import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { API_URL } from '../config/api';


export default function SavedNotesList({ studentEmail }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentEmail) {
            fetchNotes();
        }
    }, [studentEmail]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/notes/${encodeURIComponent(studentEmail)}`);
            const data = await response.json();

            if (data.success) {
                setNotes(data.notes);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewNote = async (noteId) => {
        try {
            const response = await fetch(`${API_URL}/api/notes/view/${noteId}`);
            const data = await response.json();

            if (data.success && data.note.canvas_data) {
                // Open image in new tab - simple and clear!
                const newTab = window.open();
                newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${data.note.title} - Math Room</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                background: #0f172a;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                min-height: 100vh;
                                font-family: 'Inter', sans-serif;
                                color: white;
                            }
                            .header {
                                background: rgba(30, 41, 59, 0.7);
                                backdrop-filter: blur(10px);
                                padding: 1.5rem 2rem;
                                border-radius: 20px;
                                border: 1px solid rgba(255,255,255,0.1);
                                margin-bottom: 25px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                width: 100%;
                                max-width: 1000px;
                                box-sizing: border-box;
                            }
                            .title-area h1 {
                                margin: 0;
                                font-size: 1.5rem;
                                color: #f8fafc;
                            }
                            .meta {
                                color: #94a3b8;
                                font-size: 0.9rem;
                                margin-top: 4px;
                            }
                            .download-btn {
                                background: #10b981;
                                color: white;
                                text-decoration: none;
                                padding: 12px 24px;
                                border-radius: 12px;
                                font-weight: 600;
                                transition: all 0.2s;
                                cursor: pointer;
                                border: none;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            }
                            .download-btn:hover {
                                background: #059669;
                                transform: translateY(-2px);
                            }
                            .img-container {
                                background: white;
                                padding: 20px;
                                border-radius: 20px;
                                box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                                max-width: 100%;
                                line-height: 0;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="title-area">
                                <h1>📝 ${data.note.title}</h1>
                                <div class="meta">
                                    📚 Room: ${data.note.room_code} &nbsp;•&nbsp; 
                                    🕒 ${new Date(data.note.created_at).toLocaleString('id-ID')}
                                </div>
                            </div>
                            <button onclick="downloadImage()" class="download-btn">
                                <span>⬇️</span> Download PNG
                            </button>
                        </div>
                        <div class="img-container">
                            <img id="noteImage" src="${data.note.canvas_data}" alt="${data.note.title}">
                        </div>
                        <script>
                            function downloadImage() {
                                const link = document.createElement('a');
                                link.href = document.getElementById('noteImage').src;
                                link.download = "${data.note.title.replace(/\s+/g, '_')}_MathRoom.png";
                                link.click();
                            }
                        </script>
                    </body>
                    </html>
                `);
                newTab.document.close();
            }
        } catch (error) {
            console.error('Error viewing note:', error);
            alert('Gagal membuka catatan');
        }
    };

    const handleDownloadNote = async (noteId, noteTitle) => {
        try {
            const response = await fetch(`${API_URL}/api/notes/view/${noteId}`);
            const data = await response.json();

            if (data.success && data.note.canvas_data) {
                const link = document.createElement('a');
                link.href = data.note.canvas_data;
                link.download = `${noteTitle.replace(/\s+/g, '_')}_MathRoom.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error downloading note:', error);
            alert('Gagal mendownload catatan');
        }
    };

    const handleDeleteNote = async (noteId, noteTitle) => {
        if (!confirm(`Hapus catatan "${noteTitle}"?`)) return;

        try {
            const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                setNotes(notes.filter(note => note.id !== noteId));
            } else {
                alert('Gagal menghapus catatan');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Gagal menghapus catatan');
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

    if (loading) {
        return (
            <div className="notes-loading">
                <div className="loading-spinner"></div>
                <p>Memuat catatan...</p>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="notes-empty">
                <div className="empty-icon">📝</div>
                <h3>Belum Ada Catatan</h3>
                <p>Catatan yang Anda simpan akan muncul di sini</p>
            </div>
        );
    }

    return (
        <>
            <div className="notes-grid">
                {notes.map(note => (
                    <div key={note.id} className="note-card">
                        <div
                            className="note-thumbnail"
                            onClick={() => handleViewNote(note.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {note.thumbnail ? (
                                <img src={note.thumbnail} alt={note.title} />
                            ) : (
                                <div className="no-thumbnail">📄</div>
                            )}
                        </div>

                        <div className="note-info">
                            <h4>{note.title}</h4>
                            <p className="note-meta">
                                <span className="note-room">📚 {note.room_code}</span>
                                <span className="note-date">🕒 {formatDate(note.created_at)}</span>
                            </p>
                        </div>

                        <div className="note-actions">
                            <button
                                className="btn-view"
                                onClick={() => handleViewNote(note.id)}
                                title="Lihat catatan"
                            >
                                👁️
                            </button>
                            <button
                                className="btn-download"
                                onClick={() => handleDownloadNote(note.id, note.title)}
                                title="Download catatan"
                            >
                                ⬇️
                            </button>
                            <button
                                className="btn-delete"
                                onClick={() => handleDeleteNote(note.id, note.title)}
                                title="Hapus catatan"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

SavedNotesList.propTypes = {
    studentEmail: PropTypes.string.isRequired
};
