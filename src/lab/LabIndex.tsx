import { Link } from '../lib/router'
import { variants } from '../routes'
import './lab.css'

export default function LabIndex() {
  return (
    <main className="lab-index">
      <h1>Design Lab · tanujdargan.com</h1>
      <p className="lead">Six directions, same content. Open one, then use the dock to switch variants and motion intensity. [ and ] cycle variants.</p>
      <ol>
        {variants.map((v) => (
          <li key={v.id}>
            <Link to={`/lab/${v.id}`}>
              <span className="id">{v.id.toUpperCase()}</span>
              <span className="name">{v.name}</span>
              <span className="pitch">{v.pitch}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="foot">
        Board: <a href="/portfolio-design-board.html">portfolio-design-board.html</a>
      </p>
    </main>
  )
}
