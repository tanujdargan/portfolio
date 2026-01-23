import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { ExternalLink, Github, ArrowUpRight, Trophy } from 'lucide-react'
import './Projects.css'

const projects = [
  {
    title: 'Optimate',
    subtitle: 'Hack the North 2025 Winner',
    awards: ['Y Combinator Unicorn Prize', 'Federato Best RiskOps Solution'],
    description: 'AI-powered underwriting dashboard that delivers explainable AI insights, interactive heatmaps, and real-time portfolio tracking. Cut review time by 50% and reduced errors by 20%.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    tags: ['Next.js', 'Cohere LLMs', 'RL', 'AWS DynamoDB', 'shadcn'],
    github: 'https://github.com/tanujdargan',
    live: '#',
    featured: true
  },
  {
    title: 'Drop',
    subtitle: 'Open Source AirDrop Alternative',
    description: 'Cross-platform file sharing tool with peer-to-peer WebRTC transfers, secure session management, and NFC/BLE-based device discovery. No app install or shared Wi-Fi needed.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    tags: ['Rust', 'Next.js', 'WebRTC', 'NFC/BLE'],
    github: 'https://github.com/tanujdargan',
    live: '#',
    featured: true
  },
  {
    title: 'AIMO Progress Prize 2',
    subtitle: 'Silver Medal | Top 10% of 2200 teams',
    awards: ['Kaggle Silver Medal'],
    description: 'Engineered multi-stage LLM pipelines with advanced prompt engineering and modular reasoning strategies to achieve 54% accuracy on math word problems.',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    tags: ['LLMs', 'Prompt Engineering', 'Python'],
    github: 'https://github.com/tanujdargan',
    live: '#',
    featured: true
  },
  {
    title: 'Wedding Studio',
    subtitle: 'Buildspace s5 | YC/a16z Backed',
    description: 'AI-powered MVP enabling couples to generate personalized venue mock-ups from real photos using diffusion models, rapidly connecting them with vendors.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    tags: ['Next.js', 'Python', 'PyTorch', 'Diffusion Models'],
    github: 'https://github.com/tanujdargan',
    live: '#',
    featured: false
  }
]

export default function Projects() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const featuredProjects = projects.filter(p => p.featured)
  const otherProjects = projects.filter(p => !p.featured)

  return (
    <section id="projects" className="projects" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Projects</span>
          <h2 className="section-title">Featured Work</h2>
          <p className="section-description">
            A selection of projects spanning AI, systems, and full-stack development.
          </p>
        </motion.div>

        <div className="featured-projects">
          {featuredProjects.map((project, index) => (
            <motion.article
              key={project.title}
              className="featured-project"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
            >
              <div className="project-image">
                <img src={project.image} alt={project.title} />
                <div className="project-overlay">
                  <motion.a
                    href={project.live}
                    className="overlay-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ExternalLink size={20} />
                  </motion.a>
                  <motion.a
                    href={project.github}
                    className="overlay-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Github size={20} />
                  </motion.a>
                </div>
              </div>
              <div className="project-content">
                {'awards' in project && project.awards && (
                  <div className="project-awards">
                    {project.awards.map(award => (
                      <span key={award} className="award-badge">
                        <Trophy size={14} />
                        {award}
                      </span>
                    ))}
                  </div>
                )}
                <h3 className="project-title">{project.title}</h3>
                <p className="project-subtitle">{project.subtitle}</p>
                <p className="project-description">{project.description}</p>
                <div className="project-tags">
                  {project.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.h3
          className="other-projects-title"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Other Notable Projects
        </motion.h3>

        <div className="other-projects">
          {otherProjects.map((project, index) => (
            <motion.article
              key={project.title}
              className="project-card"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <div className="project-card-header">
                <div className="project-card-links">
                  <a href={project.github} target="_blank" rel="noopener noreferrer">
                    <Github size={20} />
                  </a>
                  <a href={project.live} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight size={20} />
                  </a>
                </div>
              </div>
              <h4 className="project-card-title">{project.title}</h4>
              <p className="project-card-subtitle">{project.subtitle}</p>
              <p className="project-card-description">{project.description}</p>
              <div className="project-card-tags">
                {project.tags.map(tag => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
