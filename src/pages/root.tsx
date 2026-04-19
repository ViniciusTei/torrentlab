import { Link, Outlet, useNavigation, useNavigate } from "react-router-dom";

import SearchInput from "@/components/search-input";
import { Toaster } from "@/components/ui/toaster";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCounter } from "@/utils/counter";
import Footer from "@/components/footer";

export default function Root() {
  const value = useCounter();
  const navigation = useNavigation();
  const navigate = useNavigate();

  return (
    <>
      {navigation.state === "loading" && <Progress value={value} />}

      <header className="flex items-center h-14 px-16 border-b">
        <div className="flex items-center gap-2 mr-8">
          <img
            src="/bd-logo.svg"
            alt="Logo"
            width="28px"
            height="32px"
          />
          <span className="font-bold text-lg">TorrentLab</span>
        </div>
        <nav className="flex-1">
          <ul className="flex gap-6">
            <li>
              <Link to="/" className="text-sm hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/downloads" className="text-sm hover:text-primary transition-colors">
                Baixados
              </Link>
            </li>
            <li>
              <Link to="/settings" className="text-sm hover:text-primary transition-colors">
                Configurações
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <SearchInput onSearch={(ev) => navigate(`/search?query=${ev}`)} />
        </div>
      </header>

      <main className="flex-1 mx-16">
        <Outlet />
        {["loading", "submiting"].includes(navigation.state) && <Loading />}
        <Toaster />
      </main>

      <Footer />
    </>
  );
}

function Loading() {
  return (
    <div className="px-12 py-4 inline-flex gap-6 w-full">
      <Skeleton className="h-[180px] w-[240px]" />
      <div className="flex-1 h-full w-full">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-[180px] w-full rounded-lg mb-4" />
        ))}
      </div>
    </div>
  );
}
