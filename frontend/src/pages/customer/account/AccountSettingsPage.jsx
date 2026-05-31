import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/auth.api';
import toast from 'react-hot-toast';

export default function AccountSettingsPage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await authApi.updateProfile(profileForm);
      updateUser(data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect current password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="font-display text-2xl md:text-4xl md:text-5xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>Account Settings</h1>

      {/* Profile section */}
      <div className="card p-6">
        <h2 className="font-semibold text-neutral-900 mb-5">Personal Information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600">
              {user?.first_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-neutral-500">{user?.email}</p>
              <span className="badge badge-neutral capitalize text-xs mt-1">{user?.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input
                type="text"
                className="input"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                type="text"
                className="input"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email address <span className="text-neutral-400 font-normal">(cannot change)</span></label>
            <input type="email" className="input bg-neutral-50 cursor-not-allowed" value={user?.email} disabled />
          </div>

          <div>
            <label className="label">Phone number</label>
            <input
              type="tel"
              className="input"
              placeholder="03xx-xxxxxxx"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>

          <button type="submit" disabled={savingProfile} className="btn-primary py-2.5">
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="card p-6">
        <h2 className="font-semibold text-neutral-900 mb-5">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={passwordForm.old_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary py-2.5">
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
