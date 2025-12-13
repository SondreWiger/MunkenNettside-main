"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface EnrollmentNotification {
  id: string
  ensemble_id: string
  ensemble_title: string
  ensemble_slug: string
  status: 'pending' | 'yellow' | 'accepted' | 'rejected'
  created_at: string
  notification_read: boolean
  amount_paid_nok?: number
  enrollment_reference?: string
  is_parent_view: boolean
}

export function UserNotifications() {
  const [notifications, setNotifications] = useState<EnrollmentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data: enrollments } = await supabase
        .from('ensemble_enrollments')
        .select(`
          id,
          ensemble_id,
          status,
          created_at,
          amount_paid_nok,
          notification_read,
          registered_by_user_id,
          enrollment_reference,
          user:user_id(full_name, id),
          ensembles (
            title,
            slug
          )
        `)
        // Load enrollments where the current user is the enrollee OR the registering parent
        .or(`user_id.eq.${user.id},registered_by_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (enrollments) {
        const formatted = enrollments.map((e: any) => {
          const isParentView = e.registered_by_user_id === user.id
          const enrolledName = e.user?.full_name
          const baseTitle = e.ensembles?.title || 'Ensemble'
          const displayTitle = isParentView && enrolledName ? `${baseTitle} — ${enrolledName}` : baseTitle

          return {
            id: e.id,
            ensemble_id: e.ensemble_id,
            ensemble_title: displayTitle,
            ensemble_slug: e.ensembles?.slug || '',
            status: e.status,
            created_at: e.created_at,
            notification_read: e.notification_read ?? false,
            amount_paid_nok: e.amount_paid_nok,
            enrollment_reference: e.enrollment_reference,
            is_parent_view: isParentView,
          }
        })
        setNotifications(formatted)
      }
      
      setLoading(false)
    }

    loadNotifications()

    // Set up real-time subscription
    const channel = supabase
      .channel('enrollment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ensemble_enrollments'
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'yellow':
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Søknad sendt'
      case 'yellow':
      case 'accepted':
        return 'Godkjent'
      case 'rejected':
        return 'Avvist'
      default:
        return status
    }
  }

  const unreadCount = notifications.filter(n => 
    !n.notification_read && (n.status === 'yellow' || n.status === 'accepted' || n.status === 'rejected')
  ).length

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('ensemble_enrollments')
      .update({ notification_read: true })
      .eq('id', notificationId)
    
    // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, notification_read: true } : n)
    )
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Varsler</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Ingen varsler
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => {
              // For parent viewing child's enrollment, link to confirmation page with reference
              // For own enrollments that are accepted, link to payment page
              // Otherwise link to ensemble page
              let href = `/ensemble/${notification.ensemble_slug}`
              
              if (notification.is_parent_view && notification.enrollment_reference) {
                // Parent viewing child's enrollment - go to confirmation page
                href = `/ensemble/${notification.ensemble_slug}/bekreftelse?reference=${notification.enrollment_reference}`
              } else if (notification.status === 'yellow' || notification.status === 'accepted') {
                // User's own enrollment that's accepted - go to payment page
                href = `/ensemble/${notification.ensemble_slug}/bestill`
              }
              
              return (
                <DropdownMenuItem key={notification.id} asChild>
                  <Link 
                    href={href}
                    onClick={() => markAsRead(notification.id)}
                    className="flex flex-col items-start gap-1 p-3"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getIcon(notification.status)}
                      <span className="font-medium">{notification.ensemble_title}</span>
                      {!notification.notification_read && (
                        <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getStatusText(notification.status)}
                    </p>
                    {(notification.status === 'yellow' || notification.status === 'accepted') && !notification.amount_paid_nok && !notification.is_parent_view && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                        <CreditCard className="h-3 w-3" />
                        <span>Husk å betale medlemskap</span>
                      </div>
                    )}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
