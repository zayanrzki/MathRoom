import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { socket } from '../socket';

/**
 * StudentCamera component - Captures and streams webcam to teacher
 */
export function StudentCamera({ roomId, studentId, studentName, enabled = false }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled) {
            stopCamera();
            return;
        }

        startCamera();

        return () => {
            stopCamera();
        };
    }, [enabled, roomId, studentId]);

    const startCamera = async () => {
        try {
            setError(null);

            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: 'user'
                },
                audio: false // Audio will be separate feature
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            setIsStreaming(true);

            // Start sending frames
            startFrameCapture();

            console.log('📹 Camera started for student:', studentName);

        } catch (err) {
            console.error('Camera access error:', err);
            setError(err.message || 'Camera access denied');
            setIsStreaming(false);
        }
    };

    const stopCamera = () => {
        // Stop frame capture
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Stop camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsStreaming(false);
        console.log('📹 Camera stopped');
    };

    const startFrameCapture = () => {
        // Create canvas for frame capture
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
            canvasRef.current.width = 320;
            canvasRef.current.height = 240;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Capture and send frames at ~10fps
        intervalRef.current = setInterval(() => {
            if (!videoRef.current || !streamRef.current) return;

            // Draw video frame to canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            // Convert to base64 JPEG (compressed)
            const frameData = canvas.toDataURL('image/jpeg', 0.5);

            // Send to server
            socket.emit('camera_frame', {
                roomId,
                studentId,
                studentName,
                frame: frameData,
                timestamp: Date.now()
            });
        }, 100); // 10fps
    };

    return (
        <div className="student-camera-container">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    maxWidth: '200px',
                    borderRadius: '8px',
                    display: isStreaming ? 'block' : 'none'
                }}
            />
            {!isStreaming && !error && (
                <div className="camera-placeholder">
                    <span>📹 Camera Off</span>
                </div>
            )}
            {error && (
                <div className="camera-error">
                    <span>⚠️ {error}</span>
                </div>
            )}
        </div>
    );
}

StudentCamera.propTypes = {
    roomId: PropTypes.string.isRequired,
    studentId: PropTypes.string.isRequired,
    studentName: PropTypes.string.isRequired,
    enabled: PropTypes.bool
};

/**
 * TeacherVideoView component - Displays student's camera stream
 */
export function TeacherVideoView({ studentId, studentName }) {
    const [frame, setFrame] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const lastUpdateRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const handleFrame = (data) => {
            // Debug log
            console.log('📹 Received frame from:', data.studentName, 'for:', studentId, 'match:', data.studentId === studentId);

            // Match by studentId OR studentName (fallback)
            if (data.studentId === studentId || data.studentName === studentName) {
                setFrame(data.frame);
                lastUpdateRef.current = Date.now();
                setIsActive(true);

                // Reset timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set inactive after 2 seconds of no frames
                timeoutRef.current = setTimeout(() => {
                    setIsActive(false);
                }, 2000);
            }
        };

        socket.on('camera_frame_broadcast', handleFrame);

        console.log('📹 TeacherVideoView listening for student:', studentId, studentName);

        return () => {
            socket.off('camera_frame_broadcast', handleFrame);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [studentId, studentName]);

    return (
        <div className="teacher-video-view">
            {frame && isActive ? (
                <>
                    <img
                        src={frame}
                        alt={`${studentName}'s camera`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px'
                        }}
                    />
                    <div className="stream-indicator">
                        <span className="live-dot"></span>
                        <span>LIVE</span>
                    </div>
                </>
            ) : (
                <div className="video-placeholder">
                    <span className="video-icon">📹</span>
                    <span className="video-text">Camera Off</span>
                </div>
            )}
        </div>
    );
}

TeacherVideoView.propTypes = {
    studentId: PropTypes.string.isRequired,
    studentName: PropTypes.string.isRequired
};

/**
 * CameraToggle component - Button to toggle camera on/off
 */
export function CameraToggle({ isOn, onToggle, disabled = false }) {
    return (
        <button
            className={`camera-toggle-btn ${isOn ? 'active' : ''}`}
            onClick={onToggle}
            disabled={disabled}
            title={isOn ? 'Turn camera off' : 'Turn camera on'}
        >
            {isOn ? '📹 Camera ON' : '📷 Camera OFF'}
        </button>
    );
}

