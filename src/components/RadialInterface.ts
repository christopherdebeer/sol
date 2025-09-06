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
    startPosition: { x: number; y: number }
    lastPosition: { x: number; y: number }
    dragDistance: number
    velocity: number
    momentum: number
  } = { 
    isDragging: false, 
    bubbleId: null, 
    startAngle: 0, 
    currentAngle: 0,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    dragDistance: 0,
    velocity: 0,
    momentum: 0
  }

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
    // Apply momentum if dragging was active
    if (this.dragState.isDragging && Math.abs(this.dragState.velocity) > 0.01) {
      this.applyMomentum()
    }
    
    // Remove visual feedback
    if (this.dragState.bubbleId) {
      const bubble = this.bubbles.get(this.dragState.bubbleId)
      if (bubble) {
        bubble.element.classList.remove('dragging')
      }
    }
    
    // Reset drag state when gesture ends
    this.dragState = { 
      isDragging: false, 
      bubbleId: null, 
      startAngle: 0, 
      currentAngle: 0,
      startPosition: { x: 0, y: 0 },
      lastPosition: { x: 0, y: 0 },
      dragDistance: 0,
      velocity: 0,
      momentum: 0
    }
  }

  private selectBubble(bubbleId: string): void {
    // Only proceed with selection if we're not in an active drag
    if (this.dragState.isDragging && this.dragState.dragDistance > 10) {
      return // Ignore selection during active drag
    }
    
    // Reset drag state when selecting
    this.dragState = { 
      isDragging: false, 
      bubbleId: null, 
      startAngle: 0, 
      currentAngle: 0,
      startPosition: { x: 0, y: 0 },
      lastPosition: { x: 0, y: 0 },
      dragDistance: 0,
      velocity: 0,
      momentum: 0
    }
    
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
    
    // Get bubble-relative position for better drag calculation
    const bubbleRect = bubble.element.getBoundingClientRect()
    const canvasRect = this.canvas.getBoundingClientRect()
    const bubbleX = bubbleRect.left + bubbleRect.width / 2 - canvasRect.left
    const bubbleY = bubbleRect.top + bubbleRect.height / 2 - canvasRect.top
    
    // Calculate distance from center for speed scaling
    const distanceFromCenter = Math.sqrt(Math.pow(bubbleX - centerX, 2) + Math.pow(bubbleY - centerY, 2))
    
    if (!this.dragState.isDragging && !this.dragState.bubbleId) {
      // Initialize drag state
      this.dragState.bubbleId = bubbleId
      this.dragState.startPosition = { x: event.position.x, y: event.position.y }
      this.dragState.lastPosition = { x: event.position.x, y: event.position.y }
      this.dragState.dragDistance = 0
      this.dragState.velocity = 0
      
      // Calculate initial angle from bubble position to center
      const deltaX = bubbleX - centerX
      const deltaY = bubbleY - centerY
      this.dragState.startAngle = Math.atan2(deltaY, deltaX)
      this.dragState.currentAngle = this.dragState.startAngle
      
      // Add visual feedback
      bubble.element.classList.add('dragging')
    } else if (this.dragState.bubbleId === bubbleId) {
      // Calculate drag distance
      const dx = event.position.x - this.dragState.startPosition.x
      const dy = event.position.y - this.dragState.startPosition.y
      this.dragState.dragDistance = Math.sqrt(dx * dx + dy * dy)
      
      // Only start actual rotation if drag distance exceeds threshold
      const DRAG_THRESHOLD = 15 // Minimum pixels before starting rotation
      if (this.dragState.dragDistance > DRAG_THRESHOLD) {
        this.dragState.isDragging = true
        
        // Calculate velocity for momentum
        const timeDelta = 16 // Assume 60fps, ~16ms per frame
        const positionDelta = Math.sqrt(
          Math.pow(event.position.x - this.dragState.lastPosition.x, 2) +
          Math.pow(event.position.y - this.dragState.lastPosition.y, 2)
        )
        this.dragState.velocity = positionDelta / timeDelta
        
        // Calculate rotation based on tangential movement
        const currentX = event.position.x - canvasRect.left
        const currentY = event.position.y - canvasRect.top
        const currentAngle = Math.atan2(currentY - centerY, currentX - centerX)
        
        // Apply speed scaling based on distance from center (further = slower rotation)
        const speedMultiplier = Math.max(0.3, 100 / distanceFromCenter)
        const rawDelta = currentAngle - this.dragState.currentAngle
        
        // Handle angle wraparound (-π to π)
        let adjustedDelta = rawDelta
        if (adjustedDelta > Math.PI) adjustedDelta -= 2 * Math.PI
        if (adjustedDelta < -Math.PI) adjustedDelta += 2 * Math.PI
        
        const scaledDelta = adjustedDelta * speedMultiplier
        this.dragState.currentAngle = currentAngle
        
        // Apply smooth rotation with easing
        this.updateOrbitalPositions(scaledDelta)
      }
      
      this.dragState.lastPosition = { x: event.position.x, y: event.position.y }
    }
  }

  private updateOrbitalPositions(deltaAngle: number): void {
    // Smooth rotation with interpolation
    const centerX = this.canvas.offsetWidth / 2
    const centerY = this.canvas.offsetHeight / 2
    
    // Apply easing to make rotation feel more natural
    const easedDelta = this.easeRotation(deltaAngle)
    
    this.bubbles.forEach(bubble => {
      if (bubble.level === 1 && bubble.position?.radius) {
        const originalAngle = bubble.position.angle || 0
        const newAngle = originalAngle + easedDelta
        
        const x = centerX + bubble.position.radius * Math.cos(newAngle)
        const y = centerY + bubble.position.radius * Math.sin(newAngle)
        
        bubble.position.angle = newAngle
        bubble.position.x = x
        bubble.position.y = y
        
        const childBubbleSize = 80
        bubble.element.style.left = `${x - childBubbleSize / 2}px`
        bubble.element.style.top = `${y - childBubbleSize / 2}px`
        
        // Add smooth transition for visual feedback
        bubble.element.style.transition = this.dragState.isDragging ? 'none' : 'transform 0.1s ease-out'
      }
    })
  }

  private easeRotation(deltaAngle: number): number {
    // Apply cubic easing to rotation for more natural feel
    const maxRotationSpeed = 0.1 // Limit maximum rotation speed
    const clampedDelta = Math.max(-maxRotationSpeed, Math.min(maxRotationSpeed, deltaAngle))
    
    // Cubic easing function for smoother rotation
    const t = Math.abs(clampedDelta) / maxRotationSpeed
    const easedT = t * t * (3 - 2 * t) // Smoothstep function
    
    return Math.sign(clampedDelta) * easedT * maxRotationSpeed
  }

  private applyMomentum(): void {
    // Apply momentum-based rotation after drag ends
    let currentVelocity = this.dragState.velocity * 0.05 // Scale down velocity
    const friction = 0.95 // Deceleration factor
    const minVelocity = 0.001 // Minimum velocity before stopping
    
    const momentumAnimation = () => {
      if (Math.abs(currentVelocity) > minVelocity && !this.dragState.isDragging) {
        // Apply rotation based on current velocity
        const rotationDelta = currentVelocity * 0.1
        this.updateOrbitalPositions(rotationDelta)
        
        // Reduce velocity due to friction
        currentVelocity *= friction
        
        // Continue animation
        requestAnimationFrame(momentumAnimation)
      }
    }
    
    // Start momentum animation
    requestAnimationFrame(momentumAnimation)
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