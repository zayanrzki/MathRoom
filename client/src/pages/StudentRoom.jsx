import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import SmartCanvas from '../components/SmartCanvas';
import SaveNoteModal from '../components/SaveNoteModal';
import StudentProblemView from '../components/StudentProblemView';
import ShapePicker from '../components/ShapePicker';
import MathTools from '../components/MathTools';
import { StudentCamera, CameraToggle, StudentMicrophone, MicToggle } from '../components/VideoStream';
import MaterialRoadmap from '../components/MaterialRoadmap';
import ImageCropModal from '../components/ImageCropModal';
import '../components/VideoStream.css';
import { API_URL } from '../config/api';


export default function StudentRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [eraserMode, setEraserMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [canvasPreview, setCanvasPreview] = useState(null);
  const [smartDrawingEnabled, setSmartDrawingEnabled] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [activeTab, setActiveTab] = useState('drawing'); // 'drawing', 'problem', or 'material'
  const [roomTopic, setRoomTopic] = useState('Operasi Bilangan Real'); // Topic from room session
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom level 0.5 - 3
  const [activeMathTools, setActiveMathTools] = useState([]); // Active math tools on canvas
  const [cameraEnabled, setCameraEnabled] = useState(false); // Camera on/off
  const [micEnabled, setMicEnabled] = useState(false); // Microphone on/off
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile navigation menu
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const fileInputRef = useRef(null);

  // Check if teacher is viewing (viewer mode)
  const params = new URLSearchParams(location.search);
  const isViewer = params.get('viewer') === 'true';
  const viewingStudentName = params.get('studentName') || 'Student';

  // Get user info from localStorage
  const userEmail = localStorage.getItem('userEmail');
  const userName = localStorage.getItem('userName');

  // TRIGGER RESIZE when tab changes to ensure canvas fits
  useEffect(() => {
    // Delay slightly to wait for DOM updates
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab, sidebarOpen]);

  useEffect(() => {
    // Reconnect logic for refresh
    if (!socket.connected) {
      console.log("StudentRoom: Socket disconnected, reconnecting...");
      socket.connect();
    }

    // Always join room on mount (important for both students and viewers)
    if (isViewer) {
      // Viewer mode - join as teacher with proper format
      console.log("🔍 VIEWER: Joining room as teacher", roomId);
      socket.emit('join_room', {
        roomCode: roomId,
        username: 'Teacher', // Teacher doesn't need specific username
        isTeacher: true
      });
    } else {
      // Regular student
      console.log("📚 STUDENT: Joining room", roomId);
      socket.emit('join_room', { roomCode: roomId, username: userName }, (response) => {
        console.log("StudentRoom: Joined as student", response);
      });
    }

    // If viewer mode (teacher viewing student), request canvas state and listen for updates
    if (isViewer) {
      console.log("🔍 VIEWER MODE: Setting up listeners for room", roomId);

      // Listen for canvas state response
      const handleCanvasState = (data) => {
        console.log("✅ VIEWER: Received canvas state", data);
        if (canvasRef.current && data.canvasJSON) {
          canvasRef.current.loadCanvasState(data.canvasJSON);
        }
      };

      // Listen for new drawings
      const handleDrawingUpdate = (data) => {
        console.log("📥 VIEWER: Received new drawing from", data.userId);
        if (canvasRef.current && canvasRef.current.addExternalDrawing) {
          canvasRef.current.addExternalDrawing(data);
        }
      };

      socket.on('receive_canvas_state', handleCanvasState);
      socket.on('drawing_UPDATE', handleDrawingUpdate);

      // Request canvas state after listeners are set up (wait longer for canvas to be ready)
      setTimeout(() => {
        console.log("📞 VIEWER: Requesting canvas state for room", roomId);
        console.log("📞 VIEWER: Canvas ref status:", canvasRef.current ? "READY" : "NOT READY");
        if (canvasRef.current) {
          console.log("📞 VIEWER: Canvas has loadCanvasState method:", typeof canvasRef.current.loadCanvasState);
        }
        socket.emit('request_canvas_state_for_room', { roomId });
      }, 1500); // Increased to 1.5s to ensure canvas is fully initialized

      return () => {
        socket.off('receive_canvas_state', handleCanvasState);
        socket.off('drawing_UPDATE', handleDrawingUpdate);
      };
    }

    // Student mode: Listen for request to send canvas state
    if (!isViewer) {
      const handleSendCanvasState = (data) => {
        if (canvasRef.current && canvasRef.current.getCanvasJSON) {
          const canvasJSON = canvasRef.current.getCanvasJSON();
          socket.emit('canvas_state_response', {
            canvasJSON,
            requesterId: data.requesterId
          });
        }
      };

      const handleTeacherReturned = () => {
        if (canvasRef.current && canvasRef.current.getCanvasJSON) {
          const canvasData = canvasRef.current.getCanvasJSON();
          sessionStorage.setItem(`canvas_${roomId}`, JSON.stringify(canvasData));
        }
        window.location.reload();
      };

      socket.on('send_canvas_state', handleSendCanvasState);
      socket.on('teacher_returned', handleTeacherReturned);
    }

    // LISTENER FOR PASTE IMAGE
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            setRawImage(event.target.result);
            setIsCropModalOpen(true);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
      socket.off('send_canvas_state');
      socket.off('teacher_returned');
      socket.off('receive_canvas_state');
      socket.off('drawing_UPDATE');
    };
  }, [roomId, userName, isViewer]);

  const leaveSession = () => {
    // If viewer (teacher), directly navigate back without save dialog
    if (isViewer) {
      console.log("Viewer leaving - navigating back to dashboard");
      navigate(`/teacher/${roomId}`);
      return;
    }

    // For students, show save dialog
    console.log("leaveSession called - showing modal");
    // Generate canvas preview
    if (canvasRef.current && canvasRef.current.getCanvasElement) {
      const canvas = canvasRef.current.getCanvasElement();
      const preview = canvas.toDataURL('image/png');
      setCanvasPreview(preview);
    }
    setShowSaveModal(true);
  };

  const handleSaveNote = async (title) => {
    try {
      console.log('Attempting to save note...');
      console.log('userEmail:', userEmail);
      console.log('userName:', userName);
      console.log('roomId:', roomId);

      // Check if user is logged in
      if (!userEmail || !userName) {
        alert('Anda belum login! Silakan login terlebih dahulu.');
        socket.disconnect();
        navigate('/login');
        return;
      }

      if (!canvasRef.current || !canvasRef.current.getCanvasElement) {
        throw new Error('Canvas not available');
      }

      const canvas = canvasRef.current.getCanvasElement();
      const canvasData = canvas.toDataURL('image/png');

      // Create thumbnail (smaller version)
      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = 200;
      thumbnailCanvas.height = 150;
      const ctx = thumbnailCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, 200, 150);
      const thumbnail = thumbnailCanvas.toDataURL('image/png');

      console.log('Sending to API...');
      // Save to database
      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentEmail: userEmail,
          studentDisplayName: userName,
          roomCode: roomId,
          title: title,
          canvasData: canvasData,
          thumbnail: thumbnail
        })
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        console.log('Note saved successfully!');
        alert('✅ Catatan berhasil disimpan!');
      } else {
        console.error('Failed to save note:', data.message);
        alert('❌ Gagal menyimpan: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Gagal menyimpan catatan. Silakan coba lagi.');
    } finally {
      // Navigate based on role
      if (isViewer) {
        // Teacher viewing -> back to dashboard
        // Notify students to refresh so they re-appear in dashboard
        socket.emit('teacher_returned_to_dashboard', { roomId });
        navigate(`/teacher/${roomId}`);
      } else {
        // Student -> disconnect and go home
        socket.disconnect();
        navigate('/');
      }
    }
  };

  const handleModalClose = (shouldSave) => {
    setShowSaveModal(false);
    if (!shouldSave) {
      // User chose not to save
      if (isViewer) {
        // Teacher viewing -> back to dashboard
        socket.emit('teacher_returned_to_dashboard', { roomId });
        navigate(`/teacher/${roomId}`);
      } else {
        // Student -> disconnect and go home
        socket.disconnect();
        navigate('/');
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSmartDrawing = () => {
    setSmartDrawingEnabled(!smartDrawingEnabled);
    console.log('Smart Drawing toggled to:', !smartDrawingEnabled);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (!selectionMode) {
      // When enabling selection mode, disable eraser
      setEraserMode(false);
    }
    console.log('Selection Mode toggled to:', !selectionMode);
  };

  const handleDeleteSelected = () => {
    if (canvasRef.current) {
      canvasRef.current.deleteActiveObject();
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm('Bersihkan semua coretan di canvas?')) {
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current.click();
  };

  const onImageSelected = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawImage(event.target.result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = (croppedDataUrl) => {
    if (canvasRef.current) {
      canvasRef.current.addImage(croppedDataUrl);
    }
    setIsCropModalOpen(false);
    setRawImage(null);
  };

  const toggleEraser = () => {
    setEraserMode(!eraserMode);
  };

  const handleAddShape = (shapeId, shapeType, color) => {
    if (canvasRef.current) {
      canvasRef.current.addShape(shapeId, shapeType, color);
      // Auto-enable selection mode after adding shape
      setSelectionMode(true);
      setEraserMode(false);
      setTextMode(false);
    }
  };

  return (
    <div className="fullscreen-room">
      {/* Background stays separate from flex flow */}
      <div className="math-bg-decoration dashboard-bg" style={{ zIndex: -1 }}>
        <span className="math-symbol tan">sin</span>
        <span className="math-symbol cotan">cos</span>
        <span className="math-symbol cos">tan</span>
        <span className="math-symbol secot">log</span>
        <div className="math-x-pattern"></div>
      </div>

      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          {!isViewer && (
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          )}
          <div className="top-bar-info">
            <h3 className="room-title">📚 Room: {roomId}</h3>
            {isViewer && (
              <p className="viewing-status">
                👁️ Viewing: {viewingStudentName}
              </p>
            )}
          </div>
        </div>

        {!isViewer && (
          <>
            {/* Desktop Tabs */}
            <div className="top-tab-wrapper desktop-only">
              <button
                className={`nav-tab-btn ${activeTab === 'drawing' ? 'active' : ''}`}
                onClick={() => setActiveTab('drawing')}
              >
                🎨 Alat Gambar
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'problem' ? 'active' : ''}`}
                onClick={() => setActiveTab('problem')}
              >
                🔢 Bank Soal
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'material' ? 'active' : ''}`}
                onClick={() => setActiveTab('material')}
              >
                📖 Materi
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? '✕' : '☰ Menu'}
            </button>
          </>
        )}

        <div className="top-bar-right desktop-only">
          <button onClick={leaveSession} className="leave-btn-top">
            {isViewer ? '← Back to Dashboard' : 'Leave Room'}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {!isViewer && (
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-nav-content">
            <h4 className="menu-title">🧭 Navigasi Menu</h4>
            <div className="mobile-tab-list">
              <button
                className={`mobile-tab-item ${activeTab === 'drawing' ? 'active' : ''}`}
                onClick={() => { setActiveTab('drawing'); setMobileMenuOpen(false); }}
              >
                <span className="tab-icon">🎨</span>
                <div className="tab-info">
                  <span className="tab-label">Alat Gambar</span>
                  <span className="tab-desc">Kanvas & Spidol</span>
                </div>
              </button>
              <button
                className={`mobile-tab-item ${activeTab === 'problem' ? 'active' : ''}`}
                onClick={() => { setActiveTab('problem'); setMobileMenuOpen(false); }}
              >
                <span className="tab-icon">🔢</span>
                <div className="tab-info">
                  <span className="tab-label">Bank Soal</span>
                  <span className="tab-desc">Latihan Mandiri</span>
                </div>
              </button>
              <button
                className={`mobile-tab-item ${activeTab === 'material' ? 'active' : ''}`}
                onClick={() => { setActiveTab('material'); setMobileMenuOpen(false); }}
              >
                <span className="tab-icon">📖</span>
                <div className="tab-info">
                  <span className="tab-label">Materi</span>
                  <span className="tab-desc">Modul Belajar</span>
                </div>
              </button>
            </div>

            <div className="menu-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={leaveSession}
                className="leave-btn-mobile"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                🚪 Keluar Ruangan
              </button>
            </div>

            <div className="menu-footer">
              <p>Math Room v2.0</p>
            </div>
          </div>
          <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Sidebar - Hidden for viewers */}
      {
        !isViewer && (
          <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-content">
              <h4 className="sidebar-title">🎨 Drawing Tools</h4>

              <div className="tool-section">
                <label>Drawing Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className={`mode-btn ${!eraserMode && !textMode ? 'active' : ''}`}
                    onClick={() => {
                      setEraserMode(false);
                      setTextMode(false);
                      setSelectionMode(false);
                    }}
                  >
                    ✏️ Draw
                  </button>
                  <button
                    className={`mode-btn ${textMode ? 'active' : ''}`}
                    onClick={() => {
                      setTextMode(true);
                      setEraserMode(false);
                      setSelectionMode(false);
                    }}
                  >
                    ✍️ Text
                  </button>
                  <button
                    className={`mode-btn ${eraserMode ? 'active' : ''}`}
                    onClick={() => {
                      setEraserMode(true);
                      setTextMode(false);
                      setSelectionMode(false);
                    }}
                  >
                    🧹 Erase
                  </button>
                </div>
              </div>

              <div className="tool-section">
                <label>✨ Smart Drawing</label>
                <button
                  className={`smart-drawing-btn ${smartDrawingEnabled ? 'active' : ''}`}
                  onClick={toggleSmartDrawing}
                >
                  {smartDrawingEnabled ? '🟢 ON - Auto Shape' : '⚪ OFF - Freehand'}
                </button>
                <p className="tool-hint">Auto-convert to perfect shapes</p>
              </div>

              <div className="tool-section">
                <label>✋ Selection Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button
                    className={`selection-mode-btn ${selectionMode ? 'active' : ''}`}
                    onClick={toggleSelectionMode}
                    style={{ width: '100%' }}
                  >
                    {selectionMode ? '✋ Select ON' : '✋ Select OFF'}
                  </button>

                  {selectionMode && (
                    <button
                      className="mode-btn"
                      onClick={handleDeleteSelected}
                      style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                    >
                      🗑️ Hapus Item Terpilih
                    </button>
                  )}
                </div>
                <p className="tool-hint">Select, move, resize, rotate objects</p>
              </div>

              {/* Shape Picker */}
              <div className="tool-section">
                <ShapePicker
                  onSelectShape={handleAddShape}
                  brushColor={brushColor}
                />
              </div>

              {/* Math Tools */}
              <div className="tool-section">
                <MathTools
                  onSelectTool={(toolId) => {
                    if (canvasRef.current) {
                      canvasRef.current.addMathTool(toolId);
                      setActiveMathTools(prev => [...prev, toolId]);
                      setSelectionMode(true);
                      setEraserMode(false);
                      setTextMode(false);
                    }
                  }}
                  onRemoveTool={(toolId) => {
                    if (canvasRef.current) {
                      canvasRef.current.removeMathTool(toolId);
                      setActiveMathTools(prev => prev.filter(t => t !== toolId));
                    }
                  }}
                  activeTools={activeMathTools}
                />
              </div>

              <div className="tool-section">
                <label>🖼️ Media</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="mode-btn" onClick={handleImageUpload}>
                    ➕ Insert Foto Soal
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={onImageSelected}
                  />
                </div>
                <p className="tool-hint">Bisa Upload atau Paste (Ctrl+V)</p>
              </div>

              <div className="tool-section">
                <label>Brush Size</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                  className="slider"
                />
                <span className="tool-value">{brushSize}px</span>
              </div>

              <div className="tool-section">
                <label>Brush Color</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="color-picker"
                  />
                  <span className="color-label">{brushColor}</span>
                </div>
              </div>

              <div className="tool-section">
                <label>Quick Colors</label>
                <div className="color-palette">
                  {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(color => (
                    <button
                      key={color}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="tool-section">
                <label>🔍 Zoom</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="tool-btn"
                    onClick={() => canvasRef.current?.zoomOut()}
                    disabled={zoomLevel <= 0.5}
                    style={{ flex: 1, padding: '0.6rem' }}
                  >
                    ➖
                  </button>
                  <span style={{
                    minWidth: '60px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'var(--primary-blue)',
                    fontSize: '1.1rem'
                  }}>
                    {(zoomLevel * 100).toFixed(0)}%
                  </span>
                  <button
                    className="tool-btn"
                    onClick={() => canvasRef.current?.zoomIn()}
                    disabled={zoomLevel >= 3}
                    style={{ flex: 1, padding: '0.6rem' }}
                  >
                    ➕
                  </button>
                </div>
                <button
                  className="tool-btn"
                  onClick={() => canvasRef.current?.resetZoom()}
                  style={{ marginTop: '0.5rem', background: 'var(--border-color)' }}
                >
                  🔄 Reset View
                </button>
                <p className="tool-hint">Ctrl + Scroll → Zoom</p>
                <p className="tool-hint">Space + Drag → Pan</p>
              </div>

              {/* Camera Toggle - Only for students, not viewers */}
              {!isViewer && (
                <div className="tool-section">
                  <label>📹 Camera</label>
                  <CameraToggle
                    isOn={cameraEnabled}
                    onToggle={() => {
                      const newState = !cameraEnabled;
                      setCameraEnabled(newState);
                      // Notify server of camera status
                      socket.emit('camera_status_change', {
                        roomId,
                        studentId: socket.id,
                        studentName: userName,
                        isEnabled: newState
                      });
                    }}
                  />
                  {cameraEnabled && (
                    <StudentCamera
                      roomId={roomId}
                      studentId={socket.id}
                      studentName={userName}
                      enabled={cameraEnabled}
                    />
                  )}
                  <p className="tool-hint">Stream ke guru secara real-time</p>
                </div>
              )}

              {/* Microphone Toggle - Only for students, not viewers */}
              {!isViewer && (
                <div className="tool-section">
                  <label>🎙️ Microphone</label>
                  <MicToggle
                    isOn={micEnabled}
                    onToggle={() => {
                      const newState = !micEnabled;
                      setMicEnabled(newState);
                      // Notify server of mic status
                      socket.emit('mic_status_change', {
                        roomId,
                        studentId: socket.id,
                        studentName: userName,
                        isEnabled: newState
                      });
                    }}
                  />
                  {micEnabled && (
                    <StudentMicrophone
                      roomId={roomId}
                      studentId={socket.id}
                      studentName={userName}
                      enabled={micEnabled}
                    />
                  )}
                  <p className="tool-hint">Suara Anda akan terdengar ke guru</p>
                </div>
              )}

              <div className="tool-section">
                <button className="tool-btn clear-btn" onClick={handleClearCanvas}>🗑️ Clear Canvas</button>
                <button className="tool-btn undo-btn" onClick={handleUndo}>↶ Undo</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Main Container for Canvas and Problems */}
      <div className={`canvas-problem-wrapper ${(sidebarOpen && !isViewer) ? 'with-sidebar' : 'fullwidth'}`}>
        <div className={`actual-canvas-part ${activeTab === 'problem' ? 'contracted' : 'full'}`}>
          <SmartCanvas
            ref={canvasRef}
            roomId={roomId}
            role={isViewer ? "teacher" : "student"}
            brushSize={brushSize}
            brushColor={brushColor}
            eraserMode={eraserMode}
            smartDrawingEnabled={smartDrawingEnabled}
            selectionMode={selectionMode}
            textMode={textMode}
            onZoomChange={setZoomLevel}
          />
        </div>

        {/* Right Problem Panel */}
        {activeTab === 'problem' && !isViewer && (
          <div className="problem-panel">
            <StudentProblemView
              roomId={roomId}
              studentEmail={userEmail}
              studentName={userName}
            />
          </div>
        )}

        {activeTab === 'material' && !isViewer && (
          <div className="material-panel">
            <h3 className="panel-title">📖 Materi Pembelajaran</h3>
            <MaterialRoadmap topic={roomTopic} />
          </div>
        )}
      </div>

      {/* Save Note Modal */}
      <SaveNoteModal
        isOpen={showSaveModal}
        onClose={handleModalClose}
        onSave={handleSaveNote}
        canvasPreview={canvasPreview}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={rawImage}
        onConfirm={handleCropConfirm}
        onCancel={() => { setIsCropModalOpen(false); setRawImage(null); }}
      />
    </div >
  );
}
