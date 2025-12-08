'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Tractor, ArrowLeft, Wifi, WifiOff } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
  status: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

function BookMachineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [acres, setAcres] = useState('');
  const [location, setLocation] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    fetchMachines();
    
    // Pre-select machine from query params
    const machineId = searchParams.get('machine');
    if (machineId) {
      setSelectedMachine(machineId);
    }

    // Check online status
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Initialize speech recognition
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN'; // Hindi

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        setTranscript(speechResult);
        handleVoiceCommand(speechResult);
      };

      recognitionRef.current.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, [searchParams]);

  const fetchMachines = async () => {
    try {
      // Try to get user location for sorting
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/machines/available?limit=10`;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          url += `&lat=${position.coords.latitude}&lng=${position.coords.longitude}`;
        } catch (err) {
          console.log('Location not available, showing all machines');
        }
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    }
  };

  const handleVoiceCommand = (command: string) => {
    if (command.includes('book') || command.includes('बुक')) {
      if (selectedMachine && farmerName && farmerPhone && acres && location) {
        handleSubmit(new Event('submit') as any);
      } else {
        alert('कृपया सभी जानकारी भरें | Please fill all fields');
      }
    } else if (command.includes('status') || command.includes('स्टेटस')) {
      router.push('/farmer/bookings');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const bookingData = {
      machine_id: selectedMachine,
      farmer_name: farmerName,
      farmer_phone: farmerPhone,
      acres: parseFloat(acres),
      location: location,
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to receipt page
        router.push(`/farmer/receipt/${data.booking.id}`);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      
      // Save to localStorage for offline sync
      if (!isOnline) {
        const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
        const offlineBooking = {
          ...bookingData,
          id: `offline_${Date.now()}`,
          offline: true
        };
        offlineBookings.push(offlineBooking);
        localStorage.setItem('offline_bookings', JSON.stringify(offlineBookings));
        
        alert('📵 No internet! Booking saved offline. Will sync when online.');
        router.push(`/farmer/receipt/${offlineBooking.id}`);
      } else {
        alert('Booking failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-green-700 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Book Machine | मशीन बुक करें</h1>
        </div>
      </div>

      {/* Online Status */}
      <div className={`py-2 text-center text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
        {isOnline ? (
          <span className="flex items-center justify-center gap-2">
            <Wifi size={16} /> Online
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <WifiOff size={16} /> Offline - Bookings will sync when online
          </span>
        )}
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          
          {/* Voice Assistant */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Booking Details</h2>
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-full transition-colors ${
                isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>

          {transcript && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <strong>Heard:</strong> {transcript}
            </div>
          )}

          {/* Machine Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Machine <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Select Machine --</option>
              {machines.map((machine: any) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name || machine.id} - {machine.state}
                  {machine.distance ? ` (${machine.distance.km}km away, ETA: ${machine.distance.eta.formatted})` : ''}
                </option>
              ))}
            </select>
            {machines.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Loading available machines...</p>
            )}
          </div>

          {/* Farmer Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Name | आपका नाम <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              required
              placeholder="Enter your name"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number | फोन नंबर <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={farmerPhone}
              onChange={(e) => setFarmerPhone(e.target.value)}
              required
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Acres */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Land Area (Acres) | जमीन (एकड़) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              required
              step="0.1"
              min="0.1"
              placeholder="e.g., 5.5"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Village / Location | गांव <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="Enter village or location"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Booking...' : '📝 Confirm Booking | बुकिंग करें'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookMachine() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <BookMachineContent />
    </Suspense>
  );
}
