import type { KnowledgeEdge, KnowledgeNode } from '../types/graph'

export const graphSubject = 'The human nervous system'

export const sampleNodes: KnowledgeNode[] = [
  {
    id: 'nervous-system',
    title: 'Nervous System',
    type: 'Body system',
    tier: 'core',
    definition:
      "The body's electrochemical communication network. It senses change, integrates information, and coordinates rapid responses across organs and muscles.",
    keyPoints: [
      'Divided into the central and peripheral nervous systems.',
      'Uses neurons and glia to transmit and support signals.',
      'Coordinates sensation, movement, thought, and homeostasis.',
    ],
    sourcePage: 'p. 12',
    position: { x: 350, y: 430 },
  },
  {
    id: 'cns',
    title: 'Central Nervous System',
    type: 'Division',
    tier: 'core',
    definition:
      'The central processing division of the nervous system, made up of the brain and spinal cord.',
    keyPoints: [
      'Integrates sensory input and generates motor commands.',
      'Protected by the skull, vertebral column, and meninges.',
      'Houses the circuits responsible for cognition and memory.',
    ],
    sourcePage: 'p. 18',
    position: { x: 280, y: 280 },
  },
  {
    id: 'pns',
    title: 'Peripheral Nervous System',
    type: 'Division',
    tier: 'core',
    definition:
      'The peripheral division carries signals between the central nervous system and the rest of the body.',
    keyPoints: [
      'Includes cranial and spinal nerves.',
      'Splits functionally into somatic and autonomic pathways.',
      'Links the CNS with sensory receptors, muscles, and organs.',
    ],
    sourcePage: 'p. 46',
    position: { x: 525, y: 565 },
  },
  {
    id: 'brain',
    title: 'Brain',
    type: 'Organ',
    tier: 'major',
    definition:
      "The brain is the control centre of the central nervous system, containing roughly 86 billion neurons in humans.",
    keyPoints: [
      'Organised into cortex, subcortical structures, brainstem, and cerebellum.',
      "Supports perception, movement, emotion, and memory.",
      "Consumes a disproportionate share of the body's energy.",
    ],
    sourcePage: 'p. 22',
    position: { x: 140, y: 125 },
  },
  {
    id: 'spinal-cord',
    title: 'Spinal Cord',
    type: 'Structure',
    tier: 'major',
    definition:
      'A long bundle of nerve tissue that carries signals between the brain and the body and supports local reflexes.',
    keyPoints: [
      'Ascending tracts carry sensory information upward.',
      'Descending tracts deliver motor commands.',
      'Reflex circuits can act without waiting for the brain.',
    ],
    sourcePage: 'p. 34',
    position: { x: 320, y: 505 },
  },
  {
    id: 'neuron',
    title: 'Neuron',
    type: 'Cell type',
    tier: 'major',
    definition:
      'A specialised cell that receives, integrates, and transmits electrochemical signals.',
    keyPoints: [
      'Dendrites receive input; axons carry output.',
      'Action potentials encode rapid long-distance signals.',
      'Neurons communicate through synapses, not direct continuity.',
    ],
    sourcePage: 'p. 58',
    position: { x: 570, y: 310 },
  },
  {
    id: 'glia',
    title: 'Glial Cells',
    type: 'Cell type',
    tier: 'major',
    definition:
      'Non-neuronal cells that support, protect, and modulate neurons and their connections.',
    keyPoints: [
      'Astrocytes regulate the chemical environment.',
      'Oligodendrocytes and Schwann cells form myelin.',
      "Microglia act as the nervous system's immune cells.",
    ],
    sourcePage: 'p. 72',
    position: { x: 625, y: 480 },
  },
  {
    id: 'synapse',
    title: 'Synapse',
    type: 'Junction',
    tier: 'major',
    definition:
      'The specialised junction where one neuron influences another cell, usually by releasing neurotransmitter.',
    keyPoints: [
      'A presynaptic terminal faces a postsynaptic membrane.',
      'Chemical synapses convert electrical signals into chemical ones.',
      'Synaptic strength changes with learning and experience.',
    ],
    sourcePage: 'p. 64',
    position: { x: 530, y: 175 },
  },
  {
    id: 'neurotransmitters',
    title: 'Neurotransmitters',
    type: 'Signalling molecule',
    tier: 'major',
    definition:
      'Chemical messengers released at synapses to excite, inhibit, or modulate the next cell.',
    keyPoints: [
      'Glutamate and GABA are the main fast transmitters.',
      'Dopamine, serotonin, and norepinephrine modulate wider circuits.',
      'Reuptake and enzymes end transmitter action.',
    ],
    sourcePage: 'p. 68',
    position: { x: 430, y: 60 },
  },
  {
    id: 'autonomic',
    title: 'Autonomic Nervous System',
    type: 'Division',
    tier: 'major',
    definition:
      'The autonomic nervous system regulates involuntary functions such as heart rate, digestion, and glandular activity.',
    keyPoints: [
      'Operates largely below conscious awareness.',
      'Balances sympathetic and parasympathetic activity.',
      'Uses chains of two motor neurons to reach target organs.',
    ],
    sourcePage: 'p. 84',
    position: { x: 535, y: 705 },
  },
  {
    id: 'somatic',
    title: 'Somatic Nervous System',
    type: 'Division',
    tier: 'major',
    definition:
      'The somatic nervous system controls voluntary movement and carries conscious sensory information.',
    keyPoints: [
      'Motor neurons innervate skeletal muscle.',
      'Sensory fibres report touch, position, and pain.',
      'Pathways are generally direct from CNS to muscle.',
    ],
    sourcePage: 'p. 78',
    position: { x: 360, y: 760 },
  },
  {
    id: 'cortex',
    title: 'Cerebral Cortex',
    type: 'Brain region',
    tier: 'major',
    definition:
      'The cerebral cortex is the folded outer layer of the brain responsible for higher-order processing.',
    keyPoints: [
      'Organised into sensory, motor, and association areas.',
      'Folds increase surface area within the skull.',
      'Plasticity allows maps to reorganise with experience.',
    ],
    sourcePage: 'p. 26',
    position: { x: 60, y: 260 },
  },
  {
    id: 'brainstem',
    title: 'Brainstem',
    type: 'Brain region',
    tier: 'supporting',
    definition:
      'The brainstem connects the brain with the spinal cord and manages vital automatic functions.',
    keyPoints: [
      'Includes the midbrain, pons, and medulla.',
      'Controls breathing, heart rate, and consciousness.',
      'Many cranial nerve nuclei sit here.',
    ],
    sourcePage: 'p. 30',
    position: { x: 255, y: 150 },
  },
  {
    id: 'cerebellum',
    title: 'Cerebellum',
    type: 'Brain region',
    tier: 'supporting',
    definition:
      'A dense hindbrain structure that refines movement, balance, and motor learning.',
    keyPoints: [
      'Compares intended movement with sensory feedback.',
      'Contains more neurons than the cerebral cortex.',
      'Contributes to timing and coordination.',
    ],
    sourcePage: 'p. 32',
    position: { x: 225, y: 390 },
  },
  {
    id: 'limbic',
    title: 'Limbic System',
    type: 'Brain system',
    tier: 'supporting',
    definition:
      'A group of interconnected structures involved in emotion, motivation, and memory.',
    keyPoints: [
      'Includes the hippocampus and amygdala.',
      'Links visceral states with behaviour.',
      'Not a single anatomical unit.',
    ],
    sourcePage: 'p. 38',
    position: { x: 160, y: 300 },
  },
  {
    id: 'hippocampus',
    title: 'Hippocampus',
    type: 'Brain structure',
    tier: 'supporting',
    definition:
      'A seahorse-shaped structure critical for forming new episodic memories and spatial navigation.',
    keyPoints: [
      'Consolidates short-term experience for storage.',
      'Contains place cells that map space.',
      'Damage impairs new declarative memory.',
    ],
    sourcePage: 'p. 40',
    position: { x: 70, y: 445 },
  },
  {
    id: 'amygdala',
    title: 'Amygdala',
    type: 'Brain structure',
    tier: 'supporting',
    definition:
      'An almond-shaped structure that assigns emotional significance, especially to threat and reward cues.',
    keyPoints: [
      'Coordinates rapid fear responses.',
      'Interacts with the autonomic system.',
      'Modulates memory for emotionally salient events.',
    ],
    sourcePage: 'p. 42',
    position: { x: 185, y: 530 },
  },
  {
    id: 'myelin',
    title: 'Myelin Sheath',
    type: 'Cell structure',
    tier: 'supporting',
    definition:
      'A fatty insulating sheath wrapped around axons that speeds up signal conduction.',
    keyPoints: [
      'Produced by oligodendrocytes in the CNS.',
      'Produced by Schwann cells in the PNS.',
      'Gaps called nodes of Ranvier enable saltatory conduction.',
    ],
    sourcePage: 'p. 62',
    position: { x: 650, y: 365 },
  },
  {
    id: 'sympathetic',
    title: 'Sympathetic Division',
    type: 'Autonomic branch',
    tier: 'supporting',
    definition:
      'The sympathetic division mobilises the body for action during challenge or stress.',
    keyPoints: [
      'Raises heart rate and redirects blood to muscles.',
      'Dilates pupils and airways.',
      'Often summarised as fight-or-flight.',
    ],
    sourcePage: 'p. 88',
    position: { x: 640, y: 790 },
  },
  {
    id: 'parasympathetic',
    title: 'Parasympathetic Division',
    type: 'Autonomic branch',
    tier: 'supporting',
    definition:
      'The parasympathetic division promotes rest, digestion, and recovery.',
    keyPoints: [
      'Slows heart rate and supports digestion.',
      'Uses the vagus nerve for many organs.',
      'Often summarised as rest-and-digest.',
    ],
    sourcePage: 'p. 90',
    position: { x: 450, y: 855 },
  },
]

