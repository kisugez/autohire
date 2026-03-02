import Sidebar from '@/components/navigation/sidebar'
import Topbar from '@/components/navigation/topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  )
}
