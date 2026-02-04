const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in development
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const db = require('./db');

// ===== AUTHENTICATION ENDPOINTS =====

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        console.log('✅ New user registered:', email);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// User Login (with password verification)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await db.query(
            'SELECT id, name, email, password FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('✅ User logged in:', email);

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ===== SESSION MANAGEMENT ENDPOINTS =====

// Create new session
app.post('/api/sessions/create', async (req, res) => {
    try {
        const { roomCode, teacherEmail, teacherName, topic, difficulty, maxStudents } = req.body;

        if (!roomCode || !teacherEmail || !teacherName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert session to database
        const [result] = await db.query(
            'INSERT INTO sessions (room_code, teacher_email, teacher_name, topic, difficulty, max_students, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [roomCode, teacherEmail, teacherName, topic || '', difficulty || 'Medium', maxStudents || 30, 'active']
        );

        console.log('✅ Session created:', roomCode);

        res.status(201).json({
            success: true,
            sessionId: result.insertId,
            roomCode
        });

    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Server error creating session' });
    }
});

// End session
app.post('/api/sessions/end', async (req, res) => {
    try {
        const { roomCode, totalStudents } = req.body;

        if (!roomCode) {
            return res.status(400).json({ error: 'Room code required' });
        }

        // Calculate duration
        const [sessions] = await db.query(
            'SELECT started_at FROM sessions WHERE room_code = ? AND status = ?',
            [roomCode, 'active']
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Active session not found' });
        }

        const startedAt = new Date(sessions[0].started_at);
        const endedAt = new Date();
        const durationMinutes = Math.round((endedAt - startedAt) / 1000 / 60);

        // Update session
        await db.query(
            'UPDATE sessions SET status = ?, ended_at = ?, total_students = ?, duration_minutes = ? WHERE room_code = ? AND status = ?',
            ['ended', endedAt, totalStudents || 0, durationMinutes, roomCode, 'active']
        );

        console.log(`✅ Session ended: ${roomCode} (${durationMinutes} minutes, ${totalStudents} students)`);

        res.json({
            success: true,
            duration: durationMinutes
        });

    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: 'Server error ending session' });
    }
});

// Get session history for a teacher
app.get('/api/sessions/history/:teacherEmail', async (req, res) => {
    try {
        const { teacherEmail } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const [sessions] = await db.query(
            `SELECT 
                id, room_code, topic, difficulty, max_students, total_students,
                status, started_at, ended_at, duration_minutes
            FROM sessions 
            WHERE teacher_email = ? 
            ORDER BY started_at DESC 
            LIMIT ? OFFSET ?`,
            [teacherEmail, parseInt(limit), parseInt(offset)]
        );

        // Get total count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM sessions WHERE teacher_email = ?',
            [teacherEmail]
        );

        res.json({
            success: true,
            sessions,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Get session history error:', error);
        res.status(500).json({ error: 'Server error fetching history' });
    }
});

// ===== PROBLEM BANK ENDPOINTS =====

const ProblemGenerator = require('./services/ProblemGenerator');

// Generate problems for a session
app.post('/api/problems/generate', async (req, res) => {
    try {
        const { sessionId, roomCode, topics, difficulty, count } = req.body;

        if (!roomCode || !topics || !difficulty || !count) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`🎲 Generating ${count} problems for room ${roomCode}...`);
        console.log(`Topics: ${topics.join(', ')}, Difficulty: ${difficulty}`);

        const problems = await ProblemGenerator.generateProblems(
            sessionId,
            roomCode,
            topics,
            difficulty,
            parseInt(count)
        );

        console.log(`✅ Generated ${problems.length} problems`);

        res.status(201).json({
            success: true,
            count: problems.length,
            problems: problems.map(p => ({
                id: p.id,
                number: p.number,
                topic: topics[p.number % topics.length]
            }))
        });

    } catch (error) {
        console.error('Generate problems error:', error);
        res.status(500).json({ error: 'Server error generating problems' });
    }
});

// Get problems for a room
app.get('/api/problems/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;

        const [problems] = await db.query(
            `SELECT id, problem_number, topic, difficulty, question_text, 
                    option_a, option_b, option_c, option_d, explanation
            FROM session_problems 
            WHERE room_code = ? 
            ORDER BY problem_number ASC`,
            [roomCode]
        );

        res.json({
            success: true,
            count: problems.length,
            problems
        });

    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({ error: 'Server error fetching problems' });
    }
});

