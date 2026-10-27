import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { SettingsProvider } from '@/core/settings'
import { LoadingScreen } from '@/components/LoadingScreen'
import Home from '@/pages/Home'

const GamePage = lazy(() => import('@/pages/GamePage'))
const Credits = lazy(() => import('@/pages/Credits'))
const AudioCheck = lazy(() => import('@/pages/AudioCheck'))
const JuntoReview = lazy(() => import('@/pages/JuntoReview'))

export default function App() {
  return (
    <SettingsProvider>
      <TooltipProvider delayDuration={400}>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/creditos" element={<Credits />} />
              <Route path="/verificar-audio" element={<AudioCheck />} />
              <Route path="/revisao-junto" element={<JuntoReview />} />
              <Route path="/:slug" element={<GamePage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </SettingsProvider>
  )
}
