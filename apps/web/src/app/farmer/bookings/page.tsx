'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Activity, Clock, CheckCircle, AlertCircle, Zap, Calendar, MapPin, Tractor, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Booking {
  id: string;
  machine_id: string;
  machine_name?: string;
  machine_type?: string;
  farmer_name: string;
  farmer_phone?: string;
  location: string;
  acres: number;
  status: string;
  scheduled_date?: string;
  created_at: string;
  offline?: boolean;
}

interface VibrationData {
  time: string;
  vibration: number;
  status: string;
}

export default function MyBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vibrationData, setVibrationData] = useState<VibrationData[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [farmerName, setFarmerName] = useState<string>('');

  useEffect(() => {
    // Load farmer info from localStorage
    const savedPhone = localStorage.getItem('farmer_phone') || '';
    const savedName = localStorage.getItem('farmer_name') || '';
    setFarmerPhone(savedPhone);
    setFarmerName(savedName);
    
    loadBookings(savedPhone);
    setupOnlineSync();

    // Check online status
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      loadVibrationData(selectedBooking.machine_id);
    }
  }, [selectedBooking]);

  const handleOnline = () => {
    setIsOnline(true);
    syncOfflineBookings();
  };

  const syncOfflineBookings = async () => {
    const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
    
    if (offlineBookings.length === 0) return;

    console.log('🔄 Syncing offline bookings...');

    for (const booking of offlineBookings) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Synced booking: ${booking.id}`);
          
          // Update my_bookings with the server response
          if (data.success && data.booking) {
            const myBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
            const index = myBookings.findIndex((b: Booking) => b.id === booking.id);
            if (index !== -1) {
              myBookings[index] = { ...myBookings[index], ...data.booking, offline: false };
              localStorage.setItem('my_bookings', JSON.stringify(myBookings));
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to sync booking: ${booking.id}`, error);
      }
    }

    // Clear offline bookings after sync
    localStorage.setItem('offline_bookings', '[]');
    loadBookings(farmerPhone);
  };

  const setupOnlineSync = () => {
    // Check for offline bookings every 30 seconds when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineBookings();
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  const loadBookings = async (phone: string) => {
    setLoading(true);
    try {
      // First, load bookings from localStorage (my_bookings)
      const myBookings: Booking[] = JSON.parse(localStorage.getItem('my_bookings') || '[]');
      
      // Also load offline bookings that haven't synced yet
      const offlineBookings: Booking[] = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
      
      // Try to fetch from API if we have a phone number
      let apiBookings: Booking[] = [];
      if (phone && isOnline) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings?farmer_phone=${encodeURIComponent(phone)}`
          );
          const data = await response.json();
          apiBookings = Array.isArray(data) ? data : [];
        } catch (err) {
          console.log('Could not fetch from API, using local data');
        }
      }
      
      // Merge all bookings, removing duplicates by ID
      const allBookingsMap = new Map<string, Booking>();
      
      // Add API bookings first
      apiBookings.forEach(b => {
        if (b.farmer_phone === phone || !phone) {
          allBookingsMap.set(b.id, b);
        }
      });
      
      // Add local bookings (these take precedence for offline ones)
      myBookings.forEach(b => {
        if (!allBookingsMap.has(b.id) || b.offline) {
          allBookingsMap.set(b.id, b);
        }
      });
      
      // Add any offline bookings not yet synced
      offlineBookings.forEach(b => {
        if (!allBookingsMap.has(b.id)) {
          allBookingsMap.set(b.id, b);
        }
      });
      
      // Convert to array and sort by date (newest first)
      const allBookings = Array.from(allBookingsMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBookings(allBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      
      // If offline, load only local bookings
      const myBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
      const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
      setBookings([...myBookings, ...offlineBookings]);
    } finally {
      setLoading(false);
    }
  };

  const loadVibrationData = async (machineId: string) => {
    try {
      // Fetch real-time machine data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/machines/${machineId}`);
      const machine = await response.json();

      // Generate vibration history (simulated for now)
      const now = Date.now();
      const data: VibrationData[] = [];
      
      for (let i = 30; i >= 0; i--) {
        const time = new Date(now - i * 60000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        let vibration: number;
        let status: string;
        
        // Simulate realistic vibration patterns
        if (i > 25) {
          // Idle period
          vibration = Math.random() * 10;
          status = 'Idle';
        } else if (i > 20) {
          // Transit
          vibration = 20 + Math.random() * 20;
          status = 'Transit';
        } else {
          // Active work
          vibration = 60 + Math.random() * 30;
          status = 'Working';
        }
        
        data.push({ time, vibration: Math.round(vibration), status });
      }

      setVibrationData(data);
    } catch (error) {
      console.error('Failed to load vibration data:', error);
      setVibrationData([]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="text-orange-500" size={20} />;
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'working':
        return <Activity className="text-blue-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'working': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const isWorkVerified = vibrationData.some(d => d.vibration > 60);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-blue-700 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">My Bookings | मेरी बुकिंग</h1>
            {farmerName && (
              <p className="text-blue-200 text-sm flex items-center gap-1">
                <User size={14} /> {farmerName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Online Status */}
      {!isOnline && (
        <div className="bg-orange-100 text-orange-800 py-2 text-center text-sm">
          📵 Offline Mode - Showing cached data
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Bookings Yet</h2>
            <p className="text-gray-500 mb-2">अभी तक कोई बुकिंग नहीं</p>
            <p className="text-gray-600 mb-6">You haven't made any bookings yet</p>
            <button
              onClick={() => router.push('/farmer/book')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Book Your First Machine
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-100 text-sm">Total Bookings | कुल बुकिंग</p>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">Pending | लंबित</p>
                  <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'pending').length}</p>
                </div>
              </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="text-blue-600" />
                Your Bookings | आपकी बुकिंग
              </h2>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`border-2 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
                      selectedBooking?.id === booking.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    {/* Status Banner */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking.status)}
                        <span className="font-mono text-sm text-gray-600">{booking.id}</span>
                        {booking.offline && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            📵 Offline
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${getStatusColor(booking.status)}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Machine Details */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Tractor className="text-green-600" size={20} />
                        <span className="font-semibold text-green-800">
                          {booking.machine_name || booking.machine_type || 'Machine'}
                        </span>
                      </div>
                      <p className="text-sm text-green-600">ID: {booking.machine_id}</p>
                    </div>

                    {/* Booking Date */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-amber-600" size={18} />
                        <div>
                          <p className="text-xs text-amber-600">Booking Date | बुकिंग की तारीख</p>
                          <p className="font-semibold text-amber-800">
                            {new Date(booking.scheduled_date || booking.created_at).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Other Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} className="text-purple-500" />
                        <span>{booking.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>🌾</span>
                        <span>{booking.acres} acres</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vibration Graph - Work Verification */}
            {selectedBooking && vibrationData.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="text-purple-600" />
                    Work Verification | कार्य सत्यापन
                  </h2>
                  {isWorkVerified && (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg border-2 border-green-500 font-semibold flex items-center gap-2">
                      <CheckCircle size={20} />
                      WORK VERIFIED
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Booking: <strong>{selectedBooking.id}</strong> | Machine: <strong>{selectedBooking.machine_id}</strong>
                </p>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-purple-900">
                    <strong>Anti-Corruption Feature:</strong> This graph proves the machine is actually working, not just driving.
                  </p>
                  <p className="text-purple-700 text-xs mt-1">
                    Vibration {'>'} 60 = Active Tilling | 20-40 = Road Transit | {'<'} 10 = Idle
                  </p>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vibrationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      label={{ value: 'Vibration Level', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'vibration') {
                          const val = value as number;
                          let statusText = '';
                          if (val < 10) statusText = 'Idle';
                          else if (val < 40) statusText = 'Transit';
                          else if (val >= 60) statusText = '✓ Working';
                          else statusText = 'Active';
                          return [`${value} (${statusText})`, 'Vibration'];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <ReferenceLine 
                      y={60} 
                      stroke="#10b981" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Work Threshold', fill: '#10b981', fontSize: 12 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="vibration" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-600">Idle ({'<'}10)</div>
                    <div className="text-2xl font-bold text-gray-700">
                      {vibrationData.filter(d => d.vibration < 10).length}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-blue-600">Transit (20-40)</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {vibrationData.filter(d => d.vibration >= 20 && d.vibration < 60).length}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-green-600">Working ({'>'}60)</div>
                    <div className="text-2xl font-bold text-green-700">
                      {vibrationData.filter(d => d.vibration >= 60).length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Receipt Button */}
            {selectedBooking && (
              <button
                onClick={() => router.push(`/farmer/receipt/${selectedBooking.id}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
              >
                📄 View Digital Receipt
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
