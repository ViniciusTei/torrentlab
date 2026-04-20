import { useState } from "react";
import { useNavigation, useNavigate } from "react-router-dom";
import { Search, Loader } from "lucide-react";

interface Props {
  onSearch: (value: string) => void;
  loading?: boolean;
}

function SearchInputField({ loading, onSearch }: Props) {
  const [search, setSearch] = useState("");

  function handleKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter" && search.trim()) {
      onSearch(search.trim());
      setSearch("");
    }
  }

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
        {loading ? (
          <Loader className="w-[18px] h-[18px] animate-spin" />
        ) : (
          <Search className="w-[18px] h-[18px]" />
        )}
      </div>
      <input
        value={search}
        type="text"
        placeholder="Buscar filme ou série..."
        className="bg-muted border-0 rounded-full pl-11 pr-6 py-2.5 w-[300px] text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-muted-foreground text-foreground"
        onChange={(ev) => setSearch(ev.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function SearchInput() {
  const navigation = useNavigation();
  const navigate = useNavigate();

  return (
    <SearchInputField
      loading={["loading", "submiting"].includes(navigation.state)}
      onSearch={(ev) => navigate(`/search?query=${ev}`)}
    />
  );
}

export default SearchInput;
