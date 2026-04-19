export default function Footer() {
  return (
    <footer className="border-t mt-8 py-6 px-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">TorrentLab</p>
          <p className="text-sm text-muted-foreground">
            © 2025 TorrentLab. Software criado para a era digital
          </p>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Termos de Serviço</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <a href="#" className="hover:text-foreground transition-colors">DMCA</a>
          <a href="#" className="hover:text-foreground transition-colors">Contato</a>
        </nav>
      </div>
    </footer>
  )
}
