import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentRoom from './pages/StudentRoom';
import SessionHistory from './pages/SessionHistory';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />
                <Route path="/history" element={
                    <ProtectedRoute>
                        <SessionHistory />
                    </ProtectedRoute>
                } />
                <Route path="/teacher/:roomId" element={
                    <ProtectedRoute>
                        <TeacherDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/student/:roomId" element={
                    <ProtectedRoute>
                        <StudentRoom />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
