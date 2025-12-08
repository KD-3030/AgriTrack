'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { AlertsFeed } from '@/components/dashboard/alerts-feed'
import { MachineList } from '@/components/dashboard/machine-list'
import { useSocket } from '@/hooks/use-socket'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  fetchEfficiency, 
  fetchCropDashboard,
  type EfficiencyMetrics,
  type CropDashboardData 
} from '@/lib/api'
import { 
  Brain, 
  Wheat, 
  FileText, 
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

// Dynamic import for Leaflet (no SSR)
const MachineMap = dynamic(
  () => import('@/components/dashboard/machine-map').then(mod => mod.MachineMap),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
)

export default function DashboardPage() {
  const { machines, stats, connected } = useSocket()
  const [efficiency, setEfficiency] = useState<EfficiencyMetrics | null>(null)
  const [cropData, setCropData] = useState<CropDashboardData | null>(null)

  useEffect(() => {
    // Load AI and Crop data
    fetchEfficiency().then(setEfficiency).catch(() => {})
    fetchCropDashboard().then(setCropData).catch(() => {})
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Real-time CRM machinery monitoring</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {connected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/analytics">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-4 text-white hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <Brain className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">AI Analytics</h3>
                    <p className="text-sm opacity-80">
                      {efficiency?.averageEfficiency?.toFixed(0) || 0}% fleet efficiency
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            <Link href="/crop-residue">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-4 text-white hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <Wheat className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Crop Residue</h3>
                    <p className="text-sm opacity-80">
                      {cropData?.statistics?.urgent_districts || 0} urgent districts
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            <Link href="/dashboard/reports">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-4 text-white hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <FileText className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Live Reports</h3>
                    <p className="text-sm opacity-80">
                      {machines.length} machines tracked
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="map" className="space-y-4">
            <TabsList>
              <TabsTrigger value="map">Live Map</TabsTrigger>
              <TabsTrigger value="list">Machine List</TabsTrigger>
              <TabsTrigger value="alerts">Alerts ({stats.alertCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-card rounded-lg border p-4">
                    <h3 className="font-semibold mb-4">Live Machine Locations</h3>
                    <div className="h-[500px] rounded-lg overflow-hidden">
                      <MachineMap machines={machines} />
                    </div>
                  </div>
                </div>
                <div>
                  <AlertsFeed machines={machines} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list">
              <MachineList machines={machines} />
            </TabsContent>

            <TabsContent value="alerts">
              <AlertsFeed machines={machines} fullWidth />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
