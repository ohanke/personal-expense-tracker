import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    useWebSocket();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="w-full max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Expense Tracker</h1>
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="hidden sm:flex items-center gap-3">
                                <p className="text-sm font-semibold text-slate-700">
                                    {user.display_name || user.email}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            Wyloguj się
                        </button>
                    </div>
                </div>
            </header>

            {/* Dodano flex i justify-center aby wyśrodkować aplikację w pionie */}
            <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
                <Outlet />
            </main>
        </div>
    );
}