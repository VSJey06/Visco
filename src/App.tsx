import GraphWorkspace from './components/GraphWorkspace'
import { graphSubject, sampleEdges, sampleNodes } from './data/sampleGraph'
import './App.css'

function App() {
  return (
    <GraphWorkspace
      subject={graphSubject}
      nodes={sampleNodes}
      edges={sampleEdges}
    />
  )
}

export default App
