import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import GraphWorkspace from './components/GraphWorkspace'
import { graphSubject, sampleEdges, sampleNodes } from './data/sampleGraph'
import './App.css'

const DocumentWorkspace = lazy(
  () => import('./components/DocumentWorkspace'),
)

function App() {
  const [isDocumentOpen, setIsDocumentOpen] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const handleOpenDocument = useCallback(() => {
    if (globalThis.document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = globalThis.document.activeElement
    }

    setIsDocumentOpen(true)
  }, [])

  const handleCloseDocument = useCallback(() => {
    setIsDocumentOpen(false)
  }, [])

  useEffect(() => {
    if (isDocumentOpen) {
      return
    }

    returnFocusRef.current?.focus()
    returnFocusRef.current = null
  }, [isDocumentOpen])

  return (
    <>
      <GraphWorkspace
        subject={graphSubject}
        nodes={sampleNodes}
        edges={sampleEdges}
        onOpenDocument={handleOpenDocument}
      />
      <Suspense fallback={null}>
        {isDocumentOpen ? (
          <DocumentWorkspace onClose={handleCloseDocument} />
        ) : null}
      </Suspense>
    </>
  )
}

export default App
