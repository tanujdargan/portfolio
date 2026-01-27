import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import './Skills.css'

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(url: string): string {
  // Simple hash of the URL for localStorage key
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0
  }
  return `gh-stats-${Math.abs(hash)}`
}

function CachedStatImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(getCacheKey(url))
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION_MS) return data
      }
    } catch { /* ignore */ }
    return url
  })

  useEffect(() => {
    const key = getCacheKey(url)

    // Check cache
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setSrc(data)
          return
        }
      }
    } catch { /* ignore */ }

    // Fetch SVG and cache as data URL
    let cancelled = false
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then(svg => {
        if (cancelled) return
        const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
        try {
          localStorage.setItem(key, JSON.stringify({ data: dataUrl, timestamp: Date.now() }))
        } catch { /* storage full */ }
        setSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc(url) // fallback to direct URL
      })

    return () => { cancelled = true }
  }, [url])

  return <img src={src} alt={alt} loading="lazy" />
}

const skillCategories = [
  {
    title: 'Languages',
    skills: ['Python', 'Java', 'C', 'JavaScript', 'TypeScript', 'Rust', 'YAML']
  },
  {
    title: 'Frontend',
    skills: ['React', 'Next.js', 'Three.js', 'Tailwind CSS', 'Webflow']
  },
  {
    title: 'Backend',
    skills: ['Node.js', 'Django', 'FastAPI', 'Express.js']
  },
  {
    title: 'Databases',
    skills: ['MongoDB', 'Firebase', 'PostgreSQL', 'Redis', 'Supabase']
  },
  {
    title: 'AI/ML',
    skills: ['TensorFlow', 'PyTorch', 'scikit-learn', 'Hugging Face', 'Pandas', 'NumPy', 'OpenCV']
  },
  {
    title: 'LLM/Inference',
    skills: ['LangChain', 'LangGraph', 'vLLM', 'Ollama', 'LoRA', 'OpenAI API']
  },
  {
    title: 'MLOps',
    skills: ['Kaggle', 'Jupyter', 'Weights & Biases', 'MLflow', 'CUDA']
  },
  {
    title: 'Cloud',
    skills: ['GCP', 'AWS', 'Vercel', 'Cloudflare']
  },
  {
    title: 'DevOps/Infra',
    skills: ['Docker', 'Kubernetes', 'Proxmox', 'Terraform', 'Ansible', 'GitHub Actions', 'Nix', 'ZFS', 'UniFi']
  },
  {
    title: 'Monitoring',
    skills: ['Grafana', 'Prometheus', 'Nginx', 'Traefik']
  },
  {
    title: 'Design',
    skills: ['Figma', 'Canva', 'Blender']
  },
  {
    title: 'Tools',
    skills: ['Git', 'VS Code', 'Postman', 'Linux']
  }
]

export default function Skills() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="skills" className="skills" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Skills</span>
          <h2 className="section-title">What I Work With</h2>
          <p className="section-description">
            From low-level systems to high-level AI agents - a full-stack toolkit for building at scale.
          </p>
        </motion.div>

        {/* GitHub Stats */}
        <motion.div
          className="github-stats"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="stats-grid">
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <CachedStatImage
                url="/api/github-stats?username=tanujdargan&show_icons=true&theme=midnight-purple&hide_border=true&bg_color=0d1117"
                alt="GitHub Stats"
              />
            </motion.a>
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <CachedStatImage
                url="/api/github-streak?user=tanujdargan&theme=midnight-purple&hide_border=true&background=0d1117"
                alt="GitHub Streak"
              />
            </motion.a>
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <CachedStatImage
                url="/api/github-stats/top-langs/?username=tanujdargan&layout=compact&theme=midnight-purple&hide_border=true&bg_color=0d1117"
                alt="Top Languages"
              />
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          className="tech-categories"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="tech-cloud-title">Technologies & Tools</h3>
          <div className="categories-grid">
            {skillCategories.map((category, catIndex) => (
              <motion.div
                key={category.title}
                className="skill-category"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + catIndex * 0.05 }}
              >
                <h4 className="category-title">{category.title}</h4>
                <div className="category-tags">
                  {category.skills.map((skill) => (
                    <motion.span
                      key={skill}
                      className="tech-tag"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
