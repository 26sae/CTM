import React, { useState } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/shared/BottomNav';
import StartupPage from './pages/StartupPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import TransactionsPage from './pages/TransactionsPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import NotificationsPage from './pages/NotificationsPage';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';

const SESSION_KEY = 'binangonanbank.user';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function persistUser(user) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Could not persist the signed-in user:', error);
  }
}

function App() {
  const [initialUser] = useState(readStoredUser);
  const [user, setUser] = useState(initialUser);
  const [screen, setScreen] = useState(() => {
    if (!initialUser) return 'startup';
    return initialUser.role === 'admin' ? 'admin' : 'dashboard';
  });

  const navigate = (to) => setScreen(to);

  const onLogin = (userData) => {
    persistUser(userData);
    setUser(userData);
    navigate(userData.role === 'admin' ? 'admin' : 'dashboard');
  };

  const onLogout = () => {
    persistUser(null);
    setUser(null);
    navigate('login');
  };

  const onUpdateUser = (updates) => {
    const merged = { ...user, ...updates };
    setUser(merged);
    persistUser(merged);
  };

  const showNav = ['dashboard', 'accounts', 'activity', 'profile'].includes(screen);

  return (
    <ErrorBoundary>
      <div className="shell">
        <div className={showNav ? 'page' : 'page-full'}>
          {screen === 'startup' && <StartupPage onNavigate={navigate} />}
          {screen === 'login' && <LoginPage onNavigate={navigate} onLogin={onLogin} />}
          {screen === 'register' && <RegisterPage onNavigate={navigate} onLogin={onLogin} />}

          {screen === 'dashboard' && <DashboardPage user={user} onNavigate={navigate} />}
          {screen === 'accounts' && <AccountsPage user={user} onNavigate={navigate} />}
          {screen === 'activity' && <TransactionsPage user={user} onNavigate={navigate} />}
          {screen === 'profile' && <ProfilePage user={user} onNavigate={navigate} onLogout={onLogout} />}

          {screen === 'edit-profile' && (
            <EditProfilePage user={user} onNavigate={navigate} onUpdateUser={onUpdateUser} />
          )}
          {screen === 'change-password' && (
            <ChangePasswordPage user={user} onNavigate={navigate} />
          )}
          {screen === 'notifications' && <NotificationsPage onNavigate={navigate} />}
          {screen === 'help' && <HelpPage onNavigate={navigate} />}
          {screen === 'about' && <AboutPage onNavigate={navigate} />}

          {screen === 'admin' && (
            <AdminPage user={user} onNavigate={navigate} onLogout={onLogout} />
          )}
        </div>

        {showNav && <BottomNav currentScreen={screen} onNavigate={navigate} />}
      </div>
    </ErrorBoundary>
  );
}

export default App;
