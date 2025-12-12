import {
  Moon,
  Sun,
  Menu,
  HelpCircle,
  Users,
  Mail,
  Info,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/use-theme";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { useState } from "react";

export default function AuthNavbar() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full border-b bg-white dark:bg-slate-900 sticky top-0 z-40">
      <div className="px-3 xs:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile Sidebar */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[80vw] xs:w-[70vw] sm:w-[60vw] p-0"
              >
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-lg font-semibold">
                    Menu
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-4 h-8 w-8 rounded-full p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)]">
                  <div className="p-4 space-y-6">
                    {/* Link visibili a tutti */}
                    <div className="space-y-3">
                      <Link href="/chi-siamo">
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                          onClick={() => setIsOpen(false)}
                        >
                          <Info className="h-5 w-5" />
                          Chi Siamo
                        </Button>
                      </Link>
                      <Link href="/assistenza">
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                          onClick={() => setIsOpen(false)}
                        >
                          <HelpCircle className="h-5 w-5" />
                          Assistenza
                        </Button>
                      </Link>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <Link
            href="/auth"
            className="flex items-center cursor-pointer"
          >
            <img
              src="/logo/logo sgi.jpg"
              alt="Logo SGI"
              className="h-12 w-12 object-cover mr-2"
              width="48"
              height="48"
            />
            <span className="hidden md:inline font-bold text-lg lg:text-xl">
              Pannello di Controllo SGI
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-3">
          {/* Chi Siamo Link - Nascondi in mobile */}
          <div className="hidden md:block">
            <Link href="/chi-siamo">
              <Button variant="ghost" className="flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>Chi Siamo</span>
              </Button>
            </Link>
          </div>

          {/* Assistenza Link - Nascondi in mobile */}
          <div className="hidden md:block">
            <Link href="/assistenza">
              <Button variant="ghost" className="flex items-center space-x-1">
                <HelpCircle className="h-4 w-4" />
                <span>Assistenza</span>
              </Button>
            </Link>
          </div>

          {/* Theme Toggle - Sempre visibile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambia tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Chiaro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Scuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
