"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function DatabaseSetup() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const initializeDatabase = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch('/api/admin/setup-db', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setIsInitialized(true)
        toast.success("Database initialisert!")
      } else {
        toast.error("Kunne ikke initialisere database: " + data.error)
      }
    } catch (error) {
      console.error('Database initialization error:', error)
      toast.error("Kunne ikke initialisere database")
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Database oppsett</CardTitle>
        </div>
        <CardDescription>
          Initialiser actors og roles tabeller for forbedret skuespiller-administrasjon
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isInitialized ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Database er initialisert og klar til bruk!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dette vil opprette actors og roles tabeller som trengs for den forbedrede skuespiller-administrasjonen.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={initializeDatabase}
              disabled={isInitializing}
              className="w-full"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initialiserer...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Initialiser database
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}