import { Link } from 'react-router';
import { List, GearSix, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import SearchBar from '@/components/search/SearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();

  return (
    <header className="relative z-20 h-14 shrink-0 flex items-center gap-4 px-4 lg:px-6 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
      {/* Left: hamburger + brand */}
      <button
        onClick={toggle}
        className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        aria-label="Toggle sidebar"
      >
        <List size={18} weight="light" />
      </button>
      <Link
        to="/dashboard"
        className="font-heading text-sm font-bold tracking-[-0.02em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap"
      >
        Grafynt
      </Link>

      {/* Center: search */}
      <SearchBar />

      {/* Right: user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/[0.08] text-xs font-semibold text-purple-300 hover:border-purple-500/30 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-2 focus:ring-purple-500/30">
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-1">
          <DropdownMenuLabel className="text-xs text-gray-400 px-3 py-2">
            {user?.username}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-white focus:bg-white/[0.06] focus:text-white cursor-pointer">
            <Link to="/settings" className="flex items-center gap-2">
              <GearSix size={14} weight="light" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-white focus:bg-white/[0.06] focus:text-white cursor-pointer flex items-center gap-2"
          >
            <SignOut size={14} weight="light" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
