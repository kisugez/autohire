import Sidebar from '@/components/navigation/sidebar'
import Topbar from '@/components/navigation/topbar'
import { JobsProvider } from '@/lib/jobs-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <JobsProvider>
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <Topbar />
        <main className="ml-[220px] pt-[67px] min-h-screen px-7 pb-12">
          {children}
        </main>
      </div>
    </JobsProvider>
  )
}
