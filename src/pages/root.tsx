import { Link, Outlet } from "react-router-dom";

import SearchInput from "@/components/search/search-input";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/footer";

export default function Root() {
  return (
    <>
      <header className="flex items-center h-14 px-16 border-b">
        <div className="flex items-center gap-2 mr-8">
          <img src="/bd-logo.svg" alt="Logo" width="28px" height="32px" />
          <span className="font-bold text-lg">TorrentLab</span>
        </div>
        <nav className="flex-1">
          <ul className="flex gap-6">
            <li>
              <Link
                to="/"
                className="text-sm hover:text-primary transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/watchlist"
                className="text-sm hover:text-primary transition-colors"
              >
                Minha Lista
              </Link>
            </li>
            <li>
              <Link
                to="/downloads"
                className="text-sm hover:text-primary transition-colors"
              >
                Baixados
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="text-sm hover:text-primary transition-colors"
              >
                Configurações
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <SearchInput />
        </div>
      </header>

      <main className="flex-1 mx-16">
        <Outlet />
        <Toaster />
        <Footer />
      </main>
    </>
  );
}
