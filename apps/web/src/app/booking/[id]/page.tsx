'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Clock, Tractor, Calendar, User, Phone, MapPin, Wheat, Download, Home } from 'lucide-react';

interface BookingDetails {
  id: string;
  machine_id: string;
  machine_name?: string;
  machine_type?: string;
  farmer_name: string;
  farmer_phone: string;
  location: string;
  acres: number;
  status: string;
  scheduled_date?: string;
  created_at: string;
}

export default function BookingQRPage() {
  const params = useParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooking();
  }, [params.id]);

  const loadBooking = async () => {
    const bookingId = params.id as string;
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Booking not found');
      }
      
      const data = await response.json();
      setBooking(data);
    } catch (err) {
      console.error('Failed to load booking:', err);
      setError('Booking not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (booking?.status?.toLowerCase()) {
      case 'confirmed':
        return { 
          icon: <CheckCircle className="text-green-500" size={56} />,
          text: 'Confirmed | पुष्टि हो गई',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-500'
        };
      case 'completed':
        return { 
          icon: <CheckCircle className="text-blue-500" size={56} />,
          text: 'Completed | पूर्ण',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-500'
        };
      case 'pending':
        return { 
          icon: <Clock className="text-orange-500" size={56} />,
          text: 'Pending | लंबित',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-500'
        };
      case 'in_progress':
        return { 
          icon: <Tractor className="text-yellow-500" size={56} />,
          text: 'In Progress | प्रगति में',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-500'
        };
      case 'cancelled':
        return { 
          icon: <AlertCircle className="text-red-500" size={56} />,
          text: 'Cancelled | रद्द',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-500'
        };
      default:
        return { 
          icon: <AlertCircle className="text-gray-500" size={56} />,
          text: booking?.status || 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-500'
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMachineTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'super seeder':
        return '🌾';
      case 'baler':
        return '🎋';
      case 'happy seeder':
        return '🌱';
      case 'rotavator':
        return '⚙️';
      case 'mulcher':
        return '🪵';
      default:
        return '🚜';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading booking details...</p>
          <p className="text-gray-500 text-sm">बुकिंग विवरण लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-2 border-red-200">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={80} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Booking</h1>
          <p className="text-gray-600 mb-2 text-lg">अमान्य बुकिंग</p>
          <p className="text-sm text-gray-500 mb-6">{error || 'This booking could not be found.'}</p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home size={20} />
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const bookingDate = booking.scheduled_date || booking.created_at;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header with Indian Flag Colors */}
        <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 h-3 rounded-t-2xl"></div>
        
        {/* Main Card */}
        <div className="bg-white rounded-b-2xl shadow-2xl overflow-hidden border-2 border-green-200">
          
          {/* Government Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 text-center">
            <div className="text-5xl mb-3">🇮🇳</div>
            <h1 className="text-2xl font-bold">AgriTrack</h1>
            <p className="text-blue-200 text-sm mt-1">Crop Residue Management System</p>
            <p className="text-blue-300 text-xs mt-1">भारत सरकार | Government of India</p>
          </div>

          {/* Booking Status Banner */}
          <div className={`p-6 border-b-2 ${statusInfo.bgColor} ${statusInfo.borderColor} flex flex-col items-center justify-center`}>
            {statusInfo.icon}
            <h2 className={`text-xl font-bold mt-3 ${statusInfo.textColor}`}>
              {statusInfo.text}
            </h2>
          </div>

          {/* Booking ID */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 border-b text-center">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Booking ID | बुकिंग आईडी</p>
            <p className="text-2xl font-bold text-green-700 font-mono mt-1">{booking.id}</p>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-6">
            
            {/* Machine Details - Highlighted */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{getMachineTypeIcon(booking.machine_type)}</div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Machine Booked | बुक की गई मशीन</p>
                  <h3 className="text-2xl font-bold text-blue-900">
                    {booking.machine_name || booking.machine_type || 'Agricultural Machine'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <Tractor size={18} />
                <span className="text-sm">Machine ID: {booking.machine_id}</span>
              </div>
            </div>

            {/* Booking Date - Highlighted */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border-2 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-3 rounded-full">
                  <Calendar className="text-amber-600" size={28} />
                </div>
                <div>
                  <p className="text-sm text-amber-600 font-medium">Booking Date | बुकिंग की तारीख</p>
                  <p className="text-xl font-bold text-amber-900">
                    {formatDate(bookingDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Farmer Details */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b pb-2">
                Farmer Details | किसान विवरण
              </h4>
              
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <User className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Name | नाम</p>
                  <p className="font-semibold text-gray-900">{booking.farmer_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Phone className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone | फोन</p>
                  <p className="font-semibold text-gray-900">{booking.farmer_phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <MapPin className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Location | स्थान</p>
                  <p className="font-semibold text-gray-900">{booking.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full">
                  <Wheat className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Land Area | भूमि क्षेत्र</p>
                  <p className="font-semibold text-gray-900">{booking.acres} acres</p>
                </div>
              </div>
            </div>

            {/* Verification Badge */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="text-green-600" size={28} />
                <span className="text-lg font-bold text-green-800">Verified Booking</span>
              </div>
              <p className="text-sm text-green-700">This is a valid official booking receipt.</p>
              <p className="text-xs text-green-600 mt-1">यह एक वैध आधिकारिक बुकिंग रसीद है।</p>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-sm">
              <p className="font-semibold text-yellow-800 mb-1">⚠️ Important | महत्वपूर्ण</p>
              <p className="text-yellow-700">
                Show this to Police/Patwari/Officials if questioned about stubble burning.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                पराली जलाने के बारे में पूछताछ होने पर इसे अधिकारियों को दिखाएं।
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500">Crop Residue Management - AgriTrack</p>
            <p className="text-xs text-gray-400 mt-1">Smart India Hackathon 2025</p>
          </div>

          {/* Tricolor Bottom */}
          <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 h-3"></div>
        </div>
      </div>
    </div>
  );
}
