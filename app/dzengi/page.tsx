import { IconBuildingBank } from "@tabler/icons-react";
import { fetchDzengiAccount } from "@/lib/dzengi";
import DzengiPage from "./dzengi";

export default async function Page() {
  const account = await fetchDzengiAccount();

  return (
    <div className='min-h-screen bg-zinc-50'>
      {/* Header */}
      <header className='sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3'>
        <div className='max-w-7xl mx-auto flex items-center gap-3'>
          <IconBuildingBank size={18} className='text-trade' />
          <span className='text-base font-bold tracking-tight'>Dzengi</span>
          <span className='text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full'>
            dzengi.com
          </span>
        </div>
      </header>

      <main className='max-w-7xl mx-auto p-4 md:p-6 space-y-4'>
        <DzengiPage account={account} />
      </main>
    </div>
  );
}
