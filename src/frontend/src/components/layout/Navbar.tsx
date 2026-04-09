import { Link } from 'react-router';
import { List } from '@phosphor-icons/react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();

  return (
    <header className="h-14 border-b bg-card px-4 flex items-center gap-3 shrink-0">
      {/* Left: hamburger + brand */}
      <button
        onClick={toggle}
        className="flex items-center justify-center rounded-md p-1 hover:bg-accent"
        aria-label="Toggle sidebar"
      >
        <List size={20} />
      </button>
      <Link to="/dashboard" className="font-bold text-sm whitespace-nowrap">
        StockPredictor
      </Link>

      {/* Center: search */}
      <SearchBar />

      {/* Right: user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-auto rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
            <Avatar>
              <AvatarFallback>
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