CameraToggle.propTypes = {
    isOn: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

/**
 * StudentMicrophone component - Captures and streams audio to teacher
 */
export function StudentMicrophone({ roomId, studentId, studentName, enabled = false }) {
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!enabled) {
            stopMicrophone();
            return;
        }

        startMicrophone();

        return () => {
            stopMicrophone();
        };
    }, [enabled, roomId, studentId]);

    const startMicrophone = async () => {
        try {
            setError(null);

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            streamRef.current = stream;

            // Setup audio analyzer for visual feedback
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start visual feedback
            updateAudioLevel();

            // Function to record a single chunk and restart
            // This ensures every chunk has a valid WebM/Opus header
            const recordChunk = () => {
                if (!streamRef.current) return;

                const recorder = new MediaRecorder(streamRef.current, {
                    mimeType: 'audio/webm;codecs=opus'
                });

                recorder.ondataavailable = async (event) => {
                    if (event.data.size > 0 && socket.connected) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            socket.emit('audio_chunk', {
                                roomId,
                                studentId,
                                studentName,
                                audio: reader.result,
                                timestamp: Date.now()
                            });
                        };
                        reader.readAsDataURL(event.data);
                    }
                };

                recorder.start();

                // Stop after 400ms to send the chunk
                setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                        // Recursive call to start next chunk if still enabled
                        if (enabled) recordChunk();
                    }
                }, 400);

                mediaRecorderRef.current = recorder;
            };

            recordChunk();
            setIsStreaming(true);
            console.log('🎤 Microphone started with chunk headers');

        } catch (err) {
            console.error('Microphone access error:', err);
            setError(err.message || 'Microphone access denied');
            setIsStreaming(false);
        }
    };

    const stopMicrophone = () => {
        // Stop animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        // Stop media recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        // Stop microphone stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsStreaming(false);
        setAudioLevel(0);
        console.log('🎤 Microphone stopped');
    };

    const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, average * 1.5));

        animationRef.current = requestAnimationFrame(updateAudioLevel);
    };

    return (
        <div className="student-microphone-container">
            {isStreaming && (
                <div className="audio-level-indicator">
                    <div
                        className="audio-level-bar"
                        style={{ width: `${audioLevel}%` }}
                    />
                    <span className="mic-status">🎤 {audioLevel > 5 ? 'BERBICARA' : 'LIVE'}</span>
                </div>
            )}
            {!isStreaming && !error && (
                <div className="mic-placeholder">
                    <span>🎤 Mic Off</span>
                </div>
            )}
            {error && (
                <div className="mic-error">
                    <span>⚠️ {error}</span>
                </div>
            )}
        </div>
    );
}

StudentMicrophone.propTypes = {
    roomId: PropTypes.string.isRequired,
    studentId: PropTypes.string.isRequired,
    studentName: PropTypes.string.isRequired,
    enabled: PropTypes.bool
};

/**
 * TeacherAudioPlayer component - Plays student's audio stream
 */
export function TeacherAudioPlayer({ studentId, studentName }) {
    const audioContextRef = useRef(null);
    const [isReceiving, setIsReceiving] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const timeoutRef = useRef(null);
    const gainNodeRef = useRef(null);

    useEffect(() => {
        // Initialize audio context on first mount or toggle
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
        }

        const handleAudioChunk = async (data) => {
            // Match by either ID or Name to be safe
            if (data.studentId !== studentId && data.studentName !== studentName) return;
            if (isMuted) return;

            try {
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                // Decode audio chunk (must have header)
                const response = await fetch(data.audio);
                const arrayBuffer = await response.arrayBuffer();

                audioContextRef.current.decodeAudioData(arrayBuffer, (buffer) => {
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(gainNodeRef.current);
                    source.start(0);

                    setIsReceiving(true);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    timeoutRef.current = setTimeout(() => setIsReceiving(false), 600);
                }, (err) => {
                    // Ignore decode errors for very small chunks
                });

            } catch (err) {
                console.error('Audio play error:', err);
            }
        };

        socket.on('audio_chunk_broadcast', handleAudioChunk);
        console.log('🔈 Teacher listening for audio from:', studentName);

        return () => {
            socket.off('audio_chunk_broadcast', handleAudioChunk);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [studentId, studentName, isMuted]);

    const toggleMute = (e) => {
        e.stopPropagation();
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = newMuted ? 0 : 1;
        }
        // Resume context on user interaction
        if (audioContextRef.current) {
            audioContextRef.current.resume();
        }
    };

    return (
        <div className="teacher-audio-player">
            <button
                className={`audio-toggle-btn ${isReceiving ? 'receiving' : ''} ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute student' : 'Mute student'}
            >
                {isMuted ? '🔇' : isReceiving ? '🔊' : '🔈'}
            </button>
            {isReceiving && !isMuted && (
                <span className="audio-status">Speaking...</span>
            )}
        </div>
    );
}

TeacherAudioPlayer.propTypes = {
    studentId: PropTypes.string.isRequired,
    studentName: PropTypes.string.isRequired
};

/**
 * MicToggle component - Button to toggle microphone on/off
 */
export function MicToggle({ isOn, onToggle, disabled = false }) {
    return (
        <button
            className={`mic-toggle-btn ${isOn ? 'active' : ''}`}
            onClick={onToggle}
            disabled={disabled}
            title={isOn ? 'Turn microphone off' : 'Turn microphone on'}
        >
            {isOn ? '🎤 Mic ON' : '🎙️ Mic OFF'}
        </button>
    );
}

MicToggle.propTypes = {
    isOn: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};