// Submit answer
app.post('/api/problems/submit', async (req, res) => {
    try {
        const { problemId, studentEmail, studentName, selectedAnswer, scratchCanvas } = req.body;

        if (!problemId || !studentEmail || !selectedAnswer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get correct answer
        const [problems] = await db.query(
            'SELECT correct_answer FROM session_problems WHERE id = ?',
            [problemId]
        );

        if (problems.length === 0) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        const correctAnswer = problems[0].correct_answer;
        const isCorrect = selectedAnswer === correctAnswer;

        // Save answer
        await db.query(
            `INSERT INTO student_answers 
            (problem_id, student_email, student_name, selected_answer, is_correct, scratch_canvas_data) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            selected_answer = VALUES(selected_answer),
            is_correct = VALUES(is_correct),
            scratch_canvas_data = VALUES(scratch_canvas_data)`,
            [problemId, studentEmail, studentName, selectedAnswer, isCorrect, scratchCanvas]
        );

        console.log(`📝 Answer submitted: ${studentName} - ${isCorrect ? 'Correct' : 'Wrong'}`);

        res.json({
            success: true,
            isCorrect,
            correctAnswer
        });

    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ error: 'Server error submitting answer' });
    }
});

// Get student scores for a room
app.get('/api/problems/scores/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;

        const [scores] = await db.query(
            `SELECT 
                sa.student_name,
                sa.student_email,
                COUNT(*) as total_answered,
                SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
            FROM student_answers sa
            JOIN session_problems sp ON sa.problem_id = sp.id
            WHERE sp.room_code = ?
            GROUP BY sa.student_email, sa.student_name`,
            [roomCode]
        );

        res.json({
            success: true,
            scores
        });

    } catch (error) {
        console.error('Get scores error:', error);
        res.status(500).json({ error: 'Server error fetching scores' });
    }
});

// ===== REST API ENDPOINTS FOR STUDENT NOTES =====

// Save a new note
app.post('/api/notes', async (req, res) => {
    try {
        console.log('=== SAVE NOTE REQUEST ===');
        console.log('Request body:', req.body);

        const { studentEmail, studentDisplayName, roomCode, canvasData, title, thumbnail } = req.body;

        console.log('Extracted fields:');
        console.log('- studentEmail:', studentEmail);
        console.log('- studentDisplayName:', studentDisplayName);
        console.log('- roomCode:', roomCode);
        console.log('- title:', title);
        console.log('- canvasData length:', canvasData ? canvasData.length : 'null');
        console.log('- thumbnail length:', thumbnail ? thumbnail.length : 'null');

        if (!studentEmail || !roomCode || !canvasData) {
            console.log('❌ Missing required fields!');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const noteTitle = title || `Note from ${roomCode}`;
        const displayName = studentDisplayName || studentEmail.split('@')[0];

        console.log('Inserting to database...');
        const [result] = await db.query(
            'INSERT INTO student_notes (student_email, student_display_name, room_code, title, canvas_data, thumbnail) VALUES (?, ?, ?, ?, ?, ?)',
            [studentEmail, displayName, roomCode, noteTitle, canvasData, thumbnail]
        );

        console.log('✅ Note saved! ID:', result.insertId);
        res.json({
            success: true,
            noteId: result.insertId,
            message: 'Note saved successfully'
        });
    } catch (error) {
        console.error('❌ Error saving note:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to save note',
            error: error.message
        });
    }
});

// Get all notes for a specific student
app.get('/api/notes/:studentEmail', async (req, res) => {
    try {
        const { studentEmail } = req.params;

        const [notes] = await db.query(
            'SELECT id, student_email, student_display_name, room_code, title, thumbnail, created_at FROM student_notes WHERE student_email = ? ORDER BY created_at DESC',
            [studentEmail]
        );

        res.json({
            success: true,
            notes
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notes',
            error: error.message
        });
    }
});

// Get full canvas data for a specific note
app.get('/api/notes/view/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;

        const [notes] = await db.query(
            'SELECT * FROM student_notes WHERE id = ?',
            [noteId]
        );

        if (notes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.json({
            success: true,
            note: notes[0]
        });
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch note',
            error: error.message
        });
    }
});

// Delete a note
app.delete('/api/notes/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;

        const [result] = await db.query(
            'DELETE FROM student_notes WHERE id = ?',
            [noteId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete note',
            error: error.message
        });
    }
});

