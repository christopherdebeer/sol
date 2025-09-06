import { BubbleNode, GestureEvent, PositionedBubble, ViewState } from '../types'
import { EventEmitter } from '../utils/EventEmitter'

export class RadialInterface extends EventEmitter {
  private canvas: HTMLElement
  private currentProject: BubbleNode | null = null
  private viewState: ViewState
  private bubbles: Map<string, PositionedBubble> = new Map()

  constructor(canvas: HTMLElement) {
    super()
    this.canvas = canvas
    this.viewState = {
      centerNode: 'root',
      zoom: 1,
      rotation: 0,
      pan: { x: 0, y: 0 }
    }
  }

  loadProject(project: BubbleNode): void {
    this.currentProject = project
    this.viewState.centerNode = project.id
    this.renderBubbles()
  }

  private renderBubbles(): void {
    if (!this.currentProject) return

    // Clear existing bubbles
    this.canvas.innerHTML = ''
    this.bubbles.clear()

    // Render central bubble
    this.renderCentralBubble(this.currentProject)
    
    // Render child bubbles in orbital pattern
    if (this.currentProject.children.length > 0) {
      this.renderChildBubbles(this.currentProject.children)
    }
  }

  private renderCentralBubble(node: BubbleNode): void {
    const bubble = document.createElement('div')
    bubble.className = 'bubble central-bubble sun-bubble'
    bubble.dataset.bubbleId = node.id
    bubble.innerHTML = `<span class="bubble-text">${node.text}</span>`
    
    this.canvas.appendChild(bubble)
    
    const positioned: PositionedBubble = {
      ...node,
      position: { x: 0, y: 0 },
      element: bubble,
      level: 0,
      isVisible: true
    }
    
    this.bubbles.set(node.id, positioned)
  }

  private renderChildBubbles(children: BubbleNode[]): void {
    const centerX = this.canvas.offsetWidth / 2
    const centerY = this.canvas.offsetHeight / 2
    const radius = Math.min(centerX, centerY) * 0.6
    const angleStep = (2 * Math.PI) / children.length

    children.forEach((child, index) => {
      const angle = index * angleStep - Math.PI / 2 // Start at top
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      const bubble = document.createElement('div')
      bubble.className = 'bubble child-bubble'
      bubble.dataset.bubbleId = child.id
      bubble.innerHTML = `<span class="bubble-text">${child.text}</span>`
      bubble.style.left = `${x - 40}px` // Offset for bubble center
      bubble.style.top = `${y - 40}px`
      
      this.canvas.appendChild(bubble)
      
      const positioned: PositionedBubble = {
        ...child,
        position: { x, y, angle, radius },
        element: bubble,
        level: 1,
        isVisible: true
      }
      
      this.bubbles.set(child.id, positioned)
    })
  }

  handleTap(event: GestureEvent): void {
    const bubble = event.target.closest('.bubble') as HTMLElement
    if (bubble && bubble.dataset.bubbleId) {
      this.selectBubble(bubble.dataset.bubbleId)
    }
  }

  handleDoubleTap(event: GestureEvent): void {
    const bubble = event.target.closest('.bubble') as HTMLElement
    if (bubble && bubble.dataset.bubbleId) {
      this.editBubble(bubble.dataset.bubbleId)
    }
  }

  handleLongPress(event: GestureEvent): void {
    const bubble = event.target.closest('.bubble') as HTMLElement
    if (bubble && bubble.dataset.bubbleId) {
      this.showContextMenu(bubble.dataset.bubbleId, event.position)
    }
  }

  handlePan(event: GestureEvent): void {
    // Implement panning logic
    this.viewState.pan.x += event.deltaX || 0
    this.viewState.pan.y += event.deltaY || 0
    this.updateCanvasTransform()
  }

  handlePinch(event: GestureEvent): void {
    // Implement zoom logic
    if (event.scale) {
      this.viewState.zoom *= event.scale
      this.viewState.zoom = Math.max(0.5, Math.min(3, this.viewState.zoom))
      this.updateCanvasTransform()
    }
  }

  private selectBubble(bubbleId: string): void {
    // Remove previous selection
    this.bubbles.forEach(bubble => {
      bubble.element.classList.remove('selected')
    })

    const bubble = this.bubbles.get(bubbleId)
    if (bubble) {
      bubble.element.classList.add('selected')
      this.emit('bubbleSelected', bubble)
    }
  }

  private editBubble(bubbleId: string): void {
    const bubble = this.bubbles.get(bubbleId)
    if (!bubble) return

    const textElement = bubble.element.querySelector('.bubble-text') as HTMLElement
    if (!textElement) return

    textElement.contentEditable = 'true'
    textElement.classList.add('editable')
    textElement.focus()

    const finishEdit = () => {
      textElement.contentEditable = 'false'
      textElement.classList.remove('editable')
      bubble.text = textElement.textContent || ''
      this.emit('bubbleEdited', bubble)
      textElement.removeEventListener('blur', finishEdit)
      textElement.removeEventListener('keydown', handleKeydown)
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        textElement.blur()
      }
      if (e.key === 'Escape') {
        textElement.textContent = bubble.text
        textElement.blur()
      }
    }

    textElement.addEventListener('blur', finishEdit)
    textElement.addEventListener('keydown', handleKeydown)
  }

  private showContextMenu(bubbleId: string, position: { x: number; y: number }): void {
    const contextMenu = document.getElementById('contextMenu')
    if (!contextMenu) return

    contextMenu.classList.remove('hidden')
    contextMenu.style.left = `${position.x}px`
    contextMenu.style.top = `${position.y}px`
    contextMenu.dataset.targetBubble = bubbleId

    // Hide menu when clicking elsewhere
    const hideMenu = (e: Event) => {
      if (!contextMenu.contains(e.target as Node)) {
        contextMenu.classList.add('hidden')
        document.removeEventListener('click', hideMenu)
      }
    }
    setTimeout(() => document.addEventListener('click', hideMenu), 10)
  }

  private updateCanvasTransform(): void {
    const transform = `translate(${this.viewState.pan.x}px, ${this.viewState.pan.y}px) scale(${this.viewState.zoom}) rotate(${this.viewState.rotation}deg)`
    this.canvas.style.transform = transform
  }

  goToRoot(): void {
    if (!this.currentProject) return
    this.viewState.centerNode = this.currentProject.id
    this.renderBubbles()
  }

  showOverview(): void {
    // TODO: Implement overview mode showing entire hierarchy
    console.log('Overview mode requested')
  }
}