export const sampleEdges: KnowledgeEdge[] = [
  {
    id: 'link-ns-cns',
    source: 'nervous-system',
    target: 'cns',
    relationship: 'Structural division',
    label: 'includes',
    explanation:
      'The nervous system is organised into central and peripheral divisions; the CNS is the processing core.',
    supportingPoints: [
      'The CNS comprises the brain and spinal cord.',
      'It receives and integrates information from the PNS.',
    ],
    curve: 42,
  },
  {
    id: 'link-ns-pns',
    source: 'nervous-system',
    target: 'pns',
    relationship: 'Structural division',
    label: 'includes',
    explanation:
      'The PNS connects the CNS with sensors, muscles, and organs throughout the body.',
    supportingPoints: [
      'Cranial and spinal nerves form its main routes.',
      'It carries both sensory and motor signals.',
    ],
    curve: -48,
  },
  {
    id: 'link-cns-brain',
    source: 'cns',
    target: 'brain',
    relationship: 'Anatomical containment',
    label: 'contains',
    explanation:
      'The brain is the largest component of the central nervous system and sits within the skull.',
    supportingPoints: [
      'The brain directs perception, thought, and action.',
      'The skull and meninges protect it.',
    ],
    curve: 28,
  },
  {
    id: 'link-cns-spinal',
    source: 'cns',
    target: 'spinal-cord',
    relationship: 'Anatomical containment',
    label: 'contains',
    explanation:
      'The spinal cord is the other major component of the CNS, housed in the vertebral canal.',
    supportingPoints: [
      'It links the brain with spinal nerves.',
      'It supports local reflex circuits.',
    ],
    curve: -34,
  },
  {
    id: 'link-brain-cortex',
    source: 'brain',
    target: 'cortex',
    relationship: 'Anatomical relation',
    label: 'outer layer',
    explanation:
      'The cerebral cortex is the folded outer sheet of the cerebrum.',
    supportingPoints: [
      'It supports higher-order sensory and cognitive processing.',
      'Its folds create a large surface area.',
    ],
    curve: 55,
  },
  {
    id: 'link-brain-brainstem',
    source: 'brain',
    target: 'brainstem',
    relationship: 'Anatomical relation',
    label: 'connects',
    explanation:
      'The brainstem links the brain to the spinal cord and controls vital automatic functions.',
    supportingPoints: [
      'It houses nuclei for breathing and heart rate.',
      'It is a passage for major ascending and descending tracts.',
    ],
    curve: -40,
  },
  {
    id: 'link-brain-cerebellum',
    source: 'brain',
    target: 'cerebellum',
    relationship: 'Anatomical relation',
    label: 'fine-tunes',
    explanation:
      'The cerebellum coordinates timing, balance, and the refinement of movement.',
    supportingPoints: [
      'It compares intended commands with sensory feedback.',
      'It participates in motor learning.',
    ],
    curve: 62,
  },
  {
    id: 'link-brain-limbic',
    source: 'brain',
    target: 'limbic',
    relationship: 'Functional system',
    label: 'regulates emotion',
    explanation:
      'Limbic structures link emotion, motivation, and memory with the rest of the brain.',
    supportingPoints: [
      'The system includes the hippocampus and amygdala.',
      'It connects internal state with behaviour.',
    ],
    curve: -64,
  },
  {
    id: 'link-limbic-hippocampus',
    source: 'limbic',
    target: 'hippocampus',
    relationship: 'Anatomical membership',
    label: 'forms memories',
    explanation:
      'The hippocampus is a key limbic structure for forming new episodic memories.',
    supportingPoints: [
      'It consolidates new experiences.',
      'It supports spatial navigation.',
    ],
    curve: 36,
  },
  {
    id: 'link-limbic-amygdala',
    source: 'limbic',
    target: 'amygdala',
    relationship: 'Anatomical membership',
    label: 'sounds alarm',
    explanation:
      'The amygdala assigns emotional significance and coordinates rapid threat responses.',
    supportingPoints: [
      'It connects sensory cues with autonomic arousal.',
      'It strengthens memory for emotionally charged events.',
    ],
    curve: -44,
  },
  {
    id: 'link-pns-somatic',
    source: 'pns',
    target: 'somatic',
    relationship: 'Functional division',
    label: 'voluntary',
    explanation:
      'The somatic division carries conscious sensation and commands voluntary skeletal movement.',
    supportingPoints: [
      'Motor neurons reach skeletal muscle directly.',
      'Sensory fibres report touch, position, and pain.',
    ],
    curve: 34,
  },
  {
    id: 'link-pns-autonomic',
    source: 'pns',
    target: 'autonomic',
    relationship: 'Functional division',
    label: 'involuntary',
    explanation:
      'The autonomic division regulates involuntary functions of the internal organs.',
    supportingPoints: [
      'It controls heart rate, digestion, and glands.',
      'It uses two-neuron chains to reach targets.',
    ],
    curve: -38,
  },
  {
    id: 'link-autonomic-sympathetic',
    source: 'autonomic',
    target: 'sympathetic',
    relationship: 'Functional branch',
    label: 'fight or flight',
    explanation:
      'The sympathetic division mobilises resources during challenge or stress.',
    supportingPoints: [
      'It raises heart rate and blood pressure.',
      'It redirects blood flow toward skeletal muscle.',
    ],
    curve: 52,
  },
  {
    id: 'link-autonomic-parasympathetic',
    source: 'autonomic',
    target: 'parasympathetic',
    relationship: 'Functional branch',
    label: 'rest and digest',
    explanation:
      'The parasympathetic division supports recovery, digestion, and energy storage.',
    supportingPoints: [
      'It slows the heart and promotes digestion.',
      'The vagus nerve carries most of its output.',
    ],
    curve: -56,
  },
  {
    id: 'link-neuron-synapse',
    source: 'neuron',
    target: 'synapse',
    relationship: 'Signal transmission',
    label: 'signals at',
    explanation:
      'Neurons influence target cells at specialised junctions called synapses.',
    supportingPoints: [
      'Most synapses are chemical.',
      'Synaptic transmission converts electrical signals to chemical ones.',
    ],
    curve: 46,
  },
  {
    id: 'link-neuron-myelin',
    source: 'neuron',
    target: 'myelin',
    relationship: 'Structural support',
    label: 'insulated by',
    explanation:
      'Myelin sheaths wrap axons to accelerate action-potential conduction.',
    supportingPoints: [
      'Myelin is interrupted at nodes of Ranvier.',
      'Conduction jumps between nodes in saltatory fashion.',
    ],
    curve: -30,
  },
  {
    id: 'link-synapse-neurotransmitters',
    source: 'synapse',
    target: 'neurotransmitters',
    relationship: 'Chemical signalling',
    label: 'releases',
    explanation:
      'Synapses release neurotransmitters to carry the signal across the synaptic cleft.',
    supportingPoints: [
      'Transmitter release is triggered by calcium entry.',
      'Receptors on the target cell determine the effect.',
    ],
    curve: 30,
  },
  {
    id: 'link-glia-myelin',
    source: 'glia',
    target: 'myelin',
    relationship: 'Myelination',
    label: 'builds',
    explanation:
      'Glial cells produce and maintain the myelin that insulates axons.',
    supportingPoints: [
      'Oligodendrocytes myelinate CNS axons.',
      'Schwann cells myelinate peripheral axons.',
    ],
    curve: -42,
  },
  {
    id: 'link-glia-neuron',
    source: 'glia',
    target: 'neuron',
    relationship: 'Metabolic support',
    label: 'supports',
    explanation:
      'Glia sustain neurons by regulating the environment and supplying metabolic support.',
    supportingPoints: [
      'Astrocytes buffer ions and recycle transmitters.',
      'Microglia remove debris and respond to injury.',
    ],
    curve: 32,
  },
  {
    id: 'link-cortex-neuron',
    source: 'cortex',
    target: 'neuron',
    relationship: 'Cellular composition',
    label: 'composed of',
    explanation:
      'The cortex is built from layered networks of neurons and their connections.',
    supportingPoints: [
      'Pyramidal neurons are a characteristic cortical cell type.',
      'Cortical columns organise local processing.',
    ],
    curve: 44,
  },
  {
    id: 'link-spinal-somatic',
    source: 'spinal-cord',
    target: 'somatic',
    relationship: 'Signal pathway',
    label: 'serves',
    explanation:
      'Spinal motor neurons form the final common path to skeletal muscles in the somatic system.',
    supportingPoints: [
      'Ventral roots carry motor fibres outward.',
      'Dorsal roots bring sensory fibres inward.',
    ],
    curve: -50,
  },
  {
    id: 'link-brain-neuron',
    source: 'brain',
    target: 'neuron',
    relationship: 'Cellular composition',
    label: 'built from',
    explanation:
      "The brain's circuits are assembled from neurons linked by synapses.",
    supportingPoints: [
      'The human brain contains roughly 86 billion neurons.',
      'Glial cells outnumber neurons in many regions.',
    ],
    curve: 40,
  },
  {
    id: 'link-brainstem-autonomic',
    source: 'brainstem',
    target: 'autonomic',
    relationship: 'Control centre',
    label: 'regulates',
    explanation:
      'Brainstem nuclei regulate vital autonomic reflexes such as breathing and circulation.',
    supportingPoints: [
      'The medulla controls heart rate and breathing.',
      'The vagus nerve emerges from the brainstem.',
    ],
    curve: 36,
  },
  {
    id: 'link-cerebellum-somatic',
    source: 'cerebellum',
    target: 'somatic',
    relationship: 'Motor control',
    label: 'refines',
    explanation:
      'The cerebellum corrects and smooths voluntary movements initiated by cortical circuits.',
    supportingPoints: [
      'It uses sensory feedback to adjust timing.',
      'Damage causes uncoordinated movement.',
    ],
    curve: -40,
  },
  {
    id: 'link-hippocampus-cortex',
    source: 'hippocampus',
    target: 'cortex',
    relationship: 'Memory transfer',
    label: 'consolidates to',
    explanation:
      'The hippocampus helps consolidate new memories into cortical networks for long-term storage.',
    supportingPoints: [
      'Repeated reactivation strengthens cortical traces.',
      'The hippocampus remains important for spatial context.',
    ],
    curve: 58,
  },
  {
    id: 'link-amygdala-autonomic',
    source: 'amygdala',
    target: 'autonomic',
    relationship: 'Emotional arousal',
    label: 'triggers',
    explanation:
      'The amygdala drives autonomic arousal during emotionally significant events.',
    supportingPoints: [
      'It can raise heart rate before conscious appraisal.',
      'It links threat cues to defensive responses.',
    ],
    curve: -46,
  },
  {
    id: 'link-sympathetic-spinal',
    source: 'sympathetic',
    target: 'spinal-cord',
    relationship: 'Anatomical origin',
    label: 'arises from',
    explanation:
      'Sympathetic preganglionic neurons emerge from the thoracic and upper lumbar spinal cord.',
    supportingPoints: [
      'Their axons enter sympathetic ganglia.',
      'Postganglionic fibres reach target organs.',
    ],
    curve: 42,
  },
  {
    id: 'link-parasympathetic-brainstem',
    source: 'parasympathetic',
    target: 'brainstem',
    relationship: 'Anatomical origin',
    label: 'carried by',
    explanation:
      'Many parasympathetic fibres travel with cranial nerves that originate in the brainstem.',
    supportingPoints: [
      'The vagus nerve is the largest contributor.',
      'Sacral spinal nerves handle lower pelvic organs.',
    ],
    curve: -38,
  },
  {
    id: 'link-neurotransmitters-neuron',
    source: 'neurotransmitters',
    target: 'neuron',
    relationship: 'Receptor binding',
    label: 'binds',
    explanation:
      'Neurotransmitters bind receptor proteins on neurons to change their excitability.',
    supportingPoints: [
      'Ionotropic receptors open channels directly.',
      'Metabotropic receptors act through second messengers.',
    ],
    curve: 34,
  },
  {
    id: 'link-synapse-glia',
    source: 'synapse',
    target: 'glia',
    relationship: 'Synaptic regulation',
    label: 'regulated by',
    explanation:
      'Astrocytes and other glia shape synaptic transmission and clear released chemicals.',
    supportingPoints: [
      'Astrocytes recycle glutamate and GABA.',
      'Perisynaptic glia help isolate active synapses.',
    ],
    curve: -36,
  },
]
