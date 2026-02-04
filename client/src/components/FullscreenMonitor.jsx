import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import PropTypes from 'prop-types';
import { socket } from '../socket';

export default function FullscreenMonitor({ student, onClose }) {
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        console.log('FullscreenMonitor: Initializing canvas for', student.username);

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 1000,
            height: 600,
            backgroundColor: 'white',
            selection: false,
            isDrawingMode: false
        });

        fabricCanvas.current = canvas;
        setIsReady(true);
        console.log('✅ FullscreenMonitor: Canvas ready');

        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, [student.username]);

    // Listen to ALL drawing updates from the beginning
    // This accumulates all strokes like MiniCanvas does
    useEffect(() => {
        if (!isReady) return;

        const handleDrawingUpdate = (data) => {
            // Only process if it's for the student we're monitoring
            if (data.userId === student.id && fabricCanvas.current) {
                console.log('FullscreenMonitor: Receiving drawing from', student.username);

                try {
                    fabric.util.enlivenObjects([data.path], (objects) => {
                        objects.forEach((obj) => {
                            obj.selectable = false;
                            obj.evented = false;
                            fabricCanvas.current.add(obj);
                        });
                        fabricCanvas.current.renderAll();
                        console.log('✅ Added stroke to fullscreen canvas');
                    });
                } catch (error) {
                    console.error('❌ Error rendering drawing:', error);
                }
            }
        };

        socket.on('drawing_UPDATE', handleDrawingUpdate);
        console.log('🔌 FullscreenMonitor: Listening for drawing updates from', student.username);

        return () => {
            socket.off('drawing_UPDATE', handleDrawingUpdate);
        };
    }, [student.id, student.username, isReady]);

    return (
        <div className="fullscreen-monitor-backdrop" onClick={onClose}>
            <div className="fullscreen-monitor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="monitor-header">
                    <div>
                        <h2>👁️ Monitoring: {student.username}</h2>
                        <p className="monitor-subtitle">Real-time Canvas View (New drawings only)</p>
                    </div>
                    <button className="btn-close-monitor" onClick={onClose}>✕</button>
                </div>

                <div className="monitor-canvas-container">
                    <canvas ref={canvasRef} />
                    {!isReady && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#666' }}>Loading...</div>}
                </div>

                <div className="monitor-footer">
                    <div className="monitor-info">
                        <span>🟢 Live Monitoring</span>
                        <span>•</span>
                        <span>Student ID: {student.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Shows new drawings from now on</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

FullscreenMonitor.propTypes = {
    student: PropTypes.shape({
        id: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired
    }).isRequired,
    onClose: PropTypes.func.isRequired
}