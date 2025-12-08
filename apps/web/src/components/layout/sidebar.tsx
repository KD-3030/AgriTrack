'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Tractor, 
  Calendar, 
  BarChart3, 
  Settings,
  Bell,
  Cpu,
  Wheat,
  Brain,
  FileText,
  Activity,
  CalendarClock,
  Store,
  LogOut,
  Home,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/machines', label: 'Machines', icon: Tractor },
  { href: '/dashboard/scheduling', label: 'Scheduling', icon: CalendarClock },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/green-certificates', label: 'Green Certificates', icon: Award },
  { href: '/dashboard/analytics', label: 'AI Analytics', icon: Brain },
  { href: '/dashboard/reports', label: 'Live Reports', icon: FileText },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/crop-residue', label: 'Crop Residue', icon: Wheat },
  { href: '/dashboard/simulator', label: 'Simulator', icon: Cpu },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('agritrack_token')
    localStorage.removeItem('agritrack_user')
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Tractor className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">AgriTrack</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Home className="w-5 h-5" />
          Home
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
        <div className="mt-4 px-3 text-xs text-muted-foreground">
          <p>SIH 2025 | v2.1</p>
        </div>
      </div>
    </aside>
  )
}
