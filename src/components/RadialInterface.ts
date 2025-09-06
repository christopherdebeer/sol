import { BubbleNode, GestureEvent, PositionedBubble, ViewState } from '../types'
import { EventEmitter } from '../utils/EventEmitter'

export class RadialInterface extends EventEmitter {
  private canvas: HTMLElement
  private currentProject: BubbleNode | null = null
  private viewState: ViewState
  private bubbles: Map<string, PositionedBubble> = new Map()
  private dragState: {
    isDragging: boolean
    bubbleId: string | null
    startAngle: number
    currentAngle: number
  } = { isDragging: false, bubbleId: null, startAngle: 0, currentAngle: 0 }

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

    // Find the currently centered node
    const centeredNode = this.findNode(this.currentProject, this.viewState.centerNode) || this.currentProject

    // Render central bubble with current focused node
    this.renderCentralBubble(centeredNode)
    
    // Render child bubbles in orbital pattern
    if (centeredNode.children.length > 0) {
      this.renderChildBubbles(centeredNode.children)
    }

    // Render parent breadcrumb if not at root
    if (centeredNode.id !== this.currentProject.id) {
      this.renderParentBreadcrumb(centeredNode.id)
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
    const centralBubbleSize = 150 // From CSS --bubble-size-sun
    const childBubbleSize = 80 // From CSS --bubble-size-medium
    const minSpacing = 40 // Minimum space between bubbles
    const radius = (centralBubbleSize / 2) + (childBubbleSize / 2) + minSpacing
    const angleStep = (2 * Math.PI) / children.length

    children.forEach((child, index) => {
      const angle = index * angleStep - Math.PI / 2 // Start at top
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      const bubble = document.createElement('div')
      bubble.className = 'bubble child-bubble draggable-bubble'
      bubble.dataset.bubbleId = child.id
      bubble.innerHTML = `<span class="bubble-text">${child.text}</span>`
      bubble.style.left = `${x - childBubbleSize / 2}px`
      bubble.style.top = `${y - childBubbleSize / 2}px`
      
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

  handleLongPress(_event: GestureEvent): void {
    // Long press disabled per requirement #6 (no context menu)
  }

  handlePan(event: GestureEvent): void {
    const bubble = event.target.closest('.bubble') as HTMLElement
    if (bubble && bubble.classList.contains('child-bubble') && bubble.dataset.bubbleId) {
      this.handleBubbleDrag(bubble.dataset.bubbleId, event)
    }
  }

  handlePinch(_event: GestureEvent): void {
    // Pinch gestures disabled to simplify implementation per requirement #1
  }

  handleGestureEnd(): void {
    // Reset drag state when gesture ends
    if (this.dragState.isDragging) {
      this.dragState = { isDragging: false, bubbleId: null, startAngle: 0, currentAngle: 0 }
    }
  }

  private selectBubble(bubbleId: string): void {
    // Reset drag state when selecting
    this.dragState = { isDragging: false, bubbleId: null, startAngle: 0, currentAngle: 0 }
    
    // Remove previous selection
    this.bubbles.forEach(bubble => {
      bubble.element.classList.remove('selected')
    })

    const bubble = this.bubbles.get(bubbleId)
    if (bubble) {
      bubble.element.classList.add('selected')
      
      // If selecting a child bubble, navigate to it (requirement #8)
      if (bubble.level === 1) {
        this.animateToCenter(bubbleId)
      } else {
        this.emit('bubbleSelected', bubble)
      }
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

  // Context menu removed per requirement #6

  private handleBubbleDrag(bubbleId: string, event: GestureEvent): void {
    const bubble = this.bubbles.get(bubbleId)
    if (!bubble || bubble.level !== 1) return // Only drag child bubbles

    const centerX = this.canvas.offsetWidth / 2
    const centerY = this.canvas.offsetHeight / 2
    
    // Calculate angle from center to current position
    const deltaX = event.position.x - centerX
    const deltaY = event.position.y - centerY
    const angle = Math.atan2(deltaY, deltaX)
    
    if (!this.dragState.isDragging) {
      this.dragState.isDragging = true
      this.dragState.bubbleId = bubbleId
      this.dragState.startAngle = angle
      this.dragState.currentAngle = angle
    } else if (this.dragState.bubbleId === bubbleId) {
      this.dragState.currentAngle = angle
      this.updateOrbitalPositions(angle - this.dragState.startAngle)
    }
  }

  private updateOrbitalPositions(deltaAngle: number): void {
    // Rotate all child bubbles around center
    const centerX = this.canvas.offsetWidth / 2
    const centerY = this.canvas.offsetHeight / 2
    
    this.bubbles.forEach(bubble => {
      if (bubble.level === 1 && bubble.position?.radius) {
        const originalAngle = bubble.position.angle || 0
        const newAngle = originalAngle + deltaAngle
        
        const x = centerX + bubble.position.radius * Math.cos(newAngle)
        const y = centerY + bubble.position.radius * Math.sin(newAngle)
        
        bubble.position.angle = newAngle
        bubble.position.x = x
        bubble.position.y = y
        
        const childBubbleSize = 80
        bubble.element.style.left = `${x - childBubbleSize / 2}px`
        bubble.element.style.top = `${y - childBubbleSize / 2}px`
      }
    })
  }

  private animateToCenter(bubbleId: string): void {
    const bubble = this.bubbles.get(bubbleId)
    if (!bubble || !this.currentProject) return

    // Find the node in the data structure
    const nodeToCenter = this.findNode(this.currentProject, bubbleId)
    if (!nodeToCenter) return

    // Add animation class
    bubble.element.classList.add('transitioning-to-center')
    
    // Animate bubble to center and show its children
    setTimeout(() => {
      this.viewState.centerNode = bubbleId
      this.renderBubbles()
      this.emit('nodeNavigated', nodeToCenter)
    }, 300)
  }

  private findNode(root: BubbleNode, targetId: string): BubbleNode | null {
    if (root.id === targetId) return root
    
    for (const child of root.children) {
      const found = this.findNode(child, targetId)
      if (found) return found
    }
    
    return null
  }

  // Canvas transform removed per requirement #1 (canvas non-interactive)

  private renderParentBreadcrumb(currentNodeId: string): void {
    // Add a small parent indicator in top-left for navigation back
    const breadcrumb = document.createElement('div')
    breadcrumb.className = 'bubble parent-breadcrumb'
    breadcrumb.innerHTML = '<span class="bubble-text">↰ Parent</span>'
    breadcrumb.style.left = '20px'
    breadcrumb.style.top = '20px'
    breadcrumb.style.width = '60px'
    breadcrumb.style.height = '60px'
    breadcrumb.style.fontSize = '0.7rem'
    breadcrumb.style.background = 'rgba(255, 255, 255, 0.2)'
    
    breadcrumb.addEventListener('click', () => {
      this.navigateToParent(currentNodeId)
    })
    
    this.canvas.appendChild(breadcrumb)
  }

  private navigateToParent(currentNodeId: string): void {
    if (!this.currentProject) return
    
    const parent = this.findParent(this.currentProject, currentNodeId)
    if (parent) {
      this.viewState.centerNode = parent.id
      this.renderBubbles()
    }
  }

  private findParent(root: BubbleNode, targetId: string): BubbleNode | null {
    for (const child of root.children) {
      if (child.id === targetId) return root
      const found = this.findParent(child, targetId)
      if (found) return found
    }
    return null
  }

  createChild(parentId?: string): void {
    if (!this.currentProject) return
    
    const targetParentId = parentId || this.viewState.centerNode
    const parent = this.findNode(this.currentProject, targetParentId)
    if (!parent) return

    const newChild: BubbleNode = {
      id: `child_${Date.now()}`,
      text: 'New Idea',
      children: []
    }

    parent.children.push(newChild)
    this.renderBubbles()
    
    // Auto-edit the new child
    setTimeout(() => {
      this.editBubble(newChild.id)
    }, 100)
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