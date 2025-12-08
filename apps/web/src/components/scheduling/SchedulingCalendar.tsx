"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Users, 
  Tractor, 
  MapPin,
  Clock,
  Wheat,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  X,
  Phone,
  Sprout,
  Sun,
  CloudRain
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addMonths, subMonths, differenceInDays } from "date-fns"

// Harvest urgency levels
type HarvestUrgency = 'critical' | 'warning' | 'safe' | 'none'

interface ScheduleEvent {
  id: string
  name: string
  start: string
  end: string
  farmers_count: number
  machines_allocated?: number
  machines_required?: number
  status: string
  color: string
  region?: string
  total_acres?: number
  priority_score?: number
  avg_ndvi?: number
  districts?: string[]
}

interface HeatmapEntry {
  total_machines: number
  available: number
  booked: number
  capacity_acres: number
  demand_acres: number
  demand_percentage: number
}

interface SchedulingSummary {
  total_farmers: number
  total_clusters: number
  total_acres: number
  total_machines_allocated: number
  total_machines_required: number
  machine_deficit: number
  allocation_rate: number
}

interface SchedulingCalendarProps {
  events: ScheduleEvent[]
  summary?: SchedulingSummary | null
  heatmapData?: Record<string, Record<string, HeatmapEntry>>
  onEventClick?: (event: ScheduleEvent) => void
}