// Socket.io Logic
// Track rooms and users
const rooms = new Map(); // roomId -> { teacher: socketId, students: Map(username -> socketId) }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (data, callback) => {
        let room = "";
        let user = "Teacher";
        let isTeacher = false;

        // Parse input: can be string (old teacher), object (student or viewer)
        if (typeof data === 'object') {
            room = data.roomCode;
            user = data.username;
            isTeacher = data.isTeacher || false; // Check if viewer joining with isTeacher flag
        } else {
            room = data;
            isTeacher = true;
        }


        console.log(`User ${user} (${socket.id}) joining room: ${room}`);
        socket.join(room);

        // Initialize room if doesn't exist
        if (!rooms.has(room)) {
            rooms.set(room, {
                teacher: null,
                students: new Map(),
                maxStudents: data.maxStudents || 30, // Default 30 if not specified
                topic: data.topic || '',
                difficulty: data.difficulty || ''
            });
        }

        const roomData = rooms.get(room);

        if (isTeacher) {
            roomData.teacher = socket.id;

            // Update room settings if provided
            if (data.maxStudents) roomData.maxStudents = data.maxStudents;
            if (data.topic) roomData.topic = data.topic;
            if (data.difficulty) roomData.difficulty = data.difficulty;

            console.log(`Teacher set for room ${room} (max: ${roomData.maxStudents} students)`);

            // Send existing students to teacher immediately
            const existingStudents = Array.from(roomData.students.entries()).map(([username, socketId]) => ({
                username,
                id: socketId
            }));

            if (existingStudents.length > 0) {
                console.log(`📤 Sending ${existingStudents.length} existing students to teacher:`, existingStudents);
                socket.emit('existing_students', existingStudents);
            }
        } else {
            // CHECK CAPACITY BEFORE ALLOWING STUDENT TO JOIN
            const currentStudentCount = roomData.students.size;
            const maxStudents = roomData.maxStudents || 30;

            console.log(`Room ${room} capacity: ${currentStudentCount}/${maxStudents}`);

            // If room is full and this is a new student (not reconnecting)
            if (currentStudentCount >= maxStudents && !roomData.students.has(user)) {
                console.log(`❌ Room ${room} is FULL! Rejecting student ${user}`);

                // Send error to student
                if (typeof callback === 'function') {
                    callback({
                        status: 'error',
                        message: `Room is full (${maxStudents}/${maxStudents} students). Please try another room.`
                    });
                }

                // Disconnect from room
                socket.leave(room);
                return; // Stop processing
            }

            // Check if student with same username already exists
            if (roomData.students.has(user)) {
                const oldSocketId = roomData.students.get(user);
                console.log(`Student ${user} reconnecting - removing old socket ${oldSocketId}`);

                // Notify teacher to remove old tab
                io.to(room).emit('user_left', { id: oldSocketId, username: user });
            }

            // Update/add student with new socket ID
            roomData.students.set(user, socket.id);
            console.log(`✅ Student ${user} joined room ${room} (${roomData.students.size}/${maxStudents}) with socket ${socket.id}`);
        }

        // If callback exists (Student functionality), call it
        if (typeof callback === 'function') {
            callback({
                status: 'ok',
                roomInfo: {
                    currentStudents: roomData.students.size,
                    maxStudents: roomData.maxStudents,
                    topic: roomData.topic
                }
            });
        }

        // Notify everyone in room (including sender) about the new student
        if (!isTeacher) {
            io.to(room).emit('user_joined', { username: user, id: socket.id });
            console.log(`✅ Broadcast user_joined for ${user} to room ${room}`);
        }
    });

    socket.on('drawing_data', (data) => {
        console.log('📥 SERVER RECEIVED drawing_data from', socket.id, 'room:', data.roomId);
        const updateData = { ...data, userId: socket.id };
        console.log('📡 SERVER BROADCASTING drawing_UPDATE to room', data.roomId);
        socket.to(data.roomId).emit('drawing_UPDATE', updateData);
        console.log('✅ drawing_UPDATE BROADCASTED');
    });

    socket.on('object_deleted', (data) => {
        socket.to(data.roomId).emit('object_deleted', data);
    });

    // Handle student submitting answer to Problem Bank
    socket.on('answer_submitted', (data) => {
        const { roomCode, studentName, studentEmail, isCorrect, problemNumber } = data;
        console.log(`📝 Score Update: ${studentName} answered problem ${problemNumber} (${isCorrect ? '✅' : '❌'}) in room ${roomCode}`);

        // Broadcast to teacher in the room
        socket.to(roomCode).emit('score_updated', data);
    });

    // Canvas State Sync for Viewer Mode
    socket.on('request_canvas_state', (data) => {
        const { roomId, studentSocketId } = data;
        console.log(`📞 Teacher ${socket.id} requesting canvas state from student ${studentSocketId}`);

        // Forward request to specific student
        io.to(studentSocketId).emit('send_canvas_state', {
            requesterId: socket.id
        });
    });

    socket.on('canvas_state_response', (data) => {
        const { canvasJSON, requesterId } = data;
        console.log(`📤 Student sending canvas state to teacher ${requesterId}`);

        // Send canvas state to requesting teacher
        io.to(requesterId).emit('receive_canvas_state', {
            canvasJSON,
            studentId: socket.id
        });
    });

    // Request canvas state for entire room (viewer joining)
    socket.on('request_canvas_state_for_room', (data) => {
        const { roomId } = data;
        console.log(`📞 Viewer ${socket.id} requesting canvas state for room ${roomId}`);

        // SIMPLE BROADCAST: Send request to ALL sockets in this room (excluding requester)
        // This is more reliable than trying to track students in rooms Map
        socket.to(roomId).emit('send_canvas_state', {
            requesterId: socket.id
        });

        console.log(`📨 Broadcasted canvas state request to room ${roomId}`);
    });

    // Camera Frame Streaming
    socket.on('camera_frame', (data) => {
        const { roomId, studentId, studentName, frame, timestamp } = data;

        // Debug log (only first frame per student to avoid spam)
        if (!socket.cameraLoggedOnce) {
            console.log(`📹 Camera frame from ${studentName} (${studentId}) in room ${roomId}`);
            socket.cameraLoggedOnce = true;
        }

        // Broadcast frame to all other users in room (teacher)
        socket.to(roomId).emit('camera_frame_broadcast', {
            studentId,
            studentName,
            frame,
            timestamp
        });
    });

    // Camera Status Updates
    socket.on('camera_status_change', (data) => {
        const { roomId, studentId, studentName, isEnabled } = data;
        console.log(`📹 Camera ${isEnabled ? 'ON' : 'OFF'}: ${studentName} in room ${roomId}`);

        // Notify teacher
        socket.to(roomId).emit('student_camera_status', {
            studentId,
            studentName,
            isEnabled
        });
    });

    // Audio Chunk Streaming
    socket.on('audio_chunk', (data) => {
        const { roomId, studentId, studentName, audio, timestamp } = data;

        // Debug log (only first chunk per student)
        if (!socket.audioLoggedOnce) {
            console.log(`🎤 Audio stream from ${studentName} in room ${roomId}`);
            socket.audioLoggedOnce = true;
        }

        // Broadcast audio to all other users in room (teacher)
        socket.to(roomId).emit('audio_chunk_broadcast', {
            studentId,
            studentName,
            audio,
            timestamp
        });
    });

    // Microphone Status Updates
    socket.on('mic_status_change', (data) => {
        const { roomId, studentId, studentName, isEnabled } = data;
        console.log(`🎤 Mic ${isEnabled ? 'ON' : 'OFF'}: ${studentName} in room ${roomId}`);

        // Notify teacher
        socket.to(roomId).emit('student_mic_status', {
            studentId,
            studentName,
            isEnabled
        });
    });

    // Teacher returned to dashboard - notify students to refresh
    socket.on('teacher_returned_to_dashboard', (data) => {
        console.log(`📢 Teacher returned to dashboard in room ${data.roomId} - broadcasting to students`);
        // Broadcast to all students in room (not including teacher)
        socket.to(data.roomId).emit('teacher_returned');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Clean up: find and remove from rooms
        rooms.forEach((roomData, roomId) => {
            // Check if disconnected socket was a student
            for (const [username, socketId] of roomData.students.entries()) {
                if (socketId === socket.id) {
                    roomData.students.delete(username);
                    io.to(roomId).emit('user_left', { id: socket.id, username });
                    console.log(`Student ${username} left room ${roomId}`);
                    break;
                }
            }

            // Clean up empty rooms
            if (roomData.teacher === null && roomData.students.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} cleaned up (empty)`);
            }
        });
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
