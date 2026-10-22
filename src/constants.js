const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_BASE_URL = (
  /^https?:\/\//i.test(configuredApiBase) ? configuredApiBase : `https://${configuredApiBase}`
).replace(/\/+$/, '');

export const BANK = {
  name: 'Binangonan Banking Corporation',
  shortName: 'Binangonan Bank',
  tagline: 'Banking built around you.',
  location: 'Binangonan, Rizal',
  currency: 'PHP',
  version: '1.0.0',
};

export const SLIDES = [
  {
    eyebrow: 'Welcome to Binangonan Bank',
    title: 'Banking that feels personal.',
    desc: 'A secure, straightforward home for your everyday finances — built for the people of Binangonan.',
    icon: 'shield',
  },
  {
    eyebrow: 'Everything in one place',
    title: 'Your accounts, clearly.',
    desc: 'View balances, review recent activity, and search your transaction history without the clutter.',
    icon: 'wallet',
  },
  {
    eyebrow: 'Always within reach',
    title: 'Know where your money goes.',
    desc: 'Deposits, withdrawals, transfers and payments are organized in one clean statement view.',
    icon: 'activity',
  },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: 'dashboard' },
  { id: 'accounts', label: 'Accounts', icon: 'wallet' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export const PROFILE_MENU = [
  { icon: 'edit', tint: 'blue', label: 'Edit Profile', sub: 'Update your personal details', to: 'edit-profile' },
  { icon: 'lock', tint: 'gold', label: 'Change Password', sub: 'Keep your account secure', to: 'change-password' },
  { icon: 'bell', tint: 'green', label: 'Notifications', sub: 'Manage alert preferences', to: 'notifications' },
  { icon: 'help', tint: 'violet', label: 'Help & Support', sub: 'FAQs and contact details', to: 'help' },
  { icon: 'info', tint: 'slate', label: 'About Binangonan Bank', sub: 'Version 1.0.0', to: 'about' },
];

export const FAQS = [
  {
    q: 'How do I view my account balance?',
    a: 'Sign in and open the Accounts tab. Your available balances and account numbers are listed there.',
  },
  {
    q: 'How do I review an old transaction?',
    a: 'Open the Activity tab to see your full statement history, or use the search box on the dashboard to look up a reference number, description, or category.',
  },
  {
    q: 'What should I do if I see an unfamiliar transaction?',
    a: 'Contact Binangonan Bank support immediately at support@binangonanbank.test or call 1-800-BBCARE.',
  },
  {
    q: 'Can I change my password?',
    a: 'Yes. Go to Profile, choose Change Password, and confirm your current password before setting a new one.',
  },
  {
    q: 'Is this a real bank?',
    a: 'No. This is a fictional banking application built for a cybersecurity attack simulation. Do not enter real personal or financial information.',
  },
];

export const NOTIFICATION_ROWS = [
  { key: 'deposits', label: 'Deposit Alerts', desc: 'Get notified when money arrives' },
  { key: 'withdrawals', label: 'Withdrawal Alerts', desc: 'Alerts for ATM and over-the-counter withdrawals' },
  { key: 'security', label: 'Security Alerts', desc: 'New sign-ins and password changes' },
  { key: 'statements', label: 'Monthly Statements', desc: 'Your statement is ready to view' },
  { key: 'promotions', label: 'Bank Updates', desc: 'Product news from Binangonan Bank' },
];

export const TRANSACTION_META = {
  deposit: { label: 'Deposit', icon: 'arrowDown', sign: '+', tone: 'positive' },
  withdrawal: { label: 'Withdrawal', icon: 'arrowUp', sign: '-', tone: 'negative' },
  transfer: { label: 'Transfer', icon: 'transfer', sign: '-', tone: 'neutral' },
  payment: { label: 'Payment', icon: 'card', sign: '-', tone: 'warning' },
};

export const ACCOUNT_META = {
  Checking: { icon: 'wallet', tone: 'blue', desc: 'Everyday account' },
  Savings: { icon: 'shield', tone: 'green', desc: 'Savings account' },
  Credit: { icon: 'card', tone: 'gold', desc: 'Credit account' },
};

export const ADMIN_EVENT_META = {
  login_success: { label: 'Login success', tone: 'success', icon: 'check' },
  login_failed: { label: 'Login failed', tone: 'danger', icon: 'alert' },
  sqli_attempt: { label: 'SQLi attempt', tone: 'danger', icon: 'shield' },
  admin_action: { label: 'Admin action', tone: 'info', icon: 'users' },
  register_success: { label: 'Registration', tone: 'success', icon: 'user' },
  password_changed: { label: 'Password change', tone: 'warning', icon: 'lock' },
};

export const LOG_EVENT_OPTIONS = [
  { value: 'all', label: 'All events' },
  { value: 'login_failed', label: 'Login failed' },
  { value: 'login_success', label: 'Login success' },
  { value: 'sqli_attempt', label: 'SQLi attempt' },
  { value: 'admin_action', label: 'Admin action' },
  { value: 'register_success', label: 'Registration' },
  { value: 'password_changed', label: 'Password change' },
];

export const ACCOUNT_TYPES = ['Checking', 'Savings', 'Credit'];
export const ACCOUNT_STATUSES = ['active', 'frozen', 'closed'];
export const USER_STATUSES = ['active', 'locked', 'closed'];
export const USER_ROLES = ['customer', 'admin'];
