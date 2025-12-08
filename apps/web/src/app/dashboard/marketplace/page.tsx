'use client';

import { useState, useEffect } from 'react';
import { Store, TrendingUp, TrendingDown, Minus, Leaf, RefreshCw, Users, Package } from 'lucide-react';

interface MandiPrice {
  id: string;
  name: string;
  nameHindi: string;
  unit: string;
  msp: number;
  markets: Array<{
    mandi: string;
    state: string;
    min: number;
    max: number;
    modal: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  greenBonus: number;
}

interface SellRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  commodity: string;
  quantity: number;
  unit: string;
  requestedPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  isGreenFarmer: boolean;
  createdAt: string;
}

export default function MarketplacePage() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prices' | 'requests'>('prices');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pricesRes, requestsRes] = await Promise.all([
        fetch(`${API_URL}/api/mandi/prices`),
        fetch(`${API_URL}/api/mandi/sell-requests`)
      ]);

      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        // Transform API data to expected format
        const crops = pricesData.crops || pricesData || [];
        const transformedPrices = crops.map((crop: any) => ({
          id: crop.id,
          name: crop.name,
          nameHindi: crop.nameHindi || '',
          unit: crop.unit || 'quintal',
          msp: crop.msp || 0,
          markets: crop.prices || [],
          trend: crop.trend || 'stable',
          trendPercent: crop.trendPercent || 0,
          greenBonus: crop.greenBonus || 5
        }));
        setPrices(transformedPrices);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        // Handle both array and object with array property
        const requests = Array.isArray(requestsData) ? requestsData : (requestsData.requests || []);
        setSellRequests(requests);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`${API_URL}/api/mandi/sell-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' })
      });

      if (response.ok) {
        setSellRequests(prev =>
          prev.map(req =>
            req.id === requestId
              ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
              : req
          )
        );
      }
    } catch (err) {
      console.error('Failed to update request:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  const pendingRequests = sellRequests.filter(r => r.status === 'pending').length;
  const greenFarmerRequests = sellRequests.filter(r => r.isGreenFarmer).length;
  const totalValue = sellRequests.reduce((sum, r) => sum + (r.quantity * r.requestedPrice), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store size={28} className="text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketplace & Mandi</h1>
            <p className="text-gray-600">Manage crop prices and farmer sell requests</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Commodities</p>
              <p className="text-xl font-bold text-gray-900">{prices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-xl font-bold text-gray-900">{pendingRequests}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Leaf size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Green Farmer Requests</p>
              <p className="text-xl font-bold text-gray-900">{greenFarmerRequests}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Trade Value</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Green Benefits Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Leaf size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Green Farmer Benefits</h3>
              <p className="opacity-90">Certified green farmers get premium prices and priority access</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">+15-25%</p>
              <p className="text-sm opacity-90">Premium Price</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">Priority</p>
              <p className="text-sm opacity-90">Buyer Access</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">Direct</p>
              <p className="text-sm opacity-90">Connections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('prices')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'prices'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Mandi Prices
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sell Requests
          {pendingRequests > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingRequests}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'prices' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Commodity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Market</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">MSP</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Min Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Max Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Modal Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Green Bonus</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((crop) => (
                crop.markets && crop.markets.length > 0 ? (
                  crop.markets.map((market, mIdx) => (
                    <tr key={`${crop.id}-${mIdx}`} className="border-t hover:bg-gray-50">
                      {mIdx === 0 ? (
                        <td className="px-4 py-3" rowSpan={crop.markets.length}>
                          <div>
                            <p className="font-medium text-gray-900">{crop.name}</p>
                            <p className="text-sm text-gray-500">{crop.nameHindi}</p>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900">{market.mandi}</p>
                          <p className="text-sm text-gray-500">{market.state}</p>
                        </div>
                      </td>
                      {mIdx === 0 ? (
                        <td className="px-4 py-3 text-right text-blue-600 font-medium" rowSpan={crop.markets.length}>
                          {formatPrice(crop.msp)}/{crop.unit}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatPrice(market.min)}/{crop.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatPrice(market.max)}/{crop.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatPrice(market.modal)}/{crop.unit}
                      </td>
                      {mIdx === 0 ? (
                        <td className="px-4 py-3 text-right" rowSpan={crop.markets.length}>
                          <div className="flex items-center justify-end gap-2">
                            <Leaf size={14} className="text-green-500" />
                            <span className="text-green-600 font-semibold">
                              +{crop.greenBonus}%
                            </span>
                          </div>
                        </td>
                      ) : null}
                      {mIdx === 0 ? (
                        <td className="px-4 py-3" rowSpan={crop.markets.length}>
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(crop.trend)}
                            <span className={`text-sm ${
                              crop.trend === 'up' ? 'text-green-500' :
                              crop.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                            }`}>
                              {crop.trendPercent}%
                            </span>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr key={crop.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{crop.name}</p>
                        <p className="text-sm text-gray-500">{crop.nameHindi}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">No markets</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatPrice(crop.msp)}/{crop.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right text-gray-500">-</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-600">+{crop.greenBonus}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getTrendIcon(crop.trend)}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {sellRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Package size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sell Requests</h3>
              <p className="text-gray-600">No farmers have submitted sell requests yet.</p>
            </div>
          ) : (
            sellRequests.map(request => (
              <div key={request.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${request.isGreenFarmer ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {request.isGreenFarmer ? (
                        <Leaf size={24} className="text-green-600" />
                      ) : (
                        <Users size={24} className="text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{request.farmerName}</p>
                        {request.isGreenFarmer && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            🌱 Green Certified
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">
                        {request.quantity} {request.unit} of {request.commodity}
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested: {formatPrice(request.requestedPrice)}/{request.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(request.quantity * request.requestedPrice)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestAction(request.id, 'approve')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(request.id, 'reject')}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
