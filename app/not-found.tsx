export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go back home
        </a>
      </div>
    </div>
  )
}
