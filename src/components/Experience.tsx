import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Calendar, MapPin, X, ExternalLink, Github, FileText } from 'lucide-react'
import './Experience.css'

interface ExperienceLink {
  label: string
  url: string
  icon: 'github' | 'external' | 'docs'
}

interface ExperienceItem {
  title: string
  company: string
  location: string
  period: string
  description: string
  fullDescription: string
  tags: string[]
  links: ExperienceLink[]
}

const experiences: ExperienceItem[] = [
  {
    title: 'Lead AI Developer',
    company: 'Pear Care',
    location: 'Remote',
    period: 'Jul 2025 - Present',
    description: 'Building autonomous medical-AI agents with LangGraph, MoE routing, and task-introspective reasoning across 1,000+ clinical specialties.',
    fullDescription: 'Building autonomous medical-AI agents with LangGraph, MoE routing, and task-introspective reasoning, served via FastAPI on GCP across 1,000+ clinical specialties. Cut model memory footprint by 40% while preserving 95%+ F1 on internal clinical triage benchmarks by transitioning to quantized LoRA/PEFT fine-tuned deployments on PyTorch, Ollama, and vLLM. Architected multi-tenant GCP/AWS infrastructure with Redis caching, DynamoDB persistence, end-to-end encryption, and mobile-first access. Leading a team of developers building the core AI platform.',
    tags: ['LangGraph', 'MoE', 'LoRA/PEFT', 'FastAPI', 'GCP', 'PyTorch'],
    links: [
      { label: 'Pear Care', url: 'https://pearcare.ai', icon: 'external' }
    ]
  },
  {
    title: 'Software Engineering Fellow',
    company: 'Major League Hacking (MLH)',
    location: 'Remote',
    period: 'May 2025 - Aug 2025',
    description: 'Streamlined developer debugging for Apache Airflow\'s 50K+ star codebase and patched a core scheduler bug.',
    fullDescription: 'Architected Docker-based IDE debugging for Apache Airflow\'s 50K+ star codebase, enabling step-through debugging in VSCode and PyCharm with dynamic port exposure — cutting setup-to-debug cycles from hours to minutes. Shipped in a team of 3 alongside Royal Bank of Canada engineers. Diagnosed and patched a long-standing time-window logic bug causing silently missed DAG runs across multiple Airflow releases; fix merged into the core scheduler.',
    tags: ['Apache Airflow', 'Python', 'Docker', 'Open Source', 'RBC'],
    links: [
      { label: 'Apache Airflow', url: 'https://github.com/apache/airflow', icon: 'github' },
      { label: 'MLH Fellowship', url: 'https://fellowship.mlh.io', icon: 'external' }
    ]
  },
  {
    title: 'Undergraduate Researcher - Vector Search',
    company: 'DEIA Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'May 2025 - Present',
    description: 'Built a custom retrieval system on a modified cuVS fork, sustaining 1-4M QPS at billion-vector scale.',
    fullDescription: 'Built a custom retrieval system on a modified cuVS fork (CAGRA, IVF-PQ), sustaining 1-4M QPS at billion-vector scale with 90-95% recall and sub-250ms latency across 8+ NVIDIA GPUs and 2TB of indexed data. Achieved 4.3x throughput scaling by building automated stress-testing pipelines on Kubernetes GPU clusters, profiling memory bandwidth and NVLink interconnect saturation to expose bottlenecks. Researching novel indexing strategies for approximate nearest neighbor search and contributing to academic publications.',
    tags: ['cuVS', 'GPU Clusters', 'Kubernetes', 'High-Performance Computing'],
    links: [
      { label: 'DEIA Lab', url: 'https://www.uvic.ca/engineering/ece/research/groups/deia/', icon: 'external' }
    ]
  },
  {
    title: 'Undergraduate AI Researcher',
    company: 'SOLIDS Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'May 2025 - Present',
    description: 'Achieved R² = 93.6% satellite-to-deep-water temperature prediction and delivered frameworks to NRC Canada.',
    fullDescription: 'Achieved R² = 93.6% satellite-to-deep-water temperature prediction (+17.7% over baseline) across 9 experiments, disproving the original 167m-depth hypothesis and pivoting the research direction for the lab. Delivered and deployed 3 ocean-health frameworks (SHQI, CVI, OHI at R² = 87.9%) to the National Research Council Canada, now in active use for salmon habitat monitoring, coastal erosion early warning, and First Nations stewardship dashboards. Working with satellite imagery, drone footage, and ground-truth sensor data to build predictive models.',
    tags: ['PyTorch', 'Remote Sensing', 'NRC Canada', 'Multimodal ML'],
    links: [
      { label: 'SOLIDS Lab', url: 'https://www.uvic.ca/engineering/civil/research/solids/', icon: 'external' }
    ]
  },
  {
    title: 'Software Developer & Undergraduate Researcher',
    company: 'UVic Centre for Aerospace Research (CFAR)',
    location: 'Victoria, BC',
    period: 'Apr 2025 - Present',
    description: 'Led OBC firmware, TTC board design, and cross-functional integration for DoomSat and balloon missions.',
    fullDescription: 'Led OBC firmware (C), TTC board design, and cross-functional hardware/software integration for DoomSat and a high-altitude balloon mission, coordinating across electrical, mechanical, and software teams. Cut MarmotSat testing from 180 min to 15 min by building a CI/HIL pipeline with GitHub Actions and SWD flashing (80+ checksum rules/commit), and implementing C/Java YAMCS integration that eliminated 20+ hours of manual work per release.',
    tags: ['C', 'Java', 'YAMCS', 'CI/CD', 'GitHub Actions', 'Satellite Systems'],
    links: [
      { label: 'CFAR', url: 'https://www.uvic.ca/research/centres/aerospace/', icon: 'external' },
      { label: 'YAMCS Docs', url: 'https://yamcs.org/', icon: 'docs' }
    ]
  }
]

