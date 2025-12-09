'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  Tractor,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Phone,
  MessageSquare,
  ChevronDown,
  Loader2
} from 'lucide-react'

interface Booking {
  id: string
  machine_id: string
  farmer_id: string
  scheduled_date: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  notes: string | null
  acres_covered: number | null
  booking_source?: string
  created_at: string
  updated_at: string
  machine?: {
    id: string
    name: string
    type: string
    device_id: string
    district: string
    state: string
  }
  farmer?: {
    id: string
    name: string
    email: string
    phone: string
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const statusConfig = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock 
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle 
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Tractor 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle 
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle 
  }
}

const sourceConfig: Record<string, { label: string; color: string }> = {
  web: { label: 'Web', color: 'bg-blue-50 text-blue-600' },
  mobile: { label: 'Mobile', color: 'bg-purple-50 text-purple-600' },
  sms: { label: 'SMS', color: 'bg-green-50 text-green-600' },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-50 text-emerald-600' },
  call_center: { label: 'Call Center', color: 'bg-orange-50 text-orange-600' }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  const fetchBookings = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`${API_URL}/api/v1/bookings`)
      if (!response.ok) throw new Error('Failed to fetch bookings')
      const data = await response.json()
      setBookings(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBookings, 30000)
    return () => clearInterval(interval)
  }, [])

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) throw new Error('Failed to update booking')
      await fetchBookings()
    } catch (err) {
      alert('Failed to update booking status')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.machine?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.farmer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.farmer?.phone?.includes(searchTerm) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    inProgress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-lg text-gray-600">Loading bookings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-emerald-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Bookings
          </h1>
          <p className="text-muted-foreground">Manage machine bookings and reservations</p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Bookings</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{stats.confirmed}</div>
          <div className="text-sm text-blue-600">Confirmed</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-100">
          <div className="text-2xl font-bold text-purple-700">{stats.inProgress}</div>
          <div className="text-sm text-purple-600">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
          <div className="text-2xl font-bold text-red-700">{stats.cancelled}</div>
          <div className="text-sm text-red-600">Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by farmer name, phone, machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer min-w-[180px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!error && filteredBookings.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Bookings Found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Bookings from SMS, WhatsApp, and Web will appear here'}
          </p>
        </div>
      )}

      {/* Bookings Table */}
      {filteredBookings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Farmer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const StatusIcon = statusConfig[booking.status]?.icon || AlertCircle
                  const source = booking.booking_source || 'web'
                  
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-gray-500">
                            #{booking.id.substring(0, 8)}
                          </span>
                          <span className="text-xs text-gray-400 mt-1">
                            {formatDateTime(booking.created_at)}
                          </span>
                          {booking.booking_source && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2 w-fit ${sourceConfig[source]?.color || 'bg-gray-100 text-gray-600'}`}>
                              {source === 'sms' && <MessageSquare className="w-3 h-3" />}
                              {source === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                              {sourceConfig[source]?.label || source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.farmer?.name || 'Unknown Farmer'}
                            </div>
                            {booking.farmer?.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Phone className="w-3 h-3" />
                                {booking.farmer.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Tractor className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.machine?.name || 'Unknown Machine'}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {booking.machine?.district || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {formatDate(booking.scheduled_date)}
                          </span>
                        </div>
                        {booking.acres_covered && (
                          <div className="text-sm text-gray-500 mt-1">
                            {booking.acres_covered} acres
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig[booking.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig[booking.status]?.label || booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                            >
                              Start Work
                            </button>
                          )}
                          {booking.status === 'in_progress' && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {(booking.status === 'completed' || booking.status === 'cancelled') && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
