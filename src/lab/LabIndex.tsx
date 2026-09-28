import { Link } from '../lib/router'
import { variants } from '../routes'
import './lab.css'

export default function LabIndex() {
  return (
    <main className="lab-index">
      <h1>Design Lab · tanujdargan.com</h1>
      <p className="lead">P1–P5 are the current round. v4b and v6 stay as references. [ and ] cycle variants.</p>
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
