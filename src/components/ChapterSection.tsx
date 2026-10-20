import { useReveal } from '../hooks/useReveal'
import type { Chapter } from '../data/aircraftData'

interface ChapterSectionProps {
  chapter: Chapter
  index: number
  align?: 'left' | 'right'
  children?: React.ReactNode
}

/**
 * A single scroll chapter. The copy block animates in as the chapter enters
 * the viewport; the 3D camera is driven separately by the scroll progress.
 */
export function ChapterSection({ chapter, index, align = 'left', children }: ChapterSectionProps) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section
      id={chapter.id}
      data-chapter={index}
      className="relative flex min-h-[100svh] items-center py-28"
    >
      <div className="shell w-full">
        <div
          className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            ref={ref}
            className={`reveal max-w-xl ${align === 'right' ? 'text-left' : 'text-left'}`}
          >
            <div className="flex items-center gap-4">
              <span className="font-display text-[3.4rem] font-bold leading-none text-electric/25">
                {chapter.numeral}
              </span>
              <span className="rule w-14" />
              <span className="eyebrow">{chapter.kicker}</span>
            </div>

            <h2 className="headline-lg mt-6 text-[clamp(2.1rem,5.2vw,4rem)] text-mist">
              {chapter.title}
            </h2>

            <p className="mt-6 text-[1.02rem] font-light leading-[1.75] text-silver/78">
              {chapter.body}
            </p>

            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
