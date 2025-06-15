
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Search, UserCircle, LogOutIcon, SettingsIcon, ArrowLeft, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { usePersonalFinance } from '@/contexts/personal-finance-context';
import type { Transaction } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { CategoryIcon } from '@/components/shared/category-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const DEBOUNCE_DELAY = 300;

export function AppHeader() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { transactions, getCategoryById } = usePersonalFinance();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 1) {
      const lowerCaseQuery = debouncedSearchQuery.toLowerCase();
      const results = transactions.filter(transaction => {
        const category = getCategoryById(transaction.categoryId);
        return (
          transaction.description.toLowerCase().includes(lowerCaseQuery) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(lowerCaseQuery)) ||
          (category && category.name.toLowerCase().includes(lowerCaseQuery))
        );
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Show most recent first
        .slice(0, 10); // Limit results

      setSearchResults(results);
      setIsSearchPopoverOpen(true); 
    } else {
      setSearchResults([]);
      setIsSearchPopoverOpen(false); 
    }
  }, [debouncedSearchQuery, transactions, getCategoryById]);


  const handleLogout = async () => {
    await logout();
  };

  const handleGoToSettings = () => {
    router.push('/settings');
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSearchResultClick = (transactionId: string) => {
    console.log("Clicked transaction:", transactionId);
    setSearchQuery(""); 
  };

  const clearSearch = () => {
    setSearchQuery(""); 
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Go back</span>
        </Button>
      </div>
      
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
          <PopoverAnchor asChild>
            <form className="ml-auto flex-1 sm:flex-initial" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search transactions..."
                  className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                    onClick={clearSearch}
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
            </form>
          </PopoverAnchor>
          {isSearchPopoverOpen && ( 
            <PopoverContent 
              className="w-[--radix-popover-trigger-width] p-0 mt-1 shadow-lg" 
              sideOffset={5}
              onOpenAutoFocus={(e) => e.preventDefault()} // Prevent popover from stealing focus
            >
              <ScrollArea className="max-h-[400px]">
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map(transaction => {
                      const category = getCategoryById(transaction.categoryId);
                      return (
                        <button
                          key={transaction.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent focus:bg-accent focus:outline-none rounded-md transition-colors"
                          onClick={() => handleSearchResultClick(transaction.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                              {category && <CategoryIcon category={category} size="sm" />}
                              <span className="font-medium text-sm truncate">{transaction.description}</span>
                            </div>
                            <span className={cn("text-sm font-semibold", transaction.transactionType === 'expense' ? 'text-destructive' : 'text-accent')}>
                              {transaction.transactionType === 'expense' ? '-' : '+'}
                              {DEFAULT_CURRENCY}{transaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-8">
                            {format(new Date(transaction.date), 'MMM d, yyyy')}
                            {transaction.notes && <span className="italic truncate"> - {transaction.notes}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  debouncedSearchQuery.trim().length > 1 && ( 
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No results found for "{debouncedSearchQuery}".
                    </div>
                  )
                )}
              </ScrollArea>
            </PopoverContent>
          )}
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <UserCircle className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user ? (
              <>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGoToSettings}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={authLoading}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => router.push('/login')}>
                  Login
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/signup')}>
                  Sign Up
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