export function SchedulingCalendar({ events, summary, heatmapData, onEventClick }: SchedulingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [showDistribution, setShowDistribution] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Get events for a specific day
  const getEventsForDay = (day: Date): ScheduleEvent[] => {
    return events.filter(event => {
      try {
        const eventStart = parseISO(event.start)
        const eventEnd = parseISO(event.end)
        return isWithinInterval(day, { start: eventStart, end: eventEnd })
      } catch {
        return false
      }
    })
  }

  // Calculate harvest urgency for a day based on events
  const getHarvestUrgency = (day: Date): { urgency: HarvestUrgency; events: ScheduleEvent[] } => {
    const dayEvents = getEventsForDay(day)
    if (dayEvents.length === 0) return { urgency: 'none', events: [] }

    // Check for critical events (high priority or close deadline)
    const today = new Date()
    const daysUntil = differenceInDays(day, today)

    // Find the most urgent event
    let maxUrgency: HarvestUrgency = 'safe'
    
    for (const event of dayEvents) {
      const priority = event.priority_score || 0
      const machineRatio = event.machines_allocated && event.machines_required 
        ? event.machines_allocated / event.machines_required 
        : 0

      // Critical: High priority (>=8) OR very close deadline with low machine coverage
      if (priority >= 8 || (daysUntil <= 3 && machineRatio < 0.5)) {
        maxUrgency = 'critical'
        break
      }
      // Warning: Medium-high priority (6-7) OR approaching deadline
      if (priority >= 6 || (daysUntil <= 7 && machineRatio < 0.7)) {
        maxUrgency = 'warning'
      }
    }

    return { urgency: maxUrgency, events: dayEvents }
  }

  // Get urgency color classes
  const getUrgencyStyles = (urgency: HarvestUrgency) => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-100 dark:bg-red-900/30',
          border: 'border-red-500',
          text: 'text-red-700 dark:text-red-400',
          label: 'Critical - Harvest Now!',
          icon: '🔴'
        }
      case 'warning':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-100 dark:bg-amber-900/30',
          border: 'border-amber-500',
          text: 'text-amber-700 dark:text-amber-400',
          label: 'Warning - Harvest Soon',
          icon: '🟡'
        }
      case 'safe':
        return {
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-100 dark:bg-emerald-900/30',
          border: 'border-emerald-500',
          text: 'text-emerald-700 dark:text-emerald-400',
          label: 'Safe - Time Available',
          icon: '🟢'
        }
      default:
        return {
          bg: 'bg-gray-300',
          bgLight: 'bg-transparent',
          border: 'border-transparent',
          text: 'text-gray-500',
          label: 'No Harvest',
          icon: ''
        }
    }
  }

  // Get status color (kept for machine distribution section)
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-emerald-500'
      case 'pending':
      case 'scheduled':
        return 'bg-amber-500'
      case 'completed':
        return 'bg-blue-500'
      case 'delayed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : []

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  // Days of week header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get the starting day offset for the month
  const startOffset = startOfMonth(currentMonth).getDay()

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1" />
            ))}

            {/* Day cells */}
            {daysInMonth.map(day => {
              const { urgency, events: dayEvents } = getHarvestUrgency(day)
              const urgencyStyles = getUrgencyStyles(urgency)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isPast = day < new Date() && !isToday
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day)
                    if (dayEvents.length > 0) {
                      setShowDetailPanel(true)
                    }
                  }}
                  className={`
                    aspect-square p-1 rounded-lg border-2 transition-all relative group
                    ${urgency !== 'none' ? urgencyStyles.bgLight : 'hover:bg-muted/50'}
                    ${urgency !== 'none' ? urgencyStyles.border : 'border-transparent hover:border-muted-foreground/30'}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-lg' : ''}
                    ${isPast && urgency === 'none' ? 'opacity-50' : ''}
                  `}
                >
                  {/* Day number */}
                  <span className={`
                    text-sm font-medium block
                    ${isToday ? 'text-blue-600 font-bold' : ''}
                    ${urgency !== 'none' ? urgencyStyles.text : 'text-foreground'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Harvest urgency indicator */}
                  {urgency !== 'none' && (
                    <>
                      {/* Colored dot indicator */}
                      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${urgencyStyles.bg} animate-pulse`} />
                      
                      {/* Harvest icon for critical/warning days */}
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                        {urgency === 'critical' && (
                          <Wheat className="w-3 h-3 text-red-600" />
                        )}
                        {urgency === 'warning' && (
                          <Sprout className="w-3 h-3 text-amber-600" />
                        )}
                        {urgency === 'safe' && (
                          <Leaf className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                      
                      {/* Event count badge */}
                      {dayEvents.length > 1 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-800 text-white text-[9px] flex items-center justify-center font-bold">
                          {dayEvents.length}
                        </span>
                      )}
                      
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                          <div className="font-semibold mb-1">{urgencyStyles.label}</div>
                          <div>{dayEvents.length} harvest schedule(s)</div>
                          <div className="text-gray-300">{dayEvents.reduce((sum, e) => sum + e.farmers_count, 0)} farmers</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Updated Legend for Harvest Urgency */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-100 flex items-center justify-center">
                <Wheat className="w-2.5 h-2.5 text-red-600" />
              </div>
              <span className="text-xs text-muted-foreground">Critical - Harvest Now</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-100 flex items-center justify-center">
                <Sprout className="w-2.5 h-2.5 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground">Warning - Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-100 flex items-center justify-center">
                <Leaf className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Safe - Time Available</span>
            </div>
          </div>
        </div>

        {/* Event Details Sidebar - Enhanced Harvest Info */}
        <div className={`w-96 border-l bg-muted/30 transition-all ${showDetailPanel ? 'block' : 'hidden md:block'}`}>
          {/* Mobile close button */}
          <div className="md:hidden flex justify-end p-2 border-b">
            <button onClick={() => setShowDetailPanel(false)} className="p-1 rounded hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Select a date'}
            </h3>

            {selectedDate ? (
              (() => {
                const { urgency, events: dayEvents } = getHarvestUrgency(selectedDate)
                const urgencyStyles = getUrgencyStyles(urgency)
                
                return dayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {/* Urgency Banner */}
                    <div className={`p-3 rounded-lg ${urgencyStyles.bgLight} border ${urgencyStyles.border}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {urgency === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />}
                        {urgency === 'warning' && <Sun className="w-5 h-5 text-amber-600" />}
                        {urgency === 'safe' && <CloudRain className="w-5 h-5 text-emerald-600" />}
                        <span className={`font-bold ${urgencyStyles.text}`}>{urgencyStyles.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {urgency === 'critical' && 'Machines must be deployed immediately to prevent crop damage and stubble burning!'}
                        {urgency === 'warning' && 'Harvest window approaching. Ensure machines are allocated and ready.'}
                        {urgency === 'safe' && 'Sufficient time for harvest. Continue monitoring NDVI levels.'}
                      </p>
                    </div>

                    {/* Events List */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto">
                      {dayEvents.map(event => {
                        const eventUrgency = (event.priority_score || 0) >= 8 ? 'critical' : 
                          (event.priority_score || 0) >= 6 ? 'warning' : 'safe'
                        const eventStyles = getUrgencyStyles(eventUrgency)
                        const machineDeficit = (event.machines_required || 0) - (event.machines_allocated || 0)
                        
                        return (
                          <div
                            key={event.id}
                            onClick={() => {
                              setSelectedEvent(event)
                              onEventClick?.(event)
                            }}
                            className={`
                              p-4 rounded-lg border-2 cursor-pointer transition-all
                              hover:shadow-lg
                              ${selectedEvent?.id === event.id ? `${eventStyles.border} ${eventStyles.bgLight}` : 'border-gray-200 bg-background hover:border-gray-300'}
                            `}
                          >
                            {/* Header with urgency indicator */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-3 h-3 rounded-full ${eventStyles.bg}`} />
                                  <h4 className="font-semibold text-sm">{event.name}</h4>
                                </div>
                                {event.region && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.region}</span>
                                  </div>
                                )}
                              </div>
                              <span className={`
                                px-2 py-1 rounded-full text-[10px] font-bold text-white
                                ${eventStyles.bg}
                              `}>
                                {eventUrgency === 'critical' ? '🔴 URGENT' : eventUrgency === 'warning' ? '🟡 SOON' : '🟢 OK'}
                              </span>
                            </div>

                            {/* Harvest Window */}
                            <div className="bg-muted/50 rounded-lg p-2 mb-3">
                              <div className="text-xs text-muted-foreground mb-1">Harvest Window</div>
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <CalendarDays className="w-4 h-4 text-emerald-600" />
                                <span>{format(parseISO(event.start), 'MMM d')} → {format(parseISO(event.end), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                            
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                                <Users className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{event.farmers_count}</div>
                                <div className="text-[10px] text-muted-foreground">Farmers</div>
                              </div>
                              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                                <Wheat className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                  {event.total_acres?.toLocaleString() || 0}
                                </div>
                                <div className="text-[10px] text-muted-foreground">Acres</div>
                              </div>
                            </div>

                            {/* Machine Requirement - Critical Info */}
                            <div className={`rounded-lg p-3 ${machineDeficit > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' : 'bg-green-50 dark:bg-green-900/20 border border-green-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Tractor className={`w-5 h-5 ${machineDeficit > 0 ? 'text-red-600' : 'text-green-600'}`} />
                                  <span className="font-semibold text-sm">Machine Requirement</span>
                                </div>
                                {machineDeficit > 0 && (
                                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                    NEED {machineDeficit} MORE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="text-muted-foreground">Allocated: </span>
                                  <span className="font-bold">{event.machines_allocated || 0}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Required: </span>
                                  <span className="font-bold">{event.machines_required || '?'}</span>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${machineDeficit > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(((event.machines_allocated || 0) / (event.machines_required || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Districts if available */}
                            {event.districts && event.districts.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs text-muted-foreground mb-1">Districts Covered:</div>
                                <div className="flex flex-wrap gap-1">
                                  {event.districts.slice(0, 4).map((district, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-muted rounded text-xs">{district}</span>
                                  ))}
                                  {event.districts.length > 4 && (
                                    <span className="px-2 py-0.5 bg-muted rounded text-xs">+{event.districts.length - 4} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Priority Score */}
                            {event.priority_score !== undefined && (
                              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Priority Score</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        event.priority_score >= 8 ? 'bg-red-500' : 
                                        event.priority_score >= 6 ? 'bg-amber-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${event.priority_score * 10}%` }}
                                    />
                                  </div>
                                  <span className={`
                                    text-sm font-bold
                                    ${event.priority_score >= 8 ? 'text-red-600' : 
                                      event.priority_score >= 6 ? 'text-amber-600' : 'text-green-600'}
                                  `}>
                                    {event.priority_score}/10
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Quick Actions */}
                    <div className="pt-3 border-t">
                      <button className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                        <Phone className="w-4 h-4" />
                        Send SMS Alert to Farmers
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Leaf className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No harvest scheduled</p>
                    <p className="text-xs mt-1">This day has no planned harvesting activities</p>
                  </div>
                )
              })()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Select a Date</p>
                <p className="text-xs mt-1">Click on any date to view harvest schedules</p>
                <div className="mt-4 text-left bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium mb-2">Color Guide:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded bg-red-500" />
                      <span>Critical - Immediate harvest needed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded bg-amber-500" />
                      <span>Warning - Harvest window closing</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      <span>Safe - Time to prepare</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="px-4 pb-4">
            <div className="pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">This Month Summary</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-600">{events.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Schedules</p>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-600">
                    {events.reduce((sum, e) => sum + e.farmers_count, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Farmers Covered</p>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {events.filter(e => e.status.toLowerCase() === 'pending' || e.status.toLowerCase() === 'scheduled').length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="bg-background rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {events.filter(e => e.status.toLowerCase() === 'completed').length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Distribution Panel */}
      <div className="border-t">
        <button
          onClick={() => setShowDistribution(!showDistribution)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">Machine Distribution & Harvest Readiness</span>
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${showDistribution ? 'rotate-90' : ''}`} />
        </button>

        {showDistribution && (
          <div className="p-4 pt-0 space-y-4">
            {/* Machine Allocation Overview */}
            {summary && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-emerald-600" />
                  Machine Allocation Overview
                </h5>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{summary.total_machines_allocated}</p>
                    <p className="text-xs text-muted-foreground">Allocated</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{summary.total_machines_required}</p>
                    <p className="text-xs text-muted-foreground">Required</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className={`text-2xl font-bold ${summary.machine_deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {summary.machine_deficit > 0 ? `-${summary.machine_deficit}` : '✓'}
                    </p>
                    <p className="text-xs text-muted-foreground">Deficit</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.allocation_rate}%</p>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                  </div>
                </div>
                
                {/* Allocation Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Allocation Progress</span>
                    <span className="font-medium">{summary.allocation_rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        summary.allocation_rate >= 90 ? 'bg-emerald-500' :
                        summary.allocation_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(summary.allocation_rate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Farmer Distribution by Harvest Readiness */}
            <div className="bg-background border rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Farmer Distribution by Harvest Readiness
              </h5>
              
              <div className="space-y-3">
                {/* Sort events by priority score (harvest readiness) */}
                {events
                  .filter(e => e.priority_score !== undefined)
                  .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
                  .slice(0, 6)
                  .map((event, idx) => {
                    const readiness = event.priority_score || 0
                    const machineRatio = event.machines_allocated && event.machines_required 
                      ? (event.machines_allocated / event.machines_required) * 100 
                      : 0
                    const farmersPerMachine = event.machines_allocated 
                      ? Math.round(event.farmers_count / event.machines_allocated)
                      : event.farmers_count
                    
                    return (
                      <div 
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                              ${readiness >= 8 ? 'bg-red-500' : 
                                readiness >= 6 ? 'bg-orange-500' : 
                                readiness >= 4 ? 'bg-yellow-500' : 'bg-green-500'}
                            `}>
                              {readiness}
                            </span>
                            <span className="font-medium text-sm truncate max-w-[150px]">{event.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            readiness >= 8 ? 'bg-red-100 text-red-700' : 
                            readiness >= 6 ? 'bg-orange-100 text-orange-700' : 
                            readiness >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {readiness >= 8 ? 'Urgent' : readiness >= 6 ? 'High' : readiness >= 4 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{event.farmers_count} farmers</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Tractor className="w-3 h-3" />
                            <span>{event.machines_allocated || 0}/{event.machines_required || '?'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Wheat className="w-3 h-3" />
                            <span>{event.total_acres?.toLocaleString() || 0} ac</span>
                          </div>
                        </div>
                        
                        {/* Machine per farmer indicator */}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            ~{farmersPerMachine} farmers per machine
                          </span>
                          <div className="flex items-center gap-1">
                            {machineRatio >= 100 ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : machineRatio >= 70 ? (
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              machineRatio >= 100 ? 'text-green-600' : 
                              machineRatio >= 70 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {Math.round(machineRatio)}% covered
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
              
              {events.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Tractor className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No scheduling data available</p>
                </div>
              )}
            </div>

            {/* Regional Machine Heatmap */}
            {heatmapData && Object.keys(heatmapData).length > 0 && (
              <div className="bg-background border rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Regional Machine Availability
                </h5>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Object.entries(heatmapData).map(([region, dates]) => {
                    // Get the first date's data as summary
                    const firstDate = Object.keys(dates)[0]
                    const data = dates[firstDate]
                    if (!data) return null
                    
                    const utilizationRate = data.total_machines > 0 
                      ? Math.round((data.booked / data.total_machines) * 100)
                      : 0
                    
                    return (
                      <div key={region} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{region}</span>
                            <span className="text-xs text-muted-foreground">
                              {data.available} available / {data.total_machines} total
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                utilizationRate >= 90 ? 'bg-red-500' :
                                utilizationRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${utilizationRate}%` }}
                            />
                          </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${
                          utilizationRate >= 90 ? 'bg-red-100 text-red-700' :
                          utilizationRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {utilizationRate}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
