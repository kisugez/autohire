import Sidebar from '@/components/navigation/sidebar'
import Topbar from '@/components/navigation/topbar'
import { JobsProvider } from '@/lib/jobs-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <JobsProvider>
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <Topbar />
        <main className="ml-60 pt-14 min-h-screen">
          <div className="p-6 max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </JobsProvider>
  )
}
