'use client';

import { useState, useEffect } from 'react';
import { 
  Award, 
  Leaf, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Eye,
  TrendingUp,
  Users,
  Shield,
  Star,
  Filter
} from 'lucide-react';

interface GreenCertificate {
  id: string;
  farmerId: string;
  farmerName: string;
  phone: string;
  district: string;
  state: string;
  village: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  greenCredits: number;
  totalStrawManaged: number;
  co2Prevented: number;
  completedBookings: number;
}

const MOCK_CERTIFICATES: GreenCertificate[] = [
  {
    id: 'gc_001',
    farmerId: 'farmer_001',
    farmerName: 'Gurpreet Singh',
    phone: '+91 9876543210',
    district: 'Ludhiana',
    state: 'Punjab',
    village: 'Jagraon',
    certificateNumber: 'GC-PB-2024-001234',
    issueDate: '2024-06-15',
    expiryDate: '2025-06-14',
    status: 'active',
    tier: 'gold',
    greenCredits: 750,
    totalStrawManaged: 45.5,
    co2Prevented: 82.0,
    completedBookings: 12
  },
  {
    id: 'gc_002',
    farmerId: 'farmer_003',
    farmerName: 'Harjinder Kaur',
    phone: '+91 8765432109',
    district: 'Patiala',
    state: 'Punjab',
    village: 'Rajpura',
    certificateNumber: 'GC-PB-2024-001567',
    issueDate: '2024-08-20',
    expiryDate: '2025-08-19',
    status: 'active',
    tier: 'silver',
    greenCredits: 420,
    totalStrawManaged: 28.3,
    co2Prevented: 51.0,
    completedBookings: 8
  },
  {
    id: 'gc_003',
    farmerId: 'farmer_004',
    farmerName: 'Baldev Singh',
    phone: '+91 9988776655',
    district: 'Amritsar',
    state: 'Punjab',
    village: 'Tarn Taran',
    certificateNumber: 'GC-PB-2024-002341',
    issueDate: '2024-10-01',
    expiryDate: '2025-09-30',
    status: 'active',
    tier: 'platinum',
    greenCredits: 1250,
    totalStrawManaged: 78.2,
    co2Prevented: 140.8,
    completedBookings: 22
  },
  {
    id: 'gc_004',
    farmerId: 'farmer_005',
    farmerName: 'Rajveer Kaur',
    phone: '+91 9123456780',
    district: 'Karnal',
    state: 'Haryana',
    village: 'Nissing',
    certificateNumber: 'GC-HR-2024-000456',
    issueDate: '2024-05-10',
    expiryDate: '2025-05-09',
    status: 'active',
    tier: 'bronze',
    greenCredits: 85,
    totalStrawManaged: 8.5,
    co2Prevented: 15.3,
    completedBookings: 3
  },
  {
    id: 'gc_005',
    farmerId: 'farmer_006',
    farmerName: 'Mohinder Singh',
    phone: '+91 9876512340',
    district: 'Bathinda',
    state: 'Punjab',
    village: 'Rampura',
    certificateNumber: 'GC-PB-2023-004521',
    issueDate: '2023-11-15',
    expiryDate: '2024-11-14',
    status: 'expired',
    tier: 'silver',
    greenCredits: 380,
    totalStrawManaged: 25.0,
    co2Prevented: 45.0,
    completedBookings: 7
  },
  {
    id: 'gc_006',
    farmerId: 'farmer_007',
    farmerName: 'Sukhwinder Kaur',
    phone: '+91 8899776655',
    district: 'Sangrur',
    state: 'Punjab',
    village: 'Malerkotla',
    certificateNumber: 'GC-PB-2024-003789',
    issueDate: '2024-09-05',
    expiryDate: '2025-09-04',
    status: 'pending',
    tier: 'bronze',
    greenCredits: 45,
    totalStrawManaged: 4.5,
    co2Prevented: 8.1,
    completedBookings: 2
  }
];

