import type {
  DocumentMetadata,
  DocumentTextBlock,
  ExtractedDocument,
} from '../../src/types/document.ts'

const metadata: DocumentMetadata = {
  title: null,
  author: null,
  subject: null,
  keywords: null,
  creator: null,
  producer: null,
  creationDate: null,
  modificationDate: null,
}

function block(
  id: string,
  pageNumber: number,
  text: string,
  heading: DocumentTextBlock['heading'] = null,
): DocumentTextBlock {
  return {
    id,
    pageNumber,
    text,
    lines: text.split('\n'),
    fontSize: 12,
    fontFamily: null,
    isBold: false,
    isUppercase: false,
    heading,
  }
}

export function createTestDocument(): ExtractedDocument {
  return {
    fileName: 'biology.pdf',
    fileSize: 4096,
    metadata,
    pages: [
      {
        pageNumber: 1,
        width: 612,
        height: 792,
        text: 'Chapter 1 Cell Biology The cell membrane controls which substances enter the cell. Diffusion is the movement of particles from high to low concentration.',
        blocks: [
          block('page-1-block-1', 1, 'Chapter 1 Cell Biology', {
            kind: 'chapter',
            level: 1,
          }),
          block(
            'page-1-block-2',
            1,
            'The cell membrane controls which substances enter the cell.',
          ),
          block(
            'page-1-block-3',
            1,
            'Diffusion is the movement of particles from high to low concentration.',
          ),
        ],
        characterCount: 174,
        requiresOcr: false,
      },
      {
        pageNumber: 2,
        width: 612,
        height: 792,
        text: 'Membrane transport Active transport requires energy to move substances against the gradient. Osmosis is the diffusion of water across a membrane.',
        blocks: [
          block('page-2-block-1', 2, 'Membrane transport', {
            kind: 'section',
            level: 2,
          }),
          block(
            'page-2-block-2',
            2,
            'Active transport requires energy to move substances against the gradient.',
          ),
          block(
            'page-2-block-3',
            2,
            'Osmosis is the diffusion of water across a membrane.',
          ),
        ],
        characterCount: 158,
        requiresOcr: false,
      },
      {
        pageNumber: 3,
        width: 612,
        height: 792,
        text: 'Scanned page',
        blocks: [block('page-3-block-1', 3, 'Scanned page')],
        characterCount: 12,
        requiresOcr: true,
      },
    ],
    chapters: [
      {
        id: 'page-1-block-1',
        title: 'Chapter 1 Cell Biology',
        pageNumber: 1,
        pageEnd: 2,
        kind: 'chapter',
        level: 1,
        status: 'detected',
        sections: [
          {
            id: 'page-2-block-1',
            title: 'Membrane transport',
            pageNumber: 2,
            pageEnd: 2,
            kind: 'section',
            level: 2,
            status: 'detected',
          },
        ],
      },
    ],
    sections: [
      {
        id: 'page-2-block-1',
        title: 'Membrane transport',
        pageNumber: 2,
        pageEnd: 2,
        kind: 'section',
        level: 2,
        status: 'detected',
      },
    ],
    headingCount: 2,
    ocrPageNumbers: [3],
  }
}

export function createTwoChapterDocument(): ExtractedDocument {
  const document = createTestDocument()

  return {
    ...document,
    chapters: [
      {
        id: 'page-1-block-1',
        title: 'Chapter 1 Cell Biology',
        pageNumber: 1,
        pageEnd: 1,
        kind: 'chapter',
        level: 1,
        status: 'detected',
        sections: [],
      },
      {
        id: 'page-2-block-1',
        title: 'Chapter 2 Membrane transport',
        pageNumber: 2,
        pageEnd: 2,
        kind: 'chapter',
        level: 1,
        status: 'detected',
        sections: [],
      },
    ],
    sections: [],
  }
}

export function createSamePageChapterDocument(): ExtractedDocument {
  const document = createTestDocument()

  return {
    ...document,
    pages: [
      {
        ...document.pages[0],
        blocks: [
          block('page-1-block-1', 1, 'Chapter 1 First chapter', {
            kind: 'chapter',
            level: 1,
          }),
          block('page-1-block-2', 1, 'The first chapter has body text.'),
          block('page-1-block-3', 1, 'Chapter 2 Second chapter', {
            kind: 'chapter',
            level: 1,
          }),
          block('page-1-block-4', 1, 'The second chapter has body text.'),
        ],
      },
    ],
    chapters: [
      {
        id: 'page-1-block-1',
        title: 'Chapter 1 First chapter',
        pageNumber: 1,
        pageEnd: 1,
        kind: 'chapter',
        level: 1,
        status: 'detected',
        sections: [],
      },
      {
        id: 'page-1-block-3',
        title: 'Chapter 2 Second chapter',
        pageNumber: 1,
        pageEnd: 1,
        kind: 'chapter',
        level: 1,
        status: 'detected',
        sections: [],
      },
    ],
    sections: [],
    ocrPageNumbers: [],
  }
}

export function createLongWordDocument(): ExtractedDocument {
  const document = createTestDocument()
  const text = 'x'.repeat(200)

  return {
    ...document,
    pages: [
      {
        ...document.pages[0],
        blocks: [block('page-1-block-1', 1, text)],
        text,
      },
    ],
    chapters: [],
    sections: [],
    ocrPageNumbers: [],
  }
}

export function createSplitBlockDocument(): ExtractedDocument {
  const document = createTestDocument()
  const text = `${'alpha '.repeat(30).trim()}\n${'bravo '.repeat(30).trim()}`

  return {
    ...document,
    pages: [
      {
        ...document.pages[0],
        blocks: [block('page-1-block-1', 1, text)],
        text,
      },
    ],
    chapters: [],
    sections: [],
    ocrPageNumbers: [],
  }
}

export function createOversizedDocument(): ExtractedDocument {
  const document = createTestDocument()
  const longText = 'Sentence about membranes and transport. '.repeat(20)

  return {
    ...document,
    pages: [
      {
        ...document.pages[0],
        blocks: [block('page-1-block-1', 1, longText)],
        text: longText,
      },
    ],
    chapters: [],
    sections: [],
    ocrPageNumbers: [],
  }
}
