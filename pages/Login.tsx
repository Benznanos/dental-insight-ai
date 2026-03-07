import { useState, useEffect } from 'react' // Add useEffect import
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authService } from '@/services/auth'
import { Loader2 } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Apply saved theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    const root = window.document.documentElement
    
    // Remove all theme classes
    root.classList.remove('light', 'soft-mint', 'warm-sand', 'lavender-mist')
    
    // Apply saved theme
    root.classList.add(savedTheme)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const minimumLoad = new Promise(resolve => setTimeout(resolve, 800))

    try {
      await Promise.all([
        authService.login({ username, password }),
        minimumLoad
      ])
      
      sessionStorage.setItem('showWelcome', 'true')
      navigate('/')
      
    } catch (err: any) {
      await minimumLoad
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Login form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            {/* Top left logo */}
            <div className="flex items-center justify-center rounded-md overflow-hidden contrast-125">
              <img 
                src="/image.png" 
                alt="Dental Insight AI Logo" 
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="font-semibold text-gray-800 text-sm">Dental Care Recommender System</span>
          </div>
        </div>
        
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-800">Sign in to your account</h1>
              <p className="text-gray-600 mt-2 text-sm">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            <div className="text-center">
              <p className="mt-4 text-xs text-gray-400">
                Tolentino-Jagdon Dental Care Service
              </p>
              </div>
          </div>
        </div>
      </div>

      {/* Right side - Large logo display */}
      <div className="bg-muted relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100" />
        
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative">
            {/* Background glow effect */}
            <div className="absolute -inset-8 animate-pulse rounded-full bg-primary/10 blur-xl"></div>
            
            {/* Large centered logo */}
            <div className="relative h-85 w-85 p-8">
              <img
                src="/image.png" 
                alt="Dental Insight AI"
                className="h-full w-full object-contain 
                         filter drop-shadow-2xl 
                         brightness-105 contrast-125
                         hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}