export default function GreenCertificatesPage() {
  const [certificates, setCertificates] = useState<GreenCertificate[]>(MOCK_CERTIFICATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<GreenCertificate | null>(null);

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    const matchesTier = tierFilter === 'all' || cert.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const stats = {
    total: certificates.length,
    active: certificates.filter(c => c.status === 'active').length,
    pending: certificates.filter(c => c.status === 'pending').length,
    totalCredits: certificates.reduce((sum, c) => sum + c.greenCredits, 0),
    totalCO2: certificates.reduce((sum, c) => sum + c.co2Prevented, 0)
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-orange-100 text-orange-800 border-orange-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Award size={28} className="text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Green Certificates</h1>
            <p className="text-gray-600">Manage farmer green certifications and rewards</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Award size={18} />
          Issue New Certificate
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Certificates</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Green Credits</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Leaf size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CO₂ Prevented</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalCO2.toFixed(1)} T</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, certificate number, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Tiers</option>
              <option value="platinum">💎 Platinum</option>
              <option value="gold">🥇 Gold</option>
              <option value="silver">🥈 Silver</option>
              <option value="bronze">🥉 Bronze</option>
            </select>
          </div>
        </div>
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCertificates.map(cert => (
          <div key={cert.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Certificate Header */}
            <div className={`p-4 ${cert.tier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 
                                   cert.tier === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                   cert.tier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                   'bg-gradient-to-r from-orange-400 to-amber-600'} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTierIcon(cert.tier)}</span>
                  <div>
                    <p className="font-bold text-lg">{cert.farmerName}</p>
                    <p className="text-sm opacity-90">{cert.village}, {cert.district}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  cert.status === 'active' ? 'bg-white/20' : 
                  cert.status === 'pending' ? 'bg-yellow-300 text-yellow-900' :
                  'bg-red-300 text-red-900'
                }`}>
                  {cert.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Certificate #</span>
                <span className="text-sm font-mono font-medium text-gray-900">{cert.certificateNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-700">{cert.greenCredits}</p>
                  <p className="text-xs text-green-600">Green Credits</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{cert.co2Prevented} T</p>
                  <p className="text-xs text-blue-600">CO₂ Prevented</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Straw Managed</span>
                  <span className="font-medium">{cert.totalStrawManaged} tonnes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed Bookings</span>
                  <span className="font-medium">{cert.completedBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="font-medium">{new Date(cert.expiryDate).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setSelectedCertificate(cert)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Eye size={16} />
                  View
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm">
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Detail Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`p-6 ${selectedCertificate.tier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 
                                   selectedCertificate.tier === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                   selectedCertificate.tier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                   'bg-gradient-to-r from-orange-400 to-amber-600'} text-white rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                    {getTierIcon(selectedCertificate.tier)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCertificate.farmerName}</h2>
                    <p className="opacity-90">{selectedCertificate.tier.toUpperCase()} Tier Member</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCertificate(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="inline-block px-4 py-2 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-600">Certificate Number</p>
                  <p className="font-mono font-bold text-green-800">{selectedCertificate.certificateNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 text-center">
                  <Leaf size={32} className="text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{selectedCertificate.greenCredits}</p>
                  <p className="text-sm text-green-600">Green Credits</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-4 text-center">
                  <TrendingUp size={32} className="text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{selectedCertificate.co2Prevented} T</p>
                  <p className="text-sm text-blue-600">CO₂ Prevented</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">Certificate Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{selectedCertificate.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location</span>
                    <span className="font-medium">{selectedCertificate.village}, {selectedCertificate.district}, {selectedCertificate.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Issue Date</span>
                    <span className="font-medium">{new Date(selectedCertificate.issueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expiry Date</span>
                    <span className="font-medium">{new Date(selectedCertificate.expiryDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedCertificate.status)}`}>
                      {selectedCertificate.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">Green Benefits Earned</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-sm">+{selectedCertificate.tier === 'platinum' ? '25' : selectedCertificate.tier === 'gold' ? '20' : selectedCertificate.tier === 'silver' ? '15' : '10'}% Premium on Mandi Sales</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle size={20} className="text-blue-600" />
                    <span className="text-sm">Priority Machine Booking</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle size={20} className="text-purple-600" />
                    <span className="text-sm">Direct Buyer Connections</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <CheckCircle size={20} className="text-orange-600" />
                    <span className="text-sm">Government Subsidy Eligibility</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  Download Certificate
                </button>
                <button 
                  onClick={() => setSelectedCertificate(null)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
