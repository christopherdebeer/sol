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
    lastDragEnd?: number
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

    // Add "+" buttons between children for creating new nodes
    this.renderAddButtons(children.length, radius, angleStep, centerX, centerY)
  }

  private renderAddButtons(childCount: number, radius: number, angleStep: number, centerX: number, centerY: number): void {
    // Only add buttons if there are existing children and not too many
    if (childCount === 0 || childCount > 8) return // Avoid overcrowding

    // Place "+" buttons between children - these will rotate with the orbit
    for (let i = 0; i < childCount; i++) {
      const childAngle = i * angleStep - Math.PI / 2
      const midAngle = childAngle + (angleStep / 2)
      
      // Position the "+" button slightly inward for better visual hierarchy
      const addButtonRadius = radius * 0.85
      const x = centerX + addButtonRadius * Math.cos(midAngle)
      const y = centerY + addButtonRadius * Math.sin(midAngle)

      const addButton = document.createElement('div')
      addButton.className = 'bubble add-button orbit-element' // Added orbit-element class
      addButton.innerHTML = '<span class="bubble-text">+</span>'
      addButton.style.left = `${x - 15}px` // Small 30px button
      addButton.style.top = `${y - 15}px`
      addButton.style.width = '30px'
      addButton.style.height = '30px'
      addButton.style.fontSize = '18px'
      addButton.style.background = 'rgba(255, 255, 255, 0.3)'
      addButton.style.border = '2px solid rgba(255, 255, 255, 0.6)'
      addButton.style.cursor = 'pointer'
      addButton.style.display = 'flex'
      addButton.style.alignItems = 'center'
      addButton.style.justifyContent = 'center'
      addButton.style.borderRadius = '50%'
      addButton.style.transition = 'all 0.2s ease'

      // Store position data for rotation
      addButton.dataset.angle = midAngle.toString()
      addButton.dataset.radius = addButtonRadius.toString()
      addButton.dataset.index = i.toString()

      // Hover effect
      addButton.addEventListener('mouseenter', () => {
        addButton.style.background = 'rgba(255, 255, 255, 0.5)'
        addButton.style.transform = 'scale(1.1)'
      })
      addButton.addEventListener('mouseleave', () => {
        addButton.style.background = 'rgba(255, 255, 255, 0.3)'
        addButton.style.transform = 'scale(1)'
      })

      // Add click handler to create new child
      addButton.addEventListener('click', (e) => {
        e.stopPropagation()
        this.createChild()
      })
      
      this.canvas.appendChild(addButton)
    }
  }

  handleTap(event: GestureEvent): void {
    const bubble = event.target.closest('.bubble') as HTMLElement;
    console.log("bubbleEl", bubble, bubble.dataset.bubbleId);
    if (bubble && bubble.dataset.bubbleId) {
      console.log('[NAVIGATION DEBUG] handleTap called', {
        bubbleId: bubble.dataset.bubbleId,
        dragState: this.dragState,
        target: event.target,
        timestamp: Date.now()
      })
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
    
    // Mark drag end time for selection conflict resolution
    const wasDragging = this.dragState.isDragging
    const lastDragEnd = wasDragging ? Date.now() : undefined
    
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
      momentum: 0,
      lastDragEnd
    }
  }

  private selectBubble(bubbleId: string): void {
    console.log('[NAVIGATION DEBUG] selectBubble called', {
      bubbleId,
      isDragging: this.dragState.isDragging,
      dragDistance: this.dragState.dragDistance,
      lastDragEnd: this.dragState.lastDragEnd,
      now: Date.now(),
      timeSinceDragEnd: this.dragState.lastDragEnd ? Date.now() - this.dragState.lastDragEnd : 'N/A'
    })
    
    // Only proceed with selection if we're not in a significant drag
    // Use a smaller threshold for better tap detection
    if (this.dragState.isDragging && this.dragState.dragDistance > 5) {
      console.log('[NAVIGATION DEBUG] Blocked by active drag')
      return // Ignore selection during active drag
    }
    
    // Also check if this was a very recent drag end
    const now = Date.now()
    if (this.dragState.lastDragEnd && (now - this.dragState.lastDragEnd) < 100) {
      console.log('[NAVIGATION DEBUG] Blocked by recent drag end')
      return // Ignore taps immediately after drag ends
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
        console.log('[NAVIGATION DEBUG] Navigating to child bubble', {
          bubbleId,
          currentCenterNode: this.viewState.centerNode,
          bubbleText: bubble.text
        })
        this.animateToCenter(bubbleId)
      } else {
        console.log('[NAVIGATION DEBUG] Emitting bubbleSelected for level 0 bubble')
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
        
        // FIXED: Better bidirectional rotation - preserve natural drag direction
        let adjustedDelta = rawDelta
        
        // Handle angle wraparound while preserving direction
        if (Math.abs(rawDelta) > Math.PI) {
          // Choose the shorter path around the circle
          if (rawDelta > 0) {
            adjustedDelta = rawDelta - 2 * Math.PI
          } else {
            adjustedDelta = rawDelta + 2 * Math.PI
          }
        }
        
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
    
    // Update child bubbles
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
    
    // Update "+" buttons to rotate with the orbit
    const addButtons = this.canvas.querySelectorAll('.add-button.orbit-element')
    addButtons.forEach((addButton: Element) => {
      const element = addButton as HTMLElement
      const originalAngle = parseFloat(element.dataset.angle || '0')
      const radius = parseFloat(element.dataset.radius || '0')
      
      const newAngle = originalAngle + easedDelta
      const x = centerX + radius * Math.cos(newAngle)
      const y = centerY + radius * Math.sin(newAngle)
      
      element.dataset.angle = newAngle.toString()
      element.style.left = `${x - 15}px`
      element.style.top = `${y - 15}px`
      element.style.transition = this.dragState.isDragging ? 'none' : 'transform 0.1s ease-out'
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
    // Apply momentum-based rotation after drag ends - DRAMATICALLY INCREASED
    let currentVelocity = this.dragState.velocity * 0.3 // Much higher initial velocity
    const friction = 0.98 // Much less friction (was 0.95)
    const minVelocity = 0.0001 // Lower threshold for longer spin
    
    const momentumAnimation = () => {
      if (Math.abs(currentVelocity) > minVelocity && !this.dragState.isDragging) {
        // Apply rotation based on current velocity - MUCH MORE DRAMATIC
        const rotationDelta = currentVelocity * 0.5 // 5x higher rotation multiplier
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
    console.log('[NAVIGATION DEBUG] animateToCenter called', {
      bubbleId,
      currentCenterNode: this.viewState.centerNode
    })
    
    const bubble = this.bubbles.get(bubbleId)
    if (!bubble || !this.currentProject) {
      console.log('[NAVIGATION DEBUG] animateToCenter failed - bubble or project not found', {
        bubbleExists: !!bubble,
        projectExists: !!this.currentProject
      })
      return
    }

    // Find the node in the data structure
    const nodeToCenter = this.findNode(this.currentProject, bubbleId)
    if (!nodeToCenter) {
      console.log('[NAVIGATION DEBUG] animateToCenter failed - node not found in data structure')
      return
    }
    
    console.log('[NAVIGATION DEBUG] Node found for centering', {
      nodeId: nodeToCenter.id,
      nodeText: nodeToCenter.text,
      childrenCount: nodeToCenter.children.length
    })

    // Add animation class
    bubble.element.classList.add('transitioning-to-center')
    
    // Animate bubble to center and show its children
    setTimeout(() => {
      console.log('[NAVIGATION DEBUG] Setting new center node', {
        oldCenter: this.viewState.centerNode,
        newCenter: bubbleId
      })
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
