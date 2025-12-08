'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tractor, BookOpen, Activity, Mic, MapPin, Clock } from 'lucide-react';
import io from 'socket.io-client';

interface Machine {
  id: string;
  name?: string;
  state: string;
  gps?: { lat: number; lng: number };
  temp?: number;
  vibration?: { x: number; y: number; z: number };
  speed?: number;
  distance?: {
    km: number;
    direction: string;
    eta: {
      minutes: number;
      formatted: string;
    };
  };
}

export default function FarmerHome() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          fetchMachines(location);
        },
        (error) => {
          console.warn('Location access denied:', error);
          setLocationError('Location access denied. Showing all machines without distance info.');
          fetchMachines(null);
        }
      );
    } else {
      setLocationError('Location not supported by browser.');
      fetchMachines(null);
    }

    // Connect to WebSocket for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    
    socket.on('device_update', (updatedMachine: Machine) => {
      setMachines(prev => {
        const exists = prev.find(m => m.id === updatedMachine.id);
        if (exists) {
          return prev.map(m => m.id === updatedMachine.id ? { ...m, ...updatedMachine } : m);
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchMachines = async (location: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/machines/available`);
      
      if (location) {
        url.searchParams.append('lat', location.lat.toString());
        url.searchParams.append('lng', location.lng.toString());
        url.searchParams.append('limit', '5');
      } else {
        url.searchParams.append('limit', '5');
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Tractor size={32} />
            <h1 className="text-2xl font-bold">AgriTrack</h1>
          </div>
          <p className="text-green-100">किसान पोर्टल | Farmer Portal</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => router.push('/farmer/book')}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-green-200 hover:border-green-400"
          >
            <BookOpen className="w-12 h-12 text-green-600 mb-3 mx-auto" />
            <h2 className="text-lg font-semibold text-center">Book Machine</h2>
            <p className="text-sm text-gray-600 text-center mt-1">मशीन बुक करें</p>
          </button>

          <button
            onClick={() => router.push('/farmer/bookings')}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-blue-200 hover:border-blue-400"
          >
            <Activity className="w-12 h-12 text-blue-600 mb-3 mx-auto" />
            <h2 className="text-lg font-semibold text-center">My Bookings</h2>
            <p className="text-sm text-gray-600 text-center mt-1">मेरी बुकिंग</p>
          </button>
        </div>

        {/* Available Machines */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tractor className="text-green-600" />
            Available Machines (उपलब्ध मशीनें)
          </h2>

          {locationError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
              ⚠️ {locationError}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Finding nearest machines...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No machines available at the moment
            </div>
          ) : (
            <div className="space-y-3">
              {machines.map((machine, index) => (
                <div
                  key={machine.id}
                  className="border-2 rounded-lg p-4 hover:bg-gray-50 transition-all cursor-pointer hover:border-green-400"
                  onClick={() => router.push(`/farmer/book?machine=${machine.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{machine.name || machine.id}</h3>
                        {index === 0 && machine.distance && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                            NEAREST
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: <span className={`font-medium ${
                          machine.state === 'idle' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {machine.state === 'idle' ? '✓ Available' : '⚡ Working'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Distance & ETA Info */}
                  {machine.distance && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-blue-900">
                          <MapPin size={16} className="text-blue-600" />
                          <span className="font-semibold">{machine.distance.km} km</span>
                          <span className="text-blue-600">({machine.distance.direction})</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-900">
                          <Clock size={16} className="text-blue-600" />
                          <span className="font-semibold">ETA: {machine.distance.eta.formatted}</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700">
                        🚜 Machine can reach your location in approximately {machine.distance.eta.formatted}
                      </p>
                    </div>
                  )}

                  {/* Machine Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    {machine.temp !== undefined && (
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-600">Temperature</p>
                        <p className="font-semibold text-gray-900">{Math.round(machine.temp)}°C</p>
                      </div>
                    )}
                    {machine.speed !== undefined && (
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-600">Speed</p>
                        <p className="font-semibold text-gray-900">{Math.round(machine.speed)} km/h</p>
                      </div>
                    )}
                    {machine.vibration && (
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-600">Vibration</p>
                        <p className="font-semibold text-gray-900">
                          {Math.round(Math.sqrt(machine.vibration.x**2 + machine.vibration.y**2 + machine.vibration.z**2) * 100)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice Assistant Hint */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Mic className="text-blue-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900">Voice Assistant</h3>
            <p className="text-sm text-blue-700">
              Use voice commands on booking page: "Book Tractor" or "Status"
            </p>
            <p className="text-xs text-blue-600 mt-1">
              हिंदी में भी बोलें: "ट्रैक्टर बुक करो"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
