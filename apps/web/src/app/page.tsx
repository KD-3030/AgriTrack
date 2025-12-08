'use client';

import { useRouter } from 'next/navigation';
import { Tractor, LayoutDashboard, User } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tractor size={48} className="text-green-600" />
            <h1 className="text-5xl font-bold text-gray-900">AgriTrack</h1>
          </div>
          <p className="text-xl text-gray-600">Smart Crop Residue Management</p>
          <p className="text-sm text-gray-500 mt-2">भारत सरकार | Government of India</p>
        </div>

        {/* Portal Selection */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Portal */}
          <div
            onClick={() => router.push('/dashboard')}
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
                <li>✅ Crop Residue Allocation</li>
              </ul>
              <div className="bg-blue-50 text-blue-700 py-3 px-6 rounded-lg font-semibold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                Enter Dashboard →
              </div>
            </div>
          </div>

          {/* Farmer Portal */}
          <div
            onClick={() => router.push('/farmer')}
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
                <li>✅ Digital Receipt with QR Code</li>
                <li>✅ Work Verification Graph</li>
                <li>✅ Offline Booking Support</li>
              </ul>
              <div className="bg-green-50 text-green-700 py-3 px-6 rounded-lg font-semibold group-hover:bg-green-600 group-hover:text-white transition-colors">
                Enter Portal →
              </div>
            </div>
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
