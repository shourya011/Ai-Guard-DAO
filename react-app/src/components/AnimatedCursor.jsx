import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './AnimatedCursor.css'

function AnimatedCursor() {
  const cursorRef = useRef(null)
  const cursorDotRef = useRef(null)
  const underlineRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const cursorDot = cursorDotRef.current
    const underline = underlineRef.current

    // Mouse move handler
    const handleMouseMove = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: 'power2.out'
      })

      gsap.to(cursorDot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      })
    }

    // Handle hover on interactive elements
    const handleMouseEnter = (e) => {
      const target = e.target
      
      // Check if hovering over clickable elements
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' ||
        target.classList.contains('btn-modern') ||
        target.closest('a') ||
        target.closest('button')
      ) {
        cursor.classList.add('pointer-mode')
        gsap.to(cursor, {
          scale: 1,
          opacity: 1,
          duration: 0.3
        })
        gsap.to(cursorDot, {
          scale: 0,
          opacity: 0,
          duration: 0.3
        })
      }

      // Check if hovering over text headings
      if (
        target.tagName === 'H1' || 
        target.tagName === 'H2' || 
        target.tagName === 'H3' ||
        target.classList.contains('gradient-text') ||
        target.classList.contains('hero-title-modern')
      ) {
        // Animate underline
        gsap.to(underline, {
          scaleX: 1,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out'
        })
        
        gsap.to(cursor, {
          scale: 2,
          opacity: 0.3,
          duration: 0.3
        })
      }
    }

    const handleMouseLeave = (e) => {
      cursor.classList.remove('pointer-mode')
      gsap.to(cursor, {
        scale: 1,
        opacity: 1,
        duration: 0.3
      })
      gsap.to(cursorDot, {
        scale: 1,
        opacity: 1,
        duration: 0.3
      })
      gsap.to(underline, {
        scaleX: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      })
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)

    // Hide default cursor
    document.body.style.cursor = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
      document.body.style.cursor = 'auto'
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="animated-cursor">
        <svg className="cursor-arrow" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 2L28 16L16 18L10 28L4 2Z" fill="black" stroke="white" strokeWidth="1"/>
        </svg>
        <div ref={underlineRef} className="cursor-underline" />
      </div>
      <div ref={cursorDotRef} className="animated-cursor-dot" />
    </>
  )
}

export default AnimatedCursor