const iconMap = {
  github: Github,
  external: ExternalLink,
  docs: FileText
}

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [selectedExp, setSelectedExp] = useState<ExperienceItem | null>(null)

  return (
    <section id="experience" className="experience" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Experience</span>
          <h2 className="section-title">Where I've Worked</h2>
          <p className="section-description">
            From AI research labs to open-source contributions and aerospace software.
          </p>
        </motion.div>

        <div className="experience-timeline">
          {experiences.map((exp, index) => (
            <motion.article
              key={`${exp.company}-${exp.title}`}
              className="experience-card"
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              onClick={() => setSelectedExp(exp)}
              whileHover={{ scale: 1.01 }}
              style={{ cursor: 'pointer' }}
            >
              <div className="experience-marker">
                <div className="marker-dot" />
                {index < experiences.length - 1 && <div className="marker-line" />}
              </div>
              <div className="experience-content">
                <div className="experience-header">
                  <div>
                    <h3 className="experience-title">{exp.title}</h3>
                    <p className="experience-company">{exp.company}</p>
                  </div>
                  <div className="experience-meta">
                    <span className="experience-period">
                      <Calendar size={14} />
                      {exp.period}
                    </span>
                    <span className="experience-location">
                      <MapPin size={14} />
                      {exp.location}
                    </span>
                  </div>
                </div>
                <p className="experience-description">{exp.description}</p>
                <div className="experience-tags">
                  {exp.tags.map(tag => (
                    <span key={tag} className="exp-tag">{tag}</span>
                  ))}
                </div>
                <span className="click-hint">Click to expand</span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedExp && (
          <motion.div
            className="experience-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExp(null)}
          >
            <motion.div
              className="experience-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedExp(null)}
              >
                <X size={24} />
              </button>

              <div className="modal-content">
                <div className="modal-left">
                  <div className="modal-header">
                    <h2 className="modal-title">{selectedExp.title}</h2>
                    <p className="modal-company">{selectedExp.company}</p>
                  </div>

                  <div className="modal-meta">
                    <span className="modal-period">
                      <Calendar size={16} />
                      {selectedExp.period}
                    </span>
                    <span className="modal-location">
                      <MapPin size={16} />
                      {selectedExp.location}
                    </span>
                  </div>

                  <p className="modal-description">{selectedExp.fullDescription}</p>

                  <div className="modal-tags">
                    {selectedExp.tags.map(tag => (
                      <span key={tag} className="modal-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="modal-right">
                  <h3 className="modal-links-title">Relevant Links</h3>
                  <div className="modal-links">
                    {selectedExp.links.map(link => {
                      const IconComponent = iconMap[link.icon]
                      return (
                        <motion.a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modal-link"
                          whileHover={{ x: 4 }}
                        >
                          <IconComponent size={20} />
                          <span>{link.label}</span>
                          <ExternalLink size={14} className="link-arrow" />
                        </motion.a>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
