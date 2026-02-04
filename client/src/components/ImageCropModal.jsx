import { useState, useRef, useEffect } from 'react';
import './ImageCropModal.css';

export default function ImageCropModal({ isOpen, imageSrc, onConfirm, onCancel }) {
    const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentage based
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const [dragging, setDragging] = useState(null); // 'move', 'top-left', etc.
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    if (!isOpen) return null;

    const getEventPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const handleStart = (e, type) => {
        const pos = getEventPos(e);
        setDragging(type);
        setStartPos(pos);

        // CRITICAL: Stop propagation so parent 'move' handler doesn't fire
        if (e.stopPropagation) e.stopPropagation();
    };

    const handleMove = (e) => {
        if (!dragging) return;

        const pos = getEventPos(e);
        const dx = ((pos.x - startPos.x) / containerRef.current.clientWidth) * 100;
        const dy = ((pos.y - startPos.y) / containerRef.current.clientHeight) * 100;

        setCrop(prev => {
            let next = { ...prev };
            const MIN = 5; // Minimum size in %

            if (dragging === 'move') {
                next.x = Math.max(0, Math.min(100 - prev.width, prev.x + dx));
                next.y = Math.max(0, Math.min(100 - prev.height, prev.y + dy));
            }
            // Side resizing
            else if (dragging === 't') {
                const newY = Math.max(0, Math.min(prev.y + prev.height - MIN, prev.y + dy));
                next.height = prev.height + (prev.y - newY);
                next.y = newY;
            } else if (dragging === 'b') {
                next.height = Math.max(MIN, Math.min(100 - prev.y, prev.height + dy));
            } else if (dragging === 'l') {
                const newX = Math.max(0, Math.min(prev.x + prev.width - MIN, prev.x + dx));
                next.width = prev.width + (prev.x - newX);
                next.x = newX;
            } else if (dragging === 'r') {
                next.width = Math.max(MIN, Math.min(100 - prev.x, prev.width + dx));
            }
            // Corner resizing
            else if (dragging === 'tl') {
                const newX = Math.max(0, Math.min(prev.x + prev.width - MIN, prev.x + dx));
                const newY = Math.max(0, Math.min(prev.y + prev.height - MIN, prev.y + dy));
                next.width = prev.width + (prev.x - newX);
                next.height = prev.height + (prev.y - newY);
                next.x = newX;
                next.y = newY;
            } else if (dragging === 'tr') {
                const newY = Math.max(0, Math.min(prev.y + prev.height - MIN, prev.y + dy));
                next.width = Math.max(MIN, Math.min(100 - prev.x, prev.width + dx));
                next.height = prev.height + (prev.y - newY);
                next.y = newY;
            } else if (dragging === 'bl') {
                const newX = Math.max(0, Math.min(prev.x + prev.width - MIN, prev.x + dx));
                next.width = prev.width + (prev.x - newX);
                next.height = Math.max(MIN, Math.min(100 - prev.y, prev.height + dy));
                next.x = newX;
            } else if (dragging === 'br') {
                next.width = Math.max(MIN, Math.min(100 - prev.x, prev.width + dx));
                next.height = Math.max(MIN, Math.min(100 - prev.y, prev.height + dy));
            }
            return next;
        });

        setStartPos(pos);
        if (e.cancelable) e.preventDefault();
    };

    const handleEnd = () => setDragging(null);

    const handleCrop = () => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleX = img.naturalWidth / 100;
            const scaleY = img.naturalHeight / 100;

            const targetWidth = crop.width * scaleX;
            const targetHeight = crop.height * scaleY;

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                img,
                crop.x * scaleX, crop.y * scaleY, targetWidth, targetHeight,
                0, 0, targetWidth, targetHeight
            );

            onConfirm(canvas.toDataURL('image/png'));
        };
    };

    return (
        <div
            className="crop-modal-overlay"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div className="crop-modal-content">
                <div className="crop-modal-header">
                    <h3>✂️ Potong Gambar (Crop)</h3>
                    <p>Geser kotak atau tarik garis dan titik di setiap sisi untuk mengatur area</p>
                </div>

                <div className="crop-container" ref={containerRef}>
                    <img src={imageSrc} alt="Crop Preview" className="crop-image" />
                    <div
                        className="crop-box"
                        style={{
                            left: `${crop.x}%`,
                            top: `${crop.y}%`,
                            width: `${crop.width}%`,
                            height: `${crop.height}%`
                        }}
                        onMouseDown={(e) => handleStart(e, 'move')}
                        onTouchStart={(e) => handleStart(e, 'move')}
                    >
                        {/* Corners */}
                        <div className="crop-handle tl" onMouseDown={(e) => handleStart(e, 'tl')} onTouchStart={(e) => handleStart(e, 'tl')}></div>
                        <div className="crop-handle tr" onMouseDown={(e) => handleStart(e, 'tr')} onTouchStart={(e) => handleStart(e, 'tr')}></div>
                        <div className="crop-handle bl" onMouseDown={(e) => handleStart(e, 'bl')} onTouchStart={(e) => handleStart(e, 'bl')}></div>
                        <div className="crop-handle br" onMouseDown={(e) => handleStart(e, 'br')} onTouchStart={(e) => handleStart(e, 'br')}></div>

                        {/* Sides */}
                        <div className="crop-handle-side t" onMouseDown={(e) => handleStart(e, 't')} onTouchStart={(e) => handleStart(e, 't')}></div>
                        <div className="crop-handle-side b" onMouseDown={(e) => handleStart(e, 'b')} onTouchStart={(e) => handleStart(e, 'b')}></div>
                        <div className="crop-handle-side l" onMouseDown={(e) => handleStart(e, 'l')} onTouchStart={(e) => handleStart(e, 'l')}></div>
                        <div className="crop-handle-side r" onMouseDown={(e) => handleStart(e, 'r')} onTouchStart={(e) => handleStart(e, 'r')}></div>

                        <div className="crop-guide-v"></div>
                        <div className="crop-guide-h"></div>
                    </div>
                </div>

                <div className="crop-modal-actions">
                    <button className="crop-cancel-btn" onClick={onCancel}>Batal</button>
                    <button className="crop-confirm-btn" onClick={handleCrop}>✓ Gunakan Gambar</button>
                </div>
            </div>
        </div>
    );
}
