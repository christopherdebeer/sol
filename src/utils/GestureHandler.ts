import { GestureEvent, Position } from '../types'
import { EventEmitter } from './EventEmitter'

interface TouchState {
  id: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  startTime: number
}

export class GestureHandler extends EventEmitter {
  private element: HTMLElement
  private touches: Map<number, TouchState> = new Map()
  private tapTimeout: number | null = null
  private longPressTimeout: number | null = null
  private lastTapTime = 0
  private lastTapPosition: Position = { x: 0, y: 0 }

  private readonly DOUBLE_TAP_DELAY = 300
  private readonly LONG_PRESS_DELAY = 500
  private readonly TAP_THRESHOLD = 10
  private readonly PINCH_THRESHOLD = 20

  constructor(element: HTMLElement) {
    super()
    this.element = element
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })

    // Mouse events for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this))
    
    // Prevent context menu
    this.element.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault()
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState: TouchState = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now()
      }
      this.touches.set(touch.identifier, touchState)
    })

    if (this.touches.size === 1) {
      this.startLongPressTimer(event)
    }
    
    if (this.touches.size === 2) {
      this.clearTimers()
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault()
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState = this.touches.get(touch.identifier)
      if (touchState) {
        touchState.currentX = touch.clientX
        touchState.currentY = touch.clientY
      }
    })

    if (this.touches.size === 1) {
      this.handleSingleTouchMove(event)
    } else if (this.touches.size === 2) {
      this.handleMultiTouchMove(event)
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState = this.touches.get(touch.identifier)
      if (touchState) {
        this.processTouchEnd(touch, touchState, event)
        this.touches.delete(touch.identifier)
      }
    })

    this.clearTimers()
  }

  private handleTouchCancel(_event: TouchEvent): void {
    this.clearTimers()
    this.touches.clear()
  }

  private processTouchEnd(touch: Touch, touchState: TouchState, originalEvent: TouchEvent): void {
    const deltaX = touch.clientX - touchState.startX
    const deltaY = touch.clientY - touchState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = Date.now() - touchState.startTime

    if (distance < this.TAP_THRESHOLD && duration < this.LONG_PRESS_DELAY) {
      this.handleTap(touch, originalEvent)
    }
  }

  private handleTap(touch: Touch, originalEvent: TouchEvent): void {
    const now = Date.now()
    const position: Position = { x: touch.clientX, y: touch.clientY }
    const timeSinceLastTap = now - this.lastTapTime
    const distanceFromLastTap = Math.sqrt(
      Math.pow(position.x - this.lastTapPosition.x, 2) +
      Math.pow(position.y - this.lastTapPosition.y, 2)
    )

    if (timeSinceLastTap < this.DOUBLE_TAP_DELAY && distanceFromLastTap < this.TAP_THRESHOLD) {
      // Double tap
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout)
        this.tapTimeout = null
      }
      
      this.emitGesture('doubleTap', originalEvent, position)
      this.lastTapTime = 0 // Reset to prevent triple tap
    } else {
      // Single tap (with delay to detect double tap)
      this.tapTimeout = window.setTimeout(() => {
        this.emitGesture('tap', originalEvent, position)
        this.tapTimeout = null
      }, this.DOUBLE_TAP_DELAY)
      
      this.lastTapTime = now
      this.lastTapPosition = position
    }
  }

  private handleSingleTouchMove(event: TouchEvent): void {
    const touch = event.touches[0]
    const touchState = this.touches.get(touch.identifier)
    if (!touchState) return

    const deltaX = touch.clientX - touchState.startX
    const deltaY = touch.clientY - touchState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance > this.TAP_THRESHOLD) {
      this.clearTimers()
      this.emitGesture('pan', event, { x: touch.clientX, y: touch.clientY }, deltaX, deltaY)
    }
  }

  private handleMultiTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 2) return

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const touchState1 = this.touches.get(touch1.identifier)
    const touchState2 = this.touches.get(touch2.identifier)

    if (!touchState1 || !touchState2) return

    // Calculate current distance
    const currentDistance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )

    // Calculate initial distance
    const initialDistance = Math.sqrt(
      Math.pow(touchState2.startX - touchState1.startX, 2) +
      Math.pow(touchState2.startY - touchState1.startY, 2)
    )

    if (Math.abs(currentDistance - initialDistance) > this.PINCH_THRESHOLD) {
      const scale = currentDistance / initialDistance
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      this.emitGesture('pinch', event, { x: centerX, y: centerY }, 0, 0, scale)
    }
  }

  private startLongPressTimer(event: TouchEvent): void {
    const touch = event.touches[0]
    this.longPressTimeout = window.setTimeout(() => {
      this.emitGesture('longPress', event, { x: touch.clientX, y: touch.clientY })
    }, this.LONG_PRESS_DELAY)
  }

  private clearTimers(): void {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
      this.tapTimeout = null
    }
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }
  }

  private emitGesture(
    type: GestureEvent['type'], 
    originalEvent: Event, 
    position: Position,
    deltaX = 0,
    deltaY = 0,
    scale?: number
  ): void {
    const gestureEvent: GestureEvent = {
      type,
      target: originalEvent.target as HTMLElement,
      position,
      deltaX,
      deltaY,
      scale,
      originalEvent
    }

    this.emit(type, gestureEvent)
  }

  // Mouse event handlers for desktop testing
  private handleMouseDown(event: MouseEvent): void {
    const mockTouch: TouchState = {
      id: 0,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startTime: Date.now()
    }
    this.touches.set(0, mockTouch)
    this.startLongPressTimer(event as any)
  }

  private handleMouseMove(event: MouseEvent): void {
    const touchState = this.touches.get(0)
    if (!touchState) return

    touchState.currentX = event.clientX
    touchState.currentY = event.clientY

    const deltaX = event.clientX - touchState.startX
    const deltaY = event.clientY - touchState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance > this.TAP_THRESHOLD) {
      this.clearTimers()
      this.emitGesture('pan', event, { x: event.clientX, y: event.clientY }, deltaX, deltaY)
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    const touchState = this.touches.get(0)
    if (!touchState) return

    const deltaX = event.clientX - touchState.startX
    const deltaY = event.clientY - touchState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = Date.now() - touchState.startTime

    if (distance < this.TAP_THRESHOLD && duration < this.LONG_PRESS_DELAY) {
      this.handleTap({ clientX: event.clientX, clientY: event.clientY, identifier: 0 } as any, event as any)
    }

    this.touches.delete(0)
    this.clearTimers()
  }
}