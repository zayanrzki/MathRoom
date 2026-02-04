import { useState } from 'react';
import PropTypes from 'prop-types';

export default function SaveNoteModal({ isOpen, onClose, onSave, canvasPreview }) {
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(title || 'Untitled Note');
        setIsSaving(false);
    };

    const handleDontSave = () => {
        onClose(false); // false = don't save
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target.className === 'modal-backdrop' && handleDontSave()}>
            <div className="save-note-modal">
                <div className="modal-header">
                    <h2>💾 Simpan Catatan?</h2>
                    <p>Apakah Anda ingin menyimpan coretan Anda sebelum keluar?</p>
                </div>

                <div className="modal-body">
                    {canvasPreview && (
                        <div className="canvas-preview">
                            <img src={canvasPreview} alt="Canvas Preview" />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Judul Catatan (Opsional)</label>
                        <input
                            type="text"
                            placeholder="Contoh: Materi Aljabar - Bab 3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div className="modal-actions">
                    <button
                        className="btn-dont-save"
                        onClick={handleDontSave}
                        disabled={isSaving}
                    >
                        ❌ Tidak, Langsung Keluar
                    </button>
                    <button
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? '⏳ Menyimpan...' : '✅ Simpan Catatan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

SaveNoteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    canvasPreview: PropTypes.string
};
