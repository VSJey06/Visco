import './App.css'

function App() {
  return (
    <main className="app">
      <header className="app__header">
        <p className="brand">
          visco<span aria-hidden="true">.</span>
        </p>
        <p className="tagline">
          An interactive organic knowledge web for curious minds.
        </p>
      </header>

      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">Learning that grows like a living web.</h1>
        <p>
          Visco turns scattered ideas into a connected space you can explore.
          Follow a thought, discover its neighbours, and let understanding take
          shape one link at a time.
        </p>
      </section>

      <section className="status" aria-labelledby="status-title">
        <div className="status__orb" aria-hidden="true">
          <span className="status__node status__node--one" />
          <span className="status__node status__node--two" />
          <span className="status__node status__node--three" />
        </div>
        <p className="eyebrow">Foundation</p>
        <h2 id="status-title">The knowledge web is taking root.</h2>
        <p>
          The app shell is ready. Cytoscape.js is installed for the upcoming
          graph layer, but no graph interface is enabled yet.
        </p>
      </section>

      <footer className="app__footer">
        <span>Local-first</span>
        <span>Mobile-first</span>
        <span>Lightweight</span>
      </footer>
    </main>
  )
}

export default App
