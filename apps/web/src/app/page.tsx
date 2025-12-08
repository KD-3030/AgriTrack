'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tractor, LayoutDashboard, User, LogIn, LogOut, Shield, Leaf, Store, Award } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
  isGreenFarmer?: boolean;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const storedUser = localStorage.getItem('agritrack_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('agritrack_user');
        localStorage.removeItem('agritrack_token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agritrack_user');
    localStorage.removeItem('agritrack_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* User Status Bar */}
        {user && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-blue-100' : 'bg-green-100'}`}>
                {user.role === 'admin' ? (
                  <Shield size={20} className="text-blue-600" />
                ) : (
                  <Leaf size={20} className="text-green-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 capitalize">{user.role}</span>
                  {user.isGreenFarmer && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      🌱 Green Certified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tractor size={48} className="text-green-600" />
            <h1 className="text-5xl font-bold text-gray-900">AgriTrack</h1>
          </div>
          <p className="text-xl text-gray-600">Smart Crop Residue Management</p>
          <p className="text-sm text-gray-500 mt-2">भारत सरकार | Government of India</p>
        </div>

        {/* Login Button if not logged in */}
        {!user && (
          <div className="text-center mb-8">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg"
            >
              <LogIn size={20} />
              Sign In to Your Account
            </button>
          </div>
        )}

        {/* Portal Selection */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Portal */}
          <div
            onClick={() => router.push(user?.role === 'admin' ? '/dashboard' : '/login')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-400 group"
          >
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <LayoutDashboard size={40} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h2>
              <p className="text-gray-600 mb-4">प्रशासन पोर्टल</p>
              <ul className="text-sm text-gray-600 text-left space-y-2 mb-6">
                <li>✅ Real-time Machine Monitoring</li>
                <li>✅ Fleet Management Dashboard</li>
                <li>✅ AI Analytics & Reports</li>
                <li>✅ Harvest Scheduling System</li>
              </ul>
              <div className="bg-blue-50 text-blue-700 py-3 px-6 rounded-lg font-semibold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {user?.role === 'admin' ? 'Enter Dashboard →' : 'Login as Admin →'}
              </div>
            </div>
          </div>

          {/* Farmer Portal */}
          <div
            onClick={() => router.push(user?.role === 'farmer' ? '/farmer' : '/login')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-green-400 group"
          >
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <User size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Farmer Portal</h2>
              <p className="text-gray-600 mb-4">किसान पोर्टल</p>
              <ul className="text-sm text-gray-600 text-left space-y-2 mb-6">
                <li>✅ Book Machinery</li>
                <li>✅ Green Certificate & Benefits</li>
                <li>✅ Mandi Prices & Marketplace</li>
                <li>✅ Work Verification with QR</li>
              </ul>
              <div className="bg-green-50 text-green-700 py-3 px-6 rounded-lg font-semibold group-hover:bg-green-600 group-hover:text-white transition-colors">
                {user?.role === 'farmer' ? 'Enter Portal →' : 'Login as Farmer →'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-md">
            <Store size={24} className="text-orange-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm">Mandi Prices</h4>
            <p className="text-xs text-gray-500">Real-time crop rates</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md">
            <Award size={24} className="text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm">Green Certificate</h4>
            <p className="text-xs text-gray-500">Earn rewards</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md">
            <Leaf size={24} className="text-emerald-500 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-900 text-sm">Premium Prices</h4>
            <p className="text-xs text-gray-500">15-25% better rates</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Smart India Hackathon 2025 | Problem ID: SIH25261</p>
          <p className="mt-1">🌾 Empowering farmers, monitoring machinery, preserving environment</p>
        </div>
      </div>
    </div>
  );
}
